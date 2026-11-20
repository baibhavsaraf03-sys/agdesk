import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase-server";
import { authorizationUrl, configured, seal } from "@/lib/broker.mjs";

export const runtime = "nodejs";

/**
 * Starts linking a brokerage: sends the signed-in visitor to SnapTrade to
 * approve read-only access. The PKCE verifier and state travel in a short-lived,
 * encrypted, http-only cookie that only /api/broker/* can see.
 */
export async function GET(req) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const back = (code) => NextResponse.redirect(`${origin}/?broker=${code}#POS`, { status: 303 });

  if (!configured()) return back("off");
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/signin?next=${encodeURIComponent("/#POS")}`, { status: 303 });

  let auth;
  try {
    auth = await authorizationUrl();
  } catch {
    return back("unreachable");
  }
  const res = NextResponse.redirect(auth.url, { status: 303 });
  res.cookies.set("ld_broker", seal({ state: auth.state, verifier: auth.verifier, uid: user.id, t: Date.now() }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/broker",
    maxAge: 600
  });
  return res;
}
