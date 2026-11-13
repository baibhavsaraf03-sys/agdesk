/**
 * Daily news notes for the fixed-text screens.
 *
 *   node scripts/notes-read.mjs --set all
 *   node scripts/notes-read.mjs --set disc     (or flow, glos, lessons)
 *
 * Gathers the same free headlines the market reads use, hands the model a
 * numbered list plus the items of one set (lib/notes.js), and asks, item by
 * item, which headline shows it at work. Items with no fitting headline get
 * no note; that is the expected result for most of them on most days.
 *
 * The guard against invention is structural: each note must give the number
 * of the headline it rests on, and any note whose number is not on the list
 * is dropped. The headline's own title and link are stored with the note, so
 * the reader can always see what it came from.
 *
 * Writes one row per set to `market_reads` as zone `notes_<set>`. A set that
 * fails keeps its previous row; the others still publish.
 */
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { fetchNews } from "../lib/news.mjs";
import { NOTE_SETS, NOTE_SET_KEYS } from "../lib/notes.js";
import { FEED_PROVIDER, GEMINI_FEED_MODEL, GROQ_FEED_MODELS, geminiJson, groqJson } from "../lib/providers.mjs";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const which = arg("set", "all");
const sets = which === "all" ? NOTE_SET_KEYS : which.split(",");
for (const s of sets) {
  if (!NOTE_SETS[s]) {
    console.error(`Unknown set "${s}". Expected all or one of: ${NOTE_SET_KEYS.join(", ")}`);
    process.exit(1);
  }
}

const MODEL = process.env.FEED_MODEL || "claude-sonnet-5-5";
const MAX_HEADLINES = 90;
// Headlines from every desk, so a law framework can find a court ruling and a
// glossary term a commodity story.
const NEWS_ZONES = ["eur", "ams", "eas", "ind", "anz", "ag", "doom"];

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const SCHEMA = {
  type: "object",
  properties: {
    notes: {
      type: "array",
      description: "Only items that a listed headline genuinely illustrates. Leave the rest out.",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "The item id exactly as given." },
          h: { type: "integer", description: "The number of the headline the note rests on." },
          note: { type: "string", description: "One or two plain sentences." }
        },
        required: ["id", "h", "note"]
      }
    }
  },
  required: ["notes"]
};

async function gatherHeadlines() {
  const results = await Promise.allSettled(NEWS_ZONES.map((z) => fetchNews(z)));
  const seen = new Set();
  const out = [];
  results.forEach((r, i) => {
    if (r.status !== "fulfilled") return console.warn(`  news for ${NEWS_ZONES[i]} failed: ${r.reason?.message}`);
    for (const a of r.value.items) {
      const key = a.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").slice(0, 70);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(a);
    }
  });
  // Newest first where the feed gave a time, so the cap keeps today's news.
  out.sort((a, b) => (Date.parse(b.when) || 0) - (Date.parse(a.when) || 0));
  return out.slice(0, MAX_HEADLINES);
}

function buildPrompt(set, items, headlines) {
  return `Below are today's headlines, numbered, and a list of ${set.label} from a learning terminal for finance, economics and politics students.

For each item, decide whether one of the headlines genuinely shows it at work today. ${set.ask}

Rules:
- Most items will have no fitting headline on a given day. Leave those out entirely. A forced or loose connection is worse than none: the note sits under fixed teaching text, and a reader will trust it.
- The headline must be a real case of the item, not merely share a word with it.
- Use only what the headline itself says. Do not add figures, names or events from memory. If the headline gives no number, the note gives no number.
- Write for a beginner. Plain sentences, no jargon that the item itself does not teach, no investment advice, no buy or sell calls.
- Do not start with "This headline" or "Today's news". Say the thing.
- One headline may serve several items. Give each item at most one note.
- Copy each id exactly.

HEADLINES:
${headlines.map((a, i) => `[${i + 1}] ${a.title}${a.source ? ` (${a.source})` : ""}`).join("\n")}

ITEMS:
${items.map((it) => `- id ${it.id} · ${it.name}: ${it.about}`).join("\n")}`;
}

const SYSTEM =
  "You annotate fixed teaching material with live examples from the day's headlines. You are precise and you would rather leave an item without a note than give it a weak one.";

// Free writers only (13 Nov): Gemini's free models in turn, then Groq's.
// These notes are a garnish on fixed teaching pages, so when every free
// writer is busy or out of allowance the previous notes simply stay up; the
// paid model is never used here. Set NOTES_ALLOW_PAID=1 to change that.
const ALLOW_PAID = process.env.NOTES_ALLOW_PAID === "1" && !!process.env.ANTHROPIC_API_KEY;

