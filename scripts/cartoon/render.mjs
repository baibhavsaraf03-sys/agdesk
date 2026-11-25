/**
 * Renders one cartoon episode (18 Nov): "Fix Theo".
 *
 *   PW=<playwright index.mjs> FONTS=<@fontsource dir> VOICE=<kokoro:<dir>:<voice> | piper .onnx | none> \
 *     node scripts/cartoon/render.mjs <episode.json> <outdir>
 *
 * voice.py speaks the beats and writes timeline.json and audio.wav; the
 * frames are drawn by kit.js in a headless browser at 1080x1920, 30 fps, and
 * ffmpeg joins them with the sound (x264 crf 18 veryfast, AAC). FRAMES=1,2,3
 * renders only those frames as stills, to check the look quickly.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [epFile, outArg] = process.argv.slice(2);
const OUT = path.resolve(outArg || "/tmp/cartoon");
const FPS = 30, W = 1080, H = 1920;
// 25 Nov: "3d" (blocky figures in a lit room, kit3d.js on three.js) is the default; "sketch" and "flat" remain.
const STYLE = process.env.CARTOON_STYLE || "3d";
const TD = STYLE === "3d";
const THREE_DIR = path.resolve(process.env.THREE || path.join(path.dirname(process.env.FONTS || "node_modules/@fontsource"), "three"));
const FONTS = path.resolve(process.env.FONTS || "node_modules/@fontsource");
const { chromium } = await import(process.env.PW || "playwright");
fs.mkdirSync(OUT, { recursive: true });
const ep = JSON.parse(fs.readFileSync(epFile, "utf8"));
const name = `${(ep.series || "episode").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-day-${String(ep.day).padStart(2, "0")}`;

execFileSync("python3", [path.join(here, "voice.py"), path.resolve(epFile), OUT, process.env.VOICE || "none"], { stdio: "inherit" });
const tl = JSON.parse(fs.readFileSync(path.join(OUT, "timeline.json"), "utf8"));

const face = (fam, file, w = 400) => {
  const f = path.join(FONTS, file);
  // 3D pages are served over a local http server (WebGL modules), so fonts come from it too.
  return fs.existsSync(f) ? `@font-face{font-family:'${fam}';src:url(${TD ? "/fonts/" + file : pathToFileURL(f)}) format('woff2');font-weight:${w}}` : "";
};
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${face("Luckiest Guy", "luckiest-guy/files/luckiest-guy-latin-400-normal.woff2")}
${face("Nunito", "nunito/files/nunito-latin-800-normal.woff2", 800)}
${face("Nunito", "nunito/files/nunito-latin-900-normal.woff2", 900)}
${face("Cormorant", "cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2", 600)}
${face("Permanent Marker", "permanent-marker/files/permanent-marker-latin-400-normal.woff2")}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#000}
#stage{position:absolute;inset:0;overflow:hidden}
.cap{display:inline-block;font-family:'Luckiest Guy';font-size:118px;line-height:1.05;color:#fff;letter-spacing:2px;
  -webkit-text-stroke:16px #14131b;paint-order:stroke fill;text-shadow:0 10px 0 rgba(0,0,0,.35);transform-origin:50% 60%}
/* Sketch look (24 Nov, after a viewer said the videos "looked like AI"): ink lines that
   boil like hand-drawn animation, paper grain, motion on twos, marker captions on paper. */
