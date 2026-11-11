"use client";

/**
 * The Watchlist screen (WL): the visitor's own symbols, quoted live.
 *
 * Where the list lives: in the account when signed in (/api/watchlist, one
 * row per account), otherwise in this browser. A list built before signing
 * in is added to the account's list at sign-in and then leaves the browser,
 * so nothing is lost by starting without an account.
 *
 * `useWatchlist` is called once, by the page, because three places change the
 * list: this screen, the "Watch" button on the Charts screen, and the command
 * bar (`WL GOLD`).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { CHART_GROUPS, chartName, findSymbol } from "@/lib/charts";
import { WATCH_MAX, WATCH_STORE, WATCH_STARTER, cleanSymbols } from "@/lib/watchlist";

function readLocal() {
  try {
    return cleanSymbols(JSON.parse(localStorage.getItem(WATCH_STORE) || "[]"));
  } catch {
    return [];
  }
}
function writeLocal(list) {
  try {
    if (list.length) localStorage.setItem(WATCH_STORE, JSON.stringify(list));
    else localStorage.removeItem(WATCH_STORE);
  } catch {}
}

export function useWatchlist(user) {
  const uid = user?.id || null;
  const [list, setList] = useState([]);
  // "browser" until the account's list has loaded; "account" after.
  const [where, setWhere] = useState("browser");
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState("");
  const [flash, setFlash] = useState("");
  // True only when the list changed by the visitor's hand (or a merge), so a
  // list that was merely loaded is not written straight back.
  const dirty = useRef(false);
  const current = useRef(list);
  current.current = list;

  useEffect(() => {
    let off = false;
    const local = readLocal();
    dirty.current = false;
    setProblem("");
    if (!uid) {
      setList(local);
      setWhere("browser");
      setReady(true);
      return;
    }
    setReady(false);
    fetch("/api/watchlist")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d) => {
        if (off) return;
        const saved = cleanSymbols(d.symbols);
        const merged = cleanSymbols([...saved, ...local]);
        dirty.current = merged.length !== saved.length;
        setList(merged);
        setWhere("account");
        setReady(true);
      })
      .catch(() => {
        if (off) return;
        setList(local);
        setWhere("browser");
        setProblem("Your account's watchlist could not be loaded, so this is the list kept in this browser. Changes made here are added to your account the next time it loads.");
        setReady(true);
      });
    return () => {
      off = true;
    };
  }, [uid]);

  useEffect(() => {
    if (!ready || !dirty.current) return;
    dirty.current = false;
    if (where === "browser") return writeLocal(list);
    // A short wait, so a run of quick changes is one save of the final list.
    let sent = false;
    const t = setTimeout(async () => {
      sent = true;
      try {
        const r = await fetch("/api/watchlist", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ symbols: list })
        });
        if (!r.ok) throw new Error("save");
        writeLocal([]);
        setProblem("");
      } catch {
        setProblem("That change did not reach your account. It is still shown here, and is sent again with your next change.");
      }
    }, 350);
    return () => {
      clearTimeout(t);
      // Cancelled before it was sent: whatever replaces it must still save.
      if (!sent) dirty.current = true;
    };
  }, [list, where, ready]);

  const change = useCallback((next) => {
    dirty.current = true;
    setList(cleanSymbols(next));
  }, []);

  const add = useCallback((symbol) => {
    const [s] = cleanSymbols([symbol]);
    if (!s) return false;
    const cur = current.current;
    if (cur.includes(s)) return setFlash(`${chartName(s)} is already on your watchlist.`), false;
    if (cur.length >= WATCH_MAX) return setFlash(`The watchlist holds ${WATCH_MAX}. Remove one to add ${chartName(s)}.`), false;
    change([...cur, s]);
    setFlash(`Added ${chartName(s)}.`);
    return true;
  }, [change]);

  const remove = useCallback((symbol) => {
    change(current.current.filter((x) => x !== symbol));
    setFlash(`Removed ${chartName(symbol)}.`);
  }, [change]);

  const move = useCallback((symbol, by) => {
    const cur = [...current.current];
    const i = cur.indexOf(symbol);
    const j = i + by;
    if (i < 0 || j < 0 || j >= cur.length) return;
    [cur[i], cur[j]] = [cur[j], cur[i]];
    change(cur);
    setFlash("");
  }, [change]);

  const fill = useCallback(() => {
    change([...current.current, ...WATCH_STARTER]);
    setFlash("");
  }, [change]);

  return { list, where, ready, problem, flash, setFlash, add, remove, move, fill };
}

/**
 * `quotes` is the live quote table for the list, built by the page (which owns
 * the widget component and the theme). `openChart(symbol)` goes to CHT.
 */
