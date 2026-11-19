import { creditorMix } from "@/lib/sovdata.mjs";
import { CASES } from "@/lib/sovereign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creditor mix for the countries on the Sovereign debt screen (SOV), from the
 * World Bank (lib/sovdata.mjs). Annual data, so it is cached at the edge for
 * a day; `status` says per series "ok" or why it failed.
 */
export async function GET() {
  let body = { countries: {}, status: {} };
  try {
    body = await creditorMix(CASES.map((c) => c.iso));
  } catch (err) {
    body.status = { error: String(err?.message || err).slice(0, 300) };
  }
  return Response.json(
    { ...body, generated_at: new Date().toISOString() },
    { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
  );
}
