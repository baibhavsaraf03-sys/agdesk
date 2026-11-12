import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { fetchPulse, fmtChange } from "@/lib/pulse.mjs";

export const runtime = "nodejs";

/**
 * Today's card, drawn by the site itself.
 *   /card              1080×1920, for Instagram and other stories (the Share button)
 *   /card?format=og    1200×630, the link preview for every page that has none of its own
 *
 * Data: the mood and prices from lib/pulse.mjs, the newest market read's short
 * version and the Doomsday verdict count from market_reads (public, anon key).
 * Fonts are fetched from Google Fonts as TTF (ImageResponse cannot read
 * woff2). Edge-cached ten minutes.
 */

const GOLD = "#C8A96A", GREEN = "#2BD67B", FG = "#E6E2DA", DIM = "#8F8A80", LINE = "#2A2723";
const ZONES = ["ams", "eur", "eas", "ind", "anz"];

async function font(family, weight, italic, text) {
  const spec = `${family.replace(/ /g, "+")}:${italic ? "ital," : ""}wght@${italic ? "1," : ""}${weight}`;
  const url = `https://fonts.googleapis.com/css2?family=${spec}${text ? `&text=${encodeURIComponent(text)}` : ""}`;
  const css = await (await fetch(url, { cache: "force-cache" })).text();
  const src = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:opentype|truetype)'\)/)?.[1];
  if (!src) throw new Error(`no TTF for ${family}`);
  return { name: family, data: await (await fetch(src, { cache: "force-cache" })).arrayBuffer(), weight, style: italic ? "italic" : "normal" };
}

async function readsNow() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return {};
  try {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await sb.from("market_reads").select("zone, payload, updated_at").in("zone", [...ZONES, "doom"]);
    return Object.fromEntries((data || []).map((r) => [r.zone, { ...(r.payload || {}), _updatedAt: r.updated_at }]));
  } catch {
    return {};
  }
}

function brief(reads) {
  const r = ZONES.map((z) => reads[z]).filter((x) => x && (x.short?.length || x.headline))
    .sort((a, b) => String(b._updatedAt || "").localeCompare(String(a._updatedAt || "")))[0];
  if (!r) return "The desk is open.";
  const s = Array.isArray(r.short) && r.short.length ? r.short[0] : r.headline;
  return s.length > 150 ? s.slice(0, 147).replace(/\s+\S*$/, "") + "…" : s;
}

function Dial({ size, t, word, sub }) {
  const c = size / 2, r = c - 10, lines = [];
  for (let i = 0; i <= 60; i++) {
    const a = ((150 + 4 * i) * Math.PI) / 180, major = i % 5 === 0, r2 = r - (major ? size * 0.055 : size * 0.026);
    lines.push(
      <line key={i} x1={c + r * Math.cos(a)} y1={c + r * Math.sin(a)} x2={c + r2 * Math.cos(a)} y2={c + r2 * Math.sin(a)}
        stroke={i >= 48 ? GREEN : major ? GOLD : "#34302A"} strokeWidth={major ? size / 160 : size / 320} />
    );
  }
  const na = t == null ? null : ((150 + 240 * t) * Math.PI) / 180, nl = r * 0.76;
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r + 6} fill="#0A0A09" stroke={LINE} strokeWidth="2" />
        {lines}
        {na != null && <line x1={c} y1={c} x2={c + nl * Math.cos(na)} y2={c + nl * Math.sin(na)} stroke={GREEN} strokeWidth={size / 130} />}
        <circle cx={c} cy={c} r={size / 55} fill="#000" stroke={GOLD} strokeWidth={size / 170} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: c + size * 0.12, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontFamily: "Doto", fontSize: size * 0.14, color: FG, letterSpacing: 2 }}>{word}</div>
        <div style={{ fontFamily: "Geist Mono", fontSize: size * 0.036, color: DIM, letterSpacing: 6, marginTop: 8 }}>{sub}</div>
      </div>
    </div>
  );
}

