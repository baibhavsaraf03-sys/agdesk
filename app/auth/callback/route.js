import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { NEXT_COOKIE, safeNext } from "@/lib/auth-paths";

export const runtime = "nodejs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Finishes a sign-in, by Google or by an emailed link, then sends the visitor
 * back to the page they started from (see lib/auth-paths.js), or to the desk.
 *
 * The session cookies must be written onto the response object that is
 * actually returned. A bare `Response.redirect` discards them, which looks
 * exactly like a failed sign-in: the round trip completes and nobody is
 * logged in.
 *
 * Failures go to /signin with a fixed error code, where the visitor can try
 * again. The return path is kept for that second attempt.
 */
function fail(origin, code) {
  return NextResponse.redirect(`${origin}/signin?error=${code}`, { status: 303 });
}

function errorCode(text, code) {
  const t = `${code || ""} ${text || ""}`;
  if (/code verifier|code_verifier|flow_state/i.test(t)) return "other_browser";
  if (/expired|otp|already been used|invalid/i.test(t)) return "link_expired";
  if (/access_denied|cancel/i.test(t)) return "cancelled";
  return "failed";
}

export async function GET(req) {
  const url = new URL(req.url);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;

  // Google or Supabase can report a failure instead of sending a code.
  const upstream = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (upstream) return fail(origin, errorCode(upstream, url.searchParams.get("error_code")));

  const code = url.searchParams.get("code");
  if (!code) return fail(origin, "failed");

  const store = await cookies();
  let next = null;
  try {
    next = safeNext(decodeURIComponent(store.get(NEXT_COOKIE)?.value || ""));
  } catch {}

  const response = NextResponse.redirect(`${origin}${next || "/#JRN"}`, { status: 303 });
  response.cookies.set(NEXT_COOKIE, "", { path: "/", maxAge: 0 });

  const supabase = createServerClient(URL_, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(origin, errorCode(error.message, error.code));

  return response;
}
