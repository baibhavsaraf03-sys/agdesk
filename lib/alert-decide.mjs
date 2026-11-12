/**
 * The decisions behind each kind of alert, kept free of the database and the
 * network so they can be tested on their own. scripts/alerts-check.mjs
 * fetches the inputs, calls these, and sends whatever they return.
 *
 * Each returns `{ messages: [{ title, body, url, tag, ttl? }], state, fired, off }`:
 * the notifications to send, the alert's new memory (`state`, null for
 * unchanged), whether it counts as fired, and whether to switch it off.
 */
import { EVENTS } from "./calendar.js";
import { headlineMatches, RELEASE_GRACE_MIN } from "./alert-rules.js";
import { chartName } from "./charts.js";

const fmt = (n) => Number(n).toLocaleString("en-GB", { maximumFractionDigits: n >= 100 ? 2 : 5 });
const none = { messages: [], state: null, fired: false, off: false };

export function decideRelease(alert, now, events = EVENTS) {
  const p = alert.params || {};
  const lead = Number(p.lead) || 15;
  const sent = Array.isArray(alert.state?.sent) ? alert.state.sent : [];
  const due = events.filter((e) => {
    const at = Date.parse(e.at);
    if (now < at - lead * 60000 || now > at + RELEASE_GRACE_MIN * 60000) return false;
    if (sent.includes(e.id)) return false;
    if (p.scope === "major" && e.tier !== 1) return false;
    if (p.scope === "series" && !(p.series || []).includes(e.key)) return false;
    if (p.currencies?.length && !e.currencies.some((c) => p.currencies.includes(c))) return false;
    return true;
  });
  if (!due.length) return none;
  const messages = due.map((e) => {
    const mins = Math.round((Date.parse(e.at) - now) / 60000);
    const when = mins > 90 ? `in about ${Math.round(mins / 60)} hours` : mins > 0 ? `in ${mins} minute${mins === 1 ? "" : "s"}` : "now";
    const london = new Date(e.at).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
    return {
      title: `${e.name} ${when}`,
      body: `${e.currencies.join(", ")} · ${london} UK time. ${e.about || ""}`.slice(0, 240),
      url: "/#CAL",
      tag: `rel-${e.id}`,
      ttl: Math.max(60, Math.round((Date.parse(e.at) - now) / 1000) + RELEASE_GRACE_MIN * 60)
    };
  });
  return { messages, state: { sent: [...sent, ...due.map((e) => e.id)].slice(-60) }, fired: true, off: false };
}

/** `quote` is `{ price, source, note }` from lib/prices.mjs. Fires on crossing into the condition, not while it holds. */
export function decidePrice(alert, quote) {
  if (!quote?.price) return none;
  const { symbol, op, level, repeat } = alert.params;
  const cond = op === "below" ? quote.price <= level : quote.price >= level;
  const was = Boolean(alert.state?.was);
  if (cond && !was) {
    return {
      messages: [{
        title: `${chartName(symbol) || symbol} ${op} ${fmt(level)}`,
        body: `Now ${fmt(quote.price)} (${quote.source}, delayed${quote.note ? `; ${quote.note}` : ""}). ${repeat ? "This alert stays on." : "This alert is now off; switch it back on to use it again."}`,
        url: "/#WL",
        tag: `price-${alert.id}`
      }],
      state: { was: true, last: quote.price },
      fired: true,
      off: !repeat
    };
  }
  return cond !== was ? { ...none, state: { was: cond, last: quote.price } } : none;
}

/** `news` items carry `title`, `url` and a fingerprint `fp`. The first run only learns. */
export function decideHeadline(alert, news) {
  const words = alert.params.words || [];
  const seen = new Set(Array.isArray(alert.state?.seen) ? alert.state.seen : []);
  const fresh = news.filter((n) => headlineMatches(n.title, words) && !seen.has(n.fp));
  const state = { init: true, seen: [...seen, ...fresh.map((n) => n.fp)].slice(-150) };
  if (!alert.state?.init) return { ...none, state };
  if (!fresh.length) return none;
  const word = headlineMatches(fresh[0].title, words);
  return {
    messages: [{
      title: fresh.length === 1 ? `Headline: "${word}"` : `${fresh.length} headlines: "${word}"`,
      body: fresh.slice(0, 3).map((n) => n.title).join(" · ").slice(0, 240),
      url: fresh.length === 1 && /^https?:\/\//.test(fresh[0].url) ? fresh[0].url : "/#NEWS",
      tag: `head-${alert.id}`
    }],
    state,
    fired: true,
    off: false
  };
}

/** `tabs` is the doom read's `[{ k, verdict }]`; `names` maps tab keys to titles. The first run only learns. */
export function decideDoom(alert, tabs, names = {}) {
  if (!tabs?.length) return none;
  const now = Object.fromEntries(tabs.map((t) => [t.k, t.verdict]));
  const before = alert.state?.verdicts;
  if (!before) return { ...none, state: { verdicts: now } };
  const want = alert.params.tabs === "all" ? Object.keys(now) : alert.params.tabs || [];
  const changes = want.filter((k) => now[k] && before[k] && now[k] !== before[k]);
  const merged = { ...before, ...now };
  if (!changes.length) return JSON.stringify(before) === JSON.stringify(merged) ? none : { ...none, state: { verdicts: merged } };
  const n = (k) => names[k] || k;
  return {
    messages: [{
      title: changes.length === 1 ? `Doomsday: ${n(changes[0])} now ${now[changes[0]]}` : `Doomsday: ${changes.length} tabs changed verdict`,
      body: changes.map((k) => `${n(k)}: ${before[k]} to ${now[k]}`).join(" · "),
      url: "/#DOOM",
      tag: `doom-${alert.id}`
    }],
    state: { verdicts: merged },
    fired: true,
    off: false
  };
}
