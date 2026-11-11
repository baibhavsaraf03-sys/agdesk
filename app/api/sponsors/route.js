import { NextResponse } from "next/server";
import { activeSponsors } from "@/lib/sponsors";

export const dynamic = "force-dynamic";

/**
 * GET /api/sponsors
 *
 * The sponsorships to show this visitor. Decided here rather than in the
 * browser so that a visitor outside the United States is never sent them:
 * the sponsorship rules this site follows are the US ones, and a paid
 * placement beside market commentary is treated differently elsewhere (in the
 * UK it can be a regulated financial promotion).
 *
 * Vercel sets x-vercel-ip-country on every request. Without it (local
 * development) nothing is shown unless SPONSORS_ALL_COUNTRIES=1.
 */
export async function GET(req) {
  const country = (req.headers.get("x-vercel-ip-country") || "").toUpperCase();
  const eligible = country === "US" || process.env.SPONSORS_ALL_COUNTRIES === "1";
  return NextResponse.json(
    { eligible, sponsors: eligible ? activeSponsors() : [] },
    { headers: { "cache-control": "private, no-store" } }
  );
}
