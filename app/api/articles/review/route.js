import { serverClient } from "@/lib/supabase-server";
import { RULES } from "@/lib/article-rules";
import { slugify } from "@/lib/pages";

export const runtime = "nodejs";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/**
 * The editor's decisions: publish, reject, unpublish, delete.
 *
 * Runs as the signed-in account. The update and delete policies only match
 * for an editor, so a request from anyone else changes no rows; the explicit
 * check below exists to answer them with a plain 404 rather than to protect
 * anything.
 */
export async function POST(req) {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Not found." }, 404);

  const { data: editor } = await supabase.rpc("is_article_editor");
  if (editor !== true) return json({ error: "Not found." }, 404);

  let input;
  try {
    input = await req.json();
  } catch {
    return json({ error: "Malformed request." }, 400);
  }

  const id = String(input?.id || "");
  const action = String(input?.action || "");
  const note = String(input?.note || "").trim().slice(0, RULES.note.max) || null;
  if (!id) return json({ error: "No article named." }, 400);

  const { data: current, error: readError } = await supabase
    .from("articles")
    .select("id, title, slug, status, published_at")
    .eq("id", id)
    .maybeSingle();
  if (readError) return json({ error: "Could not load that article." }, 500);
  if (!current) return json({ error: "That article no longer exists." }, 404);

  const now = new Date().toISOString();

  if (action === "delete") {
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) return json({ error: "Could not delete that article." }, 500);
    return json({ ok: true });
  }

  if (action === "reject" || action === "unpublish") {
    const { error } = await supabase
      .from("articles")
      .update({ status: action === "reject" ? "rejected" : "pending", review_note: note, reviewed_at: now })
      .eq("id", id);
    if (error) return json({ error: "Could not save that decision." }, 500);
    return json({ ok: true });
  }

  if (action === "publish") {
    // An article that has been published before keeps its address.
    let base = (current.slug || slugify(input?.slug || "") || slugify(current.title)).slice(0, 80).replace(/-+$/, "") || "article";
    // These two are real pages under /articles and would hide the article.
    if (base === "submit" || base === "review") base = `${base}-article`;
    for (let n = 1; n <= 8; n++) {
      const slug = n === 1 ? base : `${base}-${n}`;
      const { error } = await supabase
        .from("articles")
        .update({
          status: "published",
          slug,
          review_note: note,
          reviewed_at: now,
          published_at: current.published_at || now
        })
        .eq("id", id);
      if (!error) return json({ ok: true, slug });
      if (error.code !== "23505") return json({ error: "Could not publish that article." }, 500);
    }
    return json({ error: "That address is taken. Give the article a different address and publish again." }, 409);
  }

  return json({ error: "Unknown action." }, 400);
}
