/**
 * House style for everything the AI writes on the site (25 Nov, owner: "fix the AI phrasing").
 *
 * Two parts. HOUSE_STYLE goes into every writer's instructions: the voice of an old private
 * bank's morning note. tidy() then runs over whatever comes back and mends the stock phrases
 * that slip through anyway, by rule, so no free-tier quota is spent on retries. tidy() never
 * adds or changes a figure, a name or a date: it only swaps filler words and punctuation.
 */

export const HOUSE_STYLE = [
  "House style: write like the morning note of an old private bank. Dry, exact, unhurried, never excited.",
  "Short declarative sentences. Lead with the fact, then what it means. British spelling.",
  "Name the thing and give the number: 'the 10-year Treasury yield rose 4 basis points to 4.31%', not 'yields edged higher'.",
  "Headlines state what happened in plain words: no colon, no question, no pun.",
  "Never write: amid, against a backdrop of, in the wake of, navigate, landscape, delve, underscore, pivotal, crucial, robust, bolster, " +
    "tapestry, testament, realm, it remains to be seen, only time will tell, all eyes on, investors weigh, market participants, " +
    "a mixed bag, headwinds, tailwinds, in a sign that, a perfect storm, a rollercoaster, game-changer, sending shockwaves.",
  "Do not open sentences with Notably, Importantly, Ultimately, Overall, Interestingly, Moreover, Furthermore, Additionally, Meanwhile or In summary.",
  "No rhetorical questions, no 'it is not X, it is Y' constructions, no exclamation marks, no em dashes (use a comma or a full stop)."
].join(" ");

const OPENERS = /(^|[.!?]\s+)(?:Notably|Importantly|Ultimately|Overall|Interestingly|Crucially|Additionally|Furthermore|Moreover|In summary|In conclusion|Meanwhile|That said),\s+([a-z])/g;

/** [pattern, replacement]; replacements keep the first letter's case where it matters. */
const SWAPS = [
  [/\bamid (concerns|fears|worries|hopes|expectations|speculation|uncertainty|bets)\b/gi, "on $1"],
  [/\bamid(st)?\b/gi, "with"],
  [/\bagainst a backdrop of\b/gi, "with"],
  [/\bin the wake of\b/gi, "after"],
  [/\bin a sign that\b/gi, "suggesting that"],
  [/\bmarket participants\b/gi, "investors"],
  [/\bunderscores\b/gi, "shows"], [/\bunderscored\b/gi, "showed"], [/\bunderscoring\b/gi, "showing"], [/\bunderscore\b/gi, "show"],
  [/\bbolsters\b/gi, "supports"], [/\bbolstered\b/gi, "supported"], [/\bbolstering\b/gi, "supporting"], [/\bbolster\b/gi, "support"],
  [/\brobust\b/gi, "strong"],
  [/\bpivotal\b/gi, "important"],
  [/\bcrucial\b/gi, "important"],
  [/\bdelves? into\b/gi, (m) => (m.toLowerCase().startsWith("delves") ? "looks at" : "look at")],
  [/\bnavigat(e|es|ed|ing)\b/gi, (m, e) => ({ e: "handle", es: "handles", ed: "handled", ing: "handling" })[e.toLowerCase()]],
  [/\bit remains to be seen whether\b/gi, "it is not yet clear whether"],
  [/\bit remains to be seen\b/gi, "it is not yet clear"],
  [/\bonly time will tell\b/gi, "that is not yet clear"],
  [/\ball eyes (?:are |will be |now )?(?:turn(?:ing)? )?(?:on|to)\b/gi, "the focus is on"],
  [/\ba mixed bag\b/gi, "mixed"],
  [/\ba perfect storm\b/gi, "several pressures at once"],
  [/\bsending shockwaves (?:through|across)\b/gi, "unsettling"],
  [/\s+[—–]\s+/g, ", "],      // spaced dashes used as asides
  [/(\w)—(\w)/g, "$1, $2"],   // unspaced em dash between words
  [/!+/g, "."]
];

function capFirst(s) {
  return s.replace(/(^|[.?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

/** Mend one string. Returns it unchanged when there is nothing to mend. */
export function tidyText(s) {
  if (typeof s !== "string" || !s) return s;
  let t = s.replace(OPENERS, (m, lead, c) => lead + c.toUpperCase());
  for (const [re, to] of SWAPS) t = t.replace(re, to);
  t = t.replace(/\b([Aa]) important\b/g, "$1n important");
  t = t.replace(/,\s*,/g, ",").replace(/\s+,/g, ",").replace(/\.\s*\./g, ".");
  return t === s ? s : capFirst(t);
}

const SKIP = new Set(["url", "href", "link", "src", "source", "sources", "ticker", "symbol", "verdict", "writer", "stamp", "material", "phase", "zone", "id", "key", "facts", "ticker"]);

/** Walk a read (objects, arrays, strings) and mend every prose string. Counts the strings changed. */
export function tidy(value, stats = { changed: 0 }) {
  if (typeof value === "string") {
    const t = tidyText(value);
    if (t !== value) stats.changed++;
    return t;
  }
  if (Array.isArray(value)) return value.map((v) => tidy(v, stats));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = SKIP.has(k) ? v : tidy(v, stats);
    return out;
  }
  return value;
}
