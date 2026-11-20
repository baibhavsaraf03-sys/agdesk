"use client";

/**
 * My positions (POS). Two ways in, side by side:
 *  1. A linked broker, read-only, through SnapTrade (/api/broker). Positions
 *     are fetched from the broker when this screen opens and never stored.
 *  2. Positions typed in or imported from a broker's CSV export, kept only in
 *     this browser (`agdesk.positions`) and priced through /api/price.
 * Each position can carry a stop and a target, shown as the distance left.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

const KEY = "agdesk.positions";
const MAX = 40;

const money = (v, cur) => {
  if (v == null || !isFinite(v)) return "–";
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${v < 0 ? "−" : ""}${cur && cur !== "USD" ? cur + " " : "$"}${s}`;
};
const signed = (v, cur) => (v == null ? "–" : `${v > 0 ? "+" : ""}${money(v, cur)}`);
const pct = (v) => (v == null || !isFinite(v) ? "–" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(100 * v).toFixed(1)}%`);
const tone = (v) => (v == null ? "flat" : v > 0 ? "up" : v < 0 ? "down" : "flat");
const qty = (u) => (u == null ? "–" : `${u < 0 ? "Short " : ""}${Math.abs(u).toLocaleString("en-US", { maximumFractionDigits: 4 })}`);

const NOTICE = {
  linked: "Your broker is linked. Positions below come straight from it.",
  cancelled: "Linking was cancelled. Nothing was saved.",
  expired: "That link took too long or was opened in another browser. Try again from this screen.",
  signed_out: "You were signed out during linking. Sign in and try again.",
  failed: "SnapTrade did not accept the link just now. Try again in a minute.",
  unreachable: "SnapTrade could not be reached just now. Try again in a minute.",
  no_table: "Broker linking is not set up on the site yet (the database table is missing).",
  off: "Broker linking is not switched on yet."
};

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.slice(0, MAX) : [];
  } catch {
    return [];
  }
}
function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {}
}

/** A plain ticker becomes NYSE:X for the price route (Yahoo and Stooq price US tickers the same either way). */
const priceKey = (s) => (/:/.test(s) ? s : `NYSE:${s}`);
const cleanSym = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9.:]/g, "").slice(0, 20);

/** Reads a broker's CSV export: looks for symbol, quantity and average-price columns by name. */
export function parseCsv(text) {
  const lines = String(text || "").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const split = (l) => {
    const out = [];
    let cur = "", q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === "," && !q) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((c) => c.trim());
  };
  const head = split(lines[0]).map((h) => h.toLowerCase());
  const find = (re) => head.findIndex((h) => re.test(h));
  const iSym = find(/^(symbol|ticker|instrument|security|code)\b/);
  const iQty = find(/quantity|shares|units|^qty|no\.? of shares|position/);
  const iCost = find(/average|avg|cost per|price paid|purchase price|cost basis per|unit cost/);
  if (iSym < 0 || iQty < 0) return [];
  const n = (v) => Number(String(v || "").replace(/[$£€,\s]/g, "").replace(/^\((.*)\)$/, "-$1"));
  const rows = [];
  for (const l of lines.slice(1)) {
    const c = split(l);
    const symbol = cleanSym(c[iSym]);
    const units = n(c[iQty]);
    if (!symbol || !isFinite(units) || !units) continue;
    const cost = iCost >= 0 ? Math.abs(n(c[iCost])) : null;
    rows.push({ symbol, units, cost: isFinite(cost) && cost > 0 ? cost : null, stop: null, target: null });
  }
  return rows.slice(0, MAX);
}

