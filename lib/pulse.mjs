/**
 * The desk's instruments: a handful of delayed prices with their change on
 * the day, the S&P 500's latest session as a line, and the "market mood"
 * word on the home dial.
 *
 * Free sources only (Yahoo Finance's chart API, the same one the alerts and
 * the meme read use). Figures are delayed and for orientation, which the
 * screen says.
 *
 * The mood word is not an opinion. It is read off the VIX, the market's own
 * price for expected S&P 500 swings over the next month, in fixed bands, so
 * anyone can check it:
 *   under 13 Calm · 13–17 Steady · 17–22 Uneasy · 22–28 Nervous ·
 *   28–35 Fearful · 35 and over Alarmed
 * with one exception: a VIX under 17 and the S&P 500 up 1% or more on the
 * day reads Buoyant.
 */

const TIMEOUT = 9000;
const UA = "Mozilla/5.0 (compatible; LedgeDesk/1.0; +https://github.com/baibhavsaraf03-sys/agdesk)";

/** What the dials and the positions list show, in order. `chart` is the symbol the Chart links open. */
export const PULSE = [
  { k: "spx", yahoo: "^GSPC", name: "S&P 500", short: "S&P 500", chart: "FOREXCOM:SPXUSD", unit: "pct" },
  { k: "ndx", yahoo: "^NDX", name: "Nasdaq 100", short: "Nasdaq", chart: "FOREXCOM:NSXUSD", unit: "pct" },
  { k: "ftse", yahoo: "^FTSE", name: "FTSE 100", short: "FTSE 100", chart: "FOREXCOM:UKXGBP", unit: "pct" },
  { k: "dax", yahoo: "^GDAXI", name: "DAX", short: "DAX", chart: "INDEX:DEU40", unit: "pct" },
  { k: "nky", yahoo: "^N225", name: "Nikkei 225", short: "Nikkei", chart: "INDEX:NKY", unit: "pct" },
  { k: "gold", yahoo: "GC=F", name: "Gold", short: "Gold", chart: "CMCMARKETS:GOLD", unit: "usd" },
  { k: "brent", yahoo: "BZ=F", name: "Brent crude", short: "Brent", chart: "TVC:UKOIL", unit: "usd" },
  { k: "eurusd", yahoo: "EURUSD=X", name: "Euro / dollar", short: "EUR/USD", chart: "FOREXCOM:EURUSD", unit: "fx" }
];

export const MOOD_BANDS = [
  [13, "Calm"], [17, "Steady"], [22, "Uneasy"], [28, "Nervous"], [35, "Fearful"], [Infinity, "Alarmed"]
];

async function getJson(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: ctl.signal, cache: "no-store" });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return JSON.parse(text);
  } finally {
    clearTimeout(t);
  }
}

/**
 * One symbol's latest session from 5-minute bars: price, change against the
 * previous close, and (when `withPoints`) the bars themselves.
 */
async function session(sym, withPoints) {
  const j = await getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=5m&range=1d`);
  const r = j?.chart?.result?.[0];
  const meta = r?.meta || {};
  const price = Number(meta.regularMarketPrice);
  if (!isFinite(price) || price <= 0) throw new Error("no price");
  const prev = Number(meta.chartPreviousClose ?? meta.previousClose);
  const out = {
    price,
    prev: isFinite(prev) && prev > 0 ? prev : null,
    change: isFinite(prev) && prev > 0 ? (price / prev - 1) * 100 : null,
    at: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null
  };
  if (withPoints) {
    const ts = r.timestamp || [];
    const cl = r.indicators?.quote?.[0]?.close || [];
    const pts = [];
    for (let i = 0; i < ts.length; i++) if (isFinite(cl[i]) && cl[i] > 0) pts.push([ts[i] * 1000, Math.round(cl[i] * 100) / 100]);
    // At most 78 five-minute bars in a US session: small enough to send whole.
    out.points = pts;
    out.tz = meta.exchangeTimezoneName || null;
  }
  return out;
}

export function moodFor(vix, spxChange) {
  if (!isFinite(vix)) return null;
  if (vix < 17 && isFinite(spxChange) && spxChange >= 1) return "Buoyant";
  return MOOD_BANDS.find(([max]) => vix < max)[1];
}

/** Everything the home instruments need; individual failures come back as `{ error }`. */
export async function fetchPulse() {
  const jobs = [
    ...PULSE.map((p) => [p.k, p.yahoo, p.k === "spx"]),
    ["vix", "^VIX", false]
  ];
  const got = {};
  await Promise.all(
    jobs.map(async ([k, sym, pts]) => {
      try {
        got[k] = await session(sym, pts);
      } catch (err) {
        got[k] = { error: String(err.message).slice(0, 120) };
      }
    })
  );
  const vix = got.vix?.price;
  const word = moodFor(vix, got.spx?.change);
  return {
    at: new Date().toISOString(),
    source: "Yahoo Finance, delayed",
    instruments: PULSE.map((p) => ({ k: p.k, name: p.name, short: p.short, chart: p.chart, unit: p.unit, ...got[p.k] })),
    vix: got.vix?.error ? null : { level: vix, change: got.vix?.change ?? null },
    mood: word ? { word, level: vix, needle: Math.max(0, Math.min(1, (vix - 10) / 30)) } : null,
    session: got.spx?.points?.length ? { name: "S&P 500", points: got.spx.points, prev: got.spx.prev, tz: got.spx.tz } : null
  };
}

/** "+0.62%" / "−0.21%" with a real minus sign; "" when unknown. */
export function fmtChange(c, digits = 2) {
  if (c == null || !isFinite(c)) return "";
  const s = Math.abs(c).toFixed(digits);
  return (c > 0 ? "+" : c < 0 ? "−" : "") + s + "%";
}

export function fmtPrice(p, unit) {
  if (p == null || !isFinite(p)) return "";
  if (unit === "fx") return p.toFixed(4);
  return p.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
