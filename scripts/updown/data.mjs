/**
 * Up or Down (18 Nov): finds today's real 15-minute window.
 *
 * Takes Yahoo Finance one-minute bars (free, delayed) for the market of the
 * day and picks a finished 15-minute stretch whose price crosses its starting
 * level at least twice and ends clearly above or below it, so the guess is a
 * real one. Markets rotate by day; if one is closed or thin (the S&P 500 at a
 * weekend), bitcoin, which trades every day, stands in.
 */
const UA = "Mozilla/5.0 (compatible; LedgeDesk/1.0; +https://github.com/baibhavsaraf03-sys/agdesk)";

export const MARKETS = [
  { key: "gold", name: "Gold", sym: "GC=F", unit: "$", dp: 2, source: "gold futures (COMEX)" },
  { key: "spx", name: "The S&P 500", sym: "^GSPC", unit: "", dp: 2, source: "the S&P 500 index" },
  { key: "btc", name: "Bitcoin", sym: "BTC-USD", unit: "$", dp: 2, source: "bitcoin in US dollars" },
  { key: "oil", name: "Oil", sym: "CL=F", unit: "$", dp: 2, source: "WTI crude futures (NYMEX)" },
  { key: "eur", name: "The euro", sym: "EURUSD=X", unit: "$", dp: 5, source: "euro in US dollars" }
];

export async function bars(sym) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1m&range=1d`;
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!r.ok) throw new Error(`Yahoo ${sym}: HTTP ${r.status}`);
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  const ts = res?.timestamp || [], cl = res?.indicators?.quote?.[0]?.close || [];
  return ts.map((t, i) => ({ t: t * 1000, c: cl[i] })).filter((b) => Number.isFinite(b.c));
}

/** Best finished 15-minute window in the bars, or null. */
export function pickWindow(b, now = Date.now()) {
  let best = null;
  for (let i = 0; i + 15 < b.length; i++) {
    const w = b.slice(i, i + 16);
    if (w[15].t > now - 60e3) break;
    // One bar a minute, no gaps.
    if (w.some((x, k) => k && x.t - w[k - 1].t > 90e3)) continue;
    if (w[15].t - w[0].t !== 15 * 60e3) continue;
    const c0 = w[0].c, last = w[15].c;
    if (last === c0) continue;
    let cross = 0, prev = 0;
    for (let k = 1; k <= 15; k++) {
      const s = Math.sign(w[k].c - c0);
      if (s && prev && s !== prev) cross++;
      if (s) prev = s;
    }
    if (cross < 2) continue;
    const hi = Math.max(...w.map((x) => x.c)), lo = Math.min(...w.map((x) => x.c));
    if (hi === lo) continue;
    const clear = Math.abs(last - c0) / (hi - lo);          // ends well away from the start
    const score = Math.min(cross, 5) + 4 * clear + i / b.length; // a little preference for recent
    if (clear < 0.2) continue;
    if (!best || score > best.score) best = { i, w, score, cross };
  }
  return best;
}

export async function today(dayIndex = Math.floor(Date.now() / 864e5)) {
  const order = [MARKETS[dayIndex % MARKETS.length], ...MARKETS.filter((m) => m.key === "btc")];
  for (const m of order) {
    try {
      const b = await bars(m.sym);
      const p = pickWindow(b);
      if (!p) { console.warn(`  ${m.name}: no good 15-minute window today`); continue; }
      const c0 = p.w[0].c, c1 = p.w[15].c;
      return {
        market: m, points: p.w.map((x) => ({ t: x.t, c: x.c })), start: p.w[0].t, end: p.w[15].t,
        target: c0, final: c1, dir: c1 > c0 ? "up" : "down", pct: (c1 - c0) / c0 * 100, crossings: p.cross
      };
    } catch (e) { console.warn(`  ${m.name}: ${e.message}`); }
  }
  throw new Error("no market had a usable 15-minute window");
}

export const fmt = (m, x) => m.unit + x.toLocaleString("en-US", { minimumFractionDigits: m.dp, maximumFractionDigits: m.dp });
export const nyTime = (t) => new Date(t).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).toLowerCase().replace(" ", "");
export const nyDate = (t) => new Date(t).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" });
