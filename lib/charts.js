/**
 * What the Charts screen (CHT) can open, and how a typed command finds it.
 *
 * Built from the same groups as the quote tables (lib/tv.js), so a symbol
 * fixed there is fixed here. The free chart widget draws only the feeds the
 * quote widget can show (see the TradingView rules in CLAUDE.md); anything
 * else opens as an empty chart rather than an error.
 *
 * The Currencies group is the one addition. FOREXCOM is a working feed for
 * the index CFDs; the pairs themselves are not yet confirmed on the live
 * site, and should be removed (not swapped for a guess) if they come up blank.
 */
import { TV_GROUPS, TAPE } from "./tv.js";
import VERIFIED, { NO_DATA } from "./tv-symbols.js";

const EXTRA = [
  {
    name: "Currencies",
    symbols: [
      ["FOREXCOM:EURUSD", "EUR/USD"],
      ["FOREXCOM:GBPUSD", "GBP/USD"],
      ["FOREXCOM:USDJPY", "USD/JPY"],
      ["FOREXCOM:USDCHF", "USD/CHF"],
      ["FOREXCOM:AUDUSD", "AUD/USD"],
      ["FOREXCOM:USDCAD", "USD/CAD"]
    ]
  }
];

const ORDER = ["WLD", "AMER", "EMEA", "ASIA", "MAC", "GRN", "SFT", "DOOM"];

/** Groups for the picker, each symbol listed once, in the order of the first group that has it. */
export const CHART_GROUPS = (() => {
  const seen = new Set();
  const out = [];
  const add = (g) => {
    const symbols = g.symbols
      .filter(([, d]) => !NO_DATA.includes(d))
      .map(([s, d]) => [VERIFIED[d] || s, d])
      .filter(([s]) => !seen.has(s) && seen.add(s));
    if (symbols.length) out.push({ name: g.name, symbols });
  };
  for (const k of ORDER) (TV_GROUPS[k] || []).forEach(add);
  EXTRA.forEach(add);
  return out;
})();

export const CHART_SYMBOLS = CHART_GROUPS.flatMap((g) => g.symbols);

/** Display name for a symbol, or the bare ticker when it is not in the list. */
export function chartName(symbol) {
  return CHART_SYMBOLS.find(([s]) => s === symbol)?.[1] || symbol;
}

/** The benchmarks shown as one-tap shortcuts above the charts. */
export const QUICK = TAPE.filter((t) => !NO_DATA.includes(t.title)).map((t) => [VERIFIED[t.title] || t.proName, t.title]);

/** Shorthands a trader is likely to type after CHT. */
const SHORT = {
  SPX: "FOREXCOM:SPXUSD", SP500: "FOREXCOM:SPXUSD", ES: "FOREXCOM:SPXUSD",
  NDX: "FOREXCOM:NSXUSD", NASDAQ: "FOREXCOM:NSXUSD", NQ: "FOREXCOM:NSXUSD",
  UKX: "FOREXCOM:UKXGBP", FTSE: "FOREXCOM:UKXGBP",
  DAX: "INDEX:DEU40", NIKKEI: "INDEX:NKY", DOW: "BLACKBULL:US30", DJI: "BLACKBULL:US30",
  WTI: "TVC:USOIL", OIL: "TVC:USOIL", CL: "TVC:USOIL", BRENT: "TVC:UKOIL",
  GOLD: "CMCMARKETS:GOLD", XAU: "CMCMARKETS:GOLD", SILVER: "CMCMARKETS:SILVER", COPPER: "CMCMARKETS:COPPER",
  DXY: "INDEX:DXY", DOLLAR: "INDEX:DXY",
  EUR: "FOREXCOM:EURUSD", GBP: "FOREXCOM:GBPUSD", CABLE: "FOREXCOM:GBPUSD", JPY: "FOREXCOM:USDJPY", YEN: "FOREXCOM:USDJPY"
};

const compact = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Turns what follows CHT into a symbol: a known shorthand, a ticker or name
 * from the list, or a full EXCHANGE:TICKER passed through as typed. Null if
 * nothing matches.
 */
export function findSymbol(input) {
  const raw = String(input || "").trim().toUpperCase();
  if (!raw) return null;
  if (/^[A-Z0-9_]{1,20}:[A-Z0-9._!/-]{1,30}$/.test(raw)) return raw;
  const c = compact(raw);
  if (SHORT[c]) return SHORT[c];
  const hit =
    CHART_SYMBOLS.find(([s]) => compact(s.split(":")[1]) === c) ||
    CHART_SYMBOLS.find(([, d]) => compact(d) === c) ||
    CHART_SYMBOLS.find(([, d]) => compact(d).startsWith(c) && c.length >= 3);
  return hit ? hit[0] : null;
}

export const INTERVALS = [
  ["5", "5m"], ["15", "15m"], ["60", "1h"], ["240", "4h"], ["D", "1D"], ["W", "1W"], ["M", "1M"]
];

/** Indicators offered as switches. The chart's own menu has the rest. */
export const STUDIES = [
  ["MASimple@tv-basicstudies", "Moving average"],
  ["BB@tv-basicstudies", "Bollinger bands"],
  ["RSI@tv-basicstudies", "RSI"],
  ["MACD@tv-basicstudies", "MACD"],
  ["Volume@tv-basicstudies", "Volume"]
];
