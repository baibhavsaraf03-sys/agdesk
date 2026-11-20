/**
 * Posts one video a day to Instagram, as a Reel and then as a Story (17 Nov).
 *
 * The rotation repeats every six posts: three of the site (mood, tour,
 * themes), then three on markets and money (market, word, habit). The next
 * slot is the number of posts made so far, modulo six, so a failed day is
 * simply retried the next day with the same video.
 *
 * Steps: film the site first (scripts/reels/capture.mjs, done by the
 * workflow), then this script picks the slot, writes the item and caption,
 * renders the video (compose.mjs), uploads it to the public `social` bucket
 * in Supabase Storage (Instagram fetches videos from a public address),
 * publishes the Reel, then the Story, and records the result in
 * `social_posts`. On any failure it pushes a notification to the owner's
 * devices (the `article_editors` accounts) and exits 1, so GitHub also emails.
 *
 * The Instagram token comes from the INSTAGRAM_TOKEN secret the first time;
 * after that the refreshed token lives in `social_tokens` (service role only)
 * and is renewed every week, so it never reaches its 60-day expiry. Putting a
 * new token in the secret replaces the stored one.
 *
 *   node scripts/reels/post.mjs <footagedir> <workdir> [--dry] [--force] [--kind=word]
 *   --dry    render and upload, but do not post or record anything
 *   --force  post even if today's post is already done
 *   --redo   (Fix Theo) write and draw the latest episode again, same choice and
 *            votes, from the state before it (rebuilt from the history), and
 *            replace today's page; the story does not move on twice
 *   --kind   post this kind instead of the next in the rotation
 *   --check  only check the Instagram connection and print the account
 *
 * Free writers only (Gemini, then Groq) for the captions; if both are busy a
 * plain caption built from the item is used, so posting never waits on them.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { WORDS, HABITS } from "../../lib/social-topics.js";
import { geminiJson, groqJson, GEMINI_FEED_MODEL, GROQ_FEED_MODELS } from "../../lib/providers.mjs";

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => (args.find((a) => a.startsWith(`--${n}=`)) || "").split("=")[1];
const [FOOT, WORK] = args.filter((a) => !a.startsWith("--")).map((p) => path.resolve(p));
const DRY = flag("dry"), REDO = flag("redo"), FORCE = flag("force") || REDO, CHECK = flag("check"), RESEND = flag("resend");
// --series=theo posts the daily "Fix Theo" cartoon instead of the rotation (scripts/cartoon/).
// --series=updown posts the daily "Up or Down" price game (scripts/updown/).
const SERIES = opt("series") || "";
const THEO = SERIES === "theo", UPDOWN = SERIES === "updown";
const mine = (q) => (SERIES ? q.eq("kind", SERIES) : q.not("kind", "in", "(theo,updown)"));
const SITE = (process.env.SITE || "https://ledgedesk.com").replace(/\/+$/, "");
const GRAPH = "https://graph.instagram.com/" + (process.env.IG_API_VERSION || "v24.0");
const ROTATION = ["mood", "tour", "themes", "market", "word", "habit"];
const BUCKET = "social";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

class Stop extends Error {}

/* ---------- notifications to the owner ---------- */
// ntfy first (the owner's phone already uses it for Tap Hub; secret NTFY_TOPIC,
// optional NTFY_SERVER and NTFY_TOKEN), then web push to the site's own
// devices as a second channel. Returns how many channels got through.
async function ntfy(title, body, url, attach) {
  const topic = (process.env.NTFY_TOPIC || "").trim();
  if (!topic) return 0;
  const server = (process.env.NTFY_SERVER || "https://ntfy.sh").replace(/\/+$/, "");
  const headers = { Title: title, Tags: "clapper", Click: url, Actions: `view, Open, ${url}` };
  if (attach) { headers.Attach = attach; headers.Filename = attach.split("/").pop(); }
  if (process.env.NTFY_TOKEN) headers.Authorization = `Bearer ${process.env.NTFY_TOKEN}`;
  try {
    const r = await fetch(`${server}/${encodeURIComponent(topic)}`, { method: "POST", headers, body });
    if (r.ok) return 1;
    console.warn(`  ntfy refused: ${r.status} ${(await r.text()).slice(0, 160)}`);
  } catch (e) { console.warn("  ntfy failed:", e.message); }
  return 0;
}

