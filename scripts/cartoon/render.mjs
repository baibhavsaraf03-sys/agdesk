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
const FONTS = path.resolve(process.env.FONTS || "node_modules/@fontsource");
const { chromium } = await import(process.env.PW || "playwright");
fs.mkdirSync(OUT, { recursive: true });
const ep = JSON.parse(fs.readFileSync(epFile, "utf8"));
const name = `${(ep.series || "episode").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-day-${String(ep.day).padStart(2, "0")}`;

execFileSync("python3", [path.join(here, "voice.py"), path.resolve(epFile), OUT, process.env.VOICE || "none"], { stdio: "inherit" });
const tl = JSON.parse(fs.readFileSync(path.join(OUT, "timeline.json"), "utf8"));

const face = (fam, file, w = 400) => {
  const f = path.join(FONTS, file);
  return fs.existsSync(f) ? `@font-face{font-family:'${fam}';src:url(${pathToFileURL(f)}) format('woff2');font-weight:${w}}` : "";
};
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${face("Luckiest Guy", "luckiest-guy/files/luckiest-guy-latin-400-normal.woff2")}
${face("Nunito", "nunito/files/nunito-latin-800-normal.woff2", 800)}
${face("Nunito", "nunito/files/nunito-latin-900-normal.woff2", 900)}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#000}
#stage{position:absolute;inset:0;overflow:hidden}
.cap{display:inline-block;font-family:'Luckiest Guy';font-size:118px;line-height:1.05;color:#fff;letter-spacing:2px;
  -webkit-text-stroke:16px #14131b;paint-order:stroke fill;text-shadow:0 10px 0 rgba(0,0,0,.35);transform-origin:50% 60%}
</style></head><body><div id="stage"></div>
<script>${fs.readFileSync(path.join(here, "kit.js"), "utf8")}</script>
<script>setup(${JSON.stringify(ep)}, ${JSON.stringify(tl)});</script></body></html>`;
const page = path.join(OUT, "episode.html");
fs.writeFileSync(page, html);

const dir = path.join(OUT, "frames");
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await p.goto(pathToFileURL(page).href);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
const n = Math.round(tl.seconds * FPS);
const only = process.env.FRAMES ? process.env.FRAMES.split(",").map(Number) : null;
for (let i = 0; i < n; i++) {
  if (only && !only.includes(i)) continue;
  await p.evaluate((t) => window.draw(t), i / FPS);
  await p.screenshot({ path: path.join(dir, String(i).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 92 });
}
await b.close();
if (only) { console.log(`stills in ${dir} (${n} frames in the full episode, ${tl.seconds}s)`); process.exit(0); }

const tmp = path.join(OUT, `${name}.part.mp4`);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(dir, "%05d.jpg"), "-i", path.join(OUT, "audio.wav"),
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
  "-shortest", "-movflags", "+faststart", tmp]);
fs.renameSync(tmp, path.join(OUT, `${name}.mp4`));
console.log(`${name}.mp4 (${tl.seconds}s)`);
