import { creditorMix, countryList, countryDetail } from "@/lib/sovdata.mjs";
import { CASES } from "@/lib/sovereign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * World Bank debt figures for the Sovereign debt screen (SOV), from
 * lib/sovdata.mjs. Annual data, so every answer is cached at the edge for a
 * day; `status` says per part "ok" or why it failed.
 *   /api/sov               creditor mix for the tracked cases
 *   /api/sov?list=1        every country the debt statistics cover
 *   /api/sov?country=NPL   one country: ten years, its largest lenders
 */
const CACHE = { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" };

export async function GET(req) {
  const q = new URL(req.url).searchParams;
  try {
    if (q.get("list")) {
      return Response.json({ countries: await countryList() }, { headers: CACHE });
    }
    const iso = String(q.get("country") || "").toUpperCase();
    if (iso) {
      if (!/^[A-Z]{3}$/.test(iso)) return Response.json({ error: "Use a three-letter country code." }, { status: 400 });
      const list = await countryList().catch(() => []);
      if (list.length && !list.some((c) => c.iso === iso)) {
        return Response.json({ error: "The World Bank's debt statistics do not cover that country." }, { status: 404 });
      }
      return Response.json({ ...(await countryDetail(iso)), generated_at: new Date().toISOString() }, { headers: CACHE });
    }
    const body = await creditorMix(CASES.map((c) => c.iso));
    return Response.json({ ...body, generated_at: new Date().toISOString() }, { headers: CACHE });
  } catch (err) {
    return Response.json({ error: String(err?.message || err).slice(0, 300) }, { status: 502 });
  }
}
