/*
 * The 3D world for Fix Theo (25 Nov, owner: "use 3D or Roblox style rendering to make them less
 * 2D looking and not like cartoons"). Blocky plastic figures in the style of an online block
 * game (original characters, no game's assets), a lit bedroom with real shadows, and a camera
 * that cuts to whoever is talking. kit.js still draws the cards, captions and HUD on top; this
 * module only draws the people and the room. Exposes window.World once ready.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const W = 1080, H = 1920;
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#1d2140");
scene.fog = new THREE.Fog("#1d2140", 18, 34);
const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);

/* ---------- materials and helpers ---------- */
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.02, ...o });
const box = (w, h, d, m, r = 0.06) => {
  const g = r > 0 ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
};
function tex(w, h, paint) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  paint(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/* ---------- the room ---------- */
function room() {
  const g = new THREE.Group();
  const planks = tex(512, 512, (x, w, h) => {
    x.fillStyle = "#7a5638"; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#70502f" : "#80593a"; x.fillRect(0, i * 64, w, 60); x.fillStyle = "#4e351f"; x.fillRect(0, i * 64 + 60, w, 4); x.fillRect((i * 173) % w, i * 64, 4, 60); }
  });
  planks.wrapS = planks.wrapT = THREE.RepeatWrapping; planks.repeat.set(3, 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), mat("#fff", { map: planks, roughness: 0.8 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const wallTex = tex(512, 512, (x, w, h) => { x.fillStyle = "#3d4384"; x.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 64) { x.fillStyle = "#383d7a"; x.fillRect(i, 0, 30, h); } });
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(4, 2);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), mat("#fff", { map: wallTex, roughness: 0.9 }));
  back.position.set(0, 5, -4); back.receiveShadow = true; g.add(back);
  const side = back.clone(); side.rotation.y = Math.PI / 2; side.position.set(-6.5, 5, 2); g.add(side);
  const side2 = back.clone(); side2.rotation.y = -Math.PI / 2; side2.position.set(6.5, 5, 2); g.add(side2);
  const skirting = box(20, 0.3, 0.12, mat("#2c3068"), 0); skirting.position.set(0, 0.15, -3.94); g.add(skirting);

  // Window with the city at night (glowing).
  const city = tex(512, 512, (x, w, h) => {
    const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0b1030"); gr.addColorStop(1, "#28245a"); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    x.fillStyle = "#f6efc9"; x.beginPath(); x.arc(400, 90, 40, 0, 7); x.fill();
    const bl = [[0, 300, 70], [70, 250, 60], [130, 330, 80], [210, 200, 70], [280, 280, 90], [370, 230, 60], [430, 310, 82]];
    bl.forEach(([bx, by, bw]) => { x.fillStyle = "#0a0e26"; x.fillRect(bx, by, bw, h); x.fillStyle = "#ffd96b"; for (let yy = by + 16; yy < h; yy += 34) for (let xx = bx + 10; xx < bx + bw - 10; xx += 22) if ((xx * 7 + yy * 3) % 5 < 2) x.fillRect(xx, yy, 10, 14); });
  });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.8), new THREE.MeshBasicMaterial({ map: city }));
  win.position.set(3.2, 4.4, -3.95); g.add(win);
  const frameM = mat("#e9e4da");
  [[3.2, 5.85, 2.9, 0.16], [3.2, 2.95, 2.9, 0.16], [3.2, 4.4, 0.12, 2.9], [1.85, 4.4, 0.16, 3.0], [4.55, 4.4, 0.16, 3.0]].forEach(([x, y, w, h]) => { const f = box(w, h, 0.18, frameM, 0.03); f.position.set(x, y, -3.9); g.add(f); });

  // Poster: the crypto dream.
  const poster = tex(256, 360, (x, w, h) => {
    x.fillStyle = "#ffd23f"; x.fillRect(0, 0, w, h); x.fillStyle = "#ff4d5e"; x.beginPath(); x.moveTo(128, 60); x.lineTo(170, 190); x.lineTo(86, 190); x.closePath(); x.fill();
    x.fillStyle = "#fff"; x.fillRect(108, 190, 40, 36); x.fillStyle = "#1c1b25"; x.font = "bold 44px Luckiest Guy, Impact, sans-serif"; x.textAlign = "center"; x.fillText("TO THE", 128, 280); x.fillText("MOON", 128, 330);
  });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.1), mat("#fff", { map: poster }));
  p.position.set(-3.1, 4.6, -3.93); p.rotation.z = 0.06; g.add(p);

  // Bed, desk with a laptop and a tower of ramen cups (Theo believes he is broke).
  const bed = new THREE.Group();
  const frame = box(3.2, 0.6, 2.2, mat("#5b3a2a")); frame.position.y = 0.45; bed.add(frame);
  const mattress = box(3.1, 0.45, 2.1, mat("#7a86c9"), 0.15); mattress.position.y = 0.95; bed.add(mattress);
  const pillow = box(1.1, 0.35, 0.7, mat("#eceaf5"), 0.15); pillow.position.set(-0.9, 1.3, -0.6); bed.add(pillow);
  const head = box(0.25, 1.6, 2.2, mat("#5b3a2a")); head.position.set(-1.6, 0.9, 0); bed.add(head);
  bed.position.set(-4.4, 0, -2.4); bed.rotation.y = Math.PI / 2; g.add(bed);
  const desk = new THREE.Group();
  const top = box(2.4, 0.14, 1.1, mat("#c79a6a")); top.position.y = 1.55; desk.add(top);
  [[-1.1, -0.45], [1.1, -0.45], [-1.1, 0.45], [1.1, 0.45]].forEach(([x, z]) => { const l = box(0.12, 1.5, 0.12, mat("#3a3a44"), 0.02); l.position.set(x, 0.77, z); desk.add(l); });
  const lap = box(0.9, 0.06, 0.6, mat("#b9bcc8"), 0.02); lap.position.set(-0.4, 1.66, 0.05); desk.add(lap);
  const scr = box(0.9, 0.6, 0.04, mat("#b9bcc8"), 0.02); scr.position.set(-0.4, 1.98, -0.25); scr.rotation.x = -0.25; desk.add(scr);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshBasicMaterial({ color: "#7fd3ff" })); glow.position.set(-0.4, 1.98, -0.225); glow.rotation.x = -0.25; desk.add(glow);
  const cupTex = tex(128, 64, (x, w, h) => { x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.fillStyle = "#e3342f"; x.fillRect(0, 18, w, 26); x.fillStyle = "#fff"; x.font = "bold 18px sans-serif"; x.fillText("NOODLE", 30, 37); });
  for (let i = 0; i < 5; i++) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.32, 20), mat("#fff", { map: cupTex }));
    cup.castShadow = true; cup.position.set(0.5 + (i % 3) * 0.36, 1.78 + Math.floor(i / 3) * 0.33, 0.1 - (i % 2) * 0.08); cup.rotation.y = i; desk.add(cup);
  }
  desk.position.set(3.8, 0, -3.1); g.add(desk);
  const box1 = box(0.9, 0.6, 0.9, mat("#e8783c"), 0.04); box1.position.set(4.6, 0.3, 0.6); box1.rotation.y = 0.4; g.add(box1);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.4, 40), mat("#a34d5e", { roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.01, 0.8); rug.receiveShadow = true; g.add(rug);
  return g;
}
scene.add(room());

