#!/usr/bin/env node
/**
 * Track record (TRK screen). Called by the hourly Market reads workflow;
 * works once a UTC day (or with --force).
 *
 * Collects the signals the site has shown and measures them afterwards
 * against the S&P 500 (lib/scorecard.mjs):
 *   insider  clusters of 3+ insiders, replayed day by day from the stored
 *            purchases (zone raw_insider) using the filing date, so each is
 *            measured from the day after it could first have appeared
 *   meme     Rally / Buzzing / Selling off labels (zone meme), from the next close
 *   debate   each bull vs bear verdict (zone debate), from the next close
 *   mood     the mood dial looked back over five years of VIX and S&P 500 closes
 * Entries are kept in zone raw_scorecard (never sent to the page); the
 * summaries go to zone scorecard.
 *
 *   node scripts/scorecard-read.mjs [--force] [--probe]
 */
import { createClient } from "@supabase/supabase-js";
import { yahooDaily } from "../lib/sec.mjs";
import { clusters, CLUSTER_DAYS } from "../lib/insider.mjs";
import { HORIZONS, measure, summarise, moodHistory } from "../lib/scorecard.mjs";
import { MOOD_BANDS, moodFor } from "../lib/pulse.mjs";

const PROBE = process.argv.includes("--probe");
const FORCE = process.argv.includes("--force") || PROBE;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.log("::warning::Scorecard: Supabase secrets missing."); process.exit(0); }
const db = createClient(url, key, { auth: { persistSession: false } });
const zone = async (z) => (await db.from("market_reads").select("payload").eq("zone", z).maybeSingle()).data?.payload || null;

const today = new Date().toISOString().slice(0, 10);
const prevPublic = await zone("scorecard");
if (!FORCE && prevPublic?.at?.slice(0, 10) === today) { console.log("Scorecard already done today."); process.exit(0); }

