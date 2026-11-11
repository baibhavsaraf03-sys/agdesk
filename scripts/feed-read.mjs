#!/usr/bin/env node
/**
 * Scheduled market read.
 *
 *   node scripts/feed-read.mjs --zone eas --phase open
 *
 * Runs Claude with the web search tool against one zone, then writes the
 * result into the market_reads table. The site reads that table, so a browser
 * with the terminal open picks up the new read within five minutes without
 * anyone touching the deployment.
 *
 * Designed to be run by GitHub Actions on a cron. Needs ANTHROPIC_API_KEY,
 * NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { fetchQuotes } from "../lib/quotes.mjs";
import { fetchNews, newsBlock } from "../lib/news.mjs";
import { DOOM_TABS, DOOM_WRITTEN, doomTabDigest } from "../lib/doomsday.js";
import {
  geminiJson, groqJson, FEED_PROVIDER, GEMINI_FEED_MODEL, GROQ_FEED_MODELS
} from "../lib/providers.mjs";

/* -------------------------------------------------------------------------- */
/* zones                                                                      */
/* -------------------------------------------------------------------------- */

const ZONE_SPEC = {
  anz: {
    label: "Australia and New Zealand",
    tz: "Australia/Sydney",
    exchanges:
      "Australian Securities Exchange / S&P ASX 200 and All Ordinaries (Sydney); New Zealand Exchange / S&P NZX 50 (Wellington). This zone opens the global trading day, so it is the first reaction to the US close.",
    extra:
      "Cover the Reserve Bank of Australia and Reserve Bank of New Zealand, the Australian and New Zealand dollars against the US dollar, and iron ore, coal, gold and lithium prices, since resources dominate the ASX."
  },
  eas: {
    label: "East Asia",
    tz: "Asia/Hong_Kong",
    exchanges:
      "Japan Exchange Group / Nikkei 225 and TOPIX (Tokyo); Korea Exchange / KOSPI (Seoul); Shanghai Stock Exchange / SSE Composite; Shenzhen Stock Exchange / SZSE Component; Hong Kong Exchanges / Hang Seng and Hang Seng Tech; Taiwan Stock Exchange / TAIEX; Singapore Exchange / Straits Times; Indonesia Stock Exchange / IDX Composite.",
    extra:
      "Cover currency moves against the dollar, especially the yen, yuan and won, and any central bank or policy action in the zone."
  },
  ind: {
    label: "India",
    tz: "Asia/Kolkata",
    exchanges:
      "National Stock Exchange of India / Nifty 50 and Nifty Bank; BSE / Sensex. Both trade 09:15 to 15:30 IST.",
    extra:
      "Cover foreign portfolio investor and domestic institutional flows, which are the dominant swing factor here, plus the rupee, RBI policy and Indian inflation. Rupee weakness has historically eaten a large share of dollar-denominated returns, so state moves in both local and dollar terms where you can."
  },
  eur: {
    label: "Europe, Middle East and Africa",
    tz: "Europe/London",
    exchanges:
      "London / FTSE 100 and FTSE 250; Euronext Paris / CAC 40; Euronext Amsterdam / AEX; Frankfurt / DAX; Zurich / SMI; Milan / FTSE MIB; Madrid / IBEX 35; Stockholm / OMXS30; Istanbul / BIST 100; Riyadh / TASI; Dubai / DFM General; Johannesburg / FTSE JSE All-Share; plus the pan-European STOXX Europe 600.",
    extra:
      "Cover ECB and Bank of England policy, euro-area and UK inflation, the euro, sterling and the dollar index, and energy prices, which matter disproportionately to European indices. Do not try to list all twelve exchanges — pick the ones actually moving."
  },
  ams: {
    label: "Americas",
    tz: "America/New_York",
    exchanges:
      "NYSE and Nasdaq / S&P 500, Nasdaq Composite, Dow Jones Industrial Average, Russell 2000; Toronto / S&P TSX Composite; Bolsa Mexicana / S&P BMV IPC; B3 Sao Paulo / Ibovespa.",
    extra:
      "Cover Federal Reserve policy, the latest US inflation and jobs data, the dollar index and Treasury yields, and market breadth. Where the index move is driven by a handful of very large companies, say so explicitly rather than calling it a broad move."
  },
  doom: {
    label: "The AI trade",
    tz: "America/New_York",
    exchanges:
      "Nasdaq and NYSE: Nvidia, AMD, Micron, Broadcom, CoreWeave, Oracle, Nebius, Microsoft, Meta and the Philadelphia Semiconductor index; plus the private AI labs whose spending commitments sit behind those companies' order books.",
    extra:
      "This feeds a screen that argues AI spending has run ahead of AI revenue and that vendor financing is circular. Your job is not to agree with it. Report what today's headlines add to the case and, with equal weight, what they take away from it: earnings, capital spending guidance, financing deals, chip export rules, credit conditions. Give one section to evidence for the thesis and one to evidence against, and say which side today's news favoured or that it favoured neither. Treat any single day's share move as noise unless the headlines give a reason for it."
  },
  ag: {
    label: "Agricultural commodities",
    tz: "Europe/London",
    exchanges:
      "CBOT corn, soybeans and wheat; KC and MIAX wheat; ICE coffee, cocoa, sugar and cotton; plus rice, palm oil, natural rubber and fertiliser, which are this terminal's speciality.",
    extra:
      "Cover the most recent USDA WASDE, fund positioning, key technical levels, and under-covered markets. Select four to six underrated markets using one test only: you must be able to state a contradiction in a single sentence. The three kinds that qualify are price rising against ample inventory, an input moving far more than its outputs, and an index diverging from its components."
  }
};

