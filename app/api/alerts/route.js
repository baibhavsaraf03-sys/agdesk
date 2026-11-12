import { serverClient } from "@/lib/supabase-server";
import { cleanAlert, ALERT_MAX } from "@/lib/alert-rules";

export const runtime = "nodejs";

/**
 * The signed-in account's alerts and the last few sent. No service role:
 * the visitor's own session reads and writes, and row-level security keeps
 * each account to its own rows (supabase/migrations/20261112_alerts.sql).
 */

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

async function session() {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

const missing = (error) => /relation .* does not exist|schema cache/i.test(error?.message || "");

export async function GET() {
  const { supabase, user } = await session();
  if (!user) return json({ error: "sign_in_required" }, 401);
  const [a, e, d] = await Promise.all([
    supabase.from("alerts").select("id, kind, params, active, last_fired_at, created_at").order("created_at", { ascending: true }),
    supabase.from("alert_events").select("id, alert_id, title, body, url, delivered, sent_at").order("sent_at", { ascending: false }).limit(20),
    supabase.from("push_subscriptions").select("id", { count: "exact", head: true })
  ]);
  if (a.error) return json({ error: missing(a.error) ? "not_set_up" : "Could not load your alerts." }, missing(a.error) ? 503 : 500);
  return json({ alerts: a.data || [], events: e.data || [], devices: d.count || 0 });
}

export async function POST(req) {
  const { supabase, user } = await session();
  if (!user) return json({ error: "sign_in_required" }, 401);
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Malformed request." }, 400);
  }
  const clean = cleanAlert(body);
  if (clean.error) return json({ error: clean.error }, 400);

  const { count } = await supabase.from("alerts").select("id", { count: "exact", head: true });
  if ((count || 0) >= ALERT_MAX) return json({ error: `You have ${ALERT_MAX} alerts, the most an account can hold. Delete one to add another.` }, 400);

  const { data, error } = await supabase
    .from("alerts")
    .insert({ user_id: user.id, kind: clean.kind, params: clean.params })
    .select("id, kind, params, active, last_fired_at, created_at")
    .single();
  if (error) return json({ error: missing(error) ? "not_set_up" : "Could not save the alert." }, missing(error) ? 503 : 500);
  return json({ alert: data });
}

/** Switch an alert on or off. Switching on clears its memory so a fired price alert can fire again. */
export async function PATCH(req) {
  const { supabase, user } = await session();
  if (!user) return json({ error: "sign_in_required" }, 401);
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Malformed request." }, 400);
  }
  const id = Number(body?.id);
  if (!Number.isInteger(id)) return json({ error: "No alert given." }, 400);
  const active = Boolean(body?.active);
  const patch = active ? { active, state: {} } : { active };
  const { data, error } = await supabase.from("alerts").update(patch).eq("id", id).select("id, active").maybeSingle();
  if (error) return json({ error: "Could not change the alert." }, 500);
  if (!data) return json({ error: "No such alert." }, 404);
  return json({ alert: data });
}

export async function DELETE(req) {
  const { supabase, user } = await session();
  if (!user) return json({ error: "sign_in_required" }, 401);
  const url = new URL(req.url);
  if (url.searchParams.get("events") === "all") {
    const { error } = await supabase.from("alert_events").delete().eq("user_id", user.id);
    return error ? json({ error: "Could not clear the list." }, 500) : json({ ok: true });
  }
  const id = Number(url.searchParams.get("id"));
  if (!Number.isInteger(id)) return json({ error: "No alert given." }, 400);
  const { error } = await supabase.from("alerts").delete().eq("id", id);
  return error ? json({ error: "Could not delete the alert." }, 500) : json({ ok: true });
}
