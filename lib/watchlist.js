/**
 * The watchlist (WL): rules shared by the screen and the route that saves it.
 *
 * A watchlist is an ordered list of TradingView symbols, EXCHANGE:TICKER. The
 * same check runs in the browser, in /api/watchlist and (as a size limit) in
 * the database, so a list that the page accepts is one the account can hold.
 */
import { chartName } from "./charts.js";

export const WATCH_MAX = 40;
export const WATCH_STORE = "agdesk.watch";

const SYMBOL_RE = /^[A-Z0-9_]{1,20}:[A-Z0-9._!/-]{1,30}$/;

/** Valid symbols only, upper-cased, each once, in the order given, cut at the limit. */
export function cleanSymbols(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const raw of input) {
    const s = String(raw || "").trim().toUpperCase();
    if (SYMBOL_RE.test(s) && !out.includes(s)) out.push(s);
    if (out.length >= WATCH_MAX) break;
  }
  return out;
}

/** What the starter button fills an empty list with: the benchmarks most desks keep open. */
export const WATCH_STARTER = [
  "FOREXCOM:SPXUSD", "FOREXCOM:NSXUSD", "FOREXCOM:UKXGBP", "INDEX:DXY", "CMCMARKETS:GOLD", "TVC:USOIL"
];

/**
 * Payload for TradingView's Market Quotes widget showing this list. Colours
 * are set by TVWidget, which knows the theme. Null for an empty list.
 */
export function watchQuotesConfig(symbols) {
  if (!symbols?.length) return null;
  return {
    width: "100%",
    height: 34 + (symbols.length + 1) * 30,
    symbolsGroups: [
      {
        name: "Watchlist",
        originalName: "Watchlist",
        symbols: symbols.map((s) => ({ name: s, displayName: chartName(s) }))
      }
    ],
    showSymbolLogo: false,
    isTransparent: false,
    locale: "en"
  };
}
