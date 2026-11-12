/**
 * The meme-stock tracker (MEME): what r/wallstreetbets is talking about, and
 * whether the price is actually moving with it.
 *
 * Mentions come from ApeWisdom, which counts ticker mentions across Reddit's
 * trading communities and publishes them free with no key. The site never
 * calls Reddit itself: Reddit's free API is closed to new apps and blocks
 * unauthenticated requests. Prices and volume come from the same free Yahoo
 * Finance endpoint the price alerts use.
 *
 * Buzz is not a rally. A ticker is only flagged "Rally" when the talk and the
 * price move together; the other labels say which half is missing.
 */

const UA = "Mozilla/5.0 (compatible; LedgeDesk/1.0; +https://github.com/baibhavsaraf03-sys/agdesk)";
const TIMEOUT = 12000;
export const MEME_TOP = 25;

async function getJson(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: ctl.signal, cache: "no-store" });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 120).replace(/\s+/g, " ")}`);
    return JSON.parse(text);
  } finally {
    clearTimeout(t);
  }
}

/** Top tickers on r/wallstreetbets over the last 24 hours, by mentions. */
export async function fetchMentions(filter = "wallstreetbets", top = MEME_TOP) {
  const j = await getJson(`https://apewisdom.io/api/v1.0/filter/${encodeURIComponent(filter)}/page/1`);
  const rows = (j?.results || [])
    .map((r) => ({
      ticker: String(r.ticker || "").toUpperCase().trim(),
      name: String(r.name || "").replace(/&amp;/g, "&").trim(),
      rank: Number(r.rank) || null,
      rank24: Number(r.rank_24h_ago) || null,
      mentions: Number(r.mentions) || 0,
      mentions24: Number(r.mentions_24h_ago) || 0,
      upvotes: Number(r.upvotes) || 0
    }))
    .filter((r) => /^[A-Z][A-Z.]{0,5}$/.test(r.ticker) && r.mentions > 0);
  if (!rows.length) throw new Error("no tickers in the answer");
  return rows.sort((a, b) => b.mentions - a.mentions).slice(0, top);
}

/**
 * Price, change on the previous close and volume against the 20-day average,
 * from one daily-bars request. During the session "today" is partial, so the
 * volume ratio is volume so far.
 */
export async function fetchQuote(ticker) {
  const j = await getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker.replace(".", "-"))}?interval=1d&range=1mo`);
  const r = j?.chart?.result?.[0];
  const meta = r?.meta;
  const price = Number(meta?.regularMarketPrice);
  if (!isFinite(price) || price <= 0) throw new Error("no price");
  const ts = r.timestamp || [];
  const q = r.indicators?.quote?.[0] || {};
  const closes = q.close || [];
  const vols = q.volume || [];
  const day = (sec) => new Date(sec * 1000).toISOString().slice(0, 10);
  const lastIsToday = ts.length && meta.regularMarketTime && day(ts[ts.length - 1]) === day(meta.regularMarketTime);
  const prevIdx = lastIsToday ? ts.length - 2 : ts.length - 1;
  let prev = null;
  for (let i = prevIdx; i >= 0; i--) if (isFinite(closes[i]) && closes[i] > 0) { prev = closes[i]; break; }
  const histVols = vols.slice(0, lastIsToday ? -1 : undefined).filter((v) => isFinite(v) && v > 0).slice(-20);
  const avgVol = histVols.length >= 5 ? histVols.reduce((a, b) => a + b, 0) / histVols.length : null;
  const vol = Number(meta.regularMarketVolume) || (lastIsToday ? vols[vols.length - 1] : null) || null;
  return {
    price,
    change: prev ? (price / prev - 1) * 100 : null,
    volRatio: avgVol && vol ? vol / avgVol : null,
    currency: meta.currency || "USD",
    exchange: meta.exchangeName || null,
    at: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null
  };
}

export async function fetchQuotes(tickers, width = 4) {
  const out = {};
  const queue = [...tickers];
  await Promise.all(Array.from({ length: Math.min(width, queue.length) }, async () => {
    while (queue.length) {
      const t = queue.shift();
      try {
        out[t] = await fetchQuote(t);
      } catch (err) {
        out[t] = { error: String(err.message).slice(0, 120) };
      }
    }
  }));
  return out;
}

/**
 * The label for one row. `buzz` is the change in mentions on the day before
 * (a ticker new to the list counts as a surge).
 *   Rally        talk surging and price up 5% or more, or price up 10% on
 *                double the usual volume
 *   Buzzing      talk surging, price not following (yet)
 *   Selling off  talk surging while the price falls 5% or more
 *   (none)       the rest: talked about, nothing unusual
 */
export function classify(row) {
  const surge = row.mentions >= 25 && (row.mentions24 === 0 || row.mentions / Math.max(row.mentions24, 1) >= 1.5);
  const ch = row.change;
  if (ch != null && ((surge && ch >= 5) || (ch >= 10 && (row.volRatio || 0) >= 2))) return "Rally";
  if (surge && ch != null && ch <= -5) return "Selling off";
  if (surge) return "Buzzing";
  return "";
}

export function buildRows(mentions, quotes) {
  return mentions.map((m) => {
    const q = quotes[m.ticker] || {};
    const row = {
      ...m,
      price: q.price ?? null,
      change: q.change ?? null,
      volRatio: q.volRatio ?? null,
      currency: q.currency ?? null,
      exchange: q.exchange ?? null,
      priceAt: q.at ?? null
    };
    return { ...row, flag: classify(row) };
  });
}

/** The TradingView symbol for a chart link, where the exchange is one the widget takes. */
export function memeSymbol(row) {
  const ex = String(row.exchange || "").toUpperCase();
  if (/NASDAQ|NMS|NGM|NCM/.test(ex)) return `NASDAQ:${row.ticker}`;
  if (/NYSE|NYQ/.test(ex)) return `NYSE:${row.ticker}`;
  return null;
}
