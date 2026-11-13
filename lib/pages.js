/**
 * Real addresses for the evergreen content.
 *
 * The desk itself is one client-rendered page that swaps screens on a #hash,
 * which a search engine sees as a single URL. The lessons and the glossary
 * are the parts people actually search for ("what is contango"), so each gets
 * its own server-rendered page built from the same data the desk uses. One
 * source, two presentations: edit lib/content.js and both change.
 */
import { TUTORIALS, GLOSSARY } from "./content.js";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://ledgedesk.com").replace(/\/+$/, "");
export const SITE_NAME = "Ledge Desk";

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Strip the **bold** markers for places that take plain text (meta tags). */
export const plain = (text) => String(text || "").replace(/\*\*/g, "");

export const LESSONS = TUTORIALS.map((t, i) => ({
  ...t,
  n: i + 1,
  slug: slugify(t.t),
  title: t.t,
  summary: plain(t.s)
}));

export const TERMS = GLOSSARY.map(([term, def]) => ({ term, def, slug: slugify(term) }));

/** Lessons grouped by track, in order, for the index page. */
export function lessonTracks() {
  const out = [];
  for (const l of LESSONS) {
    let g = out.find((x) => x.tr === l.tr);
    if (!g) out.push((g = { tr: l.tr, name: l.trn, lessons: [] }));
    g.lessons.push(l);
  }
  return out;
}

/** Other glossary terms that a piece of text mentions, for cross-links. */
export function termsIn(text, exceptSlug) {
  const hay = " " + plain(text).toLowerCase() + " ";
  return TERMS.filter(
    (t) => t.slug !== exceptSlug && new RegExp("[^a-z]" + t.term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "s?[^a-z]").test(hay)
  );
}