/* ---------- lights ---------- */
scene.add(new THREE.HemisphereLight("#cfd6ff", "#4a3424", 0.75));
const key = new THREE.DirectionalLight("#fff2dd", 2.2);
key.position.set(4, 9, 7); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -4, near: 1, far: 30 }); key.shadow.bias = -0.0006; key.shadow.radius = 4;
scene.add(key);
const rim = new THREE.PointLight("#7aa2ff", 18, 14); rim.position.set(3.2, 4.4, -2.6); scene.add(rim);
const lamp = new THREE.PointLight("#ffb46b", 10, 10); lamp.position.set(-3, 3.2, 1.5); scene.add(lamp);

/* ---------- people ---------- */
const LOOK = {
  theo: { skin: "#c68863", top: "#2a9d68", topD: "#1f7a50", leg: "#3f5d8f", shoe: "#f4f1ea", hair: "#23202b" },
  dev: { skin: "#8a5a3c", top: "#ee7a2f", topD: "#c45f1c", leg: "#6c7080", shoe: "#24242c", hair: "#141217" },
  maya: { skin: "#e2b08a", top: "#e0a526", topD: "#b98318", leg: "#2b2a33", shoe: "#f4f1ea", hair: "#3b2418" }
};
// Faces painted on the head, one texture per expression, plus a talking (open-mouth) version.
function faceTex(face, talk, who) {
  return tex(256, 256, (x) => {
    x.clearRect(0, 0, 256, 256);
    const L = LOOK[who];
    x.fillStyle = "#16151c"; x.strokeStyle = "#16151c"; x.lineCap = "round";
    const eye = (cx) => {
      const ry = face === "shock" ? 30 : 24, rx = face === "shock" ? 20 : 16;
      x.fillStyle = "#fff"; x.beginPath(); x.ellipse(cx, 112, rx + 5, ry + 5, 0, 0, 7); x.fill();
      x.fillStyle = "#16151c"; x.beginPath(); x.ellipse(cx + (face === "smug" ? 4 : 0), 116 + (face === "sad" ? 6 : 0), rx * 0.62, ry * 0.68, 0, 0, 7); x.fill();
      x.fillStyle = "#fff"; x.beginPath(); x.arc(cx - 4, 106, 4.5, 0, 7); x.fill();
      if (face === "smug" || face === "sad" || face === "worried") { x.fillStyle = L.skin; x.fillRect(cx - 26, 80, 52, face === "smug" ? 34 : 24); }
    };
    eye(92); eye(164);
    x.lineWidth = 9; x.strokeStyle = L.hair;
    const br = { happy: [[70, 70, 112, 64], [144, 64, 186, 70]], shock: [[70, 60, 112, 52], [144, 52, 186, 60]], sad: [[72, 72, 112, 82], [144, 82, 184, 72]],
      smug: [[72, 82, 112, 82], [144, 70, 184, 62]], worried: [[72, 80, 112, 66], [144, 66, 184, 80]] }[face] || [[70, 76, 112, 72], [144, 72, 186, 76]];
    br.forEach(([a, b, c, d]) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); });
    x.lineWidth = 7; x.strokeStyle = "#16151c"; x.fillStyle = "#5b1f2a";
    if (talk || face === "shock") {
      x.beginPath(); x.ellipse(128, 186, talk ? 26 : 16, talk ? 20 : 24, 0, 0, 7); x.fill(); x.stroke();
      if (talk) { x.fillStyle = "#fff"; x.fillRect(108, 170, 40, 8); }
    } else if (face === "happy") { x.beginPath(); x.moveTo(96, 176); x.quadraticCurveTo(128, 218, 160, 176); x.closePath(); x.fill(); x.stroke(); }
    else if (face === "sad") { x.beginPath(); x.moveTo(102, 196); x.quadraticCurveTo(128, 172, 154, 196); x.stroke(); }
    else if (face === "smug") { x.beginPath(); x.moveTo(104, 188); x.quadraticCurveTo(140, 198, 160, 172); x.stroke(); }
    else if (face === "worried") { x.beginPath(); x.moveTo(100, 192); x.quadraticCurveTo(114, 180, 128, 190); x.quadraticCurveTo(142, 200, 156, 186); x.stroke(); }
    else { x.beginPath(); x.moveTo(106, 186); x.quadraticCurveTo(128, 194, 150, 186); x.stroke(); }
  });
}
const FACES = ["neutral", "happy", "shock", "sad", "smug", "worried"];

