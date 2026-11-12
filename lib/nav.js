/**
 * How the screens are grouped for navigation.
 *
 * Five areas instead of one long list. Order inside each area runs from what
 * most people need to the specialist. BEGINNER is the short set shown in
 * Beginner mode; every other screen is still reachable by the jump box, the
 * command bar, links and Pro mode, so nothing is ever locked away.
 */
export const NAV_AREAS = [
  { id: "today", t: "Today", items: ["HOME", "NEWS", "CAL", "GEO"] },
  { id: "markets", t: "Markets", items: ["CHT", "WLD", "ASIA", "EMEA", "AMER", "FX", "MAC", "MEME", "DOOM", "FLOW"] },
  { id: "commod", t: "Commodities", items: ["DESK", "GRN", "SFT", "TRD", "WCH"] },
  { id: "learn", t: "Learn", items: ["START", "TUT", "RISK", "GLOS", "MTD", "ECON", "LAW", "IR", "POL", "SEM", "SRC"] },
  { id: "desk", t: "My desk", items: ["AGN", "WL", "ALR", "JRN", "SET"] }
];

/** In the footer of the menu rather than an area. */
export const NAV_FOOT = ["HELP", "TERMS"];

export const BEGINNER = new Set([
  "HOME", "NEWS", "CAL",
  "CHT", "WLD", "FX",
  "DESK",
  "START", "TUT", "RISK", "GLOS",
  "AGN", "WL", "ALR", "SET"
]);

export const NAV_MODE_STORE = "agdesk.navmode";

export function areaOf(code) {
  return NAV_AREAS.find((a) => a.items.includes(code))?.id || null;
}
