#!/usr/bin/env node
/**
 * The hourly traffic read for the GEO screen. Run by .github/workflows/traffic.yml,
 * which the hourly Market reads workflow calls, so it needs no schedule of its own.
 *
 * Ships: listens to AISStream.io over the chokepoint boxes in lib/traffic.mjs
 * for LISTEN_MIN minutes (identity messages, which carry the ship type, are sent
 * about every six minutes, so a shorter window leaves many ships untyped).
 * Without the AISSTREAM_API_KEY secret, ships are skipped and planes still run.
 * Aircraft: one adsb.lol query per chokepoint (free, no key).
 *
 * Publishes to Supabase `market_reads` as zone "traffic" with two weeks of
 * history, so the screen can compare each count with the place's usual level.
 * Never fails the workflow: a broken source is reported and the rest published.
 *
 *   node scripts/traffic-read.mjs           normal run
 *   node scripts/traffic-read.mjs --probe   no database: print the counts
 */
import WebSocket from "ws";
import { createClient } from "@supabase/supabase-js";
import { CHOKES, RADIUS_NM, KEEP_MS, centre, countShips } from "../lib/traffic.mjs";

const PROBE = process.argv.includes("--probe");
const LISTEN_MIN = Number(process.env.LISTEN_MIN || 6);
const KEY = process.env.AISSTREAM_API_KEY;
const status = {};

async function listenShips() {
  if (!KEY) {
    status.ships = "no AISSTREAM_API_KEY secret";
    return null;
  }
  const ships = new Map();
  let messages = 0;
  const ship = (id) => ships.get(id) || (ships.set(id, {}), ships.get(id));
  const until = Date.now() + LISTEN_MIN * 60000;
  let tries = 0;
  let lastError = "";
  while (Date.now() < until - 15000 && tries < 5) {
    tries++;
    await new Promise((done) => {
      const ws = new WebSocket("wss://stream.aisstream.io/v0/stream", { perMessageDeflate: true });
      const stop = setTimeout(() => ws.close(), Math.max(1000, until - Date.now()));
      ws.on("open", () => {
        ws.send(JSON.stringify({
          APIKey: KEY,
          BoundingBoxes: CHOKES.map((c) => c.box),
          FilterMessageTypes: ["PositionReport", "ShipStaticData", "StandardClassBPositionReport"]
        }));
      });
      ws.on("message", (raw) => {
        let m;
        try { m = JSON.parse(raw.toString("utf8")); } catch { return; }
        if (m.error) { lastError = String(m.error); return; }
        const meta = m.MetaData || {};
        const id = meta.MMSI || meta.mmsi;
        if (!id) return;
        messages++;
        const s = ship(id);
        const lat = meta.latitude ?? meta.Latitude, lon = meta.longitude ?? meta.Longitude;
        if (typeof lat === "number" && typeof lon === "number" && (lat || lon)) { s.lat = lat; s.lon = lon; }
        const pos = m.Message?.PositionReport || m.Message?.StandardClassBPositionReport;
        if (pos && typeof pos.Sog === "number" && pos.Sog < 102.3) s.sog = pos.Sog;
        const stat = m.Message?.ShipStaticData;
        if (stat && typeof stat.Type === "number") s.type = stat.Type;
      });
      ws.on("error", (e) => { lastError = e.message; });
      ws.on("close", () => { clearTimeout(stop); done(); });
    });
    if (Date.now() < until - 15000) await new Promise((r) => setTimeout(r, 2000 * tries + Math.random() * 1000));
  }
  status.ships = messages ? "ok" : `no messages${lastError ? ": " + lastError : ""}`;
  console.log(`AISStream: ${messages} messages from ${ships.size} ships in ${LISTEN_MIN} min (${tries} connection${tries > 1 ? "s" : ""})`);
  return messages ? countShips(ships) : null;
}

async function countPlanes() {
  const out = {};
  let ok = 0;
  for (const c of CHOKES) {
    const [lat, lon] = centre(c);
    try {
      const r = await fetch(`https://api.adsb.lol/v2/point/${lat.toFixed(2)}/${lon.toFixed(2)}/${RADIUS_NM}`, {
        headers: { "user-agent": "ledgedesk.com traffic read" },
        signal: AbortSignal.timeout(20000)
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      // Airborne only: on the ground is reported as alt_baro "ground".
      out[c.id] = (j.ac || []).filter((a) => typeof a.alt_baro === "number").length;
      ok++;
    } catch (e) {
      status.planes = `${c.id}: ${e.message}`;
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  if (ok === CHOKES.length) status.planes = "ok";
  console.log(`adsb.lol: ${ok}/${CHOKES.length} areas`);
  return ok ? out : null;
}

const [ships, planes] = await Promise.all([listenShips(), countPlanes()]);
const now = new Date();
const at = {};
for (const c of CHOKES) {
  at[c.id] = { ...(ships?.[c.id] || {}), ...(planes && planes[c.id] != null ? { planes: planes[c.id] } : {}) };
}

console.log("\nchokepoint          ships tankers cargo stopped planes");
for (const c of CHOKES) {
  const r = at[c.id];
  const f = (v) => String(v ?? "-").padStart(6);
  console.log(c.name.padEnd(18), f(r.ships), f(r.tankers), f(r.cargo), f(r.stopped), f(r.planes));
}
console.log("status", JSON.stringify(status));

if (PROBE) process.exit(0);
if (!ships && !planes) {
  console.log("::warning::Traffic read: no source answered; the last read stays up.");
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log("::warning::Traffic read: Supabase secrets missing.");
  process.exit(0);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const { data: prev } = await db.from("market_reads").select("payload").eq("zone", "traffic").maybeSingle();
const history = [...(prev?.payload?.history || []), { t: now.toISOString(), at }].filter((h) => now - new Date(h.t) < KEEP_MS);

const payload = {
  at: now.toISOString(),
  now: at,
  listen: LISTEN_MIN,
  radius: RADIUS_NM,
  status,
  history,
  sources: { ships: "AISStream.io (AIS, volunteer receivers)", planes: "adsb.lol (ADS-B, ODbL)" }
};
const { error } = await db.from("market_reads").upsert(
  { zone: "traffic", phase: "hourly", stamp: now.toISOString().slice(0, 16).replace("T", " ") + " UTC", payload, updated_at: now.toISOString() },
  { onConflict: "zone" }
);
if (error) console.log(`::warning::Traffic read: database write failed: ${error.message}`);
else console.log(`published, ${history.length} hours of history`);
