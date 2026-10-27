/**
 * Topic news streams.
 *
 * The terminal's real niche is news and teaching rather than live quotes —
 * quotes live inside TradingView's iframe and we cannot reach them, while
 * publisher RSS gives us a hundred and sixty headlines a second for nothing.
 *
 * Four streams, and the ordering is a judgement: finance first because it is
 * what people came for, then politics, international relations and law,
 * because those three move markets and are almost never taught as market
 * inputs. A student who can read a court ruling or a chokepoint closure as a
 * price signal has something most finance graduates do not.
 *
 * Each entry is a list of alternative URLs for one publisher, tried in order.
 * Feeds rot; a dead one costs nothing and the rest carry the stream.
 */

import { rss } from "./news.mjs";

export const STREAMS = {
  finance: {
    label: "Finance",
    blurb: "Markets, central banks, earnings and the money behind them.",
    sources: [
      ["https://www.cnbc.com/id/20910258/device/rss/rss.html"],
      [
        "https://feeds.content.dowjones.io/public/rss/mw_topstories",
        "http://feeds.marketwatch.com/marketwatch/topstories/"
      ],
      ["https://www.cnbc.com/id/19794221/device/rss/rss.html"],
      ["https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms"],
      ["https://asia.nikkei.com/rss/feed/nar"],
      ["https://www.federalreserve.gov/feeds/press_all.xml"]
    ]
  },

  politics: {
    label: "Politics",
    blurb:
      "Budgets, elections and legislation. Fiscal policy is a market input before it is a political story.",
    sources: [
      ["https://feeds.bbci.co.uk/news/politics/rss.xml"],
      ["https://www.theguardian.com/politics/rss"],
      ["https://www.politico.eu/feed/"],
      ["https://www.politico.com/rss/politics08.xml"]
    ]
  },

  ir: {
    label: "International relations",
    blurb:
      "Conflict, alliances, sanctions and trade policy — where chokepoints close and supply chains reroute.",
    sources: [
      ["https://feeds.bbci.co.uk/news/world/rss.xml"],
      ["https://www.aljazeera.com/xml/rss/all.xml"],
      ["https://thediplomat.com/feed/"],
      ["https://foreignpolicy.com/feed/"],
      ["https://www.economist.com/international/rss.xml"]
    ]
  },

  law: {
    label: "Law & regulation",
    blurb:
      "Rulings, enforcement and rulemaking. A regulator's announcement reprices a sector faster than most earnings.",
    sources: [
      ["https://www.sec.gov/news/pressreleases.rss"],
      ["https://www.scotusblog.com/feed/"],
      ["https://www.jurist.org/news/feed/"],
      [
        "https://ec.europa.eu/commission/presscorner/api/rss?language=en&pagesize=20",
        "https://ec.europa.eu/commission/presscorner/home/en"
      ],
      ["https://www.cftc.gov/RSS/RSSGP/rssgp.xml"]
    ]
  }
};

export const STREAM_KEYS = Object.keys(STREAMS);

/** Rough recency, for sorting a mixed pile of feeds into something readable. */
function when(item) {
  const t = Date.parse(item.when || "");
  return isFinite(t) ? t : 0;
}

/**
 * One stream's headlines, newest first, deduplicated across publishers.
 *
 * Partial results are the normal case and perfectly serviceable: the caller
 * is told which publishers answered so the interface can be honest about
 * coverage rather than implying the whole world was consulted.
 */
export async function fetchStream(topic, { perSource = 10 } = {}) {
  const spec = STREAMS[topic];
  if (!spec) return { items: [], ok: [], failed: [`unknown stream ${topic}`] };

  const settled = await Promise.allSettled(spec.sources.map((group) => rss(group, perSource)));

  const items = [];
  const ok = [];
  const failed = [];
  const seen = new Set();

  settled.forEach((r, i) => {
    const first = Array.isArray(spec.sources[i]) ? spec.sources[i][0] : spec.sources[i];
    let host = first;
    try {
      host = new URL(first).hostname.replace(/^www\./, "");
    } catch {
      // A malformed URL in the table should not take the stream down.
    }

    if (r.status === "fulfilled" && r.value.length) {
      ok.push(host);
      for (const a of r.value) {
        const fingerprint = a.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").slice(0, 70);
        if (seen.has(fingerprint)) continue;
        seen.add(fingerprint);
        items.push({ ...a, source: host });
      }
    } else {
      failed.push(`${host} — ${r.reason?.message || "returned nothing"}`);
    }
  });

  // Many feeds omit dates. Those sort to the end rather than the top, so an
  // undated item never masquerades as the latest news.
  items.sort((a, b) => when(b) - when(a));

  return { items, ok, failed };
}

/** Every stream at once, for the front page. */
export async function fetchAllStreams(opts) {
  const out = {};
  const results = await Promise.allSettled(STREAM_KEYS.map((k) => fetchStream(k, opts)));
  STREAM_KEYS.forEach((k, i) => {
    out[k] = results[i].status === "fulfilled" ? results[i].value : { items: [], ok: [], failed: ["failed"] };
  });
  return out;
}
