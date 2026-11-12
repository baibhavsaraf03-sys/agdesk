"use client";

/**
 * Site navigation: the side menu (five areas, a jump box, the Beginner/Pro
 * switch) and, on phones, a bottom bar with the five areas.
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
export function SideNav({ screens, screen, go, mode, setMode, focusArea, onPicked, extras, findExtra }) {
  const byCode = useMemo(() => Object.fromEntries(screens.map((s) => [s.c, s])), [screens]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(() => new Set([areaOf(screen) || "today"]));
  const input = useRef(null);

  // The area of the screen being read is always open; a bottom-bar tap opens its area alone.
  useEffect(() => {
    const a = areaOf(screen);
    if (a) setOpen((o) => (o.has(a) ? o : new Set([...o, a])));
  }, [screen]);
  useEffect(() => {
    if (focusArea?.id) {
      setOpen(new Set([focusArea.id]));
      setQ("");
    }
  }, [focusArea]);

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
    <>
      <div className="nav-top">
        <label className="sr" htmlFor="nav-jump">Jump to a screen</label>
        <input
          id="nav-jump"
          ref={input}
          className="nav-jump"
          type="search"
          value={q}
          placeholder="Jump to… (gold, calendar, risk)"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hits[0]) { e.preventDefault(); choose(hits[0]); }
            if (e.key === "Escape") setQ("");
          }}
        />
        <div className="nav-mode" role="group" aria-label="Menu size">
          <button type="button" className={"ch-seg" + (mode === "beginner" ? " on" : "")} aria-pressed={mode === "beginner"} onClick={() => setMode("beginner")}>Beginner</button>
          <button type="button" className={"ch-seg" + (mode === "pro" ? " on" : "")} aria-pressed={mode === "pro"} onClick={() => setMode("pro")}>Pro</button>
        </div>
        <p className="nav-modenote">
          {mode === "beginner" ? "The essentials only. Every screen is still one search away." : "Every screen, grouped."}
        </p>
      </div>

      {q.trim() ? (
        <div className="navgroup">
          {hits.length ? hits.map((h) => (
            <button key={h.key} type="button" className="navitem nav-hit" aria-current={h.code ? screen === h.code : undefined} onClick={() => choose(h)}>
              <span className="navname">{h.label}</span>
              <span className="nav-desc">{h.desc}</span>
            </button>
          )) : <p className="nav-none">No screen matches &ldquo;{q}&rdquo;.</p>}
        </div>
      ) : (
        NAV_AREAS.map((a) => {
          const all = a.items.filter((c) => byCode[c]);
          const shown = mode === "beginner" ? all.filter((c) => BEGINNER.has(c) || c === screen) : all;
          const hidden = all.length - shown.length;
          const isOpen = open.has(a.id);
          const here = all.includes(screen);
          return (
            <div className="navgroup" key={a.id}>
              <button type="button" className={"nav-area" + (here ? " here" : "")} aria-expanded={isOpen} onClick={() => toggle(a.id)}>
                <span>{a.t}</span>
                <span className="nav-count">{isOpen ? "Hide" : shown.length}</span>
              </button>
              {isOpen && (
                <>
                  {shown.map((code) => (
                    <button key={code} type="button" className="navitem" aria-current={screen === code} title={byCode[code].d} onClick={() => pick(code)}>
                      <span className="navname">{byCode[code].t}</span>
                      <span className="navcode">{code}</span>
                    </button>
                  ))}
                  {hidden > 0 && (
                    <button type="button" className="nav-more" onClick={() => setMode("pro")}>
                      {hidden} more in Pro
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })
      )}

      {extras && <div className="nav-extras">{extras}</div>}

      <div className="navfoot">
        {NAV_FOOT.filter((c) => byCode[c]).map((c) => (
          <button key={c} type="button" className="linkbtn" onClick={() => pick(c)}>{byCode[c].t}</button>
        ))}
        <span>Educational material, not investment advice.</span>
      </div>
    </>
  );
}

/** Phones only (hidden by CSS above 760px): the five areas along the bottom. */
export function BottomBar({ screen, menuOpen, onArea }) {
  const current = areaOf(screen);
  return (
    <nav className="bbar" aria-label="Areas">
      {NAV_AREAS.map((a) => (
        <button key={a.id} type="button" className="bbar-b" aria-current={!menuOpen && current === a.id} onClick={() => onArea(a.id)}>
          {a.t}
        </button>
      ))}
    </nav>
  );
}