function makePerson(who) {
  const L = LOOK[who], root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const m = { skin: mat(L.skin), top: mat(L.top), topD: mat(L.topD), leg: mat(L.leg), shoe: mat(L.shoe), hair: mat(L.hair, { roughness: 0.8 }) };
  // Legs and shoes
  const legs = [-0.27, 0.27].map((x) => { const pivot = new THREE.Group(); pivot.position.set(x, 1.55, 0); const leg = box(0.5, 1.45, 0.55, m.leg); leg.position.y = -0.72; pivot.add(leg);
    const shoe = box(0.54, 0.22, 0.68, m.shoe, 0.08); shoe.position.set(0, -1.44, 0.06); pivot.add(shoe); body.add(pivot); return pivot; });
  // Torso
  const torso = box(1.12, 1.25, 0.6, m.top, 0.1); torso.position.y = 2.18; body.add(torso);
  if (who === "theo") { const pocket = box(0.7, 0.32, 0.05, m.topD, 0.04); pocket.position.set(0, 1.86, 0.31); body.add(pocket); const hood = box(0.9, 0.3, 0.35, m.topD, 0.12); hood.position.set(0, 2.82, -0.26); body.add(hood);
    [-0.14, 0.14].forEach((x) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), mat("#f4f1ea")); s.position.set(x, 2.55, 0.32); body.add(s); }); }
  if (who === "dev") { const n = tex(128, 128, (x) => { x.fillStyle = "#fff"; x.font = "bold 84px Luckiest Guy, Impact, sans-serif"; x.textAlign = "center"; x.fillText("24", 64, 98); });
    const num = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshStandardMaterial({ map: n, transparent: true })); num.position.set(0, 2.2, 0.305); body.add(num); }
  if (who === "maya") { const hem = box(1.14, 0.18, 0.62, m.topD, 0.06); hem.position.y = 1.62; body.add(hem); }
  // Arms on shoulder pivots so poses rotate them
  const arms = [-1, 1].map((sd) => { const pivot = new THREE.Group(); pivot.position.set(sd * 0.8, 2.66, 0); const sleeve = box(0.44, 0.8, 0.5, m.top, 0.1); sleeve.position.y = -0.38; pivot.add(sleeve);
    const hand = box(0.4, 0.52, 0.44, m.skin, 0.12); hand.position.y = -1.0; pivot.add(hand); body.add(pivot); return pivot; });
  // Head: a rounded block with the face painted on the front
  const headG = new THREE.Group(); headG.position.y = 3.35; body.add(headG);
  const neck = box(0.4, 0.2, 0.4, m.skin, 0.04); neck.position.y = -0.55; headG.add(neck);
  const head = box(1.0, 1.0, 0.95, m.skin, 0.28); headG.add(head);
  const faces = {}; FACES.forEach((f) => { faces[f] = faceTex(f, false, who); faces[f + "_t"] = faceTex(f, true, who); });
  const faceMat = new THREE.MeshStandardMaterial({ map: faces.neutral, transparent: true, roughness: 0.6 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), faceMat); face.position.z = 0.48; headG.add(face);
  if (who === "theo") {
    // Curls: a cap of little rounded blocks
    for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2, r = i % 2 ? 0.36 : 0.18; const c = box(0.3, 0.26, 0.3, m.hair, 0.12);
      c.position.set(Math.cos(a) * r * 1.3, 0.55 + (i % 3) * 0.04, Math.sin(a) * r - 0.05); c.rotation.set(i, i * 2, 0); headG.add(c); }
    const fringe = box(1.02, 0.22, 0.4, m.hair, 0.1); fringe.position.set(0, 0.42, 0.32); headG.add(fringe);
    [-1, 1].forEach((sd) => { const sb = box(0.12, 0.45, 0.6, m.hair, 0.05); sb.position.set(sd * 0.51, 0.18, -0.05); headG.add(sb); });
  } else if (who === "dev") {
    const capM = mat("#c8202f"); const crown = box(1.06, 0.36, 1.0, capM, 0.16); crown.position.y = 0.5; headG.add(crown);
    const brim = box(0.8, 0.07, 0.55, mat("#a0141f"), 0.03); brim.position.set(0, 0.36, -0.68); headG.add(brim);
    const btn = box(0.12, 0.08, 0.12, capM, 0.03); btn.position.y = 0.7; headG.add(btn);
  } else {
    const back = box(1.1, 1.5, 0.35, m.hair, 0.15); back.position.set(0, -0.15, -0.38); headG.add(back);
    const top = box(1.1, 0.3, 1.02, m.hair, 0.14); top.position.y = 0.48; headG.add(top);
    [-1, 1].forEach((sd) => { const s = box(0.18, 1.1, 0.5, m.hair, 0.08); s.position.set(sd * 0.55, -0.1, 0.1); headG.add(s); });
  }
  root.userData = { who, body, legs, arms, headG, faceMat, faces };
  root.traverse((o) => { if (o.isMesh && o !== face) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(root);
  return root;
}
const PEOPLE = { theo: makePerson("theo"), dev: makePerson("dev"), maya: makePerson("maya") };

/* ---------- poses ---------- */
const POSE = {
  idle: { L: [0.08, 0, 0], R: [0.08, 0, 0] },
  wave: { L: [0.08, 0, 0], R: [0, 0, -2.6] },
  shrug: { L: [-0.15, 0, 0.62], R: [-0.15, 0, -0.62] },
  point: { L: [0.08, 0, 0], R: [-1.45, 0, -0.15] }
};
function pose(p, name, face, talk, t, phase, loud) {
  const u = p.userData, P = POSE[name] || POSE.idle;
  const sway = Math.sin(t * 2.2 + phase) * 0.04;
  u.arms[0].rotation.set(P.L[0] + sway, P.L[1], P.L[2] + (name === "shrug" ? Math.sin(t * 6) * 0.05 : 0));
  u.arms[1].rotation.set(P.R[0] - sway, P.R[1], P.R[2] + (name === "wave" ? Math.sin(t * 10) * 0.35 : 0));
  // Talking: the head nods and the body leans in; yelling leans harder.
  u.headG.rotation.set(talk ? Math.sin(t * 9) * 0.06 + (loud ? -0.1 : 0) : Math.sin(t * 1.3 + phase) * 0.03, Math.sin(t * 0.9 + phase) * 0.12, Math.sin(t * 1.1 + phase) * 0.03);
  u.body.position.y = Math.abs(Math.sin(t * 2.4 + phase)) * 0.04;
  u.body.rotation.x = talk ? (loud ? 0.12 : 0.04) : 0;
  const blink = (t + phase) % 3.4 < 0.1;
  const f = FACES.includes(face) ? face : "neutral";
  u.faceMat.map = u.faces[talk ? f + "_t" : f]; u.faceMat.needsUpdate = true;
  u.headG.children.find((c) => c.geometry?.type === "PlaneGeometry").scale.y = blink && !talk ? 0.9 : 1;
}

/* ---------- per-frame ---------- */
let current = null;
window.World = {
  /** cast: who is on screen; b: the beat. */
  set(b, cast) {
    current = { b, cast };
    Object.values(PEOPLE).forEach((p) => (p.visible = false));
    const spots = cast.length === 2 ? [[-1.45, 0.35], [1.45, -0.35]] : [[0, 0]];
    cast.forEach((w, i) => { const p = PEOPLE[w]; p.visible = true; p.position.set(spots[i][0], 0, 0.6); p.rotation.y = spots[i][1]; });
  },
  frame(t, lt, D, B) {
    if (!current) return;
    const { b, cast } = current;
    const talking = t >= B.voice && t <= B.vend, mouthOpen = talking && Math.floor(t * 11) % 3 !== 0;
    cast.forEach((w, i) => {
      const me = b.who === w;
      const statFace = b.scene === "stat" ? ({ green: "smug", red: "shock", navy: "worried" }[b.bg || "navy"]) : null;
      const face = w === "theo" ? b.face || statFace || "neutral" : b.mface || (b.scene === "stat" ? "smug" : b.face) || "neutral";
      const ps = w === "theo" ? b.pose || "idle" : b.mpose || "idle";
      pose(PEOPLE[w], ps, face, me && mouthOpen, t, i * 1.7, me && B.loud);
    });
    // Camera: close-up on whoever talks; the coach's lines are seen from his side, looking down at Theo.
    const k = cast.indexOf(b.who), duo = cast.length === 2;
    const target = new THREE.Vector3(), pos = new THREE.Vector3();
    if (k >= 0) {
      const p = PEOPLE[b.who].position, side = duo ? (k ? -1 : 1) : 0;
      target.set(p.x, 3.15, p.z); pos.set(p.x + side * 1.6, 3.6, p.z + 5.6 - 0.5 * (lt / D));
    } else if (cast.length) {
      const p = PEOPLE[cast[0]].position;
      target.set(duo ? 0 : p.x, 2.9, p.z); pos.set(duo ? 0 : p.x - 0.7, 5.0 - 0.3 * (lt / D), p.z + (duo ? 8.4 : 7.0) - 1.0 * (lt / D));
    } else { target.set(0, 3, 0); pos.set(0, 4, 9); }
    let fov = 38;
    if (B.loud) {
      const a = Math.max(0.12, 1 - lt / 0.9);
      pos.x += 0.12 * a * Math.sin(t * 83); pos.y += 0.1 * a * Math.sin(t * 71 + 1.7);
      fov -= 9 * (1 - Math.min(1, lt / 0.35));   // a snap zoom on the yell
    } else fov += 3 * (1 - Math.min(1, lt / 0.25));
    camera.fov = fov; camera.updateProjectionMatrix();
    camera.position.copy(pos); camera.lookAt(target);
    renderer.render(scene, camera);
  }
};
window.dispatchEvent(new Event("world-ready"));
