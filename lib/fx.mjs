/**
 * Figures for the Currencies screen (FX), all from free official sources and
 * none needing a key:
 *
 *  - Policy rates: BIS central bank policy rate series (daily).
 *  - US 2-year yield: US Treasury daily par yield curve.
 *  - Euro 2-year yield: ECB euro area yield curve, AAA-rated government bonds.
 *  - Positioning: CFTC Traders in Financial Futures, leveraged funds, weekly.
 *
 * Nothing is stored. Each source is fetched at most once every half hour per
 * server instance and the last good answer is kept, so one source failing
 * leaves its section stale rather than blank, and the others unaffected.
 * UK and Japanese 2-year yields are absent because no free source publishes
 * them in a form that can be redistributed.
 */
import { getText, csvRows, firstOf } from "./quotes.mjs";

const AREAS = { US: "USD", XM: "EUR", GB: "GBP", JP: "JPY" };

/** CFTC contract market codes for the futures hedge funds use to hold each currency. */
const CFTC = { EUR: "099741", GBP: "096742", JPY: "097741", USD: "098662" };
const WEEKS = 156; // three years

const isHtml = (text) => /<html|<!doctype/i.test(text.slice(0, 400));

function column(head, name) {
  const i = head.indexOf(name);
  if (i === -1) throw new Error(`no ${name} column (got ${head.slice(0, 6).join(",")})`);
  return i;
}

/** BIS CSV -> { USD: { rate, asof }, ... } */
export function parsePolicyRates(text) {
  if (isHtml(text)) throw new Error("served a web page, not CSV");
  const rows = csvRows(text);
  const head = rows[0] || [];
  const iArea = column(head, "REF_AREA"), iVal = column(head, "OBS_VALUE"), iTime = head.indexOf("TIME_PERIOD");
  const out = {};
  for (const r of rows.slice(1)) {
    const cur = AREAS[r[iArea]];
    const v = parseFloat(r[iVal]);
    const when = iTime === -1 ? "" : r[iTime];
    if (!cur || !isFinite(v)) continue;
    if (!out[cur] || when > out[cur].asof) out[cur] = { rate: v, asof: when };
  }
  if (!Object.keys(out).length) throw new Error("no observations");
  return out;
}

/** Treasury CSV -> { value, asof } for the 2-year par yield. */
export function parseTreasury2y(text) {
  if (isHtml(text)) throw new Error("served a web page, not CSV");
  const rows = csvRows(text);
  const i = column(rows[0] || [], "2 Yr");
  const body = rows.slice(1).filter((r) => isFinite(Date.parse(r[0])) && isFinite(parseFloat(r[i])));
  if (!body.length) throw new Error("no dated rows");
  body.sort((a, b) => Date.parse(b[0]) - Date.parse(a[0]));
  // Dates arrive as MM/DD/YYYY.
  const m = body[0][0].match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return { value: parseFloat(body[0][i]), asof: m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : body[0][0] };
}

/** ECB CSV -> { value, asof } for the latest observation. */
export function parseEcbSeries(text) {
  if (isHtml(text)) throw new Error("served a web page, not CSV");
  const rows = csvRows(text);
  const head = rows[0] || [];
  const iVal = column(head, "OBS_VALUE"), iTime = column(head, "TIME_PERIOD");
  const body = rows.slice(1).filter((r) => isFinite(parseFloat(r[iVal]))).sort((a, b) => (a[iTime] < b[iTime] ? 1 : -1));
  if (!body.length) throw new Error("no observations");
  return { value: parseFloat(body[0][iVal]), asof: body[0][iTime] };
}

/**
 * CFTC rows for one market -> weekly net position of leveraged funds, oldest
 * first, with the latest week ranked against the whole span (0 = most short
 * it has been, 100 = most long).
 */
