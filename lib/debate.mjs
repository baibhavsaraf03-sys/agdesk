/**
 * Bull vs bear (BVB screen): two AI writers argue for and against a stock
 * using only figures from its SEC filings (XBRL company facts) and its
 * price, and a third judges which case the figures support better. Free
 * writers only (Gemini, then Groq). Every number a writer uses must be one
 * of the supplied figures, or the answer is rejected (checkNumbers).
 *
 * Facts are built here; the writing and storing is scripts/debate-read.mjs.
 * Nothing here is advice: the judge scores arguments, not the stock.
 */
import { sec, yahooDaily } from "./sec.mjs";

export const TICKERS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "XOM", "WMT", "KO", "NFLX", "AMD", "INTC", "DIS", "BA"];

const REVENUE = ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet", "RevenueFromContractWithCustomerIncludingAssessedTax"];
const LINES = {
  netIncome: ["NetIncomeLoss"],
  opCash: ["NetCashProvidedByUsedInOperatingActivities"],
  capex: ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets"],
  rnd: ["ResearchAndDevelopmentExpense"],
  buybacks: ["PaymentsForRepurchaseOfCommonStock"],
  dividends: ["PaymentsOfDividends", "PaymentsOfDividendsCommonStock"],
  debt: ["LongTermDebtNoncurrent", "LongTermDebt"],
  cash: ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"],
  // Large companies hold most of their spare cash as short-term securities;
  // leaving them out makes a cash-rich company look short of cash.
  securities: ["MarketableSecuritiesCurrent", "AvailableForSaleSecuritiesDebtSecuritiesCurrent", "ShortTermInvestments"]
};

let tickerMap = null;
export async function cikFor(ticker) {
  if (!tickerMap) {
    const j = JSON.parse(await sec("https://www.sec.gov/files/company_tickers.json"));
    tickerMap = Object.fromEntries(Object.values(j).map((r) => [r.ticker.toUpperCase(), { cik: String(r.cik_str).padStart(10, "0"), name: r.title }]));
  }
  return tickerMap[ticker.toUpperCase()] || null;
}

const days = (a, b) => (new Date(b) - new Date(a)) / 86400000;

/** Annual values from 10-K filings: [{ end, val }] newest first, one per fiscal year. */
function annual(g, tags) {
  for (const t of tags) {
    const u = g?.[t]?.units?.USD;
    if (!u) continue;
    const byEnd = new Map();
    for (const x of u) {
      if (!/^10-K/.test(x.form || "")) continue;
      // Flows cover about a year; balances (debt, cash) have no start date.
      if (x.start && Math.abs(days(x.start, x.end) - 365) > 20) continue;
      const prev = byEnd.get(x.end);
      if (!prev || x.filed > prev.filed) byEnd.set(x.end, x);
    }
    const rows = [...byEnd.values()].sort((a, b) => b.end.localeCompare(a.end)).map((x) => ({ end: x.end, val: x.val }));
    if (rows.length && new Date(rows[0].end) > new Date(Date.now() - 2 * 365 * 86400000)) return rows;
  }
  return [];
}

/** Latest quarter's revenue against the same quarter a year earlier. */
function quarter(g) {
  for (const t of REVENUE) {
    const u = g?.[t]?.units?.USD;
    if (!u) continue;
    const q = u.filter((x) => x.start && Math.abs(days(x.start, x.end) - 91) < 12);
    const byEnd = new Map();
    for (const x of q) { const p = byEnd.get(x.end); if (!p || x.filed > p.filed) byEnd.set(x.end, x); }
    const rows = [...byEnd.values()].sort((a, b) => b.end.localeCompare(a.end));
    if (!rows.length || new Date(rows[0].end) < new Date(Date.now() - 300 * 86400000)) continue;
    const last = rows[0];
    const ago = rows.find((x) => Math.abs(days(x.end, last.end) - 364) < 15);
    if (ago) return { end: last.end, val: last.val, ago: ago.val };
  }
  return null;
}

const bn = (v) => (v == null ? null : Math.round(v / 1e8) / 10);
const pc = (a, b) => (a == null || b == null || !b ? null : Math.round((1000 * (a - b)) / Math.abs(b)) / 10);

/**
 * Facts for one ticker as plain lines, plus the numbers the writers may use.
 */