const PHASE_BRIEF = {
  overnight: "The market is shut between sessions. Focus on what has changed since the last close: news, moves in other zones that are open, and what the next open has to deal with.",
  weekend: "It is the weekend and the market is shut. Focus on what the week settled and what it left open, any news since Friday's close, and what Monday's open has to deal with. There is no live price action, so do not describe any.",
  open: "The session has just opened. Focus on what gapped and why, and what carried over from the session that closed before it.",
  midday: "Mid-session. Focus on whether the opening move held or reversed, and which sectors are actually carrying the index.",
  close: "The session has closed. Focus on where each index finished, what the day resolved or left unresolved, and what it hands to the next session."
};

/* -------------------------------------------------------------------------- */

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const zone = arg("zone");

/**
 * Local trading hours per zone, used when the phase is "auto" (the hourly
 * schedule). ag follows Chicago grain hours, doom the New York session.
 */
const SESSION = {
  anz: { tz: "Australia/Sydney", open: 10 * 60, close: 16 * 60 },
  eas: { tz: "Asia/Hong_Kong", open: 9 * 60 + 30, close: 16 * 60 },
  ind: { tz: "Asia/Kolkata", open: 9 * 60 + 15, close: 15 * 60 + 30 },
  eur: { tz: "Europe/London", open: 8 * 60, close: 16 * 60 + 30 },
  ams: { tz: "America/New_York", open: 9 * 60 + 30, close: 16 * 60 },
  doom: { tz: "America/New_York", open: 9 * 60 + 30, close: 16 * 60 },
  ag: { tz: "America/Chicago", open: 8 * 60 + 30, close: 13 * 60 + 20 }
};

/** Which part of the trading day it is in the zone's own time, daylight saving included. */
export function phaseNow(z, now = new Date()) {
  const s = SESSION[z];
  if (!s) return "close";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: s.tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now).map((x) => [x.type, x.value])
  );
  if (p.weekday === "Sat" || p.weekday === "Sun") return "weekend";
  const t = Number(p.hour) * 60 + Number(p.minute);
  if (t < s.open) return "overnight";
  if (t < s.open + 120) return "open";
  if (t < s.close - 60) return "midday";
  if (t < s.close + 180) return "close";
  return "overnight";
}

