/**
 * Edits the Reels (13 Nov; market, word and habit added 17 Nov): 1080x1920,
 * 30 fps, H.264 with a quiet synthesised pad underneath (SOUND=0 for none;
 * the API cannot attach Instagram's own music).
 *
 * Every frame is drawn by a small HTML page in Noir (real fonts, the real
 * dial) and photographed by a headless browser, then ffmpeg encodes the run.
 * Footage and figures come from scripts/reels/capture.mjs.
 *
 *   PW=<playwright index.mjs> FONTS=<@fontsource dir> \
 *     node scripts/reels/compose.mjs <mood|tour|themes|market|word|habit|all> <footagedir> <outdir>
 *
 * word and habit draw the item in SCRIPT_FILE (JSON: kicker, hook, beats
 * [{big, small}], close), written by scripts/reels/post.mjs from
 * lib/social-topics.js. market uses the filmed figures and SCRIPT_FILE's hook.
 *
 * Writes <outdir>/<name>.mp4 and <outdir>/caption.txt (a suggested caption).
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.PW || "playwright");
const which = process.argv[2] || "all";
const FOOT = path.resolve(process.argv[3] || "footage");
const OUT = path.resolve(process.argv[4] || "reels");
const FONTS = path.resolve(process.env.FONTS || "node_modules/@fontsource");
const FPS = 30, W = 1080, H = 1920;
fs.mkdirSync(OUT, { recursive: true });

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(path.join(FOOT, f), "utf8")); } catch { return null; } };
const pulse = readJson("pulse.json") || {};
const feed = readJson("feed.json") || {};
const meta = readJson("meta.json") || { at: new Date().toISOString() };
let SCRIPT = null;
try { SCRIPT = process.env.SCRIPT_FILE ? JSON.parse(fs.readFileSync(process.env.SCRIPT_FILE, "utf8")) : null; } catch { SCRIPT = null; }

/* ---------- what the site was saying ---------- */
const inst = Object.fromEntries((pulse.instruments || []).map((i) => [i.k, i]));
const mood = pulse.mood || null;
const reads = feed.reads || feed || {};
function brief() {
  const r = ["ams", "eur", "eas", "ind", "anz"].map((z) => reads[z]).filter((x) => x && (x.short?.length || x.headline))
    .sort((a, b) => String(b._updatedAt || "").localeCompare(String(a._updatedAt || "")))[0];
  if (!r) return "";
  let s = Array.isArray(r.short) && r.short.length ? r.short[0] : r.headline;
  if (s.length > 130) s = s.slice(0, 127).replace(/\s+\S*$/, "") + "…";
  return s;
}
const chg = (c) => (c == null || !isFinite(c) ? "" : (c > 0 ? "+" : c < 0 ? "−" : "") + Math.abs(c).toFixed(2) + "%");
const at = new Date(meta.at);
const london = (d, opts) => d.toLocaleString("en-GB", { timeZone: "Europe/London", ...opts });
const DATA = {
  word: mood ? mood.word.toUpperCase() : "OPEN",
  vix: mood ? mood.level.toFixed(1) : "",
  needle: mood ? mood.needle : 0.5,
  brief: brief(),
  figs: [["S&P 500", inst.spx?.change], ["FTSE 100", inst.ftse?.change], ["GOLD", inst.gold?.change]].map(([n, c]) => ({ n, v: chg(c), up: c > 0 })),
  date: london(at, { weekday: "long", day: "numeric", month: "long" }).toUpperCase(),
  clock0: Math.floor(at.getTime() / 1000),
  board: (pulse.instruments || []).filter((i) => i.price != null).slice(0, 8).map((i) => ({
    n: i.short || i.name,
    p: i.unit === "fx" ? i.price.toFixed(4) : i.price >= 1000 ? Math.round(i.price).toLocaleString("en-GB") : i.price.toFixed(2),
    v: chg(i.change), up: i.change > 0
  })),
  brief2: briefLines(2),
  script: SCRIPT,
  endLine: SCRIPT?.close || "The desk is open."
};
function briefLines(n) {
  const r = ["ams", "eur", "eas", "ind", "anz"].map((z) => reads[z]).filter((x) => x && Array.isArray(x.short) && x.short.length)
    .sort((a, b) => String(b._updatedAt || "").localeCompare(String(a._updatedAt || "")))[0];
  if (!r) return [];
  return r.short.slice(0, n).map((x) => (x.length > 150 ? x.slice(0, 147).replace(/\s+\S*$/, "") + "…" : x));
}

