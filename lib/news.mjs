/**
 * Free news ingestion.
 *
 * This exists to remove the only real running cost in the project. The
 * scheduled reads used to call a billed web-search tool a dozen times each,
 * sixteen times a day, which was nearly all of the spend — and the searching,
 * not the writing, was what we were paying for.
 *
 * So we do the gathering ourselves. GDELT indexes world news openly, with no
 * key and no quota worth worrying about. Central banks publish their own
 * decisions on RSS. Between those and the verified figures in quotes.mjs, the
 * model is handed its material and only has to interpret it, which is the part
 * worth paying a model for — and at this volume, on a free tier, that is free.
 *
 * The honest trade: headlines and summaries are thinner than a search engine's
 * full page text. The reads are built to cope, by saying what they could not
 * confirm rather than filling the gap.
 */

// GDELT is often slow when it does answer. Nine seconds cut off responses
// that would have arrived; the binding constraint is its per-address rate
// limit, not latency, so patience per request costs nothing.
const TIMEOUT_MS = Number(process.env.NEWS_TIMEOUT_MS || 20000);

async function getText(url, timeout = TIMEOUT_MS) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: {
        accept: "application/json, application/rss+xml, application/xml, text/xml, */*",
        "user-agent": "ag-desk/1.0 (market reads; contact via site)"
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

const decode = (s) =>
  String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, " ")
    .trim();

/* -------------------------------------------------------------------------- */
/* GDELT                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * GDELT's document API. Free, keyless, and indexes most of the world's news
 * within minutes. We ask for English articles in the last day and take the
 * titles — enough to know what happened and who reported it.
 */
/**
 * GDELT allows roughly one request every few seconds per address and answers
 * 429 to anything faster. The first version fired each zone's queries in
 * parallel, which is exactly the pattern its limiter exists to stop, so every
 * query failed at once. Slots are now reserved across the whole process.
 */
const GDELT_GAP_MS = Number(process.env.GDELT_GAP_MS || 9000);
let gdeltNextFree = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gdeltSlot() {
  const now = Date.now();
  const wait = Math.max(0, gdeltNextFree - now);
  gdeltNextFree = Math.max(now, gdeltNextFree) + GDELT_GAP_MS;
  if (wait) {
    if (process.env.NEWS_VERBOSE) console.log(`      waiting ${Math.round(wait / 1000)}s for a GDELT slot`);
    await sleep(wait);
  }
}

