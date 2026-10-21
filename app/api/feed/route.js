import { serverClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const revalidate = 0;

/**
 * Public read of every published market read. No authentication: this is the
 * part of the terminal that works for anyone with the link.
 */
export async function GET() {
  try {
    const supabase = await serverClient();
    const { data, error } = await supabase
      .from("market_reads")
      .select("zone, phase, stamp, payload, updated_at")
      .order("zone");

    if (error) throw error;

    const reads = {};
    for (const row of data || []) {
      reads[row.zone] = { ...(row.payload || {}), _updatedAt: row.updated_at };
    }
    return Response.json({ reads });
  } catch {
    // A database hiccup should leave the terminal on its embedded snapshot
    // rather than showing an error page.
    return Response.json({ reads: {} });
  }
}
