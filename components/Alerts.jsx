"use client";

/**
 * The Alerts screen (ALR): turn notifications on for this device, set up
 * alerts of four kinds, see and switch off the ones you have, and see what
 * was sent. The checking is done every five minutes by
 * scripts/alerts-check.mjs (GitHub Actions), not by this page, so alerts
 * arrive with the site closed.
 *
 * Alerts belong to an account (they have to be checked while the visitor is
 * away), so signed-out visitors see what alerts do and a way to sign in.
 *
 * `request` is `{ kind, params, n }` from other screens ("Remind me" on the
 * calendar, "Alert" on the watchlist, the Doomsday button): it fills in the
 * form.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CAL_SERIES, CAL_CURRENCIES } from "@/lib/calendar";
import { CHART_GROUPS, chartName } from "@/lib/charts";
import { priceSymbol } from "@/lib/prices.mjs";
import { DOOM_TABS } from "@/lib/doomsday";
import { KIND_TXT, LEADS, describeAlert } from "@/lib/alert-rules";

const LEAD_TXT = { 5: "5 minutes", 15: "15 minutes", 60: "1 hour", 1440: "1 day" };

function b64ToBytes(s) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function ago(iso) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ------------------------------------------------------------ device -- */

function useDevice(signedIn) {
  const [st, setSt] = useState({ k: "checking" });
  const [busy, setBusy] = useState(false);
  const key = useRef(null);

  const check = useCallback(async () => {
    if (typeof window === "undefined") return;
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone;
    if (!ok) return setSt({ k: ios && !standalone ? "ios" : "unsupported" });
    try {
      const r = await fetch("/api/push", { cache: "no-store" });
      key.current = (await r.json()).publicKey;
    } catch {
      key.current = null;
    }
    if (!key.current) return setSt({ k: "nokey" });
    if (Notification.permission === "denied") return setSt({ k: "denied" });
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    setSt({ k: sub ? "on" : "off", endpoint: sub?.endpoint });
  }, []);

  useEffect(() => {
    if (signedIn) check();
  }, [signedIn, check]);

  const enable = async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setSt({ k: perm === "denied" ? "denied" : "off" });
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key.current) });
      const r = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        return setSt({ k: "error", msg: j.error === "not_set_up" ? "Alerts are not set up on the site yet." : "This device could not be registered. Try again in a minute." });
      }
      setSt({ k: "on", endpoint: sub.endpoint });
    } catch {
      setSt({ k: "error", msg: "This browser refused. If you blocked notifications for this site earlier, allow them in the browser's site settings and try again." });
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setSt({ k: "off" });
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    const reg = await navigator.serviceWorker.getRegistration("/");
    reg?.showNotification("Ledge Desk", { body: "Notifications work on this device. Alerts will look like this.", icon: "/icon-192.png", data: { url: "/#ALR" } });
  };

  return { st, busy, enable, disable, test };
}