export default function WatchlistScreen({ watch, signedIn, canSignIn, quotes, openChart }) {
  const { list, where, ready, problem, flash, setFlash, add, remove, move, fill } = watch;
  const [typed, setTyped] = useState("");

  function submitTyped(e) {
    e.preventDefault();
    if (!typed.trim()) return;
    const hit = findSymbol(typed);
    if (!hit) return setFlash(`Nothing called "${typed.trim()}" in the list. Type it in full as EXCHANGE:TICKER, for example NASDAQ:AAPL.`);
    if (add(hit)) setTyped("");
  }

  return (
    <div className="wl">
      {!signedIn && canSignIn && (
        <div className="gate">
          <h3>Sign in to keep this list on your account</h3>
          <p className="prose dim">
            Without an account the list is kept in this browser only. Sign in and it follows you to any device; a list
            you have already started here is carried over.
          </p>
          <div className="btnrow">
            <a className="btn pri" href="/signin?next=%2F%23WL">Sign in</a>
          </div>
        </div>
      )}

      <div className="ch-pick">
        <label className="ch-k" htmlFor="wl-list">Add</label>
        <select id="wl-list" value="" onChange={(e) => e.target.value && add(e.target.value)}>
          <option value="">Choose from the list</option>
          {CHART_GROUPS.map((g) => (
            <optgroup key={g.name} label={g.name}>
              {g.symbols.map(([sym, name]) => (
                <option key={sym} value={sym} disabled={list.includes(sym)}>{name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <form className="ch-type" onSubmit={submitTyped}>
          <input type="text" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Or type: gold, EURUSD, NASDAQ:AAPL" aria-label="Type a symbol to add" autoCapitalize="characters" spellCheck={false} />
          <button type="submit" className="ch-seg">Add</button>
        </form>
      </div>
      {flash && <p className="wl-msg" role="status">{flash}</p>}
      {problem && <p className="ch-msg" role="alert">{problem}</p>}

      {!ready ? (
        <div className="empty">Loading your watchlist.</div>
      ) : !list.length ? (
        <div className="empty wl-empty">
          <p>Nothing on your watchlist yet. Add a symbol above, or use Watch on any chart.</p>
          <button type="button" className="btn" onClick={fill}>Start with the main benchmarks</button>
        </div>
      ) : (
        <>
          {quotes}
          <div className="wl-rows" role="list" aria-label="Your watchlist, in order">
            {list.map((sym, i) => (
              <div className="wl-row" role="listitem" key={sym}>
                <span className="wl-n mono">{String(i + 1).padStart(2, "0")}</span>
                <span className="wl-name">{chartName(sym) === sym ? sym.split(":")[1] : chartName(sym)}</span>
                <span className="wl-sym mono">{sym}</span>
                <span className="wl-act">
                  <button type="button" className="chip" onClick={() => openChart(sym)}>Chart</button>
                  <button type="button" className="chip" onClick={() => move(sym, -1)} disabled={i === 0} aria-label={`Move ${chartName(sym)} up`}>Up</button>
                  <button type="button" className="chip" onClick={() => move(sym, 1)} disabled={i === list.length - 1} aria-label={`Move ${chartName(sym)} down`}>Down</button>
                  <button type="button" className="chip" onClick={() => remove(sym)} aria-label={`Remove ${chartName(sym)}`}>Remove</button>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="wl-foot">
        <span className="mono">{list.length}/{WATCH_MAX}</span>
        {" · "}
        {where === "account" ? "Saved to your account." : "Kept in this browser."}
        {" Futures from CBOT, NYMEX and ICE, and most Asian and Middle Eastern exchanges, do not quote on the free widget; a symbol that stays blank is one of those."}
      </p>
    </div>
  );
}