const raw = (await zone("raw_scorecard")) || { entries: [] };
const entries = raw.entries || [];
const have = new Set(entries.map((e) => e.key));
const add = (e) => { if (!have.has(e.key)) { entries.push(e); have.add(e.key); } };
const nextDay = (d) => new Date(Date.parse(d.slice(0, 10) + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);
const recentSame = (kind, ticker, date, days) =>
  entries.some((e) => e.kind === kind && e.ticker === ticker && Math.abs(Date.parse(e.date) - Date.parse(date)) < days * 86400000);

// 1. Insider clusters, replayed by filing date.
const ins = await zone("raw_insider");
if (ins?.buys?.length) {
  const days = [...new Set(ins.buys.map((b) => b.filed))].filter(Boolean).sort();
  for (const d of days) {
    const seen = ins.buys.filter((b) => b.filed && b.filed <= d);
    for (const c of clusters(seen, new Date(d + "T23:59:59Z"))) {
      if (recentSame("insider", c.ticker, nextDay(d), 30)) continue;
      add({ kind: "insider", key: `insider:${c.issuerCik}:${d}`, ticker: c.ticker, date: nextDay(d), label: c.offering ? "share sale" : "cluster", note: `${c.insiders} insiders, ${c.company}` });
    }
  }
}

// 2. Meme labels.
const meme = await zone("meme");
if (meme?.rows?.length) {
  const when = [meme.at, meme.updated, meme.generated_at].find((v) => typeof v === "string");
  const d = (when || today).slice(0, 10);
  for (const r of meme.rows) {
    if (!["Rally", "Buzzing", "Selling off"].includes(r.flag)) continue;
    if (recentSame("meme", r.ticker, nextDay(d), 7)) continue;
    add({ kind: "meme", key: `meme:${r.ticker}:${r.flag}:${d}`, ticker: r.ticker, date: nextDay(d), label: r.flag });
  }
}

// 3. Bull vs bear verdicts.
const deb = await zone("debate");
for (const [t, x] of Object.entries(deb?.tickers || {})) {
  if (!x?.at || !x.judge?.winner) continue;
  add({ kind: "debate", key: `debate:${t}:${x.at.slice(0, 10)}`, ticker: t, date: nextDay(x.at), label: x.judge.winner, note: `bull ${x.judge.bull}, bear ${x.judge.bear}` });
}

// Prices: one Yahoo call per ticker, plus SPY.
const series = new Map();
const px = async (t, range = "2y") => {
  if (series.has(t)) return series.get(t);
  let s = [];
  try { s = await yahooDaily(t.replace(/\./g, "-"), range); } catch {}
  series.set(t, s);
  await new Promise((r) => setTimeout(r, 250));
  return s;
};
const spy = await px("SPY");
if (!spy.length) { console.log("::warning::Scorecard: no S&P 500 prices from Yahoo; trying again next hour."); process.exit(0); }
for (const e of entries) {
  const done = HORIZONS.every((h) => e.r?.[h.k]);
  if (done) continue;
  const s = await px(e.ticker);
  if (s.length) e.r = measure(e, s, spy);
}

// 4. The mood dial over five years.
let mood = null;
try {
  const vix = await yahooDaily("^VIX", "5y");
  const spx = await yahooDaily("^GSPC", "5y");
  const rows = moodHistory(vix, spx, moodFor);
  const names = ["Buoyant", ...MOOD_BANDS.map(([, m]) => m)];
  mood = {
    since: rows[0]?.date,
    base: summarise(rows),
    bands: names.map((m) => ({ mood: m, days: rows.filter((r) => r.mood === m).length, s: summarise(rows.filter((r) => r.mood === m)) })).filter((b) => b.days)
  };
} catch (e) {
  console.log(`::warning::Scorecard: mood history failed: ${e.message}`);
}

const of = (kind, label) => entries.filter((e) => e.kind === kind && (!label || e.label === label));
const recent = (kind) => of(kind).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15).map(({ key, ...e }) => e);
const payload = {
  at: new Date().toISOString(),
  horizons: HORIZONS,
  insider: { clusters: summarise(of("insider", "cluster")), sales: summarise(of("insider", "share sale")), count: of("insider").length, first: of("insider").map((e) => e.date).sort()[0] || null, recent: recent("insider"), clusterDays: CLUSTER_DAYS },
  meme: { Rally: summarise(of("meme", "Rally")), Buzzing: summarise(of("meme", "Buzzing")), "Selling off": summarise(of("meme", "Selling off")), count: of("meme").length, first: of("meme").map((e) => e.date).sort()[0] || null },
  debate: { bull: summarise(of("debate", "bull")), bear: summarise(of("debate", "bear")), count: of("debate").length, first: of("debate").map((e) => e.date).sort()[0] || null, recent: recent("debate") },
  mood
};

console.log(`entries: insider ${payload.insider.count}, meme ${payload.meme.count}, debate ${payload.debate.count}`);
for (const [k, v] of Object.entries({ "insider clusters": payload.insider.clusters, rally: payload.meme.Rally, "bull wins": payload.debate.bull })) {
  console.log(k, HORIZONS.map((h) => `${h.t}: n=${v[h.k].n}${v[h.k].n ? ` ex=${(100 * v[h.k].ex).toFixed(1)}% beat=${Math.round(100 * v[h.k].beat)}%` : ""}`).join(" | "));
}
if (mood) for (const b of mood.bands) console.log(`mood ${b.mood.padEnd(8)} days ${String(b.days).padStart(4)} | 1m S&P avg ${(100 * (b.s.m1.ret || 0)).toFixed(1)}% up ${Math.round(100 * (b.s.m1.beat || 0))}% of the time`);
if (PROBE) process.exit(0);

const stamp = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
const w1 = await db.from("market_reads").upsert({ zone: "raw_scorecard", phase: "daily", stamp, payload: { at: payload.at, entries }, updated_at: payload.at }, { onConflict: "zone" });
const w2 = await db.from("market_reads").upsert({ zone: "scorecard", phase: "daily", stamp, payload, updated_at: payload.at }, { onConflict: "zone" });
console.log(w1.error || w2.error ? `::warning::Scorecard: write failed: ${(w1.error || w2.error).message}` : "published");
