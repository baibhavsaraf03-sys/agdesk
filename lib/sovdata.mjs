/**
 * Who each restructuring country owes, from the World Bank's International
 * Debt Statistics (free, no key). Annual figures, published each December
 * for the year before, so this is a picture of the creditor mix, not a feed.
 *
 * The creditor lines live only in the IDS database (source 6), which answers
 * the dimensional form sources/6/country/../series/../counterpart-area/WLD/
 * time/.. (the plain country/indicator form says "not found" for them; checked
 * 19 Nov 2026 with Actions -> Probe). Debt service as a share of exports
 * still comes from the World Development Indicators.
 *
 * Public and publicly guaranteed debt by creditor plus IMF credit, current
 * US dollars. "Other" is the rest of total external debt: private debt
 * without a government guarantee, and short-term debt.
 */
const API = "https://api.worldbank.org/v2";

export const SOV_SERIES = {
  total: "DT.DOD.DECT.CD",
  imf: "DT.DOD.DIMF.CD",
  multilateral: "DT.DOD.MLAT.CD",
  bilateral: "DT.DOD.BLAT.CD",
  bonds: "DT.DOD.PBND.CD",
  banks: "DT.DOD.PCBK.CD",
  otherPrivate: "DT.DOD.PROP.CD"
};
const SERVICE = "DT.TDS.DECT.EX.ZS";

let cache = null;

