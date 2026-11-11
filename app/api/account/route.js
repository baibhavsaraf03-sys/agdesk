import { serverClient, adminClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/**
 * Deletes the signed-in account.
 *
 * Removing a sign-in needs the service role, which never leaves the server.
 * Unpublished articles are deleted here; published ones too if asked. The
 * journal, watchlist, usage and profile rows go with the account through their
 * `on delete cascade` foreign keys, and any published article that stays
 * loses its link to the account (`on delete set null`) but keeps its byline.
 *
 * DELETE with a JSON body: a cross-site form cannot send either without a
 * preflight the browser will refuse.
 */
export async function DELETE(req) {
  if (!String(req.headers.get("content-type") || "").includes("application/json")) {
    return json({ error: "Malformed request." }, 400);
  }
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "You are not signed in." }, 401);

  let body = {};
  try {
    body = await req.json();
  } catch {}

  let admin;
  try {
    admin = adminClient();
  } catch {
    return json({ error: "Account deletion is not available just now. Nothing was removed." }, 503);
  }

  let query = admin.from("articles").delete().eq("author_id", user.id);
  if (body?.removePublished !== true) query = query.neq("status", "published");
  const { error: articleError } = await query;
  // A missing articles table (script not yet run) is not a reason to keep the account.
  if (articleError && articleError.code !== "42P01" && articleError.code !== "PGRST205") {
    return json({ error: "Your articles could not be removed, so nothing was deleted. Try again." }, 500);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ error: "The account could not be deleted. Try again." }, 500);

  return json({ ok: true });
}