const askedPhase = arg("phase", "close");
const phase = askedPhase === "auto" ? phaseNow(zone) : askedPhase;

if (!ZONE_SPEC[zone]) {
  console.error(`Unknown zone "${zone}". Expected one of: ${Object.keys(ZONE_SPEC).join(", ")}`);
  process.exit(1);
}
if (!PHASE_BRIEF[phase]) {
  console.error(`Unknown phase "${phase}". Expected auto, ${Object.keys(PHASE_BRIEF).join(", ")}.`);
  process.exit(1);
}

const spec = ZONE_SPEC[zone];
const stamp = new Intl.DateTimeFormat("en-GB", {
  timeZone: spec.tz, day: "numeric", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false
}).format(new Date());

/**
 * The read is returned by calling a tool rather than by writing JSON into a
 * reply. A model hand-writing three thousand characters of nested JSON will
 * occasionally drop a bracket; a tool call is validated against this schema
 * by the API, so malformed output cannot reach us.
 */
const READ_TOOL = {
  name: "publish_read",
  description:
    "Publish the finished market read. Call this exactly once, after the research is done.",
  input_schema: {
    type: "object",
    properties: {
      headline: {
        type: "string",
        description:
          "One sharp sentence naming this session's main tension. Not a generic label."
      },
      lede: { type: "string", description: "One sentence: when compiled and from what." },
      short: {
        type: "array",
        description:
          "The read in three plain sentences for someone new to markets: what happened, why it matters, what to watch. No jargon, no figures that are not in the sections.",
        items: { type: "string" }
      },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            h: { type: "string", description: "Heading." },
            body: { type: "string", description: "Two to five sentences." },
            read: {
              type: "string",
              description:
                "How you reached that conclusion from the data: two or three paragraphs separated by blank lines. This is the teaching layer, so make it about method rather than more facts."
            }
          },
          required: ["h", "body"]
        }
      },
      // Only the agricultural read is asked for this; see the schema swap below.
      macro: {
        type: "array",
        description:
          "The macro overlay, shown on its own screen: one to three blocks on the dollar, crude, rates, freight and fertiliser and what each is doing to crop prices right now.",
        items: {
          type: "object",
          properties: {
            h: { type: "string", description: "Heading." },
            body: { type: "string", description: "Three to six sentences built on the verified figures." },
            read: {
              type: "string",
              description:
                "How to read that backdrop: two or three paragraphs separated by blank lines, about method rather than more facts."
            }
          },
          required: ["h", "body"]
        }
      },
      watch: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nm: { type: "string" },
            note: { type: "string", description: "Why it matters into the next session." }
          },
          required: ["nm"]
        }
      },
      sources: {
        type: "array",
        items: {
          type: "object",
          properties: {
            t: { type: "string", description: "Source name and date." },
            u: { type: "string", description: "URL." }
          },
          required: ["t"]
        }
      }
    },
    required: ["headline", "short"]
  }
};

// The macro overlay belongs to the agricultural read. Asking every equity zone
// for one would be sixteen copies of the same paragraph a day, so the field is
// removed from their schema and required in this one.
if (zone === "ag") READ_TOOL.input_schema.required = ["headline", "short", "macro"];
else delete READ_TOOL.input_schema.properties.macro;

