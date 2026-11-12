/**
 * Alerts: the kinds, their settings and how they read, shared by the screen,
 * /api/alerts and the checker (scripts/alerts-check.mjs). Anything that
 * reaches the database goes through `cleanAlert` first.
 */
import { CAL_SERIES } from "./calendar.js";
import { priceSymbol } from "./prices.mjs";
import { chartName } from "./charts.js";

export const ALERT_MAX = 25;
export const KINDS = ["release", "price", "headline", "doom"];
export const LEADS = [5, 15, 60, 1440];

export const KIND_TXT = {
  release: "Release reminder",
  price: "Price level",
  headline: "Headline keywords",
  doom: "Doomsday verdict change"
};

/** How long after the stated time a release reminder still goes out. */
export const RELEASE_GRACE_MIN = 10;

const clip = (s, n) => String(s ?? "").trim().slice(0, n);

/**
 * A valid `{ kind, params }`, or `{ error }` saying what is wrong in plain words.
 *  release:  { scope: "major" | "all" | "series", series: [keys], currencies: [..], lead }
 *  price:    { symbol, op: "above" | "below", level, repeat }
 *  headline: { words: [up to 5 words or phrases] }
 *  doom:     { tabs: "all" | [tab keys] }
 */
export function cleanAlert(input) {
  const kind = String(input?.kind || "");
  const p = input?.params || {};
  if (!KINDS.includes(kind)) return { error: "Unknown kind of alert." };

  if (kind === "release") {
    const scope = ["major", "all", "series"].includes(p.scope) ? p.scope : "major";
    const keys = CAL_SERIES.map((s) => s.key);
    const series = Array.isArray(p.series) ? p.series.filter((k) => keys.includes(k)).slice(0, 20) : [];
    if (scope === "series" && !series.length) return { error: "Choose at least one release." };
    const currencies = Array.isArray(p.currencies) ? p.currencies.filter((c) => /^[A-Z]{3}$/.test(c)).slice(0, 8) : [];
    const lead = LEADS.includes(Number(p.lead)) ? Number(p.lead) : 15;
    return { kind, params: { scope, series: scope === "series" ? series : [], currencies, lead } };
  }

  if (kind === "price") {
    const symbol = clip(p.symbol, 60).toUpperCase();
    if (!priceSymbol(symbol)) return { error: "Price alerts are not available for that symbol yet." };
    const op = p.op === "below" ? "below" : "above";
    const level = Number(String(p.level ?? "").replace(/,/g, ""));
    if (!isFinite(level) || level <= 0) return { error: "Enter a price level above zero." };
    return { kind, params: { symbol, op, level, repeat: Boolean(p.repeat) } };
  }

  if (kind === "headline") {
    const words = (Array.isArray(p.words) ? p.words : String(p.words || "").split(","))
      .map((w) => clip(w, 40).replace(/\s+/g, " "))
      .filter((w) => w.length >= 2)
      .slice(0, 5);
    if (!words.length) return { error: "Enter at least one word or phrase, two letters or more." };
    return { kind, params: { words } };
  }

  // doom
  const tabs = Array.isArray(p.tabs) ? p.tabs.map((t) => clip(t, 20)).filter(Boolean).slice(0, 10) : "all";
  return { kind, params: { tabs: tabs.length ? tabs : "all" } };
}

/** One line describing an alert, for the list and for the notification body. */
export function describeAlert({ kind, params: p = {} }) {
  if (kind === "release") {
    const lead = p.lead >= 1440 ? "a day" : p.lead >= 60 ? `${p.lead / 60} hour${p.lead > 60 ? "s" : ""}` : `${p.lead} minutes`;
    const what =
      p.scope === "series"
        ? p.series.map((k) => CAL_SERIES.find((s) => s.key === k)?.name || k).join(", ")
        : p.scope === "all" ? "every release on the calendar" : "every major release";
    const cur = p.currencies?.length ? ` (${p.currencies.join(", ")} only)` : "";
    return `${lead} before ${what}${cur}`;
  }
  if (kind === "price") {
    return `${chartName(p.symbol) || p.symbol} ${p.op} ${Number(p.level).toLocaleString("en-GB", { maximumFractionDigits: 6 })}${p.repeat ? ", every time" : ", once"}`;
  }
  if (kind === "headline") return `Headlines mentioning ${p.words.map((w) => `"${w}"`).join(" or ")}`;
  return p.tabs === "all" ? "Any Doomsday tab changes verdict" : `Doomsday tabs ${p.tabs.join(", ")} change verdict`;
}

/**
 * Case-insensitive match of any phrase in a headline, on whole words, with a
 * plural allowed on the last word: "tariff" matches "Tariffs", but "Fed"
 * does not match "FedEx" and "oil" does not match "toil".
 */
export function headlineMatches(title, words) {
  const t = ` ${String(title).toLowerCase().replace(/[^\p{L}\p{N}$%.]+/gu, " ")} `;
  return words.find((w) => {
    const k = w.toLowerCase().replace(/[^\p{L}\p{N}$%.]+/gu, " ").trim();
    if (!k) return false;
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\s${esc}(s|es)?\\s`, "u").test(t);
  }) || null;
}
