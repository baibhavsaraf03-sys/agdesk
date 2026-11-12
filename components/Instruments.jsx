"use client";

/**
 * The Noir home instruments (12 Nov): a 911-style cluster of five dials, the
 * hour's brief, the next major release counting down, the S&P 500 session as
 * a gold line, and the positions of note.
 *
 * Prices and the mood word come from /api/pulse (Yahoo, delayed; the mood is
 * read off the VIX in fixed bands, see lib/pulse.mjs). The brief is the
 * newest market read's `short`. The AI-exposure dial counts the Doomsday
 * tabs whose latest verdict "supports" the bubble argument. Nothing here is
 * invented: a dial with no figure says so.
 */
import { useEffect, useMemo, useState } from "react";
import { upcomingEvents } from "@/lib/calendar";
import { fmtChange, fmtPrice } from "@/lib/pulse.mjs";

const MARKET_ZONES = ["ams", "eur", "eas", "ind", "anz"];

/** Polls /api/pulse every two minutes while the page is visible. */
export function usePulse() {
  const [pulse, setPulse] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let dead = false;
    const load = () => {
      if (document.visibilityState === "hidden") return;
      fetch("/api/pulse")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((j) => { if (!dead) { setPulse(j); setFailed(false); } })
        .catch(() => { if (!dead) setFailed(true); });
    };
    load();
    const t = setInterval(load, 120000);
    document.addEventListener("visibilitychange", load);
    return () => { dead = true; clearInterval(t); document.removeEventListener("visibilitychange", load); };
  }, []);
  return { pulse, failed };
}

/** The newest market read with a short version: `{ text, stamp, zone }` or null. */
export function deskBrief(reads) {
  const pick = MARKET_ZONES.map((z) => ({ z, r: reads?.[z] }))
    .filter(({ r }) => r && (r.short?.length || r.headline))
    .sort((a, b) => String(b.r._updatedAt || "").localeCompare(String(a.r._updatedAt || "")))[0];
  if (!pick) return null;
  const s = Array.isArray(pick.r.short) && pick.r.short.length ? pick.r.short.slice(0, 2).join(" ") : pick.r.headline;
  return { text: s, stamp: pick.r.stamp || "", zone: pick.z, at: pick.r._updatedAt || null };
}

/** `{ on, of }` from the Doomsday read's tab verdicts, or null before the first doom read. */
export function doomLights(reads) {
  const tabs = reads?.doom?.tabs;
  if (!Array.isArray(tabs) || !tabs.length) return null;
  return { on: tabs.filter((t) => t.verdict === "supports").length, of: tabs.length };
}

function ticks(c, r, n, dangerFrom, majorLen, minorLen) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = ((150 + (240 * i) / n) * Math.PI) / 180;
    const major = i % 5 === 0;
    const r2 = r - (major ? majorLen : minorLen);
    out.push({
      i,
      x1: c + r * Math.cos(a), y1: c + r * Math.sin(a), x2: c + r2 * Math.cos(a), y2: c + r2 * Math.sin(a),
      tone: i / n >= dangerFrom ? "danger" : major ? "major" : "minor",
      w: major ? 1.5 : 1
    });
  }
  return out;
}

/**
 * One gauge. `t` is the needle from 0 to 1 (null hides it), `value` the
 * dot-matrix figure, `sub` the small unit line.
 */
export function Dial({ size = 200, t, value, sub, label, aria, danger = 0.85 }) {
  const c = size / 2, r = c - 6;
  const ts = useMemo(() => ticks(c, r, 40, danger, size > 260 ? 16 : 13, size > 260 ? 8 : 6), [c, r, danger, size]);
  const na = t == null ? null : ((150 + 240 * Math.max(0, Math.min(1, t))) * Math.PI) / 180;
  const nl = r - (size > 260 ? 30 : 24);
  const big = size > 260;
  return (
    <figure className={"dial" + (big ? " dial-big" : "")}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={aria}>
        <circle cx={c} cy={c} r={r + 4} className="dial-face" />
        {ts.map((k) => (
          <line key={k.i} x1={k.x1} y1={k.y1} x2={k.x2} y2={k.y2} className={"dial-t " + k.tone} strokeWidth={k.w} />
        ))}
        {na != null && <line x1={c} y1={c} x2={c + nl * Math.cos(na)} y2={c + nl * Math.sin(na)} className="dial-needle" />}
        <circle cx={c} cy={c} r={big ? 6 : 5} className="dial-hub" />
        <text x={c} y={c + size * 0.24} textAnchor="middle" className={"dial-val" + (big ? " big" : String(value || "").length > 6 ? " long" : "")}>
          {value || "—"}
        </text>
        <text x={c} y={c + size * 0.34} textAnchor="middle" className="dial-sub">{sub}</text>
      </svg>
      {label && <figcaption>{label}</figcaption>}
    </figure>
  );
}

