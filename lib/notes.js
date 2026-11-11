/**
 * Daily news notes: one dated line under a fixed piece of text saying where
 * it shows up in today's headlines.
 *
 * The fixed text (a framework, a capital flow, a lesson, a glossary term)
 * never changes; it is the part search engines index and students revise
 * from. The note beside it is rewritten by scripts/notes-read.mjs three times
 * a day, and only where a headline genuinely illustrates the item. Every note
 * must name the headline it rests on, and the script drops any that does not,
 * so a note can never be a figure the model remembered.
 *
 * Each set is one model call. They are stored as rows in `market_reads` under
 * the zone `notes_<set>`, served by /api/notes, and shown by
 * components/NewsNote.jsx.
 */
import { GLOSSARY, TUTORIALS, RISKS, METHOD } from "./content.js";
import { FLOWS } from "./flows.js";
import { ALL_FRAMEWORKS } from "./disciplines.js";
import { slugify } from "./pages.js";

const plain = (s) => String(s || "").replace(/\*\*/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/** The id a note is stored under; the same function names it on screen. */
export const noteId = {
  framework: (f) => `${f.discipline}-${slugify(f.t)}`,
  flow: (f) => slugify(f.name),
  term: (term) => slugify(term),
  lesson: (t) => `tut-${slugify(t.t)}`,
  risk: (r) => `risk-${slugify(r.h)}`,
  method: (m) => `mtd-${slugify(m.t)}`
};

export const NOTE_SETS = {
  disc: {
    label: "Economics, Law, International Relations and Politics frameworks",
    ask: "Name the headline that is the clearest live case of the framework and say in one or two sentences how the framework reads it.",
    items: () => ALL_FRAMEWORKS.map((f) => ({ id: noteId.framework(f), name: `${f.t} (${f.discipline})`, about: cut(plain(f.s), 160) }))
  },
  flow: {
    label: "structural capital flows",
    ask: "Name the headline that is the clearest new evidence on the flow and say in one or two sentences whether it shows the flow continuing, slowing or reversing, or only that it is being talked about.",
    items: () => FLOWS.map((f) => ({ id: noteId.flow(f), name: f.name, about: cut(plain(f.body), 220) }))
  },
  glos: {
    label: "glossary terms",
    ask: "Name the headline in which the term is doing real work and say in one plain sentence what it means there, for a reader who is new to markets.",
    items: () => GLOSSARY.map(([term, def]) => ({ id: noteId.term(term), name: term, about: cut(plain(def), 160) }))
  },
  lessons: {
    label: "beginner lessons, risk mechanisms and method notes",
    ask: "Name the headline that shows the lesson playing out and say in one or two plain sentences what a beginner should notice in it.",
    items: () => [
      ...TUTORIALS.map((t) => ({ id: noteId.lesson(t), name: t.t, about: cut(plain(t.s), 160) })),
      ...RISKS.map((r) => ({ id: noteId.risk(r), name: plain(r.h).replace(/^\d+\s*·\s*/, ""), about: cut(plain(r.body), 160) })),
      ...METHOD.map((m) => ({ id: noteId.method(m), name: m.t, about: cut(plain(m.i), 160) }))
    ]
  }
};

export const NOTE_SET_KEYS = Object.keys(NOTE_SETS);
