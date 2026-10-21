/**
 * Public-domain market quotes.
 *
 * Every source here is published by a central bank, a treasury or a statistics
 * agency, and may be redistributed on a public site. That is the whole reason
 * for the selection: commercial feeds carry real-time equity prices but almost
 * universally forbid public display on their free tiers, so equity index
 * levels on this terminal come from TradingView's display-licensed widgets
 * instead, and everything in this file is what we are allowed to store,
 * reason over and serve ourselves.
 *
 * Design rules
 *  * No API keys required for anything in the default set. Optional sources
 *    switch on if a key happens to be present.
 *  * Each source is isolated. A government website being down must degrade one
 *    row, never the whole read.
 *  * Every row carries where it came from and what it is as of, because a
 *    daily reference rate and a traded level are not the same thing and the
 *    interface should not pretend otherwise.
 */

const TIMEOUT_MS = 12000;

async function getText(url, timeout = TIMEOUT_MS) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { accept: "text/csv,application/json,text/plain,*/*", "user-agent": "ag-desk/1.0" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(url, timeout = TIMEOUT_MS) {
  return JSON.parse(await getText(url, timeout));
}

/** First URL that succeeds. Hosts move; this keeps one rename from breaking a read. */
async function firstOf(urls, parse) {
  const problems = [];
  for (const url of urls) {
    try {
      return await parse(url);
    } catch (err) {
      problems.push(`${url} → ${err.message}`);
    }
  }
  throw new Error(problems.join("; "));
}

function dir(change) {
  const n = Number(change);
  if (!isFinite(n) || n === 0) return "flat";
  return n > 0 ? "up" : "down";
}

function pct(curr, prev) {
  if (!isFinite(curr) || !isFinite(prev) || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function signed(n, digits = 2, suffix = "%") {
  if (n === null || !isFinite(n)) return "";
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}${suffix}`;
}

/** Minimal CSV splitter that respects double quotes. */
function csvRows(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
      } else if (c === "," && !inQ) {
        cells.push(cur); cur = "";
      } else cur += c;
    }
    cells.push(cur);
    out.push(cells.map((s) => s.trim()));
  }
  return out;
}

/* ========================================================================== */
/* sources                                                                    */
/* ========================================================================== */

/**
 * US Treasury par yield curve. Published daily by the Treasury, public domain.
 * The CSV holds the whole year, so the last two rows give level and change.
 */
async function treasuryCurve(wanted = ["2 Yr", "10 Yr", "30 Yr"]) {
  const year = new Date().getUTCFullYear();
  const base = "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv";
  const text = await firstOf(
    [
      `${base}/${year}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${year}&page&_format=csv`,
      `${base}/${year - 1}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${year - 1}&page&_format=csv`
    ],
    getText
  );

  const rows = csvRows(text);
  if (rows.length < 2) throw new Error("No data rows in the Treasury CSV.");
  const head = rows[0];
  const body = rows
    .slice(1)
    .filter((r) => r[0] && !isNaN(Date.parse(r[0])))
    .sort((a, b) => Date.parse(b[0]) - Date.parse(a[0]));
  if (!body.length) throw new Error("No dated rows in the Treasury CSV.");

  const latest = body[0];
  const prior = body[1] || null;
  const out = [];

  for (const label of wanted) {
    const i = head.indexOf(label);
    if (i === -1) continue;
    const curr = parseFloat(latest[i]);
    if (!isFinite(curr)) continue;
    const was = prior ? parseFloat(prior[i]) : NaN;
    const bp = isFinite(was) ? (curr - was) * 100 : null;
    out.push({
      nm: `US ${label.replace(" Yr", "-year")} Treasury`,
      px: `${curr.toFixed(2)}%`,
      ch: bp === null ? "" : `${bp > 0 ? "+" : ""}${bp.toFixed(0)}bp`,
      dir: dir(bp),
      src: "US Treasury, daily par yield curve",
      asof: latest[0]
    });
  }
  if (!out.length) throw new Error("None of the requested maturities were present.");
  return out;
}

/**
 * Euro reference exchange rates, as published by the ECB each working day
 * around 16:00 CET. These are reference rates rather than traded levels, and
 * the label says so.
 */
async function ecbFx(symbols) {
  if (!symbols.length) return [];
  const list = symbols.join(",");
  const end = new Date();
  const start = new Date(end.getTime() - 12 * 86400000);
  const d = (x) => x.toISOString().slice(0, 10);

  const data = await firstOf(
    [
      `https://api.frankfurter.dev/v1/${d(start)}..${d(end)}?base=USD&symbols=${list}`,
      `https://api.frankfurter.app/${d(start)}..${d(end)}?base=USD&symbols=${list}`
    ],
    getJson
  );

  const dates = Object.keys(data.rates || {}).sort();
  if (!dates.length) throw new Error("No rates returned.");
  const last = data.rates[dates[dates.length - 1]];
  const prev = dates.length > 1 ? data.rates[dates[dates.length - 2]] : {};

  return symbols
    .filter((s) => isFinite(last[s]))
    .map((s) => {
      const change = pct(last[s], prev[s]);
      const digits = last[s] > 20 ? 2 : 4;
      return {
        nm: `USD/${s}`,
        px: last[s].toFixed(digits),
        ch: signed(change),
        dir: dir(change),
        src: "ECB daily reference rates",
        asof: dates[dates.length - 1]
      };
    });
}

