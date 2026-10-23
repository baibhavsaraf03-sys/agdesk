import Anthropic from "@anthropic-ai/sdk";
import { geminiText, AGENT_PROVIDER, GEMINI_AGENT_MODEL } from "@/lib/providers.mjs";
import { serverClient, adminClient } from "@/lib/supabase-server";
import { METHOD_SUMMARY, AGENT_RULES, EXCHANGES, ZONES } from "@/lib/content";

export const runtime = "nodejs";
export const maxDuration = 60;

const FREE_DAILY = Number(process.env.FREE_DAILY_MESSAGES || 20);
const MODEL = process.env.AGENT_MODEL || "claude-haiku-5-5";

// Anthropic by default, deliberately. Visitors paste their own written
// analysis into this screen for marking, and free tiers generally reserve the
// right to train on what they are sent. Set AGENT_PROVIDER=gemini to run it
// free instead - and say so on the TERMS screen if you do.

// Site-wide ceiling on shared-key messages per UTC day. This is the number
// that decides the worst possible bill, so set it from what you are willing
// to lose rather than from what you expect to use.
const GLOBAL_DAILY = Number(process.env.GLOBAL_DAILY_MESSAGE_CAP || 2000);

// Accounts exempt from both the per-account cap and the global breaker.
const ADMINS = (process.env.ADMIN_USER_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

/** Which exchanges are trading at this moment, computed server-side. */
function openNow() {
  const out = [];
  for (const [code, name, city, tz, index, open, close] of EXCHANGES) {
    try {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz, hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false
      }).formatToParts(new Date());
      const get = (t) => parts.find((p) => p.type === t)?.value;
      if (get("weekday") === "Sat" || get("weekday") === "Sun") continue;
      const mins = Number(get("hour")) * 60 + Number(get("minute"));
      if (mins >= open && mins < close) out.push(`${code} (${city}, ${index})`);
    } catch {
      // An unknown time zone should not take the whole request down.
    }
  }
  return out;
}