export async function buildFacts(ticker) {
  const id = await cikFor(ticker);
  if (!id) throw new Error(`${ticker}: not in SEC's ticker list`);
  const cf = JSON.parse(await sec(`https://data.sec.gov/api/xbrl/companyfacts/CIK${id.cik}.json`));
  const g = cf.facts?.["us-gaap"] || {};
  const rev = annual(g, REVENUE);
  if (rev.length < 2) throw new Error(`${ticker}: too few annual revenue figures`);
  const a = Object.fromEntries(Object.entries(LINES).map(([k, tags]) => [k, annual(g, tags)]));
  const at = (rows, end) => rows.find((r) => r.end === end)?.val ?? null;
  const fy = rev.slice(0, 3).map((r) => r.end);
  const shares = (cf.facts?.dei?.EntityCommonStockSharesOutstanding?.units?.shares || []).sort((x, y) => y.end.localeCompare(x.end))[0]?.val ?? null;
  const q = quarter(g);

  let price = null, yearAgo = null, priceAt = null;
  try {
    const px = await yahooDaily(ticker, "1y");
    price = px.at(-1)?.c ?? null;
    priceAt = px.at(-1)?.t ?? null;
    yearAgo = px[0]?.c ?? null;
  } catch {}

  const f = fy[0];
  const ni = at(a.netIncome, f), ocf = at(a.opCash, f), capex = at(a.capex, f);
  const fcf = ocf != null && capex != null ? ocf - capex : null;
  const mcap = price && shares ? price * shares : null;

  const lines = [];
  const L = (s) => lines.push(s);
  L(`Company: ${id.name} (${ticker}). Figures in US dollars from its SEC filings (10-K and 10-Q), fiscal years ending ${fy.join(", ")}.`);
  for (const end of fy) {
    const parts = [
      `revenue $${bn(at(rev, end))}bn`,
      at(a.netIncome, end) != null && `net income $${bn(at(a.netIncome, end))}bn`,
      at(a.opCash, end) != null && `operating cash flow $${bn(at(a.opCash, end))}bn`,
      at(a.capex, end) != null && `capital spending $${bn(at(a.capex, end))}bn`,
      at(a.rnd, end) != null && `research and development $${bn(at(a.rnd, end))}bn`,
      at(a.buybacks, end) != null && `share buybacks $${bn(at(a.buybacks, end))}bn`,
      at(a.dividends, end) != null && `dividends $${bn(at(a.dividends, end))}bn`
    ].filter(Boolean);
    L(`Fiscal year to ${end}: ${parts.join("; ")}.`);
  }
  const g1 = pc(at(rev, fy[0]), at(rev, fy[1])), g2 = fy[2] ? pc(at(rev, fy[1]), at(rev, fy[2])) : null;
  const grew = (v) => (v < 0 ? `fell ${Math.abs(v)}%` : `grew ${v}%`);
  L(`Revenue ${grew(g1)} in the latest fiscal year${g2 != null ? ` and ${grew(g2)} the year before` : ""}.`);
  if (ni != null) L(`Net margin in the latest fiscal year: ${Math.round((1000 * ni) / at(rev, f)) / 10}%.`);
  if (fcf != null) L(`Free cash flow (operating cash flow minus capital spending) in the latest fiscal year: $${bn(fcf)}bn.`);
  const debt = a.debt[0], cash = a.cash[0];
  const secs = cash ? a.securities.find((r) => r.end === cash.end) : null;
  if (debt || cash) {
    const parts = [
      debt && `long-term debt $${bn(debt.val)}bn`,
      cash && `cash $${bn(cash.val)}bn`,
      secs && `short-term investments $${bn(secs.val)}bn (cash and short-term investments together $${bn(cash.val + secs.val)}bn)`
    ].filter(Boolean);
    L(`Balance sheet at ${(debt || cash).end}: ${parts.join("; ")}.`);
  }
  const qg = q ? pc(q.val, q.ago) : null;
  if (q) L(`Latest quarter (to ${q.end}): revenue $${bn(q.val)}bn, ${qg < 0 ? "down" : "up"} ${Math.abs(qg)}% on the same quarter a year earlier.`);
  const yr = pc(price, yearAgo);
  if (price) L(`Share price $${Math.round(price * 100) / 100} on ${priceAt}${yr != null ? `, ${yr < 0 ? "down" : "up"} ${Math.abs(yr)}% over the past year` : ""} (Yahoo, delayed).`);
  if (mcap) L(`Market value about $${bn(mcap)}bn${ni > 0 ? `, about ${Math.round(mcap / ni)} times latest annual net income` : ""}${fcf > 0 ? `; free cash flow is ${Math.round((1000 * fcf) / mcap) / 10}% of market value` : ""}.`);

  const text = lines.join("\n");
  return { ticker, name: id.name, cik: id.cik, text, allowed: numbersIn(text), fy: fy[0], priceAt };
}

/** Every number in a text, normalised (commas removed). */
export function numbersIn(text) {
  return [...String(text).matchAll(/-?\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, ""))).filter((n) => !Number.isNaN(n));
}

/**
 * Numbers in a writer's answer that are not in the facts. Years, counts up
 * to 10 and anything within 1% of a supplied figure are allowed.
 */
export function checkNumbers(answer, allowed) {
  const bad = [];
  for (const n of numbersIn(answer)) {
    const a = Math.abs(n);
    if (a <= 10 && Number.isInteger(n)) continue;
    if (Number.isInteger(n) && n >= 1990 && n <= 2035) continue;
    if (allowed.some((x) => Math.abs(Math.abs(x) - a) <= Math.max(0.051, Math.abs(x) * 0.01))) continue;
    bad.push(n);
  }
  return [...new Set(bad)];
}
