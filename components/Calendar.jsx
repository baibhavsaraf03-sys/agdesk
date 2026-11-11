"use client";

/**
 * The economic calendar (CAL): every scheduled release in lib/calendar.js,
 * grouped by day in the visitor's chosen time zone, with countdowns,
 * filters, a plain note on what each release is, its official source, a
 * calendar-file download and a button that asks the analyst about it.
 *
 * Dates only, deliberately: forecasts and actual figures are not in any free
 * feed, and a calendar that showed invented consensus numbers would be worse
 * than one that shows none. The analyst can say what the headlines expect.
 *
 * Settings (currencies, importance, range, time zone) are kept in this
 * browser under `agdesk.cal`.
 */
import { useEffect, useMemo, useState } from "react";
import { EVENTS, CAL_CURRENCIES, CAL_SERIES } from "@/lib/calendar";

const STORE = "agdesk.cal";
const ZONES = [
  ["local", "Your time"],
  ["Europe/London", "London"],
  ["America/New_York", "New York"],
  ["Asia/Tokyo", "Tokyo"]
];
const RANGES = [["week", "7 days", 7], ["month", "30 days", 30], ["all", "Everything", 9999]];
const CUR_NAMES = { USD: "US dollar", EUR: "Euro", GBP: "Pound", JPY: "Yen", CAD: "Canadian dollar", AUD: "Australian dollar" };
// How long a release stays "just out" at the top of the list.
const RECENT_MS = 24 * 3600000;

function readSaved() {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || "{}");
    return {
      curs: Array.isArray(v.curs) ? v.curs.filter((c) => CAL_CURRENCIES.includes(c)) : [],
      major: Boolean(v.major),
      range: RANGES.some(([k]) => k === v.range) ? v.range : "month",
      tz: ZONES.some(([k]) => k === v.tz) ? v.tz : "local"
    };
  } catch {
    return { curs: [], major: false, range: "month", tz: "local" };
  }
}

function zoneOpt(tz) {
  return tz === "local" ? {} : { timeZone: tz };
}