export function parsePositioning(rows) {
  if (!Array.isArray(rows)) throw new Error("not a list");
  const find = (row, re) => Object.keys(row).find((k) => re.test(k));
  const out = [];
  for (const row of rows) {
    const kDate = find(row, /^report_date_as_yyyy/), kLong = find(row, /^lev_money_positions_long(_all)?$/), kShort = find(row, /^lev_money_positions_short(_all)?$/);
    const long = Number(row[kLong]), short = Number(row[kShort]);
    const date = String(row[kDate] || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isFinite(long) || !isFinite(short)) continue;
    out.push({ report_date: date, net_contracts: long - short, pct_rank: null });
  }
  if (!out.length) throw new Error(`no usable rows (fields: ${Object.keys(rows[0] || {}).slice(0, 6).join(",") || "none"})`);
  out.sort((a, b) => (a.report_date < b.report_date ? -1 : 1));
  const span = out.slice(-WEEKS);
  const last = span[span.length - 1];
  // A rank needs a history to stand against: under a year says little.
  if (span.length >= 52) {
    const below = span.filter((r) => r.net_contracts < last.net_contracts).length;
    last.pct_rank = (below / (span.length - 1)) * 100;
  }
  return span;
}

/* ---- fetchers ---- */

async function policyRates() {
  const key = `D.${Object.keys(AREAS).join("+")}`;
  return parsePolicyRates(await firstOf(
    [
      `https://stats.bis.org/api/v2/data/dataflow/BIS/WS_CBPOL/1.0/${key}?lastNObservations=1&format=csv`,
      `https://stats.bis.org/api/v1/data/WS_CBPOL/${key}/all?lastNObservations=1&format=csv`
    ],
    getText
  ));
}

async function treasury2y() {
  const year = new Date().getUTCFullYear();
  const base = "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv";
  const url = (y) => `${base}/${y}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${y}&page&_format=csv`;
  // The first days of January have no rows for the new year yet.
  return firstOf([url(year), url(year - 1)], async (u) => parseTreasury2y(await getText(u)));
}

async function euro2y() {
  const series = "YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_2Y";
  return firstOf(
    [
      `https://data-api.ecb.europa.eu/service/data/${series}?lastNObservations=1&format=csvdata`,
      `https://sdw-wsrest.ecb.europa.eu/service/data/${series}?lastNObservations=1&format=csvdata`
    ],
    async (u) => parseEcbSeries(await getText(u))
  );
}

async function positioning() {
  const out = {};
  const problems = [];
  await Promise.all(
    Object.entries(CFTC).map(async ([cur, code]) => {
      const q = new URLSearchParams({ cftc_contract_market_code: code, $order: "report_date_as_yyyy_mm_dd DESC", $limit: String(WEEKS) });
      try {
        out[cur] = parsePositioning(JSON.parse(await getText(`https://publicreporting.cftc.gov/resource/gpe5-46if.json?${q}`)));
      } catch (err) {
        problems.push(`${cur}: ${err.message}`);
      }
    })
  );
  if (!Object.keys(out).length) throw new Error(problems.join("; "));
  return out;
}

/* ---- cache ---- */

const TTL = 30 * 60000;
const RETRY = 5 * 60000; // after a failure, try again sooner than a success would
const cache = new Map();

async function cached(name, load) {
  const hit = cache.get(name);
  if (hit && Date.now() < hit.until) return hit;
  try {
    const entry = { value: await load(), until: Date.now() + TTL, status: "ok" };
    cache.set(name, entry);
    return entry;
  } catch (err) {
    const msg = String(err?.message || err).slice(0, 300);
    const entry = { value: hit?.value ?? null, until: Date.now() + RETRY, status: hit?.value ? `stale: ${msg}` : `failed: ${msg}` };
    cache.set(name, entry);
    return entry;
  }
}

/**
 * `{ rates, positioning, status }` in the shape the screen reads:
 * rates.USD = { policy_rate, yield_2y, asof }, positioning.EUR = [{ report_date, net_contracts, pct_rank }].
 * `status` says, per source, "ok" or what went wrong; it is for whoever is
 * checking the route, the screen does not show it.
 */
export async function fetchFx() {
  const [bis, ust, ecb, cot] = await Promise.all([
    cached("bis", policyRates), cached("treasury", treasury2y), cached("ecb", euro2y), cached("cftc", positioning)
  ]);
  const yields = { USD: ust.value, EUR: ecb.value };
  const rates = {};
  for (const cur of Object.values(AREAS)) {
    const p = bis.value?.[cur], y = yields[cur];
    if (!p && !y) continue;
    rates[cur] = { policy_rate: p?.rate ?? null, yield_2y: y?.value ?? null, asof: y?.asof || p?.asof || null };
  }
  return {
    rates,
    positioning: cot.value || {},
    status: { bis: bis.status, treasury: ust.status, ecb: ecb.status, cftc: cot.status }
  };
}
