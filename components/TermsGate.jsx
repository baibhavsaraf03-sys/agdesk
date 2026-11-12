"use client";

/**
 * First-visit terms (owner, 12 Nov): nobody sees a desk screen until they
 * have agreed to the terms once on this device. The full text stays on the
 * TERMS screen, which is the one screen readable before agreeing; it shows
 * TermsBar at the top so the reader can agree from there.
 *
 * Agreement is kept in the browser (`agdesk.terms` = TERMS_VERSION). Bump
 * TERMS_VERSION when the terms change materially and everyone is asked again.
 */
import { useCallback, useEffect, useState } from "react";

export const TERMS_VERSION = "2026-11-12";
const KEY = "agdesk.terms";

/** `termsOk` is null until the browser has been read, then true or false. */
export function useTerms() {
  const [termsOk, setOk] = useState(null);
  useEffect(() => {
    let ok = false;
    try { ok = localStorage.getItem(KEY) === TERMS_VERSION; } catch {}
    setOk(ok);
  }, []);
  const acceptTerms = useCallback(() => {
    try { localStorage.setItem(KEY, TERMS_VERSION); } catch {}
    setOk(true);
  }, []);
  return { termsOk, acceptTerms };
}

const POINTS = [
  ["Education, not advice", "Nothing here is financial, investment, legal or tax advice, or a recommendation to buy, sell or hold anything. It knows nothing about your circumstances."],
  ["Leverage can take more than you put in", "Futures and options can lose more than the deposit, and most individual traders lose money."],
  ["The numbers have limits", "Prices are delayed. Market reads are written by AI from public sources on a schedule and can be wrong, stale or incomplete. Check the timestamp and the source."],
  ["Your data", "Signing in stores your email and what you choose to save. The privacy page lists everything kept and who handles it."],
  ["No warranty", "The site is provided as it is. You use it, and rely on it, at your own risk."]
];

function Agree({ checked, setChecked, id }) {
  return (
    <label className="gate-agree" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
      <span>
        I have read and agree to the <a href="/#TERMS" onClick={(e) => e.stopPropagation()}>terms of use</a> and the{" "}
        <a href="/privacy" target="_blank" rel="noopener">privacy notice</a>.
      </span>
    </label>
  );
}

export function TermsGate({ onAccept, onReadAll, onBack }) {
  const [checked, setChecked] = useState(false);
  // Arriving from the door can leave the page scrolled; the terms start at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
    const r = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(r);
  }, []);
  return (
    <div className="tgate dotfield">
      <div className="gate-sheet">
        <div className="gate-mark">LEDGE DESK</div>
        <h1 className="gate-h">Before you enter</h1>
        <div className="gate-rule" />
        <ol className="gate-list">
          {POINTS.map(([t, d], i) => (
            <li key={t}>
              <span className="gate-n">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div className="gate-t">{t}</div>
                <p>{d}</p>
              </div>
            </li>
          ))}
        </ol>
        <Agree checked={checked} setChecked={setChecked} id="gate-agree" />
        <div className="gate-acts">
          <button type="button" className="btn pri gate-btn" disabled={!checked} onClick={onAccept}>Agree and enter</button>
          <button type="button" className="btn gate-btn" onClick={onReadAll}>Read the full terms</button>
        </div>
        <button type="button" className="gate-back" onClick={onBack}>Back to the front page</button>
      </div>
    </div>
  );
}

/** Shown above the full terms until the reader agrees. */
export function TermsBar({ onAccept }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="gate-bar">
      <Agree checked={checked} setChecked={setChecked} id="gate-bar-agree" />
      <button type="button" className="btn pri" disabled={!checked} onClick={onAccept}>Agree and enter</button>
    </div>
  );
}