/* ---------- the page that draws a frame ---------- */
const font = (fam, file, w, st = "normal") => {
  const f = path.join(FONTS, file);
  return fs.existsSync(f) ? `@font-face{font-family:'${fam}';src:url(${pathToFileURL(f)}) format('woff2');font-weight:${w};font-style:${st}}` : "";
};
const FONT_CSS = [
  font("Doto", "doto/files/doto-latin-900-normal.woff2", 900),
  font("Cormorant Garamond", "cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2", 400),
  font("Cormorant Garamond", "cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2", 500),
  font("Cormorant Garamond", "cormorant-garamond/files/cormorant-garamond-latin-300-italic.woff2", 300, "italic"),
  font("Cormorant Garamond", "cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff2", 400, "italic"),
  font("Geist", "geist-sans/files/geist-sans-latin-400-normal.woff2", 400),
  font("Geist", "geist-sans/files/geist-sans-latin-500-normal.woff2", 500),
  font("Geist Mono", "geist-mono/files/geist-mono-latin-400-normal.woff2", 400)
].join("\n");

const img = (name) => {
  const f = path.join(FOOT, name + ".jpg");
  return fs.existsSync(f) ? pathToFileURL(f).href : "";
};

const PAGE = (script) => `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_CSS}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;background:#000;overflow:hidden;color:#E6E2DA;font-family:Geist,Arial,sans-serif}
#stage{position:absolute;inset:0;background-color:#000;background-image:radial-gradient(#161512 2px,transparent 2.6px);background-size:28px 28px}
.layer{position:absolute;inset:0;opacity:0;will-change:opacity,transform}
.mark{font-family:'Cormorant Garamond',serif;font-weight:500;letter-spacing:.5em;color:#C8A96A;text-transform:uppercase}
.mono{font-family:'Geist Mono',monospace;letter-spacing:.16em;color:#8F8A80;text-transform:uppercase}
.dots{font-family:Doto,'Geist Mono',monospace;font-weight:900;color:#E6E2DA}
.serif{font-family:'Cormorant Garamond',serif}
.it{font-style:italic;font-weight:300}
.gold{color:#C8A96A}
.rule{height:2px;background:#C8A96A}
.center{position:absolute;left:0;right:0;display:flex;flex-direction:column;align-items:center;text-align:center}
.card{position:absolute;left:50%;width:842px;height:1497px;transform-origin:50% 50%;border:2px solid #5A4C30;overflow:hidden;background:#000}
.card img{width:100%;height:100%;object-fit:cover;display:block}
.cap{position:absolute;left:96px;right:120px;top:120px}
.cap .k{font-family:'Geist Mono',monospace;font-size:26px;letter-spacing:.2em;color:#C8A96A;text-transform:uppercase}
.cap .t{font-family:'Cormorant Garamond',serif;font-weight:500;font-size:84px;line-height:1.02;margin-top:18px;color:#F2EEE6}
.fig{display:flex;flex-direction:column;align-items:center;gap:8px}
.dt-colon{display:inline-flex;flex-direction:column;justify-content:space-between;width:.11em;height:.42em;margin:0 .14em;transform:translateY(.02em)}
.dt-colon i{display:block;width:.11em;height:.11em;border-radius:50%;background:currentColor}
</style></head><body><div id="stage"></div>
<script>
const W=${W},H=${H},DATA=${JSON.stringify(DATA)};
const $=(h)=>{const d=document.createElement('div');d.innerHTML=h.trim();return d.firstChild};
const stage=document.getElementById('stage');
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=(x)=>{x=clamp(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};
const out=(x)=>1-Math.pow(1-clamp(x),3);
// fade in over [a,a+d], out over [b-d,b]
const win=(t,a,b,d=.45)=>clamp(Math.min((t-a)/d,(b-t)/d));
const dotTime=(s)=>s.split(':').join('<span class="dt-colon"><i></i><i></i></span>');
function dialSVG(size,needle,lit){
  const c=size/2,r=c-12;let s='<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">';
  s+='<circle cx="'+c+'" cy="'+c+'" r="'+(r+8)+'" fill="#0A0A09" stroke="#2A2723" stroke-width="2"/>';
  for(let i=0;i<=60;i++){const a=(150+4*i)*Math.PI/180,maj=i%5===0,r2=r-(maj?size*.055:size*.026);
    const on=i/60<=lit+1e-6;const col=i>=48?'#2BD67B':maj?'#C8A96A':'#3A352D';
    s+='<line x1="'+(c+r*Math.cos(a))+'" y1="'+(c+r*Math.sin(a))+'" x2="'+(c+r2*Math.cos(a))+'" y2="'+(c+r2*Math.sin(a))+'" stroke="'+col+'" stroke-width="'+(maj?size/160:size/330)+'" opacity="'+(on?1:.22)+'"/>';}
  const na=(150+240*needle)*Math.PI/180,nl=r*.76;
  s+='<line x1="'+c+'" y1="'+c+'" x2="'+(c+nl*Math.cos(na))+'" y2="'+(c+nl*Math.sin(na))+'" stroke="#2BD67B" stroke-width="'+size/130+'" stroke-linecap="round"/>';
  s+='<circle cx="'+c+'" cy="'+c+'" r="'+size/55+'" fill="#000" stroke="#C8A96A" stroke-width="'+size/170+'"/></svg>';return s}
function endCard(el,t,a,b,line){
  const o=win(t,a,b+1,.6);el.style.opacity=o;
  el.querySelector('.ec').style.transform='translateY('+(30*(1-out((t-a)/1.2)))+'px)';
}
${script}
</script></body></html>`;