export async function GET(req) {
  const og = new URL(req.url).searchParams.get("format") === "og";
  const [pulse, reads] = await Promise.all([fetchPulse().catch(() => null), readsNow()]);
  const inst = Object.fromEntries((pulse?.instruments || []).map((i) => [i.k, i]));
  const mood = pulse?.mood;
  const word = mood ? mood.word.toUpperCase() : "OPEN";
  const sub = mood ? `MARKET MOOD · VIX ${mood.level.toFixed(1)}` : "MARKET MOOD";
  const line = brief(reads);
  const tabs = reads.doom?.tabs;
  const lights = Array.isArray(tabs) && tabs.length ? `${tabs.filter((t) => t.verdict === "supports").length} / ${tabs.length}` : null;
  const figs = [["S&P 500", inst.spx?.change], ["FTSE 100", inst.ftse?.change], ["GOLD", inst.gold?.change]];
  const now = new Date();
  const date = now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" }).toUpperCase();
  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
  const allText = `${word}${sub}${figs.map((f) => f[0] + fmtChange(f[1])).join("")}${lights || ""}0123456789+−-./:— `;

  let fonts;
  try {
    fonts = await Promise.all([
      font("Doto", 900, false, allText),
      font("Geist Mono", 400),
      font("Geist", 400),
      font("Cormorant Garamond", 500),
      font("Cormorant Garamond", 300, true)
    ]);
  } catch {
    fonts = undefined; // falls back to the built-in sans rather than failing the card
  }

  const figRow = (scale) => (
    <div style={{ display: "flex", borderTop: `1px solid ${FG}` }}>
      {figs.map(([n, c], i) => (
        <div key={n} style={{ display: "flex", flexDirection: "column", flex: 1, padding: `${28 * scale}px 0 ${28 * scale}px ${i ? 30 * scale : 0}px`, borderLeft: i ? `1px solid ${LINE}` : "none", borderBottom: `1px solid ${LINE}` }}>
          <div style={{ fontFamily: "Geist", fontSize: 22 * scale, letterSpacing: 6 * scale, color: DIM }}>{n}</div>
          <div style={{ fontFamily: "Doto", fontSize: 64 * scale, color: c > 0 ? GREEN : FG, marginTop: 10 * scale }}>{c == null ? "—" : fmtChange(c).replace("%", "")}</div>
        </div>
      ))}
    </div>
  );

  const headers = { "cache-control": "public, s-maxage=600, stale-while-revalidate=1800" };

  if (og) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", background: "#000", color: FG, padding: 56 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 40 }}>
            <div style={{ fontFamily: "Cormorant Garamond", fontSize: 34, letterSpacing: 12, color: GOLD }}>LEDGE DESK</div>
            <div style={{ width: 60, height: 1, background: GOLD, marginTop: 18 }} />
            <div style={{ fontFamily: "Cormorant Garamond", fontStyle: "italic", fontWeight: 300, fontSize: 44, lineHeight: 1.15, marginTop: 40 }}>{line}</div>
            <div style={{ flex: 1 }} />
            {figRow(0.62)}
          </div>
          <div style={{ display: "flex", alignItems: "center" }}><Dial size={420} t={mood?.needle ?? null} word={word} sub={sub.split(" · ")[0]} /></div>
        </div>
      ),
      { width: 1200, height: 630, fonts, headers }
    );
  }

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#000", color: FG, padding: "120px 96px 104px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 32, borderBottom: `1px solid ${LINE}` }}>
          <div style={{ fontFamily: "Cormorant Garamond", fontSize: 42, letterSpacing: 14, color: GOLD }}>LEDGE DESK</div>
          <div style={{ fontFamily: "Geist Mono", fontSize: 26, letterSpacing: 3, color: DIM }}>{date}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 100 }}>
          <Dial size={640} t={mood?.needle ?? null} word={word} sub={sub} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", textAlign: "center", fontFamily: "Cormorant Garamond", fontStyle: "italic", fontWeight: 300, fontSize: 64, lineHeight: 1.12, marginTop: 80 }}>{line}</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 70 }}>{figRow(1)}</div>
        {lights && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30, fontFamily: "Geist", fontSize: 26, letterSpacing: 5, color: DIM }}>
            <span>AI EXPOSURE · WARNING LIGHTS</span>
            <span style={{ fontFamily: "Doto", fontSize: 40, color: GOLD }}>{lights}</span>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontFamily: "Geist Mono", fontSize: 22, letterSpacing: 3, color: DIM }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span>ISSUED {time} LONDON · PRICES DELAYED</span>
            <span style={{ color: FG, marginTop: 8 }}>THE DESK · LINK IN BIO</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span>NOT INVESTMENT</span>
            <span>ADVICE</span>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts, headers }
  );
}