async function gdelt(query, max = 12, hours = 24) {
  // The brackets are mandatory. GDELT rejects any query containing OR unless
  // the OR'd group is parenthesised, and the language filter sits outside it.
  // Every query here used OR, so none of them were ever valid.
  // Catch the five-character rule here rather than spending a round trip and
  // a throttle slot discovering it. One short phrase fails the whole query.
  const tooShort = (query.match(/"([^"]*)"/g) || [])
    .map((p) => p.replace(/"/g, ""))
    .filter((p) => p.trim().length < 5);
  if (tooShort.length) {
    throw new Error(`phrase under 5 characters, which GDELT rejects: ${tooShort.join(", ")}`);
  }

  const full = `(${query}) sourcelang:english`;
  const url =
    "https://api.gdeltproject.org/api/v2/doc/doc" +
    `?query=${encodeURIComponent(full)}` +
    `&mode=ArtList&format=json&sort=hybridrel&maxrecords=${max}&timespan=${hours}h`;

  // Two attempts, and a short second wait. An earlier version waited 15 then
  // 35 seconds in silence, which turned a flaky zone into something that
  // looked hung for minutes. A read that is thin is recoverable; a job that
  // appears to hang is not, because nobody lets it finish.
  const BACKOFF = [0, 6000];
  let last;

  for (let attempt = 0; attempt < BACKOFF.length; attempt++) {
    if (BACKOFF[attempt]) {
      if (process.env.NEWS_VERBOSE) console.log(`      retrying in ${BACKOFF[attempt] / 1000}s`);
      await sleep(BACKOFF[attempt]);
    }
    await gdeltSlot();

    let body;
    try {
      body = await getText(url);
    } catch (err) {
      // 429s and dropped connections are both worth waiting out; a rejected
      // query never is, so it propagates immediately.
      last = err;
      if (/HTTP 429|fetch failed|abort|socket|reset/i.test(err.message)) continue;
      throw err;
    }

    // It answers 200 with plain text when it dislikes the query.
    if (!body.trim().startsWith("{")) {
      throw new Error(`rejected the query — ${body.slice(0, 120).replace(/\s+/g, " ")}`);
    }
    const data = JSON.parse(body);
    return (data.articles || [])
      .map((a) => ({
        title: decode(a.title),
        source: a.domain || "",
        when: a.seendate || "",
        url: a.url || ""
      }))
      .filter((a) => a.title);
  }
  throw new Error(`unreachable after ${BACKOFF.length} attempts — ${last?.message || "no detail"}`);
}

/* -------------------------------------------------------------------------- */
/* RSS                                                                        */
/* -------------------------------------------------------------------------- */

/** Minimal RSS/Atom reader: titles, links and dates, nothing clever. */
async function rssOne(url, max = 6) {
  const xml = await getText(url);
  if (/^\s*<!doctype html/i.test(xml) || /<html[\s>]/i.test(xml.slice(0, 400))) {
    throw new Error(`served HTML, not a feed — ${xml.slice(0, 100).replace(/\s+/g, " ")}`);
  }

  const items = [];
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  for (const b of blocks.slice(0, max)) {
    const title = decode((b.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
    const link =
      (b.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] ||
      decode((b.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1]);
    const when = decode(
      (b.match(/<(pubDate|updated|published|dc:date)[^>]*>([\s\S]*?)<\/\1>/i) || [])[2]
    );
    if (title) items.push({ title, source: new URL(url).hostname, when, url: link || "" });
  }
  if (!items.length) throw new Error("no items found in the feed");
  return items;
}

/**
 * Tries each URL in turn and keeps the first that answers.
 *
 * Institutions move their feeds and leave the old path serving 404s — the ECB
 * publishes at more than one address and only one of them responded. Treating
 * them as alternatives rather than separate sources means a stale URL costs
 * nothing instead of reporting a failure that is not really one.
 */
async function rss(urls, max = 6) {
  const list = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
  if (!list.length) throw new Error("no feed configured");
  const problems = [];
  for (const u of list) {
    try {
      return await rssOne(u, max);
    } catch (err) {
      problems.push(`${u} → ${err.message}`);
    }
  }
  throw new Error(problems.join("; "));
}

/* -------------------------------------------------------------------------- */
/* per zone                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Queries are written to find market reporting rather than general news:
 * index names and central banks, not country names, which would return
 * politics and sport.
 */
const ZONE_NEWS = {
  anz: {
    queries: [
      '"ASX 200" OR "Australian shares" OR "Australian stocks"',
      '"Reserve Bank of Australia" OR "Reserve Bank of New Zealand" OR "NZX 50"'
    ],
    feeds: [["https://www.rba.gov.au/rss/rss-cb-media-releases.xml"]]
  },
  eas: {
    queries: [
      '"Nikkei 225" OR "Topix" OR "Hang Seng" OR "Shanghai Composite"',
      '"Bank of Japan" OR "Kospi" OR "CSI 300" OR "Taiex"'
    ],
    feeds: [["https://www.boj.or.jp/en/rss/whatsnew.xml"]]
  },
  ind: {
    queries: [
      '"Nifty 50" OR "Sensex" OR "Indian shares" OR "Indian stocks"',
      '"Reserve Bank of India" OR "Indian rupee" OR "Nifty Bank"'
    ],
    feeds: []
  },
  eur: {
    queries: [
      // "DAX" alone is rejected: GDELT will not match a quoted phrase shorter
      // than five characters, and it invalidates the whole query rather than
      // just that term.
      '"FTSE 100" OR "Stoxx 600" OR "German DAX" OR "CAC 40" OR "European shares"',
      '"Bank of England" OR "European Central Bank" OR "gilt yields" OR "euro zone inflation"'
    ],
    feeds: [
      [
        "https://www.ecb.europa.eu/rss/pr.html",
        "https://www.ecb.europa.eu/press/pr/rss/press.xml",
        "https://www.ecb.europa.eu/rss/press.html"
      ]
    ]
  },
  ams: {
    queries: [
      '"S&P 500" OR "Nasdaq" OR "Dow Jones" OR "Wall Street stocks"',
      '"Federal Reserve" OR "Treasury yields" OR "Ibovespa" OR "TSX composite"'
    ],
    feeds: [["https://www.federalreserve.gov/feeds/press_all.xml"]]
  },
  ag: {
    queries: [
      '"corn futures" OR "soybean futures" OR "wheat futures" OR "WASDE report"',
      '"coffee prices" OR "cocoa prices" OR "sugar prices" OR "palm oil prices"'
    ],
    feeds: []
  }
};

/**
 * Everything we could gather for one zone, plus what failed.
 *
 * Partial results are normal and fine: a read built on two of three queries is
 * still a read, and the caller is told what is missing so it can say so.
 */
export async function fetchNews(zone, { perQuery = 10, hours = 24 } = {}) {
  const spec = ZONE_NEWS[zone];
  if (!spec) return { items: [], ok: [], failed: [`unknown zone ${zone}`] };

  const items = [];
  const ok = [];
  const failed = [];
  const seen = new Set();

  /** Headlines repeat across syndicating outlets; keep the first wording. */
  const absorb = (list) => {
    for (const a of list) {
      const fingerprint = a.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").slice(0, 70);
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      items.push(a);
    }
  };

  // Publisher feeds first, and in parallel: different hosts, no shared limit,
  // and they cost nothing against GDELT's budget.
  const feedGroups = spec.feeds.filter((g) => (Array.isArray(g) ? g.length : g));
  const feedResults = await Promise.allSettled(feedGroups.map((g) => rss(g)));
  feedResults.forEach((r, i) => {
    const first = Array.isArray(feedGroups[i]) ? feedGroups[i][0] : feedGroups[i];
    const name = `feed: ${new URL(first).hostname}`;
    if (r.status === "fulfilled" && r.value.length) {
      ok.push(name);
      absorb(r.value);
    } else {
      failed.push(`${name} — ${r.reason?.message || "returned nothing"}`);
    }
  });

  // GDELT in sequence, stopping as soon as we have enough.
  //
  // Each query is a throttled round trip against a service that drops
  // connections when pushed, so the cheapest reliability win is simply not
  // making the second call. The first query is the broad one; the rest exist
  // for the days when it comes back thin.
  const ENOUGH = Number(process.env.NEWS_ENOUGH || 8);
  for (const q of spec.queries) {
    if (items.filter((a) => a.source && !a.source.startsWith("www.")).length >= ENOUGH) break;
    const name = `GDELT: ${q.slice(0, 40)}…`;
    try {
      const got = await gdelt(q, perQuery, hours);
      ok.push(name);
      absorb(got);
    } catch (err) {
      failed.push(`${name} — ${err.message}`);
    }
  }

  return { items, ok, failed };
}

/** The headline block handed to the model. */
export function newsBlock(items, failed) {
  if (!items.length) {
    return `HEADLINES: none could be retrieved${
      failed.length ? ` (${failed.length} source(s) failed)` : ""
    }. Say plainly in your sections that you could not establish what drove the session, and do not invent a narrative.`;
  }
  const lines = items.map((a) => `- ${a.title}${a.source ? ` [${a.source}]` : ""}`);
  return `HEADLINES — retrieved this run from GDELT's news index and official central bank feeds, covering roughly the last 24 hours. These are headlines and sources, not full articles:
${lines.join("\n")}`;
}

export const NEWS_SOURCES = ZONE_NEWS;
