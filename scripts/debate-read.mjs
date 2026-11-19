#!/usr/bin/env node
/**
 * Bull vs bear debates (BVB screen). Called as a job of the hourly Market
 * reads workflow; each run refreshes the oldest debate if it is over
 * REFRESH_DAYS old (so the 16 tickers in lib/debate.mjs turn over about
 * weekly at three free-writer calls an hour at most). Published to
 * `market_reads` zone "debate".
 *
 * Three calls per ticker: bull, bear (each sees only the facts), then the
 * judge (sees the facts and both cases). Any number not in the facts gets the
 * answer rejected and retried; after three failures that ticker is skipped.
 *
 *   node scripts/debate-read.mjs                 normal (one ticker if due)
 *   node scripts/debate-read.mjs --count=3       up to three tickers
 *   node scripts/debate-read.mjs --ticker=NVDA   that one, now
 *   node scripts/debate-read.mjs --probe         one ticker, no database, print it
 */
import { createClient } from "@supabase/supabase-js";
import { geminiJson, groqJson, GEMINI_FEED_MODEL, GROQ_FEED_MODELS } from "../lib/providers.mjs";
import { TICKERS, buildFacts, checkNumbers } from "../lib/debate.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const PROBE = process.argv.includes("--probe");
const COUNT = Number(arg("count") || 1);
const ONLY = arg("ticker")?.toUpperCase();
const REFRESH_DAYS = Number(process.env.DEBATE_REFRESH_DAYS || 7);

const SIDE_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string", description: "The case in one sentence, under 20 words." },
    points: {
      type: "array", minItems: 3, maxItems: 4,
      items: {
        type: "object",
        properties: {
          claim: { type: "string", description: "One argument, under 15 words." },
          evidence: { type: "string", description: "One or two sentences citing figures from the facts, exactly as given." }
        },
        required: ["claim", "evidence"]
      }
    },
    weakness: { type: "string", description: "The strongest point against your own case, in one sentence." }
  },
  required: ["headline", "points", "weakness"]
};
const JUDGE_SCHEMA = {
  type: "object",
  properties: {
    winner: { type: "string", enum: ["bull", "bear", "draw"] },
    bull: { type: "integer", minimum: 0, maximum: 10, description: "How well the figures support the bull case." },
    bear: { type: "integer", minimum: 0, maximum: 10, description: "How well the figures support the bear case." },
    reason: { type: "string", description: "Two or three sentences: which case used the figures better and why." },
    watch: { type: "string", description: "The one figure in the next filing that would settle the argument, in one sentence." }
  },
  required: ["winner", "bull", "bear", "reason", "watch"]
};

const RULES =
  "Use only the facts given. Copy any figure exactly as it appears in the facts; do not calculate new numbers, round differently, or bring in anything you remember about the company. " +
  "Do not argue that a company is short of cash from the cash line alone when the facts say short-term investments are not included. " +
  "Plain English for a reader who is new to markets. No advice to buy or sell, no price targets, no predictions of the share price.";

async function write(system, prompt, schema, maxTokens) {
  const tried = [];
  for (const model of GEMINI_FEED_MODEL.split(",").map((m) => m.trim()).filter(Boolean)) {
    try { const out = await geminiJson({ model, system, prompt, schema, maxTokens }); if (out) return { out, writer: "gemini" }; }
    catch (e) { tried.push(`${model}: ${String(e.message).slice(0, 80)}`); }
  }
  if (process.env.GROQ_API_KEY) {
    for (const { model, tpm } of GROQ_FEED_MODELS) {
      try { const out = await groqJson({ model, tpm, system, prompt, schema, maxTokens }); if (out) return { out, writer: "groq" }; }
      catch (e) { tried.push(`${model}: ${String(e.message).slice(0, 80)}`); }
    }
  }
  throw new Error(`no free writer answered (${tried.join("; ") || "none configured"})`);
}

