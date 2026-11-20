"use client";

/**
 * Track record (TRK). Reads `reads.scorecard`, written daily by
 * scripts/scorecard-read.mjs: how the site's signals did afterwards against
 * the S&P 500, and the mood dial looked back over five years. Results with
 * fewer than MIN_SAMPLE cases are shown as too early, not as numbers.
 */
import { MIN_SAMPLE } from "@/lib/scorecard.mjs";

const pct = (v, signed = true) => (v == null ? "–" : `${signed && v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(100 * v).toFixed(1)}%`);
const day = (d) => (d ? new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "");

/** One row of results across the horizons; `mode` "vs" = against the S&P 500, "abs" = S&P 500 itself. */
function Row({ label, s, horizons, mode = "vs", sub }) {
  return (
    <div className="trk-row">
      <span className="trk-label"><b>{label}</b>{sub && <span>{sub}</span>}</span>
      {horizons.map((h) => {
        const x = s?.[h.k] || { n: 0 };
        if (!x.n) return <span key={h.k} className="trk-cell none" data-k={h.t}>not yet</span>;
        if (x.n < MIN_SAMPLE) return <span key={h.k} className="trk-cell none" data-k={h.t}>too early ({x.n})</span>;
        return (
          <span key={h.k} className="trk-cell" data-k={h.t}>
            {mode === "vs" ? pct(x.ex) : pct(x.ret)}
            <small>{mode === "vs" ? `beat the S&P 500 ${Math.round(100 * x.beat)}%` : `up ${Math.round(100 * x.beat)}% of the time`} · {x.n}</small>
          </span>
        );
      })}
    </div>
  );
}

function Head({ horizons, first }) {
  return (
    <div className="trk-row trk-head">
      <span>{first}</span>
      {horizons.map((h) => <span key={h.k}>{h.t}</span>)}
    </div>
  );
}

export default function Track({ read }) {
  if (!read) return <div className="empty">The track record appears after its first daily run.</div>;
  const H = read.horizons || [];
  const ins = read.insider || {}, meme = read.meme || {}, deb = read.debate || {}, mood = read.mood;

  return (
    <>
      <p className="prose dim">
        Anything on this site that flags a stock or a mood is checked here afterwards. Each signal is measured from the first closing price a
        reader could have acted on, and compared with the S&amp;P 500 over the same days. A result needs at least {MIN_SAMPLE} cases before a
        number is shown. Past results say nothing certain about the future, and none of this is advice.
      </p>

      <div className="sec">
        <div className="trackhead">
          <span className="tt">Insider cluster buys</span>
          <span className="tc">{ins.count || 0} signals since {day(ins.first)}</span>
        </div>
        <div className="trk-table">
          <Head horizons={H} first="Average return above or below the S&P 500" />
          <Row label="Clusters" sub="3+ insiders buying within two weeks" s={ins.clusters} horizons={H} />
          <Row label="Likely share sales" sub="everyone paid one price on one day" s={ins.sales} horizons={H} />
        </div>
      </div>

      <div className="sec">
        <div className="trackhead">
          <span className="tt">Bull vs bear verdicts</span>
          <span className="tc">{deb.count || 0} verdicts since {day(deb.first)}</span>
        </div>
        <div className="trk-table">
          <Head horizons={H} first="Average return above or below the S&P 500" />
          <Row label="Bull case won" s={deb.bull} horizons={H} />
          <Row label="Bear case won" s={deb.bear} horizons={H} />
        </div>
        <p className="trf-note">If the judge&apos;s verdicts meant anything for the share price, stocks where the bull won would beat those where the bear won. The judge scores arguments, not stocks, so a gap of zero is a perfectly honest result.</p>
      </div>

      <div className="sec">
        <div className="trackhead">
          <span className="tt">Meme stock labels</span>
          <span className="tc">{meme.count || 0} labels since {day(meme.first)}</span>
        </div>
        <div className="trk-table">
          <Head horizons={H} first="Average return above or below the S&P 500" />
          <Row label="Rally" s={meme.Rally} horizons={H} />
          <Row label="Buzzing" s={meme.Buzzing} horizons={H} />
          <Row label="Selling off" s={meme["Selling off"]} horizons={H} />
        </div>
      </div>

      {mood && (
        <div className="sec">
          <div className="trackhead">
            <span className="tt">The mood dial, looked back</span>
            <span className="tc">every trading day since {day(mood.since)}</span>
          </div>
          <div className="trk-table">
            <Head horizons={H} first="What the S&P 500 did next" />
            <Row label="Any day" sub="the baseline" s={mood.base} horizons={H} mode="abs" />
            {mood.bands.map((b) => (
              <Row key={b.mood} label={b.mood} sub={`${b.days} days`} s={b.s} horizons={H} mode="abs" />
            ))}
          </div>
          <p className="trf-note">
            The dial describes the mood; it does not forecast. Days of the same mood come in runs, so 90 fearful days may be only a handful of
            separate scares, and a few big rebounds can carry the average. Treat any band with few episodes as an anecdote.
          </p>
        </div>
      )}

      {ins.recent?.length > 0 && (
        <div className="sec">
          <div className="trackhead">
            <span className="tt">Latest insider signals</span>
          </div>
          <div className="trk-recent">
            {ins.recent.map((e) => (
              <div key={e.ticker + e.date} className="trk-rec">
                <b>{e.ticker}</b>
                <span className="dim">{e.note} · from {day(e.r?.entryDate || e.date)}</span>
                <span>{e.r?.w1 ? `${pct(e.r.w1.ex)} vs S&P after a week` : "under a week old"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="trf-note">
        Prices: Yahoo daily closes (delayed), S&amp;P 500 as SPY. Updated once a day. Not shown here: screens that describe rather than
        flag anything (calendar, charts, currencies, sovereign debt, traffic at the chokepoints), which are judged by whether people use them.
      </p>
    </>
  );
}