async function tellOwner(title, body, url = "https://github.com/baibhavsaraf03-sys/agdesk/actions/workflows/instagram.yml", attach = null) {
  let n = await ntfy(title, body, url, attach);
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return n;
  try {
    webpush.setVapidDetails(SITE, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const { data: eds } = await db.from("article_editors").select("user_id");
    const ids = (eds || []).map((e) => e.user_id);
    if (!ids.length) return n;
    const { data: devs } = await db.from("push_subscriptions").select("endpoint, p256dh, auth").in("user_id", ids);
    let pushed = 0;
    for (const d of devs || []) {
      try {
        await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
          JSON.stringify({ title, body, url, tag: "instagram" }), { TTL: 86400, urgency: "high" });
        pushed++;
      } catch (e) { console.warn(`  web push to one device (${new URL(d.endpoint).host}) failed: ${e.statusCode || ""} ${String(e.body || e.message).slice(0, 120)}`); }
    }
    return n + (pushed ? 1 : 0);
  } catch (e) {
    console.warn("  web push skipped:", e.message);
    return n;
  }
}

/* ---------- the Instagram token ---------- */
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
async function token() {
  const seed = (process.env.INSTAGRAM_TOKEN || "").trim();
  const { data: row, error } = await db.from("social_tokens").select("*").eq("name", "instagram").maybeSingle();
  if (error && !/does not exist|schema cache/i.test(error.message)) throw new Error("could not read social_tokens: " + error.message);
  if (error) throw new Stop("The Instagram tables are not set up yet: run ledge-desk-instagram.sql in Supabase.");
  // A new secret replaces whatever was stored.
  if (seed && (!row || row.seed_hash !== hash(seed))) {
    await db.from("social_tokens").upsert({ name: "instagram", token: seed, seed_hash: hash(seed), refreshed_at: new Date().toISOString() });
    return seed;
  }
  if (!row) return null;
  // Refresh once a week (Instagram allows it once the token is a day old).
  const age = Date.now() - Date.parse(row.refreshed_at || 0);
  if (age > 7 * 864e5) {
    try {
      const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(row.token)}`);
      const j = await r.json();
      if (j.access_token) {
        await db.from("social_tokens").update({
          token: j.access_token, refreshed_at: new Date().toISOString(),
          expires_at: j.expires_in ? new Date(Date.now() + j.expires_in * 1000).toISOString() : null
        }).eq("name", "instagram");
        log("  Instagram token refreshed for another 60 days");
        return j.access_token;
      }
      console.warn("  token refresh refused:", j.error?.message || JSON.stringify(j).slice(0, 200));
    } catch (e) { console.warn("  token refresh failed:", e.message); }
  }
  return row.token;
}

async function ig(method, p, params, tok) {
  const u = new URL(GRAPH + p);
  const body = new URLSearchParams({ ...params, access_token: tok });
  const r = method === "GET" ? await fetch(u + "?" + body) : await fetch(u, { method, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const e = j.error || {};
    throw new Error(`Instagram said: ${e.message || r.statusText}${e.error_user_msg ? " — " + e.error_user_msg : ""} (code ${e.code ?? r.status}${e.error_subcode ? "/" + e.error_subcode : ""})`);
  }
  return j;
}

/** Create a container, wait until Instagram has processed the video, publish it. */
async function publish(igId, tok, params, label) {
  const c = await ig("POST", `/${igId}/media`, params, tok);
  log(`  ${label}: container ${c.id}, waiting for Instagram to process the video`);
  for (let i = 0; i < 60; i++) {
    await sleep(i < 6 ? 5000 : 10000);
    const s = await ig("GET", `/${c.id}`, { fields: "status_code,status" }, tok);
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error(`${label} processing failed: ${s.status || s.status_code}`);
    if (i === 59) throw new Error(`${label} still processing after 9 minutes`);
  }
  const p = await ig("POST", `/${igId}/media_publish`, { creation_id: c.id }, tok);
  return p.id;
}

/* ---------- what to post ---------- */
async function postedCount() {
  const { data, error } = await mine(db.from("social_posts").select("id").in("status", ["posted", "partial"]));
  if (error) throw new Error("could not read social_posts: " + error.message);
  return data.length;
}

function readJson(f) { try { return JSON.parse(fs.readFileSync(path.join(FOOT, f), "utf8")); } catch { return null; } }

const CAPTION_SCHEMA = {
  type: "object",
  properties: {
    hook: { type: "string", description: "Market video only: a five-to-eight word headline for the day, no figures. Otherwise an empty string." },
    caption: { type: "string", description: "The Instagram caption: three to five short sentences that teach something useful, then a line inviting people to save or follow, then 'More at ledgedesk.com'. No hashtags here. No emoji." },
    hashtags: { type: "array", items: { type: "string" }, description: "Six to nine relevant hashtags without the # sign." }
  },
  required: ["hook", "caption", "hashtags"]
};

async function writeCaption(kind, item, facts) {
  const system = "You write Instagram captions for Ledge Desk, a free markets terminal (ledgedesk.com) for beginners and traders. " +
    "Plain, confident, a little elegant; no hype, no slang, no emoji, no recommendations to buy or sell anything. " +
    "Use only the facts and figures given: never add numbers, dates, names or claims of your own.";
  const prompt = `Video type: ${kind}.\nWhat the video shows:\n${facts}\n\nWrite the caption.`;
  for (const model of GEMINI_FEED_MODEL.split(",").map((m) => m.trim()).filter(Boolean)) {
    try { const o = await geminiJson({ model, system, prompt, schema: CAPTION_SCHEMA, maxTokens: 1200 }); if (o?.caption) return { ...o, writer: "gemini" }; }
    catch (e) { console.warn(`  ${model}: ${String(e.message).slice(0, 90)}`); }
  }
  if (process.env.GROQ_API_KEY) {
    for (const { model, tpm } of GROQ_FEED_MODELS) {
      try { const o = await groqJson({ model, tpm, system, prompt, schema: CAPTION_SCHEMA, maxTokens: 1000 }); if (o?.caption) return { ...o, writer: "groq" }; }
      catch (e) { console.warn(`  ${model}: ${String(e.message).slice(0, 90)}`); }
    }
  }
  return null;
}

const BASE_TAGS = ["investing", "stockmarket", "personalfinance", "markets", "finance", "trading", "moneytips", "financialliteracy"];
function finishCaption(text, tags) {
  const t = [...new Set([...(tags || []), ...BASE_TAGS].map((x) => String(x).replace(/[^A-Za-z0-9_]/g, "").toLowerCase()).filter(Boolean))].slice(0, 12);
  return `${text.trim()}\n\nEducational, not investment advice.\n\n${t.map((x) => "#" + x).join(" ")}`.slice(0, 2150);
}

async function prepare(kind, n) {
  const pulse = readJson("pulse.json") || {};
  const mood = pulse.mood;
  const cycle = Math.floor(n / ROTATION.length);
  let item = null, facts = "", fallback = "";
  if (kind === "word" || kind === "habit") {
    const list = kind === "word" ? WORDS : HABITS;
    item = list[cycle % list.length];
    facts = `${item.kicker}: ${item.hook}\n${item.beats.map((b) => `- ${b.big} ${b.small}`).join("\n")}\nClosing line: ${item.close}`;
    fallback = `${item.hook}. ${item.beats.map((b) => `${b.big} ${b.small}`).join(" ")}\n\n${item.close} Save this for later, and follow for one a day.\n\nMore at ledgedesk.com`;
  } else if (kind === "market") {
    const ins = (pulse.instruments || []).filter((i) => i.change != null);
    const pct = (c) => (c > 0 ? "+" : "") + c.toFixed(2) + "%";
    facts = `Delayed figures today: ${ins.map((i) => `${i.name} ${pct(i.change)}`).join(", ")}. ` +
      (mood ? `The mood dial (read off the VIX at ${mood.level.toFixed(1)}) says ${mood.word}. ` : "") +
      `Latest brief: ${(() => { const r = readJson("feed.json"); const rd = r?.reads || r || {}; const z = ["ams", "eur", "eas"].map((k) => rd[k]).find((x) => x?.short?.length); return z ? z.short.slice(0, 2).join(" ") : "none"; })()}`;
    const ups = ins.filter((i) => i.change > 0).length;
    fallback = `${ups} of ${ins.length} markets on the board are up so far today. ${mood ? `The mood dial reads ${mood.word.toLowerCase()} (VIX ${mood.level.toFixed(1)}). ` : ""}The full board, rewritten every hour, is free on the desk. Follow for the day's markets in twenty seconds.\n\nMore at ledgedesk.com`;
    item = { kicker: "Markets today", hook: "Where the money moved." };
  } else {
    const what = { mood: "The front door clock, then the mood dial finding today's market mood, then the hour's brief and three figures.", tour: "A tour of the desk: instruments, the menu, charts, the economic calendar, meme stocks, the AI-bubble tracker and the analyst.", themes: "The desk switching between its two looks, Noir (black and gold) and Blanc (ivory and gold), asking viewers which they prefer." }[kind];
    facts = `${what} ${mood ? `Today's mood: ${mood.word} (VIX ${mood.level.toFixed(1)}).` : ""} Ledge Desk is free, rewritten every hour, with live instruments, the world's sessions, the calendar, alerts and an analyst.`;
    fallback = kind === "themes"
      ? "Two desks, one market. Noir for the night shift, Blanc for the morning coffee. Which one is yours? Tell us in the comments.\n\nFree at ledgedesk.com"
      : `${mood ? `The market is ${mood.word.toLowerCase()} today (VIX ${mood.level.toFixed(1)}). ` : ""}Ledge Desk is a free markets desk, rewritten every hour: live instruments, the world's sessions, the calendar, alerts and an analyst.\n\nFree at ledgedesk.com`;
  }
  const w = await writeCaption(kind, item, facts);
  if (kind === "market" && w?.hook) item = { ...item, hook: w.hook.replace(/[.!]*$/, ".") };
  const caption = finishCaption(w?.caption ? w.caption : fallback, w?.hashtags);
  log(`  caption ${w ? "written by " + w.writer : "built from the item (free writers busy)"}:\n${caption}`);
  return { item, caption };
}