/* ---------- the three Reels ---------- */
const END = `
const endEl=$('<div class="layer"><div class="center ec" style="top:640px;gap:44px">'
 +'<div class="mark" style="font-size:52px;margin-right:-.5em">Ledge Desk</div>'
 +'<div style="width:2px;height:120px;background:#5A4C30"></div>'
 +'<div class="serif it" style="font-size:72px;line-height:1.15;max-width:860px">'+DATA.endLine+'</div>'
 +'<div class="mono" style="font-size:34px;color:#E6E2DA;letter-spacing:.22em">ledgedesk.com</div>'
 +'</div><div class="center mono" style="top:1560px;font-size:22px">Educational material · Not investment advice</div></div>');
stage.appendChild(endEl);`;

const SPECS = {
  // 14 s. The hook: the clock, then the dial finds today's mood.
  mood: {
    seconds: 14,
    script: `
const clock=$('<div class="layer"><div class="center" style="top:520px;gap:40px"><div class="mark" style="font-size:40px;margin-right:-.5em">Ledge Desk</div><div style="width:2px;height:90px;background:#5A4C30"></div><div class="dots" id="clk" style="font-size:150px;letter-spacing:.04em;display:flex;align-items:center"></div><div class="mono" style="font-size:28px">'+DATA.date+'</div></div></div>');
const dial=$('<div class="layer"><div class="center" style="top:250px"><div class="mono" style="font-size:32px;color:#C8A96A">The market right now is</div></div><div class="center" style="top:400px" id="dialbox"></div><div class="center" style="top:1010px;gap:22px"><div class="dots" id="word" style="font-size:150px;letter-spacing:.03em"></div><div class="mono" id="vix" style="font-size:30px"></div></div></div>');
const why=$('<div class="layer"><div class="center" style="top:300px;gap:40px"><div class="mono" style="font-size:28px;color:#C8A96A">The hour\\'s brief</div><div class="rule" style="width:80px"></div><div class="serif it" style="font-size:78px;line-height:1.14;max-width:900px">'+DATA.brief+'</div></div><div id="figs" style="position:absolute;left:96px;right:96px;top:1180px;display:flex;justify-content:space-between;border-top:2px solid #E6E2DA;padding-top:40px"></div></div>');
stage.append(clock,dial,why);${END}
why.querySelector('#figs').innerHTML=DATA.figs.map(f=>'<div class="fig"><div class="mono" style="font-size:24px">'+f.n+'</div><div class="dots" style="font-size:66px;color:'+(f.up?'#2BD67B':'#E6E2DA')+'">'+(f.v||'—')+'</div></div>').join('');
if(!DATA.brief) why.querySelector('.it').textContent='Every market, rewritten every hour.';
window.draw=(t)=>{
  clock.style.opacity=win(t,0,3.1,.6);
  const s=new Date((DATA.clock0+Math.floor(t))*1000).toLocaleTimeString('en-GB',{timeZone:'Europe/London',hour12:false});
  clock.querySelector('#clk').innerHTML=dotTime(s);
  dial.style.opacity=win(t,2.9,8.2,.5);
  const k=ease((t-3.4)/2.6), n=DATA.needle*k;
  dial.querySelector('#dialbox').innerHTML=dialSVG(560,n,n);
  const w=dial.querySelector('#word');w.textContent=DATA.word;w.style.opacity=clamp((t-5.6)/.6);w.style.transform='translateY('+(24*(1-out((t-5.6)/.8)))+'px)';
  const v=dial.querySelector('#vix');v.textContent=DATA.vix?'VIX '+DATA.vix:'';v.style.opacity=clamp((t-6.2)/.6);
  why.style.opacity=win(t,8,11.4,.5);
  why.querySelector('#figs').style.opacity=clamp((t-9.2)/.6);
  endCard(endEl,t,11.2,14);
};`
  },

  // 21 s. The tour: a hook card, eight screens, the end card.
  tour: {
    seconds: 21,
    script: `
const shots=[['door','Walk in.','The front page'],['home-noir','Five dials. One mood.','Instruments'],['menu','Every market, one menu.','The desk'],['chart','Real charts.','Charts'],['calendar','Every release that moves money.','Calendar'],['meme','What Reddit is piling into.','Meme stocks'],['doom','The AI bubble, tracked hourly.','Doomsday'],['analyst','Ask the analyst.','Analyst']];
const IMG=${JSON.stringify(Object.fromEntries(["door", "home-noir", "menu", "chart", "calendar", "meme", "doom", "analyst"].map((n) => [n, img(n)])))};
const hook=$('<div class="layer"><div class="center" style="top:560px;gap:46px"><div class="mono" style="font-size:30px;color:#C8A96A">A markets terminal</div><div class="serif" style="font-size:170px;font-weight:500;line-height:.95">For<br>everyone.</div><div class="rule" style="width:90px"></div><div class="mono" style="font-size:28px">Free · Rewritten every hour</div></div></div>');
stage.appendChild(hook);
const L=shots.map(([n,t,k])=>{const el=$('<div class="layer"><div class="cap"><div class="k">'+k+'</div><div class="t">'+t+'</div></div><div class="card" style="top:380px"><img src="'+IMG[n]+'"></div></div>');stage.appendChild(el);return el});${END}
const S0=2.2,D=1.95;
window.draw=(t)=>{
  hook.style.opacity=win(t,0,S0+.2,.4);
  hook.firstChild.style.transform='scale('+(1+.03*clamp(t/S0))+')';
  L.forEach((el,i)=>{const a=S0+i*D,b=a+D+.35;el.style.opacity=win(t,a,b,.35);
    const card=el.querySelector('.card');const z=1+.05*clamp((t-a)/(D+.35));
    card.style.transform='translateX(-50%) scale('+z+')';
    // captions change cleanly: the old one is gone before the new one arrives
    const cap=el.querySelector('.cap');cap.style.opacity=clamp(Math.min((t-a-.3)/.3,(a+D-t)/.25));
    cap.style.transform='translateY('+(26*(1-out((t-a-.3)/.6)))+'px)';});
  endCard(endEl,t,S0+shots.length*D+.1,21);
};`
  },

  // 11 s. Noir or Blanc: a wipe between the two, then the question.
  themes: {
    seconds: 11,
    script: `
const N=${JSON.stringify(img("home-noir"))},B=${JSON.stringify(img("home-blanc"))};
const sc=$('<div class="layer"><div class="cap" style="top:110px"><div class="k">Pick your desk</div><div class="t" id="tt">Noir</div></div><div class="card" style="top:380px"><img src="'+N+'" style="position:absolute;inset:0"><img id="bl" src="'+B+'" style="position:absolute;inset:0"><div id="bar" style="position:absolute;top:0;bottom:0;width:4px;background:#C8A96A"></div></div></div>');
const q=$('<div class="layer"><div class="center" style="top:600px;gap:50px"><div class="serif" style="font-size:150px;font-weight:500;line-height:1"><span>Noir</span> <span class="it gold" style="font-size:90px">or</span> <span>Blanc?</span></div><div class="rule" style="width:90px"></div><div class="serif it" style="font-size:66px">Tell us in the comments.</div></div></div>');
stage.append(sc,q);${END}
window.draw=(t)=>{
  sc.style.opacity=win(t,0,6.6,.5);
  const card=sc.querySelector('.card');card.style.transform='translateX(-50%) scale('+(1+.03*clamp(t/6.6))+')';
  // Blanc wipes in from the right, holds, wipes half back, then fully over.
  let p=t<1.6?0:t<3.2?ease((t-1.6)/1.6):t<4.2?1:t<5.2?1-.5*ease((t-4.2)/1):.5;
  const x=842*(1-p);
  sc.querySelector('#bl').style.clipPath='inset(0 0 0 '+x+'px)';
  const bar=sc.querySelector('#bar');bar.style.left=(x-2)+'px';bar.style.opacity=p>0&&p<1?1:0;
  sc.querySelector('#tt').textContent=p<.5?'Noir':p>.5?'Blanc':'Noir / Blanc';
  q.style.opacity=win(t,6.4,8.8,.5);
  endCard(endEl,t,8.6,11);
};`
  },
  // 21 s. The day's figures: a hook, the board, the mood, two lines of the brief.
  market: {
    seconds: 21,
    script: `
const S=DATA.script||{};
const hook=$('<div class="layer"><div class="center" style="top:540px;gap:44px"><div class="mono" style="font-size:30px;color:#C8A96A">'+(S.kicker||'Markets today')+'</div><div class="serif" style="font-size:132px;font-weight:500;line-height:1;max-width:940px">'+(S.hook||'Where the money moved.')+'</div><div class="rule" style="width:90px"></div><div class="mono" style="font-size:28px">'+DATA.date+'</div></div></div>');
const board=$('<div class="layer"><div class="cap" style="top:150px"><div class="k">The board · delayed prices</div><div class="t">Today, so far.</div></div><div id="rows" style="position:absolute;left:84px;right:84px;top:520px;border-top:2px solid #E6E2DA"></div></div>');
const md=$('<div class="layer"><div class="center" style="top:300px"><div class="mono" style="font-size:32px;color:#C8A96A">The mood</div></div><div class="center" style="top:420px" id="db"></div><div class="center" style="top:1000px;gap:20px"><div class="dots" style="font-size:140px">'+DATA.word+'</div><div class="mono" style="font-size:30px">'+(DATA.vix?'VIX '+DATA.vix:'')+'</div></div></div>');
const br=$('<div class="layer"><div class="center" style="top:330px;gap:40px"><div class="mono" style="font-size:28px;color:#C8A96A">The brief</div><div class="rule" style="width:80px"></div><div id="bl" style="display:flex;flex-direction:column;gap:56px;max-width:900px"></div></div></div>');
stage.append(hook,board,md,br);${END}
board.querySelector('#rows').innerHTML=DATA.board.map(r=>'<div class="row" style="display:flex;align-items:baseline;justify-content:space-between;padding:30px 0;border-bottom:1px solid #2A2723"><div style="font-size:40px;width:330px">'+r.n+'</div><div class="mono" style="font-size:36px;color:#8F8A80;letter-spacing:.04em;flex:1;text-align:right;padding-right:40px">'+r.p+'</div><div class="dots" style="font-size:54px;width:230px;text-align:right;color:'+(r.up?'#2BD67B':'#E6E2DA')+'">'+(r.v||'—')+'</div></div>').join('');
const lines=DATA.brief2.length?DATA.brief2:['Every market, rewritten every hour.'];
br.querySelector('#bl').innerHTML=lines.map(l=>'<div class="serif it" style="font-size:62px;line-height:1.16">'+l+'</div>').join('');
const rows=[...board.querySelectorAll('.row')];
window.draw=(t)=>{
  hook.style.opacity=win(t,0,3.3,.5);hook.firstChild.style.transform='scale('+(1+.03*clamp(t/3.3))+')';
  board.style.opacity=win(t,3.1,10.4,.45);
  rows.forEach((r,i)=>{const a=3.5+i*.28;r.style.opacity=clamp((t-a)/.4);r.style.transform='translateX('+(40*(1-out((t-a)/.6)))+'px)'});
  md.style.opacity=win(t,10.2,14.4,.45);
  const n=DATA.needle*ease((t-10.5)/2);md.querySelector('#db').innerHTML=dialSVG(520,n,n);
  br.style.opacity=win(t,14.2,18.4,.45);
  [...br.querySelectorAll('#bl > div')].forEach((d,i)=>{const a=14.6+i*.9;d.style.opacity=clamp((t-a)/.5);d.style.transform='translateY('+(24*(1-out((t-a)/.7)))+'px)'});
  endCard(endEl,t,18.2,21);
};`
  },

  // 21 s. One idea in four beats: a word explained, or a money habit.
  word: { seconds: 21, script: EXPLAINER() },
  habit: { seconds: 21, script: EXPLAINER() }
};

