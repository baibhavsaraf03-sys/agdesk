/**
 * The rules for a submitted article, shared by the form (to guide the writer)
 * and the route (to refuse what breaks them). The database repeats the length
 * limits as check constraints in supabase/migrations/20261111_articles.sql;
 * change one and change the other.
 */
export const RULES = {
  name: { min: 2, max: 80 },
  title: { min: 10, max: 140 },
  summary: { min: 40, max: 300 },
  body: { min: 1200, max: 40000 },
  note: { max: 2000 }
};

export const STATUS_LABEL = {
  pending: "Waiting for review",
  published: "Published",
  rejected: "Not accepted"
};

const clean = (v) => String(v ?? "").replace(/\r\n?/g, "\n").trim();

/**
 * Returns `{ value }` with tidied fields, or `{ error }` with one sentence a
 * writer can act on.
 */
export function checkSubmission(input) {
  const value = {
    author_name: clean(input?.author_name).replace(/\s+/g, " "),
    title: clean(input?.title).replace(/\s+/g, " "),
    summary: clean(input?.summary).replace(/\s+/g, " "),
    body: clean(input?.body)
  };
  const tests = [
    ["author_name", RULES.name, "Your name"],
    ["title", RULES.title, "The title"],
    ["summary", RULES.summary, "The summary"],
    ["body", RULES.body, "The article"]
  ];
  for (const [key, rule, label] of tests) {
    const n = value[key].length;
    if (n < rule.min) return { error: `${label} needs at least ${rule.min.toLocaleString("en-GB")} characters; it has ${n.toLocaleString("en-GB")}.` };
    if (n > rule.max) return { error: `${label} can be at most ${rule.max.toLocaleString("en-GB")} characters; it has ${n.toLocaleString("en-GB")}.` };
  }
  if (input?.agreed !== true) return { error: "Confirm that the article is your own work before sending it." };
  return { value };
}
