#!/usr/bin/env node
/**
 * The insider radar's read (INS screen). Called as a job of the hourly Market
 * reads workflow; it does real work only when SEC has published a day's form
 * index it has not processed yet (about once a weekday), so most hours it
 * exits in a second.
 *
 * For each new day: read EDGAR's daily form index, fetch every Form 4
 * (1,500 or so a day, about 8 a second), keep open-market purchases by
 * officers and directors (lib/insider.mjs), and publish clusters, the biggest
 * buys and how the cluster stocks have moved since, to `market_reads` zone
 * "insider". The first run backfills BACKFILL weekdays.
 *
 *   node scripts/insider-read.mjs            normal
 *   node scripts/insider-read.mjs --probe    one day, no database, print results
 */
import { createClient } from "@supabase/supabase-js";
import { sec, yahooDaily } from "../lib/sec.mjs";
import { parseForm4, clusters, biggest, KEEP_DAYS, CLUSTER_DAYS, CLUSTER_MIN } from "../lib/insider.mjs";

const PROBE = process.argv.includes("--probe");
const BACKFILL = Number(process.env.INSIDER_BACKFILL || 10);
const MAX_DAYS_PER_RUN = Number(process.env.INSIDER_MAX_DAYS || 12);

const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
const iso = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

/** Weekdays from `n` back to yesterday, oldest first. */
function weekdays(n) {
  const out = [];
  for (let back = 1; out.length < n && back < n * 2 + 7; back++) {
    const d = new Date(Date.now() - back * 86400000);
    if (![0, 6].includes(d.getUTCDay())) out.unshift(d);
  }
  return out;
}

async function dayIndex(d) {
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  const t = await sec(`https://www.sec.gov/Archives/edgar/daily-index/${d.getUTCFullYear()}/QTR${q}/form.${ymd(d)}.idx`);
  if (!t) return null; // not published (holiday, or not yet)
  return t.split("\n").filter((l) => /^4\s+/.test(l)).map((l) => l.trim().split(/\s{2,}/).pop()).filter((f) => /\.txt$/.test(f));
}

async function processDay(d) {
  const files = await dayIndex(d);
  if (files == null) return null;
  const buys = [];
  let done = 0, failed = 0;
  const queue = [...files];
  const worker = async () => {
    while (queue.length) {
      const f = queue.shift();
      try {
        const t = await sec(`https://www.sec.gov/Archives/${f}`);
        if (t) buys.push(...parseForm4(t, iso(ymd(d))));
        done++;
      } catch {
        failed++;
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  console.log(`${iso(ymd(d))}: ${files.length} Form 4s, ${done} read, ${failed} failed, ${buys.length} purchase lines`);
  return { buys, files: files.length, failed };
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = !PROBE && url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
if (!PROBE && !db) { console.log("::warning::Insider read: Supabase secrets missing."); process.exit(0); }
// Raw purchases live in zone "raw_insider", which /api/feed never sends to
// the page; the public zone "insider" holds only clusters and biggest buys.
const prev = db ? (await db.from("market_reads").select("payload").eq("zone", "raw_insider").maybeSingle()).data?.payload : null;

// INSIDER_RESET=1 ignores what is stored and rebuilds from SEC (after a rule change).
const RESET = process.env.INSIDER_RESET === "1";
const doneDays = new Set(RESET ? [] : prev?.days || []);
const wanted = (PROBE ? weekdays(1) : weekdays(doneDays.size ? 7 : BACKFILL)).filter((d) => !doneDays.has(iso(ymd(d))));
// INSIDER_RECOMPUTE=1 republishes clusters from stored purchases (after a rule change that needs no new fetching).
const RECOMPUTE = process.env.INSIDER_RECOMPUTE === "1";
if (!wanted.length && !RECOMPUTE) { console.log("Nothing new from EDGAR yet."); process.exit(0); }

let buys = RESET ? [] : prev?.buys || [];
const days = [...doneDays];
let changed = false;
for (const d of wanted.slice(-MAX_DAYS_PER_RUN)) {
  try {
    const r = await processDay(d);
    if (!r) { console.log(`${iso(ymd(d))}: index not published`); continue; }
    buys.push(...r.buys);
    days.push(iso(ymd(d)));
    changed = true;
  } catch (e) {
    console.log(`::warning::${iso(ymd(d))}: ${e.message}`);
  }
}
if (!changed && !RECOMPUTE) process.exit(0);

// Keep KEEP_DAYS of purchases, without duplicates (amended filings repeat lines).
const cutoff = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString().slice(0, 10);
const seen = new Set();
buys = buys.filter((b) => {
  const k = [b.issuerCik, b.ownerCik, b.date, b.shares, b.price].join("|");
  if (b.date < cutoff || seen.has(k)) return false;
  seen.add(k);
  return true;
});

const cl = clusters(buys).slice(0, 30);
const big = biggest(buys);

// How each cluster stock has moved since the insiders' average price.
for (const c of cl) {
  try {
    const px = await yahooDaily(c.ticker, "3mo");
    const lastPx = px.at(-1);
    if (lastPx) {
      c.price = Math.round(lastPx.c * 100) / 100;
      c.priceAt = lastPx.t;
      c.since = Math.round((1000 * (lastPx.c - c.avgPrice)) / c.avgPrice) / 10;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 300));
}

console.log(`\n${buys.length} purchases kept (${KEEP_DAYS} days), ${cl.length} clusters of ${CLUSTER_MIN}+ insiders in ${CLUSTER_DAYS} days`);
for (const c of cl.slice(0, 15)) console.log(`${c.ticker.padEnd(6)} ${String(c.insiders).padStart(2)} insiders  $${(c.value / 1e6).toFixed(2)}m  avg ${c.avgPrice}  now ${c.price ?? "?"}  ${c.since ?? "?"}%  ${c.first}..${c.last}  ${c.company}`);
console.log("\nbiggest single buys (7 days):");
for (const b of big.slice(0, 8)) console.log(`${b.ticker.padEnd(6)} $${(b.value / 1e6).toFixed(2)}m  ${b.owner} (${b.role})`);
if (PROBE) process.exit(0);

const now = new Date();
const stamp = now.toISOString().slice(0, 16).replace("T", " ") + " UTC";
const raw = await db.from("market_reads").upsert(
  { zone: "raw_insider", phase: "daily", stamp, payload: { at: now.toISOString(), days: days.sort().slice(-60), buys }, updated_at: now.toISOString() },
  { onConflict: "zone" }
);
if (raw.error) { console.log(`::warning::Insider read: raw write failed: ${raw.error.message}`); process.exit(0); }
const payload = {
  at: now.toISOString(),
  through: days.sort().at(-1),
  purchases: buys.length,
  clusters: cl,
  biggest: big,
  rules: { clusterDays: CLUSTER_DAYS, clusterMin: CLUSTER_MIN, keepDays: KEEP_DAYS },
  source: "SEC EDGAR Form 4 filings"
};
const { error } = await db.from("market_reads").upsert(
  { zone: "insider", phase: "daily", stamp, payload, updated_at: now.toISOString() },
  { onConflict: "zone" }
);
console.log(error ? `::warning::Insider read: database write failed: ${error.message}` : "published");
