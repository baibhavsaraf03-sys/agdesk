"use client";

/**
 * The Charts screen (CHT): TradingView's full chart, one, two or four at once.
 *
 * Each chart is TradingView's free Advanced Chart widget, which brings its own
 * drawing tools, indicator menu, timeframes and symbol search. This file adds
 * what a desk needs around it: a layout, a symbol list built from the feeds
 * that work, shared timeframe and indicator switches, and memory of all of it
 * in this browser.
 *
 * Embedding: unlike the quote tables (TVWidget in app/page.jsx, which builds
 * the iframe itself), this follows TradingView's own React example: a
 * container, then a script tag whose text is the JSON config. The effect is
 * keyed on the config, so a change rebuilds the chart once and only once.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { CHART_GROUPS, QUICK, INTERVALS, STUDIES, chartName, findSymbol } from "@/lib/charts";

const STORE = "agdesk.charts";
const SCRIPT = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
const DEFAULT = {
  layout: 1,
  active: 0,
  symbols: ["FOREXCOM:SPXUSD", "FOREXCOM:UKXGBP", "INDEX:DEU40", "INDEX:NKY"],
  interval: "D",
  studies: []
};

function ChartFrame({ symbol, interval, studies, theme, compact }) {
  const ref = useRef(null);
  const dark = theme === "dark";
  const config = useMemo(
    () =>
      JSON.stringify({
        autosize: true,
        symbol,
        interval,
        timezone: "exchange",
        theme: dark ? "dark" : "light",
        style: "1",
        locale: "en",
        // Matches --surface, so the chart sits flush with the panel.
        backgroundColor: dark ? "#191917" : "#ffffff",
        gridColor: dark ? "rgba(50, 50, 44, 0.6)" : "rgba(226, 222, 211, 0.6)",
        withdateranges: !compact,
        hide_side_toolbar: compact,
        allow_symbol_change: true,
        save_image: true,
        details: false,
        hotlist: false,
        calendar: false,
        studies,
        support_host: "https://www.tradingview.com"
      }),
    [symbol, interval, studies, dark, compact]
  );

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.replaceChildren();
    const slot = document.createElement("div");
    slot.className = "tradingview-widget-container__widget";
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = SCRIPT;
    script.async = true;
    script.text = config;
    host.append(slot, script);
    return () => host.replaceChildren();
  }, [config]);

  return <div className="tradingview-widget-container ch-frame" ref={ref} />;
}

/** Narrow screens get charts without the drawing toolbar, which would take a third of the width. */
function useCompact(layout) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow || layout === 4;
}

/**
 * `request` is `{ symbol, n }` from the page: a command such as `CHT GOLD`, or a
 * chart link under a quote table. A new `n` loads that symbol into the chart
 * currently selected.
 */