/* ---------- manual mode: a GitHub release page per day ---------- */
const KIND_NAMES = { mood: "The mood", tour: "The tour", themes: "Noir or Blanc", market: "Markets today", word: "One money word", habit: "Money habit", theo: "Fix Theo", updown: "Up or Down" };
function manualPage(kind, n, file, caption, videoUrl, title = null) {
  const tag = `${SERIES || "post"}-${today}`;
  const repo = process.env.GITHUB_REPOSITORY || "baibhavsaraf03-sys/agdesk";
  const notes = path.join(WORK, "release-notes.md");
  fs.writeFileSync(notes, [
    title ? `**${title}**` : `**${KIND_NAMES[kind]}**, post ${n + 1} (slot ${n % ROTATION.length + 1} of 6).`,
    "",
    "1. Tap **" + path.basename(file) + "** under Assets (or [open the video](" + videoUrl + ")), then Share → **Save Video**.",
    "2. In Instagram: **+** → **Reel** → pick the video → paste the caption below → **Share**.",
    "3. On the new Reel, tap the paper plane → **Add to story** → **Your story**.",
    "",
    "Caption (press and hold inside the box, Select All, Copy):",
    "",
    "```",
    caption,
    "```"
  ].join("\n"));
  try { execFileSync("gh", ["release", "delete", tag, "--yes", "--cleanup-tag", "-R", repo], { stdio: "ignore" }); } catch { /* none yet */ }
  execFileSync("gh", ["release", "create", tag, file, "-R", repo, "--title", `Instagram ${today}: ${title || KIND_NAMES[kind]}`, "--notes-file", notes, "--latest"], { stdio: "inherit" });
  return `https://github.com/${repo}/releases/tag/${tag}`;
}

