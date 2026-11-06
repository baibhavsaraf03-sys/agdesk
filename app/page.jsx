"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { browserClient, supabaseConfigured } from "@/lib/supabase-browser";
import {
  EXCHANGES, GLOSSARY, METHOD, TUTORIALS, RISKS, FALLBACK_FEED, ZONES
} from "@/lib/content";
import { DISCIPLINES, ALL_FRAMEWORKS, SEMINAR_MODES } from "@/lib/disciplines";
import { FLOWS, FLOWS_PREFACE, FLOW_TAGS } from "@/lib/flows";
import {
  CRASH_STATS, CRASH_TABLE, CAPEX_RATIOS, CIRCULAR_STATS, LOOPS,
  POSITIONS, CONTAGION_STATS, CONTAGION_CARDS, CONTAGION_CHAIN,
  PLAYBOOK, COUNTER_STATS, COUNTER_ARGS, VERDICT,
  CAPEX_VS_REVENUE, HYPERSCALER_FCF, ROI_GAP, SCENARIOS,
  RISK_MODEL, STRESS_TEST, REVISED_STRATEGY, VENDOR_COMMITS,
  SOURCES as DOOM_SOURCES
} from "@/lib/doomsday";
import { TV_CONFIGS, TAPE_CONFIG } from "@/lib/tv";
import { Markdown, safeHref } from "@/lib/markdown";
import { cluster, digestPick } from "@/lib/alerts";

/* ========================================================================== */
/* screens                                                                    */
/* ========================================================================== */

/**
 * The sidebar's shape.
 *
 * Twenty-six codes in a flat strip across the top gave everything equal
 * weight and permanent presence, which is exhausting and tells a newcomer
 * nothing about where to start. Grouping them puts the daily reasons to visit
 * at the top, the reference material below, and lets the whole thing fold
 * away when you want to read.
 */
const NAV_GROUPS = [
  { g: "Daily", items: ["HOME", "NEWS"] },
  { g: "Markets", items: ["WLD", "ASIA", "EMEA", "AMER", "MAC", "FX"] },
  { g: "Commodities", items: ["DESK", "GRN", "SFT", "TRD", "WCH"] },
  { g: "Analysis", items: ["FLOW", "SRC", "DOOM"] },
  { g: "Disciplines", items: ["ECON", "LAW", "IR", "POL", "SEM"] },
  { g: "Learn", items: ["START", "TUT", "RISK", "GLOS", "MTD"] },
  { g: "Yours", items: ["AGN", "JRN", "SET"] },
  { g: "About", items: ["TERMS", "HELP"] }
];

/** The four news streams. Labels only — fetching happens in /api/news. */
const NEWS_TABS = [
  { k: "finance", t: "Finance", d: "Markets, central banks, earnings." },
  { k: "politics", t: "Politics", d: "Budgets, elections, legislation. Fiscal policy is a market input." },
  { k: "ir", t: "Intl relations", d: "Conflict, sanctions, trade policy — where supply chains reroute." },
  { k: "law", t: "Law & regulation", d: "Rulings and rulemaking reprice sectors faster than earnings." }
];

const SCREENS = [
  { c: "HOME",  t: "Home",       d: "Today's headlines and the state of the markets" },
  { c: "NEWS",  t: "News",       d: "Finance, politics, international relations and law" },
  { c: "START", t: "Start",      d: "Never traded before? Begin here" },
  { c: "RISK",  t: "Risk",       d: "How money is actually lost — the evidence and the six mechanisms" },
  { c: "TUT",   t: "Tutorials",  d: "Sixteen lessons from zero. TUT 7 opens lesson seven" },
  { c: "GLOS",  t: "Glossary",   d: "Every term in plain English" },
  { c: "WLD",   t: "World",      d: "All 29 exchanges with live local clocks and open/closed status" },
  { c: "ASIA",  t: "Asia",       d: "Asia-Pacific session reads — Sydney, Tokyo, Mumbai" },
  { c: "EMEA",  t: "EMEA",       d: "Europe, Middle East and Africa session read" },
  { c: "AMER",  t: "Americas",   d: "Americas session read — New York, Toronto, Sao Paulo" },
  { c: "DESK",  t: "Ag brief",   d: "Agricultural commodities, with the reasoning behind each line" },
  { c: "GRN",   t: "Grains",     d: "Grain and oilseed board plus every key level" },
  { c: "SFT",   t: "Softs",      d: "Coffee, cocoa, sugar" },
  { c: "TRD",   t: "Underrated", d: "Markets the coverage is missing, contradiction-screened" },
  { c: "WCH",   t: "Watch",      d: "What decides the next few sessions" },
  { c: "MAC",   t: "Macro",      d: "Dollar, crude, rates, freight and fertiliser" },
  { c: "FX",    t: "Currencies", d: "Policy rates, two-year yields, speculative positioning and the releases that move the majors" },
  { c: "AGN",   t: "Analyst",    d: "Ask anything — it reads the live feed and remembers the thread" },
  { c: "ECON",  t: "Economics",  d: "14 models you are examined on, each applicable to today's reads" },
  { c: "LAW",   t: "Law",        d: "Doctrine, leading cases and regulators across UK, EU and US" },
  { c: "IR",    t: "Intl Rel",   d: "The traditions and mid-range theories, applied to live events" },
  { c: "POL",   t: "Politics",   d: "Comparative politics and political economy frameworks" },
  { c: "SEM",   t: "Seminar",    d: "Turn any framework plus today's news into a contribution, essay plan or exam answer" },
  { c: "FLOW",  t: "Flows",      d: "The world's largest capital reallocations, and what each is and is not evidence for" },
  { c: "DOOM",  t: "Doomsday",   d: "AI bubble short thesis — crash data, circular fraud, positions, contagion and counter-thesis" },
  { c: "MTD",   t: "Method",     d: "Nine lessons. MTD 4 opens lesson four" },
  { c: "JRN",   t: "Journal",    d: "Your own daily read, saved to your account" },
  { c: "SRC",   t: "Sources",    d: "Where the current reads came from" },
  { c: "SET",   t: "Settings",   d: "Sign in, your own API key, usage" },
  { c: "TERMS", t: "Terms",      d: "Terms of use, the disclaimer, and what happens to your data" },
  { c: "HELP",  t: "Help",       d: "This screen" }
];
const CODES = SCREENS.map((s) => s.c);
const ALIAS = {
  "1": "START", "2": "RISK", "3": "TUT", "4": "GLOS", "5": "WLD",
  "6": "AGN", "7": "DESK", "8": "MTD", "9": "JRN",
  "?": "HELP", H: "HELP", BRIEF: "DESK", AGENT: "AGN", ASK: "AGN",
  GRAIN: "GRN", GRAINS: "GRN", SOFT: "SFT", SOFTS: "SFT", TRADES: "TRD", WATCH: "WCH",
  MACRO: "MAC", METHOD: "MTD", JOURNAL: "JRN", SOURCES: "SRC",
  WORLD: "WLD", EXCHANGES: "WLD", GLOBAL: "WLD", US: "AMER", AMERICAS: "AMER",
  EUROPE: "EMEA", UK: "EMEA", APAC: "ASIA", PACIFIC: "ASIA",
  BEGIN: "START", LEARN: "TUT", TUTORIAL: "TUT", TUTORIALS: "TUT", BASICS: "TUT",
  GLOSSARY: "GLOS", DEFINE: "GLOS", OPTIONS: "TUT", FUTURES: "TUT",
  DANGER: "RISK", LOSS: "RISK", LOSSES: "RISK",
  SETTINGS: "SET", KEY: "SET", ACCOUNT: "SET", LOGIN: "SET", SIGNIN: "SET",
  ECONOMICS: "ECON", MICRO: "ECON", MACRO2: "ECON",
  LEGAL: "LAW", COMPANY: "LAW", CONTRACT: "LAW",
  INTERNATIONAL: "IR", GEOPOLITICS: "IR", GEO: "IR",
  POLITICS: "POL", POLSCI: "POL", COMPARATIVE: "POL",
  ESSAY: "SEM", EXAM: "SEM", REVISION: "SEM", STUDY: "SEM",
  LEGALNOTICE: "TERMS", DISCLAIMER: "TERMS", PRIVACY: "TERMS", TOS: "TERMS",
  FLOWS: "FLOW", CAPITAL: "FLOW", TRADES2: "FLOW", BIG: "FLOW", STRUCTURAL: "FLOW",
  DOOMSDAY: "DOOM", WARROOM: "DOOM", BUBBLE: "DOOM", SHORT: "DOOM", SHORTS: "DOOM"
};

/* ========================================================================== */
/* plain-English term highlighting                                            */
/* ========================================================================== */

const GLOS_MAP = Object.fromEntries(GLOSSARY.map(([t, d]) => [t.toLowerCase(), d]));
const TERM_RE = new RegExp(
  "\\b(" +
    GLOSSARY.map(([t]) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .sort((a, b) => b.length - a.length)
      .join("|") +
    ")\\b",
  "gi"
);

function Term({ word }) {
  const [open, setOpen] = useState(false);
  const def = GLOS_MAP[word.toLowerCase()];
  return (
    <>
      <button type="button" className="term" onClick={() => setOpen((v) => !v)}>
        {word}
      </button>
      {open && (
        <span className="termdef">
          <b>{word} — </b>
          {def}
        </span>
      )}
    </>
  );
}

/** Renders text, turning the first use of each glossary term into a tappable definition. */
function Prose({ text, className = "prose", as: Tag = "p" }) {
  const pe = usePE();
  const nodes = useMemo(() => {
    if (!pe || !text) return text;
    const seen = new Set();
    const out = [];
    let last = 0;
    TERM_RE.lastIndex = 0;
    let m;
    while ((m = TERM_RE.exec(text))) {
      const key = m[1].toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (m.index > last) out.push(text.slice(last, m.index));
      out.push(<Term key={`${key}-${m.index}`} word={m[1]} />);
      last = m.index + m[1].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }, [text, pe]);
  return <Tag className={className}>{nodes}</Tag>;
}

let peListeners = new Set();
let peState = false;
function usePE() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    peListeners.add(fn);
    return () => peListeners.delete(fn);
  }, []);
  return peState;
}
function setPEGlobal(v) {
  peState = v;
  try { localStorage.setItem("agdesk.pe", v ? "1" : "0"); } catch {}
  peListeners.forEach((fn) => fn());
}

/* ========================================================================== */
/* small building blocks                                                      */
/* ========================================================================== */