/** ECB main refinancing rate — the euro area policy rate. */
async function ecbPolicyRate() {
  const text = await getText(
    "https://data-api.ecb.europa.eu/service/data/FM/B.U2.EUR.4F.KR.MRR_FR.LEV?lastNObservations=1&format=csvdata"
  );
  const rows = csvRows(text);
  if (rows.length < 2) throw new Error("No observation returned.");
  const head = rows[0];
  const vi = head.indexOf("OBS_VALUE");
  const pi = head.indexOf("TIME_PERIOD");
  const v = parseFloat(rows[1][vi]);
  if (!isFinite(v)) throw new Error("Observation was not numeric.");
  return [{
    nm: "ECB main refinancing rate",
    px: `${v.toFixed(2)}%`,
    ch: "",
    dir: "flat",
    src: "ECB Data Portal",
    asof: rows[1][pi] || ""
  }];
}

/**
 * Bank of England Bank Rate, from the Interactive Database.
 *
 * The IADB is an old ASP endpoint that answers 200 whatever you ask it, and
 * serves the CSV with a content type some clients treat as binary. So when the
 * parse finds nothing, the error carries the start of the response: a dead
 * endpoint and a consent page look identical from a status code alone.
 */
async function boeBankRate() {
  const from = new Date(Date.now() - 400 * 86400000);
  const dd = String(from.getDate()).padStart(2, "0");
  const mon = from.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  const yyyy = from.getUTCFullYear();
  const query =
    `?csv.x=yes&Datefrom=${dd}/${mon}/${yyyy}&Dateto=now&SeriesCodes=IUDBEDR` +
    "&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N";

  const text = await firstOf(
    [
      `https://www.bankofengland.co.uk/boeapps/database/fromshowcolumns.asp${query}`,
      `https://www.bankofengland.co.uk/boeapps/iadb/fromshowcolumns.asp${query}`
    ],
    getText
  );

  if (/<html|<!doctype/i.test(text.slice(0, 400))) {
    throw new Error(`served HTML, not CSV — ${text.slice(0, 120).replace(/\s+/g, " ")}`);
  }

  // Any row whose last cell is numeric. The column order has changed before.
  const rows = csvRows(text)
    .map((r) => ({ date: r[0], value: parseFloat(r[r.length - 1]) }))
    .filter((r) => isFinite(r.value));

  if (!rows.length) {
    throw new Error(`no numeric rows — response began: ${text.slice(0, 120).replace(/\s+/g, " ")}`);
  }

  const last = rows[rows.length - 1];
  return [{
    nm: "Bank of England Bank Rate",
    px: `${last.value.toFixed(2)}%`,
    ch: "",
    dir: "flat",
    src: "Bank of England IADB",
    asof: last.date || ""
  }];
}

/**
 * Optional FRED series. Switches on only when FRED_API_KEY is set. The series
 * chosen are US government in origin — EIA oil prices and Federal Reserve
 * dollar indices — rather than exchange data, so they are safe to serve.
 */
