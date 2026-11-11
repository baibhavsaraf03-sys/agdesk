/**
 * Where a visitor lands after signing in.
 *
 * The page that starts a sign-in (Google or an emailed link) leaves its own
 * path in a short-lived cookie, and /auth/callback sends the visitor back
 * there. The destination does not travel in the redirect address because
 * Supabase only accepts redirect addresses on its allow-list, and the plain
 * callback is the one already there. Only the paths below are honoured, so
 * the cookie cannot be used to bounce someone to another site.
 */
export const NEXT_COOKIE = "ld_next";

const ALLOWED = [
  /^\/(#[A-Z]{2,6})?$/, // the desk, optionally on a screen
  /^\/account$/,
  /^\/articles(\/[a-z0-9-]+){0,2}$/
];

export function safeNext(path) {
  const p = String(path || "");
  return ALLOWED.some((re) => re.test(p)) ? p : null;
}

/** Fixed messages for /signin?error=<code>. Codes, not text, so the address cannot be used to show anything else. */
export const SIGNIN_ERRORS = {
  link_expired: "That sign-in link has expired or has already been used. Ask for a new one below.",
  other_browser:
    "That sign-in link was opened in a different browser from the one that asked for it. Ask for a new link here, in the browser you want to stay signed in on.",
  cancelled: "Sign-in was cancelled. Try again whenever you are ready.",
  failed: "Sign-in did not complete. Try again; if it keeps failing, use the other method."
};
