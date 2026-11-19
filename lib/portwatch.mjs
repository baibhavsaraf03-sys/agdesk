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

const avg = (rows, k) => (rows.length ? Math.round((10 * rows.reduce((s, r) => s + (r[k] || 0), 0)) / rows.length) / 10 : null);
const day = (d) => new Date(d + "T00:00:00Z");
const iso = (t) => new Date(t).toISOString().slice(0, 10);

/**
 * For one PortWatch chokepoint id: the latest settled day, the average of the
 * last seven days, and the average of the same seven days a year earlier.
 */
export async function transits(portid) {
  const last = await pwQuery({ where: `portid='${portid}'`, outFields: "date,n_total,n_tanker,n_cargo", orderByFields: "date DESC", resultRecordCount: "7" });
  if (!last.length) return null;
  const end = day(last[0].date).getTime();
  const yEnd = end - 364 * 86400000; // same weekday a year earlier
  const ago = await pwQuery({
    where: `portid='${portid}' AND date >= '${iso(yEnd - 6 * 86400000)}' AND date <= '${iso(yEnd)}'`,
    outFields: "date,n_total,n_tanker", resultRecordCount: "7"
  });
  return {
    date: last[0].date,
    from: last[last.length - 1].date,
    day: { total: last[0].n_total, tankers: last[0].n_tanker, cargo: last[0].n_cargo },
    avg7: avg(last, "n_total"),
    avg7Tankers: avg(last, "n_tanker"),
    yearAgo7: ago.length >= 5 ? avg(ago, "n_total") : null,
    yearAgo7Tankers: ago.length >= 5 ? avg(ago, "n_tanker") : null
  };
}
