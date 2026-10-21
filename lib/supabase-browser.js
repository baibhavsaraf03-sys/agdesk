import { createBrowserClient } from "@supabase/ssr";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True once real Supabase credentials are present, so the UI can degrade gracefully. */
export const supabaseConfigured =
  Boolean(URL && ANON) && !URL.includes("placeholder") && ANON !== "placeholder";

/** Browser client. Safe to ship: the anon key only grants what RLS allows. */
export function browserClient() {
  if (!supabaseConfigured) return null;
  return createBrowserClient(URL, ANON);
}
