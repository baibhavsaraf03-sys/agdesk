import { fetchStream, fetchAllStreams, STREAM_KEYS } from "@/lib/streams.mjs";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Publisher RSS, fetched server-side and cached at the edge.
 *
 * Server-side because browsers cannot read these feeds directly — no CORS
 * headers on any of them. Cached because the headlines are identical for
 * every visitor, so one fetch every ten minutes serves the whole site: a
 * thousand readers cost the same as one, which is the economics this project
 * depends on.
 *
 *   GET /api/news              every stream, trimmed
 *   GET /api/news?topic=law    one stream in full
 */
export async function GET(req) {
  const topic = new URL(req.url).searchParams.get("topic");

  try {
    const payload =
      topic && STREAM_KEYS.includes(topic)
        ? { topic, ...(await fetchStream(topic, { perSource: 12 })) }
        : { streams: await fetchAllStreams({ perSource: 8 }) };

    return new Response(JSON.stringify({ at: Date.now(), ...payload }), {
      headers: {
        "content-type": "application/json",
        // Ten minutes fresh, then serve the stale copy for an hour while one
        // request refreshes it. A publisher being slow never makes a visitor
        // wait, and never makes the page look empty.
        "cache-control": "public, s-maxage=600, stale-while-revalidate=3600"
      }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "news_unavailable", message: err.message, at: Date.now() }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }
}
