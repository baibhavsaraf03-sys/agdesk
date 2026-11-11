import { serverClient } from "@/lib/supabase-server";
import { checkSubmission } from "@/lib/article-rules";

export const runtime = "nodejs";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/**
 * Submit an article for review.
 *
 * Runs as the signed-in account, not the service role: the insert policy is
 * what guarantees the row arrives as 'pending' under the sender's own id.
 */
export async function POST(req) {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Sign in to submit an article." }, 401);

  let input;
  try {
    input = await req.json();
  } catch {
    return json({ error: "Malformed request." }, 400);
  }

  const { value, error: problem } = checkSubmission(input);
  if (problem) return json({ error: problem }, 400);

  // No `.select()` on purpose: the row is confirmed by the absence of an error.
  const { error } = await supabase.from("articles").insert({ ...value, author_id: user.id });

  if (error) {
    if (String(error.message || "").includes("pending_limit")) {
      return json({ error: "You already have three articles waiting for review. Wait for a decision, or withdraw one, before sending another." }, 429);
    }
    if (error.code === "42P01" || error.code === "PGRST205") {
      return json({ error: "Submissions are not open yet." }, 503);
    }
    return json({ error: "Could not save the article. Nothing was sent; try again." }, 500);
  }
  return json({ ok: true });
}

/** Withdraw one of your own articles while it is still waiting. */
export async function DELETE(req) {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Sign in first." }, 401);

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return json({ error: "No article named." }, 400);

  const { data, error } = await supabase
    .from("articles")
    .delete()
    .eq("id", id)
    .eq("author_id", user.id)
    .eq("status", "pending")
    .select("id");

  if (error) return json({ error: "Could not withdraw that article." }, 500);
  if (!data?.length) return json({ error: "That article is no longer waiting for review." }, 409);
  return json({ ok: true });
}
