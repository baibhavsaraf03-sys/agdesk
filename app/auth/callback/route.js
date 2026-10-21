import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

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
function back(origin, error) {
  const target = error
    ? `${origin}/?auth_error=${encodeURIComponent(error)}#JRN`
    : `${origin}/#JRN`;
  return NextResponse.redirect(target, { status: 303 });
}

export async function GET(req) {
  const url = new URL(req.url);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;

  // Google or Supabase can report a failure instead of sending a code.
  const upstream = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (upstream) return back(origin, upstream);

  const code = url.searchParams.get("code");
  if (!code) return back(origin, "No authorisation code was returned.");

  const response = back(origin);
  const store = await cookies();

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
