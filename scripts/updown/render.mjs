/**
 * Up or Down video (18 Nov): a real 15-minute price window replayed in about
 * 11 seconds, then the answer. Noir look (black, gold, green up, red down),
 * Cormorant for the question, Doto for the clock, Geist for figures.
 *
 *   PW=... FONTS=<@fontsource dir> VOICE=kokoro:<dir>:<voice>|none \
 *     node scripts/updown/render.mjs <window.json> <outdir>
 *
 * window.json comes from data.mjs (today()). Writes updown.mp4 and
 * timeline/audio files in outdir. FRAMES=1,2 renders stills only.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";
import { fmt, nyTime, nyDate } from "./data.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const [winFile, outArg] = process.argv.slice(2);
const OUT = path.resolve(outArg || "/tmp/updown");
const FPS = 30, W = 1080, H = 1920;
const T = { intro: 1.6, replay: 11, hold: 0.7, reveal: 3.4 };
const SECONDS = T.intro + T.replay + T.hold + T.reveal;
const FONTS = path.resolve(process.env.FONTS || "node_modules/@fontsource");
const { chromium } = await import(process.env.PW || "playwright");
fs.mkdirSync(OUT, { recursive: true });
const win = JSON.parse(fs.readFileSync(winFile, "utf8"));
const m = win.market;
const name = m.name.replace(/^The /, "the ");
const lead = m.name.replace(/^the /, "The ");

const data = {
  points: win.points.map((p) => p.c), target: win.target, dir: win.dir,
  labels: { target: fmt(m, win.target), final: fmt(m, win.final) },
  values: win.points.map((p) => fmt(m, p.c)),
  pct: (win.pct >= 0 ? "+" : "") + win.pct.toFixed(Math.abs(win.pct) < 0.1 ? 3 : 2) + "%",
  q: lead, when: `${nyTime(win.start)} New York · ${nyDate(win.start)}`, source: m.source, T
};

// Sound: the question and the answer spoken, a tick each simulated minute,
// a quickening pulse in the last seconds, and a hit on the reveal.
execFileSync("python3", [path.join(here, "audio.py"), OUT, process.env.VOICE || "none",
  JSON.stringify({ seconds: SECONDS, T, ask: `Will ${name} go up or down in the next 15 minutes?`, answer: win.dir === "up" ? "Up." : "Down.", dir: win.dir })], { stdio: "inherit" });

const face = (fam, file, w = 400) => {
  const f = path.join(FONTS, file);
  return fs.existsSync(f) ? `@font-face{font-family:'${fam}';src:url(${pathToFileURL(f)}) format('woff2');font-weight:${w}}` : "";
};
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${face("Cormorant", "cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2", 500)}
${face("Cormorant", "cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2", 600)}
${face("Doto", "doto/files/doto-latin-800-normal.woff2", 800)}
${face("Doto", "doto/files/doto-latin-900-normal.woff2", 900)}
${face("Geist", "geist-sans/files/geist-sans-latin-500-normal.woff2", 500)}
${face("Geist", "geist-sans/files/geist-sans-latin-600-normal.woff2", 600)}
${face("GeistMono", "geist-mono/files/geist-mono-latin-500-normal.woff2", 500)}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#000;color:#ece7dc;font-family:Geist,sans-serif}
.k{font-family:Geist;font-weight:600;letter-spacing:.32em;text-transform:uppercase;color:#c8a96a;font-size:26px}
.q{font-family:Cormorant;font-weight:500;font-size:84px;line-height:1.04;text-align:center}
.up{color:#2bd67b}.dn{color:#ff5a5f}.gd{color:#c8a96a}
.mono{font-family:GeistMono,monospace}
.dots{font-family:Doto;font-weight:900}
.pill{display:inline-block;padding:6px 16px;border-radius:999px;font-family:GeistMono;font-size:30px;color:#000}
</style></head><body>
<div style="position:absolute;inset:0;background:radial-gradient(120% 70% at 50% 35%,#1b1710 0%,#070604 60%,#000 100%)"></div>
<div id="hud" style="position:absolute;left:0;right:0;top:120px;text-align:center"><div class="k">Ledge · Desk &nbsp;—&nbsp; Up or down?</div></div>
<div id="q" class="q" style="position:absolute;left:70px;right:70px;top:210px">Will <span class="gd">${lead}</span> go <span class="up">up</span> or <span class="dn">down</span> in the next 15 minutes?</div>
<div id="row" style="position:absolute;left:70px;right:70px;top:520px;display:flex;justify-content:space-between;font-size:36px">
  <div><span class="mono gd" id="tg">${data.labels.target}</span> <span style="color:#8f8a80">start</span></div>
  <div><span class="mono" id="cur">${data.labels.target}</span> <span style="color:#8f8a80">now</span></div></div>
<svg id="ch" width="${W}" height="620" style="position:absolute;left:0;top:620px" viewBox="0 0 ${W} 620"></svg>
<div id="clock" class="dots" style="position:absolute;left:0;right:0;top:1290px;text-align:center;font-size:190px;letter-spacing:6px">15:00</div>
<div id="cta" style="position:absolute;left:0;right:0;top:1540px;text-align:center;font-size:42px;font-weight:600">Comment <span class="up">UP</span> or <span class="dn">DOWN</span> before 00:00</div>
<div id="when" class="mono" style="position:absolute;left:0;right:0;top:1620px;text-align:center;font-size:28px;color:#8f8a80">Real prices, replayed · ${data.when}</div>
<div id="rev" style="position:absolute;inset:0;opacity:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.86)">
  <div class="k">${lead} · 15 minutes later</div>
  <div class="dots ${data.dir === "up" ? "up" : "dn"}" id="ans" style="font-size:300px;line-height:1;margin:40px 0 10px">${data.dir === "up" ? "UP" : "DOWN"}</div>
  <div class="mono" style="font-size:54px">${data.labels.target} → <span class="${data.dir === "up" ? "up" : "dn"}">${data.labels.final}</span></div>
  <div class="mono ${data.dir === "up" ? "up" : "dn"}" style="font-size:44px;margin-top:14px">${data.pct}</div>
  <div style="font-family:Cormorant;font-size:64px;margin-top:90px">Did you call it?</div>
  <div style="font-size:34px;color:#8f8a80;margin-top:20px">A new one every day. A game, not a bet.</div>
  <div class="mono" style="position:absolute;bottom:150px;left:60px;right:60px;text-align:center;font-size:24px;color:#6f6a60">Delayed data from Yahoo Finance: ${data.source}, ${data.when}.</div>
</div>
<script>
const D=${JSON.stringify(data)};
const P=D.points, n=P.length-1, c0=D.target;
const span=Math.max(...P.map(p=>Math.abs(p-c0)))*1.35||1;
const X=(i)=>70+i*(940/n), Y=(v)=>310-(v-c0)/span*250;
const ease=(x)=>1-Math.pow(1-Math.min(1,Math.max(0,x)),3);
function val(f){ // smooth value at fractional minute f (Catmull-Rom)
  const i=Math.min(n-1,Math.floor(f)), u=f-i, p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(n,i+2)];
  return 0.5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u);
}
// Doto draws ":" as a cross; two round dots instead, as on the site's clock.
const COLON='<span style="display:inline-block;position:relative;width:.42em;height:.72em;vertical-align:baseline"><i style="position:absolute;left:.13em;top:.08em;width:.15em;height:.15em;border-radius:50%;background:currentColor"></i><i style="position:absolute;left:.13em;top:.46em;width:.15em;height:.15em;border-radius:50%;background:currentColor"></i></span>';
const fmtv=(v)=>{const a=D.labels.target; const dp=(a.split('.')[1]||'').length; return a.replace(/[\\d,.]+/, v.toLocaleString('en-US',{minimumFractionDigits:dp,maximumFractionDigits:dp}));};
window.draw=(t)=>{
  const T=D.T, f=Math.max(0,Math.min(n,(t-T.intro)/T.replay*n));
  const qa=ease(t/0.5); document.getElementById('q').style.opacity=qa; document.getElementById('q').style.transform='translateY('+(30*(1-qa))+'px)';
  let path='', k=0; const steps=Math.max(1,Math.round(f*12));
  for(let s=0;s<=steps;s++){ const x=f*s/steps; path+=(s?'L':'M')+X(x).toFixed(1)+','+Y(val(x)).toFixed(1); }
  const v=val(f), up=v>=c0, col=up?'#2bd67b':'#ff5a5f';
  const pct=(v-c0)/c0*100, ps=(pct>=0?'+':'')+pct.toFixed(Math.abs(pct)<0.1?3:2)+'%';
  document.getElementById('ch').innerHTML=
    '<line x1="40" x2="1040" y1="'+Y(c0)+'" y2="'+Y(c0)+'" stroke="#c8a96a" stroke-width="3" stroke-dasharray="4 12" stroke-linecap="round"/>'+
    '<path d="'+path+'" fill="none" stroke="#ece7dc" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>'+
    '<circle cx="'+X(f)+'" cy="'+Y(v)+'" r="20" fill="'+col+'" opacity=".25"/><circle cx="'+X(f)+'" cy="'+Y(v)+'" r="11" fill="'+col+'"/>'+
    '<rect x="'+Math.min(X(f)+24,890)+'" y="'+(Y(v)-24)+'" width="150" height="48" rx="24" fill="'+col+'"/>'+
    '<text x="'+(Math.min(X(f)+24,890)+75)+'" y="'+(Y(v)+10)+'" text-anchor="middle" font-family="GeistMono" font-size="26" fill="#000">'+ps+'</text>';
  const cur=document.getElementById('cur'); cur.textContent=fmtv(v); cur.style.color=col;
  const left=Math.max(0,15*60*(1-f/n)), mm=Math.floor(left/60), ss=Math.floor(left%60);
  const clock=document.getElementById('clock'); clock.innerHTML=String(mm).padStart(2,'0')+COLON+String(ss).padStart(2,'0');
  clock.style.color=t<T.intro?'#ece7dc':col;
  const last=t>T.intro+T.replay-3&&t<T.intro+T.replay+T.hold; clock.style.transform=last?'scale('+(1+0.04*Math.abs(Math.sin(t*9)))+')':'none';
  const r=(t-(T.intro+T.replay+T.hold))/0.35; const rev=document.getElementById('rev');
  rev.style.opacity=Math.min(1,Math.max(0,r)); document.getElementById('ans').style.transform='scale('+(1.5-0.5*ease(r))+')';
};
</script></body></html>`;
const page = path.join(OUT, "updown.html");
fs.writeFileSync(page, html);
const dir = path.join(OUT, "frames");
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await p.goto(pathToFileURL(page).href);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
const n = Math.round(SECONDS * FPS);
const only = process.env.FRAMES ? process.env.FRAMES.split(",").map(Number) : null;
for (let i = 0; i < n; i++) {
  if (only && !only.includes(i)) continue;
  await p.evaluate((t) => window.draw(t), i / FPS);
  await p.screenshot({ path: path.join(dir, String(i).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 92 });
}
await b.close();
if (only) { console.log(`stills in ${dir}`); process.exit(0); }
const tmp = path.join(OUT, "updown.part.mp4");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(dir, "%05d.jpg"), "-i", path.join(OUT, "audio.wav"),
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-shortest", "-movflags", "+faststart", tmp]);
fs.renameSync(tmp, path.join(OUT, "updown.mp4"));
console.log(`updown.mp4 (${SECONDS.toFixed(1)}s): ${m.name} ${win.dir}, ${data.pct}`);
