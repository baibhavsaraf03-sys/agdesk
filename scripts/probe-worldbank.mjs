// Lists the World Bank debt-stock series (DT.DOD.*) in the International Debt
// Statistics database, with one sample value, so lib/sovdata.mjs can use
// codes that still exist. Run from Actions -> Probe.
const API = "https://api.worldbank.org/v2";
const all = [];
for (let page = 1; page <= 20; page++) {
  const r = await fetch(`${API}/sources/6/indicators?format=json&per_page=100&page=${page}`);
  const j = await r.json();
  all.push(...(j[1] || []));
  if (page >= (j[0]?.pages || 1)) break;
}
const dod = all.filter((i) => /^DT\.DOD\./.test(i.id));
console.log(`source 6: ${all.length} indicators, ${dod.length} DT.DOD`);
for (const i of dod) console.log(i.id, "|", i.name);
for (const code of ["DT.DOD.MLAT.CD", "DT.DOD.BLAT.CD", "DT.DOD.PBND.CD", "DT.DOD.PCBK.CD", "DT.DOD.OFFT.CD", "DT.DOD.PRVT.CD", "DT.DOD.PROP.CD"]) {
  for (const extra of ["&source=6", "&source=6&counterpart_area=WLD", "&source=2"]) {
    const r = await fetch(`${API}/country/ZMB/indicator/${code}?format=json&mrnev=1${extra}`);
    const t = await r.text();
    console.log(code, extra, t.slice(0, 220).replace(/\s+/g, " "));
  }
}
