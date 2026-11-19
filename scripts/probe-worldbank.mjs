// Checks what the World Bank's International Debt Statistics (source 6)
// offers for a country search: its country list, a ten-year series for one
// country, and the creditor-country breakdown codes. Actions -> Probe.
const API = "https://api.worldbank.org/v2";
const get = async (p) => { const r = await fetch(`${API}/${p}`); const t = await r.text(); return t.startsWith("<") ? t.slice(0, 300) : JSON.parse(t); };
const c = await get("sources/6/country?format=json&per_page=400");
const list = c?.source?.[0]?.concept?.[0]?.variable || c?.source?.concept?.[0]?.variable || c;
console.log("countries:", Array.isArray(list) ? list.length : JSON.stringify(c).slice(0, 600));
if (Array.isArray(list)) console.log(list.slice(0, 12).map((x) => x.id + ":" + x.value).join(", "));
const ca = await get("sources/6/counterpart-area?format=json&per_page=400");
const cl = ca?.source?.[0]?.concept?.[0]?.variable || ca?.source?.concept?.[0]?.variable || ca;
console.log("counterparts:", Array.isArray(cl) ? cl.length : JSON.stringify(ca).slice(0, 400));
if (Array.isArray(cl)) console.log(cl.filter((x) => /china|world|japan|india|france|united states|saudi|bond|multilateral|imf|ida|ibrd/i.test(x.value)).map((x) => x.id + ":" + x.value).join(" | "));
const n = await get("sources/6/country/NPL/series/DT.DOD.DECT.CD;DT.DOD.MLAT.CD;DT.DOD.BLAT.CD;DT.DOD.DECT.GN.ZS/counterpart-area/WLD/time/yr2016;yr2020;yr2025?format=json&per_page=100");
for (const row of n?.source?.data || []) console.log(row.variable.map((v) => v.id).join(" "), row.value);