// The Doomsday screen's tabs hold a standing argument whose figures are fixed
// at the date it was written. Each doom read adds one dated note per tab
// saying what today's material does to that tab's claims, so the screen stays
// current without the argument itself being rewritten every hour: each note
// carries a fresh "where this stands now" view and up to four current figures.
const TAB_VERDICTS = ["supports", "weakens", "mixed", "no change"];
if (zone === "doom") {
  READ_TOOL.input_schema.properties.tabs = {
    type: "array",
    description: "One entry per Doomsday tab, in the order given: what today's material does to that tab's claims.",
    items: {
      type: "object",
      properties: {
        k: { type: "string", enum: DOOM_TABS.map((t) => t.k), description: "The tab key." },
        verdict: { type: "string", enum: TAB_VERDICTS, description: "Whether today's material supports the tab's claims, weakens them, does both, or does not bear on them." },
        note: { type: "string", description: "One or two plain sentences: the single biggest thing that changed for this tab and which claim it bears on." },
        now: { type: "string", description: "Where this tab's argument stands now, written fresh: four to seven plain sentences a reader can take as the current view, with the standing argument as background. Say which of the tab's fixed figures are out of date and what the material shows instead. Every figure must come from the verified figures or the headlines." },
        figures: {
          type: "array",
          description: "Zero to four current figures that bear on this tab, each taken from the verified figures or the headlines. Leave empty rather than invent one.",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "What the figure is, a few words." },
              value: { type: "string", description: "The figure as published, with its unit." },
              note: { type: "string", description: "Its date and where it came from." }
            },
            required: ["label", "value", "note"]
          }
        }
      },
      required: ["k", "verdict", "note", "now"]
    }
  };
  READ_TOOL.input_schema.required = ["headline", "short", "tabs"];
}

/**
 * The quote grid is no longer the model's job. Rates, currencies and oil come
 * from the public-domain sources in lib/quotes.mjs and are handed to the model
 * as facts; equity index levels are displayed by TradingView's widgets, which
 * are licensed for that. What is left for the model is the part it is actually
 * good at: what the numbers mean and how you would have reached that reading.
 */
function buildPrompt(verified, headlines) {
  return `Produce a market read for the ${spec.label} zone, ${phase.toUpperCase()} phase.

EXCHANGES AND INSTRUMENTS: ${spec.exchanges}

PHASE: ${PHASE_BRIEF[phase]}

${spec.extra}

${verified}

${headlines}

Work from the material above. The figures are exact; the headlines tell you what happened and who reported it. Where the headlines do not establish something — a specific index level, say — do not supply it from memory. Say what you could not confirm: a read that states three things firmly and names its gap is worth more than one that sounds complete and is partly invented.

Return the finished read in the required structure, and nothing else — no preamble and no commentary about your sources.

Requirements:
- ${["close", "weekend"].includes(phase) ? "3-4" : "2-3"} sections, ${["close", "weekend"].includes(phase) ? "4-6" : "3-5"} watch items, 3-6 sources.
${zone === "ag" ? `- Also fill the macro array with one to three blocks: the dollar, crude oil, interest rates, and freight and fertiliser where the material supports them. Build each on the verified figures above, with their dates, and say what it is doing to crop prices now — the dollar caps export demand, crude sets the floor under ethanol and biodiesel, rates price the cost of carrying inventory, fertiliser feeds next year's acreage. If the material says nothing about freight, say so rather than filling the gap. This is separate from the sections and must not repeat them.
` : ""}${zone === "doom" ? `- Also fill the tabs array, one entry for each of these eight tabs, in this order. Each tab is a standing argument written ${DOOM_WRITTEN}; its figures are as of then. For each, say what today's material does to its claims: "supports", "weakens", "mixed", or "no change" when nothing today bears on it. Then write "now": the current view of that tab, fresh, as if briefing someone who will read it instead of the dated text below it. Do not restate the tab; update it. Name the specific claim and the specific headline or figure, and where a fixed figure in the tab is now out of date, say so plainly — the reader is otherwise looking at a stale number. Never supply a current price, total or percentage that is not in the material above. For Positions and Playbook, describe what the news does to the reasoning; do not issue entries, stops, targets or any instruction to trade.
${doomTabDigest()}
` : ""}- Fill "short" with exactly three plain sentences a newcomer could follow: what happened, why it matters, what to watch next. It must agree with the sections and add no figure they do not contain.
- Do not restate the verified figures as a list. Use them: explain what they imply, where they agree or disagree with the equity move, and what would change the reading.
- Every other figure must come from something you actually retrieved in this session. Never carry a number forward unverified. Omit anything you cannot verify rather than guessing.
- Say explicitly when a figure is a forecast or projection rather than a traded level.
- No buy or sell calls and no investment advice. Explain reasoning instead.
- Write plain prose. No citation markup, reference tags, bracketed source indices or inline source numbering anywhere in any field — sources go in the sources array and nowhere else.
- Where two sources disagree materially, say so and say which you trust, rather than averaging them or picking silently.
- Match your language to the size of the move. A 3 basis point change in a yield is small; a 0.2% index move is noise. Never write "plunging", "surging", "soaring" or "collapsing" about a move under roughly 1%, or about a yield change under 15 basis points. State the number and say plainly that it is small. Inflating a quiet session into a dramatic one is the single worst thing you can do here, because a reader cannot tell it from a real move.
- The sources array may contain only outlets that actually appear in the headlines above, or the institutions named in the verified figures. Do not add plausible-sounding sources you did not use, and do not pad the list to look thorough. Three real sources beat six invented ones.
- If the headlines do not explain the session, your sections should say that explicitly and confine themselves to what the verified figures support. A short honest read is correct; a long one built on inference is not.`;
}

