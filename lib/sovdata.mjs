/**
 * Who each restructuring country owes, from the World Bank's International
 * Debt Statistics (served through the World Development Indicators API,
 * free, no key). Annual figures, published each December for the year
 * before last, so this is a picture of the creditor mix, not a live feed.
 *
 * Public and publicly guaranteed debt by creditor, plus IMF credit, all in
 * current US dollars. "Other" is everything in total external debt stocks
 * not covered by those lines: private debt without a government guarantee
 * and short-term debt.
 */
const API = "https://api.worldbank.org/v2";

export const SOV_SERIES = {
  total: "DT.DOD.DECT.CD",
  imf: "DT.DOD.DIMF.CD",
  multilateral: "DT.DOD.MLAT.CD",
  bilateral: "DT.DOD.BLAT.CD",
  bonds: "DT.DOD.PBND.CD",
  banks: "DT.DOD.PCBK.CD",
  service: "DT.TDS.DECT.EX.ZS"
};

let cache = null;

// The creditor lines (MLAT, BLAT, PBND, PCBK) were moved out of the World
// Development Indicators into the International Debt Statistics database
// (source 6); ask that first and fall back to the default database.
async function get(isos, code, source) {
  const url = `${API}/country/${isos.join(";")}/indicator/${code}?format=json&mrnev=1&per_page=500${source ? `&source=${source}` : ""}`;
  const r = await fetch(url, { headers: { "user-agent": "ledgedesk.com" }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`World Bank ${code}: HTTP ${r.status}`);
  const j = await r.json();
  if (!Array.isArray(j) || !Array.isArray(j[1])) throw new Error(`World Bank ${code}: ${JSON.stringify(j?.[0]?.message || j).slice(0, 160)}`);
  return j;
}

async function series(isos, code) {
  let j;
  try { j = await get(isos, code, 6); } catch (e6) {
    try { j = await get(isos, code); } catch { throw e6; }
  }
  const out = {};
  for (const row of j[1]) {
    const iso = row.countryiso3code;
    if (iso && row.value != null) out[iso] = { v: row.value, y: Number(row.date) };
  }
  return out;
}

/** { [iso]: { year, total, imf, multilateral, bilateral, bonds, banks, other, service } } */
export async function creditorMix(isos) {
  if (cache && Date.now() - cache.at < 12 * 3600000) return cache.data;
  const status = {};
  const got = {};
  await Promise.all(
    Object.entries(SOV_SERIES).map(async ([k, code]) => {
      try {
        got[k] = await series(isos, code);
        status[k] = "ok";
      } catch (e) {
        status[k] = String(e.message || e).slice(0, 200);
      }
    })
  );
  const countries = {};
  for (const iso of isos) {
    const pick = (k) => got[k]?.[iso]?.v ?? null;
    const total = pick("total");
    if (total == null) continue;
    const parts = { imf: pick("imf"), multilateral: pick("multilateral"), bilateral: pick("bilateral"), bonds: pick("bonds"), banks: pick("banks") };
    const known = Object.values(parts).reduce((s, v) => s + (v || 0), 0);
    countries[iso] = {
      year: got.total[iso].y,
      total,
      ...parts,
      other: Math.max(0, total - known),
      service: pick("service")
    };
  }
  const data = { countries, status, source: "World Bank, International Debt Statistics" };
  if (Object.keys(countries).length) cache = { at: Date.now(), data };
  return data;
}
