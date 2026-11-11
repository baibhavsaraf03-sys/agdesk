import { fetchFx } from "@/lib/fx.mjs";
import { upcomingEvents } from "@/lib/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Everything the Currencies screen shows: policy rates and 2-year yields,
 * hedge-fund positioning, and the release calendar. Public, no account, no
 * database: the figures come straight from the BIS, the US Treasury, the ECB
 * and the CFTC (lib/fx.mjs) and the dates from lib/calendar.js.
 *
 * Cached at the edge for a quarter of an hour, which is far more often than
 * any of the sources change, so visitors do not each cost four upstream calls.
 */
export async function GET() {
  let fx = { rates: {}, positioning: {}, status: {} };
  try {
    fx = await fetchFx();
  } catch (err) {
    fx.status = { error: String(err?.message || err).slice(0, 300) };
  }
  return Response.json(
    { ...fx, events: upcomingEvents(), generated_at: new Date().toISOString() },
    { headers: { "cache-control": "public, s-maxage=900, stale-while-revalidate=3600" } }
  );
}
