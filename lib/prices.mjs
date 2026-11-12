/**
 * Delayed prices for price alerts, from free sources with no key.
 *
 * The quote tables on the site are TradingView widgets, which draw prices
 * inside an iframe that code cannot read. Alerts therefore use their own
 * source: Yahoo Finance's chart endpoint first, Stooq's CSV quotes second.
 * Both are free, delayed (up to about 15 minutes for some markets) and
 * unofficial, so the screen always shows the price an alert is checked
 * against, and says where it came from.
 *
 * Only symbols listed in PRICE_MAP can carry an alert. Where the free source
 * quotes a slightly different instrument than the widget (gold and silver
 * futures rather than spot, for instance) the `note` says so. The Brazilian
 * B3 farm futures are left out: they are priced in reais, and the nearest
 * free series is a different market altogether.
 */

// TradingView symbol -> [Yahoo symbol, Stooq symbol or null, note or null]
export const PRICE_MAP = {
  "FOREXCOM:SPXUSD": ["^GSPC", "^spx", null],
  "FOREXCOM:NSXUSD": ["^NDX", "^ndx", "Nasdaq 100 index"],
  "BLACKBULL:US30": ["^DJI", "^dji", null],
  "TSX:TSX": ["^GSPTSE", null, null],
  "BMFBOVESPA:IBOV": ["^BVSP", null, null],
  "FOREXCOM:UKXGBP": ["^FTSE", "^ukx", null],
  "INDEX:DEU40": ["^GDAXI", "^dax", null],
  "INDEX:SX5E": ["^STOXX50E", null, null],
  "INDEX:CAC40": ["^FCHI", "^cac", null],
  "EURONEXT:AEX": ["^AEX", "^aex", null],
  "INDEX:SMI": ["^SSMI", "^smi", null],
  "INDEX:FTSEMIB": ["FTSEMIB.MI", null, null],
  "BME:IBC": ["^IBEX", "^ibex", null],
  "OMXSTO:OMXS30": ["^OMX", null, null],
  "INDEX:NKY": ["^N225", "^nkx", null],
  "INDEX:HSI": ["^HSI", "^hsi", null],
  "INDEX:KSIC": ["^KS11", null, null],
  "SSE:000001": ["000001.SS", "^shc", null],
  "SZSE:399001": ["399001.SZ", null, null],
  "INDEX:STI": ["^STI", null, null],
  "BSE:SENSEX": ["^BSESN", null, null],
  "INDEX:DXY": ["DX-Y.NYB", null, null],
  "TVC:USOIL": ["CL=F", "cl.f", "front-month WTI futures"],
  "TVC:UKOIL": ["BZ=F", "cb.f", "front-month Brent futures"],
  "CMCMARKETS:GOLD": ["GC=F", "gc.f", "gold futures, a few dollars from spot"],
  "CMCMARKETS:SILVER": ["SI=F", "si.f", "silver futures, close to spot"],
  "CMCMARKETS:COPPER": ["HG=F", "hg.f", "copper futures, in US dollars a pound"],
  "CMCMARKETS:COTTON": ["CT=F", "ct.f", "cotton futures, in US cents a pound"],
  "FOREXCOM:EURUSD": ["EURUSD=X", "eurusd", null],
  "FOREXCOM:GBPUSD": ["GBPUSD=X", "gbpusd", null],
  "FOREXCOM:USDJPY": ["JPY=X", "usdjpy", null],
  "FOREXCOM:USDCHF": ["CHF=X", "usdchf", null],
  "FOREXCOM:AUDUSD": ["AUDUSD=X", "audusd", null],
  "FOREXCOM:USDCAD": ["CAD=X", "usdcad", null]
};

/** US-listed shares map one to one. */
const US_STOCK = /^(NASDAQ|NYSE):([A-Z.]{1,6})$/;

/** `{ yahoo, stooq, note }` for a symbol alerts can watch, or null. */
export function priceSymbol(symbol) {
  const s = String(symbol || "").toUpperCase();
  const m = PRICE_MAP[s];
  if (m) return { yahoo: m[0], stooq: m[1], note: m[2] };
  const st = s.match(US_STOCK);
  if (st) return { yahoo: st[2].replace(".", "-"), stooq: `${st[2].toLowerCase()}.us`, note: null };
  return null;
}

const TIMEOUT = 10000;
const UA = "Mozilla/5.0 (compatible; LedgeDesk/1.0; +https://github.com/baibhavsaraf03-sys/agdesk)";

async function get(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "*/*" }, signal: ctl.signal, cache: "no-store" });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return text;
  } finally {
    clearTimeout(t);
  }
}

async function fromYahoo(sym) {
  const text = await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=5m&range=1d`);
  const meta = JSON.parse(text)?.chart?.result?.[0]?.meta;
  const price = Number(meta?.regularMarketPrice);
  if (!isFinite(price) || price <= 0) throw new Error("no price in the answer");
  return { price, at: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null, source: "Yahoo Finance" };
}

async function fromStooq(sym) {
  const text = await get(`https://stooq.com/q/l/?s=${encodeURIComponent(sym)}&f=sd2t2c&h&e=csv`);
  const row = text.trim().split(/\r?\n/)[1]?.split(",");
  const price = Number(row?.[3]);
  if (!row || !isFinite(price) || price <= 0) throw new Error("no price in the answer");
  const at = /^\d{4}-\d{2}-\d{2}$/.test(row[1]) ? `${row[1]}T${row[2] || "00:00:00"}Z` : null;
  return { price, at, source: "Stooq" };
}

/**
 * `{ symbol, price, at, source, note }` or throws with what each source said.
 * `at` is when the source last priced it, which can be hours old for a
 * closed market.
 */
export async function fetchPrice(symbol) {
  const p = priceSymbol(symbol);
  if (!p) throw new Error("no free price source for this symbol");
  const problems = [];
  for (const [name, fn, sym] of [["yahoo", fromYahoo, p.yahoo], ["stooq", fromStooq, p.stooq]]) {
    if (!sym) continue;
    try {
      return { symbol, ...(await fn(sym)), note: p.note };
    } catch (err) {
      problems.push(`${name}: ${err.message}`);
    }
  }
  throw new Error(problems.join("; "));
}

/** Prices for many symbols at once, a few at a time; failures come back as `{ symbol, error }`. */
export async function fetchPrices(symbols, width = 4) {
  const out = {};
  const queue = [...new Set(symbols)];
  await Promise.all(
    Array.from({ length: Math.min(width, queue.length) }, async () => {
      while (queue.length) {
        const s = queue.shift();
        try {
          out[s] = await fetchPrice(s);
        } catch (err) {
          out[s] = { symbol: s, error: String(err.message).slice(0, 200) };
        }
      }
    })
  );
  return out;
}
