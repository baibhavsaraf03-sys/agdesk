import { fetchPrice, priceSymbol } from "@/lib/prices.mjs";

export const runtime = "nodejs";

/**
 * The delayed price an alert on this symbol is checked against, so the
 * visitor sets a level against the same number the checker will see.
 * Public; edge-cached for a minute.
 */
export async function GET(req) {
  const symbol = String(new URL(req.url).searchParams.get("symbol") || "").toUpperCase().slice(0, 60);
  if (!priceSymbol(symbol)) return Response.json({ error: "Price alerts are not available for that symbol yet." }, { status: 404 });
  try {
    const p = await fetchPrice(symbol);
    return Response.json(p, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (err) {
    return Response.json({ symbol, error: "The free price sources did not answer just now." , detail: String(err.message).slice(0, 200) }, { status: 502 });
  }
}
