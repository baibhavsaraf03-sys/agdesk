"use client";

/**
 * The meme-stock screen (MEME): r/wallstreetbets' most-discussed tickers,
 * refreshed hourly by scripts/meme-read.mjs, with whether the price is
 * moving with the talk. `read` is `reads.meme`.
 *
 * Built to inform, not to egg anyone on: the warning sits above the table,
 * the labels separate talk from price, and the AI summary is told to give no
 * recommendations and to say when the headlines show no reason for a move.
 */
import { useMemo, useState } from "react";
import { memeSymbol } from "@/lib/meme.mjs";
import { priceSymbol } from "@/lib/prices.mjs";

const FLAGS = ["Rally", "Buzzing", "Selling off"];
const FLAG_TXT = {
  Rally: "Talk and price rising together",
  Buzzing: "Talk surging, price not following",
  "Selling off": "Talk surging while the price falls"
};

const pct = (v, d = 1) => (v == null ? "n/a" : `${v >= 0 ? "+" : ""}${v.toFixed(d)}%`);
const num = (v) => (v == null ? "n/a" : v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: v >= 1 ? 2 : 4 }));

function mentionChange(r) {
  if (!r.mentions24) return "new to the list";
  const c = Math.round((r.mentions / r.mentions24 - 1) * 100);
  return c === 0 ? "about the same as the day before" : `${c > 0 ? "+" : ""}${c}% on the day before`;
}

export default function MemeScreen({ read, openChart, openAlert, onWatch, watched = [], ask, openRisk }) {
  const [only, setOnly] = useState("");
  const rows = useMemo(() => (read?.rows || []).filter((r) => !only || r.flag === only), [read, only]);
  const counts = useMemo(() => Object.fromEntries(FLAGS.map((f) => [f, (read?.rows || []).filter((r) => r.flag === f).length])), [read]);
  const s = read?.summary;

  return (
    <div className="meme">
      <p className="notice">
        What a forum is excited about is not a reason to buy. Meme rallies are fast in both directions: by the time a
        name tops this list, much of the move has often happened, and the people who bought earliest are the ones
        selling to you. If the terms here are new, read{" "}
        {openRisk ? <button type="button" className="textlink" onClick={openRisk}>Risk</button> : "Risk"} first.
      </p>

      {!read ? (
        <div className="empty">No read yet. The hourly job fills this the next time it runs.</div>
      ) : (
        <>
          {s?.text && (
            <div className="meme-sum">
              <div className="meme-k">In short</div>
              <p>{s.text}</p>
              {s.movers?.length > 0 && (
                <ul>
                  {s.movers.map((m) => (
                    <li key={m.ticker}><b className="mono">{m.ticker}</b> {m.why}</li>
                  ))}
                </ul>
              )}
              <p className="meme-note">
                Written {new Date(s.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} by
                the free AI writer from this table and the day&apos;s headlines; rewritten about three times a day.
              </p>
            </div>
          )}

          <div className="cal-set" role="group" aria-label="Show">
            <span className="ch-k">Show</span>
            <button type="button" className={"ch-seg" + (!only ? " on" : "")} aria-pressed={!only} onClick={() => setOnly("")}>All</button>
            {FLAGS.map((f) => (
              <button key={f} type="button" className={"ch-seg" + (only === f ? " on" : "")} aria-pressed={only === f} title={FLAG_TXT[f]} onClick={() => setOnly(f)}>
                {f} <span className="mono">{counts[f]}</span>
              </button>
            ))}
          </div>

          <div className="meme-table" role="table" aria-label="Most-discussed tickers on r/wallstreetbets">
            <div className="meme-row meme-head" role="row">
              <span role="columnheader">#</span>
              <span role="columnheader">Ticker</span>
              <span role="columnheader">Mentions, 24h</span>
              <span role="columnheader">Price</span>
              <span role="columnheader">Day</span>
              <span role="columnheader">Volume</span>
              <span role="columnheader">Reading</span>
            </div>
            {rows.map((r) => {
              const sym = memeSymbol(r);
              return (
                <div className={"meme-row" + (r.flag ? " f-" + r.flag.replace(" ", "-").toLowerCase() : "")} role="row" key={r.ticker}>
                  <span className="meme-rank mono" role="cell">{r.rank}</span>
                  <span className="meme-tk" role="cell">
                    <b className="mono">{r.ticker}</b>
                    <span className="meme-name">{r.name}</span>
                  </span>
                  <span className="meme-num" role="cell">
                    <span className="mono">{r.mentions.toLocaleString("en-GB")}</span>
                    <span className="meme-sub">{mentionChange(r)}</span>
                  </span>
                  <span className="meme-num mono" role="cell">{num(r.price)}</span>
                  <span className={"meme-num mono " + (r.change == null ? "" : r.change >= 0 ? "up" : "dn")} role="cell">{pct(r.change)}</span>
                  <span className="meme-num" role="cell">
                    <span className="mono">{r.volRatio ? `${r.volRatio.toFixed(1)}x` : "n/a"}</span>
                    <span className="meme-sub">of normal</span>
                  </span>
                  <span className="meme-flag" role="cell">
                    {r.flag ? <span className="meme-badge">{r.flag}</span> : <span className="meme-sub">Nothing unusual</span>}
                    <span className="meme-act">
                      {sym && openChart && <button type="button" className="chip" onClick={() => openChart(sym)}>Chart</button>}
                      {sym && onWatch && !watched.includes(sym) && <button type="button" className="chip" onClick={() => onWatch(sym)}>Watch</button>}
                      {sym && priceSymbol(sym) && openAlert && <button type="button" className="chip" onClick={() => openAlert("price", { symbol: sym })}>Alert</button>}
                      {ask && (
                        <button
                          type="button"
                          className="chip"
                          onClick={() =>
                            ask(
                              `${r.ticker} (${r.name}) is among the most-discussed tickers on r/wallstreetbets: ${r.mentions} mentions in 24 hours against ${r.mentions24} the day before, price ${num(r.price)} (${pct(r.change)} on the day), volume ${r.volRatio ? r.volRatio.toFixed(1) + "x" : "unknown"} its normal level. ` +
                                "Explain in plain words what the company does, what the headlines on this terminal say is driving the attention, and what the risks of buying into a move like this are. If the material shows no reason, say so.",
                              `Why is ${r.ticker} being talked about?`
                            )
                          }
                        >
                          Why?
                        </button>
                      )}
                    </span>
                  </span>
                </div>
              );
            })}
            {!rows.length && <div className="empty">Nothing with that reading in this hour&apos;s list.</div>}
          </div>

          <p className="wl-foot">
            Updated {read.stamp} UK time, every hour. Mentions: ApeWisdom&apos;s count of r/wallstreetbets over the last
            24 hours, against the 24 hours before. Prices: Yahoo Finance, delayed; outside US trading hours the day&apos;s
            move is the last session&apos;s. Volume is against the 20-day average, and is volume so far during a session.
            Rally means mentions up by half or more and the price up 5% or more, or the price up 10% on double the
            usual volume. Common words the counter mistakes for tickers (YOU, DTE, CEO and others) are left out.
          </p>
        </>
      )}
    </div>
  );
}
