/**
 * Live traffic at the world's shipping chokepoints, for the GEO screen.
 *
 * Ships: AIS position and identity messages from AISStream.io (free, needs the
 * AISSTREAM_API_KEY secret), listened to for a few minutes each hour by
 * scripts/traffic-read.mjs. Aircraft: adsb.lol (free, no key, ODbL data),
 * one count per chokepoint within RADIUS_NM.
 *
 * What the counts are: ships and aircraft seen by volunteer receivers in that
 * window. Coverage is uneven (thin in parts of the Gulf and Red Sea), so a
 * count means most against the same place's own usual level, which is why
 * each read keeps two weeks of history and the screen compares with its median.
 * It measures traffic, never intent.
 */

/** Boxes are [[lat, lon], [lat, lon]] corners, the order AISStream wants. */
export const CHOKES = [
  { id: "hormuz", name: "Strait of Hormuz", geo: "gulf", box: [[25.4, 55.6], [27.2, 57.4]], why: "About a fifth of the world's oil" },
  { id: "bab", name: "Bab-el-Mandeb", geo: "gulf", box: [[11.6, 42.4], [13.4, 44.2]], why: "The Red Sea route to Suez" },
  { id: "suez", name: "Suez Canal", geo: "gulf", box: [[29.7, 32.1], [31.5, 32.7]], why: "Asia–Europe containers and oil" },
  { id: "bosporus", name: "Bosporus", geo: "russia-nato", box: [[40.9, 28.8], [41.35, 29.25]], why: "Black Sea grain and Russian oil" },
  { id: "taiwan", name: "Taiwan Strait", geo: "taiwan", box: [[22.6, 118.6], [25.6, 121.0]], why: "Intra-Asia and Asia–Europe containers" },
  { id: "singapore", name: "Singapore Strait", geo: null, box: [[1.0, 103.4], [1.5, 104.5]], why: "The busiest strait for oil and containers" },
  { id: "panama", name: "Panama Canal", geo: null, box: [[8.7, -80.1], [9.5, -79.3]], why: "US–Asia bulk, grain and gas" }
];

export const RADIUS_NM = 150;
export const KEEP_MS = 14 * 86400000;

export const centre = (c) => [(c.box[0][0] + c.box[1][0]) / 2, (c.box[0][1] + c.box[1][1]) / 2];

export function inBox(c, lat, lon) {
  const [a, b] = c.box;
  return lat >= Math.min(a[0], b[0]) && lat <= Math.max(a[0], b[0]) && lon >= Math.min(a[1], b[1]) && lon <= Math.max(a[1], b[1]);
}

/** AIS ship type codes: 70–79 cargo, 80–89 tanker. */
export function kindOf(type) {
  if (type >= 80 && type <= 89) return "tanker";
  if (type >= 70 && type <= 79) return "cargo";
  return type ? "other" : null;
}

/**
 * Turns the ships heard during the window into one count per chokepoint.
 * `ships` is a Map of MMSI -> { lat, lon, sog, type }.
 */
export function countShips(ships) {
  const out = {};
  for (const c of CHOKES) out[c.id] = { ships: 0, tankers: 0, cargo: 0, stopped: 0 };
  for (const s of ships.values()) {
    if (s.lat == null) continue;
    const c = CHOKES.find((k) => inBox(k, s.lat, s.lon));
    if (!c) continue;
    const o = out[c.id];
    o.ships++;
    const k = kindOf(s.type);
    if (k === "tanker") o.tankers++;
    if (k === "cargo") o.cargo++;
    if (s.sog != null && s.sog < 1) o.stopped++;
  }
  return out;
}

const median = (xs) => {
  const v = xs.filter((x) => typeof x === "number").sort((a, b) => a - b);
  if (v.length < 24) return null; // a day of hourly samples before "usual" means anything
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

/** The usual level for each chokepoint and field: the median of the history. */
export function usual(history) {
  const out = {};
  for (const c of CHOKES) {
    const rows = history.map((h) => h.at?.[c.id]).filter(Boolean);
    out[c.id] = {
      ships: median(rows.map((r) => r.ships)),
      tankers: median(rows.map((r) => r.tankers)),
      planes: median(rows.map((r) => r.planes))
    };
  }
  return out;
}

/** "+23%" style difference against the usual level; null when there is no usual yet. */
export function versus(now, base) {
  if (now == null || base == null || base < 3) return null;
  return Math.round((100 * (now - base)) / base);
}
