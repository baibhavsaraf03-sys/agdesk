"use client";

/**
 * Site navigation: a full-screen menu sheet (Noir, 12 Nov) with the five
 * areas as columns, a search box and the Essential/Full desk switch (stored
 * as beginner/pro). On a phone the columns stack and fold with + and −.
 *
 * The page owns which screen is open and whether the menu is open; this
 * file owns how screens are found. Grouping and the Beginner set are in
 * lib/nav.js.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { NAV_AREAS, NAV_FOOT, BEGINNER, NAV_MODE_STORE, areaOf } from "@/lib/nav";

/** Beginner for a first visit, Pro for anyone who has used the desk before this menu existed. */
export function useNavMode() {
  const [mode, setMode] = useState("pro");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAV_MODE_STORE);
      if (saved === "beginner" || saved === "pro") setMode(saved);
      else setMode(localStorage.getItem("agdesk.screen") ? "pro" : "beginner");
    } catch {}
  }, []);
  const change = (m) => {
    setMode(m);
    try {
      localStorage.setItem(NAV_MODE_STORE, m);
    } catch {}
  };
  return [mode, change];
}

function norm(s) {
  return String(s || "").toLowerCase().normalize("NFKD").replace(/[^\w\s]/g, " ");
}

/** Screens matching typed words, best first: code, then name, then description. */
function search(screens, q) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return screens
    .map((s) => {
      const code = s.c.toLowerCase(), name = norm(s.t), desc = norm(s.d);
      let score = 0;
      for (const w of words) {
        if (code === w) score += 100;
        else if (code.startsWith(w)) score += 40;
        else if (name.split(/\s+/).some((x) => x.startsWith(w))) score += 30;
        else if (name.includes(w)) score += 15;
        else if (desc.includes(w)) score += 5;
        else return null;
      }
      return { s, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

/**
 * `findExtra(q)` may return `{ label, desc, run }` for something that is not a
 * screen (the page uses it to offer a chart of a typed symbol). It goes first
 * unless a screen matches the words strongly.
 */
export function SideNav({ screens, screen, go, mode, setMode, onPicked, extras, findExtra, aside, open: sheetOpen, onClose }) {
  const byCode = useMemo(() => Object.fromEntries(screens.map((s) => [s.c, s])), [screens]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(() => new Set([areaOf(screen) || "today"]));
  const input = useRef(null);

  // The area of the screen being read is always open (this only matters on a
  // phone, where the areas fold; on a wide screen every column is shown).
  useEffect(() => {
    const a = areaOf(screen);
    if (a) setOpen((o) => (o.has(a) ? o : new Set([...o, a])));
  }, [screen]);

  // Opening the sheet puts the cursor in the search box on a keyboard device.
  useEffect(() => {
    if (sheetOpen && window.matchMedia?.("(pointer:fine)").matches) setTimeout(() => input.current?.focus(), 60);
    if (!sheetOpen) setQ("");
  }, [sheetOpen]);

  const hits = useMemo(() => {
    const found = search(screens, q);
    const extra = q.trim() ? findExtra?.(q) : null;
    const list = found.map(({ s, score }) => ({ key: s.c, label: s.t, desc: s.d, code: s.c, score }));
    if (!extra) return list;
    const item = { key: "extra", label: extra.label, desc: extra.desc, run: extra.run };
    return (list[0]?.score || 0) >= 30 ? [...list, item] : [item, ...list];
  }, [screens, q, findExtra]);
  const pick = (code) => {
    go(code);
    setQ("");
    onPicked?.();
  };
  const choose = (h) => {
    if (h.run) {
      h.run();
      setQ("");
      onPicked?.();
    } else pick(h.code);
  };

  const toggle = (id) => setOpen((o) => {
    const n = new Set(o);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  return (
    <div className="nav-sheet">
      {aside && <div className="nav-aside dotfield">{aside}</div>}
      <div className="nav-main">
        <div className="nav-headrow">
          <h2 className="nav-title">The desk</h2>
          {onClose && (
            <button type="button" className="nav-close" aria-label="Close the menu" onClick={onClose}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
            </button>
          )}
        </div>
        <div className="nav-rule" />

        <div className="nav-top">
          <label className="nav-jumplabel" htmlFor="nav-jump">Find a screen or market</label>
          <input
            id="nav-jump"
            ref={input}
            className="nav-jump"
            type="search"
            value={q}
            placeholder="Gold, calendar, risk, NVDA"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && hits[0]) { e.preventDefault(); choose(hits[0]); }
              if (e.key === "Escape" && q) { e.stopPropagation(); setQ(""); }
            }}
          />
          <div className="nav-mode" role="group" aria-label="Menu size">
            <button type="button" className={"ch-seg" + (mode === "beginner" ? " on" : "")} aria-pressed={mode === "beginner"} onClick={() => setMode("beginner")}>Essential</button>
            <button type="button" className={"ch-seg" + (mode === "pro" ? " on" : "")} aria-pressed={mode === "pro"} onClick={() => setMode("pro")}>Full desk</button>
          </div>
        </div>

        {q.trim() ? (
          <div className="nav-hits">
            {hits.length ? hits.map((h) => (
              <button key={h.key} type="button" className="navitem nav-hit" aria-current={h.code ? screen === h.code : undefined} onClick={() => choose(h)}>
                <span className="navname">{h.label}</span>
                <span className="nav-desc">{h.desc}</span>
              </button>
            )) : <p className="nav-none">No screen matches &ldquo;{q}&rdquo;.</p>}
          </div>
        ) : (
          <div className="nav-cols">
            {NAV_AREAS.map((a) => {
              const all = a.items.filter((c) => byCode[c]);
              const shown = mode === "beginner" ? all.filter((c) => BEGINNER.has(c) || c === screen) : all;
              const hidden = all.length - shown.length;
              const isOpen = open.has(a.id);
              const here = all.includes(screen);
              return (
                <div className="navgroup" key={a.id}>
                  <button type="button" className={"nav-area" + (here ? " here" : "")} aria-expanded={isOpen} onClick={() => toggle(a.id)}>
                    <span>{a.t}</span>
                    <span className="nav-pm" aria-hidden="true">{isOpen ? "−" : "+"}</span>
                  </button>
                  <div className={"nav-list" + (isOpen ? "" : " shut")}>
                    {shown.map((code) => (
                      <button key={code} type="button" className="navitem" aria-current={screen === code} title={byCode[code].d} onClick={() => pick(code)}>
                        <span className="navname">{byCode[code].t}</span>
                        <span className="navcode">{code}</span>
                      </button>
                    ))}
                    {hidden > 0 && (
                      <button type="button" className="nav-more" onClick={() => setMode("pro")}>
                        {hidden} more in the full desk
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {extras && <div className="nav-extras">{extras}</div>}

        <div className="navfoot">
          {NAV_FOOT.filter((c) => byCode[c]).map((c) => (
            <button key={c} type="button" className="linkbtn" onClick={() => pick(c)}>{byCode[c].t}</button>
          ))}
          <span>Educational material, not investment advice.</span>
        </div>
      </div>
    </div>
  );
}