let _anthropic;
async function viaAnthropic(prompt) {
  _anthropic ||= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // Current Claude models refuse a forced tool_choice, so the tool is offered
  // and the instruction asks for it; a reply without the call is an error.
  const res = await _anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM + " Reply only by calling publish_notes.",
    tools: [{ name: "publish_notes", description: "Publish the notes.", input_schema: SCHEMA }],
    messages: [{ role: "user", content: prompt }]
  });
  const block = (res.content || []).find((b) => b.type === "tool_use");
  if (!block) throw new Error("Anthropic returned no notes");
  return block.input;
}

/** Thrown when every free writer was busy or out of allowance: not a fault. */
class WritersBusy extends Error {}

async function write(prompt) {
  const tried = [];
  if (FEED_PROVIDER === "gemini" && process.env.GEMINI_API_KEY) {
    for (const model of GEMINI_FEED_MODEL.split(",").map((m) => m.trim()).filter(Boolean)) {
      try {
        const out = await geminiJson({ model, system: SYSTEM, prompt, schema: SCHEMA, maxTokens: 16384 });
        console.log(`  written by gemini ${model}`);
        return out;
      } catch (err) {
        tried.push(`${model}: ${String(err.message).slice(0, 90)}`);
        console.warn(`  ${model} unavailable (${String(err.message).slice(0, 120)})`);
      }
    }
  }
  if (process.env.GROQ_API_KEY) {
    for (const { model, tpm } of GROQ_FEED_MODELS) {
      try {
        const out = await groqJson({ model, tpm, system: SYSTEM, prompt, schema: SCHEMA, maxTokens: 6000 });
        console.log(`  written by groq ${model}`);
        return out;
      } catch (err) {
        tried.push(`groq ${model}: ${String(err.message).slice(0, 90)}`);
        console.warn(`  groq ${model} ${err.skip ? "skipped" : "unavailable"} (${String(err.message).slice(0, 120)})`);
      }
    }
  }
  if (ALLOW_PAID) return viaAnthropic(prompt);
  throw new WritersBusy(`every free writer was busy or out of allowance (${tried.length} tried)`);
}

/** Keep only notes that name a real item and a real headline. */
export function validNotes(raw, items, headlines) {
  const ids = new Set(items.map((i) => i.id));
  const out = {};
  for (const n of Array.isArray(raw?.notes) ? raw.notes : []) {
    const h = headlines[Number(n?.h) - 1];
    const text = typeof n?.note === "string" ? n.note.replace(/\s+/g, " ").trim() : "";
    if (!ids.has(n?.id) || !h || !text || out[n.id]) continue;
    out[n.id] = { note: text.slice(0, 600), src: { t: h.title, u: h.url || "", s: h.source || "" } };
  }
  return out;
}

async function main() {
  console.log("gathering headlines…");
  const headlines = await gatherHeadlines();
  console.log(`  ${headlines.length} headlines`);
  if (headlines.length < 5) throw new Error("Too few headlines to annotate anything; leaving the existing notes in place.");

  const stamp = new Date().toLocaleString("en-GB", {
    timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  }) + " London";

  let failures = 0;
  let busy = 0;
  for (const key of sets) {
    const set = NOTE_SETS[key];
    const items = set.items();
    try {
      console.log(`[${key}] writing notes for ${items.length} items via ${FEED_PROVIDER}…`);
      const notes = validNotes(await write(buildPrompt(set, items, headlines)), items, headlines);
      const n = Object.keys(notes).length;
      const payload = { notes, stamp, at: Date.now(), headlines: headlines.length };
      const { error } = await supabase.from("market_reads").upsert(
        { zone: `notes_${key}`, phase: "notes", stamp, payload, updated_at: new Date().toISOString() },
        { onConflict: "zone" }
      );
      if (error) throw new Error(`Database write failed: ${error.message}`);
      console.log(`[${key}] published ${n} of ${items.length}`);
    } catch (err) {
      if (err instanceof WritersBusy) {
        busy++;
        console.warn(`[${key}] skipped, previous notes kept: ${err.message}`);
      } else {
        failures++;
        console.error(`[${key}] FAILED: ${err.message}`);
      }
    }
  }
  // A busy free tier is expected now and then and is not worth a failure
  // email; a real fault (database, bad output on every set) still is.
  if (busy) console.log(`::warning::${busy} of ${sets.length} note sets kept their previous notes because the free writers were busy.`);
  if (failures && failures + busy === sets.length) process.exit(1);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  main().catch((err) => {
    console.error(`FAILED: ${err.message}`);
    process.exit(1);
  });
}
