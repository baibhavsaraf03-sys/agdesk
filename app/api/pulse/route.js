import { fetchPulse } from "@/lib/pulse.mjs";

export const runtime = "nodejs";

/**
 * The home instruments: delayed prices, the S&P 500 session line and the
 * mood word (read off the VIX). Public, no database. Kept for a minute per
 * server instance and edge-cached two minutes, so a busy hour costs Yahoo a
 * few dozen requests, not one per visitor.
 */
let last = null;

export async function GET() {
  if (!last || Date.now() - last.t > 60_000) {
    const data = await fetchPulse();
    // Keep the last answer that had prices if this one has none.
    const anyPrice = data.instruments.some((i) => i.price);
    if (anyPrice || !last) last = { t: Date.now(), data };
  }
  return Response.json(last.data, { headers: { "cache-control": "public, s-maxage=120, stale-while-revalidate=600" } });
}
