import { serverClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

async function requireUser() {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

/** List the signed-in account's entries. Row-level security does the filtering. */
export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) return json({ entries: [] });

  const { data, error } = await supabase
    .from("journal")
    .select("id, title, body, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return json({ error: "Could not load your journal." }, 500);
  return json({ entries: data || [] });
}

/** Save one entry. */
export async function POST(req) {
  const { supabase, user } = await requireUser();
  if (!user) return json({ error: "sign_in_required" }, 401);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Malformed request." }, 400);
  }

  const text = String(body?.body || "").trim();
  if (!text) return json({ error: "Nothing to save." }, 400);

  const { data, error } = await supabase
    .from("journal")
    .insert({
      user_id: user.id,
      title: String(body?.title || "").trim().slice(0, 200) || new Date().toLocaleDateString(),
      body: text.slice(0, 20000)
    })
    .select("id, title, body, created_at")
    .single();

  if (error) return json({ error: "Could not save that entry." }, 500);
  return json({ entry: data });
}

/** Delete one entry. The policy makes it impossible to delete someone else's. */
export async function DELETE(req) {
  const { supabase, user } = await requireUser();
  if (!user) return json({ error: "sign_in_required" }, 401);

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return json({ error: "No entry named." }, 400);

  const { error } = await supabase.from("journal").delete().eq("id", id);
  if (error) return json({ error: "Could not delete that entry." }, 500);
  return json({ ok: true });
}
