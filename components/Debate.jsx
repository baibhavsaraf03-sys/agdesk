"use client";

/**
 * Bull vs bear (BVB). Reads `reads.debate`, written by
 * scripts/debate-read.mjs: for each stock, a bull case and a bear case built
 * only from figures in its SEC filings, and a judge's score of which the
 * figures support better. The figures themselves are shown underneath so the
 * reader can check every claim.
 */
import { useState, useEffect } from "react";

const STORE = "agdesk.bvb";
const day = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");

function Side({ label, side, cls }) {
  if (!side) return null;
  return (
    <div className={"bvb-side " + cls}>
      <div className="bvb-side-head">{label}</div>
      <p className="bvb-headline">{side.headline}</p>
      <ol className="bvb-points">
        {side.points?.map((p, i) => (
          <li key={i}><b>{p.claim}</b><span>{p.evidence}</span></li>
        ))}
      </ol>
      <p className="bvb-weak"><span>Its own weak spot:</span> {side.weakness}</p>
    </div>
  );
}

export default function Debate({ read, ask, openChart }) {
  const list = (read?.list || []).filter((t) => read?.tickers?.[t]);
  const [pick, setPick] = useState(null);
  useEffect(() => {
    try { const s = localStorage.getItem(STORE); if (s) setPick(s); } catch {}
  }, []);
  if (!list.length) {
    return <div className="empty">The first debates appear after the next scheduled run.</div>;
  }
  const t = list.includes(pick) ? pick : list[0];
  const d = read.tickers[t];
  const j = d.judge || {};
  const choose = (x) => { setPick(x); try { localStorage.setItem(STORE, x); } catch {} };

  return (
    <>
      <p className="prose dim">
        Two AI writers argue for and against a stock using only the figures in its SEC filings, and a third scores which case those
        figures support better. It scores the arguments, not the stock: a winning bull case is not a reason to buy. Every number is
        checked against the filings before it is published, and the figures are listed below so you can check them yourself.
      </p>

      <div className="btnrow bvb-tickers" role="tablist">
        {list.map((x) => (
          <button key={x} role="tab" aria-selected={x === t} className={"chip" + (x === t ? " on" : "")} onClick={() => choose(x)}>{x}</button>
        ))}
      </div>

      <div className="bvb">
        <div className="bvb-top">
          <div>
            <h3>{d.name}</h3>
            <span className="dim">{t} · written {day(d.at)} · filings to fiscal year {d.fy?.slice(0, 4)}</span>
          </div>
          <div className="bvb-score" aria-label={`Judge: bull ${j.bull} out of 10, bear ${j.bear} out of 10`}>
            <span className={j.winner === "bull" ? "win" : ""}>Bull {j.bull}</span>
            <span className="dim">/</span>
            <span className={j.winner === "bear" ? "win" : ""}>Bear {j.bear}</span>
          </div>
        </div>

        <div className="bvb-judge">
          <b>{j.winner === "draw" ? "A draw." : `The ${j.winner} case is better supported.`}</b> {j.reason}
          {j.watch && <p className="dim">What would settle it: {j.watch}</p>}
        </div>

        <div className="bvb-sides">
          <Side label="Bull case" side={d.bull} cls="bull" />
          <Side label="Bear case" side={d.bear} cls="bear" />
        </div>

        <details className="bvb-facts">
          <summary>The figures both sides were given</summary>
          <pre>{d.facts}</pre>
          <a href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${d.cik}&type=10-K&dateb=&owner=include&count=40`} target="_blank" rel="noopener noreferrer">{d.name} filings on SEC EDGAR</a>
        </details>

        <div className="btnrow">
          {openChart && <button className="chip" onClick={() => openChart(t)}>Chart</button>}
          <button
            className="chip"
            onClick={() => ask(`Here is an AI debate about ${d.name} (${t}) built from its SEC filings.\n\nFIGURES\n${d.facts}\n\nBULL: ${JSON.stringify(d.bull)}\n\nBEAR: ${JSON.stringify(d.bear)}\n\nJUDGE: ${JSON.stringify(j)}\n\nWhat did both sides miss, and which figures would you look at next? No advice to buy or sell.`, `What did the ${t} debate miss?`)}
          >
            Ask the analyst what they missed
          </button>
        </div>
      </div>

      <p className="trf-note">
        Writers: free Gemini or Groq models. Figures: SEC EDGAR company facts (10-K and 10-Q) and a delayed Yahoo price. Each debate is
        rewritten about once a week. AI writing can still misread a figure; the list above is the record.
      </p>
    </>
  );
}
