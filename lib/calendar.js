/**
 * Scheduled releases that move markets: the economic calendar (CAL) and the
 * release windows on the Currencies screen (FX) both read this file.
 *
 * There is no free feed of these, so the dates are written out by hand. Read
 * on 11 Nov 2026 from:
 *  - Federal Reserve: FOMC calendar (2027 dates are tentative until each is
 *    confirmed at the meeting before it).
 *  - ECB: Governing Council monetary policy meetings (2027 from a secondary
 *    calendar; check against the ECB's own page).
 *  - Bank of England: MPC announcement dates (2027 provisional).
 *  - Bank of Japan: Monetary Policy Meetings; the decision is on the second day.
 *  - Bank of Canada: 2027 schedule published 27 Jul 2026.
 *  - Reserve Bank of Australia: 2026 dates from the RBA's own release; 2027
 *    from a secondary calendar (decision days, all Tuesdays).
 *  - BLS: Employment Situation and Consumer Price Index schedules.
 *  - BEA: GDP advance estimate (only the next one is confirmed so far).
 *  - ONS: Consumer price inflation, UK (2027 from a secondary calendar).
 *  - Eurostat: euro area flash inflation, only the dates confirmed so far.
 *
 * Each list is a local date in the publisher's own time zone and the time of
 * day is the publisher's fixed release time, so daylight saving is worked out
 * here rather than by hand. THE LISTS END IN DECEMBER 2027 (euro flash
 * inflation in March 2027, US GDP in January 2027): extend them when the next
 * calendars are out. A series whose last date has passed simply drops out.
 *
 * tier 1 = sets a policy rate or moves a whole currency complex; tier 2 = a
 * first-rank national release. `span` is how many minutes after the stated
 * time an announcement can land, for banks that do not fix the minute.
 */