function EXPLAINER() {
  return `
const S=DATA.script||{hook:'',beats:[]};
const hook=$('<div class="layer"><div class="center" style="top:560px;gap:46px"><div class="mono" style="font-size:30px;color:#C8A96A">'+(S.kicker||'')+'</div><div class="serif" style="font-size:'+(S.hook.length>18?118:150)+'px;font-weight:500;line-height:1;max-width:940px">'+S.hook+'</div><div class="rule" style="width:90px"></div></div></div>');
stage.appendChild(hook);
const B=S.beats.map((b,i)=>{const el=$('<div class="layer"><div style="position:absolute;left:96px;right:96px;top:560px"><div class="dots" style="font-size:44px;color:#C8A96A">'+String(i+1).padStart(2,'0')+' / '+String(S.beats.length).padStart(2,'0')+'</div><div class="rule" style="width:70px;margin:40px 0 50px"></div><div class="serif bg" style="font-size:'+(b.big.length>22?96:116)+'px;font-weight:500;line-height:1.02;color:#F2EEE6">'+b.big+'</div><div class="sm" style="font-size:46px;line-height:1.35;color:#B8B2A6;margin-top:44px;max-width:860px">'+b.small+'</div></div><div class="center mono" style="top:1640px;font-size:24px">'+S.hook+'</div></div>');stage.appendChild(el);return el});${END}
const H0=3.2,D=(17.6-H0)/Math.max(1,B.length);
window.draw=(t)=>{
  hook.style.opacity=win(t,0,H0+.3,.45);hook.firstChild.style.transform='scale('+(1+.035*clamp(t/H0))+')';
  B.forEach((el,i)=>{const a=H0+i*D,b=a+D+.2;el.style.opacity=win(t,a,b,.35);
    const bg=el.querySelector('.bg'),sm=el.querySelector('.sm');
    bg.style.transform='translateY('+(30*(1-out((t-a-.1)/.7)))+'px)';
    sm.style.opacity=clamp((t-a-.5)/.5);sm.style.transform='translateY('+(20*(1-out((t-a-.5)/.7)))+'px)'});
  endCard(endEl,t,17.5,21);
};`;
}