/** The verified block, or an honest note that nothing could be verified. */
function verifiedBlock(rows, failed) {
  if (!rows.length) {
    return `VERIFIED FIGURES: none available this run${
      failed.length ? ` (${failed.length} source(s) did not answer)` : ""
    }. State plainly in your sections that rates and currencies could not be confirmed, and do not substitute remembered values.`;
  }
  const lines = rows.map(
    (r) => `- ${r.nm}: ${r.px}${r.ch ? ` (${r.ch})` : ""} — ${r.src}, as of ${r.asof}`
  );
  return `VERIFIED FIGURES — retrieved this run from official sources, each with the date it is as of:
${lines.join("\n")}

How to use these. For the date shown, they are authoritative: do not contradict them. But official statistics lag, and a figure dated several days ago is a reference point, not a current level. Where you retrieve a fresher traded level for the same instrument, lead with the fresher one, give both with their dates, and explain the gap — a wide Brent-WTI spread, for instance, is information about where the disruption is, not an error to reconcile away. Never present a dated figure as the current price.`;
}

/* -------------------------------------------------------------------------- */

/**
 * Built on demand, not at import. A Gemini-only setup has no Anthropic key at
 * all, and the SDK throws at construction when it cannot find one — which
 * would make the free path depend on the paid one being configured.
 */
let _anthropic = null;
function anthropicClient() {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set, and FEED_PROVIDER is not gemini");
    }
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/** Pull the JSON object out of a reply that may have stray text around it. */
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in the reply.");
  return JSON.parse(candidate.slice(start, end + 1));
}

const MODEL = process.env.FEED_MODEL || "claude-sonnet-5-5";
// Search results land in the response alongside the read, so the budget has
// to cover both. Too low and the tool call is truncated mid-write.
const MAX_TOKENS = Number(process.env.FEED_MAX_TOKENS || 20000);
// Anthropic's search tool was the entire running cost of this project: a
// dozen billed searches per read, sixteen reads a day. lib/news.mjs now does
// the gathering for free, so search is off by default and only comes back if
// you ask for it with FEED_SEARCH=1 on the Anthropic path.
const USE_SEARCH = process.env.FEED_SEARCH === "1";
const TOOLS = USE_SEARCH
  ? [{ type: "web_search_20250305", name: "web_search", max_uses: Number(process.env.FEED_SEARCH_USES || 10) }, READ_TOOL]
  : [READ_TOOL];

/** The validated tool input, if the model published one. */
function findRead(content) {
  const block = (content || []).find((b) => b.type === "tool_use" && b.name === "publish_read");
  return block ? block.input : null;
}

/**
 * Strips citation markup out of the read.
 *
 * The web search tool has its own citation convention, and the model carries
 * it into the text it writes — so published prose arrived full of
 * `(cite index="5-3">…</cite>`. Sources belong in the sources array, not
 * inline, and the prompt says so, but a model mid-paragraph will do it anyway.
 */
