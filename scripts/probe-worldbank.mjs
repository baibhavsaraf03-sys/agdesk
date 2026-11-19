// Tries the World Bank's dimensional query for the International Debt
// Statistics database (source 6), which the plain country/indicator form no
// longer serves for the creditor series. Run from Actions -> Probe.
const API = "https://api.worldbank.org/v2";
const tries = [
  "sources/6/country/ZMB;GHA/series/DT.DOD.MLAT.CD/counterpart-area/WLD/time/yr2024;yr2025?format=json",
  "sources/6/country/ZMB/series/DT.DOD.MLAT.CD;DT.DOD.BLAT.CD;DT.DOD.PBND.CD/counterpart-area/WLD/time/yr2025?format=json",
  "sources/6/country/ZMB/series/DT.DOD.MLAT.CD/counterpart-area/WLD/time/all?format=json&mrnev=1",
  "sources/6/country/ZMB/series/DT.DOD.BLAT.CD/counterpart-area/CHN/time/yr2025?format=json"
];
for (const t of tries) {
  const r = await fetch(`${API}/${t}`);
  const s = await r.text();
  console.log("\n==", t, r.status);
  console.log(s.slice(0, 1400));
}
