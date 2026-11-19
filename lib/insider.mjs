/**
 * Insider cluster-buy radar (INS screen). Reads SEC Form 4 filings, keeps
 * open-market purchases (transaction code P) by company officers and
 * directors, and flags a cluster when CLUSTER_MIN different insiders at one
 * company buy within CLUSTER_DAYS. Pure functions here; the fetching is in
 * scripts/insider-read.mjs.
 *
 * What a cluster is not: a prediction. Studies find insider purchases carry
 * some information on average, but most clusters do nothing special, and the
 * screen says so.
 */
export const CLUSTER_DAYS = 14;
export const CLUSTER_MIN = 3;
export const KEEP_DAYS = 45;

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}>\\s*(?:<value>)?\\s*([^<]*?)\\s*(?:</value>)?\\s*</${name}>`));
  return m ? m[1].trim() : "";
};
const blocks = (xml, name) => [...xml.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "g"))].map((m) => m[1]);
const unescape = (s) => String(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
const num = (s) => (s === "" || s == null ? null : Number(String(s).replace(/,/g, "")));

/**
 * One Form 4 (the full submission text) -> purchases by officers/directors.
 * Returns [] for anything else (sales, grants, option exercises, funds).
 */
export function parseForm4(text, filed) {
  const xml = text.match(/<ownershipDocument>[\s\S]*<\/ownershipDocument>/)?.[0];
  if (!xml || tag(xml, "documentType") !== "4") return [];
  const issuer = blocks(xml, "issuer")[0] || "";
  const ticker = tag(issuer, "issuerTradingSymbol").toUpperCase().replace(/[^A-Z.\-]/g, "");
  const company = unescape(tag(issuer, "issuerName"));
  const issuerCik = tag(issuer, "issuerCik").replace(/^0+/, "");
  const owners = blocks(xml, "reportingOwner").map((o) => {
    const rel = blocks(o, "reportingOwnerRelationship")[0] || "";
    const yes = (k) => /^(1|true)$/i.test(tag(rel, k));
    const title = tag(rel, "officerTitle");
    return {
      cik: tag(o, "rptOwnerCik").replace(/^0+/, ""),
      name: unescape(tag(o, "rptOwnerName")),
      director: yes("isDirector"),
      officer: yes("isOfficer"),
      tenPct: yes("isTenPercentOwner"),
      title
    };
  });
  // Only people who run or oversee the company. A director who is also a 10%
  // owner is usually an investment fund's representative, whose purchases are
  // the fund's (often joining a share sale by the company), so they are left out.
  const insiders = owners.filter((o) => (o.director || o.officer) && !o.tenPct);
  if (!insiders.length || !ticker || /^(NONE|N\/?A|NA|NULL)$/.test(ticker)) return [];
  const plan = /^(1|true)$/i.test(tag(xml, "aff10b5One"));

  const out = [];
  for (const t of blocks(xml, "nonDerivativeTransaction")) {
    const coding = blocks(t, "transactionCoding")[0] || "";
    if (tag(coding, "transactionCode") !== "P") continue;
    const amounts = blocks(t, "transactionAmounts")[0] || "";
    if (tag(amounts, "transactionAcquiredDisposedCode") !== "A") continue;
    const shares = num(tag(amounts, "transactionShares"));
    const price = num(tag(amounts, "transactionPricePerShare"));
    if (!shares || !price) continue;
    const date = tag(t, "transactionDate").slice(0, 10);
    for (const o of insiders) {
      out.push({
        issuerCik, ticker, company, filed,
        date, shares, price, value: Math.round(shares * price),
        owner: o.name, ownerCik: o.cik,
        role: o.officer ? (o.title || "Officer") : "Director",
        plan
      });
    }
  }
  return out;
}

/** Group recent purchases into clusters, biggest first. */
export function clusters(buys, today = new Date()) {
  const from = new Date(today.getTime() - CLUSTER_DAYS * 86400000).toISOString().slice(0, 10);
  const by = new Map();
  for (const b of buys) {
    if (b.date < from) continue;
    const g = by.get(b.issuerCik) || { issuerCik: b.issuerCik, ticker: b.ticker, company: b.company, buys: [] };
    g.buys.push(b);
    by.set(b.issuerCik, g);
  }
  const out = [];
  for (const g of by.values()) {
    const people = new Map();
    for (const b of g.buys) {
      const p = people.get(b.ownerCik) || { name: b.owner, role: b.role, value: 0, shares: 0, last: b.date };
      p.value += b.value;
      p.shares += b.shares;
      if (b.date > p.last) p.last = b.date;
      people.set(b.ownerCik, p);
    }
    if (people.size < CLUSTER_MIN) continue;
    const shares = g.buys.reduce((s, b) => s + b.shares, 0);
    const value = g.buys.reduce((s, b) => s + b.value, 0);
    const dates = g.buys.map((b) => b.date).sort();
    // Everyone paying one identical price on one day usually means a share
    // sale by the company that insiders joined, not buying on the market.
    const offering = new Set(g.buys.map((b) => b.price)).size === 1 && new Set(dates).size === 1;
    out.push({
      ticker: g.ticker,
      company: g.company,
      issuerCik: g.issuerCik,
      insiders: people.size,
      value,
      avgPrice: Math.round((100 * value) / shares) / 100,
      first: dates[0],
      last: dates.at(-1),
      officers: [...people.values()].filter((p) => p.role !== "Director").length,
      offering,
      people: [...people.values()].sort((a, b) => b.value - a.value)
    });
  }
  return out.sort((a, b) => b.insiders - a.insiders || b.value - a.value);
}

/** Largest single purchases (by one insider, one company) in the last `days`. */
export function biggest(buys, days = 7, today = new Date(), n = 12) {
  const from = new Date(today.getTime() - days * 86400000).toISOString().slice(0, 10);
  const by = new Map();
  for (const b of buys) {
    if (b.date < from) continue;
    const k = b.issuerCik + ":" + b.ownerCik;
    const g = by.get(k) || { ticker: b.ticker, company: b.company, owner: b.owner, role: b.role, value: 0, shares: 0, last: b.date };
    g.value += b.value;
    g.shares += b.shares;
    if (b.date > g.last) g.last = b.date;
    by.set(k, g);
  }
  return [...by.values()].map((g) => ({ ...g, avgPrice: Math.round((100 * g.value) / g.shares) / 100 })).sort((a, b) => b.value - a.value).slice(0, n);
}