const CITE_OPEN = /\(?\s*cite\s+index\s*=\s*"[^"]*"\s*>/gi;
const CITE_TAG = /<\/?cite\b[^>]*>/gi;

function stripCites(s) {
  return s
    .replace(CITE_OPEN, "")
    .replace(CITE_TAG, "")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Same treatment for every string in the payload, however deeply nested. */
function deepStrip(value, key) {
  if (typeof value === "string") return key === "u" ? value.trim() : stripCites(value);
  if (Array.isArray(value)) return value.map((v) => deepStrip(v));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepStrip(v, k);
    return out;
  }
  return value;
}

function plainText(content) {
  return (content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}


/**
 * Gemini's JSON mode, given the same schema the Anthropic tool uses. One call,
 * no tools, no search — and on the free tier, no cost.
 */
async function readViaGemini(prompt) {
  // A comma-separated list: each model is tried in turn, all free tier, so a
  // busy or exhausted model hands over to the next instead of to a paid one.
  const models = GEMINI_FEED_MODEL.split(",").map((m) => m.trim()).filter(Boolean);
  let last;
  for (const model of models) {
    try {
      return await readViaGeminiModel(prompt, model);
    } catch (err) {
      last = err;
      console.warn(`  ${model} failed (${String(err.message).slice(0, 120)})`);
    }
  }
  throw last || new Error("No Gemini model configured");
}

const SYSTEM =
  "You are the resident analyst on a markets terminal used by finance, economics and politics students. " +
  "You are given verified figures and headlines. Your job is interpretation, not recall.";

async function readViaGroq(prompt) {
  let last;
  for (const { model, tpm } of GROQ_FEED_MODELS) {
    try {
      const out = await groqJson({ model, tpm, system: SYSTEM, prompt, schema: READ_TOOL.input_schema, maxTokens: zone === "doom" ? 7000 : 3500 });
      if (!out || typeof out !== "object" || !out.headline) throw new Error("no headline in the object");
      console.log(`  written by groq ${model}`);
      return out;
    } catch (err) {
      last = err;
      console.warn(`  groq ${model} ${err.skip ? "skipped" : "failed"} (${String(err.message).slice(0, 120)})`);
    }
  }
  throw last || new Error("No Groq model configured");
}

async function readViaGeminiModel(prompt, model) {
  const out = await geminiJson({
    model,
    system:
      "You are the resident analyst on a markets terminal used by finance, economics and politics students. " +
      "You are given verified figures and headlines. Your job is interpretation, not recall.",
    prompt,
    schema: READ_TOOL.input_schema,
    // Gemini 3.x spends thinking tokens from this same budget, so a ceiling
    // sized only for the prose can be exhausted before any is written.
    maxTokens: Math.min(MAX_TOKENS, 32768)
  });
  if (!out || typeof out !== "object") throw new Error("Gemini returned no object");
  return out;
}

/**
 * Anthropic, via tool calling. Kept because it is better at this, and because
 * FEED_SEARCH=1 restores live search when a read matters enough to pay for.
 */
async function readViaAnthropic(prompt) {
  const first = await anthropicClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    tools: TOOLS,
    messages: [{ role: "user", content: prompt }]
  });

  let payload = findRead(first.content);
  if (payload) return payload;

  const kinds = [...new Set((first.content || []).map((b) => b.type))].join(", ");
  console.warn(`  first pass stopped on "${first.stop_reason}"; blocks: ${kinds || "none"}`);

  // It narrated instead of publishing. Ask again with the tool forced, reusing
  // whatever work the first pass already did.
  const second = await anthropicClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    tools: TOOLS,
    tool_choice: { type: "tool", name: "publish_read" },
    messages: [
      { role: "user", content: prompt },
      { role: "assistant", content: first.content },
      { role: "user", content: "Now call publish_read with the finished read." }
    ]
  });
  payload = findRead(second.content);
  if (payload) return payload;

  const text = plainText(second.content) || plainText(first.content);
  if (!text) throw new Error("The model returned neither a tool call nor any text.");
  return extractJson(text);
}