function DeviceBox({ device }) {
  const { st, busy, enable, disable, test } = device;
  const text = {
    checking: "Checking this device…",
    unsupported: "This browser cannot show notifications from websites. Your alerts are still saved and listed below; open the site in Chrome, Edge, Firefox or Safari to receive them.",
    ios: "On iPhone and iPad, notifications only work once the site is on your home screen: tap the Share button, then Add to Home Screen, open Ledge Desk from the new icon, and come back to this screen.",
    nokey: "Notifications are not switched on for the site yet. Your alerts are still saved, checked and listed below under Recent alerts.",
    denied: "Notifications are blocked for this site in your browser. Allow them in the browser's site settings (the padlock or settings icon by the address), then reload this page.",
    off: "Turn notifications on to get alerts on this device even when the site is closed. Each phone or computer is turned on separately.",
    on: "Notifications are on for this device.",
    error: st.msg
  }[st.k];
  return (
    <div className={"alr-device" + (st.k === "on" ? " on" : "")}>
      <h3>This device</h3>
      <p>{text}</p>
      <div className="btnrow">
        {st.k === "off" && <button type="button" className="btn pri" disabled={busy} onClick={enable}>Turn on notifications</button>}
        {st.k === "error" && <button type="button" className="btn" disabled={busy} onClick={enable}>Try again</button>}
        {st.k === "on" && (
          <>
            <button type="button" className="btn" onClick={test}>Show a test notification</button>
            <button type="button" className="btn" disabled={busy} onClick={disable}>Turn off on this device</button>
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- form -- */

function priceOptions(watch) {
  const supported = (list) => list.filter((s) => priceSymbol(s));
  const yours = supported(watch || []);
  const groups = CHART_GROUPS.map((g) => ({ name: g.name, symbols: supported(g.symbols.map(([s]) => s)) })).filter((g) => g.symbols.length);
  return { yours, groups };
}

function NewAlert({ onCreate, prefill, watch }) {
  const [kind, setKind] = useState("release");
  const [rel, setRel] = useState({ scope: "major", series: [], currencies: [], lead: 15 });
  const [pr, setPr] = useState({ symbol: "", op: "above", level: "", repeat: false });
  const [words, setWords] = useState("");
  const [doom, setDoom] = useState({ all: true, tabs: [] });
  const [quote, setQuote] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const box = useRef(null);
  const opts = useMemo(() => priceOptions(watch), [watch]);

  useEffect(() => {
    if (!prefill) return;
    const p = prefill.params || {};
    setKind(prefill.kind);
    if (prefill.kind === "release") setRel((r) => ({ ...r, ...p, series: p.series || [], currencies: p.currencies || [] }));
    if (prefill.kind === "price") setPr((x) => ({ ...x, symbol: p.symbol || "", level: "" }));
    if (prefill.kind === "doom") setDoom({ all: true, tabs: [] });
    setErr("");
    setTimeout(() => box.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }, [prefill]);

  useEffect(() => {
    if (kind !== "price" || !pr.symbol) return setQuote(null);
    let off = false;
    setQuote({ loading: true });
    fetch(`/api/price?symbol=${encodeURIComponent(pr.symbol)}`)
      .then((r) => r.json())
      .then((j) => !off && setQuote(j))
      .catch(() => !off && setQuote({ error: "The price could not be fetched just now." }));
    return () => {
      off = true;
    };
  }, [kind, pr.symbol]);

  const params = () => {
    if (kind === "release") return rel;
    if (kind === "price") return pr;
    if (kind === "headline") return { words: words.split(",") };
    return { tabs: doom.all ? "all" : doom.tabs };
  };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await onCreate({ kind, params: params() });
    setBusy(false);
    if (r?.error) return setErr(r.error);
    if (kind === "price") setPr((x) => ({ ...x, level: "" }));
    if (kind === "headline") setWords("");
  }

  const toggleIn = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const level = Number(String(pr.level).replace(/,/g, ""));
  const already = quote?.price && level > 0 && (pr.op === "above" ? quote.price >= level : quote.price <= level);

  return (
    <form className="alr-new" ref={box} onSubmit={submit}>
      <h3>New alert</h3>
      <div className="cal-set" role="group" aria-label="Kind of alert">
        {["release", "price", "headline", "doom"].map((k) => (
          <button key={k} type="button" className={"ch-seg" + (kind === k ? " on" : "")} aria-pressed={kind === k} onClick={() => { setKind(k); setErr(""); }}>
            {KIND_TXT[k]}
          </button>
        ))}
      </div>

      {kind === "release" && (
        <>
          <p className="alr-hint">A reminder before scheduled releases from the calendar.</p>
          <div className="cal-set" role="group" aria-label="Which releases">
            <span className="ch-k">Which</span>
            {[["major", "Major only"], ["all", "All"], ["series", "Choose"]].map(([v, t]) => (
              <button key={v} type="button" className={"ch-seg" + (rel.scope === v ? " on" : "")} aria-pressed={rel.scope === v} onClick={() => setRel({ ...rel, scope: v })}>{t}</button>
            ))}
          </div>
          {rel.scope === "series" && (
            <div className="alr-checks">
              {CAL_SERIES.map((s) => (
                <label key={s.key} className="alr-check">
                  <input type="checkbox" checked={rel.series.includes(s.key)} onChange={() => setRel({ ...rel, series: toggleIn(rel.series, s.key) })} />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>
          )}
          <div className="cal-set" role="group" aria-label="Currencies">
            <span className="ch-k">Currency</span>
            <button type="button" className={"ch-seg" + (!rel.currencies.length ? " on" : "")} onClick={() => setRel({ ...rel, currencies: [] })}>Any</button>
            {CAL_CURRENCIES.map((c) => (
              <button key={c} type="button" className={"ch-seg" + (rel.currencies.includes(c) ? " on" : "")} aria-pressed={rel.currencies.includes(c)} onClick={() => setRel({ ...rel, currencies: toggleIn(rel.currencies, c) })}>{c}</button>
            ))}
          </div>
          <div className="cal-set" role="group" aria-label="How long before">
            <span className="ch-k">Before</span>
            {LEADS.map((l) => (
              <button key={l} type="button" className={"ch-seg" + (rel.lead === l ? " on" : "")} aria-pressed={rel.lead === l} onClick={() => setRel({ ...rel, lead: l })}>{LEAD_TXT[l]}</button>
            ))}
          </div>
        </>
      )}

      {kind === "price" && (
        <>
          <p className="alr-hint">
            A notification when a market crosses a level. Checked every five minutes on free, delayed prices, so this is
            for keeping an eye on a level, not for split-second trading.
          </p>
          <div className="field">
            <label htmlFor="alr-sym">Market</label>
            <select id="alr-sym" value={pr.symbol} onChange={(e) => setPr({ ...pr, symbol: e.target.value })}>
              <option value="">Choose a market</option>
              {opts.yours.length > 0 && (
                <optgroup label="Your watchlist">
                  {opts.yours.map((s) => <option key={"w" + s} value={s}>{chartName(s) || s}</option>)}
                </optgroup>
              )}
              {opts.groups.map((g) => (
                <optgroup key={g.name} label={g.name}>
                  {g.symbols.map((s) => <option key={s} value={s}>{chartName(s) || s}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          {quote && (
            <p className="alr-quote">
              {quote.loading ? "Fetching the price…" : quote.price ? (
                <>Now <b className="mono">{Number(quote.price).toLocaleString("en-GB", { maximumFractionDigits: 5 })}</b> ({quote.source}, delayed{quote.note ? `; ${quote.note}` : ""}). This is the price the alert is checked against.</>
              ) : (quote.error || "No price just now.")}
            </p>
          )}
          <div className="cal-set" role="group" aria-label="Direction">
            <span className="ch-k">When it goes</span>
            {["above", "below"].map((o) => (
              <button key={o} type="button" className={"ch-seg" + (pr.op === o ? " on" : "")} aria-pressed={pr.op === o} onClick={() => setPr({ ...pr, op: o })}>{o}</button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="alr-level">Level</label>
            <input id="alr-level" type="text" inputMode="decimal" value={pr.level} onChange={(e) => setPr({ ...pr, level: e.target.value })} placeholder="e.g. 2700" />
          </div>
          {already && <p className="alr-hint warn">It is already {pr.op} that level, so this will go off at the next check.</p>}
          <label className="alr-check">
            <input type="checkbox" checked={pr.repeat} onChange={(e) => setPr({ ...pr, repeat: e.target.checked })} />
            <span>Every time it crosses (otherwise once, then the alert switches off)</span>
          </label>
        </>
      )}

      {kind === "headline" && (
        <>
          <p className="alr-hint">
            A notification when a headline in the site&apos;s news feeds mentions any of these. Up to five, separated by
            commas; whole words, and plurals count. Checked every 15 minutes.
          </p>
          <div className="field">
            <label htmlFor="alr-words">Words or phrases</label>
            <input id="alr-words" type="text" value={words} onChange={(e) => setWords(e.target.value)} placeholder="e.g. Nvidia, tariff, Bank of Japan" />
          </div>
        </>
      )}

      {kind === "doom" && (
        <>
          <p className="alr-hint">
            A notification when the hourly AI-trade read changes its verdict on a Doomsday tab, for example from
            &ldquo;supports&rdquo; to &ldquo;weakens&rdquo;.
          </p>
          <div className="cal-set" role="group" aria-label="Which tabs">
            <span className="ch-k">Tabs</span>
            <button type="button" className={"ch-seg" + (doom.all ? " on" : "")} onClick={() => setDoom({ ...doom, all: true })}>All</button>
            <button type="button" className={"ch-seg" + (!doom.all ? " on" : "")} onClick={() => setDoom({ ...doom, all: false })}>Choose</button>
          </div>
          {!doom.all && (
            <div className="alr-checks">
              {DOOM_TABS.map((t) => (
                <label key={t.k} className="alr-check">
                  <input type="checkbox" checked={doom.tabs.includes(t.k)} onChange={() => setDoom({ ...doom, tabs: toggleIn(doom.tabs, t.k) })} />
                  <span>{t.t}</span>
                </label>
              ))}
            </div>
          )}
        </>
      )}

      {err && <p className="ch-msg" role="alert">{err}</p>}
      <div className="btnrow">
        <button type="submit" className="btn pri" disabled={busy}>{busy ? "Saving…" : "Create alert"}</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------ screen -- */

export default function AlertsScreen({ signedIn, canSignIn, request, watch }) {
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const device = useDevice(signedIn);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/alerts", { cache: "no-store" });
      const j = await r.json();
      if (j.error === "not_set_up") return setProblem("not_set_up");
      if (!r.ok) return setProblem(j.error || "Your alerts could not be loaded.");
      setProblem("");
      setData(j);
    } catch {
      setProblem("Your alerts could not be loaded.");
    }
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [signedIn, load]);

  const create = async (body) => {
    const r = await fetch("/api/alerts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { error: j.error === "not_set_up" ? "Alerts are not set up on the site yet." : j.error || "Could not save the alert." };
    load();
    return {};
  };
  const toggle = async (a) => {
    await fetch("/api/alerts", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: a.id, active: !a.active }) });
    load();
  };
  const remove = async (a) => {
    await fetch(`/api/alerts?id=${a.id}`, { method: "DELETE" });
    load();
  };
  const clearEvents = async () => {
    await fetch("/api/alerts?events=all", { method: "DELETE" });
    load();
  };

  const intro = (
    <p className="prose dim">
      Release reminders, price levels, headline keywords and Doomsday verdict changes, sent as notifications to your
      phone or computer. They are checked every few minutes on the site&apos;s servers, so they arrive with the site closed.
    </p>
  );

  if (!signedIn) {
    return (
      <div className="alr">
        {intro}
        <div className="gate">
          <h3>Sign in to set up alerts</h3>
          <p className="prose dim">Alerts are checked while you are away, so they belong to an account rather than this browser.</p>
          {canSignIn && <div className="btnrow"><a className="btn pri" href="/signin?next=%2F%23ALR">Sign in</a></div>}
        </div>
      </div>
    );
  }

  if (problem === "not_set_up") {
    return (
      <div className="alr">
        {intro}
        <div className="empty">Alerts are not switched on for the site yet. They will appear here once they are.</div>
      </div>
    );
  }

  return (
    <div className="alr">
      {intro}
      <DeviceBox device={device} />
      <NewAlert onCreate={create} prefill={request} watch={watch} />

      <div className="alr-list">
        <h3>Your alerts</h3>
        {problem && <p className="ch-msg" role="alert">{problem}</p>}
        {!data ? <div className="empty">Loading your alerts.</div> : !data.alerts.length ? (
          <div className="empty">No alerts yet. Make one above, or use Remind me on the calendar and Alert on your watchlist.</div>
        ) : data.alerts.map((a) => (
          <div className={"alr-row" + (a.active ? "" : " off")} key={a.id}>
            <span className="alr-kind">{KIND_TXT[a.kind]}</span>
            <span className="alr-desc">{describeAlert(a)}</span>
            <span className="alr-meta">{a.last_fired_at ? `Last sent ${ago(a.last_fired_at)}` : a.active ? "Waiting" : "Off"}</span>
            <span className="alr-act">
              <button type="button" className="chip" onClick={() => toggle(a)}>{a.active ? "Switch off" : "Switch on"}</button>
              <button type="button" className="chip" onClick={() => remove(a)}>Delete</button>
            </span>
          </div>
        ))}
      </div>

      {data?.events?.length > 0 && (
        <div className="alr-list">
          <h3>Recent alerts</h3>
          {data.events.map((e) => (
            <div className="alr-ev" key={e.id}>
              <span className="alr-evt">{e.title}</span>
              <span className="alr-meta">{ago(e.sent_at)}{e.delivered ? "" : " · not delivered to a device"}</span>
              {e.body && <span className="alr-evb">{e.body}</span>}
            </div>
          ))}
          <div className="btnrow"><button type="button" className="btn" onClick={clearEvents}>Clear this list</button></div>
        </div>
      )}

      <p className="wl-foot">
        Up to 25 alerts per account. Prices are free and delayed (Yahoo Finance, with Stooq as a back-up) and can differ a
        little from the quote tables, which come from TradingView; the form shows the price an alert is checked against.
        {data ? ` ${data.devices} device${data.devices === 1 ? "" : "s"} receiving.` : ""}
      </p>
    </div>
  );
}
