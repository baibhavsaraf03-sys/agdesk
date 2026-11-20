import { serverClient } from "@/lib/supabase-server";
import { configured, portfolio, refreshTokens, revoke, seal, unseal } from "@/lib/broker.mjs";

export const runtime = "nodejs";

/**
 * GET: whether linking is switched on, whether this account is linked, and if
 * so its accounts and positions fetched from the broker now (never stored).
 * DELETE: unlink (revokes the token at SnapTrade, then deletes the row).
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

const missingTable = (e) => /relation|does not exist|schema cache/i.test(e?.message || "");

export async function GET() {
  const on = configured();
  const { supabase, user } = await session();
  if (!user) return json({ configured: on, signedIn: false, linked: false });

  const { data, error } = await supabase.from("broker_links").select("tokens, linked_at").maybeSingle();
  if (error) return json({ configured: on, signedIn: true, linked: false, error: missingTable(error) ? "no_table" : "load_failed" });
  if (!data) return json({ configured: on, signedIn: true, linked: false });
  if (!on) return json({ configured: false, signedIn: true, linked: true, error: "off" });

  let tokens = unseal(data.tokens);
  if (!tokens?.access) {
    await supabase.from("broker_links").delete().eq("user_id", user.id);
    return json({ configured: on, signedIn: true, linked: false, error: "relink" });
  }

  if (tokens.expires < Date.now() + 60000 && tokens.refresh) {
    try {
      tokens = await refreshTokens(tokens.refresh);
      await supabase.from("broker_links").update({ tokens: seal(tokens), updated_at: new Date().toISOString() }).eq("user_id", user.id);
    } catch (err) {
      if (err.code === "invalid_grant" || err.status === 400 || err.status === 401) {
        await supabase.from("broker_links").delete().eq("user_id", user.id);
        return json({ configured: on, signedIn: true, linked: false, error: "relink" });
      }
      return json({ configured: on, signedIn: true, linked: true, linkedAt: data.linked_at, error: "unreachable" });
    }
  }

  try {
    const accounts = await portfolio(tokens.access);
    return json({ configured: on, signedIn: true, linked: true, linkedAt: data.linked_at, fetchedAt: new Date().toISOString(), accounts });
  } catch (err) {
    if (err.status === 401) {
      await supabase.from("broker_links").delete().eq("user_id", user.id);
      return json({ configured: on, signedIn: true, linked: false, error: "relink" });
    }
    return json({ configured: on, signedIn: true, linked: true, linkedAt: data.linked_at, error: "unreachable" });
  }
}

export async function DELETE() {
  const { supabase, user } = await session();
  if (!user) return json({ error: "sign_in_required" }, 401);
  const { data } = await supabase.from("broker_links").select("tokens").maybeSingle();
  if (data?.tokens) await revoke(unseal(data.tokens));
  const { error } = await supabase.from("broker_links").delete().eq("user_id", user.id);
  if (error && !missingTable(error)) return json({ error: "Could not unlink just now." }, 500);
  return json({ linked: false });
}