async function main() {
  // Numbers first. They are cheap, fast and authoritative, and the model
  // reasons better when it is not also trying to remember them.
  console.log(`[${zone}/${phase}] fetching verified figures…`);
  const { rows: quoteRows, ok, failed } = await fetchQuotes(zone);
  if (ok.length) console.log(`  verified ${quoteRows.length} rows from: ${ok.join(", ")}`);
  failed.forEach((f) => console.warn(`  source unavailable — ${f}`));

  // Headlines next, also free. Between the two the model has its material and
  // never needs a billed search tool.
  console.log(`[${zone}/${phase}] gathering headlines…`);
  const { items: news, ok: newsOk, failed: newsFailed } = await fetchNews(zone);
  console.log(`  ${news.length} headlines from ${newsOk.length} source(s)`);
  newsFailed.forEach((f) => console.warn(`  news source unavailable — ${f}`));

  const PROMPT = buildPrompt(verifiedBlock(quoteRows, failed), newsBlock(news, newsFailed));

  /**
   * The hourly schedule would otherwise rewrite a read from identical
   * material, which spends the free quota and says nothing new. If the
   * figures and headlines are the same as the last published read, and that
   * read is under six hours old and from the same phase, leave it alone.
   */
  const material = createHash("sha256")
    .update(JSON.stringify({ q: quoteRows.map((r) => [r.nm, r.px, r.ch]), n: news.map((a) => a.title || "") }))
    .digest("hex")
    .slice(0, 16);
  const { data: prev } = await supabase.from("market_reads").select("payload, updated_at").eq("zone", zone).maybeSingle();
  const age = prev?.updated_at ? Date.now() - Date.parse(prev.updated_at) : Infinity;
  if (!process.argv.includes("--force")) {
    if (prev?.payload?.material === material && prev.payload.phase === phase && age < 6 * 3600000) {
      console.log(`[${zone}/${phase}] nothing new since the read of ${prev.payload.stamp}; left as it is`);
      return;
    }
  }

  console.log(`[${zone}/${phase}] writing the read via ${FEED_PROVIDER}…`);

  /**
   * Free first, paid only as a backstop.
   *
   * A free tier answers 503 when it is busy, and retries do not always outlast
   * that. Rather than leave the screen showing yesterday's read, fall through
   * to Anthropic — the material is already gathered, so this costs tokens
   * only, with no search, and only on the days Gemini is unavailable.
   */
  /**
   * Free first, paid only as a backstop, in this order:
   *   1. Gemini, each model in GEMINI_FEED_MODEL in turn (free tier);
   *   2. Groq, each model in GROQ_FEED_MODELS in turn (free tier), when
   *      GROQ_API_KEY is set and the request fits its per-minute limit;
   *   3. Anthropic (billed), only when FEED_ALLOW_PAID=1 and this zone's
   *      current read is older than FEED_PAID_AFTER_HOURS (default 6). So the
   *      paid key keeps a screen from going stale; it never runs every hour.
   * If all of them fail, the previous read stays up and the run reports it.
   */
  let payload;
  const tried = [];
  if (FEED_PROVIDER === "gemini") {
    try {
      payload = await readViaGemini(PROMPT);
      payload.writer = "gemini";
    } catch (err) {
      tried.push(`gemini: ${String(err.message).slice(0, 120)}`);
    }
    if (!payload && process.env.GROQ_API_KEY) {
      try {
        payload = await readViaGroq(PROMPT);
        payload.writer = "groq";
      } catch (err) {
        tried.push(`groq: ${String(err.message).slice(0, 120)}`);
      }
    }
    if (!payload) {
      const paidAfter = Number(process.env.FEED_PAID_AFTER_HOURS || 6) * 3600000;
      const paidOk = process.env.ANTHROPIC_API_KEY && process.env.FEED_ALLOW_PAID === "1" && age >= paidAfter;
      tried.forEach((t) => console.warn(`  ${t}`));
      if (!paidOk) {
        const why = process.env.FEED_ALLOW_PAID !== "1" || !process.env.ANTHROPIC_API_KEY
          ? "the paid fallback is off"
          : `the current read is only ${Math.round(age / 60000)} minutes old`;
        throw new Error(`every free model failed and ${why}, so the previous read stays up`);
      }
      console.warn("  falling back to anthropic (billed) on the same material");
      payload = await readViaAnthropic(PROMPT);
      payload.writer = "anthropic";
    }
  } else {
    payload = await readViaAnthropic(PROMPT);
    payload.writer = "anthropic";
  }

  // A read with no headline is not a read. Everything else is allowed to be
  // thin: a partial read beats replacing a good one with nothing, and the
  // counts printed at the end make thinness visible.
  if (!payload.headline) {
    throw new Error("The published read had no headline.");
  }
  payload = deepStrip(payload);
  payload.sections = Array.isArray(payload.sections) ? payload.sections : [];
  payload.watch = Array.isArray(payload.watch) ? payload.watch : [];
  payload.short = (Array.isArray(payload.short) ? payload.short : []).filter((x) => typeof x === "string" && x.trim()).slice(0, 4);
  if (zone === "ag") {
    payload.macro = (Array.isArray(payload.macro) ? payload.macro : []).filter((m) => m && m.body);
    if (!payload.macro.length) console.warn("  warning: published with no macro overlay");
  }
  if (zone === "doom") {
    const seen = new Set();
    payload.tabs = (Array.isArray(payload.tabs) ? payload.tabs : []).filter((t) => {
      const ok = t && DOOM_TABS.some((x) => x.k === t.k) && !seen.has(t.k) && typeof t.note === "string" && t.note.trim();
      if (ok) seen.add(t.k);
      return ok;
    }).map((t) => ({
      k: t.k,
      verdict: TAB_VERDICTS.includes(t.verdict) ? t.verdict : "mixed",
      note: t.note.trim(),
      now: typeof t.now === "string" ? t.now.trim() : "",
      figures: (Array.isArray(t.figures) ? t.figures : [])
        .filter((f) => f && typeof f.label === "string" && typeof f.value === "string" && f.label.trim() && f.value.trim())
        .slice(0, 4)
        .map((f) => ({ label: f.label.trim(), value: f.value.trim(), note: typeof f.note === "string" ? f.note.trim() : "" }))
    }));
    if (payload.tabs.length < DOOM_TABS.length) console.warn(`  warning: notes for ${payload.tabs.length} of ${DOOM_TABS.length} tabs`);
  }
  payload.sources = Array.isArray(payload.sources) ? payload.sources : [];
  if (!payload.sections.length) {
    console.warn("  warning: published with no sections — raise FEED_MAX_TOKENS if this recurs");
  }
  payload.stamp = payload.stamp || stamp;
  payload.phase = phase;
  payload.at = Date.now();
  payload.material = material;

  // The grid is the verified set, not anything the model produced.
  payload.rows = quoteRows;
  payload.quoteSources = ok;
  payload.quoteGaps = failed;

  const { error } = await supabase.from("market_reads").upsert(
    { zone, phase, stamp: payload.stamp, payload, updated_at: new Date().toISOString() },
    { onConflict: "zone" }
  );
  if (error) throw new Error(`Database write failed: ${error.message}`);

  console.log(`[${zone}/${phase}] published — ${payload.headline}`);
  console.log(`  rows: ${payload.rows.length}, sections: ${(payload.sections || []).length}, macro: ${(payload.macro || []).length}, tabs: ${(payload.tabs || []).length}, sources: ${(payload.sources || []).length}`);
}

main().catch((err) => {
  console.error(`[${zone}/${phase}] FAILED: ${err.message}`);
  process.exit(1);
});