/* ---------- Fix Theo ---------- */
const CARTOON = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "cartoon");
const DAY1_CAPTION = "Meet Theo. He's 23, has $4.12 in the bank and $1,800 on a credit card at 24.9%. His plan is crypto. " +
  "We have 14 days to fix his money, and you decide every move.\n\nComment A or B for Day 2.";

/** Counts A and B comments on the last Theo Reel (needs the comments permission; null if unavailable). */
async function voteCounts(tok) {
  const { data: last } = await db.from("social_posts").select("reel_id").eq("kind", "theo").not("reel_id", "is", null).order("id", { ascending: false }).limit(1).maybeSingle();
  if (!last?.reel_id || !tok) return null;
  const c = { a: 0, b: 0 };
  try {
    let url = `${GRAPH}/${last.reel_id}/comments?fields=text&limit=100&access_token=${encodeURIComponent(tok)}`;
    for (let page = 0; url && page < 10; page++) {
      const j = await (await fetch(url)).json();
      if (j.error) throw new Error(j.error.message);
      for (const x of j.data || []) {
        const m = String(x.text || "").trim().match(/^\(?\s*(a|b)\s*\)?(?![a-z])/i);
        if (m) c[m[1].toLowerCase()]++;
      }
      url = j.paging?.next || null;
    }
    log(`  votes on the last episode: A ${c.a}, B ${c.b}`);
    return c;
  } catch (e) {
    console.warn("  could not read the comments (is the comments permission on?):", e.message);
    return null;
  }
}