const SERIES = [
  {
    key: "fomc", name: "Fed rate decision", tier: 1, currencies: ["USD"], zone: "America/New_York", time: "14:00",
    about: "The Federal Reserve sets its policy rate. It moves the dollar, Treasury yields and US stocks, and through them nearly everything else.",
    source: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    dates: ["2026-12-09", "2027-01-27", "2027-03-17", "2027-04-28", "2027-06-09", "2027-07-28", "2027-09-15", "2027-10-27", "2027-12-08"]
  },
  {
    key: "nfp", name: "US jobs report", tier: 1, currencies: ["USD"], zone: "America/New_York", time: "08:30",
    about: "Payrolls, unemployment and wage growth for the previous month. The single release most likely to change what the Fed does next.",
    source: "https://www.bls.gov/schedule/news_release/empsit.htm",
    dates: ["2026-12-04", "2027-01-08", "2027-02-05", "2027-03-05", "2027-04-02", "2027-05-07", "2027-06-04", "2027-07-02", "2027-08-06", "2027-09-03", "2027-10-08", "2027-11-05", "2027-12-03"]
  },
  {
    key: "uscpi", name: "US inflation (CPI)", tier: 1, currencies: ["USD"], zone: "America/New_York", time: "08:30",
    about: "Consumer prices for the previous month. Markets watch the core figure, which leaves out food and energy.",
    source: "https://www.bls.gov/schedule/news_release/cpi.htm",
    dates: ["2026-12-10", "2027-01-13", "2027-02-11", "2027-03-10", "2027-04-13", "2027-05-12", "2027-06-10", "2027-07-14", "2027-08-11", "2027-09-14", "2027-10-14", "2027-11-10", "2027-12-10"]
  },
  {
    key: "usgdp", name: "US GDP (first estimate)", tier: 2, currencies: ["USD"], zone: "America/New_York", time: "08:30",
    about: "The first estimate of last quarter's growth. It is revised twice afterwards, sometimes heavily, but the first print is the one markets trade.",
    source: "https://www.bea.gov/news/schedule",
    dates: ["2027-01-28"]
  },
  {
    key: "ecb", name: "ECB rate decision", tier: 1, currencies: ["EUR"], zone: "Europe/Berlin", time: "14:15",
    about: "The European Central Bank sets rates for the euro area. The press conference half an hour later often moves the euro more than the decision.",
    source: "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html",
    dates: ["2026-12-17", "2027-02-04", "2027-03-18", "2027-04-29", "2027-06-10", "2027-07-22", "2027-09-09", "2027-10-28", "2027-12-16"]
  },
  {
    key: "boe", name: "Bank of England rate decision", tier: 1, currencies: ["GBP"], zone: "Europe/London", time: "12:00",
    about: "The Monetary Policy Committee sets Bank Rate. The vote split is published with it and is often what moves the pound.",
    source: "https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates",
    dates: ["2026-12-17", "2027-02-04", "2027-03-18", "2027-04-29", "2027-06-17", "2027-07-29", "2027-09-16", "2027-11-04", "2027-12-16"]
  },
  {
    key: "boj", name: "Bank of Japan rate decision", tier: 1, currencies: ["JPY"], zone: "Asia/Tokyo", time: "11:30", span: 75,
    about: "The Bank of Japan announces when its board finishes, usually between 11:30 and 12:45 Tokyo time, so the minute is not known in advance.",
    source: "https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm",
    dates: ["2026-12-18", "2027-01-22", "2027-03-18", "2027-04-28", "2027-06-11", "2027-07-22", "2027-09-22", "2027-10-29", "2027-12-17"]
  },
  {
    key: "boc", name: "Bank of Canada rate decision", tier: 1, currencies: ["CAD"], zone: "America/Toronto", time: "09:45",
    about: "The Bank of Canada sets its overnight rate. January, April, July and October come with a full economic forecast.",
    source: "https://www.bankofcanada.ca/press/upcoming-events/",
    dates: ["2026-12-09", "2027-01-27", "2027-03-03", "2027-04-28", "2027-06-02", "2027-07-21", "2027-09-08", "2027-10-27", "2027-12-08"]
  },
  {
    key: "rba", name: "RBA rate decision", tier: 1, currencies: ["AUD"], zone: "Australia/Sydney", time: "14:30",
    about: "The Reserve Bank of Australia sets the cash rate. It lands in the middle of the Asian session, overnight for Europe.",
    source: "https://www.rba.gov.au/schedules-events/board-meeting-schedules.html",
    dates: ["2026-12-08", "2027-02-09", "2027-03-23", "2027-05-04", "2027-06-22", "2027-08-10", "2027-09-21", "2027-11-02", "2027-12-14"]
  },
  {
    key: "ukcpi", name: "UK inflation (CPI)", tier: 2, currencies: ["GBP"], zone: "Europe/London", time: "07:00",
    about: "UK consumer prices for the previous month, from the Office for National Statistics. Out before the London open.",
    source: "https://www.ons.gov.uk/releasecalendar",
    dates: ["2026-11-18", "2026-12-16", "2027-01-20", "2027-02-17", "2027-03-24", "2027-04-21", "2027-05-19", "2027-06-16", "2027-07-21", "2027-08-18", "2027-09-15", "2027-10-20", "2027-11-17"]
  },
  {
    key: "eucpi", name: "Euro area inflation (flash)", tier: 2, currencies: ["EUR"], zone: "Europe/Berlin", time: "11:00",
    about: "Eurostat's first estimate of euro-area inflation for the month just ended. It feeds straight into what the ECB does next.",
    source: "https://ec.europa.eu/eurostat/news/release-calendar",
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

/** One entry per series, for the calendar's filters and notes. */
export const CAL_SERIES = SERIES.map(({ dates, ...rest }) => ({ ...rest, last: dates[dates.length - 1] }));

/** Every currency that has at least one release, in a fixed order. */
export const CAL_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"].filter((c) => SERIES.some((s) => s.currencies.includes(c)));

/**
 * Every event, oldest first:
 * `{ id, key, name, at (ISO, UTC), tier, currencies, span, about, source, zone }`.
 */
export const EVENTS = SERIES.flatMap((s) =>
  s.dates.map((date) => {
    const at = instant(date, s.time, s.zone).toISOString();
    return {
      id: `${s.key}-${date}`, key: s.key, name: s.name, at, tier: s.tier, currencies: s.currencies,
      span: s.span || 0, about: s.about, source: s.source, zone: s.zone
    };
  })
).sort((a, b) => a.at.localeCompare(b.at));

/**
 * Events from shortly before `now` onward, so one still inside its window is
 * included. `currencies` limits it to releases touching any of those.
 */
export function upcomingEvents(now = Date.now(), limit = 40, currencies = null) {
  return EVENTS.filter((e) =>
    Date.parse(e.at) + e.span * 60000 > now - 90 * 60000 &&
    (!currencies || e.currencies.some((c) => currencies.includes(c)))
  ).slice(0, limit);
}