export default function ChartsScreen({ theme, request }) {
  const [s, setS] = useState(DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const [typed, setTyped] = useState("");
  const [msg, setMsg] = useState("");
  const compact = useCompact(s.layout);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || "null");
      if (saved && Array.isArray(saved.symbols)) {
        setS({
          ...DEFAULT,
          ...saved,
          symbols: [0, 1, 2, 3].map((i) => saved.symbols[i] || DEFAULT.symbols[i]),
          active: Math.min(saved.active || 0, (saved.layout || 1) - 1)
        });
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORE, JSON.stringify(s));
    } catch {}
  }, [s, loaded]);

  useEffect(() => {
    if (!loaded || !request?.symbol) return;
    setS((cur) => {
      const symbols = [...cur.symbols];
      symbols[cur.active] = request.symbol;
      return { ...cur, symbols };
    });
  }, [request?.n, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  function pick(symbol) {
    if (!symbol) return;
    setS((cur) => {
      const symbols = [...cur.symbols];
      symbols[cur.active] = symbol;
      return { ...cur, symbols };
    });
    setMsg("");
  }

  function submitTyped(e) {
    e.preventDefault();
    const hit = findSymbol(typed);
    if (!hit) return setMsg(`Nothing called "${typed.trim()}" in the list. Type it in full as EXCHANGE:TICKER, for example NASDAQ:AAPL.`);
    pick(hit);
    setTyped("");
  }

  function setLayout(n) {
    setS((cur) => ({ ...cur, layout: n, active: Math.min(cur.active, n - 1) }));
  }

  function toggleStudy(id) {
    setS((cur) => ({
      ...cur,
      studies: cur.studies.includes(id) ? cur.studies.filter((x) => x !== id) : [...cur.studies, id]
    }));
  }

  const shown = s.symbols.slice(0, s.layout);
  const activeSymbol = s.symbols[s.active];

  return (
    <div className="ch">
      <div className="ch-bar">
        <div className="ch-ctl" role="group" aria-label="Layout">
          <span className="ch-k">Layout</span>
          {[1, 2, 4].map((n) => (
            <button key={n} type="button" className={"ch-seg" + (s.layout === n ? " on" : "")} aria-pressed={s.layout === n} onClick={() => setLayout(n)}>
              {n === 1 ? "One" : n === 2 ? "Two" : "Four"}
            </button>
          ))}
        </div>
        <div className="ch-ctl" role="group" aria-label="Timeframe">
          <span className="ch-k">Timeframe</span>
          {INTERVALS.map(([v, t]) => (
            <button key={v} type="button" className={"ch-seg mono" + (s.interval === v ? " on" : "")} aria-pressed={s.interval === v} onClick={() => setS((c) => ({ ...c, interval: v }))}>
              {t}
            </button>
          ))}
        </div>
        <div className="ch-ctl" role="group" aria-label="Indicators">
          <span className="ch-k">Indicators</span>
          {STUDIES.map(([id, t]) => (
            <button key={id} type="button" className={"ch-seg" + (s.studies.includes(id) ? " on" : "")} aria-pressed={s.studies.includes(id)} onClick={() => toggleStudy(id)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="ch-pick">
        <label className="ch-k" htmlFor="ch-list">
          {s.layout > 1 ? `Chart ${s.active + 1}` : "Symbol"}
        </label>
        <select id="ch-list" value={CHART_GROUPS.some((g) => g.symbols.some(([x]) => x === activeSymbol)) ? activeSymbol : ""} onChange={(e) => pick(e.target.value)}>
          {!CHART_GROUPS.some((g) => g.symbols.some(([x]) => x === activeSymbol)) && <option value="">{activeSymbol}</option>}
          {CHART_GROUPS.map((g) => (
            <optgroup key={g.name} label={g.name}>
              {g.symbols.map(([sym, name]) => <option key={sym} value={sym}>{name}</option>)}
            </optgroup>
          ))}
        </select>
        <form className="ch-type" onSubmit={submitTyped}>
          <input type="text" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Or type: gold, EURUSD, NASDAQ:AAPL" aria-label="Type a symbol" autoCapitalize="characters" spellCheck={false} />
          <button type="submit" className="ch-seg">Open</button>
        </form>
      </div>
      {msg && <p className="ch-msg" role="status">{msg}</p>}

      <div className="ch-quick" aria-label="Benchmarks">
        {QUICK.map(([sym, name]) => (
          <button key={sym} type="button" className={"chip" + (activeSymbol === sym ? " chip-pri" : "")} onClick={() => pick(sym)}>{name}</button>
        ))}
      </div>

      <div className={`ch-grid n${s.layout}`}>
        {shown.map((sym, i) => (
          <div key={i} className={"ch-cell" + (s.layout > 1 && i === s.active ? " on" : "")}>
            {s.layout > 1 && (
              <button type="button" className="ch-head" aria-pressed={i === s.active} onClick={() => setS((c) => ({ ...c, active: i }))}>
                <span className="mono">{i + 1}</span> {chartName(sym)}
                <span className="ch-sel">{i === s.active ? "Selected: the list above changes this chart" : "Select"}</span>
              </button>
            )}
            {loaded && <ChartFrame symbol={sym} interval={s.interval} studies={s.studies} theme={theme} compact={compact} />}
          </div>
        ))}
      </div>

      <div className="tvcredit">
        <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">Charts by TradingView</a>
        {" · live or delayed by market. Futures from CBOT, NYMEX and ICE, and most Asian and Middle Eastern exchanges, do not chart on the free widget. A symbol changed with a chart's own search is not remembered when you leave."}
      </div>
    </div>
  );
}