async function theoPrepare(tok) {
  const { START, ACTIONS } = await import("../cartoon/theo.mjs");
  const { data: row } = await db.from("social_tokens").select("token").eq("name", "theo_state").maybeSingle();
  let state = row ? JSON.parse(row.token) : null;
  let ep, next, caption, tags = [];
  if (REDO && state?.history?.length) {
    // advance() is deterministic, so replaying the history from START gives the
    // state the latest episode was written from. Season 1 day 1 is hand-written.
    const { advance, startSeason2 } = await import("../cartoon/theo.mjs");
    const hist = state.history, last = hist[hist.length - 1];
    let s = JSON.parse(JSON.stringify(START)); s.history = s.history || [];
    for (const h of hist.slice(0, -1)) {
      if ((h.season || 1) === 2 && (s.season || 1) === 1) s = startSeason2(s);
      if (h.day <= s.day && (h.season || 1) === (s.season || 1)) continue;
      const w = s.vote?.[1] === h.choice ? "b" : "a";
      s = advance(s, w, h.counts || null).state;
    }
    if ((last.season || 1) === 2 && (s.season || 1) === 1) s = startSeason2(s);
    s.deskUsed = (state.deskUsed || []).slice(0, -1);
    const winner = s.vote?.[1] === last.choice ? "b" : "a";
    log(`  Redo: Day ${last.day} again (${last.choice}, ${winner.toUpperCase()}), from the rebuilt Day ${s.day} state`);
    const { writeEpisode } = await import("../cartoon/write.mjs");
    const r = await writeEpisode(s, winner, last.counts || null);
    ep = r.episode; next = r.state; caption = r.caption; tags = r.hashtags || [];
    log(`  Day ${ep.day}: ${ep.beats.length} beats, middle written by ${ep.writer}`);
    ep.beats.forEach((b) => log(`    [${b.scene}] ${b.say}  |  ${b.cap}${b.stamp ? "  |  stamp " + b.stamp : ""}`));
    state = null;
  }
  if (ep) { /* redone above */ } else
  if (!state) {
    ep = JSON.parse(fs.readFileSync(path.join(CARTOON, "episodes", "theo-001.json"), "utf8"));
    next = START; caption = DAY1_CAPTION;
  } else {
    if (state.season === 2 && state.day >= state.of) throw new Stop("Fix Theo season 2 is finished. Nothing to post.");
    let counts = await voteCounts(tok), winner;
    if (!counts) {
      // Votes entered by hand (Actions -> Fix Theo -> what: votes) while comments can't be read.
      const { data: v } = await db.from("social_tokens").select("token").eq("name", "theo_votes").maybeSingle();
      const hand = v ? JSON.parse(v.token) : null;
      if (hand && hand.day === state.day) { counts = { a: hand.a, b: hand.b }; log(`  votes entered by hand for Day ${hand.day}: A ${hand.a}, B ${hand.b}`); }
    }
    if (counts && counts.a + counts.b > 0) winner = counts.b > counts.a ? "b" : "a";
    else {
      counts = null;
      const [ka, kb] = state.vote || [];
      const A = state.season === 2 ? (await import("../cartoon/theo.mjs")).ACTIONS2 : ACTIONS;
      winner = (A[kb]?.points || 0) > (A[ka]?.points || 0) ? "b" : "a";
    }
    const { writeEpisode } = await import("../cartoon/write.mjs");
    const r = await writeEpisode(state, winner, counts);
    ep = r.episode; next = r.state; caption = r.caption; tags = r.hashtags || [];
    log(`  Day ${ep.day}: ${ep.beats.length} beats, middle written by ${ep.writer}`);
    ep.beats.forEach((b) => log(`    [${b.scene}] ${b.say}  |  ${b.cap}${b.stamp ? "  |  stamp " + b.stamp : ""}`));
  }
  fs.mkdirSync(WORK, { recursive: true });
  const epFile = path.join(WORK, `theo-${String(ep.day).padStart(3, "0")}.json`);
  fs.writeFileSync(epFile, JSON.stringify(ep, null, 2));
  execFileSync("node", [path.join(CARTOON, "render.mjs"), epFile, WORK], { stdio: "inherit" });
  const file = path.join(WORK, `fix-theo-day-${String(ep.day).padStart(2, "0")}.mp4`);
  const full = finishCaption(caption, ["fixtheo", "budgeting", "debtfree", "creditcard", "brokeLife", "moneytips", ...tags]);
  fs.writeFileSync(path.join(WORK, "caption.txt"), full);
  return { ep, next, caption: full, file };
}
async function theoSave(next) {
  const { error } = await db.from("social_tokens").upsert({ name: "theo_state", token: JSON.stringify(next), refreshed_at: new Date().toISOString() });
  if (error) console.warn("  could not save Theo's state:", error.message);
}

