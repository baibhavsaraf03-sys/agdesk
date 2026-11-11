import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { NEXT_COOKIE, NEXT_ALLOWED } from "@/lib/article-rules";

export const runtime = "nodejs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Exchanges the OAuth code for a session, then returns to the terminal.
 *
 * The session cookies must be written onto the response object that is
 * actually returned. A bare `Response.redirect` discards them, which looks
 * exactly like a failed sign-in: the round trip completes and nobody is
 * logged in.
 */
function back(origin, error, next) {
  const target = error
    ? `${origin}/?auth_error=${encodeURIComponent(error)}#JRN`
    : next
      ? `${origin}${next}`
      : `${origin}/#JRN`;
  const response = NextResponse.redirect(target, { status: 303 });
  if (next) response.cookies.set(NEXT_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

/**
 * Where to land after signing in. A page that starts the round trip (the
 * article submission form) leaves its path in a short-lived cookie; only
 * paths on the allow-list are honoured, so this cannot be used to bounce a
 * visitor to another site.
 */
function nextPath(store) {
  let raw = "";
  try {
    raw = decodeURIComponent(store.get(NEXT_COOKIE)?.value || "");
  } catch {}
  return NEXT_ALLOWED.test(raw) ? raw : null;
}

export async function GET(req) {
  const url = new URL(req.url);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;

  // Google or Supabase can report a failure instead of sending a code.
  const upstream = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (upstream) return back(origin, upstream);

  const code = url.searchParams.get("code");
  if (!code) return back(origin, "No authorisation code was returned.");

  const store = await cookies();
  const response = back(origin, null, nextPath(store));

  const supabase = createServerClient(URL_, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return back(origin, error.message);

  return response;
}