/** "Thu 17 Dec" in the chosen zone, plus a key that sorts and groups. */
function dayOf(iso, tz) {
  const d = new Date(iso);
  const key = new Intl.DateTimeFormat("en-CA", { ...zoneOpt(tz), year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const label = new Intl.DateTimeFormat("en-GB", { ...zoneOpt(tz), weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(d);
  return { key, label };
}

function timeOf(iso, tz) {
  return new Intl.DateTimeFormat("en-GB", { ...zoneOpt(tz), hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

function zoneName(tz) {
  if (tz !== "local") return ZONES.find(([k]) => k === tz)?.[1] || tz;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop().replace(/_/g, " ");
  } catch {
    return "your time";
  }
}

function until(ms) {
  const m = Math.round(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h} h ${String(m % 60).padStart(2, "0")} min`;
  const d = Math.floor(h / 24);
  return `in ${d} day${d === 1 ? "" : "s"}${d < 3 ? ` ${h % 24} h` : ""}`;
}

/** Where an event stands at `now`: upcoming, due (inside its announcement span), or out. */
function stateOf(e, now) {
  const at = Date.parse(e.at);
  const end = at + e.span * 60000;
  if (now < at) return { k: "next", t: until(at - now) };
  if (now <= end + 5 * 60000) return { k: "due", t: e.span ? "due now, time not fixed" : "out now" };
  return { k: "out", t: "released" };
}

/* ---- calendar files ---- */

const icsStamp = (iso) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

function icsFile(events) {
  const now = icsStamp(new Date().toISOString());
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ledge Desk//Economic calendar//EN", "CALSCALE:GREGORIAN"];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@ledgedesk`,
      `DTSTAMP:${now}`,
      `DTSTART:${icsStamp(e.at)}`,
      `DURATION:PT${Math.max(15, e.span || 0) + 15}M`,
      `SUMMARY:${icsText(`${e.name} (${e.currencies.join(", ")})`)}`,
      `DESCRIPTION:${icsText(`${e.about}\n\nOfficial schedule: ${e.source}`)}`,
      `URL:${e.source}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  // Calendar files want CRLF line ends.
  return lines.join("\r\n") + "\r\n";
}

function download(events, name) {
  const blob = new Blob([icsFile(events)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---- screen ---- */

/**
 * `request` is `{ cur, n }` from the command bar (`CAL USD`): show only that
 * currency. `ask(text, shown)` opens the analyst.
 */
export default function CalendarScreen({ ask, request }) {
  const [opts, setOpts] = useState(() => ({ curs: [], major: false, range: "month", tz: "local" }));
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(null);

  useEffect(() => {
    setOpts(readSaved());
    setLoaded(true);
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORE, JSON.stringify(opts));
    } catch {}
  }, [opts, loaded]);

  useEffect(() => {
    if (request?.cur && CAL_CURRENCIES.includes(request.cur)) setOpts((o) => ({ ...o, curs: [request.cur] }));
  }, [request]);

  const set = (patch) => setOpts((o) => ({ ...o, ...patch }));
  const toggleCur = (c) => set({ curs: opts.curs.includes(c) ? opts.curs.filter((x) => x !== c) : [...opts.curs, c] });

  const days = RANGES.find(([k]) => k === opts.range)[2];
  const shown = useMemo(() => {
    const from = now - RECENT_MS;
    const to = now + days * 86400000;
    return EVENTS.filter((e) => {
      const at = Date.parse(e.at);
      if (at < from || at > to) return false;
      if (opts.major && e.tier !== 1) return false;
      if (opts.curs.length && !e.currencies.some((c) => opts.curs.includes(c))) return false;
      return true;
    });
  }, [now, days, opts.major, opts.curs]);

  const recent = shown.filter((e) => stateOf(e, now).k === "out");
  const ahead = shown.filter((e) => stateOf(e, now).k !== "out");
  const nextMajor = EVENTS.find((e) => e.tier === 1 && stateOf(e, now).k !== "out" && (!opts.curs.length || e.currencies.some((c) => opts.curs.includes(c))));

  const groups = [];
  for (const e of ahead) {
    const { key, label } = dayOf(e.at, opts.tz);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) groups.push((g = { key, label, items: [] }));
    g.items.push(e);
  }
  const todayKey = dayOf(new Date(now).toISOString(), opts.tz).key;
  const tomorrowKey = dayOf(new Date(now + 86400000).toISOString(), opts.tz).key;

  // The latest date any series reaches, so the screen can say where it ends.
  const horizon = CAL_SERIES.map((s) => s.last).sort()[0];

  function row(e) {
    const st = stateOf(e, now);
    const isOpen = open === e.id;
    return (
      <div key={e.id} className={"cal-row" + (st.k === "due" ? " due" : "") + (st.k === "out" ? " out" : "") + (e.tier === 1 ? " major" : "")}>
        <button type="button" className="cal-main" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : e.id)}>
          <span className="cal-time">{timeOf(e.at, opts.tz)}</span>
          <span className="cal-cur">{e.currencies.join(" ")}</span>
          <span className="cal-name">
            {e.name}
            {e.tier === 1 && <span className="cal-tier">MAJOR</span>}
          </span>
          <span className={"cal-when " + st.k}>{st.k === "out" ? `${dayOf(e.at, opts.tz).label.split(" ").slice(0, 3).join(" ")} · released` : st.t}</span>
        </button>
        {isOpen && (
          <div className="cal-more">
            <p>{e.about}</p>
            {e.span > 0 && <p className="cal-dim">The time shown is the earliest it can come; it can land up to {e.span} minutes later.</p>}
            <div className="btnrow">
              {ask && (
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    ask(
                      `${st.k === "out" ? "This release has just come out" : "This release is coming up"}: ${e.name}, ${new Date(e.at).toUTCString()}. ` +
                        "Explain what it measures, what today's headlines and reads on this terminal suggest markets expect from it, and which markets on the terminal it is most likely to move and why. " +
                        "If the material does not show a consensus figure or the result, say so plainly rather than estimating one.",
                      `What to expect from the ${e.name}`
                    )
                  }
                >
                  Ask the analyst
                </button>
              )}
              <button type="button" className="btn" onClick={() => download([e], `${e.id}.ics`)}>Add to my calendar</button>
              <a className="btn" href={e.source} target="_blank" rel="noopener noreferrer">Official schedule</a>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="cal">
      {nextMajor && (
        <div className="cal-next">
          <span className="cal-k">Next major release</span>
          <span className="cal-nn">{nextMajor.name}</span>
          <span className="cal-nt">
            {dayOf(nextMajor.at, opts.tz).label} at {timeOf(nextMajor.at, opts.tz)} {zoneName(opts.tz)} time
          </span>
          <span className="cal-nc">{stateOf(nextMajor, now).t}</span>
        </div>
      )}

      <div className="cal-bar">
        <div className="cal-set" role="group" aria-label="Currencies">
          <span className="ch-k">Currency</span>
          <button type="button" className={"ch-seg" + (!opts.curs.length ? " on" : "")} aria-pressed={!opts.curs.length} onClick={() => set({ curs: [] })}>All</button>
          {CAL_CURRENCIES.map((c) => (
            <button key={c} type="button" className={"ch-seg" + (opts.curs.includes(c) ? " on" : "")} aria-pressed={opts.curs.includes(c)} title={CUR_NAMES[c]} onClick={() => toggleCur(c)}>{c}</button>
          ))}
        </div>
        <div className="cal-set" role="group" aria-label="Importance">
          <span className="ch-k">Show</span>
          <button type="button" className={"ch-seg" + (!opts.major ? " on" : "")} aria-pressed={!opts.major} onClick={() => set({ major: false })}>All releases</button>
          <button type="button" className={"ch-seg" + (opts.major ? " on" : "")} aria-pressed={opts.major} onClick={() => set({ major: true })}>Major only</button>
        </div>
        <div className="cal-set" role="group" aria-label="Range">
          <span className="ch-k">Range</span>
          {RANGES.map(([k, label]) => (
            <button key={k} type="button" className={"ch-seg" + (opts.range === k ? " on" : "")} aria-pressed={opts.range === k} onClick={() => set({ range: k })}>{label}</button>
          ))}
        </div>
        <div className="cal-set">
          <label className="ch-k" htmlFor="cal-tz">Times in</label>
          <select id="cal-tz" value={opts.tz} onChange={(e) => set({ tz: e.target.value })}>
            {ZONES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="cal-day">
          <h3 className="cal-dh">Released in the last 24 hours</h3>
          {recent.map(row)}
        </div>
      )}

      {groups.map((g) => (
        <div className="cal-day" key={g.key}>
          <h3 className="cal-dh">
            {g.label}
            {g.key === todayKey && <span className="cal-rel">Today</span>}
            {g.key === tomorrowKey && <span className="cal-rel">Tomorrow</span>}
          </h3>
          {g.items.map(row)}
        </div>
      ))}

      {!ahead.length && !recent.length && (
        <div className="empty">Nothing scheduled in this range for the currencies chosen. Widen the range or choose All.</div>
      )}

      <div className="btnrow">
        <button type="button" className="btn" disabled={!ahead.length} onClick={() => download(ahead, "ledge-desk-calendar.ics")}>
          Add these {ahead.length} to my calendar
        </button>
      </div>

      <p className="cal-foot">
        Times are {opts.tz === "local" ? `your device's (${zoneName("local")})` : `${zoneName(opts.tz)} time`}, adjusted for daylight saving.
        Dates come from each publisher&apos;s own schedule; click a release for its source. This calendar shows when releases
        come out, not forecasts or results: those are not in any free feed, so ask the analyst what the headlines expect.
        The calendar file opens in Google Calendar, Apple Calendar and Outlook. Some schedules are only published to{" "}
        {horizon ? new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(horizon)) : "early next year"}
        , so later months will look thinner until they are added.
      </p>
    </div>
  );
}
