"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { browserClient, supabaseConfigured } from "@/lib/supabase-browser";
import {
  EXCHANGES, GLOSSARY, METHOD, TUTORIALS, RISKS, FALLBACK_FEED, ZONES
} from "@/lib/content";
import { DISCIPLINES, ALL_FRAMEWORKS, SEMINAR_MODES } from "@/lib/disciplines";
import { FLOWS, FLOWS_PREFACE, FLOW_TAGS } from "@/lib/flows";
import { TV_CONFIGS, TAPE_CONFIG } from "@/lib/tv";
import { Markdown } from "@/lib/markdown";

/* ========================================================================== */
/* screens                                                                    */
/* ========================================================================== */

const SCREENS = [
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
  { c: "AGN",   t: "Analyst",    d: "Ask anything — it reads the live feed and remembers the thread" },
  { c: "ECON",  t: "Economics",  d: "14 models you are examined on, each applicable to today's reads" },
  { c: "LAW",   t: "Law",        d: "Doctrine, leading cases and regulators across UK, EU and US" },
  { c: "IR",    t: "Intl Rel",   d: "The traditions and mid-range theories, applied to live events" },
  { c: "POL",   t: "Politics",   d: "Comparative politics and political economy frameworks" },
  { c: "SEM",   t: "Seminar",    d: "Turn any framework plus today's news into a contribution, essay plan or exam answer" },
  { c: "FLOW",  t: "Flows",      d: "The world's largest capital reallocations, and what each is and is not evidence for" },
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
  "?": "HELP", H: "HELP", BRIEF: "DESK", HOME: "START", AGENT: "AGN", ASK: "AGN",
  GRAIN: "GRN", GRAINS: "GRN", SOFT: "SFT", SOFTS: "SFT", TRADES: "TRD", WATCH: "WCH",
  MACRO: "MAC", METHOD: "MTD", JOURNAL: "JRN", SOURCES: "SRC",
  WORLD: "WLD", EXCHANGES: "WLD", GLOBAL: "WLD", US: "AMER", AMERICAS: "AMER",
  EUROPE: "EMEA", UK: "EMEA", APAC: "ASIA", PACIFIC: "ASIA",
  BEGIN: "START", LEARN: "TUT", TUTORIAL: "TUT", TUTORIALS: "TUT", BASICS: "TUT",
  GLOSSARY: "GLOS", TERMS: "GLOS", DEFINE: "GLOS", OPTIONS: "TUT", FUTURES: "TUT",
  DANGER: "RISK", LOSS: "RISK", LOSSES: "RISK",
  SETTINGS: "SET", KEY: "SET", ACCOUNT: "SET", LOGIN: "SET", SIGNIN: "SET",
  ECONOMICS: "ECON", MICRO: "ECON", MACRO2: "ECON",
  LEGAL: "LAW", COMPANY: "LAW", CONTRACT: "LAW",
  INTERNATIONAL: "IR", GEOPOLITICS: "IR", GEO: "IR",
  POLITICS: "POL", POLSCI: "POL", COMPARATIVE: "POL",
  ESSAY: "SEM", EXAM: "SEM", REVISION: "SEM", STUDY: "SEM",
  LEGALNOTICE: "TERMS", DISCLAIMER: "TERMS", PRIVACY: "TERMS", TOS: "TERMS",
  FLOWS: "FLOW", CAPITAL: "FLOW", TRADES2: "FLOW", BIG: "FLOW", STRUCTURAL: "FLOW"
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

export default function Terminal() {
  const supabase = useMemo(() => browserClient(), []);

  const [screen, setScreen] = useState("START");
  const [cmd, setCmd] = useState("");
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [unknown, setUnknown] = useState("");
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

  const lessonRefs = useRef({});
  const tutRefs = useRef({});

  /* ---- boot ---- */
  useEffect(() => {
    try {
      const h = (location.hash || "").replace("#", "").toUpperCase();
      const saved = localStorage.getItem("agdesk.screen");
      const seen = localStorage.getItem("agdesk.seen") === "1";
      if (CODES.includes(h)) setScreen(h);
      else if (seen && CODES.includes(saved)) setScreen(saved);
      localStorage.setItem("agdesk.seen", "1");
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

  /* ====================================================================== */
  return (
    <>
      <div className="chrome gut">
        <div className="wrap">
          <div className="statusline">
            <span className="sysname">AG·DESK</span>
            <span className="sep">│</span>
            <span className="stat">
              <span className={"dot " + (agLive || Object.keys(reads).length ? "live" : "warn")} />
              <span>{Object.keys(reads).length ? `${Object.keys(reads).length} ZONES LIVE` : "SNAPSHOT"}</span>
            </span>
            <span className="sep">│</span>
            <span>{clock}</span>
            <button
              className="petoggle"
              aria-pressed={peOn}
              onClick={() => { const v = !peOn; setPe(v); setPEGlobal(v); }}
              title="Explain jargon inline"
            >
              Plain English
            </button>
          </div>

          <div className="cmdbar">
            <span className="caret">&gt;</span>
            <input
              id="cmd"
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); runCmd(); }
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
              placeholder="type a code — HELP for the list"
            />
            <button className="go" onClick={runCmd}>GO</button>
          </div>

          <div className="fkeys">
            {SCREENS.map((s) => (
              <button
                key={s.c}
                className="fk"
                aria-current={screen === s.c}
                onClick={() => go(s.c)}
              >
                <b>{s.c}</b> {s.t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="gut">
        <div className="wrap">

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
                      Signing in is free. It gives you {process.env.NEXT_PUBLIC_FREE_DAILY || 20} analyst messages a day
                      and a journal that saves. Everything else works without an account.
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
      </main>

      <footer className="gut">
        <div className="wrap">
          Educational material, not investment advice. Futures and options are leveraged — losses can exceed the amount
          deposited. Nothing here is a recommendation to buy or sell anything.{" "}
          <button className="del" style={{ color: "var(--accent-2)" }} onClick={() => go("TERMS")}>Terms &amp; disclaimer</button>
        </div>
      </footer>
    </>
  );
}
