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
