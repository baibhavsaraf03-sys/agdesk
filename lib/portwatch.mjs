/**
 * IMF PortWatch daily chokepoint transits (free, no key, open data from the
 * IMF and Oxford, built from satellite AIS via the UN Global Platform). Counts
 * each ship once per crossing; published with a lag of several days, so the
 * latest figure is the most recent settled day, not a live count.
 */
const BASE = "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query";

export async function pwQuery(params) {
  const qs = new URLSearchParams({ f: "json", returnGeometry: "false", ...params });
  const r = await fetch(`${BASE}?${qs}`, { headers: { "user-agent": "ledgedesk.com traffic read" }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`PortWatch HTTP ${r.status}`);
  const j = await r.json();
  if (j.error) throw new Error(`PortWatch: ${j.error.message || JSON.stringify(j.error)}`);
  return (j.features || []).map((f) => f.attributes);
}
