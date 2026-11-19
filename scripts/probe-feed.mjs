// Prints what the live site serves for the debate and insider screens.
// Actions -> Probe -> feed.
const SITE = process.env.SITE || "https://ledgedesk.com";
const r = await fetch(`${SITE}/api/feed`, { headers: { "cache-control": "no-cache" } });
const j = await r.json();
const reads = j.reads || j;
const d = reads.debate;
console.log("feed bytes", JSON.stringify(j).length, "zones", Object.keys(reads).join(","));
for (const [t, x] of Object.entries(d?.tickers || {})) {
  console.log(`\n== ${t} ${x.judge?.winner} bull ${x.judge?.bull} bear ${x.judge?.bear}`);
  console.log("BULL:", x.bull?.headline, "|", x.bull?.points?.map((p) => p.claim).join(" / "));
  console.log("BEAR:", x.bear?.headline, "|", x.bear?.points?.map((p) => p.claim + " — " + p.evidence).join(" / "));
  console.log("JUDGE:", x.judge?.reason);
}
const ins = reads.insider;
console.log("\ninsider through", ins?.through, "purchases", ins?.purchases, "clusters", ins?.clusters?.length);
for (const c of (ins?.clusters || []).slice(0, 12)) console.log(c.ticker, c.insiders, Math.round(c.value / 1e3) + "k", c.since + "%", c.company);
