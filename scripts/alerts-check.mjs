#!/usr/bin/env node
/**
 * The alert checker. Run every five minutes by .github/workflows/alerts.yml.
 *
 * Reads every active alert (service-role key, server only), decides which
 * are due, records each one sent in `alert_events` and pushes it to every
 * device the owner turned notifications on for. Four kinds:
 *
 *   release   lib/calendar.js: N minutes before a release
 *   price     lib/prices.mjs: a level crossed, on free delayed prices
 *   headline  lib/news.mjs feeds: a headline containing a chosen phrase
 *             (checked every 15 minutes, since the feeds update about that often)
 *   doom      the hourly Doomsday read: a tab's verdict changed
 *
 * Headline and Doomsday alerts learn what is already there on their first
 * run and say nothing, so setting one up does not bring a flood of old news.
 *
 *   node scripts/alerts-check.mjs           normal run
 *   node scripts/alerts-check.mjs --probe   no database: print a price for every
 *                                           supported symbol and a headline count,
 *                                           to check the free sources answer
 */
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { fetchPrices, PRICE_MAP } from "../lib/prices.mjs";
import { fetchNews } from "../lib/news.mjs";
import { DOOM_TABS } from "../lib/doomsday.js";
import { decideRelease, decidePrice, decideHeadline, decideDoom } from "../lib/alert-decide.mjs";

const PROBE = process.argv.includes("--probe");
const NOW = Date.now();
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://ledgedesk.com").replace(/\/+$/, "");
const NEWS_ZONES = ["ams", "eur", "eas", "ind", "anz", "ag", "doom"];
// Headlines every 15 minutes: on runs whose minute falls in the first five of a quarter hour.
const HEADLINE_RUN = process.argv.includes("--all") || new Date(NOW).getUTCMinutes() % 15 < 5;

const fmt = (n) => Number(n).toLocaleString("en-GB", { maximumFractionDigits: n >= 100 ? 2 : 5 });

async function headlines() {
  const all = [];
  const seen = new Set();
  const results = await Promise.allSettled(NEWS_ZONES.map((z) => fetchNews(z, { hours: 6 })));
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const a of r.value.items || []) {
      const fp = a.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);
      if (!fp || seen.has(fp)) continue;
      seen.add(fp);
      all.push({ ...a, fp });
    }
  }
  return all;
}

/* ---------------------------------------------------------------- probe -- */

if (PROBE) {
  const symbols = [...Object.keys(PRICE_MAP), "NASDAQ:NVDA", "NYSE:ORCL"];
  const prices = await fetchPrices(symbols);
  let ok = 0;
  for (const s of symbols) {
    const p = prices[s];
    if (p?.price) ok++;
    console.log(`${s.padEnd(22)} ${p?.price ? `${fmt(p.price).padStart(12)}  ${p.source}  ${p.at || ""}` : `FAILED ${p?.error}`}`);
  }
  const news = await headlines();
  console.log(`\nprices: ${ok}/${symbols.length} answered; headlines gathered: ${news.length}`);
  process.exit(ok ? 0 : 1);
}

/* ------------------------------------------------------------------ run -- */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const PUSH_READY = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (PUSH_READY) {
  webpush.setVapidDetails(SITE, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
} else {
  console.warn("VAPID keys not set: alerts are recorded on the Alerts screen but not pushed to devices.");
}

const { data: alerts, error } = await db.from("alerts").select("*").eq("active", true);
if (error) {
  if (/does not exist|schema cache/i.test(error.message)) {
    console.log("The alerts tables are not set up yet (run supabase/migrations/20261112_alerts.sql). Nothing to do.");
    process.exit(0);
  }
  console.error("Could not read alerts:", error.message);
  process.exit(1);
}
console.log(`${alerts.length} active alerts`);
if (!alerts.length) process.exit(0);

const subsCache = new Map();
async function devices(userId) {
  if (!subsCache.has(userId)) {
    const { data } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
    subsCache.set(userId, data || []);
  }
  return subsCache.get(userId);
}

let sent = 0;
/** Record the alert and push it to each of the owner's devices; drop devices that have gone. */
async function send(alert, msg) {
  let delivered = 0;
  if (PUSH_READY) {
    const payload = JSON.stringify({ title: msg.title, body: msg.body, url: msg.url, tag: msg.tag });
    for (const d of await devices(alert.user_id)) {
      try {
        await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, payload, {
          TTL: msg.ttl ?? 3600,
          urgency: "high"
        });
        delivered++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await db.from("push_subscriptions").delete().eq("id", d.id);
          subsCache.set(alert.user_id, (subsCache.get(alert.user_id) || []).filter((x) => x.id !== d.id));
        } else {
          console.warn(`  push failed (${err.statusCode || err.message})`);
        }
      }
    }
  }
  await db.from("alert_events").insert({
    user_id: alert.user_id, alert_id: alert.id, title: msg.title, body: msg.body, url: msg.url, delivered
  });
  sent++;
  console.log(`  sent #${alert.id}: ${msg.title} (${delivered} device${delivered === 1 ? "" : "s"})`);
}

async function save(alert, patch) {
  const { error: e } = await db.from("alerts").update(patch).eq("id", alert.id);
  if (e) console.warn(`  could not update alert ${alert.id}: ${e.message}`);
}

const byKind = (k) => alerts.filter((a) => a.kind === k);

/** Send what a decision asks for and store the alert's new memory. */
async function apply(a, d) {
  for (const m of d.messages) await send(a, m);
  if (d.state || d.fired || d.off) {
    await save(a, {
      ...(d.state ? { state: d.state } : {}),
      ...(d.fired ? { last_fired_at: new Date().toISOString() } : {}),
      ...(d.off ? { active: false } : {})
    });
  }
}

for (const a of byKind("release")) await apply(a, decideRelease(a, NOW));

const priceAlerts = byKind("price");
if (priceAlerts.length) {
  const prices = await fetchPrices(priceAlerts.map((a) => a.params.symbol));
  for (const a of priceAlerts) {
    const q = prices[a.params.symbol];
    if (!q?.price) console.warn(`  no price for ${a.params.symbol}: ${q?.error || "unknown"}`);
    else await apply(a, decidePrice(a, q));
  }
}

const headlineAlerts = byKind("headline");
if (headlineAlerts.length && HEADLINE_RUN) {
  const news = await headlines();
  console.log(`  ${news.length} headlines gathered`);
  // An empty gather means the feeds failed, not that nothing happened; learning from it would forget what was seen.
  if (news.length) for (const a of headlineAlerts) await apply(a, decideHeadline(a, news));
}

const doomAlerts = byKind("doom");
if (doomAlerts.length) {
  const { data: row } = await db.from("market_reads").select("payload").eq("zone", "doom").maybeSingle();
  const names = Object.fromEntries((DOOM_TABS || []).map((t) => [t.k, t.t]));
  for (const a of doomAlerts) await apply(a, decideDoom(a, row?.payload?.tabs || [], names));
}

console.log(`done: ${sent} sent${HEADLINE_RUN ? "" : " (headlines next on the quarter hour)"}`);
