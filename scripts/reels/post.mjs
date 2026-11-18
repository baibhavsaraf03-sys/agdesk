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
const DRY = flag("dry"), FORCE = flag("force"), CHECK = flag("check"), RESEND = flag("resend");
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
  const { data, error } = await db.from("social_posts").select("id").in("status", ["posted", "partial"]);
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
const KIND_NAMES = { mood: "The mood", tour: "The tour", themes: "Noir or Blanc", market: "Markets today", word: "One money word", habit: "Money habit" };
function manualPage(kind, n, file, caption, videoUrl) {
  const tag = `post-${today}`;
  const repo = process.env.GITHUB_REPOSITORY || "baibhavsaraf03-sys/agdesk";
  const notes = path.join(WORK, "release-notes.md");
  fs.writeFileSync(notes, [
    `**${KIND_NAMES[kind]}**, post ${n + 1} (slot ${n % ROTATION.length + 1} of 6).`,
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
  execFileSync("gh", ["release", "create", tag, file, "-R", repo, "--title", `Instagram ${today}: ${KIND_NAMES[kind]}`, "--notes-file", notes, "--latest"], { stdio: "inherit" });
  return `https://github.com/${repo}/releases/tag/${tag}`;
}

/* ---------- main ---------- */
let kind = null, stage = "starting", record = null;
try {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase secrets missing");
  if (RESEND) {
    // Send the newest post's notification again (nothing is made or counted).
    const { data: last } = await db.from("social_posts").select("*").order("id", { ascending: false }).limit(1).maybeSingle();
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
    const { data: done, error: dErr } = await db.from("social_posts").select("id,kind").eq("day", today).in("status", ["posted", "partial"]);
    if (dErr) throw new Error("could not read social_posts: " + dErr.message);
    if (done.length && !FORCE) throw new Stop(`Today's video was already made (${done[0].kind}). Nothing to do.`);
  }
  if (!DRY && tok) {
    stage = "checking the Instagram account";
    me = await ig("GET", "/me", { fields: "user_id,username,account_type" }, tok);
    log(`  Instagram: @${me.username} (${me.account_type || "account type not reported"})`);
    if (me.account_type && me.account_type !== "BUSINESS") console.warn("  Note: Instagram only lets Business accounts post Stories through its API.");
    if (CHECK) throw new Stop("Connection check only: it works.");

    const { data: done, error: dErr } = await db.from("social_posts").select("id,kind").eq("day", today).in("status", ["posted", "partial"]);
    if (dErr) throw new Error("could not read social_posts: " + dErr.message);
    if (done.length && !FORCE) throw new Stop(`Already posted today (${done[0].kind}). Nothing to do.`);
  }

  const n = DRY ? await postedCount().catch(() => 0) : await postedCount();
  kind = opt("kind") || ROTATION[n % ROTATION.length];
  if (!ROTATION.includes(kind)) throw new Error(`unknown kind ${kind}`);
  log(`  post ${n + 1}, slot ${n % ROTATION.length + 1} of 6: ${kind}`);

  stage = "writing the caption";
  fs.mkdirSync(WORK, { recursive: true });
  const { item, caption } = await prepare(kind, n);
  const scriptFile = path.join(WORK, "script.json");
  fs.writeFileSync(scriptFile, JSON.stringify(item || {}));
  fs.writeFileSync(path.join(WORK, "caption.txt"), caption);

  stage = "making the video";
  execFileSync("node", [path.join(path.dirname(new URL(import.meta.url).pathname), "compose.mjs"), kind, FOOT, WORK],
    { stdio: "inherit", env: { ...process.env, SCRIPT_FILE: scriptFile } });
  const file = path.join(WORK, `${kind}.mp4`);

  stage = "uploading the video";
  const key = `reels/${today}-${kind}.mp4`;
  const up = await db.storage.from(BUCKET).upload(key, fs.readFileSync(file), { contentType: "video/mp4", upsert: true });
  if (up.error && DRY) throw new Stop(`Dry run: video made (${file}); upload skipped: ${up.error.message}`);
  if (up.error) throw new Error("upload to Supabase Storage failed: " + up.error.message);
  const videoUrl = db.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
  log(`  video: ${videoUrl}`);
  if (DRY) throw new Stop("Dry run: rendered and uploaded, not posted.");

  if (MANUAL) {
    stage = "publishing the video page for posting by hand";
    const page = manualPage(kind, n, file, caption, videoUrl);
    await db.from("social_posts").insert({ day: today, slot: n % ROTATION.length, kind, status: "posted", video_url: videoUrl, caption, permalink: page, error: "Manual mode: sent to the owner's phone to post by hand." });
    const sent = await tellOwner("Today's Instagram video is ready", `${KIND_NAMES[kind]}. Tap to open the caption and posting steps; the video is attached.`, page, videoUrl);
    log(`Done (manual): ${page}. Notified through ${sent} channel(s).`);
    if (!sent) throw new Error("the video page is up but the owner could not be notified: " + page);
    process.exit(0);
  }

  record = { day: today, slot: n % ROTATION.length, kind, status: "failed", video_url: videoUrl, caption };

  stage = "publishing the Reel";
  const reelId = await publish(me.user_id || me.id, tok, { media_type: "REELS", video_url: videoUrl, caption, share_to_feed: "true", thumb_offset: "4000" }, "Reel");
  record.reel_id = reelId;
  try { record.permalink = (await ig("GET", `/${reelId}`, { fields: "permalink" }, tok)).permalink || null; } catch { /* not essential */ }
  record.status = "partial";
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