.sketch #stage{filter:saturate(.82) contrast(.96) sepia(.1)}
.sketch .cap{font-family:'Permanent Marker';font-size:88px;line-height:1.12;color:#1d1b18;letter-spacing:0;-webkit-text-stroke:0;text-shadow:none;
  background:#f4eddc;padding:14px 30px 6px;box-shadow:0 8px 0 rgba(0,0,0,.28);border-radius:3px}
.sketch .cap .hi{background:linear-gradient(transparent 55%,#ffd23f 55%,#ffd23f 92%,transparent 92%);color:#1d1b18}
#paper{position:absolute;inset:0;pointer-events:none;display:none;mix-blend-mode:multiply;opacity:.55;
  background:radial-gradient(ellipse at 50% 45%,transparent 55%,rgba(60,40,20,.35)),url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='540' height='540'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' seed='7'/><feColorMatrix values='0 0 0 0 .55  0 0 0 0 .5  0 0 0 0 .42  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
.sketch #paper{display:block}
.td #paper{display:none}.td #stage{filter:none}
/* Coach mode (25 Nov): a name tag over each line, and yelled lines in red, bigger. */
.who{display:inline-block;margin-bottom:34px;padding:6px 22px 2px;font-family:'Permanent Marker','Luckiest Guy';font-size:46px;color:#fff;background:#1d1b18;border-radius:3px;transform-origin:50% 100%;box-shadow:0 6px 0 rgba(0,0,0,.3)}
.who-coach{background:#c8202f}.who-theo{background:#1f7a50}.who-dev{background:#c45f1c}.who-maya{background:#b98318}
#cap .cap{margin:0 auto}
.sketch .cap.loud{background:#c8202f;color:#fff;font-size:104px}
.sketch .cap.loud .hi{background:linear-gradient(transparent 55%,#1d1b18 55%,#1d1b18 92%,transparent 92%);color:#ffd23f}
.cap.loud{color:#ff4d5e}
${TD ? "#gl{position:absolute;inset:0;width:1080px;height:1920px}" : ""}
</style>${TD ? `<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>` : ""}</head><body class="${STYLE === "sketch" || TD ? "sketch" : ""} ${TD ? "td" : ""}">${TD ? `<canvas id="gl" width="1080" height="1920"></canvas>` : ""}<div id="stage"></div><div id="paper"></div>
<svg width="0" height="0" style="position:absolute">${[0, 1, 2].map((k) => `<filter id="boil${k}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="turbulence" baseFrequency="0.018" numOctaves="2" seed="${k * 11 + 3}" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="7" xChannelSelector="R" yChannelSelector="G"/></filter>`).join("")}</svg>
<script>${fs.readFileSync(path.join(here, "kit.js"), "utf8")}</script>
<script>setup(${JSON.stringify(ep)}, ${JSON.stringify(tl)});</script>${TD ? `<script type="module" src="/kit3d.js"></script>` : ""}</body></html>`;
const page = path.join(OUT, "episode.html");
fs.writeFileSync(page, html);

const dir = path.join(OUT, "frames");
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
let server = null, url = pathToFileURL(page).href;
if (TD) {
  const http = await import("node:http");
  const roots = [["/three/", THREE_DIR], ["/fonts/", FONTS], ["/kit3d.js", path.join(here, "kit3d.js")], ["/", OUT]];
  const types = { ".js": "text/javascript", ".html": "text/html", ".woff2": "font/woff2" };
  server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split("?")[0]);
    const [pre, dir] = roots.find(([p]) => u.startsWith(p));
    const f = pre === "/kit3d.js" ? dir : path.join(dir, u.slice(pre.length) || "episode.html");
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${server.address().port}/episode.html`;
}
const b = await chromium.launch({ args: ["--allow-file-access-from-files", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"], ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}) });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
p.on("pageerror", (e) => console.warn("  page error:", e.message));
await p.goto(url);
if (TD) await p.waitForFunction(() => !!window.World, null, { timeout: 60000 });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
const n = Math.round(tl.seconds * FPS);
const only = process.env.FRAMES ? process.env.FRAMES.split(",").map(Number) : null;
for (let i = 0; i < n; i++) {
  if (only && !only.includes(i)) continue;
  // Sketch: the picture moves on twos (15 drawings a second), like hand animation.
  await p.evaluate((t) => window.draw(t), STYLE === "sketch" ? Math.floor(i / 2) * 2 / FPS : i / FPS);   // 3D moves on every frame
  await p.screenshot({ path: path.join(dir, String(i).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 92 });
}
await b.close();
if (server) server.close();
if (only) { console.log(`stills in ${dir} (${n} frames in the full episode, ${tl.seconds}s)`); process.exit(0); }

const tmp = path.join(OUT, `${name}.part.mp4`);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(dir, "%05d.jpg"), "-i", path.join(OUT, "audio.wav"),
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
  "-shortest", "-movflags", "+faststart", tmp]);
fs.renameSync(tmp, path.join(OUT, `${name}.mp4`));
console.log(`${name}.mp4 (${tl.seconds}s)`);