function Table({ rows, cur, onRemove, showLevels }) {
  return (
    <div className="pos-table" role="table">
      <div className="pos-row pos-head" role="row">
        <span>Position</span><span>Held</span><span>Paid</span><span>Now</span><span>Value</span><span>Profit or loss</span>
        {showLevels && <span>Stop / target</span>}
      </div>
      {rows.map((p, i) => (
        <div className="pos-row" role="row" key={p.symbol + i}>
          <span className="pos-sym"><b>{p.symbol}</b>{p.name && <small>{p.name}</small>}{p.error && <small className="down">{p.error}</small>}</span>
          <span data-k="Held">{qty(p.units)}</span>
          <span data-k="Paid">{money(p.cost, p.currency || cur)}</span>
          <span data-k="Now">{money(p.price, p.currency || cur)}</span>
          <span data-k="Value">{money(p.value, p.currency || cur)}</span>
          <span data-k="P/L" className={tone(p.pnl)}>{signed(p.pnl, p.currency || cur)} <small>{pct(p.pnlPct)}</small></span>
          {showLevels && (
            <span data-k="Stop / target" className="pos-levels">
              {p.stopGap != null ? <small className={p.stopGap <= 0 ? "down" : ""}>{p.stopGap <= 0 ? "Stop reached" : `Stop ${pct(p.stopGap).replace("+", "")} away`}</small> : <small>{p.stop ? `Stop ${money(p.stop)}` : "no stop"}</small>}
              {p.targetGap != null ? <small className={p.targetGap <= 0 ? "up" : ""}>{p.targetGap <= 0 ? "Target reached" : `Target ${pct(p.targetGap).replace("+", "")} away`}</small> : p.target ? <small>Target {money(p.target)}</small> : null}
            </span>
          )}
          {onRemove && <button className="btn pos-x" onClick={() => onRemove(i)} aria-label={`Remove ${p.symbol}`}>Remove</button>}
        </div>
      ))}
    </div>
  );
}

function totals(rows) {
  let value = 0, pnl = 0, any = false;
  for (const r of rows) {
    if (r.value != null) { value += r.value; any = true; }
    if (r.pnl != null) pnl += r.pnl;
  }
  return any ? { value, pnl } : null;
}

