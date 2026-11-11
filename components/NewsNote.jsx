"use client";

/**
 * The dated "in today's news" line under fixed teaching text (lib/notes.js).
 *
 * Every NewsNote on a page shares one request to /api/notes, refreshed every
 * fifteen minutes and whenever the tab comes back into view, so a page with
 * forty frameworks costs one fetch, not forty. When there is no note for an
 * item, nothing renders: the fixed text stands alone, as it did before.
 */
import { useEffect, useState } from "react";

const REFRESH_MS = 15 * 60000;
let state = { notes: {}, at: 0 };
let inflight = null;
const listeners = new Set();

function load(force = false) {
  if (inflight) return inflight;
  if (!force && Date.now() - state.at < REFRESH_MS) return Promise.resolve(state);
  inflight = fetch("/api/notes")
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (j?.notes) state = { notes: j.notes, at: Date.now() };
      listeners.forEach((fn) => fn(state));
      return state;
    })
    .catch(() => state)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

let timer = null;
function subscribe(fn) {
  listeners.add(fn);
  if (!timer) {
    timer = setInterval(() => load(true), REFRESH_MS);
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisible);
  }
  load();
  return () => {
    listeners.delete(fn);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", onVisible);
    }
  };
}
function onVisible() {
  if (document.visibilityState === "visible") load();
}

export function useNotes() {
  const [s, setS] = useState(state);
  useEffect(() => subscribe(setS), []);
  return s.notes;
}

export default function NewsNote({ set, id, label = "In today's news" }) {
  const notes = useNotes();
  const group = notes?.[set];
  const n = group?.notes?.[id];
  if (!n) return null;
  return (
    <div className="newsnote">
      <span className="newsnote-k">
        {label}
        {group.stamp && <span className="newsnote-t"> · {group.stamp}</span>}
      </span>
      <p>{n.note}</p>
      {n.src?.t && (
        <p className="newsnote-src">
          {n.src.u ? (
            <a href={n.src.u} target="_blank" rel="noopener noreferrer">{n.src.t}</a>
          ) : (
            n.src.t
          )}
          {n.src.s && <span> · {n.src.s.replace(/^www\./, "")}</span>}
        </p>
      )}
    </div>
  );
}