function needleForChange(c) {
  // ±2% fills the dial; most days sit near the middle.
  return c == null || !isFinite(c) ? null : 0.5 + Math.max(-1, Math.min(1, c / 2)) / 2;
}

/** The mood dial on its own, for the menu sheet. */
export function MoodDial({ pulse, size = 260 }) {
  const m = pulse?.mood;
  return (
    <Dial
      size={size}
      t={m ? m.needle : null}
      value={m ? m.word.toUpperCase() : null}
      sub={m ? `VIX ${m.level.toFixed(1)}` : "MARKET MOOD"}
      aria={m ? `Market mood: ${m.word}, VIX ${m.level.toFixed(1)}` : "Market mood unavailable"}
      danger={0.8}
    />
  );
}

function useClock(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function countdown(ms) {
  if (ms <= 0) return "NOW";
  const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  const p = (x) => String(x).padStart(2, "0");
  return d ? `${d}D ${p(h)}:${p(mm)}` : `${p(h)}:${p(mm)}:${p(Math.floor((ms % 60000) / 1000))}`;
}

function SessionLine({ session }) {
  const pts = session?.points || [];
  if (pts.length < 2) return <p className="inst-none">The session line appears once the price source answers.</p>;
  const W = 760, H = 220, top = 16, bottom = 196;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  if (session.prev) ys.push(session.prev);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), lo = Math.min(...ys), hi = Math.max(...ys);
  const X = (t) => ((t - x0) / Math.max(1, x1 - x0)) * (W - 40);
  const Y = (v) => bottom - ((v - lo) / Math.max(1e-9, hi - lo)) * (bottom - top);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const lx = X(last[0]), ly = Y(last[1]);
  const tail = pts.slice(-Math.max(3, Math.floor(pts.length / 8)));
  const dt = tail.map((p, i) => `${i ? "L" : "M"}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join(" ");
  const fmt = (t) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: session.tz || undefined });
  const up = session.prev ? last[1] >= session.prev : true;
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="inst-line" role="img"
      aria-label={`${session.name} today, ${up ? "above" : "below"} the previous close, last ${fmtPrice(last[1])}`}>
      <defs>
        <linearGradient id="inst-spot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gold)" stopOpacity="0.32" />
          <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {session.prev && <line x1="0" x2={W - 40} y1={Y(session.prev)} y2={Y(session.prev)} className="inst-prev" />}
      <path d={`${d} L${lx.toFixed(1)} ${bottom} L0 ${bottom} Z`} className="inst-fill" />
      <polygon points={`${lx},${ly} ${lx - 44},${bottom} ${lx + 44},${bottom}`} fill="url(#inst-spot)" />
      <path d={d} className="inst-path" />
      <path d={dt} className="inst-tail" />
      <circle cx={lx} cy={ly} r="4" className="inst-dot" />
      <text x="0" y={H + 18} className="inst-ax">{fmt(pts[0][0])}</text>
      <text x={W - 40} y={H + 18} textAnchor="end" className="inst-ax">{fmt(last[0])}</text>
      {session.prev && <text x={W - 36} y={Y(session.prev) + 4} className="inst-ax">PREV</text>}
    </svg>
  );
}

/**
 * The home page top: cluster, brief, session, next release, positions.
 * `onAsk`, `onShare`, `onChart(symbol)` and `onCal()` come from the page.
 */
export function Instruments({ pulse, failed, reads, onAsk, onShare, onChart, onCal }) {
  const now = useClock();
  const inst = Object.fromEntries((pulse?.instruments || []).map((i) => [i.k, i]));
  const lights = doomLights(reads);
  const brief = deskBrief(reads);
  const next = useMemo(() => upcomingEvents(now, 20).find((e) => e.tier === 1 && Date.parse(e.at) > now - 60000), [Math.floor(now / 60000)]); // eslint-disable-line react-hooks/exhaustive-deps
  const chg = (k) => inst[k]?.change;
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(now).toUpperCase();
  const asOf = pulse?.instruments?.find((i) => i.at)?.at;

  const dial = (k, label) => (
    <Dial
      t={needleForChange(chg(k))}
      value={chg(k) != null ? fmtChange(chg(k)).replace("%", "") : null}
      sub={chg(k) != null ? "PCT ON DAY" : "NO PRICE"}
      label={label}
      aria={chg(k) != null ? `${label} ${fmtChange(chg(k))} on the day` : `${label}: no price yet`}
    />
  );
  const gold = inst.gold;

  return (
    <div className="inst">
      <section className="inst-cluster dotfield">
        <div className="inst-head">
          <div>
            <h2 className="inst-h">Instruments</h2>
            <div className="inst-rule" />
          </div>
          <span className="inst-meta">
            {day}
            {asOf ? ` · PRICES ${new Date(asOf).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}, DELAYED` : failed ? " · PRICES UNAVAILABLE" : " · LOADING PRICES"}
          </span>
        </div>
        <div className="inst-dials">
          {dial("spx", "S&P 500")}
          {dial("ftse", "FTSE 100")}
          <div className="inst-mood">
            <MoodDial pulse={pulse} size={320} />
            <span className="inst-moodcap">THE DESK</span>
          </div>
          <Dial
            t={gold?.change != null ? needleForChange(gold.change) : null}
            value={gold?.price ? Math.round(gold.price).toLocaleString("en-GB") : null}
            sub={gold?.change != null ? `USD/OZ ${fmtChange(gold.change)}` : "USD/OZ"}
            label="Gold"
            aria={gold?.price ? `Gold ${Math.round(gold.price)} dollars an ounce, ${fmtChange(gold.change)} on the day` : "Gold: no price yet"}
          />
          <Dial
            t={lights ? lights.on / Math.max(1, lights.of) : null}
            value={lights ? `${lights.on}/${lights.of}` : null}
            sub="WARNING LIGHTS"
            label="AI exposure"
            danger={0.75}
            aria={lights ? `AI bubble: ${lights.on} of ${lights.of} warning lights on` : "AI bubble lights: waiting for the first Doomsday read"}
          />
        </div>
        <p className="inst-note">
          The mood is read off the VIX in fixed bands (under 13 calm, to 17 steady, to 22 uneasy, to 28 nervous, to 35 fearful, above that alarmed).
          AI exposure counts the Doomsday tabs whose latest evidence supports the bubble case.
        </p>
      </section>

      <section className="inst-brief">
        <div className="inst-brieftext">
          <div className="inst-k">The hour&apos;s brief{brief?.stamp ? ` · ${brief.stamp}` : ""}</div>
          <p>{brief ? brief.text : "The first read of the day has not landed yet."}</p>
        </div>
        <div className="inst-actions">
          <button type="button" className="btn pri" onClick={onAsk}>Question the analyst</button>
          <button type="button" className="btn" onClick={onShare}>Share today&apos;s card</button>
        </div>
      </section>

      <section className="inst-row">
        <div className="inst-session">
          <div className="inst-head">
            <div>
              <h2 className="inst-h small">Session</h2>
              <div className="inst-rule" />
            </div>
            <button type="button" className="inst-link" onClick={() => onChart("FOREXCOM:SPXUSD")}>
              S&amp;P 500 {inst.spx?.price ? `${fmtPrice(inst.spx.price)} ${fmtChange(inst.spx.change)}` : ""} · Chart
            </button>
          </div>
          <SessionLine session={pulse?.session} />
        </div>

        <div className="inst-side">
          {next && (
            <button type="button" className="cut racing inst-next" onClick={onCal}>
              <div className="cut-in">
                <div className="inst-k">Next major release</div>
                <div className="inst-nextname">{next.name}</div>
                <div className="inst-count">{countdown(Date.parse(next.at) - now)}</div>
                <div className="inst-nextmeta">
                  {new Date(next.at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).toUpperCase()}
                  {" · YOUR TIME · "}{next.currencies.join(" ")}
                </div>
              </div>
            </button>
          )}
          <div className="inst-pos">
            <div className="inst-k">Positions of note</div>
            <div className="inst-rule" />
            {(pulse?.instruments || []).filter((i) => i.price).map((i) => {
              const w = i.change == null ? 0 : Math.min(100, (Math.abs(i.change) / 2) * 100);
              const dir = i.change > 0 ? "up" : i.change < 0 ? "down" : "flat";
              return (
                <button type="button" key={i.k} className="inst-posrow" onClick={() => onChart(i.chart)} title={`Chart ${i.name}`}>
                  <span className="ipn">{i.name}</span>
                  <span className="ipp">{fmtPrice(i.price, i.unit)}</span>
                  <span className={"ipc " + dir}>{fmtChange(i.change)}</span>
                  <span className="ipbar"><span className={dir} style={{ width: `${w}%` }} /></span>
                </button>
              );
            })}
            {!(pulse?.instruments || []).some((i) => i.price) && (
              <p className="inst-none">{failed || pulse ? "The free price source did not answer. The TradingView quotes on each market screen are unaffected." : "Loading prices…"}</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
