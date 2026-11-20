/**
 * Track record (TRK screen): how the site's signals did afterwards. Pure
 * functions; the fetching and storing is scripts/scorecard-read.mjs.
 *
 * Every signal is measured from the first close a visitor could have acted
 * on (the day it appeared on the site, or the next trading day), against the
 * S&P 500 (SPY) over the same trading days. Nothing is measured from the
 * insiders' own buying price, which a reader could never have had.
 */
export const HORIZONS = [
  { k: "w1", days: 5, t: "1 week" },
  { k: "m1", days: 21, t: "1 month" },
  { k: "m3", days: 63, t: "3 months" },
  { k: "m6", days: 126, t: "6 months" }
];
export const MIN_SAMPLE = 10;

/** Index of the first close on or after `date` in a [{ t, c }] series. */
export function at(series, date) {
  const i = series.findIndex((p) => p.t >= date);
  return i < 0 ? null : i;
}

/**
 * Returns of one entry over each horizon, and the S&P 500's over the same
 * trading days. Horizons not yet reached are left out.
 */
export function measure(entry, series, spy) {
  const i = at(series, entry.date);
  if (i == null) return {};
  const start = series[i];
  const j0 = at(spy, start.t);
  const out = { entryDate: start.t, entry: start.c };
  for (const h of HORIZONS) {
    const p = series[i + h.days];
    if (!p) continue;
    const j1 = at(spy, p.t);
    if (j0 == null || j1 == null) continue;
    const ret = p.c / start.c - 1;
    const spyRet = spy[j1].c / spy[j0].c - 1;
    out[h.k] = { ret: round(ret), spy: round(spyRet), ex: round(ret - spyRet) };
  }
  return out;
}

const round = (v) => Math.round(v * 10000) / 10000;

/** n, average return, average excess over the S&P 500, share that beat it, median excess. */
export function summarise(entries) {
  const out = {};
  for (const h of HORIZONS) {
    const xs = entries.map((e) => e.r?.[h.k]).filter(Boolean);
    if (!xs.length) { out[h.k] = { n: 0 }; continue; }
    const ex = xs.map((x) => x.ex).sort((a, b) => a - b);
    out[h.k] = {
      n: xs.length,
      ret: round(xs.reduce((s, x) => s + x.ret, 0) / xs.length),
      ex: round(ex.reduce((s, x) => s + x, 0) / ex.length),
      beat: round(xs.filter((x) => x.ex > 0).length / xs.length),
      median: round(ex[Math.floor(ex.length / 2)])
    };
  }
  return out;
}

/**
 * The mood dial looked back: for every trading day, the mood the dial would
 * have shown (lib/pulse.mjs bands off the VIX close and the S&P 500's day),
 * and what the S&P 500 did over each horizon afterwards. `bands` is
 * MOOD_BANDS; `moodFor` is the dial's own function.
 */
export function moodHistory(vix, spx, moodFor) {
  const byDate = new Map(vix.map((p) => [p.t, p.c]));
  const rows = [];
  for (let i = 1; i < spx.length; i++) {
    const v = byDate.get(spx[i].t);
    if (v == null) continue;
    const change = 100 * (spx[i].c / spx[i - 1].c - 1);
    const mood = moodFor(v, change);
    const r = {};
    for (const h of HORIZONS) {
      const p = spx[i + h.days];
      if (p) r[h.k] = { ret: round(p.c / spx[i].c - 1), spy: 0, ex: round(p.c / spx[i].c - 1) };
    }
    rows.push({ date: spx[i].t, mood, r });
  }
  return rows;
}
