// Can GitHub's runners read SEC EDGAR, and how big is a day of Form 4s?
// Actions -> Probe -> sec. EDGAR asks for a User-Agent naming the site.
const UA = { "user-agent": process.env.SEC_USER_AGENT || "LedgeDesk research (+https://ledgedesk.com)", accept: "*/*" };
const get = async (u) => { const t0 = Date.now(); const r = await fetch(u, { headers: UA }); const t = await r.text(); return { s: r.status, t, ms: Date.now() - t0 }; };

// 1. Daily form index: find the latest available weekday.
let idx, day;
for (let back = 1; back < 8 && !idx; back++) {
  const d = new Date(Date.now() - back * 86400000);
  if ([0, 6].includes(d.getUTCDay())) continue;
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, "");
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  const r = await get(`https://www.sec.gov/Archives/edgar/daily-index/${d.getUTCFullYear()}/QTR${q}/form.${ymd}.idx`);
  console.log("index", ymd, r.s, r.ms + "ms", r.t.length + " bytes");
  if (r.s === 200) { idx = r.t; day = ymd; }
}
const f4 = (idx || "").split("\n").filter((l) => /^4\s+/.test(l));
console.log(`Form 4 lines on ${day}: ${f4.length}`);
console.log(f4.slice(0, 3).join("\n"));

// 2. Fetch 40 of them, time it, count open-market purchases (code P).
const files = f4.map((l) => l.trim().split(/\s{2,}/).pop()).filter(Boolean).slice(0, 40);
let buys = 0, t0 = Date.now(), sample = null;
for (const f of files) {
  const r = await get(`https://www.sec.gov/Archives/${f}`);
  const xml = r.t.match(/<ownershipDocument>[\s\S]*<\/ownershipDocument>/)?.[0] || "";
  const codes = [...xml.matchAll(/<transactionCode>([A-Z])<\/transactionCode>/g)].map((m) => m[1]);
  if (codes.includes("P")) { buys++; sample ||= xml.slice(0, 1500); }
  await new Promise((r) => setTimeout(r, 120));
}
console.log(`fetched ${files.length} in ${Date.now() - t0}ms; with an open-market purchase: ${buys}`);
if (sample) console.log(sample);

// 3. Company facts (XBRL) for Apple, and the ticker map.
const cf = await get("https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json");
console.log("companyfacts AAPL", cf.s, cf.ms + "ms", cf.t.length + " bytes");
try {
  const j = JSON.parse(cf.t);
  const g = j.facts["us-gaap"];
  for (const k of ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "NetIncomeLoss", "NetCashProvidedByUsedInOperatingActivities", "LongTermDebt", "CashAndCashEquivalentsAtCarryingValue"]) {
    const u = g[k]?.units?.USD || [];
    const fy = u.filter((x) => x.form === "10-K" && x.fp === "FY").slice(-2);
    console.log(k, fy.map((x) => `${x.end}:${(x.val / 1e9).toFixed(1)}bn`).join(" "));
  }
} catch (e) { console.log("parse", e.message, cf.t.slice(0, 200)); }
const tk = await get("https://www.sec.gov/files/company_tickers.json");
console.log("tickers map", tk.s, tk.t.length + " bytes");
const sub = await get("https://data.sec.gov/submissions/CIK0000320193.json");
try { const j = JSON.parse(sub.t); const r = j.filings.recent; const i = r.form.findIndex((f) => f === "10-K"); console.log("latest 10-K", r.filingDate[i], r.primaryDocument[i], r.accessionNumber[i]); } catch (e) { console.log("submissions", sub.s, sub.t.slice(0, 200)); }

// Which balance-sheet tags do NVDA and GOOGL use for short-term investments and capital spending?
for (const cik of ["0001045810", "0001652044"]) {
  const j = JSON.parse((await get(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`)).t);
  const g = j.facts["us-gaap"];
  const keys = Object.keys(g).filter((k) => /(Marketable|ShortTermInvest|AvailableForSale.*Current|PaymentsToAcquireProperty|PaymentsToAcquireProductive)/.test(k));
  console.log("\n" + j.entityName);
  for (const k of keys) {
    const u = (g[k].units.USD || []).filter((x) => /^10-K/.test(x.form)).sort((a, b) => b.end.localeCompare(a.end));
    if (u[0]) console.log(" ", k, u[0].end, (u[0].val / 1e9).toFixed(1));
  }
}
