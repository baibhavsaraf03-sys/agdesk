"use client";

/**
 * Ships and aircraft at the shipping chokepoints, on the GEO screen.
 * `read` is `reads.traffic`, written hourly by scripts/traffic-read.mjs.
 *
 * Two kinds of ship figure, kept apart on purpose:
 * - Ships a day: IMF PortWatch, from satellite AIS, every chokepoint, a few
 *   days behind; compared with the same week a year earlier.
 * - Ships now: AISStream's volunteer receivers, live, only where they reach;
 *   elsewhere the cell says there is no live receiver rather than showing 0.
 * Aircraft now: adsb.lol, compared with the place's own usual level.
 */
import { useMemo } from "react";
import { CHOKES, usual, versus, covered } from "@/lib/traffic.mjs";

const n = (v) => (v == null ? "–" : v.toLocaleString("en-GB", { maximumFractionDigits: v < 10 ? 1 : 0 }));
const shortDate = (d) => (d ? new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) : "");

function Change({ now, base, label }) {
  const d = versus(now, base);
  if (d == null) return null;
  const cls = d <= -30 ? "trf-vs low" : "trf-vs";
  const txt = Math.abs(d) < 10 ? `near ${label}` : `${d > 0 ? "+" : "−"}${Math.abs(d)}% on ${label}`;
  return <span className={cls}>{txt}</span>;
}

export default function Traffic({ read }) {
  const base = useMemo(() => usual(read?.history || []), [read]);

  if (!read) {
    return <div className="empty">Ship and aircraft counts appear here after the next hourly read.</div>;
  }

  const at = read.at ? new Date(read.at) : null;
  const sat = read.transits?.at || {};
  const week = Object.values(sat).find((t) => t?.date);

  return (
    <div className="trf">
      <div className="trf-table">
        <div className="trf-row trf-head">
          <span>Chokepoint</span>
          <span>Ships a day</span>
          <span>Tankers a day</span>
          <span>Ships now</span>
          <span>Stopped now</span>
          <span>Aircraft now</span>
        </div>
        {CHOKES.map((c) => {
          const r = read.now?.[c.id] || {};
          const t = sat[c.id];
          const sea = covered(c, read.history || []);
          return (
            <div className="trf-row" key={c.id}>
              <span className="trf-name">
                <b>{c.name}</b>
                <span className="trf-sub">{c.why}</span>
              </span>
              <span className="trf-num" data-k="Ships a day">
                {n(t?.avg7)}
                <Change now={t?.avg7} base={t?.yearAgo7} label="a year ago" />
              </span>
              <span className="trf-num" data-k="Tankers a day">
                {n(t?.avg7Tankers)}
                <Change now={t?.avg7Tankers} base={t?.yearAgo7Tankers} label="a year ago" />
              </span>
              {sea ? (
                <>
                  <span className="trf-num" data-k="Ships now">
                    {n(r.ships)}
                    <Change now={r.ships} base={base[c.id]?.ships} label="usual" />
                  </span>
                  <span className="trf-num" data-k="Stopped now">{n(r.stopped)}</span>
                </>
              ) : (
                <span className="trf-gap" data-k="Ships now">No live receiver here</span>
              )}
              <span className="trf-num" data-k="Aircraft now">
                {n(r.planes)}
                <Change now={r.planes} base={base[c.id]?.planes} label="usual" />
              </span>
            </div>
          );
        })}
      </div>
      <p className="trf-note">
        Ships and tankers a day: average daily crossings for the seven days to {week ? shortDate(week.date) : "the latest settled day"}, compared with
        the same week a year earlier, from IMF PortWatch (satellite ship tracking via the UN Global Platform, published a few days behind; each
        ship counted once per crossing). Now: {at ? `read at ${at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "the latest hourly read"};
        ships seen in a {read.listen || 6}-minute window by AISStream.io&apos;s volunteer receivers, which reach Europe, North America and Singapore but
        not the Gulf or Red Sea; stopped means under one knot, usually anchored or waiting. Aircraft are airborne within {read.radius || 150} nautical
        miles, from adsb.lol (open data, ODbL). This measures traffic, not intent.
      </p>
    </div>
  );
}
