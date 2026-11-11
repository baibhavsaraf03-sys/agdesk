import { serverClient } from "@/lib/supabase-server";
import { cleanSymbols } from "@/lib/watchlist";

export const runtime = "nodejs";

/**
 * The signed-in account's watchlist: one row, an ordered list of symbols.
 * No service-role key: the visitor's own session reads and writes the row,
 * and row-level security makes any other account's row unreachable.
 */

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

async function requireUser() {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

/** The saved list, or an empty one for an account that has never saved. */
export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) return json({ error: "sign_in_required" }, 401);

  const { data, error } = await supabase.from("watchlist").select("symbols").maybeSingle();
  if (error) return json({ error: "Could not load your watchlist." }, 500);
  return json({ symbols: cleanSymbols(data?.symbols) });
}

/** Replace the list with the one sent. */
export async function PUT(req) {
  const { supabase, user } = await requireUser();
  if (!user) return json({ error: "sign_in_required" }, 401);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Malformed request." }, 400);
  }
  if (!Array.isArray(body?.symbols)) return json({ error: "No list sent." }, 400);

  const symbols = cleanSymbols(body.symbols);
  const { error } = await supabase
    .from("watchlist")
    .upsert({ user_id: user.id, symbols, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) return json({ error: "Could not save your watchlist." }, 500);
  return json({ symbols });
}