async function json(url) {
  const r = await fetch(url, { headers: { "user-agent": "ledgedesk.com" }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const t = await r.text();
  if (t.startsWith("<")) throw new Error(t.match(/>([^<]{5,})</)?.[1] || "World Bank error");
  return JSON.parse(t);
}

/** { [iso]: { [year]: value } } for every series, from IDS. */
async function ids(isos, years) {
  const codes = Object.values(SOV_SERIES).join(";");
  const url = `${API}/sources/6/country/${isos.join(";")}/series/${codes}/counterpart-area/WLD/time/${years.map((y) => "yr" + y).join(";")}?format=json&per_page=2000`;
  const j = await json(url);
  const out = {};
  for (const row of j?.source?.data || []) {
    if (row.value == null) continue;
    const v = Object.fromEntries((row.variable || []).map((x) => [x.concept, x.id]));
    const iso = v.Country, code = v.Series, year = Number(String(v.Time || "").replace(/\D/g, ""));
    ((out[iso] ||= {})[code] ||= {})[year] = row.value;
  }
  return out;
}

async function service(isos) {
  const j = await json(`${API}/country/${isos.join(";")}/indicator/${SERVICE}?format=json&mrnev=1&per_page=500`);
  const out = {};
  for (const row of Array.isArray(j?.[1]) ? j[1] : []) if (row.value != null) out[row.countryiso3code] = { v: row.value, y: Number(row.date) };
  return out;
}

/** { countries: { [iso]: { year, total, imf, multilateral, bilateral, bonds, banks, other, service } }, status } */
export async function creditorMix(isos) {
  if (cache && Date.now() - cache.at < 12 * 3600000) return cache.data;
  const status = {};
  const now = new Date().getUTCFullYear();
  const years = [now - 3, now - 2, now - 1];
  let stock = {}, svc = {};
  await Promise.all([
    ids(isos, years).then((d) => { stock = d; status.ids = "ok"; }).catch((e) => { status.ids = String(e.message || e).slice(0, 200); }),
    service(isos).then((d) => { svc = d; status.service = "ok"; }).catch((e) => { status.service = String(e.message || e).slice(0, 200); })
  ]);
  const countries = {};
  for (const iso of isos) {
    const s = stock[iso];
    const totals = s?.[SOV_SERIES.total];
    if (!totals) continue;
    const year = Math.max(...Object.keys(totals).map(Number));
    const at = (k) => s[SOV_SERIES[k]]?.[year] ?? null;
    const parts = {
      imf: at("imf"),
      multilateral: at("multilateral"),
      bilateral: at("bilateral"),
      bonds: at("bonds"),
      banks: (at("banks") ?? 0) + (at("otherPrivate") ?? 0) || null
    };
    const total = totals[year];
    const known = Object.values(parts).reduce((a, v) => a + (v || 0), 0);
    countries[iso] = { year, total, ...parts, other: Math.max(0, total - known), service: svc[iso]?.v ?? null };
  }
  const data = { countries, status, source: "World Bank, International Debt Statistics" };
  if (Object.keys(countries).length && status.ids === "ok") cache = { at: Date.now(), data };
  return data;
}

/* ------------------------------------------------------------------ */
/* Country lookup: any of the ~134 countries in IDS                    */
/* ------------------------------------------------------------------ */

let listCache = null;
const detailCache = new Map();

/** [{ iso, name }] of every country the International Debt Statistics cover. */
export async function countryList() {
  if (listCache && Date.now() - listCache.at < 24 * 3600000) return listCache.data;
  const j = await json(`${API}/sources/6/country?format=json&per_page=400`);
  const vars = j?.source?.[0]?.concept?.[0]?.variable || j?.source?.concept?.[0]?.variable || [];
  const data = vars
    .filter((v) => /^[A-Z]{3}$/.test(v.id))
    .map((v) => ({ iso: v.id, name: String(v.value).trim() }))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (data.length) listCache = { at: Date.now(), data };
  return data;
}

const HISTORY = {
  ...SOV_SERIES,
  gni: "DT.DOD.DECT.GN.ZS"
};
// Counterpart rows that are totals or groups, not a single lender.
// Exact group names only: "World Bank-IDA" must not be caught by "World".
const GROUP = /^(world|all|total|other|unspecified|multilateral|bilateral|official|private)$|creditors/i;

/**
 * One country: ten years of debt by creditor type, debt as % of GNI and
 * debt service as % of exports, plus its largest single lenders in the
 * latest year (public and publicly guaranteed debt by counterpart).
 */
export async function countryDetail(iso) {
  const hit = detailCache.get(iso);
  if (hit && Date.now() - hit.at < 12 * 3600000) return hit.data;
  const now = new Date().getUTCFullYear();
  const years = Array.from({ length: 11 }, (_, i) => now - 11 + i);
  const status = {};

  const hist = {};
  try {
    const j = await json(`${API}/sources/6/country/${iso}/series/${Object.values(HISTORY).join(";")}/counterpart-area/WLD/time/${years.map((y) => "yr" + y).join(";")}?format=json&per_page=2000`);
    for (const row of j?.source?.data || []) {
      if (row.value == null) continue;
      const v = Object.fromEntries((row.variable || []).map((x) => [x.concept, x.id]));
      const key = Object.keys(HISTORY).find((k) => HISTORY[k] === v.Series);
      const y = Number(String(v.Time || "").replace(/\D/g, ""));
      if (key && y) (hist[y] ||= {})[key] = row.value;
    }
    status.history = "ok";
  } catch (e) {
    status.history = String(e.message || e).slice(0, 200);
  }

  const svc = {};
  try {
    const j = await json(`${API}/country/${iso}/indicator/${SERVICE}?format=json&per_page=40&date=${years[0]}:${years.at(-1)}`);
    for (const row of Array.isArray(j?.[1]) ? j[1] : []) if (row.value != null) svc[Number(row.date)] = row.value;
    status.service = "ok";
  } catch (e) {
    status.service = String(e.message || e).slice(0, 200);
  }

  const rows = Object.keys(hist).map(Number).sort((a, b) => a - b).map((y) => {
    const h = hist[y];
    const banks = (h.banks ?? 0) + (h.otherPrivate ?? 0) || null;
    const parts = { imf: h.imf ?? null, multilateral: h.multilateral ?? null, bilateral: h.bilateral ?? null, bonds: h.bonds ?? null, banks };
    const known = Object.values(parts).reduce((a, v) => a + (v || 0), 0);
    return { year: y, total: h.total ?? null, ...parts, other: h.total != null ? Math.max(0, h.total - known) : null, gni: h.gni ?? null, service: svc[y] ?? null };
  }).filter((r) => r.total != null);

  let lenders = [];
  const latest = rows.at(-1)?.year;
  if (latest) {
    try {
      const j = await json(`${API}/sources/6/country/${iso}/series/DT.DOD.DPPG.CD/counterpart-area/all/time/yr${latest}?format=json&per_page=400`);
      lenders = (j?.source?.data || [])
        .map((row) => {
          const cp = (row.variable || []).find((x) => x.concept === "Counterpart-Area") || {};
          return { id: cp.id, name: String(cp.value || "").trim(), value: row.value };
        })
        .filter((l) => l.value > 0 && l.id !== "WLD" && !GROUP.test(l.name))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
      status.lenders = "ok";
    } catch (e) {
      status.lenders = String(e.message || e).slice(0, 200);
    }
  }

  const name = (await countryList().catch(() => [])).find((c) => c.iso === iso)?.name || iso;
  const data = { iso, name, rows, lenders, lendersYear: latest || null, status, source: "World Bank, International Debt Statistics" };
  if (rows.length) detailCache.set(iso, { at: Date.now(), data });
  return data;
}
