import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { serverClient } from "@/lib/supabase-server";
import { exchangeCode, seal, unseal } from "@/lib/broker.mjs";

export const runtime = "nodejs";

/**
 * SnapTrade sends the visitor back here after they approve (or refuse) access.
 * The code is exchanged for tokens, which are encrypted and saved in the
 * visitor's own `broker_links` row (row-level security, no service role).
 * Always ends on the My positions screen with ?broker=<result>.
 */
export async function GET(req) {
  const url = new URL(req.url);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const store = await cookies();
  const saved = unseal(store.get("ld_broker")?.value);

  const finish = (code) => {
    const res = NextResponse.redirect(`${origin}/?broker=${code}#POS`, { status: 303 });
    res.cookies.set("ld_broker", "", { path: "/api/broker", maxAge: 0 });
    return res;
  };

  if (url.searchParams.get("error")) return finish(/denied|cancel/i.test(url.searchParams.get("error")) ? "cancelled" : "failed");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !saved || saved.state !== state || Date.now() - saved.t > 600000) return finish("expired");

  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== saved.uid) return finish("signed_out");

  let tokens;
  try {
    tokens = await exchangeCode(code, saved.verifier);
  } catch {
    return finish("failed");
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("broker_links")
    .upsert({ user_id: user.id, provider: "snaptrade", tokens: seal(tokens), linked_at: now, updated_at: now }, { onConflict: "user_id" });
  if (error) return finish(/relation|does not exist|schema cache/i.test(error.message) ? "no_table" : "failed");
  return finish("linked");
}