/* ---------- render ---------- */
async function render(name) {
  const spec = SPECS[name];
  const dir = path.join(OUT, `frames-${name}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const html = path.join(OUT, `${name}.html`);
  fs.writeFileSync(html, PAGE(spec.script));
  const b = await chromium.launch({ args: ["--allow-file-access-from-files"] });
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await p.goto(pathToFileURL(html).href);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  const n = Math.round(spec.seconds * FPS);
  const only = process.env.FRAMES ? process.env.FRAMES.split(",").map(Number) : null;
  for (let i = 0; i < n; i++) {
    if (only && !only.includes(i)) continue;
    await p.evaluate((t) => window.draw(t), i / FPS);
    await p.screenshot({ path: path.join(dir, String(i).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 92 });
  }
  await b.close();
  if (only) { console.log(`${name}: sample frames in ${dir}`); return; }
  const tmp = path.join(OUT, `${name}.tmp.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(dir, "%05d.jpg"),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", tmp]);
  if (process.env.SOUND !== "0") {
    // A quiet A-minor pad, slowly breathing, faded at both ends. Made here, so no licence.
    const T = spec.seconds;
    const pad = "0.085*sin(2*PI*110*t)+0.06*sin(2*PI*110.35*t)+0.05*sin(2*PI*164.81*t)*(0.7+0.3*sin(2*PI*0.21*t))"
      + "+0.035*sin(2*PI*220*t)*(0.6+0.4*sin(2*PI*0.13*t))+0.03*sin(2*PI*261.63*t)*(0.5+0.5*sin(2*PI*0.17*t+1))";
    const withSound = path.join(OUT, `${name}.snd.mp4`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-f", "lavfi", "-i", `aevalsrc=${pad}:s=48000:d=${T}`,
      "-af", `lowpass=f=1400,afade=t=in:d=1.5,afade=t=out:st=${T - 2}:d=2,volume=0.9`,
      "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-shortest", "-movflags", "+faststart", withSound]);
    fs.renameSync(withSound, tmp);
  }
  fs.renameSync(tmp, path.join(OUT, `${name}.mp4`));
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`${name}.mp4 (${spec.seconds}s)`);
}

const names = which === "all" ? ["mood", "tour", "themes"] : [which];
for (const n of names) await render(n);

const caption = `${mood ? `The market is ${mood.word.toLowerCase()} today (VIX ${mood.level.toFixed(1)}). ` : ""}Ledge Desk is a free markets desk, rewritten every hour: live instruments, the world's sessions, the calendar, alerts and an analyst. ledgedesk.com\n\nEducational, not investment advice.\n\n#stocks #investing #markets #trading #finance #stockmarket #economy`;
fs.writeFileSync(path.join(OUT, "caption.txt"), caption);
