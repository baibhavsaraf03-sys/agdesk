/**
 * Model providers.
 *
 * Two functions in this app call a model, and they have different
 * requirements, so each picks its own provider:
 *
 *   The scheduled reads write a structured object from material we fetched
 *   ourselves. No search tool, no conversation, and nobody's private text is
 *   involved — so a free tier is a good fit and this defaults to Gemini.
 *
 *   The analyst answers whatever a visitor types, which on this site includes
 *   students pasting their own essays for marking. Free tiers generally
 *   reserve the right to train on that, so this defaults to Anthropic, where
 *   the API does not. Flip it with AGENT_PROVIDER if you decide otherwise —
 *   but say so on the TERMS screen if you do.
 *
 * Both paths return the same shape, so callers do not branch on provider.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * POSTs to Gemini, waiting out the failures that are about capacity rather
 * than about the request.
 *
 * A free tier answers 503 when it is busy, and a scheduled job firing sixteen
 * times a day will meet that regularly — the first live run died on exactly
 * this. 429, 500 and 503 are worth waiting for; 400 and 401 never are, since
 * no amount of patience fixes a malformed request or a bad key.
 */
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const WAITS = [0, 5000, 20000];

const nap = (ms) => new Promise((r) => setTimeout(r, ms));

async function geminiPost(model, body, apiKey) {
  let last;

  for (let attempt = 0; attempt < WAITS.length; attempt++) {
    if (WAITS[attempt]) await nap(WAITS[attempt]);

    let res;
    let text;
    try {
      res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      text = await res.text();
    } catch (err) {
      last = err;
      continue;
    }

    if (res.ok) return text;

    last = new Error(`Gemini HTTP ${res.status}: ${text.slice(0, 200).replace(/\s+/g, " ")}`);
    last.status = res.status;
    if (!RETRYABLE.has(res.status)) throw last;
  }

  throw last || new Error("Gemini unreachable");
}

/**
 * Converts ordinary JSON Schema into the shape Gemini wants.
 *
 * Its schema type is a protobuf enum, so the values are STRING and OBJECT
 * rather than the lowercase JSON Schema spelling, and unrecognised keys are
 * rejected outright. This lets callers write one schema and use it with either
 * provider instead of maintaining two that can drift apart.
 */
const KEEP = new Set(["type", "properties", "required", "items", "enum", "description", "nullable"]);

export function toGeminiSchema(node) {
  if (!node || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map(toGeminiSchema);

  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (!KEEP.has(k)) continue;
    if (k === "type") out.type = String(v).toUpperCase();
    else if (k === "properties") {
      out.properties = {};
      for (const [pk, pv] of Object.entries(v)) out.properties[pk] = toGeminiSchema(pv);
    } else if (k === "items") out.items = toGeminiSchema(v);
    else out[k] = v;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Gemini                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Gemini's JSON mode. Passing a response schema makes the model return an
 * object matching it, which is the same guarantee Anthropic's tool calling
 * gives us and the reason the feed can stop parsing prose.
 */
export async function geminiJson({ model, system, prompt, schema, maxTokens = 8192, key }) {
  const apiKey = key || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const body = await geminiPost(
    model,
    {
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: toGeminiSchema(schema),
        maxOutputTokens: maxTokens,
        temperature: 0.4
      }
    },
    apiKey
  );

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error(`Gemini returned non-JSON: ${body.slice(0, 200)}`);
  }

  const cand = parsed.candidates?.[0];
  if (!cand) {
    const why = parsed.promptFeedback?.blockReason || "no candidates returned";
    throw new Error(`Gemini produced nothing: ${why}`);
  }
  if (cand.finishReason && cand.finishReason !== "STOP") {
    // MAX_TOKENS here means the object is cut off, so it is not usable.
    throw new Error(`Gemini stopped on ${cand.finishReason}`);
  }

  const text = (cand.content?.parts || []).map((p) => p.text || "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty response");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Gemini JSON mode returned unparseable text: ${text.slice(0, 200)}`);
  }
}

/** Plain text, for the analyst. */
export async function geminiText({ model, system, messages, maxTokens = 1400, key }) {
  const apiKey = key || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const body = await geminiPost(
    model,
    {
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      // Gemini calls the assistant role "model".
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.content || "") }]
      })),
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.5 }
    },
    apiKey
  );

  const parsed = JSON.parse(body);
  const cand = parsed.candidates?.[0];
  if (!cand) {
    throw new Error(`Gemini produced nothing: ${parsed.promptFeedback?.blockReason || "no candidates"}`);
  }
  return (cand.content?.parts || []).map((p) => p.text || "").join("").trim();
}

/** Lists the models this key can actually use. Stops us guessing model ids. */
export async function geminiModels(key) {
  const apiKey = key || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const res = await fetch(`${GEMINI_BASE}/models?key=${apiKey}&pageSize=200`);
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json();
  return (body.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => ({
      id: String(m.name || "").replace(/^models\//, ""),
      display: m.displayName,
      inputLimit: m.inputTokenLimit,
      outputLimit: m.outputTokenLimit
    }));
}

/* -------------------------------------------------------------------------- */
/* defaults                                                                   */
/* -------------------------------------------------------------------------- */

export const FEED_PROVIDER = (process.env.FEED_PROVIDER || "gemini").toLowerCase();
export const AGENT_PROVIDER = (process.env.AGENT_PROVIDER || "anthropic").toLowerCase();

/**
 * Model ids move. These are defaults; the real list for your key comes from
 * `node scripts/check-provider.mjs`, and whatever it prints can be set in
 * GEMINI_FEED_MODEL or GEMINI_AGENT_MODEL to pin it.
 */
export const GEMINI_FEED_MODEL = process.env.GEMINI_FEED_MODEL || "gemini-flash-latest";
export const GEMINI_AGENT_MODEL = process.env.GEMINI_AGENT_MODEL || "gemini-flash-lite-latest";