export default function Positions({ signedIn, canSignIn, ask }) {
  const [broker, setBroker] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [mine, setMine] = useState([]);
  const [prices, setPrices] = useState({});
  const [form, setForm] = useState({ symbol: "", side: "long", units: "", cost: "", stop: "", target: "" });
  const [csvMsg, setCsvMsg] = useState(null);

  // Result of a linking round trip, then tidy the address bar.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const code = q.get("broker");
    if (code) {
      setNotice(NOTICE[code] || NOTICE.failed);
      q.delete("broker");
      const rest = q.toString();
      window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : "") + window.location.hash);
    }
    setMine(load());
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/broker", { cache: "no-store" });
      setBroker(await r.json());
    } catch {
      setBroker({ error: "unreachable" });
    }
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh, signedIn]);

  // Prices for the hand-entered positions.
  const symbols = useMemo(() => [...new Set(mine.map((p) => p.symbol))], [mine]);
  useEffect(() => {
    let live = true;
    symbols.forEach(async (s) => {
      try {
        const r = await fetch(`/api/price?symbol=${encodeURIComponent(priceKey(s))}`);
        const j = await r.json();
        if (live) setPrices((p) => ({ ...p, [s]: r.ok ? { price: j.price, at: j.at } : { error: "No free price for this symbol" } }));
      } catch {
        if (live) setPrices((p) => ({ ...p, [s]: { error: "Price source did not answer" } }));
      }
    });
    return () => { live = false; };
  }, [symbols]);

  const mineRows = mine.map((p) => {
    const q = prices[p.symbol] || {};
    const price = q.price ?? null;
    const value = price != null ? p.units * price : null;
    const pnl = price != null && p.cost != null ? (price - p.cost) * p.units : null;
    const paid = p.cost != null ? Math.abs(p.units * p.cost) : null;
    const short = p.units < 0;
    // Distance left before the price reaches the stop or the target, as a share of the current price.
    const stopGap = price != null && p.stop ? (short ? (p.stop - price) / price : (price - p.stop) / price) : null;
    const targetGap = price != null && p.target ? (short ? (price - p.target) / price : (p.target - price) / price) : null;
    return { ...p, price, value, pnl, pnlPct: pnl != null && paid ? pnl / paid : null, stopGap, targetGap, error: q.error, currency: "USD" };
  });

  const setAndSave = (list) => { setMine(list); save(list); };
  const add = (e) => {
    e.preventDefault();
    const symbol = cleanSym(form.symbol);
    const units = Math.abs(Number(form.units));
    const cost = Number(form.cost);
    if (!symbol || !units) return;
    const n = (v) => (Number(v) > 0 ? Number(v) : null);
    setAndSave([...mine, { symbol, units: form.side === "short" ? -units : units, cost: cost > 0 ? cost : null, stop: n(form.stop), target: n(form.target) }].slice(0, MAX));
    setForm({ symbol: "", side: "long", units: "", cost: "", stop: "", target: "" });
  };
  const importCsv = async (file) => {
    if (!file) return;
    const rows = parseCsv(await file.text());
    if (!rows.length) { setCsvMsg("No positions found. The file needs a symbol column and a quantity column."); return; }
    setAndSave([...mine, ...rows].slice(0, MAX));
    setCsvMsg(`${rows.length} position${rows.length === 1 ? "" : "s"} added from ${file.name}. The file stayed on your device.`);
  };
  const unlink = async () => {
    await fetch("/api/broker", { method: "DELETE" });
    setNotice("Your broker is unlinked and the access was revoked at SnapTrade.");
    refresh();
  };

  const linkedRows = (broker?.accounts || []).flatMap((a) => a.positions.filter((p) => !p.cash));
  const askAnalyst = () => {
    const lines = [...linkedRows, ...mineRows].map((p) =>
      `${p.symbol}: ${p.units < 0 ? "short " : ""}${Math.abs(p.units)} at ${p.cost ?? "unknown"}, now ${p.price ?? "unknown"}, P/L ${p.pnl == null ? "unknown" : p.pnl.toFixed(2)}${p.stop ? `, stop ${p.stop}` : ""}${p.target ? `, target ${p.target}` : ""}`
    );
    ask(`Here are my open positions:\n${lines.join("\n")}\n\nIn plain English: how do they stand against today's market, which headlines or releases on the calendar could move them this week, and what risks should I watch? No buy or sell instructions.`, "How do my positions stand?");
  };

  const T = totals(mineRows);

  return (
    <div className="pos">
      {notice && <p className="pos-note" role="status">{notice}</p>}

      <section className="pos-sec">
        <h3 className="pos-h">Linked broker <span>read-only</span></h3>
        {!signedIn ? (
          <p className="prose dim">
            {canSignIn ? <><a href={`/signin?next=${encodeURIComponent("/#POS")}`}>Sign in</a> to link a broker. </> : null}
            You can still enter positions by hand below.
          </p>
        ) : broker == null || (loading && !broker.accounts) ? (
          <p className="prose dim">Checking…</p>
        ) : broker.configured === false && !broker.linked ? (
          <p className="prose dim">{NOTICE.off} Enter positions by hand below in the meantime.</p>
        ) : broker.error === "no_table" ? (
          <p className="prose dim">{NOTICE.no_table}</p>
        ) : !broker.linked ? (
          <>
            {broker.error === "relink" && <p className="pos-note">Your broker's permission ended. Link it again to see your positions.</p>}
            <p className="prose">
              See what you hold and how it stands, straight from your broker. Ledge Desk can only read: it cannot buy,
              sell or move money, and it stores nothing but an encrypted pass that you can cancel here at any time.
            </p>
            <ol className="pos-steps">
              <li>Press <b>Link a broker</b>. SnapTrade, the service that connects brokers, opens.</li>
              <li>Make a free SnapTrade Personal account if you have none, and connect your broker there (Schwab, Fidelity, E*TRADE, Robinhood, Interactive Brokers, Webull, Trading 212 and others).</li>
              <li>Approve <b>read</b> access for Ledge Desk. You come straight back here.</li>
            </ol>
            <a className="btn pri" href="/api/broker/connect">Link a broker</a>
          </>
        ) : (
          <>
            {broker.error === "unreachable" && <p className="pos-note">The broker could not be reached just now. Press Refresh in a minute.</p>}
            {(broker.accounts || []).map((a) => {
              const t = totals(a.positions);
              return (
                <div className="pos-acct" key={a.id}>
                  <div className="pos-acct-h">
                    <b>{a.name}{a.number ? ` ${a.number}` : ""}</b>
                    <span className="dim">{[a.type, a.paper && "paper", a.asOf && `as of ${new Date(a.asOf).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`].filter(Boolean).join(" · ")}</span>
                    {a.value != null && <span className="pos-total">{money(a.value, a.currency)}{t && <small className={tone(t.pnl)}> {signed(t.pnl, a.currency)} open</small>}</span>}
                  </div>
                  {a.error ? <p className="prose dim">{a.error}</p> : a.positions.length ? <Table rows={a.positions} cur={a.currency} /> : <p className="prose dim">No open positions.</p>}
                </div>
              );
            })}
            <div className="pos-actions">
              <button className="btn" onClick={refresh} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
              <button className="btn" onClick={unlink}>Unlink broker</button>
              {broker.fetchedAt && <span className="dim">Fetched {new Date(broker.fetchedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. Prices are your broker's and may be delayed.</span>}
            </div>
          </>
        )}
      </section>

      <section className="pos-sec">
        <h3 className="pos-h">Entered by hand <span>kept on this device only</span></h3>
        <p className="prose dim">
          For a broker that cannot be linked, or if you would rather not link one. Type a position or import your
          broker's CSV export. Nothing here leaves this browser except the ticker, to fetch a delayed price.
        </p>
        <form className="pos-form" onSubmit={add}>
          <label>Ticker<input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="PSQ" required /></label>
          <label>Side
            <select value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })}>
              <option value="long">Bought (long)</option>
              <option value="short">Sold short</option>
            </select>
          </label>
          <label>Shares<input inputMode="decimal" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} required /></label>
          <label>Price paid<input inputMode="decimal" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></label>
          <label>Stop<input inputMode="decimal" value={form.stop} onChange={(e) => setForm({ ...form, stop: e.target.value })} placeholder="optional" /></label>
          <label>Target<input inputMode="decimal" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="optional" /></label>
          <button className="btn pri" type="submit">Add</button>
        </form>
        <label className="pos-csv">
          <span className="btn">Import a CSV</span>
          <input type="file" accept=".csv,text/csv" onChange={(e) => { importCsv(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {csvMsg && <p className="prose dim">{csvMsg}</p>}
        {mineRows.length > 0 && (
          <>
            <Table rows={mineRows} cur="USD" showLevels onRemove={(i) => setAndSave(mine.filter((_, j) => j !== i))} />
            {T && <p className="pos-sum">Value {money(T.value)} · open <span className={tone(T.pnl)}>{signed(T.pnl)}</span> · prices delayed (Yahoo Finance, then Stooq)</p>}
          </>
        )}
      </section>

      {(linkedRows.length > 0 || mineRows.length > 0) && (
        <div className="pos-actions">
          <button className="btn" onClick={askAnalyst}>Ask the analyst how they stand</button>
        </div>
      )}
      <p className="prose dim pos-foot">
        Information only, not advice. Profit or loss is worked out from your price paid and a delayed price; your
        broker's figures, fees and taxes are what count. Asking the analyst sends these positions to the AI provider named on the privacy page.
      </p>
    </div>
  );
}