async function checked(label, system, prompt, schema, allowed, maxTokens = 1400) {
  let note = "";
  for (let i = 0; i < 3; i++) {
    const { out, writer } = await write(system, prompt + note, schema, maxTokens);
    const bad = checkNumbers(JSON.stringify(out), allowed);
    if (!bad.length) return { ...out, writer };
    console.log(`  ${label}: rejected, figures not in the facts: ${bad.join(", ")}`);
    note = `\n\nYour last answer used figures that are not in the facts (${bad.join(", ")}). Use only figures exactly as written in the facts.`;
  }
  throw new Error(`${label}: kept using figures not in the facts`);
}

async function debate(ticker) {
  const facts = await buildFacts(ticker);
  const base = `FACTS\n${facts.text}\n\n`;
  const bull = await checked("bull", `You argue the bull case: why this company's figures look strong. ${RULES}`,
    base + "Make the strongest honest case that these figures are good news for the company's owners.", SIDE_SCHEMA, facts.allowed);
  const bear = await checked("bear", `You argue the bear case: why this company's figures look weak or risky. ${RULES}`,
    base + "Make the strongest honest case that these figures are a warning for the company's owners.", SIDE_SCHEMA, facts.allowed);
  const judge = await checked("judge", `You judge a debate between a bull and a bear. Score how well each side's argument is supported by the facts, not which view you hold about the stock. ${RULES}`,
    base + `BULL CASE\n${JSON.stringify(bull)}\n\nBEAR CASE\n${JSON.stringify(bear)}\n\nJudge which case the facts support better. Penalise any claim the facts do not back.`,
    JUDGE_SCHEMA, facts.allowed, 900);
  return { ticker, name: facts.name, cik: facts.cik, fy: facts.fy, facts: facts.text, bull, bear, judge, at: new Date().toISOString() };
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = !PROBE && url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
if (!PROBE && !db) { console.log("::warning::Debate read: Supabase secrets missing."); process.exit(0); }
if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) { console.log("::warning::Debate read: no free writer key."); process.exit(0); }
const prev = db ? (await db.from("market_reads").select("payload").eq("zone", "debate").maybeSingle()).data?.payload : null;
const have = prev?.tickers || {};

const age = (t) => (have[t]?.at ? (Date.now() - Date.parse(have[t].at)) / 86400000 : Infinity);
const due = ONLY ? [ONLY] : TICKERS.filter((t) => age(t) >= REFRESH_DAYS).sort((a, b) => age(b) - age(a)).slice(0, PROBE ? 1 : COUNT);
if (!due.length) { console.log("No debate due."); process.exit(0); }

let changed = false;
for (const t of due) {
  try {
    console.log(`${t}: writing`);
    const d = await debate(t);
    have[t] = d;
    changed = true;
    console.log(`${t}: ${d.judge.winner} (bull ${d.judge.bull}, bear ${d.judge.bear}); writers ${d.bull.writer}/${d.bear.writer}/${d.judge.writer}`);
    if (PROBE) console.log("\n" + d.facts + "\n\nBULL " + JSON.stringify(d.bull, null, 1) + "\n\nBEAR " + JSON.stringify(d.bear, null, 1) + "\n\nJUDGE " + JSON.stringify(d.judge, null, 1));
  } catch (e) {
    console.log(`::warning::${t}: ${e.message}`);
  }
}
if (PROBE || !changed) process.exit(0);

const now = new Date();
const { error } = await db.from("market_reads").upsert(
  { zone: "debate", phase: "weekly", stamp: now.toISOString().slice(0, 16).replace("T", " ") + " UTC", payload: { at: now.toISOString(), list: TICKERS, tickers: have, source: "SEC EDGAR company facts; Yahoo prices" }, updated_at: now.toISOString() },
  { onConflict: "zone" }
);
console.log(error ? `::warning::Debate read: database write failed: ${error.message}` : "published");
