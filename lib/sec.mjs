/**
 * SEC EDGAR access, shared by the insider radar and the bull/bear debate.
 * Free, no key. EDGAR asks every client to send a User-Agent that names it
 * and to stay under 10 requests a second; `sec()` keeps to about 8.
 * Override the User-Agent with the SEC_USER_AGENT variable if the SEC ever
 * asks for a contact address (do not put a personal address in the repo).
 */
export const SEC_UA = process.env.SEC_USER_AGENT || "LedgeDesk research (+https://ledgedesk.com)";

let last = 0;
export async function sec(url, { tries = 3 } = {}) {
  for (let i = 0; i < tries; i++) {
    const wait = Math.max(0, last + 125 - Date.now());
    last = Date.now() + wait;
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try {
      const r = await fetch(url, { headers: { "user-agent": SEC_UA, accept: "*/*" }, signal: AbortSignal.timeout(30000) });
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
}

/** Daily-close prices from Yahoo for a US ticker: [{ t, c }] oldest first. */
export async function yahooDaily(ticker, range = "3mo") {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=1d`, {
    headers: { "user-agent": "Mozilla/5.0 (ledgedesk.com)" },
    signal: AbortSignal.timeout(15000)
  });
  if (!r.ok) throw new Error(`Yahoo HTTP ${r.status}`);
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  const ts = res?.timestamp || [];
  const cl = res?.indicators?.quote?.[0]?.close || [];
  return ts.map((t, i) => ({ t: new Date(t * 1000).toISOString().slice(0, 10), c: cl[i] })).filter((p) => p.c != null);
}
