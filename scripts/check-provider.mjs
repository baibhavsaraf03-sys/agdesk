#!/usr/bin/env node
/**
 * Lists the Gemini models your key can use, then makes one real structured
 * call to prove the whole path works.
 *
 *   node scripts/check-provider.mjs
 *
 * Model ids change and guessing them wastes an afternoon, so this asks rather
 * than assumes. Whatever it recommends can be pinned in GEMINI_FEED_MODEL and
 * GEMINI_AGENT_MODEL.
 */

import { geminiModels, geminiJson, geminiText, GEMINI_FEED_MODEL, GEMINI_AGENT_MODEL } from "../lib/providers.mjs";

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set in this shell.");
  console.error("Get one free at https://aistudio.google.com/apikey, add it to .env.local,");
  console.error("then reload the environment into this window.");
  process.exit(1);
}

console.log("Models available to this key:\n");
let models = [];
try {
  models = await geminiModels();
} catch (err) {
  console.error(`Could not list models: ${err.message}`);
  process.exit(1);
}

for (const m of models) {
  console.log(`  ${m.id.padEnd(40)} in ${String(m.inputLimit || "?").padStart(9)}  out ${String(m.outputLimit || "?").padStart(7)}  ${m.display || ""}`);
}

const ids = models.map((m) => m.id);
const flash = ids.filter((i) => /flash/i.test(i) && !/image|tts|audio|embed|live/i.test(i));
console.log(`\n${models.length} models, ${flash.length} of them text Flash variants.`);

const feedModel = ids.includes(GEMINI_FEED_MODEL) ? GEMINI_FEED_MODEL : flash[0];
const agentModel = ids.includes(GEMINI_AGENT_MODEL) ? GEMINI_AGENT_MODEL : flash[0];

if (!feedModel) {
  console.error("\nNo usable Flash model found. Pick one from the list above and set GEMINI_FEED_MODEL.");
  process.exit(1);
}
if (feedModel !== GEMINI_FEED_MODEL) {
  console.log(`\nThe default GEMINI_FEED_MODEL (${GEMINI_FEED_MODEL}) is not in your list.`);
  console.log(`Add this to .env.local:  GEMINI_FEED_MODEL=${feedModel}`);
}
if (agentModel !== GEMINI_AGENT_MODEL) {
  console.log(`Add this to .env.local:  GEMINI_AGENT_MODEL=${agentModel}`);
}

console.log(`\nTesting structured output on ${feedModel}…`);
try {
  const out = await geminiJson({
    model: feedModel,
    system: "You are a terse markets analyst.",
    prompt:
      "The US 10-year yield rose 8bp to 5.12% while the S&P 500 closed flat. " +
      "Return one headline and one section explaining what that combination implies.",
    schema: {
      type: "object",
      properties: {
        headline: { type: "string" },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: { h: { type: "string" }, body: { type: "string" } },
            required: ["h", "body"]
          }
        }
      },
      required: ["headline", "sections"]
    },
    maxTokens: 900
  });
  console.log(`  headline: ${out.headline}`);
  console.log(`  sections: ${(out.sections || []).length}`);
  console.log("  structured output works.");
} catch (err) {
  console.error(`  FAILED: ${err.message}`);
  process.exit(1);
}

console.log(`\nTesting plain text on ${agentModel}…`);
try {
  const text = await geminiText({
    model: agentModel,
    system: "Answer in one sentence.",
    messages: [{ role: "user", content: "What does an inverted yield curve usually indicate?" }],
    maxTokens: 200
  });
  console.log(`  ${text.slice(0, 160)}`);
  console.log("  text generation works.");
} catch (err) {
  console.error(`  FAILED: ${err.message}`);
  process.exit(1);
}

console.log("\nBoth paths work. The feed can run on Gemini at no cost.");
