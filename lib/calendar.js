/**
 * Scheduled releases that move the major currencies.
 *
 * There is no free feed of these, so the dates are written out here from the
 * publishers' own calendars, read on 11 Nov 2026:
 *  - Federal Reserve: FOMC calendar (2027 dates are tentative until each is
 *    confirmed at the meeting before it).
 *  - ECB: Governing Council monetary policy meetings.
 *  - Bank of England: MPC announcement dates (2027 provisional).
 *  - Bank of Japan: Monetary Policy Meetings; the decision is on the second day.
 *  - BLS: Employment Situation and Consumer Price Index schedules.
 *  - ONS: Consumer price inflation, UK.
 *  - Eurostat: euro area flash inflation, only the dates confirmed so far.
 *
 * Each list is a local date in the publisher's own time zone, and the time of
 * day is the publisher's fixed release time, so daylight saving is worked out
 * here rather than by hand. THE LISTS END IN DECEMBER 2027 (euro flash
 * inflation in March 2027): extend them when the next calendars are out.
 *
 * tier 1 = moves the whole dollar complex or sets a policy rate; tier 2 = a
 * first-rank national release. The Currencies screen stands aside for longer
 * around tier 1.
 */

const SERIES = [
  {
    name: "Fed rate decision", tier: 1, currencies: ["USD"], zone: "America/New_York", time: "14:00",
    dates: ["2026-12-09", "2027-01-27", "2027-03-17", "2027-04-28", "2027-06-09", "2027-07-28", "2027-09-15", "2027-10-27", "2027-12-08"]
  },
  {
    name: "US jobs report", tier: 1, currencies: ["USD"], zone: "America/New_York", time: "08:30",
    dates: ["2026-12-04", "2027-01-08", "2027-02-05", "2027-03-05", "2027-04-02", "2027-05-07", "2027-06-04", "2027-07-02", "2027-08-06", "2027-09-03", "2027-10-08", "2027-11-05", "2027-12-03"]
  },
  {
    name: "US inflation (CPI)", tier: 1, currencies: ["USD"], zone: "America/New_York", time: "08:30",
    dates: ["2026-12-10", "2027-01-13", "2027-02-11", "2027-03-10", "2027-04-13", "2027-05-12", "2027-06-10", "2027-07-14", "2027-08-11", "2027-09-14", "2027-10-14", "2027-11-10", "2027-12-10"]
  },
  {
    name: "ECB rate decision", tier: 1, currencies: ["EUR"], zone: "Europe/Berlin", time: "14:15",
    dates: ["2026-12-17", "2027-02-04", "2027-03-18", "2027-04-29", "2027-06-10", "2027-07-22", "2027-09-09", "2027-10-28", "2027-12-16"]
  },
  {
    name: "Bank of England rate decision", tier: 1, currencies: ["GBP"], zone: "Europe/London", time: "12:00",
    dates: ["2026-12-17", "2027-02-04", "2027-03-18", "2027-04-29", "2027-06-17", "2027-07-29", "2027-09-16", "2027-11-04", "2027-12-16"]
  },
  // The Bank of Japan announces when its board finishes, usually between
  // 11:30 and 12:30 Tokyo time. Two markers an hour apart keep the whole of
  // that span inside a tier 1 window.
  ...[["early", "11:45"], ["late", "12:45"]].map(([label, time]) => ({
    name: `Bank of Japan rate decision (${label} marker)`, tier: 1, currencies: ["JPY"], zone: "Asia/Tokyo", time,
    dates: ["2026-12-18", "2027-01-22", "2027-03-18", "2027-04-28", "2027-06-11", "2027-07-22", "2027-09-22", "2027-10-29", "2027-12-17"]
  })),
  {
    name: "UK inflation (CPI)", tier: 2, currencies: ["GBP"], zone: "Europe/London", time: "07:00",
    dates: ["2026-11-18", "2026-12-16", "2027-01-20", "2027-02-17", "2027-03-24", "2027-04-21", "2027-05-19", "2027-06-16", "2027-07-21", "2027-08-18", "2027-09-15", "2027-10-20", "2027-11-17"]
  },
  {
    name: "Euro area inflation (flash)", tier: 2, currencies: ["EUR"], zone: "Europe/Berlin", time: "11:00",
    dates: ["2026-12-01", "2027-01-06", "2027-02-02", "2027-03-02"]
  }
];

/** The instant at which a wall-clock date and time occurs in a time zone. */
function instant(date, time, zone) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
    }).formatToParts(new Date(guess)).map((p) => [p.type, p.value])
  );
  const shown = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return new Date(guess - (shown - guess));
}

/** Every event, oldest first: `{ name, at (ISO, UTC), tier, currencies }`. */
export const EVENTS = SERIES.flatMap((s) =>
  s.dates.map((date) => ({ name: s.name, at: instant(date, s.time, s.zone).toISOString(), tier: s.tier, currencies: s.currencies }))
).sort((a, b) => a.at.localeCompare(b.at));

/** Events from shortly before `now` onward, so one still inside its window is included. */
export function upcomingEvents(now = Date.now(), limit = 40) {
  return EVENTS.filter((e) => Date.parse(e.at) > now - 90 * 60000).slice(0, limit);
}
