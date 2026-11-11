import { serverClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The dated news notes for the fixed-text screens, one entry per set:
 * `{ notes: { disc: { stamp, at, notes: { <id>: { note, src } } }, ... } }`.
 * Written by scripts/notes-read.mjs; public, like the market reads.
 */
export async function GET() {
  const out = {};
  try {
    const supabase = await serverClient();
    const { data, error } = await supabase
      .from("market_reads")
      .select("zone, payload")
      .like("zone", "notes_%");
    if (error) throw error;
    for (const row of data || []) {
      const p = row.payload || {};
      out[row.zone.replace(/^notes_/, "")] = { stamp: p.stamp || "", at: p.at || null, notes: p.notes || {} };
    }
  } catch {
    // No notes is a normal state: the screens show their fixed text alone.
  }
  return Response.json({ notes: out }, { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=1800" } });
}