async function fredSeries(key, wanted) {
  if (!key || !wanted.length) return [];
  const out = [];
  const trouble = [];
  for (const { id, nm, unit, digits } of wanted) {
    try {
      const data = await getJson(
        `https://api.stlouisfed.org/fred/series/observations?series_id=${id}` +
          `&api_key=${key}&file_type=json&sort_order=desc&limit=8`
      );
      const obs = (data.observations || []).filter((o) => o.value !== "." && o.value !== "");
      if (!obs.length) {
        trouble.push(`${id}: no usable observations`);
        continue;
      }
      const curr = parseFloat(obs[0].value);
      const prev = obs[1] ? parseFloat(obs[1].value) : NaN;
      const change = pct(curr, prev);
      out.push({
        nm,
        px: `${curr.toFixed(digits ?? 2)}${unit || ""}`,
        ch: signed(change),
        dir: dir(change),
        src: `FRED ${id}`,
        asof: obs[0].date
      });
    } catch (err) {
      // One missing series should not cost us the others, but silence here is
      // how a quietly dead series goes unnoticed for months.
      trouble.push(`${id}: ${err.message}`);
    }
  }
  if (!out.length && trouble.length) throw new Error(trouble.join("; "));
  if (trouble.length) console.warn(`  FRED partial — ${trouble.join("; ")}`);
  return out;
}

/* ========================================================================== */
/* zone wiring                                                                */
/* ========================================================================== */

const FX_BY_ZONE = {
  anz: ["AUD", "NZD"],
  eas: ["JPY", "CNY", "KRW", "SGD"],
  ind: ["INR"],
  eur: ["EUR", "GBP", "CHF", "ZAR"],
  ams: ["CAD", "MXN", "BRL"],
  ag:  ["BRL", "EUR"]
};

/**
 * Anchors every zone gets.
 *
 * US yields, the dollar and crude set the terms of trade everywhere, so a
 * Sydney or Mumbai read without them is missing the reason half its move
 * happened. They also stop the thinner zones from showing a two-row grid.
 */
const FRED_GLOBAL = [
  { id: "DTWEXBGS", nm: "Dollar index (broad, Fed)", digits: 2 },
  { id: "DCOILWTICO", nm: "WTI crude", unit: " USD/bbl", digits: 2 }
];

const FRED_BY_ZONE = {
  ams: [],
  eur: [{ id: "DCOILBRENTEU", nm: "Brent crude", unit: " USD/bbl", digits: 2 }],
  ag: [{ id: "WPU0652", nm: "Nitrogenous fertiliser PPI", digits: 1 }],
  anz: [], eas: [], ind: []
};

/** US Treasury maturities per zone: the full curve at home, the anchor abroad. */
const CURVE_BY_ZONE = {
  ams: ["2 Yr", "10 Yr", "30 Yr"],
  anz: ["10 Yr"],
  eas: ["10 Yr"],
  ind: ["10 Yr"],
  eur: ["2 Yr", "10 Yr"],
  ag: ["10 Yr"]
};

/**
 * Everything we can verify for one zone.
 *
 * Returns rows plus the list of sources that answered and the ones that did
 * not, so a caller can be honest about coverage instead of silently thinning.
 */
export async function fetchQuotes(zone) {
  const jobs = [];
  const add = (name, fn) => jobs.push({ name, fn });

  const fx = FX_BY_ZONE[zone] || [];
  if (fx.length) add("ECB reference rates", () => ecbFx(fx));

  const curve = CURVE_BY_ZONE[zone];
  if (curve?.length) add("US Treasury yield curve", () => treasuryCurve(curve));

  if (zone === "eur") {
    add("ECB policy rate", () => ecbPolicyRate());
    add("Bank of England Bank Rate", () => boeBankRate());
  }

  const fred = [...FRED_GLOBAL, ...(FRED_BY_ZONE[zone] || [])];
  if (fred.length && process.env.FRED_API_KEY) {
    add("FRED", () => fredSeries(process.env.FRED_API_KEY, fred));
  }

  const settled = await Promise.allSettled(jobs.map((j) => j.fn()));

  // Official statistics lag. EIA oil prices reach FRED about a week late, and
  // a week-old spot price displayed beside a live index reads as current when
  // it is not. Anything stale says so in its own label.
  const stale = (asof) => {
    const t = Date.parse(asof);
    return isFinite(t) && Date.now() - t > 2 * 86400000;
  };
  const label = (r) => {
    if (!stale(r.asof)) return r;
    const d = new Date(r.asof);
    const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
    return { ...r, nm: `${r.nm} (${when})`, stale: true };
  };
  const rows = [];
  const ok = [];
  const failed = [];

  settled.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value?.length) {
      rows.push(...r.value.map(label));
      ok.push(jobs[i].name);
    } else {
      failed.push(`${jobs[i].name}: ${r.reason?.message || "returned nothing"}`);
    }
  });

  return { rows, ok, failed };
}

export const QUOTE_SOURCES = { FX_BY_ZONE, FRED_BY_ZONE };