/* ---------- Up or Down ---------- */
async function updownPrepare() {
  const { today: pick, fmt, nyTime, nyDate } = await import("../updown/data.mjs");
  const w = await pick();
  fs.mkdirSync(WORK, { recursive: true });
  const wf = path.join(WORK, "window.json");
  fs.writeFileSync(wf, JSON.stringify(w));
  log(`  ${w.market.name}: ${nyTime(w.start)} New York, ${fmt(w.market, w.target)} to ${fmt(w.market, w.final)} (${w.dir}, ${w.crossings} crossings)`);
  execFileSync("node", [path.join(path.dirname(new URL(import.meta.url).pathname), "..", "updown", "render.mjs"), wf, WORK], { stdio: "inherit" });
  const lead = w.market.name.replace(/^the /, "The ");
  const text = `${lead} at ${nyTime(w.start)} New York time on ${nyDate(w.start)}: did it go up or down over the next 15 minutes?\n\n` +
    `Comment your call before the timer hits 00:00. The answer is at the end, so no skipping.\n\n` +
    `Real prices, replayed (delayed data from Yahoo Finance). A game, not a bet. A new one every day.`;
  const caption = finishCaption(text, ["upordown", "gold", "bitcoin", "sp500", "markets", "chart"]);
  fs.writeFileSync(path.join(WORK, "caption.txt"), caption);
  return { file: path.join(WORK, "updown.mp4"), caption, title: `Up or Down: ${lead}, ${nyDate(w.start)}` };
}

