"use client";

/**
 * Insider buying (INS). Reads `reads.insider`, written by
 * scripts/insider-read.mjs from SEC Form 4 filings: clusters of several
 * officers or directors buying their own company's shares on the open market
 * within two weeks, and the largest single purchases.
 */
const money = (v) => (v == null ? "–" : v >= 1e6 ? `$${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}m` : `$${Math.round(v / 1e3)}k`);
const day = (d) => (d ? new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) : "");
const usd = (v) => (v == null ? "–" : `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`);

export default function Insider({ read, ask, openChart }) {
  if (!read) {
    return <div className="empty">Insider purchases appear after the next daily read of SEC filings.</div>;
  }
  const rules = read.rules || { clusterDays: 14, clusterMin: 3 };
  const cl = read.clusters || [];
  const big = read.biggest || [];

  return (
    <>
      <p className="prose dim">
        Company officers and directors must report to the SEC within two business days when they trade their own company&apos;s shares.
        Most of their selling is routine (taxes, diversification). Buying on the open market with their own money is rarer, and when
        several insiders buy at once it is worth a look. It is not a forecast: plenty of clusters go nowhere.
      </p>

      <div className="sec">
        <div className="trackhead">
          <span className="tt">Cluster buys</span>
          <span className="tc">{rules.clusterMin}+ insiders within {rules.clusterDays} days · filings to {day(read.through)}</span>
        </div>
        {cl.length === 0 ? (
          <div className="empty">No company has {rules.clusterMin} or more insiders buying in the last {rules.clusterDays} days.</div>
        ) : (
          <div className="ins-list">
            {cl.map((c) => (
              <details className="ins-row" key={c.issuerCik}>
                <summary>
                  <span className="ins-name"><b>{c.ticker}</b><span>{c.company}{c.offering ? " · likely a share sale" : ""}</span></span>
                  <span className="ins-num" data-k="Insiders">{c.insiders}<small>{c.officers ? `${c.officers} officer${c.officers > 1 ? "s" : ""}` : "directors"}</small></span>
                  <span className="ins-num" data-k="Bought">{money(c.value)}<small>{day(c.first)}{c.last !== c.first ? `–${day(c.last)}` : ""}</small></span>
                  <span className="ins-num" data-k="Their average">{usd(c.avgPrice)}</span>
                  <span className="ins-num" data-k="Since">
                    {c.since == null ? "–" : `${c.since > 0 ? "+" : c.since < 0 ? "−" : ""}${Math.abs(c.since)}%`}
                    <small>{c.price != null ? `now ${usd(c.price)}` : "no price"}</small>
                  </span>
                </summary>
                {c.offering && (
                  <p className="ins-warn">Every buyer paid {usd(c.avgPrice)} on the same day. That usually means insiders joined a share sale by the company rather than buying on the market.</p>
                )}
                <ul className="ins-people">
                  {c.people.map((p) => (
                    <li key={p.name}><span>{p.name}</span><span className="dim">{p.role}</span><span>{money(p.value)}</span><span className="dim">{day(p.last)}</span></li>
                  ))}
                </ul>
                <div className="btnrow">
                  {openChart && <button className="chip" onClick={() => openChart(c.ticker)}>Chart</button>}
                  <a className="chip" href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${c.issuerCik}&type=4&dateb=&owner=include&count=40`} target="_blank" rel="noopener noreferrer">Filings on SEC</a>
                  <button
                    className="chip"
                    onClick={() => ask(
                      `${c.insiders} insiders at ${c.company} (${c.ticker}) bought ${money(c.value)} of its shares on the open market between ${c.first} and ${c.last}, at an average of ${usd(c.avgPrice)}; the price is now ${usd(c.price)}. Buyers: ${c.people.map((p) => `${p.name} (${p.role}) ${money(p.value)}`).join("; ")}. What could this mean, what are the innocent explanations, and what should a beginner check before reading anything into it? No advice to buy or sell.`,
                      `Why are ${c.ticker} insiders buying?`
                    )}
                  >
                    Ask the analyst
                  </button>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      <div className="sec">
        <div className="trackhead">
          <span className="tt">Largest single purchases</span>
          <span className="tc">last 7 days</span>
        </div>
        {big.length === 0 ? (
          <div className="empty">No insider purchases in the last week.</div>
        ) : (
          <div className="ins-big">
            {big.map((b, i) => (
              <div className="ins-bigrow" key={i}>
                <b>{b.ticker}</b>
                <span className="ins-who">{b.owner}<span className="dim"> · {b.role} · {b.company}</span></span>
                <span className="ins-amt">{money(b.value)}<small>{usd(b.avgPrice)} a share · {day(b.last)}</small></span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="trf-note">
        Source: SEC EDGAR Form 4 filings, read once a day. Counts only open-market purchases (transaction code P) by officers and directors;
        option exercises, grants, gifts, and purchases by 10% owners (usually funds, even when they hold a board seat) are left out. &quot;Since&quot; compares the latest delayed
        Yahoo price with the insiders&apos; average price. Small companies dominate this list because their insiders buy more often.
      </p>
    </>
  );
}
