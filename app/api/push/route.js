import { serverClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * This device's notification address. GET gives the public half of the
 * site's signing key (the browser needs it to subscribe); POST stores this
 * browser's subscription against the account; DELETE removes it.
 *
 * VAPID_PUBLIC_KEY is public by design. The private half lives only in the
 * GitHub Actions secret the checker reads, never here.
 */

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  return json({ publicKey: /^[A-Za-z0-9_-]{80,100}$/.test(publicKey) ? publicKey : null });
}

export async function POST(req) {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "sign_in_required" }, 401);
  let sub;
  try {
    sub = await req.json();
  } catch {
    return json({ error: "Malformed request." }, 400);
  }
  const endpoint = String(sub?.endpoint || "");
  const p256dh = String(sub?.keys?.p256dh || "");
  const auth = String(sub?.keys?.auth || "");
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || p256dh.length > 200 || !auth || auth.length > 100) {
    return json({ error: "That is not a notification subscription." }, 400);
  }
  const ua = (req.headers.get("user-agent") || "").slice(0, 200);
  // The same browser re-subscribing (or a device handed to another account) replaces the old row.
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({ user_id: user.id, endpoint, p256dh, auth, user_agent: ua });
  if (error) {
    const notSetUp = /relation .* does not exist|schema cache/i.test(error.message || "");
    return json({ error: notSetUp ? "not_set_up" : "Could not turn notifications on." }, notSetUp ? 503 : 500);
  }
  return json({ ok: true });
}

export async function DELETE(req) {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "sign_in_required" }, 401);
  let body = {};
  try {
    body = await req.json();
  } catch {}
  const endpoint = String(body?.endpoint || "");
  if (!endpoint) return json({ error: "No device given." }, 400);
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return json({ ok: true });
}