/* ---------- main ---------- */
let kind = null, stage = "starting", record = null;
try {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase secrets missing");
  if (THEO && opt("votes-a") !== "" && args.some((a) => a.startsWith("--votes-a="))) {
    // Record the A/B votes counted by hand for the episode now showing; the next episode uses them.
    const a = Math.max(0, parseInt(opt("votes-a"), 10) || 0), b = Math.max(0, parseInt(opt("votes-b"), 10) || 0);
    const { data: row } = await db.from("social_tokens").select("token").eq("name", "theo_state").maybeSingle();
    const day = row ? JSON.parse(row.token).day : 0;
    if (!day) throw new Stop("No Fix Theo episode has been posted yet, so there is nothing to vote on.");
    const { error } = await db.from("social_tokens").upsert({ name: "theo_votes", token: JSON.stringify({ day, a, b }), refreshed_at: new Date().toISOString() });
    if (error) throw new Error("could not save the votes: " + error.message);
    throw new Stop(`Saved: Day ${day} votes A ${a}, B ${b}. Day ${day + 1} will follow ${b > a ? "B" : "A"}.`);
  }

  if (RESEND) {
    // Send the newest post's notification again (nothing is made or counted).
    const { data: last } = await mine(db.from("social_posts").select("*")).order("id", { ascending: false }).limit(1).maybeSingle();
    if (!last) throw new Stop("No post yet to send again.");
    const manual = /^Manual mode/.test(last.error || "");
    const sent = await tellOwner(manual ? "Today's Instagram video is ready" : `Instagram: ${KIND_NAMES[last.kind] || last.kind}`,
      manual ? `${KIND_NAMES[last.kind] || last.kind}. Tap to open the caption and posting steps; the video is attached.` : (last.error || "Posted."),
      last.permalink || last.video_url, last.video_url);
    if (!sent) throw new Error("the owner could not be notified (check the NTFY_TOPIC secret)");
    throw new Stop(`Sent again through ${sent} channel(s): ${last.kind} of ${last.day}.`);
  }

  // A dry run needs no Instagram connection and no tables: it only makes the video.
  let tok = null, me = null;
  if (!DRY) {
    tok = await token();
    if (!tok && CHECK) throw new Stop("Instagram is not connected yet (no INSTAGRAM_TOKEN secret).");
  }
  const MANUAL = !DRY && !tok;
  if (MANUAL) log("  Manual mode: Instagram isn't connected, so the video goes to the owner's phone to post by hand.");
  if (MANUAL) {
    const { data: done, error: dErr } = await mine(db.from("social_posts").select("id,kind").eq("day", today).in("status", ["posted", "partial"]));
    if (dErr) throw new Error("could not read social_posts: " + dErr.message);
    if (done.length && !FORCE) throw new Stop(`Today's video was already made (${done[0].kind}). Nothing to do.`);
  }
  if (!DRY && tok) {
    stage = "checking the Instagram account";
    me = await ig("GET", "/me", { fields: "user_id,username,account_type" }, tok);
    log(`  Instagram: @${me.username} (${me.account_type || "account type not reported"})`);
    if (me.account_type && me.account_type !== "BUSINESS") console.warn("  Note: Instagram only lets Business accounts post Stories through its API.");
    if (CHECK) throw new Stop("Connection check only: it works.");

    const { data: done, error: dErr } = await mine(db.from("social_posts").select("id,kind").eq("day", today).in("status", ["posted", "partial"]));
    if (dErr) throw new Error("could not read social_posts: " + dErr.message);
    if (done.length && !FORCE) throw new Stop(`Already posted today (${done[0].kind}). Nothing to do.`);
  }

  let n, caption, file, theoRun = null, udRun = null;
  if (UPDOWN) {
    kind = "updown"; n = 0;
    stage = "picking today's window and drawing it";
    udRun = await updownPrepare();
    caption = udRun.caption; file = udRun.file;
  } else if (THEO) {
    kind = "theo";
    stage = "writing and drawing the Fix Theo episode";
    theoRun = await theoPrepare(tok);
    n = theoRun.ep.day - 1; caption = theoRun.caption; file = theoRun.file;
  } else {
    n = DRY ? await postedCount().catch(() => 0) : await postedCount();
    kind = opt("kind") || ROTATION[n % ROTATION.length];
    if (!ROTATION.includes(kind)) throw new Error(`unknown kind ${kind}`);
    log(`  post ${n + 1}, slot ${n % ROTATION.length + 1} of 6: ${kind}`);

    stage = "writing the caption";
    fs.mkdirSync(WORK, { recursive: true });
    const prep = await prepare(kind, n);
    caption = prep.caption;
    const scriptFile = path.join(WORK, "script.json");
    fs.writeFileSync(scriptFile, JSON.stringify(prep.item || {}));
    fs.writeFileSync(path.join(WORK, "caption.txt"), caption);

    stage = "making the video";
    execFileSync("node", [path.join(path.dirname(new URL(import.meta.url).pathname), "compose.mjs"), kind, FOOT, WORK],
      { stdio: "inherit", env: { ...process.env, SCRIPT_FILE: scriptFile } });
    file = path.join(WORK, `${kind}.mp4`);
  }

  stage = "uploading the video";
  const key = THEO ? `reels/${today}-${path.basename(file)}` : `reels/${today}-${kind}.mp4`;   // updown -> reels/<day>-updown.mp4
  const up = await db.storage.from(BUCKET).upload(key, fs.readFileSync(file), { contentType: "video/mp4", upsert: true });
  if (up.error && DRY) throw new Stop(`Dry run: video made (${file}); upload skipped: ${up.error.message}`);
  if (up.error) throw new Error("upload to Supabase Storage failed: " + up.error.message);
  const videoUrl = db.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
  log(`  video: ${videoUrl}`);
  if (DRY) throw new Stop("Dry run: rendered and uploaded, not posted.");

  if (MANUAL) {
    stage = "publishing the video page for posting by hand";
    const title = THEO ? `Fix Theo, Day ${theoRun.ep.day} of ${theoRun.ep.of}` : UPDOWN ? udRun.title : null;
    const page = manualPage(kind, n, file, caption, videoUrl, title);
    await db.from("social_posts").insert({ day: today, slot: THEO ? theoRun.ep.day : SERIES ? 0 : n % ROTATION.length, kind, status: "posted", video_url: videoUrl, caption, permalink: page, error: "Manual mode: sent to the owner's phone to post by hand." });
    if (THEO) await theoSave(theoRun.next);
    const sent = await tellOwner(THEO ? `Fix Theo, Day ${theoRun.ep.day} is ready` : UPDOWN ? "Today's Up or Down is ready" : "Today's Instagram video is ready", `Tap to open the video, then save it. Caption to copy:\n\n${caption}`.slice(0, 3800), videoUrl, videoUrl);
    // 20 Nov: GitHub's download failed on the owner's phone, so the tap opens the
    // video itself (public Supabase Storage) and the caption travels in the message.
    log(`Done (manual): ${page}. Notified through ${sent} channel(s).`);
    if (!sent) throw new Error("the video page is up but the owner could not be notified: " + page);
    process.exit(0);
  }

  record = { day: today, slot: THEO ? theoRun.ep.day : SERIES ? 0 : n % ROTATION.length, kind, status: "failed", video_url: videoUrl, caption };

  stage = "publishing the Reel";
  const reelId = await publish(me.user_id || me.id, tok, { media_type: "REELS", video_url: videoUrl, caption, share_to_feed: "true", thumb_offset: THEO ? "1200" : UPDOWN ? "800" : "4000" }, "Reel");
  record.reel_id = reelId;
  try { record.permalink = (await ig("GET", `/${reelId}`, { fields: "permalink" }, tok)).permalink || null; } catch { /* not essential */ }
  record.status = "partial";
  if (THEO) await theoSave(theoRun.next);   // the story moves on once the Reel is up
  log(`  Reel published: ${record.permalink || reelId}`);

  stage = "publishing the Story";
  record.story_id = await publish(me.user_id || me.id, tok, { media_type: "STORIES", video_url: videoUrl }, "Story");
  record.status = "posted";
  log("  Story published");
  await db.from("social_posts").insert(record);
  log(`Done: ${kind} posted as a Reel and a Story.`);
} catch (e) {
  if (e instanceof Stop) {
    log(e.message);
    process.exit(0);
  }
  const msg = `${kind ? kind + ": " : ""}failed while ${stage}. ${e.message}`;
  console.error("FAILED " + msg);
  if (record) { record.error = msg.slice(0, 1000); await db.from("social_posts").insert(record); }
  const what = record?.status === "partial" ? "The Reel went up but the Story didn't" : "Today's Instagram post didn't go up";
  const n = await tellOwner(`Ledge Desk: ${what}`, msg.slice(0, 180));
  log(n ? `Owner notified through ${n} channel(s).` : "Could not notify the owner; GitHub's failure email is the alert.");
  process.exit(1);
}