function Grid({ title, unit, rows }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="grid">
      {title && (
        <div className="ghead">
          <span>{title}</span>
          <span>{unit || ""}</span>
        </div>
      )}
      {rows.map((r, i) => (
        <div className="grow" key={i}>
          <span className="gnm">{r.nm}</span>
          <span className="gpx">{r.px || ""}</span>
          <span className={"gch " + (r.dir === "up" ? "up" : r.dir === "down" ? "down" : "flat")}>
            {r.ch != null ? r.ch : r.note || ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function Block({ h, body, read }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sec">
      {h && <h3>{h}</h3>}
      <div className="block">
        <Prose text={body} />
        {read && (
          <>
            <button
              type="button"
              className="why"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "Hide" : "Read it"}
            </button>
            {open && (
              <div className="read">
                {String(read)
                  .split("\n\n")
                  .filter((p) => p.trim())
                  .map((p, i) => (
                    <Prose key={i} text={p.trim()} className="" />
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Panel({ code, title, meta, children }) {
  return (
    <section className="panel">
      <div className="phead">
        <span className="pcode">{code}</span>
        <span className="ptitle">{title}</span>
        {meta && <span className="pmeta">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

/**
 * A TradingView embedded widget.
 *
 * These exist because real-time equity index levels are licensed data. Free
 * APIs forbid displaying them on a public site; TradingView's widgets are
 * licensed for exactly that, which is why index quotes live here rather than
 * in our own database. The cost is that the numbers stay inside their iframe
 * and our code cannot read them, so the analyst reasons over the
 * public-domain figures in each read instead.
 *
 * Their attribution link is required by the widget terms. Leave it in place.
 */
function TVWidget({ widget, config, label }) {
  if (!config) return null;

  // The embed script's only job is to build this iframe, reading its config
  // from its own text content. Injecting a script tag from React turned out to
  // lose that config — which is why the widgets came up light and ignored
  // their sizing. Building the iframe ourselves puts the config somewhere it
  // cannot be dropped, and removes the mount/unmount churn that made them
  // flicker. No effect, no refs, and it renders server-side.
  const src =
    `https://s.tradingview.com/embed-widget/${widget}/?locale=en#` +
    encodeURIComponent(JSON.stringify(config));

  return (
    <div className="tvwrap">
      {label && <div className="tvlabel">{label}</div>}
      <iframe
        src={src}
        title={label || "Market quotes"}
        scrolling="no"
        loading="lazy"
        style={{
          display: "block",
          width: "100%",
          height: config.height || 420,
          border: 0,
          colorScheme: "dark"
        }}
      />
      <div className="tvcredit">
        <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">
          Quotes by TradingView
        </a>
        {" · live or delayed by market, licensed for display only"}
      </div>
    </div>
  );
}


/** "3h ago" — undated items say nothing rather than guessing. */
function ago(when) {
  const t = Date.parse(when || "");
  if (!isFinite(t)) return "";
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

/**
 * A stream of headlines.
 *
 * Headlines only, linking out. We are not republishing anyone's reporting —
 * a headline, its publisher and a link is what a newsstand does, and it is
 * what makes this section free to run.
 */
/**
 * The day's digest: the strongest stories across all four streams.
 *
 * This is the same selection that goes to the phone each morning, computed by
 * the same functions in lib/alerts.mjs. One ranking, two surfaces: if the
 * notification led with a story, it leads here too, and a reader who saw the
 * digest on their phone is not shown a different front page an hour later.
 *
 * It sits above everything because a reader arriving at a markets site wants
 * to know what happened, not to be told what the site is for.
 */
function Digest({ streams, busy }) {
  const picked = useMemo(() => {
    if (!streams) return [];
    const byStream = {};
    for (const [key, s] of Object.entries(streams)) {
      byStream[key] = cluster(s?.items || []);
    }
    return digestPick(byStream, { digestSize: 8, digestPerStreamMin: 1 });
  }, [streams]);

  if (!picked.length) {
    return (
      <div className="empty">
        {busy ? (
          <span>Gathering headlines<span className="loadingdots">...</span></span>
        ) : (
          <span>Headlines refresh every 10 minutes. <button className="del" style={{ marginLeft: "0.5rem" }} onClick={() => window.location.reload()}>Refresh now</button></span>
        )}
      </div>
    );
  }

  const [lead, ...rest] = picked;
  const label = (k) => NEWS_TABS.find((t) => t.k === k)?.t || k;

  return (
    <div className="digest">
      <article className="dglead">
        <span className="dgtag">{label(lead._stream)}</span>
        {safeHref(lead.url) ? (
          <a className="dgleadtitle" href={safeHref(lead.url)} target="_blank" rel="noopener noreferrer nofollow">
            {lead.title}
          </a>
        ) : (
          <span className="dgleadtitle">{lead.title}</span>
        )}
        <span className="dgmeta">
          {lead.source}
          {lead.when && <> &middot; {ago(lead.when)}</>}
        </span>
      </article>

      <ul className="dglist">
        {rest.map((c, i) => (
          <li key={`${c.url || c.title}-${i}`}>
            <span className="dgtag">{label(c._stream)}</span>
            {safeHref(c.url) ? (
              <a href={safeHref(c.url)} target="_blank" rel="noopener noreferrer nofollow">
                {c.title}
              </a>
            ) : (
              <span className="newsplain">{c.title}</span>
            )}
            <span className="dgmeta">
              {c.source}
              {c.when && <> &middot; {ago(c.when)}</>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewsList({ items, limit, empty = "No headlines retrieved." }) {
  const rows = limit ? items.slice(0, limit) : items;
  if (!rows.length) return <div className="empty">{empty}</div>;
  return (
    <ul className="newslist">
      {rows.map((a, i) => (
        <li key={`${a.url || a.title}-${i}`}>
          {/* The href comes from a third-party feed, so it is untrusted: only
              http and https are allowed through, and anything else renders as
              plain text rather than becoming a clickable javascript: link. */}
          {safeHref(a.url) ? (
            <a href={safeHref(a.url)} target="_blank" rel="noopener noreferrer nofollow">
              {a.title}
            </a>
          ) : (
            <span className="newsplain">{a.title}</span>
          )}
          <span className="newsmeta">
            {a.source}
            {ago(a.when) && <> &middot; {ago(a.when)}</>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The verified figures, flattened across every zone.
 *
 * These are the numbers we are allowed to store and reason over — Treasury
 * yields, ECB reference rates, BIS policy rates, EIA oil — as opposed to the
 * equity levels that live inside TradingView's iframe. Showing them on the
 * front page puts the state of the world above the headlines without
 * pretending to be a trading screen.
 */
function FiguresBand({ reads, onOpen }) {
  const rows = [];
  const seen = new Set();
  for (const r of Object.values(reads || {})) {
    for (const row of r.rows || []) {
      if (seen.has(row.nm)) continue;
      seen.add(row.nm);
      rows.push(row);
    }
  }
  if (!rows.length) return null;

  // Rates and the dollar first: they explain more of any given day than a
  // single currency pair does.
  const weight = (nm) =>
    /Treasury|policy rate|Dollar index/i.test(nm) ? 0 : /crude|oil|fertil/i.test(nm) ? 1 : 2;
  rows.sort((a, b) => weight(a.nm) - weight(b.nm));

  return (
    <div className="band">
      <div className="bandhead">
        <span>Verified figures</span>
        <button className="del" onClick={() => onOpen("SRC")}>sources</button>
      </div>
      <div className="bandrows">
        {rows.slice(0, 12).map((r) => (
          <div className="bandcell" key={r.nm}>
            <span className="bn">{r.nm}</span>
            <span className="bp">{r.px}</span>
            {r.ch && <span className={"bc " + (r.dir || "flat")}>{r.ch}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Collapsible({ num, title, sub, done, onToggleDone, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lsn">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="lnum">{num}</span>
        <span className="lttl">
          <strong>{title}</strong>
          <em>{sub}</em>
        </span>
        <span className={"tick" + (done ? " on" : "")}>{done ? "●" : "○"}</span>
      </button>
      {open && (
        <div className="lbody">
          {children}
          <div className="lrow">
            <button type="button" className="btn" onClick={onToggleDone}>
              {done ? "Mark unread" : "Mark done"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/* exchange clock                                                             */
/* ========================================================================== */

function exchangeStatus(e) {
  const [, , , tz, , open, close] = e;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value;
    const h = Number(get("hour")), m = Number(get("minute"));
    const mins = h * 60 + m;
    const t = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    if (get("weekday") === "Sat" || get("weekday") === "Sun") return { s: "WEEKEND", cls: "flat", t, rank: 4 };
    if (mins >= open && mins < close) return { s: "OPEN", cls: "up", t, rank: 0 };
    if (mins >= open - 60 && mins < open) return { s: "PRE-OPEN", cls: "", t, rank: 1 };
    if (mins >= close && mins < close + 60) return { s: "JUST CLOSED", cls: "flat", t, rank: 2 };
    return { s: "CLOSED", cls: "flat", t, rank: 3 };
  } catch {
    return { s: "?", cls: "flat", t: "--:--", rank: 5 };
  }
}

/* ========================================================================== */
/* the terminal                                                               */
/* ========================================================================== */


function FrameworkCard({ item, num, onAsk }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="lnum">{num}</span>
        <span className="lttl">
          <strong>{item.t}</strong>
          <em>{item.s}</em>
        </span>
        <span className="tick">{open ? "\u25be" : "\u25b8"}</span>
      </button>
      {open && (
        <div className="lbody">
          {item.b.split("\n\n").map((para, i) => (
            <Prose key={i} text={para} />
          ))}
          <div className="sec">
            <span className="tag">Where it shows up</span>
            <Prose text={item.news} />
          </div>
          <div className="lrow">
            <button className="btn pri" onClick={() => onAsk(item.apply)}>Apply to today</button>
            <button
              className="btn"
              onClick={() =>
                onAsk(
                  `Explain the framework "${item.t}" to me as if I am seeing it for the first time, then give me the two hardest criticisms of it that an examiner would expect me to know.`
                )
              }
            >
              Explain &amp; critique
            </button>
          </div>
        </div>
      )}
    </>
  );
}


function FlowCard({ flow, num, onAsk }) {
  const [open, setOpen] = useState(false);
  const tag = FLOW_TAGS[flow.tag];
  return (
    <>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="lnum">{num}</span>
        <span className="lttl">
          <strong>{flow.name}</strong>
          <em>{flow.scale}</em>
        </span>
        <span className="tick" style={tag ? { color: tag.color } : undefined}>
          {open ? "\u25be" : "\u25b8"}
        </span>
      </button>
      {open && (
        <div className="lbody">
          {tag && (
            <span className="pill on" style={{ borderColor: tag.color, color: tag.color, alignSelf: "flex-start" }}>
              {tag.label}
            </span>
          )}
          <Prose text={flow.body} />
          <div className="sec">
            <span className="tag">What it is evidence for</span>
            <Prose text={flow.evidence} />
          </div>
          <div className="sec">
            <span className="tag w" style={{ color: "var(--down)" }}>What it is NOT evidence for</span>
            <Prose text={flow.notEvidence} />
          </div>
          <div className="sec">
            <span className="tag w">What would tell you it is going wrong</span>
            <Prose text={flow.refute} />
          </div>
          <div className="sec">
            <span className="tag w">Second-order effects</span>
            <Prose text={flow.second} />
          </div>
          <div className="grid">
            <div className="grow">
              <span className="gnm">Horizon</span>
              <span className="gpx" />
              <span className="gch flat">{flow.horizon}</span>
            </div>
          </div>
          <div className="lrow">
            <button
              className="btn pri"
              onClick={() =>
                onAsk(
                  `Connect the structural flow "${flow.name}" (${flow.scale}) to whatever is on the terminal today. Where does this flow show up in current prices, and where does it not yet? Be explicit about the difference between what the flow proves and what it only suggests.`
                )
              }
            >
              Connect to today
            </button>
            <button
              className="btn"
              onClick={() =>
                onAsk(
                  `Make the strongest possible case that the capital flowing into "${flow.name}" is a misallocation. What are investors assuming, what historical analogue fits best, and what would the early warning look like?`
                )
              }
            >
              Argue the other side
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ========================================================================== */
/* FX: rates, positioning and the release calendar for the major pairs        */
/* ========================================================================== */

const FX_PAIRS = ["EUR_USD", "GBP_USD", "USD_JPY"];
const FX_NAMES = { USD: "US dollar", EUR: "Euro", GBP: "Pound", JPY: "Yen" };
const FX_BANKS = { USD: "Federal Reserve", EUR: "ECB", GBP: "Bank of England", JPY: "Bank of Japan" };
// Minutes either side of a release, by tier. A major release gets a wider
// berth than a second-tier one because it moves the whole dollar complex.
const FX_WINDOWS = { 1: [45, 20], 2: [15, 10] };

function fxUK(iso, withDay = true) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { timeZone: "Europe/London", weekday: withDay ? "short" : undefined,
    day: withDay ? "numeric" : undefined, month: withDay ? "short" : undefined, hour: "2-digit", minute: "2-digit" });
}

function fxIn(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ${m % 60} min`;
  return `${Math.round(h / 24)} days`;
}

function fxTouches(ev, pair) {
  const [b, q] = pair.split("_");
  const c = ev.currencies || [];
  return c.includes(b) || c.includes(q) || c.includes("ALL");
}

function fxStatus(pair, events, now) {
  for (const e of events) {
    if (!fxTouches(e, pair)) continue;
    const at = Date.parse(e.at), [pre, post] = FX_WINDOWS[e.tier === 1 ? 1 : 2];
    if (now >= at - pre * 60000 && now <= at + post * 60000) {
      return { paused: true, until: at + post * 60000, why: e.name };
    }
  }
  const next = events.find((e) => fxTouches(e, pair) && Date.parse(e.at) > now);
  return { paused: false, next };
}

function Spark({ values }) {
  if (!values || values.length < 2) return null;
  const lo = Math.min(...values, 0), hi = Math.max(...values, 0), rng = hi - lo || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 200},${38 - ((v - lo) / rng) * 34}`).join(" ");
  const zero = 38 - ((0 - lo) / rng) * 34;
  return (
    <svg viewBox="0 0 200 40" className="fxspark" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2="200" y1={zero} y2={zero} className="fxzero" />
      <polyline points={pts} />
    </svg>
  );
}

function FXScreen() {
  const [data, setData] = useState(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let alive = true;
    const load = () => fetch("/api/fx", { cache: "no-store" }).then((r) => r.json()).then((j) => alive && setData(j)).catch(() => {});
    load();
    const a = setInterval(load, 10 * 60000), b = setInterval(() => setNow(Date.now()), 30000);
    return () => { alive = false; clearInterval(a); clearInterval(b); };
  }, []);

  if (!data) return <div className="empty">Loading the currency data…</div>;
  const { rates = {}, positioning = {}, events = [] } = data;
  const nothing = !Object.keys(rates).length && !Object.keys(positioning).length && !events.length;
  if (nothing) {
    // The original line told the reader to run the ingest script, which only
    // makes sense to whoever owns the machine. On a public page it is noise, so
    // say what is true and show the reason if there is one.
    return <div className="empty">Currency data isn&apos;t available right now.{data.error ? ` (${data.error})` : ""}</div>;
  }
  const r2 = (v) => (v == null ? "–" : `${Number(v).toFixed(2)}%`);
  const gap = (a, b, f) => (rates[a]?.[f] != null && rates[b]?.[f] != null ? Number(rates[a][f]) - Number(rates[b][f]) : null);

  return (
    <>
      <div className="sec">
        <h3>Right now</h3>
        <div className="fxpairs">
          {FX_PAIRS.map((p) => {
            const s = fxStatus(p, events, now);
            return (
              <div key={p} className={"fxpair" + (s.paused ? " paused" : "")}>
                <div className="fxpn">{p.replace("_", "/")}</div>
                <div className={"fxst " + (s.paused ? "down" : "up")}>{s.paused ? "High event risk" : "Clear"}</div>
                <div className="fxsub">
                  {s.paused
                    ? `${s.why} — window ends ${fxUK(new Date(s.until).toISOString(), false)}`
                    : s.next ? `Next: ${s.next.name} in ${fxIn(Date.parse(s.next.at) - now)}` : "Nothing scheduled"}
                </div>
              </div>
            );
          })}
        </div>
        <p className="fxnote">In the 45 minutes before a major release and the 20 after it — 15 and 10 for smaller ones — a currency can move further in a second than a normal stop-loss allows, and the spread widens at the same moment. Systematic strategies commonly stand aside across these windows rather than guess the number.</p>
      </div>

      <div className="sec">
        <h3>Interest rates</h3>
        <div className="grid">
          <div className="ghead"><span>Currency</span><span>Policy rate · 2-year yield</span></div>
          {["USD", "EUR", "GBP", "JPY"].filter((c) => rates[c]).map((c) => (
            <div className="grow" key={c}>
              <span className="gnm">{FX_NAMES[c]} <span className="fxdim">· {FX_BANKS[c]}</span></span>
              <span className="gpx">{r2(rates[c].policy_rate)}</span>
              <span className="gch flat">{r2(rates[c].yield_2y)}</span>
            </div>
          ))}
        </div>
        <div className="grid">
          <div className="ghead"><span>Pair</span><span>Rate gap · 2-year gap</span></div>
          {FX_PAIRS.map((p) => {
            const [b, q] = p.split("_"), g1 = gap(b, q, "policy_rate"), g2 = gap(b, q, "yield_2y");
            const f = (v) => (v == null ? "–" : `${v > 0 ? "+" : ""}${v.toFixed(2)}`);
            return (
              <div className="grow" key={p}>
                <span className="gnm">{p.replace("_", "/")}</span>
                <span className={"gpx " + (g1 > 0 ? "up" : g1 < 0 ? "down" : "")}>{f(g1)}</span>
                <span className={"gch " + (g2 > 0 ? "up" : g2 < 0 ? "down" : "flat")}>{f(g2)}</span>
              </div>
            );
          })}
        </div>
        <p className="fxnote">A positive gap means the first currency pays more interest, which tends to support the pair over months, not minutes. The 2-year yield is what markets expect rates to average over the next two years, so it moves before the central bank does. No free source publishes UK or Japanese 2-year yields.{rates.USD?.asof ? ` Updated ${rates.USD.asof}.` : ""}</p>
      </div>

      <div className="sec">
        <h3>What big traders are betting</h3>
        {["EUR", "GBP", "JPY", "USD"].filter((c) => positioning[c]?.length).map((c) => {
          const rows = positioning[c], last = rows[rows.length - 1], rank = last.pct_rank;
          const tone = rank == null ? "" : rank >= 90 || rank <= 10 ? " extreme" : "";
          return (
            <div className={"fxpos" + tone} key={c}>
              <div className="fxposh">
                <b>{FX_NAMES[c]}</b>
                <span className={last.net_contracts >= 0 ? "up" : "down"}>
                  {last.net_contracts >= 0 ? "net long " : "net short "}{Math.abs(last.net_contracts).toLocaleString("en-GB")}
                </span>
              </div>
              <div className="fxbar" title="Where this sits against the last three years">
                <span style={{ left: `${rank ?? 50}%` }} />
              </div>
              <div className="fxsub">
                {rank == null ? "Not enough history to rank yet" : `${Math.round(rank)} / 100 against the last 3 years`}
                {tone && " · near an extreme"} · week of {last.report_date}
              </div>
              <Spark values={rows.slice(-52).map((r) => r.net_contracts)} />
            </div>
          );
        })}
        <p className="fxnote">Hedge funds' futures positions from the CFTC, published each Friday for the Tuesday before. Near an extreme means a crowded bet: worth knowing, because when everyone is on one side the exit can be sudden. It's background, not a trigger.</p>
      </div>

      <div className="sec">
        <h3>Release calendar</h3>
        <div className="grid">
          <div className="ghead"><span>Release (UK time)</span><span>Moves</span></div>
          {events.slice(0, 16).map((e, i) => (
            <div className="grow" key={i}>
              <span className="gnm">{e.name}{e.tier === 1 && <span className="fxtier">MAJOR</span>}</span>
              <span className="gpx">{fxUK(e.at)}</span>
              <span className="gch flat">{(e.currencies || []).join(" ")}</span>
            </div>
          ))}
          {!events.length && <div className="grow"><span className="gnm fxdim">No upcoming releases stored.</span><span /><span /></div>}
        </div>
        <p className="fxnote">Dates from the Fed, ECB, Bank of England, Bank of Japan, BLS, ONS and Eurostat. The Bank of Japan has no fixed announcement time, so it's covered by an early and a late marker.</p>
      </div>
    </>
  );
}

export default function Terminal() {
  const supabase = useMemo(() => browserClient(), []);

  const [screen, setScreen] = useState("HOME");
  // The sidebar starts open on a wide screen and closed on a phone, then
  // remembers whatever you do to it for the rest of the session.
  const [navOpen, setNavOpen] = useState(false);
  // The command bar was permanently in the way. It is still here, still with
  // history, but behind a key now: press / or the button.
  const [cmdOpen, setCmdOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [news, setNews] = useState(null);
  const [newsTopic, setNewsTopic] = useState("finance");
  const [newsBusy, setNewsBusy] = useState(false);
  const [cmd, setCmd] = useState("");
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [unknown, setUnknown] = useState("");
  const [doomTab, setDoomTab] = useState("crash");
  const [posCap, setPosCap] = useState(5000);
  const [posRisk, setPosRisk] = useState(2);
  const [clock, setClock] = useState("--:--:--");
  const [, tickWorld] = useState(0);

  const [reads, setReads] = useState({});
  const [user, setUser] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [quota, setQuota] = useState(null);

  const [msgs, setMsgs] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [agentInput, setAgentInput] = useState("");
  const [entries, setEntries] = useState([]);
  const [glosQ, setGlosQ] = useState("");
  const [wldQ, setWldQ] = useState("");
  const [wldOpenOnly, setWldOpenOnly] = useState(false);
  const [done, setDone] = useState({});
  const [tdone, setTdone] = useState({});
  const [peOn, setPe] = useState(false);
  const [jform, setJform] = useState({ t: "", 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" });
  const [semMode, setSemMode] = useState("seminar");
  const [semQ, setSemQ] = useState("");
  const [toast, setToast] = useState("");
  const [showLanding, setShowLanding] = useState(true);

  const lessonRefs = useRef({});
  const tutRefs = useRef({});

  /* ---- boot ---- */
  useEffect(() => {
    try {
      const h = (location.hash || "").replace("#", "").toUpperCase();
      const saved = localStorage.getItem("agdesk.screen");
      const seen = localStorage.getItem("agdesk.seen") === "1";
      if (CODES.includes(h)) { setScreen(h); setShowLanding(false); }
      else if (seen && CODES.includes(saved)) { setScreen(saved); setShowLanding(false); }
      else if (seen) setShowLanding(false);
      setDone(JSON.parse(localStorage.getItem("agdesk.done") || "{}"));
      setTdone(JSON.parse(localStorage.getItem("agdesk.tdone") || "{}"));
      setApiKey(localStorage.getItem("agdesk.key") || "");
      const pe = localStorage.getItem("agdesk.pe") === "1";
      setPe(pe);
      peState = pe;
    } catch {}
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      const p = (n) => String(n).padStart(2, "0");
      setClock(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
      tickWorld((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /* ---- data ---- */
  const loadFeed = useCallback(async () => {
    try {
      const r = await fetch("/api/feed", { cache: "no-store" });
      const j = await r.json();
      if (j?.reads) setReads(j.reads);
    } catch {}
  }, []);

  /**
   * Headlines for every stream at once.
   *
   * Deliberately not no-store: the route is cached at the edge for ten
   * minutes because the headlines are identical for every visitor. One fetch
   * serves everybody, which is why a news section costs nothing to run.
   */
  const loadNews = useCallback(async () => {
    setNewsBusy(true);
    try {
      const r = await fetch("/api/news");
      const j = await r.json();
      if (j?.streams) setNews(j);
    } catch {
      // Leave whatever we had; an empty section says so for itself.
    } finally {
      setNewsBusy(false);
    }
  }, []);

  const loadJournal = useCallback(async () => {
    try {
      const r = await fetch("/api/journal", { cache: "no-store" });
      const j = await r.json();
      setEntries(j.entries || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadFeed();
    const id = setInterval(loadFeed, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [loadFeed]);

  useEffect(() => {
    loadNews();
    const id = setInterval(loadNews, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [loadNews]);

  // Pick up whatever the inline boot script applied, so the button starts in
  // agreement with the page it is sitting on.
  useEffect(() => {
    try {
      setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    } catch {}
  }, []);

  const flipTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("agdesk-theme", next);
    } catch {
      // Private windows refuse storage; the choice simply will not persist.
    }
  }, [theme]);

  // Open the sidebar by default on a wide screen only. On a phone it would
  // cover the thing you came to read.
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 900) setNavOpen(true);
  }, []);

  // "/" opens the command bar from anywhere, unless you are typing.
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || "");
      if (e.key === "/" && !typing) {
        e.preventDefault();
        setCmdOpen(true);
        setTimeout(() => document.getElementById("cmd")?.focus(), 30);
      } else if (e.key === "Escape") {
        setCmdOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => sub?.subscription?.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (user) loadJournal();
    else setEntries([]);
  }, [user, loadJournal]);

  /* ---- navigation ---- */
  const go = useCallback((code, arg) => {
    let c = String(code || "").toUpperCase();
    if (ALIAS[c]) c = ALIAS[c];
    if (!CODES.includes(c)) return false;
    setScreen(c);
    setUnknown("");
    try {
      localStorage.setItem("agdesk.screen", c);
      history.length === 0 && null;
    } catch {}
    window.scrollTo({ top: 0 });
    if (arg) {
      const n = parseInt(arg, 10);
      setTimeout(() => {
        const map = c === "MTD" ? lessonRefs : c === "TUT" ? tutRefs : null;
        const el = map?.current?.[n];
        if (el) {
          el.querySelector("button")?.click();
          el.scrollIntoView({ block: "start", behavior: "smooth" });
        }
      }, 60);
    }
    return true;
  }, []);

  function runCmd() {
    const raw = cmd.trim();
    if (!raw) return;
    setHistory((h) => [raw, ...h]);
    setHistIdx(-1);
    const [head, arg] = raw.toUpperCase().split(/\s+/);
    setCmd("");
    if (head === "CLR" || head === "CLEAR") return void go("START");
    if (!go(head, arg)) {
      setUnknown(raw);
      setScreen("HELP");
    }
  }

  /* ---- agent ---- */
  async function ask(text) {
    const body = String(text || "").trim();
    if (!body || thinking) return;
    go("AGN");
    const next = [...msgs, { role: "user", content: body }];
    setMsgs(next);
    setAgentInput("");
    setThinking(true);
    try {
      const r = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next, apiKey: apiKey || undefined })
      });
      const j = await r.json();
      if (!r.ok) {
        setMsgs([...next, { role: "error", content: j.message || "The analyst could not answer that." }]);
      } else {
        setMsgs([...next, { role: "assistant", content: j.text }]);
        if (typeof j.remaining === "number") setQuota(j.remaining);
      }
    } catch {
      setMsgs([...next, { role: "error", content: "Network error. Try again." }]);
    } finally {
      setThinking(false);
    }
  }

  /* ---- journal ---- */
  function journalText() {
    const labels = ["Tape", "Balance sheet", "Positioning", "Levels", "Macro", "Contradiction"];
    return labels
      .map((l, i) => (jform[i + 1].trim() ? `${l}: ${jform[i + 1].trim()}` : ""))
      .filter(Boolean)
      .join("\n");
  }

  async function saveEntry() {
    const body = journalText();
    if (!body) return;
    const r = await fetch("/api/journal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: jform.t, body })
    });
    if (r.ok) {
      setJform({ t: "", 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" });
      setToast("Saved");
      setTimeout(() => setToast(""), 1500);
      loadJournal();
    } else {
      setToast(r.status === 401 ? "Sign in to save" : "Could not save");
      setTimeout(() => setToast(""), 2200);
    }
  }

  async function deleteEntry(id) {
    await fetch(`/api/journal?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    loadJournal();
  }

  /* ---- auth ---- */
  async function signIn(provider) {
    if (!supabase) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${origin}/auth/callback` }
    });
  }
  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setMsgs([]);
  }

  /* ---- derived ---- */
  const ag = reads.ag || FALLBACK_FEED;
  const agLive = Boolean(reads.ag);

  const worldRows = useMemo(() => {
    const q = wldQ.trim().toLowerCase();
    return EXCHANGES.map((e) => ({ e, st: exchangeStatus(e) }))
      .filter((r) => {
        if (wldOpenOnly && r.st.s !== "OPEN") return false;
        if (!q) return true;
        return `${r.e[0]} ${r.e[1]} ${r.e[2]} ${r.e[4]} ${r.e[7]}`.toLowerCase().includes(q);
      })
      .sort((a, b) => a.st.rank - b.st.rank || (a.e[7] < b.e[7] ? -1 : 1));
  }, [wldQ, wldOpenOnly, clock]);

  const openCount = useMemo(
    () => EXCHANGES.filter((e) => exchangeStatus(e).s === "OPEN").length,
    [clock]
  );

  function toggleDone(setter, storeKey, n) {
    setter((prev) => {
      const next = { ...prev, [n]: !prev[n] };
      try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const zoneKeysFor = (sc) => Object.keys(ZONES).filter((k) => ZONES[k].screen === sc);

  function enterDesk() {
    setShowLanding(false);
    try { localStorage.setItem("agdesk.seen", "1"); } catch {}
  }


  /* ====================================================================== */
  if (showLanding) {
    return (
      <div className="landing">
        <div className="landing-inner">
          <div className="landing-hero">
            <h1 className="landing-title">AG<span className="landing-dot">&middot;</span>DESK</h1>
            <p className="landing-sub">Markets intelligence. No noise.</p>
          </div>

          <div className="landing-features">
            <div className="landing-feat">
              <div className="landing-feat-icon">📡</div>
              <h3>160+ sources</h3>
              <p>Finance, politics, law and international relations — the four inputs that move prices, merged and deduplicated every 10 minutes.</p>
            </div>
            <div className="landing-feat">
              <div className="landing-feat-icon">🌍</div>
              <h3>29 exchanges</h3>
              <p>Live session status across five time zones. Asia, EMEA and Americas reads written against the numbers, not about them.</p>
            </div>
            <div className="landing-feat">
              <div className="landing-feat-icon">📉</div>
              <h3>AI bubble thesis</h3>
              <p>$300B capex vs $20B revenue. Interactive charts, position sizer, contagion mapping and the counter-arguments — all in one place.</p>
            </div>
            <div className="landing-feat">
              <div className="landing-feat-icon">🎓</div>
              <h3>Learn from zero</h3>
              <p>16 tutorials, economics, law, IR and politics frameworks. Plain English mode makes every term tappable.</p>
            </div>
          </div>

          <div className="landing-cta">
            <button className="landing-enter" onClick={enterDesk}>
              Open the desk →
            </button>
            {supabase && (
              <button className="landing-signin" onClick={() => signIn("google")}>
                Sign in with Google
              </button>
            )}
            <p className="landing-note">Free. 160+ news sources, 29 exchanges, 16 tutorials. No sign-up required.</p>
          </div>

          <div className="landing-foot">
            <p>Built for traders, students and anyone who reads markets seriously.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="topbar">
        <button
          className="navtoggle"
          aria-expanded={navOpen}
          aria-label={navOpen ? "Hide sections" : "Show sections"}
          onClick={() => setNavOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>

        <span className="sysname">AG&middot;DESK</span>

        <span className="tstat">
          <span className={"dot " + (agLive || Object.keys(reads).length ? "live" : "warn")} />
          {Object.keys(reads).length ? `${Object.keys(reads).length} zones` : "snapshot"}
        </span>

        <span className="tclock">{clock}</span>

        <span className="tspacer" />

        <button
          className="tbtn"
          aria-pressed={peOn}
          onClick={() => { const v = !peOn; setPe(v); setPEGlobal(v); }}
          title="Make jargon tappable everywhere"
        >
          Plain English
        </button>
        <button
          className="tbtn"
          onClick={flipTheme}
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
        <button
          className="tbtn"
          onClick={() => {
            setCmdOpen((v) => !v);
            setTimeout(() => document.getElementById("cmd")?.focus(), 30);
          }}
          title="Jump to a screen by code — or press /"
        >
          <span className="kbd">/</span> Command
        </button>
      </header>

      {cmdOpen && (
        <div className="cmdwrap">
          <div className="cmdbar">
            <span className="caret">&gt;</span>
            <input
              id="cmd"
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); runCmd(); setCmdOpen(false); }
                else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  if (history.length) {
                    const i = Math.min(histIdx + 1, history.length - 1);
                    setHistIdx(i); setCmd(history[i]);
                  }
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  if (histIdx > 0) { setHistIdx(histIdx - 1); setCmd(history[histIdx - 1]); }
                  else { setHistIdx(-1); setCmd(""); }
                }
              }}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck="false"
              placeholder="type a code — HELP for the list, Esc to close"
            />
            <button className="go" onClick={() => { runCmd(); setCmdOpen(false); }}>GO</button>
          </div>
        </div>
      )}

      <div className={"shell" + (navOpen ? " navopen" : "")}>
        <nav className="side" aria-label="Sections">
          {NAV_GROUPS.map(({ g, items }) => (
            <div className="navgroup" key={g}>
              <div className="navhead">{g}</div>
              {items.map((code) => {
                const sc = SCREENS.find((x) => x.c === code);
                if (!sc) return null;
                return (
                  <button
                    key={code}
                    className="navitem"
                    aria-current={screen === code}
                    title={sc.d}
                    onClick={() => {
                      go(code);
                      if (window.innerWidth < 900) setNavOpen(false);
                    }}
                  >
                    <span className="navcode">{code}</span>
                    <span className="navname">{sc.t}</span>
                  </button>
                );
              })}
            </div>
          ))}
          <div className="navfoot">
            Educational material, not investment advice.
          </div>
        </nav>

        {/* Tapping the page closes the drawer on a phone. */}
        {navOpen && <button className="scrim" aria-hidden onClick={() => setNavOpen(false)} />}

        <main className="stage">
          <div className="wrap">

          {/* ---------------- HOME ---------------- */}
          {screen === "HOME" && (
            <>
              {/* ── Welcome hero ── */}
              <div style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0 0 0.25rem", letterSpacing: "-0.01em" }}>
                  AG·DESK
                </h2>
                <p className="prose dim" style={{ margin: 0, fontSize: "0.88rem" }}>
                  Markets terminal. Agricultural commodities. World exchanges. Analysis desk.
                </p>
              </div>

              {/* ── Quick-access grid ── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.5rem", marginBottom: "1.5rem" }}>
                {[
                  { code: "NEWS", label: "Headlines", desc: "Live news feeds", icon: "◉" },
                  { code: "DESK", label: "Ag Brief", desc: "Commodity analysis", icon: "◈" },
                  { code: "WLD",  label: "World", desc: "29 exchanges", icon: "◎" },
                  { code: "DOOM", label: "Doomsday", desc: "AI bubble thesis", icon: "◆" },
                  { code: "AGN",  label: "Analyst", desc: "Ask anything", icon: "◇" },
                  { code: "FLOW", label: "Flows", desc: "Capital movements", icon: "◊" },
                ].map(q => (
                  <button key={q.code} onClick={() => go(q.code)}
                    style={{ padding: "0.75rem", border: "1px solid var(--rule)", borderRadius: "8px", cursor: "pointer",
                      background: "transparent", textAlign: "left", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                    <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--fg)" }}>{q.icon} {q.label}</span>
                    <span style={{ fontSize: "0.75rem", opacity: 0.6, color: "var(--fg)" }}>{q.desc}</span>
                  </button>
                ))}
              </div>

              {/* ── Market figures ── */}
              <FiguresBand reads={reads} onOpen={go} />

              {/* ── Headlines digest ── */}
              <Panel
                code="DIGEST"
                title="Headlines"
                meta={
                  news?.at
                    ? `Updated ${new Date(news.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                    : newsBusy
                    ? "Loading"
                    : ""
                }
              >
                <Digest streams={news?.streams} busy={newsBusy} />
              </Panel>

              {/* ── News by desk ── */}
              {(() => {
                const hasAny = NEWS_TABS.some(t => (news?.streams?.[t.k]?.items || []).length > 0);
                return (
                  <Panel
                    code="HOME"
                    title="By desk"
                    meta={
                      news?.at
                        ? `Updated ${new Date(news.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                        : newsBusy
                        ? "Loading"
                        : ""
                    }
                  >
                    {!hasAny && !newsBusy && (
                      <div className="empty">
                        Headlines refresh every 10 minutes. <button className="del" onClick={loadNews}>Refresh now</button>
                      </div>
                    )}
                    {!hasAny && newsBusy && (
                      <div className="empty">Fetching headlines<span className="loadingdots">...</span></div>
                    )}
                    <div className="deskgrid">
                      {NEWS_TABS.map((t) => (
                        <div className="sec asidesec" key={t.k}>
                          <div className="trackhead">
                            <span className="tl">{t.t}</span>
                            <button className="del" onClick={() => { setNewsTopic(t.k); go("NEWS"); }}>more</button>
                          </div>
                          <NewsList items={news?.streams?.[t.k]?.items || []} limit={4} empty="—" />
                        </div>
                      ))}
                    </div>
                  </Panel>
                );
              })()}

              {/* ── Doomsday quick glance ── */}
              <Panel code="DOOMGLANCE" title="Doomsday — AI bubble monitor">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  {CRASH_STATS.slice(0, 4).map((s, i) => (
                    <div key={i} style={{ padding: "0.5rem", border: "1px solid var(--rule)", borderRadius: "6px", borderLeft: `3px solid ${s.tone === "red" ? "var(--dn)" : "var(--accent-2)"}` }}>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: s.tone === "red" ? "var(--dn)" : "var(--accent-2)" }}>{s.value}</div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button className="btn" onClick={() => go("DOOM")} style={{ fontSize: "0.82rem" }}>Open Doomsday</button>
                  <span className="prose dim" style={{ fontSize: "0.78rem", alignSelf: "center" }}>
                    Thesis score: {VERDICT.thesis_score} · Crash data, circular fraud, positions, counter-thesis
                  </span>
                </div>
              </Panel>

              {/* ── Sessions ── */}
              <Panel code="SESSIONS" title="Where the sessions stand">
                <p className="prose dim">
                  Each zone is read at its open, midday and close. Figures come from official statistics; the
                  interpretation is written against them.
                </p>
                <div className="sessgrid">
                  {Object.keys(ZONES).map((k) => {
                    const r = reads[k];
                    return (
                      <button className="sesscard" key={k} onClick={() => go(ZONES[k].screen)}>
                        <span className="sl">{ZONES[k].label}</span>
                        <span className="sh">{r?.headline || "Tap to view session details →"}</span>
                        <span className="st">{r?.stamp || new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
                      </button>
                    );
                  })}
                </div>
              </Panel>

              {/* ── Getting started ── */}
              <Panel code="GETSTARTED" title="New here?">
                <p className="prose dim" style={{ margin: "0 0 0.75rem" }}>
                  Never traded before? This terminal assumes nothing.
                  Turn on <strong>Plain English</strong> at the top and any jargon becomes tappable.
                </p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button className="btn" onClick={() => go("START")}>Start from zero</button>
                  <button className="btn" onClick={() => go("RISK")} style={{ opacity: 0.8 }}>How people lose money</button>
                  <button className="btn" onClick={() => go("TUT")} style={{ opacity: 0.8 }}>Tutorials</button>
                </div>
              </Panel>
            </>
          )}

          {/* ---------------- NEWS ---------------- */}
          {screen === "NEWS" && (() => {
            const tab = NEWS_TABS.find((t) => t.k === newsTopic) || NEWS_TABS[0];
            const stream = news?.streams?.[tab.k];
            return (
              <Panel
                code="NEWS"
                title={tab.t}
                meta={news?.at ? new Date(news.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }).toUpperCase() : "LOADING"}
              >
                <div className="tabs">
                  {NEWS_TABS.map((t) => (
                    <button
                      key={t.k}
                      className="tab"
                      aria-current={newsTopic === t.k}
                      onClick={() => setNewsTopic(t.k)}
                    >
                      {t.t}
                    </button>
                  ))}
                </div>

                <p className="prose dim">{tab.d}</p>

                <NewsList
                  items={stream?.items || []}
                  empty={newsBusy ? "Fetching headlines…" : "Nothing retrieved for this stream."}
                />

                <div className="sec">
                  <h3>Coverage</h3>
                  <p className="prose dim">
                    {stream?.ok?.length
                      ? `Answered: ${stream.ok.join(", ")}.`
                      : "No publisher answered this stream on the last refresh."}
                    {stream?.failed?.length ? ` Unreachable: ${stream.failed.length}.` : ""}
                  </p>
                  <p className="prose dim">
                    Headlines and links only, drawn from each publisher&apos;s own feed and refreshed every ten
                    minutes. Follow a link to read the article at its source.
                  </p>
                  <button className="btn" onClick={loadNews} disabled={newsBusy}>
                    {newsBusy ? "Refreshing…" : "Refresh now"}
                  </button>
                </div>
              </Panel>
            );
          })()}

          {/* ---------------- START ---------------- */}
          {screen === "START" && (
            <Panel code="START" title="Never traded before">
              <div className="hero">
                <h2>You don&apos;t need to know anything yet</h2>
                <Prose text="This terminal covers the world's stock exchanges and the markets where the price of wheat, coffee and cooking oil gets decided. It assumes nothing. If you've never bought a share, never heard of a futures contract, and don't know what an option is, you're in the right place." />
                <p className="prose dim">
                  Turn on <b>Plain English</b> at the top and any jargon anywhere becomes tappable.
                  Tap a dotted word and the definition opens underneath it.
                </p>
              </div>

              <div className="sec">
                <h3>Three steps, in this order</h3>
                <div className="steps">
                  <div className="step">
                    <span className="sn">01</span>
                    <div>
                      <strong>Understand how people lose money — before anything else</strong>
                      <p>This is the step everyone skips, and skipping it is why most beginners lose. Four minutes, and the highest-value thing here.</p>
                      <div className="go2"><button className="btn pri" onClick={() => go("RISK")}>Open RISK</button></div>
                    </div>
                  </div>
                  <div className="step">
                    <span className="sn">02</span>
                    <div>
                      <strong>Work through the tutorials from zero</strong>
                      <p>Sixteen short lessons in four tracks: the basics, futures, options, then how to do it without blowing up. Each has a real story with real numbers.</p>
                      <div className="go2"><button className="btn" onClick={() => go("TUT")}>Open TUT</button></div>
                    </div>
                  </div>
                  <div className="step">
                    <span className="sn">03</span>
                    <div>
                      <strong>Read the markets with the analyst beside you</strong>
                      <p>Once the tutorials make sense, the reads stop looking like code. Anything you don&apos;t follow, ask.</p>
                      <div className="go2">
                        <button className="btn" onClick={() => go("WLD")}>Open WLD</button>{" "}
                        <button className="btn" onClick={() => go("AGN")}>Open AGN</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sec">
                <h3>A straight answer first</h3>
                <Prose text="Nothing here is a recommendation to trade. Futures and options are leveraged, which means a small price move can cost you far more than you put in, and most people who try them lose money. The honest reason to learn this is to understand how the world prices things — useful whether or not you ever place a trade." />
                <p className="prose dim">
                  If you do want to trade eventually: learn it here, practise with fake money for months, and only then
                  consider risking anything you can afford to lose entirely.
                </p>
              </div>

              <div className="sec">
                <h3>Ask anything, at any level</h3>
                <div className="chips">
                  {[
                    ["What is a futures contract?", "I have never traded anything in my life. Explain what a futures contract is using an everyday example, as if to someone with no finance background at all."],
                    ["Calls vs puts?", "Explain the difference between a call option and a put option to a complete beginner, with a simple everyday analogy and no jargon."],
                    ["Why is leverage dangerous?", "Explain in plain language why leverage is dangerous for beginners, with a worked example showing how someone can lose more than they deposited."],
                    ["Explain today simply", "Take whatever is on the terminal today and re-explain it as if I have never traded and know nothing about markets."]
                  ].map(([label, q]) => (
                    <button key={label} className="chip" onClick={() => ask(q)}>{label}</button>
                  ))}
                </div>
              </div>
            </Panel>
          )}

          {/* ---------------- RISK ---------------- */}
          {screen === "RISK" && (
            <Panel code="RISK" title="How money is actually lost" meta="read this first">
              <Prose text="Most beginner material explains how to place a trade and skips how people lose. That's backwards. Here is the evidence, then the six mechanisms." />
              <div className="statgrid">
                {[
                  ["88%", "of individual options traders lost money, in India's market regulator SEBI's study of financial year 2026"],
                  ["66%", "of individual futures traders lost money over the same period — better than options, still two in three"],
                  ["89%", "of traders under 30 lost money, the worst of any age group. Under-30s were 43% of all individual traders"],
                  ["92%", "of those traders' total losses came from equity options alone"]
                ].map(([n, l]) => (
                  <div className="stat" key={n}>
                    <span className="bignum">{n}</span>
                    <span className="statlab">{l}</span>
                  </div>
                ))}
              </div>
              <p className="prose dim">
                SEBI also found traders earning under ₹5 lakh a year made up roughly three-quarters of the group, did 43% of
                the turnover, and took 53% of the losses. Cumulative losses across five years to FY26 came to nearly ₹3.85 lakh
                crore. The figures are from one regulator and one market, but every regulator that has published this kind of
                study has found something similar.
              </p>
              {RISKS.map((r, i) => <Block key={i} {...r} />)}
              <div className="sec">
                <h3>What actually helps</h3>
                <Prose text="Three things, in order of how much they matter. First, position sizing — risking a small enough fraction of your money on any one idea that being wrong ten times in a row doesn't end you. Second, writing down why you're doing something before you do it, so you can tell skill from luck afterwards. Third, trading fake money for months until your written reasoning is consistently decent." />
                <p className="prose dim">
                  Notice that none of the three is about picking winners. The people who survive are not better forecasters.
                  They are better at surviving being wrong.
                </p>
                <div className="chips">
                  <button className="chip" onClick={() => go("TUT")}>Start the tutorials</button>
                  <button className="chip" onClick={() => ask("Explain position sizing to a complete beginner with a worked example: if I have £1,000 and risk 1% per trade, what does that actually mean in practice and how many losses in a row could I survive?")}>
                    Explain position sizing
                  </button>
                </div>
              </div>
            </Panel>
          )}

          {/* ---------------- TUT ---------------- */}
          {screen === "TUT" && (
            <Panel
              code="TUT"
              title="Tutorials from zero"
              meta={`${Object.values(tdone).filter(Boolean).length}/${TUTORIALS.length} DONE`}
            >
              <p className="prose dim">
                Sixteen lessons in four tracks. Start at the top and go in order — each assumes the ones before it.
                Type <code style={{ color: "var(--accent-2)" }}>TUT 7</code> to jump to a numbered lesson.
              </p>
              {["A", "B", "C", "D"].map((tr) => {
                const items = TUTORIALS.map((t, i) => ({ t, n: i + 1 })).filter((x) => x.t.tr === tr);
                if (!items.length) return null;
                return (
                  <div className="track" key={tr}>
                    <div className="trackhead">
                      <span className="tl">TRACK {tr}</span>
                      <span className="tt">{items[0].t.trn}</span>
                      <span className="tc">{items.length} lessons</span>
                    </div>
                    {items.map(({ t, n }) => (
                      <div key={n} ref={(el) => (tutRefs.current[n] = el)}>
                        <Collapsible
                          num={String(n).padStart(2, "0")}
                          title={t.t}
                          sub={t.s}
                          done={!!tdone[n]}
                          onToggleDone={() => toggleDone(setTdone, "agdesk.tdone", n)}
                        >
                          {t.b.map((para, i) => (
                            <p className="prose" key={i}
                               dangerouslySetInnerHTML={{
                                 __html: para.replace(/\*\*(.+?)\*\*/g, '<b style="color:var(--fg)">$1</b>')
                               }} />
                          ))}
                          <div className="sec">
                            <span className="tag">Worked through</span>
                            <Prose text={t.story} />
                          </div>
                          <div className="sec">
                            <span className="tag w">Where it bites</span>
                            <Prose text={t.risk} />
                          </div>
                          <div className="lrow">
                            <button className="btn" onClick={() => ask(t.q)}>Ask about this</button>
                          </div>
                        </Collapsible>
                      </div>
                    ))}
                  </div>
                );
              })}
            </Panel>
          )}

          {/* ---------------- GLOS ---------------- */}
          {screen === "GLOS" && (() => {
            const q = glosQ.trim().toLowerCase();
            const list = GLOSSARY.filter(
              ([t, d]) => !q || t.toLowerCase().includes(q) || d.toLowerCase().includes(q)
            );
            return (
              <Panel code="GLOS" title="Glossary" meta={`${list.length} TERMS`}>
                <p className="prose dim">
                  Every term this terminal uses, in plain English. Turn on Plain English at the top and these
                  definitions also appear inline wherever the word is used.
                </p>
                <div className="glosbar">
                  <input
                    type="text"
                    value={glosQ}
                    onChange={(e) => setGlosQ(e.target.value)}
                    placeholder="Filter terms — try margin, basis, theta"
                    autoComplete="off"
                  />
                  <button className="btn" onClick={() => setGlosQ("")}>Clear</button>
                </div>
                {list.length === 0 && <div className="empty">Nothing matches that. Try a shorter word, or ask on AGN.</div>}
                {list.map(([t, d]) => (
                  <div className="gterm" key={t}>
                    <b>{t}</b>
                    <span>{d}</span>
                  </div>
                ))}
              </Panel>
            );
          })()}

          {/* ---------------- WLD ---------------- */}
          {screen === "WLD" && (
            <Panel code="WLD" title="World exchanges" meta={`${openCount} OPEN NOW`}>
              <TVWidget widget="ticker-tape" config={TAPE_CONFIG} />
              <p className="prose dim">
                {EXCHANGES.length} exchanges, their local clock and whether they are trading right now. Computed live
                from your device clock, so it works whether or not a read has landed. Holidays are not accounted for.
              </p>
              <TVWidget widget="market-quotes" config={TV_CONFIGS.WLD} label="Benchmark levels, live" />
              <div className="glosbar">
                <input
                  type="text"
                  value={wldQ}
                  onChange={(e) => setWldQ(e.target.value)}
                  placeholder="Filter — try tokyo, dax, asia"
                  autoComplete="off"
                />
                <button className="btn" aria-pressed={wldOpenOnly} onClick={() => setWldOpenOnly((v) => !v)}>
                  {wldOpenOnly ? "Show all" : "Open only"}
                </button>
              </div>
              <div className="grid">
                <div className="ghead">
                  <span>Exchange · local time</span>
                  <span>status</span>
                </div>
                {worldRows.length === 0 && <div className="empty">Nothing matches that filter.</div>}
                {worldRows.map(({ e, st }) => (
                  <div className="grow" key={e[0]}>
                    <span className="gnm" title={`${e[1]} — ${e[4]}`}>{e[0]} · {e[2]}</span>
                    <span className="gpx">{st.t}  {e[4]}</span>
                    <span className={"gch " + (st.cls || "flat")}>{st.s}</span>
                  </div>
                ))}
              </div>
              <p className="prose dim">
                Session reads:{" "}
                <button className="btn" onClick={() => go("ASIA")}>ASIA</button>{" "}
                <button className="btn" onClick={() => go("EMEA")}>EMEA</button>{" "}
                <button className="btn" onClick={() => go("AMER")}>AMER</button>
              </p>
            </Panel>
          )}

          {/* ---------------- session screens ---------------- */}
          {["ASIA", "EMEA", "AMER"].includes(screen) && (
            <Panel
              code={screen}
              title={screen === "ASIA" ? "Asia-Pacific session" : screen === "EMEA" ? "Europe, Middle East & Africa" : "Americas session"}
              meta={zoneKeysFor(screen).map((k) => reads[k]?.stamp).filter(Boolean)[0]?.toUpperCase() || "AWAITING FIRST RUN"}
            >
              <TVWidget
                widget="market-quotes"
                config={TV_CONFIGS[screen]}
                label="Index levels, live from TradingView"
              />
              {zoneKeysFor(screen).map((k) => {
                const s = reads[k];
                return (
                  <div className="sec" key={k}>
                    <div className="trackhead">
                      <span className="tl">{k.toUpperCase()}</span>
                      <span className="tt">{ZONES[k].label}</span>
                      <span className="tc">{s?.stamp || "awaiting first run"}</span>
                    </div>
                    {!s && <div className="empty">No read yet. The scheduled job fills this at the open, midday and close of this zone.</div>}
                    {s && (
                      <>
                        {s.headline && <h2>{s.headline}</h2>}
                        {s.lede && <p className="prose dim">{s.lede}</p>}
                        <Grid title="Index moves" unit={(s.phase || "change").toUpperCase()} rows={s.rows} />
                        {(s.sections || []).map((sec, i) => <Block key={i} {...sec} />)}
                        {(s.watch || []).length > 0 && (
                          <div className="sec">
                            <h3>Into the next session</h3>
                            <Grid rows={(s.watch || []).map((w) => ({ nm: w.nm, px: "", ch: w.note, dir: "flat" }))} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </Panel>
          )}

          {/* ---------------- DESK ---------------- */}
          {screen === "DESK" && (
            <Panel code="DESK" title="Agricultural brief" meta={(ag.stamp || "").toUpperCase()}>
              <div className="sec">
                <h2>{ag.headline}</h2>
                <p className="prose dim">{ag.lede}</p>
              </div>
              {(ag.boards || []).map((b, i) => <Grid key={i} title={b.title} unit={b.unit} rows={b.rows} />)}
              {(ag.sections || []).map((s, i) => <Block key={i} {...s} />)}
              <p className="eyebrow">Run TRD for the underrated list · WCH for the watchlist · AGN to ask about any of it</p>
            </Panel>
          )}

          {screen === "GRN" && (
            <Panel code="GRN" title="Grains & oilseeds">
              <TVWidget widget="market-quotes" config={TV_CONFIGS.GRN} label="Grain futures, live" />
              {(ag.boards || []).filter((b) => b.kind !== "soft").map((b, i) => (
                <Grid key={i} title={b.title} unit={b.unit} rows={b.rows} />
              ))}
              <div className="sec">
                <h3>Key levels</h3>
                <Grid rows={ag.levels} />
              </div>
            </Panel>
          )}

          {screen === "SFT" && (
            <Panel code="SFT" title="Softs">
              <TVWidget widget="market-quotes" config={TV_CONFIGS.SFT} label="Softs futures, live" />
              {(ag.boards || []).filter((b) => b.kind === "soft").map((b, i) => (
                <Grid key={i} title={b.title} unit={b.unit} rows={b.rows} />
              ))}
              <Prose text={ag.softNote || ""} className="prose dim" />
            </Panel>
          )}

          {screen === "TRD" && (
            <Panel code="TRD" title="Underrated" meta="contradiction-screened">
              <Prose text="Each entry passes one test: the contradiction fits in a single sentence." className="prose dim" />
              {(ag.trades || []).map((t, i) => (
                <div className="card" key={i}>
                  <div className="ctop">
                    <h3>{t.name}</h3>
                    <span className="rk">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <Prose text={t.body} />
                  {t.contra && (
                    <div className="contra">
                      <b>Contradiction</b>
                      {t.contra}
                    </div>
                  )}
                </div>
              ))}
            </Panel>
          )}

          {screen === "WCH" && (
            <Panel code="WCH" title="Watchlist">
              <Grid
                title="Next sessions"
                unit="trigger"
                rows={(ag.watch || []).map((w) => ({ nm: w.nm, px: "", ch: w.note, dir: "flat" }))}
              />
            </Panel>
          )}

          {screen === "MAC" && (
            <Panel code="MAC" title="Macro overlay">
              <TVWidget widget="market-quotes" config={TV_CONFIGS.MAC} label="Rates, dollar and energy, live" />
              {(ag.macro || []).map((s, i) => <Block key={i} {...s} />)}
              {(ag.macro || []).length === 0 && <div className="empty">No macro section in the current read.</div>}
            </Panel>
          )}

          {screen === "FX" && (
            <Panel code="FX" title="Currencies" meta="EUR/USD · GBP/USD · USD/JPY">
              <FXScreen />
            </Panel>
          )}

          {/* ---------------- AGN ---------------- */}
          {screen === "AGN" && (
            <Panel
              code="AGN"
              title="Analyst"
              meta={apiKey ? "YOUR KEY · UNLIMITED" : quota != null ? `${quota} LEFT TODAY` : "SHARED"}
            >
              {!user && !apiKey && (
                <div className="gate">
                  <h3>Sign in to use the analyst</h3>
                  <p className="prose dim">
                    The analyst costs money to run, so it needs an account to keep usage fair. Signing in is free and
                    gives you {process.env.NEXT_PUBLIC_FREE_DAILY || 20} messages a day, plus a journal that saves.
                    Everything else on this terminal works without an account.
                  </p>
                  <div className="btnrow">
                    <button className="btn pri" onClick={() => signIn("google")}>Sign in with Google</button>
                    <button className="btn" onClick={() => go("SET")}>Use my own API key instead</button>
                  </div>
                </div>
              )}

              {(user || apiKey) && (
                <>
                  <div className="chips">
                    {[
                      ["WHAT CHANGED", "What changed in the reads since the last run, and what does it imply?"],
                      ["SCENARIO", "Give me one realistic scenario drawn from today's reads, 4-6 sentences with plausible numbers, ending in a single question about what I should conclude. Don't give the answer."],
                      ["QUIZ", "Ask me one multiple-choice question with four options testing part of the method against today's numbers. Don't reveal the answer."],
                      ["EXPLAIN", "Walk through today's reads and show how each conclusion was reached from the underlying data."],
                      ["STRESS TEST", "Which market on the terminal today has the weakest evidence behind it, and what would change your mind?"]
                    ].map(([label, q]) => (
                      <button key={label} className="chip" onClick={() => ask(q)}>{label}</button>
                    ))}
                  </div>

                  <div className="thread">
                    {msgs.length === 0 && (
                      <div className="msg ai">
                        <span className="who">AGN</span>
                        <div className="bub">
                          Terminal ready. Ask about any market on the board, any part of the method, or paste your own
                          analysis for marking.
                        </div>
                      </div>
                    )}
                    {msgs.map((m, i) => (
                      <div className={"msg " + (m.role === "user" ? "me" : m.role === "error" ? "ai err" : "ai")} key={i}>
                        <span className="who">{m.role === "user" ? "You" : "AGN"}</span>
                        <div className="bub">
                          {m.role === "user" ? m.content : <Markdown text={m.content} />}
                        </div>
                      </div>
                    ))}
                    {thinking && (
                      <div className="msg ai">
                        <span className="who">AGN</span>
                        <div className="bub">…</div>
                      </div>
                    )}
                  </div>

                  <div className="composer">
                    <div className="field">
                      <label htmlFor="agentInput">Query</label>
                      <textarea
                        id="agentInput"
                        rows={3}
                        value={agentInput}
                        onChange={(e) => setAgentInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); ask(agentInput); }
                        }}
                        placeholder="Ask about any market, term, or paste your own analysis to have it marked"
                      />
                    </div>
                    <div className="btnrow">
                      <button className="btn pri" disabled={thinking} onClick={() => ask(agentInput)}>
                        {thinking ? "Working" : "Send"}
                      </button>
                      <button className="btn" onClick={() => setMsgs([])}>Clear</button>
                    </div>
                  </div>
                </>
              )}
            </Panel>
          )}

          {/* ---------------- discipline screens ---------------- */}
          {DISCIPLINES.some((d) => d.code === screen) && (() => {
            const disc = DISCIPLINES.find((d) => d.code === screen);
            const count = disc.tracks.reduce((a, t) => a + t.items.length, 0);
            return (
              <Panel code={disc.code} title={disc.title} meta={`${count} FRAMEWORKS`}>
                <Prose text={disc.blurb} className="prose dim" />
                <p className="prose dim">
                  Every framework carries an <b>Apply to today</b> button. That sends the analyst the framework plus
                  whatever is currently on the terminal and asks it to do the thing you get marked on — use the model on
                  something real. <button className="btn" onClick={() => go("SEM")}>SEM</button> turns any of them into a
                  seminar contribution, essay plan or exam answer.
                </p>
                {disc.tracks.map((tr) => (
                  <div className="track" key={tr.name}>
                    <div className="trackhead">
                      <span className="tl">{disc.code}</span>
                      <span className="tt">{tr.name}</span>
                      <span className="tc">{tr.items.length} frameworks</span>
                    </div>
                    {tr.items.map((it, i) => (
                      <div className="lsn" key={it.t}>
                        <FrameworkCard item={it} num={String(i + 1).padStart(2, "0")} onAsk={ask} />
                      </div>
                    ))}
                  </div>
                ))}
              </Panel>
            );
          })()}

          {/* ---------------- SEM ---------------- */}
          {screen === "SEM" && (
            <Panel code="SEM" title="Seminar & essay workbench" meta={`${ALL_FRAMEWORKS.length} FRAMEWORKS`}>
              <Prose text="Pick what you're writing, pick a framework, and the analyst builds it against whatever the terminal is showing today. This is the part that does the job you are actually graded on: taking a model off the shelf and using it on something real." />
              <div className="sec">
                <h3>1 · What are you making</h3>
                <div className="chips">
                  {SEMINAR_MODES.map((m) => (
                    <button
                      key={m.key}
                      className="chip"
                      aria-pressed={semMode === m.key}
                      style={semMode === m.key ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
                      onClick={() => setSemMode(m.key)}
                    >
                      {m.label.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sec">
                <h3>2 · Which framework</h3>
                <div className="glosbar">
                  <input
                    type="text"
                    value={semQ}
                    onChange={(e) => setSemQ(e.target.value)}
                    placeholder="Filter — try trilemma, veto, dominance, hegemonic"
                    autoComplete="off"
                  />
                  <button className="btn" onClick={() => setSemQ("")}>Clear</button>
                </div>
                <div className="grid">
                  <div className="ghead"><span>Framework</span><span>discipline</span></div>
                  {ALL_FRAMEWORKS
                    .filter((f) => {
                      const q = semQ.trim().toLowerCase();
                      return !q || `${f.t} ${f.s} ${f.discipline} ${f.track}`.toLowerCase().includes(q);
                    })
                    .slice(0, 40)
                    .map((f) => (
                      <div className="grow" key={f.discipline + f.t}>
                        <span className="gnm">{f.t}</span>
                        <span className="gpx">
                          <button
                            className="btn sm"
                            onClick={() => {
                              const mode = SEMINAR_MODES.find((m) => m.key === semMode);
                              ask(
                                `${mode.prompt}\n\nFRAMEWORK: ${f.t} (${f.discipline}, ${f.track}) — ${f.s}\n\n${f.b}`
                              );
                            }}
                          >
                            Build
                          </button>
                        </span>
                        <span className="gch flat">{f.discipline}</span>
                      </div>
                    ))}
                </div>
              </div>
              <div className="sec">
                <h3>A word on how to use this</h3>
                <p className="prose dim">
                  What comes back is a scaffold, not an answer to hand in. The value is in seeing how a framework gets
                  applied to a live case and what the strongest objection looks like — then writing it yourself. Submitting
                  generated text as your own work is academic misconduct at every university on this list, and it reads
                  as generated to anyone who marks for a living.
                </p>
              </div>
            </Panel>
          )}


          {/* ---------------- FLOW ---------------- */}
          {screen === "FLOW" && (
            <Panel code="FLOW" title="Structural capital flows" meta={`${FLOWS.length} TRACKED`}>
              <Block {...FLOWS_PREFACE} />

              <div className="sec">
                <h3>The flows</h3>
                <p className="prose dim">
                  Each entry separates what the flow is reliable evidence for from what it is not evidence for, and
                  names what you would observe if it were going wrong. That last field is the one that matters.
                </p>
                {FLOWS.map((f, i) => (
                  <div className="lsn" key={f.name}>
                    <FlowCard flow={f} num={String(i + 1).padStart(2, "0")} onAsk={ask} />
                  </div>
                ))}
              </div>

              <div className="sec">
                <h3>Put two of them against each other</h3>
                <p className="prose dim">
                  The useful analytical move is rarely reading one flow. It is noticing where two of them compete for
                  the same physical input, the same fiscal space, or the same political permission.
                </p>
                <div className="chips">
                  <button className="chip" onClick={() => ask("Two of the largest capital flows in the world — AI data centre build-out and the energy transition — both depend on electricity supply and copper. Analyse how they compete, who wins, and what the binding constraint actually is.")}>
                    AI vs energy transition
                  </button>
                  <button className="chip" onClick={() => ask("Defence spending at a record $2.9 trillion and sovereign interest costs doubling toward $2.1 trillion are competing claims on the same budgets. Work through the fiscal arithmetic and say what gets cut.")}>
                    Defence vs debt service
                  </button>
                  <button className="chip" onClick={() => ask("Take the capital flow with the weakest evidence behind it and make the strongest case that the money is being misallocated. Name what the investors are assuming and why it might be wrong.")}>
                    Which flow is wrong
                  </button>
                  <button className="chip" onClick={() => ask("Pick two structural capital flows and identify a physical input, a fiscal constraint or a political permission they are both competing for. Then say which one is likely to win and why.")}>
                    Find a collision
                  </button>
                </div>
              </div>
            </Panel>
          )}

          {/* ---------------- MTD ---------------- */}
          {screen === "MTD" && (
            <Panel code="MTD" title="Method" meta={`${Object.values(done).filter(Boolean).length}/9 LEARNT`}>
              <p className="prose dim">
                Nine parts. Each carries the idea, the mechanism, a worked example, and what to watch.
                Type <code style={{ color: "var(--accent-2)" }}>MTD 4</code> to open one directly.
              </p>
              {METHOD.map((L, i) => {
                const n = i + 1;
                return (
                  <div key={n} ref={(el) => (lessonRefs.current[n] = el)}>
                    <Collapsible
                      num={`0${n}`}
                      title={L.t}
                      sub={L.i}
                      done={!!done[n]}
                      onToggleDone={() => toggleDone(setDone, "agdesk.done", n)}
                    >
                      <p className="prose" dangerouslySetInnerHTML={{ __html: L.b }} />
                      <div className="sec">
                        <span className="tag">Worked example</span>
                        <Prose text={L.w} />
                      </div>
                      <div className="sec">
                        <span className="tag w">What to watch</span>
                        <Prose text={L.k} />
                      </div>
                      <div className="lrow">
                        <button
                          className="btn"
                          onClick={() => ask(`Lesson ${n}: ${L.t} — ${L.i} Give me one scenario question using today's reads that tests whether I can apply this, then wait for my answer.`)}
                        >
                          Drill with AGN
                        </button>
                      </div>
                    </Collapsible>
                  </div>
                );
              })}
            </Panel>
          )}

          {/* ---------------- JRN ---------------- */}
          {screen === "JRN" && (
            <Panel code="JRN" title="Journal">
              {!user && (
                <div className="gate">
                  <h3>Sign in to save entries</h3>
                  <p className="prose dim">
                    Your journal is private to your account, which is why it needs one. You can still fill the form
                    below and send it to the analyst for marking without signing in.
                  </p>
                  <div className="btnrow">
                    <button className="btn pri" onClick={() => signIn("google")}>Sign in with Google</button>
                  </div>
                </div>
              )}
              <p className="prose dim">
                Six boxes, in order. The last is the test: if the contradiction won&apos;t fit in one sentence, you have a
                hunch rather than a trade.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <div className="field">
                  <label htmlFor="j0">Date / market</label>
                  <input id="j0" type="text" value={jform.t}
                         onChange={(e) => setJform({ ...jform, t: e.target.value })}
                         placeholder="21 OCT 2026 · DEC CORN" />
                </div>
                {["Tape", "Balance sheet", "Positioning", "Levels", "Macro", "Contradiction — one sentence"].map((lab, i) => (
                  <div className="field" key={i}>
                    <label htmlFor={`j${i + 1}`}>{String(i + 1).padStart(2, "0")} · {lab}</label>
                    <textarea id={`j${i + 1}`} rows={2} value={jform[i + 1]}
                              onChange={(e) => setJform({ ...jform, [i + 1]: e.target.value })} />
                  </div>
                ))}
                <div className="btnrow">
                  <button className="btn pri" onClick={saveEntry} disabled={!user}>Save</button>
                  <button
                    className="btn"
                    onClick={() => ask(
                      "Mark this analysis against the nine-part method. Give: a one-line verdict; what it gets right, specifically; the single biggest gap named against the part of the method it belongs to; one concrete question I should have asked of the data; and a score out of ten for the contradiction statement alone. Exacting but not discouraging.\n\nANALYSIS:\n" + journalText()
                    )}
                  >
                    Send for marking
                  </button>
                  {toast && <span className="quota">{toast}</span>}
                </div>
              </div>

              <div className="sec">
                <h3>Saved</h3>
                {entries.length === 0 && <div className="empty">No entries yet. The first one appears here once you save.</div>}
                {entries.map((e) => (
                  <div className="entry" key={e.id}>
                    <div className="emeta">
                      <span>{new Date(e.created_at).toLocaleString()}</span>
                      <button className="del" onClick={() => deleteEntry(e.id)}>Delete</button>
                    </div>
                    <h3>{e.title || "Untitled"}</h3>
                    <div className="etxt">{e.body}</div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* ---------------- SRC ---------------- */}
          {screen === "SRC" && (
            <Panel code="SRC" title="Sources">
              {Object.entries(reads).length === 0 && (ag.sources || []).length === 0 && (
                <div className="empty">No reads published yet, so there are no sources to list.</div>
              )}
              {Object.entries(reads).map(([zone, r]) => (
                (r.sources || []).length > 0 && (
                  <div className="sec" key={zone}>
                    <h3>{ZONES[zone]?.label || (zone === "ag" ? "Agricultural commodities" : zone)}</h3>
                    <div className="srcs">
                      {r.sources.map((s, i) => (
                        <a key={i} href={s.u} target="_blank" rel="noopener noreferrer">{s.t || s.u}</a>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </Panel>
          )}

          {/* ---------------- SET ---------------- */}
          {screen === "SET" && (
            <Panel code="SET" title="Settings">
              <div className="sec">
                <h3>Account</h3>
                {user ? (
                  <>
                    <p className="prose dim">Signed in as {user.email}.</p>
                    <div className="btnrow">
                      <button className="btn" onClick={signOut}>Sign out</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="prose dim">
                      Sign in to save your journal entries and get analyst messages. Everything else works without an account.
                    </p>
                    <div className="btnrow">
                      <button className="btn pri" onClick={() => signIn("google")}>Sign in with Google</button>
                    </div>
                  </>
                )}
              </div>

              <div className="sec">
                <h3>Your own API key</h3>
                <p className="prose dim">
                  Paste an Anthropic API key and the analyst runs on your account instead of the shared one: no daily
                  limit, no sign-in needed. The key is stored only in this browser and is sent to this site&apos;s server
                  solely to make your request. It is never saved anywhere.
                </p>
                <div className="keyrow">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                    autoComplete="off"
                  />
                  <button
                    className="btn pri"
                    onClick={() => {
                      try { localStorage.setItem("agdesk.key", apiKey.trim()); } catch {}
                      setToast("Key saved in this browser");
                      setTimeout(() => setToast(""), 2000);
                    }}
                  >
                    Save
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      setApiKey("");
                      try { localStorage.removeItem("agdesk.key"); } catch {}
                      setToast("Key removed");
                      setTimeout(() => setToast(""), 2000);
                    }}
                  >
                    Remove
                  </button>
                </div>
                {toast && <p className="quota">{toast}</p>}
                <p className="prose dim">
                  Keys are issued at console.anthropic.com. Usage is billed to you by Anthropic, not by this site.
                </p>
              </div>

              <div className="sec">
                <h3>Status</h3>
                <div className="grid">
                  <div className="grow"><span className="gnm">Account</span><span className="gpx" /><span className={"gch " + (user ? "up" : "flat")}>{user ? "SIGNED IN" : "SIGNED OUT"}</span></div>
                  <div className="grow"><span className="gnm">Own API key</span><span className="gpx" /><span className={"gch " + (apiKey ? "up" : "flat")}>{apiKey ? "SET" : "NOT SET"}</span></div>
                  <div className="grow"><span className="gnm">Messages left today</span><span className="gpx" /><span className="gch flat">{apiKey ? "unlimited" : quota != null ? quota : "—"}</span></div>
                  <div className="grow"><span className="gnm">Zones published</span><span className="gpx" /><span className="gch flat">{Object.keys(reads).length}</span></div>
                </div>
              </div>
            </Panel>
          )}


          {/* ---------------- TERMS ---------------- */}
          {screen === "TERMS" && (
            <Panel code="TERMS" title="Terms, disclaimer and data" meta="read before you rely on anything">
              <div className="sec">
                <h3>This is education, not advice</h3>
                <p className="prose">
                  Nothing on this site is financial, investment, legal or tax advice, and nothing here is a
                  recommendation to buy, sell or hold anything. No part of it is personalised to your circumstances,
                  because the site knows nothing about them. If you want advice, the person giving it should be
                  regulated to do so in your jurisdiction and should know your situation.
                </p>
                <p className="prose dim">
                  In the UK that regulator is the FCA; in the EU, your national competent authority under MiFID II; in
                  the US, the SEC or your state regulator. This site is not authorised by any of them and does not
                  hold itself out as being.
                </p>
              </div>

              <div className="sec">
                <h3>Leverage can take more than you put in</h3>
                <p className="prose">
                  Futures and options are leveraged instruments. Losses are not capped at your deposit, and a margin
                  call can close a position at a price you did not choose. Every regulator that has studied retail
                  derivatives trading has found most participants lose money. The RISK screen sets out the figures and
                  the six mechanisms.
                </p>
                <div className="chips">
                  <button className="chip" onClick={() => go("RISK")}>Open RISK</button>
                </div>
              </div>

              <div className="sec">
                <h3>Where the numbers come from, and their limits</h3>
                <p className="prose">
                  Market reads are compiled from public sources, each cited under SRC. This site carries no market-data
                  vendor&apos;s feed and no vendor&apos;s branding. Reads are produced by a language model researching
                  public sources on a schedule, which means they can be wrong, stale or incomplete. Every read carries
                  a timestamp. Check it before relying on a figure, and check the source before relying on it at all.
                </p>
                <p className="prose dim">
                  The world clock board is computed from your device clock and does not account for public holidays or
                  unscheduled closures.
                </p>
              </div>

              <div className="sec">
                <h3>Academic use</h3>
                <p className="prose">
                  The seminar and essay tools produce scaffolds for you to think with, not work to submit. Presenting
                  generated text as your own is academic misconduct at every university, and detection is not the
                  reason not to do it. Use the output to see how a framework gets applied, then write it yourself.
                </p>
              </div>

              <div className="sec">
                <h3>Your data</h3>
                <div className="grid">
                  <div className="grow"><span className="gnm">Account</span><span className="gpx">Email and name from your sign-in provider</span><span className="gch flat">stored</span></div>
                  <div className="grow"><span className="gnm">Journal entries</span><span className="gpx">Private to your account, enforced in the database</span><span className="gch flat">stored</span></div>
                  <div className="grow"><span className="gnm">Message count</span><span className="gpx">A daily tally, for the usage limit</span><span className="gch flat">stored</span></div>
                  <div className="grow"><span className="gnm">Your API key</span><span className="gpx">Kept in your browser; relayed to make your request</span><span className="gch up">never stored</span></div>
                  <div className="grow"><span className="gnm">Analyst conversations</span><span className="gpx">Held in the page only; cleared when you leave</span><span className="gch up">never stored</span></div>
                  <div className="grow"><span className="gnm">Lesson progress</span><span className="gpx">Your browser&apos;s local storage</span><span className="gch flat">on device</span></div>
                </div>
                <p className="prose dim">
                  Messages you send the analyst are processed by Anthropic to generate a reply. Deleting your account
                  removes your profile, journal and usage rows.
                </p>
              </div>

              <div className="sec">
                <h3>No warranty, and limits on liability</h3>
                <p className="prose">
                  The site is provided as it is, with no warranty that it will be accurate, available or fit for any
                  particular purpose. To the fullest extent the law allows, the operator is not liable for any loss
                  arising from your use of it or reliance on anything in it. Nothing here excludes liability that
                  cannot lawfully be excluded.
                </p>
                <p className="prose dim">
                  If you are deploying this yourself: replace this screen with terms drafted for your jurisdiction and
                  your circumstances before you take payment from anyone. This text is a starting point written to be
                  honest, not a substitute for advice from a solicitor.
                </p>
              </div>
            </Panel>
          )}

          {/* ---------------- DOOM ---------------- */}
          {screen === "DOOM" && (
            <Panel code="DOOM" title="Doomsday" meta="AI bubble short thesis + counter-thesis">
              {(() => {
                const DOOM_TABS = [
                  { k: "crash", t: "Crash Data" },
                  { k: "circular", t: "Circular Fraud" },
                  { k: "models", t: "Models" },
                  { k: "positions", t: "Positions" },
                  { k: "contagion", t: "Contagion" },
                  { k: "playbook", t: "Playbook" },
                  { k: "counter", t: "Counter-Thesis" },
                  { k: "stress", t: "Stress Test" },
                ];
                return (
                  <>
                    <div className="tabs" style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                      {DOOM_TABS.map(tb => (
                        <button key={tb.k} className={`tab ${doomTab === tb.k ? "on" : ""}`}
                          style={{
                            padding: "0.35rem 0.75rem", border: "1px solid var(--rule)",
                            borderRadius: "4px", cursor: "pointer", fontSize: "0.82rem",
                            background: doomTab === tb.k ? "var(--accent)" : "transparent",
                            color: doomTab === tb.k ? "#fff" : "var(--fg)",
                          }}
                          onClick={() => setDoomTab(tb.k)}>{tb.t}</button>
                      ))}
                    </div>

                    {/* ── CRASH DATA ── */}
                    {doomTab === "crash" && (
                      <div className="sec">
                        <h3>The First Break — 5 Nov 2026</h3>
                        <p className="prose dim">The day the AI bubble showed its first crack. Semiconductor stocks posted their worst single-day loss on record.</p>
                        <div className="figures-band" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", margin: "1rem 0" }}>
                          {CRASH_STATS.map((s, i) => (
                            <div key={i} style={{ padding: "0.75rem", border: "1px solid var(--rule)", borderRadius: "6px", borderLeft: `3px solid ${s.tone === "red" ? "var(--dn)" : "var(--accent-2)"}` }}>
                              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.tone === "red" ? "var(--dn)" : "var(--accent-2)" }}>{s.value}</div>
                              <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{s.label}</div>
                              <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{s.note}</div>
                            </div>
                          ))}
                        </div>
                        <h4>Closing Prices</h4>
                        <div className="grid">
                          {CRASH_TABLE.map(r => (
                            <div className="grow" key={r.ticker}>
                              <span className="gnm"><code>{r.ticker}</code> {r.name}</span>
                              <span className="gpx">{r.close}</span>
                              <span className={`gch ${r.drop.startsWith("-") ? "down" : "up"}`}>{r.drop}</span>
                            </div>
                          ))}
                        </div>
                        <h4 style={{ marginTop: "1.25rem" }}>Capex-to-Revenue Ratio vs Dot-Com Peak</h4>
                        <p className="prose dim">How much each company spends building AI infrastructure relative to AI revenue. The dot-com peak was 32%. Most AI companies are well above.</p>
                        <div style={{ overflowX: "auto", margin: "1rem 0" }}>
                          <svg viewBox="0 0 520 180" style={{ width: "100%", maxWidth: "520px", height: "auto" }}>
                            <line x1="50" y1="140" x2="490" y2="140" stroke="var(--rule)" strokeWidth="1"/>
                            {/* Dot-com reference line */}
                            <line x1="50" y1={140 - (32/90)*120} x2="490" y2={140 - (32/90)*120} stroke="var(--accent-2)" strokeWidth="1" strokeDasharray="6"/>
                            <text x="485" y={140 - (32/90)*120 - 4} fill="var(--accent-2)" fontFamily="var(--sans)" fontSize="8" textAnchor="end">Dot-com peak: 32%</text>
                            {CAPEX_RATIOS.map((r, i) => {
                              const x = 60 + i * 70;
                              const h = (r.ratio / 90) * 120;
                              const clr = r.ratio > 50 ? "var(--dn)" : r.ratio > 32 ? "var(--accent-2)" : "var(--up)";
                              return (
                                <g key={r.name}>
                                  <rect x={x} y={140 - h} width="48" height={h} rx="3" fill={clr} opacity="0.8"/>
                                  <text x={x + 24} y={140 - h - 4} fill={clr} fontFamily="var(--sans)" fontSize="9" fontWeight="700" textAnchor="middle">{r.ratio}%</text>
                                  <text x={x + 24} y="155" fill="var(--fg)" fontFamily="var(--sans)" fontSize="8" textAnchor="middle" opacity="0.6">{r.name}</text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>

                        <h4 style={{ marginTop: "1.25rem" }}>OpenAI Vendor Commitments ($B)</h4>
                        <p className="prose dim">$1.15T in total vendor commitments against $33B run-rate revenue. Leverage ratio: 35x.</p>
                        <div style={{ overflowX: "auto", margin: "1rem 0" }}>
                          <svg viewBox="0 0 520 180" style={{ width: "100%", maxWidth: "520px", height: "auto" }}>
                            <line x1="50" y1="150" x2="490" y2="150" stroke="var(--rule)" strokeWidth="1"/>
                            {VENDOR_COMMITS.map((v, i) => {
                              const x = 55 + i * 62;
                              const h = (v.value / 370) * 120;
                              return (
                                <g key={v.name}>
                                  <rect x={x} y={150 - h} width="50" height={h} rx="3" fill="var(--dn)" opacity={0.9 - i * 0.06}/>
                                  <text x={x + 25} y={150 - h - 4} fill="var(--dn)" fontFamily="var(--sans)" fontSize="8" fontWeight="700" textAnchor="middle">${v.value}B</text>
                                  <text x={x + 25} y="163" fill="var(--fg)" fontFamily="var(--sans)" fontSize="7" textAnchor="middle" opacity="0.6">{v.name}</text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* ── CIRCULAR FRAUD ── */}
                    {doomTab === "circular" && (
                      <div className="sec">
                        <h3>Circular Financing — The Thesis</h3>
                        <p className="prose">AI companies are buying into each other to inflate revenue and capex figures. The same money circulates, each entity counts it as revenue, and the stock prices rise on those figures. This is the Nortel/Enron playbook.</p>
                        <div className="figures-band" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", margin: "1rem 0" }}>
                          {CIRCULAR_STATS.map((s, i) => (
                            <div key={i} style={{ padding: "0.75rem", border: "1px solid var(--rule)", borderRadius: "6px", borderLeft: `3px solid ${s.tone === "red" ? "var(--dn)" : "var(--accent-2)"}` }}>
                              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.tone === "red" ? "var(--dn)" : "var(--accent-2)" }}>{s.value}</div>
                              <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{s.label}</div>
                              <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{s.note}</div>
                            </div>
                          ))}
                        </div>
                        <h4>The Five Loops</h4>
                        {LOOPS.map((l, i) => (
                          <Block key={i} title={l.name} startOpen={i === 0}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", margin: "0.5rem 0", fontSize: "0.85rem" }}>
                              <code style={{ padding: "0.2rem 0.5rem", background: "var(--rule)", borderRadius: "4px" }}>{l.from}</code>
                              <span style={{ opacity: 0.5 }}>{l.action} &rarr;</span>
                              <code style={{ padding: "0.2rem 0.5rem", background: "var(--rule)", borderRadius: "4px" }}>{l.to}</code>
                              <span style={{ opacity: 0.5 }}>&rarr; {l.back}</span>
                            </div>
                            <p className="prose dim">{l.note}</p>
                          </Block>
                        ))}
                      </div>
                    )}

                    {/* ── MODELS ── */}
                    {doomTab === "models" && (
                      <div className="sec">
                        <h3>Economic Models</h3>
                        <p className="prose dim">Charts and data models mapping capex trajectories, free cash flow burn, enterprise ROI gaps, and scenario analysis.</p>

                        {/* Capex vs AI Revenue SVG chart */}
                        <h4 style={{ marginTop: "1.25rem" }}>Hyperscaler Capex vs AI Revenue ($B)</h4>
                        <p className="prose dim">Aggregate Big-5 (MSFT, GOOG, AMZN, META, ORCL). The gap between the bars is money spent that hasn&apos;t come back yet.</p>
                        <div style={{ overflowX: "auto", margin: "1rem 0" }}>
                          <svg viewBox="0 0 600 280" style={{ width: "100%", maxWidth: "600px", height: "auto" }}>
                            {/* Grid */}
                            <line x1="60" y1="30" x2="60" y2="230" stroke="var(--rule)" strokeWidth="1"/>
                            <line x1="60" y1="230" x2="570" y2="230" stroke="var(--rule)" strokeWidth="1"/>
                            {[0, 250, 500, 750, 1000].map((v, i) => {
                              const y = 230 - (v / 1000) * 200;
                              return (
                                <g key={v}>
                                  <line x1="60" y1={y} x2="570" y2={y} stroke="var(--rule)" strokeWidth="0.5" strokeDasharray="4"/>
                                  <text x="55" y={y + 3} fill="var(--fg)" fontFamily="var(--sans)" fontSize="8" textAnchor="end" opacity="0.5">${v}B</text>
                                </g>
                              );
                            })}
                            {/* Bars */}
                            {CAPEX_VS_REVENUE.map((d, i) => {
                              const x = 75 + i * 72;
                              const capH = (d.capex / 1000) * 200;
                              const revH = (d.aiRev / 1000) * 200;
                              return (
                                <g key={i}>
                                  <rect x={x} y={230 - capH} width="28" height={capH} rx="2" fill="var(--dn)" opacity="0.8"/>
                                  <rect x={x + 30} y={230 - revH} width="28" height={revH} rx="2" fill="var(--up)" opacity="0.8"/>
                                  <text x={x + 14} y={230 - capH - 3} fill="var(--dn)" fontFamily="var(--sans)" fontSize="7" fontWeight="700" textAnchor="middle">${d.capex}B</text>
                                  <text x={x + 44} y={230 - revH - 3} fill="var(--up)" fontFamily="var(--sans)" fontSize="7" fontWeight="700" textAnchor="middle">${d.aiRev}B</text>
                                  <text x={x + 29} y="245" fill="var(--fg)" fontFamily="var(--sans)" fontSize="8" textAnchor="middle" opacity="0.6">{d.year}</text>
                                </g>
                              );
                            })}
                            {/* 2025 gap annotation */}
                            <line x1={75 + 3*72 + 58} y1={230 - (370/1000)*200} x2={75 + 3*72 + 58} y2={230 - (190/1000)*200} stroke="var(--accent-2)" strokeWidth="1.5" strokeDasharray="3"/>
                            <text x={75 + 3*72 + 65} y={230 - (280/1000)*200} fill="var(--accent-2)" fontFamily="var(--sans)" fontSize="8" fontWeight="700">$180B gap</text>
                            {/* Legend */}
                            <rect x="65" y="258" width="10" height="10" rx="1" fill="var(--dn)" opacity="0.8"/>
                            <text x="80" y="267" fill="var(--fg)" fontFamily="var(--sans)" fontSize="9" opacity="0.6">Capex</text>
                            <rect x="125" y="258" width="10" height="10" rx="1" fill="var(--up)" opacity="0.8"/>
                            <text x="140" y="267" fill="var(--fg)" fontFamily="var(--sans)" fontSize="9" opacity="0.6">AI Revenue</text>
                          </svg>
                        </div>

                        {/* FCF snapshot */}
                        <h4>Free Cash Flow Snapshot — Q1 2026 ($B)</h4>
                        <p className="prose dim">Cash flow after capex. Negative FCF means the company is spending more on AI infrastructure than it generates. Amazon is already there.</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", margin: "1rem 0" }}>
                          {HYPERSCALER_FCF.map((h, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.75rem", border: "1px solid var(--rule)", borderRadius: "6px",
                              borderLeft: `3px solid ${h.fcf < 0 ? "var(--dn)" : h.fcf < 15 ? "var(--accent-2)" : "var(--up)"}` }}>
                              <span style={{ fontWeight: 700, width: "5.5rem", flexShrink: 0 }}>{h.name}</span>
                              <div style={{ flex: 1, display: "flex", gap: "1rem", fontSize: "0.82rem", flexWrap: "wrap" }}>
                                <span>OpCF: ${h.opCF}B</span>
                                <span>Capex: ${h.capex}B</span>
                                <span style={{ fontWeight: 700, color: h.fcf < 0 ? "var(--dn)" : "var(--up)" }}>FCF: {h.fcf < 0 ? "-" : ""}${Math.abs(h.fcf)}B</span>
                                <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>YoY: {h.fcfYoY}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* ROI Gap */}
                        <h4 style={{ marginTop: "1.5rem" }}>Enterprise AI ROI Gap</h4>
                        <p className="prose">{ROI_GAP.headline}</p>
                        <div className="figures-band" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", margin: "1rem 0" }}>
                          {ROI_GAP.stats.map((s, i) => (
                            <div key={i} style={{ padding: "0.6rem", border: "1px solid var(--rule)", borderRadius: "6px", borderLeft: `3px solid ${s.tone === "red" ? "var(--dn)" : "var(--accent-2)"}` }}>
                              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: s.tone === "red" ? "var(--dn)" : "var(--accent-2)" }}>{s.value}</div>
                              <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>{s.label}</div>
                              <div style={{ fontSize: "0.7rem", opacity: 0.5 }}>{s.source}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ padding: "0.75rem", background: "var(--rule)", borderRadius: "6px", fontSize: "0.85rem", fontStyle: "italic" }}>
                          {ROI_GAP.paradox}
                        </div>

                        {/* Scenario analysis */}
                        <h4 style={{ marginTop: "1.5rem" }}>Scenario Analysis</h4>
                        <p className="prose dim">Three paths for the AI economy and what each means for the short thesis.</p>
                        {SCENARIOS.map((sc, i) => (
                          <Block key={i} title={`${sc.name} — ${sc.probability}`} startOpen={i === 1}>
                            <div style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "3px", display: "inline-block", marginBottom: "0.5rem",
                              background: sc.tone === "green" ? "var(--up)" : sc.tone === "red" ? "var(--dn)" : "var(--accent-2)",
                              color: "#fff" }}>
                              {sc.thesis_outcome}
                            </div>
                            <p className="prose dim">{sc.description}</p>
                            <div style={{ fontSize: "0.82rem", fontWeight: 600, margin: "0.5rem 0 0.25rem" }}>Triggers:</div>
                            <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.82rem", opacity: 0.8 }}>
                              {sc.triggers.map((t, j) => <li key={j}>{t}</li>)}
                            </ul>
                            <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", borderRadius: "6px", background: "var(--rule)", fontSize: "0.82rem" }}>
                              <strong>Position impact:</strong> {sc.position_impact}
                            </div>
                            {sc.what_you_lose && (
                              <div style={{ marginTop: "0.35rem", padding: "0.5rem 0.75rem", borderRadius: "6px", background: "var(--rule)", fontSize: "0.82rem" }}>
                                <strong>Capital at risk:</strong> {sc.what_you_lose}
                              </div>
                            )}
                          </Block>
                        ))}

                        {/* Leverage risk table */}
                        <h4 style={{ marginTop: "1.5rem" }}>Leverage Risk Calculator (10x spread bet)</h4>
                        <p className="prose dim">What happens to your margin at typical 10x spread betting leverage. A 5% move against you isn&apos;t a 5% loss — it&apos;s a 50% loss.</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", margin: "1rem 0" }}>
                          {RISK_MODEL.scenarios.map((s, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.75rem", fontSize: "0.82rem",
                              border: "1px solid var(--rule)", borderRadius: "6px",
                              borderLeft: `3px solid ${s.survive ? "var(--up)" : "var(--dn)"}`,
                              opacity: s.survive ? 1 : 0.85 }}>
                              <span style={{ fontWeight: 700, width: "3.5rem", flexShrink: 0, color: s.move.startsWith("+") ? "var(--dn)" : "var(--up)" }}>{s.move}</span>
                              <span style={{ width: "4.5rem", flexShrink: 0 }}>{s.leveraged}</span>
                              <span style={{ flex: 1 }}>{s.margin}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── POSITIONS ── */}
                    {doomTab === "positions" && (
                      <div className="sec">
                        <h3>Short Positions — Spread Betting</h3>
                        <p className="prose dim">Via IG Markets or CMC Markets. Spread betting is tax-free in the UK (no CGT). <strong>Not financial advice.</strong></p>

                        {/* Interactive position sizer */}
                        <div style={{ padding: "1rem", border: "1px solid var(--accent)", borderRadius: "8px", margin: "1rem 0" }}>
                          <h4 style={{ margin: "0 0 0.75rem", color: "var(--accent)" }}>Position Sizer</h4>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                            <label style={{ fontSize: "0.78rem", opacity: 0.7, minWidth: "100px" }}>Starting capital</label>
                            <input type="range" min="500" max="50000" step="500" value={posCap}
                              onChange={e => setPosCap(Number(e.target.value))}
                              style={{ flex: 1, minWidth: "120px", accentColor: "var(--dn)" }}/>
                            <span style={{ fontWeight: 700, color: "var(--dn)", fontSize: "0.85rem", minWidth: "60px", textAlign: "right" }}>
                              £{posCap.toLocaleString()}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                            <label style={{ fontSize: "0.78rem", opacity: 0.7, minWidth: "100px" }}>Max risk per trade</label>
                            <input type="range" min="0.5" max="5" step="0.5" value={posRisk}
                              onChange={e => setPosRisk(Number(e.target.value))}
                              style={{ flex: 1, minWidth: "120px", accentColor: "var(--dn)" }}/>
                            <span style={{ fontWeight: 700, color: "var(--dn)", fontSize: "0.85rem", minWidth: "60px", textAlign: "right" }}>
                              {posRisk}%
                            </span>
                          </div>
                        </div>

                        {/* Position table */}
                        <div style={{ overflowX: "auto", margin: "1rem 0" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--rule)" }}>
                                {["Tier", "Target", "Entry", "Stop", "Target $", "Size", "Risk £"].map(h => (
                                  <th key={h} style={{ padding: "0.5rem", textAlign: "left", fontSize: "0.7rem", textTransform: "uppercase",
                                    letterSpacing: "0.06em", opacity: 0.6, whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {POSITIONS.map(p => {
                                const riskPerTrade = posCap * (posRisk / 100);
                                const stopDist = Math.abs(p.stop - p.entry);
                                const ppl = stopDist > 0 ? riskPerTrade / stopDist : 0;
                                return (
                                  <tr key={p.ticker} style={{ borderBottom: "1px solid var(--rule)" }}>
                                    <td style={{ padding: "0.5rem" }}>
                                      <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "3px",
                                        background: p.tier === 1 ? "var(--dn)" : p.tier === 2 ? "var(--accent-2)" : "var(--rule)",
                                        color: p.tier <= 2 ? "#fff" : "inherit" }}>Tier {p.tier}</span>
                                    </td>
                                    <td style={{ padding: "0.5rem" }}>
                                      <strong><code>{p.ticker}</code></strong>
                                      <div style={{ fontSize: "0.7rem", opacity: 0.6, maxWidth: "180px" }}>{p.reason}</div>
                                    </td>
                                    <td style={{ padding: "0.5rem", fontVariantNumeric: "tabular-nums" }}>${p.entry}</td>
                                    <td style={{ padding: "0.5rem", color: "var(--dn)", fontVariantNumeric: "tabular-nums" }}>${p.stop}</td>
                                    <td style={{ padding: "0.5rem", color: "var(--up)", fontVariantNumeric: "tabular-nums" }}>${p.target}</td>
                                    <td style={{ padding: "0.5rem", fontVariantNumeric: "tabular-nums" }}>£{ppl.toFixed(2)}/pt</td>
                                    <td style={{ padding: "0.5rem", color: "var(--dn)", fontVariantNumeric: "tabular-nums" }}>£{riskPerTrade.toFixed(0)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div style={{ fontSize: "0.7rem", opacity: 0.5, marginBottom: "1rem" }}>
                          Sizes auto-calculated from your capital and risk %. Prices from Nov 5 close.
                        </div>

                        <div style={{ padding: "0.75rem", background: "var(--rule)", borderRadius: "6px", fontSize: "0.82rem" }}>
                          <strong>Risk rules:</strong> Never risk more than {posRisk}% of capital per position. Max 3 positions at once. Always use a stop loss. Take profit in thirds: close ⅓ at +15%, move stop to breakeven, trail the rest. If drawdown hits 10%, close everything.
                        </div>
                      </div>
                    )}

                    {/* ── CONTAGION ── */}
                    {doomTab === "contagion" && (
                      <div className="sec">
                        <h3>Contagion Map</h3>
                        <p className="prose dim">The AI bust doesn&apos;t stay in tech. These are the knock-on sectors already showing stress.</p>
                        <div className="figures-band" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", margin: "1rem 0" }}>
                          {CONTAGION_STATS.map((s, i) => (
                            <div key={i} style={{ padding: "0.75rem", border: "1px solid var(--rule)", borderRadius: "6px", borderLeft: `3px solid ${s.tone === "red" ? "var(--dn)" : "var(--accent-2)"}` }}>
                              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.tone === "red" ? "var(--dn)" : "var(--accent-2)" }}>{s.value}</div>
                              <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{s.label}</div>
                              <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{s.note}</div>
                            </div>
                          ))}
                        </div>
                        <h4>Sector Impact</h4>
                        {CONTAGION_CARDS.map((c, i) => (
                          <Block key={i} title={c.title} startOpen={i < 2}>
                            <p className="prose dim">{c.body}</p>
                          </Block>
                        ))}
                        <h4 style={{ marginTop: "1.25rem" }}>Contagion Chain</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {CONTAGION_CHAIN.map((s, i) => (
                            <div key={i} style={{
                              padding: "0.6rem 0.75rem", borderRadius: "6px", fontSize: "0.85rem",
                              borderLeft: `3px solid ${s.tone === "red" ? "var(--dn)" : s.tone === "amber" ? "var(--accent-2)" : "var(--rule)"}`,
                              background: "var(--rule)", opacity: s.tone === "dim" ? 0.6 : 1,
                            }}>
                              <strong>{s.stage}:</strong> {s.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── PLAYBOOK ── */}
                    {doomTab === "playbook" && (
                      <div className="sec">
                        <h3>Execution Playbook</h3>
                        <p className="prose dim">Step-by-step timeline for entering short positions via UK spread betting. Read the Counter-Thesis tab first.</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                          {PLAYBOOK.map((p, i) => (
                            <div key={i} style={{ padding: "0.75rem", border: "1px solid var(--rule)", borderRadius: "6px" }}>
                              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.35rem" }}>{p.when}</div>
                              <p className="prose dim" style={{ margin: 0 }}>{p.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── COUNTER-THESIS ── */}
                    {doomTab === "counter" && (
                      <div className="sec">
                        <h3>Counter-Thesis — What Blows This Up</h3>
                        <p className="prose">Every short thesis needs a kill list: the things that, if true, make you wrong. These are the strongest counterarguments and the evidence behind them.</p>
                        <div className="figures-band" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", margin: "1rem 0" }}>
                          {COUNTER_STATS.map((s, i) => (
                            <div key={i} style={{ padding: "0.75rem", border: "1px solid var(--rule)", borderRadius: "6px", borderLeft: "3px solid var(--up)" }}>
                              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--up)" }}>{s.value}</div>
                              <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{s.label}</div>
                              <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{s.note}</div>
                            </div>
                          ))}
                        </div>
                        {COUNTER_ARGS.map((c, i) => (
                          <Block key={i} title={`${c.risk === "CRITICAL" ? "⚠️ " : ""}${c.title}`} startOpen={i < 3}>
                            <div style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "3px", display: "inline-block", marginBottom: "0.5rem",
                              background: c.risk === "CRITICAL" ? "var(--dn)" : c.risk === "HIGH" ? "var(--accent-2)" : "var(--rule)",
                              color: c.risk === "CRITICAL" ? "#fff" : "inherit" }}>
                              RISK: {c.risk}
                            </div>
                            <p className="prose dim">{c.body}</p>
                            <p className="prose" style={{ fontStyle: "italic", opacity: 0.8 }}>{c.implication}</p>
                          </Block>
                        ))}

                        <div style={{ marginTop: "1.5rem", padding: "1rem", border: "2px solid var(--accent)", borderRadius: "8px" }}>
                          <h4 style={{ margin: "0 0 0.5rem" }}>Verdict: {VERDICT.thesis_score}</h4>
                          <p className="prose dim">{VERDICT.summary}</p>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.75rem" }}>
                            <div style={{ padding: "0.5rem", borderRadius: "6px", background: "var(--rule)" }}>
                              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--up)", marginBottom: "0.25rem" }}>STRONGEST POINT</div>
                              <div style={{ fontSize: "0.82rem" }}>{VERDICT.strongest_point}</div>
                            </div>
                            <div style={{ padding: "0.5rem", borderRadius: "6px", background: "var(--rule)" }}>
                              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--dn)", marginBottom: "0.25rem" }}>WEAKEST POINT</div>
                              <div style={{ fontSize: "0.82rem" }}>{VERDICT.weakest_point}</div>
                            </div>
                          </div>
                          <div style={{ marginTop: "0.75rem", padding: "0.5rem", borderRadius: "6px", background: "var(--rule)" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.25rem" }}>RECOMMENDATION</div>
                            <div style={{ fontSize: "0.82rem" }}>{VERDICT.recommendation}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── STRESS TEST ── */}
                    {doomTab === "stress" && (
                      <div className="sec">
                        <h3>Thesis Stress Test</h3>
                        <p className="prose">Factor-by-factor scoring: bull case vs bear case, weighted by importance to the trade. This is the honest answer to &quot;should I actually do this?&quot;</p>

                        {/* Factor bars */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", margin: "1.25rem 0" }}>
                          {STRESS_TEST.factors.map((f, i) => {
                            const total = f.bull_score + f.bear_score;
                            const bullPct = (f.bull_score / 10) * 100;
                            const bearPct = (f.bear_score / 10) * 100;
                            return (
                              <Block key={i} title={`${f.name} (weight: ${f.weight}%)`} startOpen={i < 2}>
                                <div style={{ display: "flex", gap: "0.5rem", margin: "0.5rem 0", fontSize: "0.82rem" }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--up)", marginBottom: "0.2rem" }}>BULL: {f.bull_score}/10</div>
                                    <div style={{ height: "8px", background: "var(--rule)", borderRadius: "4px", overflow: "hidden" }}>
                                      <div style={{ height: "100%", width: `${bullPct}%`, background: "var(--up)", borderRadius: "4px" }} />
                                    </div>
                                    <p className="prose dim" style={{ margin: "0.35rem 0 0", fontSize: "0.78rem" }}>{f.bull_case}</p>
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--dn)", marginBottom: "0.2rem" }}>BEAR: {f.bear_score}/10</div>
                                    <div style={{ height: "8px", background: "var(--rule)", borderRadius: "4px", overflow: "hidden" }}>
                                      <div style={{ height: "100%", width: `${bearPct}%`, background: "var(--dn)", borderRadius: "4px" }} />
                                    </div>
                                    <p className="prose dim" style={{ margin: "0.35rem 0 0", fontSize: "0.78rem" }}>{f.bear_case}</p>
                                  </div>
                                </div>
                                <div style={{ padding: "0.5rem 0.75rem", background: "var(--rule)", borderRadius: "6px", fontSize: "0.82rem", fontStyle: "italic", marginTop: "0.5rem" }}>
                                  {f.verdict}
                                </div>
                              </Block>
                            );
                          })}
                        </div>

                        {/* Overall score */}
                        <div style={{ padding: "1rem", border: "2px solid var(--accent)", borderRadius: "8px", marginTop: "1.5rem" }}>
                          <h4 style={{ margin: "0 0 0.75rem" }}>Overall Score</h4>
                          <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
                            <div style={{ flex: 1, padding: "0.75rem", borderRadius: "6px", background: "var(--rule)", textAlign: "center" }}>
                              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--up)" }}>{STRESS_TEST.overall.bull_weighted}</div>
                              <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>Bull (counter-thesis)</div>
                            </div>
                            <div style={{ flex: 1, padding: "0.75rem", borderRadius: "6px", background: "var(--rule)", textAlign: "center" }}>
                              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--dn)" }}>{STRESS_TEST.overall.bear_weighted}</div>
                              <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>Bear (your thesis)</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", height: "12px", borderRadius: "6px", overflow: "hidden", marginBottom: "0.75rem" }}>
                            <div style={{ width: `${(STRESS_TEST.overall.bull_weighted / (STRESS_TEST.overall.bull_weighted + STRESS_TEST.overall.bear_weighted)) * 100}%`, background: "var(--up)" }} />
                            <div style={{ flex: 1, background: "var(--dn)" }} />
                          </div>
                          <p className="prose" style={{ fontStyle: "italic" }}>{STRESS_TEST.overall.interpretation}</p>
                        </div>

                        {/* Revised strategy */}
                        <h3 style={{ marginTop: "2rem" }}>{REVISED_STRATEGY.headline}</h3>
                        <p className="prose">{REVISED_STRATEGY.tl_dr}</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                          {REVISED_STRATEGY.adjustments.map((a, i) => (
                            <div key={i} style={{ padding: "0.75rem", border: "1px solid var(--rule)", borderRadius: "6px",
                              borderLeft: `3px solid ${a.action.startsWith("DROP") ? "var(--dn)" : a.action.startsWith("KEEP") ? "var(--up)" : a.action.startsWith("WATCH") ? "var(--accent-2)" : "var(--accent)"}` }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                                <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "3px",
                                  background: a.action.startsWith("DROP") ? "var(--dn)" : a.action.startsWith("KEEP") ? "var(--up)" : a.action.startsWith("WATCH") ? "var(--accent-2)" : "var(--accent)",
                                  color: "#fff" }}>
                                  {a.action}
                                </span>
                                {a.tickers && a.tickers.map(t => (
                                  <code key={t} style={{ fontSize: "0.78rem", padding: "0.1rem 0.35rem", background: "var(--rule)", borderRadius: "3px" }}>{t}</code>
                                ))}
                              </div>
                              <p className="prose dim" style={{ margin: 0 }}>{a.reason || a.detail}</p>
                            </div>
                          ))}
                        </div>

                        <div style={{ marginTop: "1.5rem", padding: "1rem", background: "var(--rule)", borderRadius: "8px" }}>
                          <h4 style={{ margin: "0 0 0.5rem", color: "var(--accent)" }}>Bottom line</h4>
                          <p className="prose" style={{ margin: 0 }}>The counter-thesis doesn&apos;t destroy your position — it sharpens it. The circular financing observation is real. The enterprise ROI gap is real. The FCF deterioration is real. But the original playbook was too aggressive: too many positions, too much leverage, too short a time horizon, and it included targets (NVDA, META) where the counter-thesis is strongest. Drop those. Focus on neoclouds. Reduce leverage. Extend your timeline. And paper trade first — being right about the thesis but wrong about the timing is the same as being wrong.</p>
                        </div>
                      </div>
                    )}

                    <div className="sec" style={{ marginTop: "1.5rem" }}>
                      <h4>Sources</h4>
                      <div className="grid">
                        {DOOM_SOURCES.map((s, i) => (
                          <div className="grow" key={i}>
                            <span className="gnm">{s.t}</span>
                            <a href={s.u} target="_blank" rel="noopener noreferrer" className="gpx" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{s.u}</a>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </Panel>
          )}

          {/* ---------------- HELP ---------------- */}
          {screen === "HELP" && (
            <Panel code="HELP" title="Command reference">
              {unknown && <div className="notice warn">Unknown command &quot;{unknown}&quot;. Valid codes are listed below.</div>}
              <div className="cmdtable">
                {SCREENS.map((s) => (
                  <div className="cmdrow" key={s.c}>
                    <code>{s.c}</code>
                    <span>{s.d}</span>
                  </div>
                ))}
                <div className="cmdrow"><code>CLR</code><span>Back to the start screen</span></div>
                <div className="cmdrow"><code>1–9</code><span>Shortcuts to the first nine screens</span></div>
                <div className="cmdrow"><code>TUT n</code><span>Open tutorial n directly; MTD n does the same for the method</span></div>
              </div>
              <div className="sec">
                <h3>Keys</h3>
                <div className="cmdtable">
                  <div className="cmdrow"><code>↑ ↓</code><span>Previous commands, in the command line</span></div>
                  <div className="cmdrow"><code>ENTER</code><span>Run the command</span></div>
                  <div className="cmdrow"><code>⌘/CTRL+↵</code><span>Send, in the analyst query box</span></div>
                </div>
              </div>
              <div className="sec">
                <h3>About the reads</h3>
                <p className="prose dim">
                  Scheduled jobs publish market reads at the open, midday and close of five time zones, plus a daily
                  agricultural read. The terminal reads those, so an open page refreshes itself every few minutes.
                  Everything except the analyst and the journal works without an account.
                </p>
                <p className="prose dim">
                  This terminal carries no market-data vendor&apos;s feed and no vendor&apos;s branding. Figures are those
                  published in the sources listed under SRC.
                </p>
              </div>
            </Panel>
          )}

          </div>

          <footer className="foot">
            Educational material, not investment advice. Futures and options are leveraged — losses can exceed the
            amount deposited. Nothing here is a recommendation to buy or sell anything.{" "}
            <button className="del" style={{ color: "var(--accent-2)" }} onClick={() => go("TERMS")}>Terms &amp; disclaimer</button>
          </footer>
        </main>
      </div>
    </>
  );
}