/** Flatten the stored reads into the briefing the model sees. */
function buildContext(reads) {
  const lines = [
    `You are the resident analyst on an open-access markets terminal called Ag Desk. It covers ${EXCHANGES.length} world equity exchanges by trading session and agricultural commodities in depth. The user may ask about anything — an exchange, an index, a market, a term, a scenario, or their own written analysis.`,
    "",
    `Exchanges trading right now: ${openNow().join("; ") || "none — all closed or weekend"}.`,
    ""
  ];

  for (const row of reads || []) {
    const d = row.payload || {};
    const label = ZONES[row.zone]?.label || (row.zone === "ag" ? "Agricultural commodities" : row.zone);
    lines.push(`ZONE ${row.zone.toUpperCase()} — ${label} (${d.stamp || "undated"}${d.phase ? ", " + d.phase : ""}): ${d.headline || ""}`);
    (d.rows || []).forEach((r) => lines.push(`  - ${r.nm} ${r.px || ""} ${r.ch || ""}`));
    (d.boards || []).forEach((b) =>
      lines.push(`  - ${b.title}: ${(b.rows || []).map((r) => `${r.nm} ${r.px || ""} ${r.ch || ""}`).join("; ")}`)
    );
    (d.sections || []).forEach((s) => lines.push(`  - ${s.h}: ${s.body}`));
    (d.trades || []).forEach((t) => lines.push(`  - Underrated, ${t.name}: ${t.body} CONTRADICTION: ${t.contra}`));
    (d.watch || []).forEach((w) => lines.push(`  - watch: ${w.nm} (${w.note})`));
    lines.push("");
  }

  if (!reads || reads.length === 0) {
    lines.push("No market reads have been published yet. Say so plainly if asked about current prices.");
    lines.push("");
  }

  lines.push(METHOD_SUMMARY, "");
  lines.push(
    "The terminal also teaches complete beginners: sixteen tutorials in four tracks (the basics, futures, options, and doing it safely), a RISK screen on the six mechanisms by which beginners lose money, and a glossary.",
    ""
  );
  lines.push(AGENT_RULES);
  return lines.join("\n");
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Malformed request." }, 400);
  }

  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    return json({ error: "No messages supplied." }, 400);
  }
  // Keep the thread bounded so a long conversation cannot inflate cost.
  const trimmed = messages.slice(-16).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || "").slice(0, 8000)
  }));
  if (trimmed[trimmed.length - 1].role !== "user") {
    return json({ error: "The last message must be from the user." }, 400);
  }

  const userKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const ownAnthropic = userKey.startsWith("sk-ant-");
  const ownGemini = /^AIza[\w-]{10,}$/.test(userKey);
  const usingOwnKey = ownAnthropic || ownGemini;

  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ---- Gate ---------------------------------------------------------------
  // Own key: unlimited, no account needed, we never store it.
  // Shared key: sign-in required, capped per account per UTC day.
  let remaining = null;
  if (!usingOwnKey) {
    if (!user) {
      return json(
        {
          error: "sign_in_required",
          message: "Sign in to use the shared analyst, or add your own Anthropic key in Settings for unlimited use."
        },
        401
      );
    }
    const admin = adminClient();
    const isAdmin = ADMINS.includes(user.id);

    // Circuit breaker first: if the site as a whole is over budget today,
    // nobody except an admin gets through, however much personal quota they
    // have left. Checked before the per-account cap because it is the one
    // that protects you rather than them.
    if (!isAdmin) {
      const { data: globalUsed } = await admin.rpc("bump_global_usage");
      if (typeof globalUsed === "number" && globalUsed > GLOBAL_DAILY) {
        return json(
          {
            error: "site_limit_reached",
            message:
              "The analyst has reached its daily limit across the whole site. It resets at midnight UTC. Everything else on the terminal still works, and adding your own API key in Settings bypasses this entirely."
          },
          503
        );
      }
    }

    // Plan-aware cap. Free accounts get FREE_DAILY; a payment webhook writing
    // profiles.plan is all that is needed to introduce paid tiers later.
    const { data: cap } = await admin.rpc("daily_cap", {
      p_user: user.id,
      p_free_default: FREE_DAILY
    });
    const limit = isAdmin ? Number.MAX_SAFE_INTEGER : (typeof cap === "number" ? cap : FREE_DAILY);

    const { data: used, error: bumpError } = await admin.rpc("bump_agent_usage", { p_user: user.id });
    if (bumpError) {
      return json({ error: "Could not check your usage. Try again shortly." }, 500);
    }
    if (used > limit) {
      return json(
        {
          error: "limit_reached",
          message: `You have used today's ${limit} messages. The limit resets at midnight UTC. Add your own Anthropic key in Settings for unlimited use.`
        },
        429
      );
    }
    remaining = Math.max(0, limit - used);
  }

  // ---- Context ------------------------------------------------------------
  const { data: reads } = await supabase
    .from("market_reads")
    .select("zone, phase, stamp, payload")
    .order("zone");

  // A visitor's own key decides the provider; otherwise the site's setting does.
  const provider = ownGemini ? "gemini" : ownAnthropic ? "anthropic" : AGENT_PROVIDER;
  const system = buildContext(reads);

  try {
    let text;

    if (provider === "gemini") {
      text = await geminiText({
        model: GEMINI_AGENT_MODEL,
        system,
        messages: trimmed,
        maxTokens: 1400,
        key: ownGemini ? userKey : process.env.GEMINI_API_KEY
      });
    } else {
      const client = new Anthropic({ apiKey: ownAnthropic ? userKey : process.env.ANTHROPIC_API_KEY });
      const result = await client.messages.create({
        model: ownAnthropic ? (body.model || MODEL) : MODEL,
        max_tokens: 1400,
        system,
        messages: trimmed
      });
      text = result.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
    }

    if (!text) return json({ error: "upstream", message: "The analyst returned nothing. Try again." }, 502);
    return json({ text, remaining, usingOwnKey, provider });
  } catch (err) {
    const status = err?.status;
    if (status === 401) {
      return json(
        { error: "bad_key", message: usingOwnKey ? "That API key was rejected." : "The shared key is misconfigured." },
        400
      );
    }
    if (status === 429) {
      return json({ error: "rate_limited", message: "The model is rate limited. Wait a moment and try again." }, 429);
    }
    return json({ error: "upstream", message: "The analyst could not answer that." }, 502);
  }
}
