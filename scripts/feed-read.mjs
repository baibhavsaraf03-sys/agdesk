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
import { fetchQuotes } from "../lib/quotes.mjs";

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
const phase = arg("phase", "close");

if (!ZONE_SPEC[zone]) {
  console.error(`Unknown zone "${zone}". Expected one of: ${Object.keys(ZONE_SPEC).join(", ")}`);
  process.exit(1);
}
if (!PHASE_BRIEF[phase]) {
  console.error(`Unknown phase "${phase}". Expected open, midday or close.`);
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
    required: ["headline"]
  }
};

/**
 * The quote grid is no longer the model's job. Rates, currencies and oil come
 * from the public-domain sources in lib/quotes.mjs and are handed to the model
 * as facts; equity index levels are displayed by TradingView's widgets, which
 * are licensed for that. What is left for the model is the part it is actually
 * good at: what the numbers mean and how you would have reached that reading.
 */
function buildPrompt(verified) {
  return `Produce a market read for the ${spec.label} zone, ${phase.toUpperCase()} phase.

EXCHANGES AND INSTRUMENTS: ${spec.exchanges}

PHASE: ${PHASE_BRIEF[phase]}

${spec.extra}

${verified}

Research the rest using web search — aim for eight to fourteen searches. Find current index levels and percentage moves, the one or two things actually driving them, relevant central bank and policy news, and anything that changes how the verified figures above should be read.

When the research is done, call the publish_read tool with the finished read. Do not write the read out as prose or JSON in your reply; the tool call is the deliverable.

Requirements:
- ${phase === "close" ? "3-4" : "2-3"} sections, ${phase === "close" ? "4-6" : "3-5"} watch items, 3-6 sources.
- Do not restate the verified figures as a list. Use them: explain what they imply, where they agree or disagree with the equity move, and what would change the reading.
- Every other figure must come from something you actually retrieved in this session. Never carry a number forward unverified. Omit anything you cannot verify rather than guessing.
- Say explicitly when a figure is a forecast or projection rather than a traded level.
- No buy or sell calls and no investment advice. Explain reasoning instead.`;
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
  return `VERIFIED FIGURES — retrieved this run from official sources. Treat these as authoritative and do not contradict them with anything you find by search:
${lines.join("\n")}`;
}

/* -------------------------------------------------------------------------- */

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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
const TOOLS = [
  { type: "web_search_20250305", name: "web_search", max_uses: 14 },
  READ_TOOL
];

/** The validated tool input, if the model published one. */
function findRead(content) {
  const block = (content || []).find((b) => b.type === "tool_use" && b.name === "publish_read");
  return block ? block.input : null;
}

function plainText(content) {
  return (content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

async function main() {
  // Numbers first. They are cheap, fast and authoritative, and the model
  // reasons better when it is not also trying to remember them.
  console.log(`[${zone}/${phase}] fetching verified figures…`);
  const { rows: quoteRows, ok, failed } = await fetchQuotes(zone);
  if (ok.length) console.log(`  verified ${quoteRows.length} rows from: ${ok.join(", ")}`);
  failed.forEach((f) => console.warn(`  source unavailable — ${f}`));

  const PROMPT = buildPrompt(verifiedBlock(quoteRows, failed));

  console.log(`[${zone}/${phase}] researching…`);

  const first = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    tools: TOOLS,
    messages: [{ role: "user", content: PROMPT }]
  });

  let payload = findRead(first.content);
  if (!payload) {
    const kinds = [...new Set((first.content || []).map((b) => b.type))].join(", ");
    console.warn(`  first pass stopped on "${first.stop_reason}"; blocks: ${kinds || "none"}`);
  }

  // The model researched but narrated instead of publishing. Ask once more,
  // this time with the tool forced, reusing the research already paid for.
  if (!payload) {
    console.log(`[${zone}/${phase}] no tool call on the first pass; requesting the read`);
    const second = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      tools: TOOLS,
      tool_choice: { type: "tool", name: "publish_read" },
      messages: [
        { role: "user", content: PROMPT },
        { role: "assistant", content: first.content },
        { role: "user", content: "Now call publish_read with the finished read." }
      ]
    });
    payload = findRead(second.content);

    // Last resort: a JSON object written into the reply.
    if (!payload) {
      const text = plainText(second.content) || plainText(first.content);
      if (!text) throw new Error("The model returned neither a tool call nor any text.");
      payload = extractJson(text);
    }
  }

  // A read with no headline is not a read. Everything else is allowed to be
  // thin: a partial read beats replacing a good one with nothing, and the
  // counts printed at the end make thinness visible.
  if (!payload.headline) {
    throw new Error("The published read had no headline.");
  }
  payload.sections = Array.isArray(payload.sections) ? payload.sections : [];
  payload.watch = Array.isArray(payload.watch) ? payload.watch : [];
  payload.sources = Array.isArray(payload.sources) ? payload.sources : [];
  if (!payload.sections.length) {
    console.warn("  warning: published with no sections — raise FEED_MAX_TOKENS if this recurs");
  }
  payload.stamp = payload.stamp || stamp;
  payload.phase = phase;
  payload.at = Date.now();

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
  console.log(`  rows: ${payload.rows.length}, sections: ${(payload.sections || []).length}, sources: ${(payload.sources || []).length}`);
}

main().catch((err) => {
  console.error(`[${zone}/${phase}] FAILED: ${err.message}`);
  process.exit(1);
});
