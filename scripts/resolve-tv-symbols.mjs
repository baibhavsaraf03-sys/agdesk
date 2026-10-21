#!/usr/bin/env node
/**
 * Finds out which tile symbols actually return a quote, and replaces only the
 * ones that do not. Writes lib/tv-symbols.js.
 *
 *   node scripts/resolve-tv-symbols.mjs          # test, search, write
 *   node scripts/resolve-tv-symbols.mjs --dry    # show, write nothing
 *
 * The order matters. An earlier version searched for every symbol by its
 * display name and took the best-scoring result, which replaced correct
 * symbols with confident-looking rubbish: the gold/silver ratio for gold, a
 * short-volume series for WTI, a dollar-denominated Ibovespa for Ibovespa.
 * Searching is the fallback here, not the method.
 *
 * Every candidate is also checked for an actual quote before being accepted,
 * because a symbol existing and a widget being entitled to quote it are
 * different things. A symbol with no data renders an empty tile rather than an
 * error, so unverified symbols fail silently and look like a styling bug.
 */

import { writeFileSync } from "node:fs";
import { TV_GROUPS, TAPE } from "../lib/tv.js";

const dry = process.argv.includes("--dry");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const HEADERS = {
  accept: "application/json",
  origin: "https://www.tradingview.com",
  referer: "https://www.tradingview.com/",
  "user-agent": UA
};

const strip = (s) => String(s || "").replace(/<\/?[^>]+>/g, "");
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** Does this symbol actually return a price? The only test that matters. */
async function hasQuote(symbol) {
  try {
    const res = await fetch(
      `https://scanner.tradingview.com/symbol?symbol=${encodeURIComponent(symbol)}&fields=close&no_404=true`,
      { headers: HEADERS }
    );
    if (!res.ok) return false;
    const body = await res.json();
    return typeof body?.close === "number" && isFinite(body.close);
  } catch {
    return false;
  }
}

async function search(text, type) {
  const url =
    "https://symbol-search.tradingview.com/symbol_search/?" +
    `text=${encodeURIComponent(text)}&hl=0&lang=en&type=${encodeURIComponent(type)}&domain=production`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  return Array.isArray(body) ? body : body?.symbols || [];
}

/** Descriptions that mean "related to the thing" rather than "the thing". */
const NOT_THE_THING =
  /(ratio|short sale|short volume|flows?|total return|net return|gross return|capped|shariah|islamic|non-|ex-|inverse|leveraged|2x|3x|bear|bull|mini|micro|month|adjusted|excess|hedged)/i;

function score(result, { display, type, guess }) {
  const symbol = strip(result.symbol);
  const exchange = strip(result.prefix || result.exchange).toUpperCase();
  const desc = strip(result.description);
  const low = desc.toLowerCase();
  const want = display.toLowerCase();

  let s = 0;
  if ((result.type || "") === type) s += 30;
  if (exchange === guess.split(":")[0]?.toUpperCase()) s += 10;

  // Closeness of the description to what we asked for, not mere overlap.
  if (low === want) s += 50;
  else if (low.startsWith(want)) s += 35;
  else if (low.includes(want)) s += 20;
  else {
    const words = want.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    const hits = words.filter((w) => low.includes(w)).length;
    if (hits < Math.ceil(words.length / 2)) s -= 30;
    else s += hits * 4;
  }

  if (NOT_THE_THING.test(low)) s -= 45;
  if (/[./]USD$|\.USD/.test(symbol)) s -= 30;
  if (/CAPITALCOM|SPREADEX|PEPPERSTONE|OANDA|FOREXCOM|SKILLING|BLACKBULL|IG|FX|FXOPEN|FINRA|NASDAQ:Q/.test(exchange)) s -= 35;
  if (!exchange || !symbol) s -= 200;

  return { full: `${exchange}:${symbol}`, s, desc };
}

function targets() {
  const seen = new Map();
  const note = (display, guess) => {
    if (!seen.has(display)) {
      seen.set(display, { guess, type: guess.includes("1!") ? "futures" : "index" });
    }
  };
  for (const t of TAPE) note(t.title, t.proName);
  for (const groups of Object.values(TV_GROUPS)) {
    for (const g of groups) for (const [sym, display] of g.symbols) note(display, sym);
  }
  return [...seen.entries()].map(([display, v]) => ({ display, ...v }));
}

const list = targets();
const out = {};
const dead = [];
let kept = 0;
let fixed = 0;

console.log(`Checking ${list.length} symbols for an actual quote…\n`);

for (const t of list) {
  // 1. Is what we already have fine?
  if (await hasQuote(t.guess)) {
    kept++;
    console.log(`  ok  ${t.display.padEnd(26)} ${t.guess}`);
    await pause(120);
    continue;
  }

  // 2. It is not. Look for a replacement that quotes.
  let candidates = [];
  try {
    const results = await search(t.display, t.type);
    candidates = results
      .map((r) => score(r, t))
      .filter((c) => c.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6);
  } catch (err) {
    console.log(`  !   ${t.display.padEnd(26)} search failed: ${err.message}`);
  }

  let chosen = null;
  for (const c of candidates) {
    if (await hasQuote(c.full)) { chosen = c; break; }
    await pause(120);
  }

  if (chosen) {
    out[t.display] = chosen.full;
    fixed++;
    console.log(`  ->  ${t.display.padEnd(26)} ${chosen.full.padEnd(24)} ${chosen.desc.slice(0, 38)}`);
  } else {
    dead.push(t.display);
    console.log(`  --  ${t.display.padEnd(26)} no symbol with a quote — tile will be dropped`);
  }
  await pause(180);
}

console.log(`\n${kept} already correct, ${fixed} corrected, ${dead.length} with no available quote.`);
if (dead.length) {
  console.log(`\nNo widget data for: ${dead.join(", ")}`);
  console.log("These are almost certainly indices the free widget tier is not licensed to quote.");
  console.log("Add them to DROP in lib/tv.js, or paste this list back and I will.");
}

if (dry) {
  console.log("\n--dry, so nothing was written.");
  process.exit(0);
}

writeFileSync(
  new URL("../lib/tv-symbols.js", import.meta.url),
  `/**
 * Verified TradingView symbols, keyed by the display name used in lib/tv.js.
 *
 * Generated by scripts/resolve-tv-symbols.mjs on ${new Date().toISOString()}.
 * Only symbols that returned an actual quote are here, and only where the
 * original guess did not. Do not hand-edit: re-run the resolver.
 */
export default ${JSON.stringify(out, null, 2)};

/** Display names with no quote available on the free widget tier. */
export const NO_DATA = ${JSON.stringify(dead, null, 2)};
`
);
console.log("\nWrote lib/tv-symbols.js — hard reload to pick it up.");
