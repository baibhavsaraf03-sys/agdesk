#!/usr/bin/env node
/**
 * The hourly meme-stock read. Run by .github/workflows/meme.yml.
 *
 * Fetches the top r/wallstreetbets tickers by mentions (ApeWisdom) and their
 * price, change and volume (Yahoo Finance), labels each one (lib/meme.mjs),
 * and publishes it to Supabase `market_reads` as zone "meme", which the page
 * already loads with the other reads.
 *
 * About three times a day it also asks the free AI writer for a short plain
 * summary of what is moving and why, from the table and the day's headlines.
 * Free models only (Gemini, then Groq): if both are busy the previous summary
 * stays up. It never uses the paid key.
 *
 *   node scripts/meme-read.mjs           normal run
 *   node scripts/meme-read.mjs --probe   no database, no AI: print the table
 */
import { createClient } from "@supabase/supabase-js";
import { fetchMentions, fetchQuotes, buildRows } from "../lib/meme.mjs";
import { fetchNews } from "../lib/news.mjs";
import { geminiJson, groqJson, GEMINI_FEED_MODEL, GROQ_FEED_MODELS } from "../lib/providers.mjs";

const PROBE = process.argv.includes("--probe");
const FORCE_SUMMARY = process.argv.includes("--summary");
const SUMMARY_EVERY_MS = 7 * 3600000; // about three a day

const pct = (v) => (v == null ? "n/a" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`);

const mentions = await fetchMentions();
const quotes = await fetchQuotes(mentions.map((m) => m.ticker));
const rows = buildRows(mentions, quotes);
const priced = rows.filter((r) => r.price != null).length;

console.log(`${rows.length} tickers, ${priced} priced`);
for (const r of rows) {
  console.log(
    `${String(r.rank).padStart(3)} ${r.ticker.padEnd(6)} mentions ${String(r.mentions).padStart(5)} (24h ago ${String(r.mentions24).padStart(5)})  ` +
    `${r.price != null ? `${r.price.toFixed(2).padStart(9)} ${pct(r.change).padStart(7)} vol x${r.volRatio ? r.volRatio.toFixed(1) : "?"}` : `no price (${quotes[r.ticker]?.error})`}  ${r.flag}`
  );
}
if (PROBE) process.exit(priced ? 0 : 1);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const { data: prev } = await db.from("market_reads").select("payload").eq("zone", "meme").maybeSingle();

/* ---- summary, about three times a day, free writers only ---- */

const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    text: {
      type: "string",
      description: "Three to five plain sentences for a beginner: which names the forum is crowding into, which are actually moving, and the one thing to understand about the risk. No advice to buy or sell."
    },
    movers: {
      type: "array",
      description: "Up to five tickers from the table with a one-sentence reason each. Give a reason only if a headline supports it; otherwise say plainly that the headlines show no clear reason.",
      items: {
        type: "object",
        properties: { ticker: { type: "string" }, why: { type: "string" } },
        required: ["ticker", "why"]
      }
    }
  },
  required: ["text", "movers"]
};

async function writeSummary() {
  const news = (await Promise.allSettled(["ams", "doom"].map((z) => fetchNews(z, { hours: 24 }))))
    .flatMap((r) => (r.status === "fulfilled" ? r.value.items || [] : []));
  const names = rows.slice(0, 15);
  const relevant = news.filter((n) =>
    names.some((r) => new RegExp(`\\b${r.ticker}\\b`).test(n.title) || (r.name && r.name.length > 3 && n.title.toLowerCase().includes(r.name.toLowerCase().split(" ")[0])))
  ).slice(0, 30);

  const table = names.map((r) =>
    `${r.ticker} (${r.name}): ${r.mentions} mentions, ${r.mentions24} a day earlier; price ${r.price ?? "n/a"} ${pct(r.change)}; volume ${r.volRatio ? `${r.volRatio.toFixed(1)}x` : "n/a"} its 20-day average; label ${r.flag || "none"}`
  ).join("\n");
  const prompt =
    `The most-discussed tickers on Reddit's r/wallstreetbets over the last 24 hours, with their price move and volume:\n${table}\n\n` +
    `Headlines from the last 24 hours that mention any of them:\n${relevant.map((n) => `- ${n.title} (${n.source})`).join("\n") || "(none)"}\n\n` +
    "Write the summary. Use only the figures and headlines given. A label of Rally means the talk and the price rose together; Buzzing means talk without a price move; Selling off means talk while the price fell.";
  const system = "You write for a markets terminal used by students and beginners. Plain words, no hype, no slang, no recommendations.";

  const tried = [];
  for (const model of GEMINI_FEED_MODEL.split(",").map((m) => m.trim()).filter(Boolean)) {
    try {
      const out = await geminiJson({ model, system, prompt, schema: SUMMARY_SCHEMA, maxTokens: 1500 });
      if (out?.text) return { ...out, writer: "gemini" };
    } catch (err) {
      tried.push(`${model}: ${String(err.message).slice(0, 80)}`);
    }
  }
  if (process.env.GROQ_API_KEY) {
    for (const { model, tpm } of GROQ_FEED_MODELS) {
      try {
        const out = await groqJson({ model, tpm, system, prompt, schema: SUMMARY_SCHEMA, maxTokens: 1200 });
        if (out?.text) return { ...out, writer: "groq" };
      } catch (err) {
        tried.push(`${model}: ${String(err.message).slice(0, 80)}`);
      }
    }
  }
  console.warn(`  summary not written (${tried.join("; ") || "no free writer configured"}); the previous one stays`);
  return null;
}

let summary = prev?.payload?.summary || null;
const summaryAge = summary?.at ? Date.now() - Date.parse(summary.at) : Infinity;
if (FORCE_SUMMARY || summaryAge >= SUMMARY_EVERY_MS) {
  if (process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY) {
    const s = await writeSummary();
    if (s) {
      const known = new Set(rows.map((r) => r.ticker));
      summary = {
        text: String(s.text).trim(),
        movers: (Array.isArray(s.movers) ? s.movers : []).filter((m) => known.has(String(m.ticker).toUpperCase())).slice(0, 5)
          .map((m) => ({ ticker: String(m.ticker).toUpperCase(), why: String(m.why).trim() })),
        at: new Date().toISOString(),
        writer: s.writer
      };
      console.log(`  summary written by ${s.writer}`);
    }
  }
}

/* ---- publish ---- */

const stamp = new Date().toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const payload = {
  stamp,
  at: Date.now(),
  rows,
  summary,
  sources: { mentions: "ApeWisdom (r/wallstreetbets, last 24 hours)", prices: "Yahoo Finance, delayed" }
};
const { error } = await db.from("market_reads").upsert(
  { zone: "meme", phase: "hourly", stamp, payload, updated_at: new Date().toISOString() },
  { onConflict: "zone" }
);
if (error) {
  console.error("Database write failed:", error.message);
  process.exit(1);
}
console.log(`published ${rows.length} rows (${rows.filter((r) => r.flag === "Rally").length} rallies)`);
