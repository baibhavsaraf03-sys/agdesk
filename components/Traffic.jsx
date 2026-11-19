"use client";

/**
 * Ships and aircraft at the shipping chokepoints, on the GEO screen.
 * `read` is `reads.traffic`, written hourly by scripts/traffic-read.mjs.
 * `only` limits the table to the chokepoints of one flashpoint (lib/geo.js id).
 *
 * Counts are what volunteer receivers saw in a few minutes; they mean most
 * against the same place's usual level (the median of two weeks of hourly
 * reads), shown once a day of history exists.
 */
import { useMemo } from "react";
import { CHOKES, usual, versus, covered } from "@/lib/traffic.mjs";

const n = (v) => (v == null ? "–" : v.toLocaleString("en-GB"));

function Vs({ now, base }) {
  const d = versus(now, base);
  if (d == null) return null;
  const cls = d <= -30 ? "trf-vs low" : "trf-vs";
  const txt = Math.abs(d) < 10 ? "near usual" : `${d > 0 ? "+" : "−"}${Math.abs(d)}% on usual`;
  return <span className={cls}>{txt}</span>;
}

export default function Traffic({ read, only }) {
  const base = useMemo(() => usual(read?.history || []), [read]);
  const rows = CHOKES.filter((c) => !only || c.geo === only);
  if (!rows.length) return null;
  const at = read?.at ? new Date(read.at) : null;
  const shipsOff = read && read.status?.ships && read.status.ships !== "ok";

  if (!read) {
    return only ? null : (
      <div className="empty">Live ship and aircraft counts appear here after the next hourly read.</div>
    );
  }

  return (
    <div className="trf">
      <div className="trf-table">
        <div className="trf-row trf-head">
          <span>Chokepoint</span>
          <span>Ships</span>
          <span>Tankers</span>
          <span>Cargo</span>
          <span>Stopped</span>
          <span>Aircraft</span>
        </div>
        {rows.map((c) => {
          const r = read.now?.[c.id] || {};
          const sea = covered(c, read.history || []);
          return (
            <div className="trf-row" key={c.id}>
              <span className="trf-name">
                <b>{c.name}</b>
                <span className="trf-sub">{c.why}</span>
              </span>
              {sea ? (
                <>
                  <span className="trf-num" data-k="Ships">{n(r.ships)}<Vs now={r.ships} base={base[c.id]?.ships} /></span>
                  <span className="trf-num" data-k="Tankers">{n(r.tankers)}<Vs now={r.tankers} base={base[c.id]?.tankers} /></span>
                  <span className="trf-num" data-k="Cargo">{n(r.cargo)}</span>
                  <span className="trf-num" data-k="Stopped">{n(r.stopped)}</span>
                </>
              ) : (
                <span className="trf-gap">No free ship data here: the volunteer receivers do not reach this strait.</span>
              )}
              <span className="trf-num" data-k="Aircraft">{n(r.planes)}<Vs now={r.planes} base={base[c.id]?.planes} /></span>
            </div>
          );
        })}
      </div>
      <p className="trf-note">
        {at && `Read at ${at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. `}
        Ships seen by volunteer receivers in a {read.listen || 6}-minute window, from AISStream.io, whose free coverage is strongest around Europe, North America and Singapore and missing in the Gulf; tankers and cargo
        are the ships whose type was broadcast in that window; stopped means under one knot, usually anchored or
        waiting. Aircraft are airborne within {read.radius || 150} nautical miles, from adsb.lol (open data, ODbL).
        Coverage is uneven, so compare a place with its own usual level, not with another place.
        {shipsOff && " Ship counts are not available at the moment."}
      </p>
    </div>
  );
}
