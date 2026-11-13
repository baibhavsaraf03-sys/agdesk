/**
 * Motion for the desk (13 Nov, owner's request: smoother, slower changes).
 *
 * `smoothly(update, kind)` runs a state change inside the browser's View
 * Transitions API, so the old page fades into the new one; "theme" uses a
 * slower cross-fade (see the ::view-transition rules at the end of
 * globals.css). Browsers without the API get a CSS colour fade for theme
 * changes and an instant change otherwise. Everything is skipped when the
 * visitor has asked for reduced motion.
 *
 * `enterScreen(el)` eases a screen's content up and in after navigation.
 */

function reduced() {
  return typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function smoothly(update, kind = "page") {
  if (reduced()) return update();
  const root = document.documentElement;
  if (typeof document.startViewTransition === "function") {
    root.dataset.vt = kind;
    try {
      const t = document.startViewTransition(update);
      t.finished.finally(() => { delete root.dataset.vt; });
    } catch {
      delete root.dataset.vt;
      update();
    }
    return;
  }
  if (kind === "theme") {
    root.classList.add("theme-fading");
    update();
    setTimeout(() => root.classList.remove("theme-fading"), 900);
    return;
  }
  update();
}

export function enterScreen(el) {
  if (!el || reduced() || typeof el.animate !== "function") return;
  el.animate(
    [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
    { duration: 420, easing: "cubic-bezier(.2,.7,.2,1)" }
  );
}
