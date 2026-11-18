/*
 * The cartoon kit (18 Nov): Theo, his room, the props, the HUD and the
 * popping captions, all drawn as SVG in the page that render.mjs films.
 * Original character and props; no brands. Exposes window.setup(ep, tl)
 * and window.draw(t).
 */
(function () {
  const W = 1080, H = 1920;
  const C = {
    line: "#1c1b25", skin: "#c68863", skinD: "#a86c4b", bag: "#8c5a3e", hair: "#23202b",
    hood: "#2a9d68", hoodD: "#1f7a50", jean: "#3f5d8f", jeanD: "#324a73", shoe: "#f4f1ea", sole: "#d6d0c4",
    mouth: "#5b1f2a", gold: "#ffd23f", green: "#2bd67b", red: "#ff4d5e", navy: "#1b2347", wall: "#3a3f7d"
  };
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  /* ---------- Theo (viewBox 0 0 400 820) ---------- */
  const POSES = {
    idle: { L: [[128, 362], [108, 455], [116, 548]], R: [[272, 362], [292, 455], [284, 548]] },
    wave: { L: [[128, 362], [108, 455], [116, 548]], R: [[272, 362], [338, 300], [352, 196]] },
    shrug: { L: [[128, 362], [78, 440], [38, 392]], R: [[272, 362], [322, 440], [362, 392]] },
    point: { L: [[128, 362], [108, 455], [116, 548]], R: [[272, 362], [334, 410], [392, 378]] }
  };
  function arm(pts, id) {
    const d = `M${pts[0]} L${pts[1]} L${pts[2]}`;
    const [hx, hy] = pts[2];
    return `<g id="${id}">
      <path d="${d}" fill="none" stroke="${C.line}" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="${C.hood}" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${hx}" cy="${hy}" r="25" fill="${C.skin}" stroke="${C.line}" stroke-width="6"/></g>`;
  }
  function eye(cx, face) {
    const cy = 228, ry = face === "shock" ? 39 : 33, rx = face === "shock" ? 33 : 30;
    const pr = face === "shock" ? 10 : 13;
    const look = { happy: [2, 2], neutral: [3, 3], shock: [0, 0], sad: [0, 8], smug: [6, 4], worried: [-3, 6] }[face] || [0, 0];
    let s = `<g class="eye" style="transform-origin:${cx}px ${cy}px">
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" stroke="${C.line}" stroke-width="5"/>
      <circle cx="${cx + look[0]}" cy="${cy + look[1]}" r="${pr}" fill="${C.line}"/>
      <circle cx="${cx + look[0] - 4}" cy="${cy + look[1] - 5}" r="4" fill="#fff"/>`;
    if (face === "smug" || face === "sad" || face === "worried")
      s += `<path d="M${cx - rx},${cy + (face === "smug" ? 2 : -6)} A${rx},${ry} 0 0 1 ${cx + rx},${cy + (face === "smug" ? 2 : -6)} Z" fill="${C.skin}" stroke="${C.line}" stroke-width="5"/>`;
    return s + `</g>`;
  }
  function brows(face) {
    const b = {
      neutral: [[132, 186, 186, 182], [214, 182, 268, 186]],
      happy: [[132, 180, 186, 174], [214, 174, 268, 180]],
      shock: [[134, 168, 186, 160], [214, 160, 266, 168]],
      sad: [[134, 184, 186, 196], [214, 196, 266, 184]],
      smug: [[134, 192, 186, 192], [214, 178, 266, 172]],
      worried: [[134, 190, 186, 176], [214, 176, 266, 190]]
    }[face] || [[132, 186, 186, 182], [214, 182, 268, 186]];
    return b.map(([a, c, d, e]) => `<path d="M${a},${c} L${d},${e}" stroke="${C.hair}" stroke-width="13" stroke-linecap="round"/>`).join("");
  }
  function mouth(face) {
    switch (face) {
      case "happy": return `<path d="M166,292 Q200,334 234,292 Z" fill="${C.mouth}" stroke="${C.line}" stroke-width="5" stroke-linejoin="round"/><path d="M174,295 L226,295 Q224,306 200,307 Q176,306 174,295 Z" fill="#fff"/>`;
      case "shock": return `<ellipse cx="200" cy="310" rx="19" ry="25" fill="${C.mouth}" stroke="${C.line}" stroke-width="5"/>`;
      case "sad": return `<path d="M176,312 Q200,292 224,312" fill="none" stroke="${C.line}" stroke-width="6" stroke-linecap="round"/>`;
      case "smug": return `<path d="M176,304 Q208,314 232,292" fill="none" stroke="${C.line}" stroke-width="6" stroke-linecap="round"/>`;
      case "worried": return `<path d="M174,308 Q187,298 200,307 Q213,316 226,304" fill="none" stroke="${C.line}" stroke-width="6" stroke-linecap="round"/>`;
      default: return `<path d="M178,302 Q200,309 222,302" fill="none" stroke="${C.line}" stroke-width="6" stroke-linecap="round"/>`;
    }
  }
  const CURLS = [[96, 186, 30], [104, 146, 32], [130, 112, 34], [168, 92, 36], [210, 86, 37], [250, 96, 35], [284, 120, 33], [304, 156, 31], [308, 192, 26], [150, 128, 30], [200, 120, 30], [250, 130, 30]];
  function theo({ face = "neutral", pose = "idle" } = {}) {
    const P = POSES[pose] || POSES.idle;
    const curls = (stroke) => CURLS.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.hair}"${stroke ? ` stroke="${C.line}" stroke-width="12"` : ""}/>`).join("");
    return `<svg viewBox="0 0 400 820" width="540" height="1107" overflow="visible">
      <!-- legs and shoes -->
      <path d="M120,566 L192,566 L188,748 L132,748 Z" fill="${C.jean}" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M208,566 L280,566 L268,748 L212,748 Z" fill="${C.jean}" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M160,600 L158,740 M240,600 L242,740" stroke="${C.jeanD}" stroke-width="4"/>
      <path d="M118,742 L190,742 L192,770 Q192,786 176,786 L102,786 Q88,786 94,770 Z" fill="${C.shoe}" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M210,742 L282,742 L306,770 Q312,786 296,786 L222,786 Q208,786 208,770 Z" fill="${C.shoe}" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M96,774 L190,774 M210,774 L306,774" stroke="${C.sole}" stroke-width="6"/>
      <path d="M140,756 L176,756 M228,756 L268,756" stroke="${C.gold}" stroke-width="7" stroke-linecap="round"/>
      <!-- body -->
      <rect x="178" y="318" width="44" height="40" fill="${C.skinD}" stroke="${C.line}" stroke-width="6"/>
      <ellipse cx="200" cy="350" rx="96" ry="30" fill="${C.hoodD}" stroke="${C.line}" stroke-width="6"/>
      <path d="M110,368 Q112,344 152,338 L248,338 Q288,344 290,368 L300,560 Q300,578 284,578 L116,578 Q100,578 100,560 Z" fill="${C.hood}" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M140,482 L260,482 L270,544 L130,544 Z" fill="${C.hoodD}" stroke="${C.line}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M184,350 L180,416 M216,350 L220,416" stroke="${C.shoe}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="180" cy="420" r="7" fill="${C.shoe}" stroke="${C.line}" stroke-width="3"/><circle cx="220" cy="420" r="7" fill="${C.shoe}" stroke="${C.line}" stroke-width="3"/>
      ${arm(P.L, "armL")}${arm(P.R, "armR")}
      <!-- head -->
      <g id="head">
        <ellipse cx="88" cy="232" rx="22" ry="28" fill="${C.skin}" stroke="${C.line}" stroke-width="6"/>
        <ellipse cx="312" cy="232" rx="22" ry="28" fill="${C.skin}" stroke="${C.line}" stroke-width="6"/>
        ${curls(true)}
        <ellipse cx="200" cy="222" rx="112" ry="120" fill="${C.skin}" stroke="${C.line}" stroke-width="6"/>
        ${curls(false)}
        <path d="M92,190 Q120,150 200,146 Q280,150 308,190 Q290,168 200,166 Q110,168 92,190 Z" fill="${C.hair}"/>
        ${eye(160, face)}${eye(240, face)}
        <path d="M134,266 Q160,276 186,266 M214,266 Q240,276 266,266" fill="none" stroke="${C.bag}" stroke-width="4" stroke-linecap="round"/>
        ${brows(face)}
        <path d="M197,240 Q188,264 204,268" fill="none" stroke="${C.line}" stroke-width="5" stroke-linecap="round"/>
        ${mouth(face)}
        ${face === "worried" || face === "shock" ? `<path d="M300,150 Q312,170 300,182 Q288,170 300,150 Z" fill="#7fd3ff" stroke="${C.line}" stroke-width="4"/>` : ""}
      </g>
    </svg>`;
  }

  /* ---------- scenes (each returns SVG markup for 1080x1920) ---------- */
  const T = (x, y, s, txt, o = {}) => `<text x="${x}" y="${y}" font-size="${s}" text-anchor="${o.a || "middle"}" fill="${o.f || "#fff"}" font-family="${o.ff || "Luckiest Guy"}" ${o.w ? `font-weight="${o.w}"` : ""} ${o.ls ? `letter-spacing="${o.ls}"` : ""} ${o.st ? `stroke="${o.st}" stroke-width="${o.sw || 10}" paint-order="stroke" stroke-linejoin="round"` : ""} ${o.tr ? `transform="${o.tr}"` : ""}>${esc(txt)}</text>`;

  function room() {
    let s = `<rect width="${W}" height="1420" fill="${C.wall}"/>`;
    for (let x = 30; x < W; x += 90) s += `<rect x="${x}" y="0" width="44" height="1420" fill="#363a76"/>`;
    s += `<rect x="0" y="1380" width="${W}" height="60" fill="#2e3266"/>`;
    // window with the city at night
    s += `<rect x="650" y="360" width="340" height="430" rx="10" fill="#151b3e" stroke="#20223f" stroke-width="16"/>
      <circle cx="920" cy="440" r="34" fill="#f6efc9"/>
      <path d="M660,790 L660,640 L720,640 L720,600 L780,600 L780,680 L830,680 L830,560 L890,560 L890,650 L950,650 L950,610 L980,610 L980,790 Z" fill="#0d1230"/>`;
    for (const [x, y] of [[680, 660], [700, 700], [740, 620], [760, 720], [850, 590], [860, 640], [870, 700], [905, 680], [960, 640], [800, 710]])
      s += `<rect x="${x}" y="${y}" width="12" height="16" fill="#ffd96b"/>`;
    s += `<path d="M820,360 L820,790 M650,575 L990,575" stroke="#20223f" stroke-width="12"/>`;
    // poster: the crypto dream
    s += `<g transform="rotate(-5 205 580)"><rect x="90" y="400" width="230" height="330" rx="6" fill="${C.gold}" stroke="${C.line}" stroke-width="7"/>
      <path d="M205,450 L240,560 L170,560 Z" fill="${C.red}" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/>
      <rect x="185" y="560" width="40" height="34" fill="#fff" stroke="${C.line}" stroke-width="6"/>
      ${T(205, 665, 44, "TO THE", { f: C.line })}${T(205, 712, 44, "MOON", { f: C.line })}</g>`;
    // floor
    s += `<rect x="0" y="1420" width="${W}" height="500" fill="#6d4c36"/>`;
    for (let y = 1480; y < H; y += 70) s += `<path d="M0,${y} L${W},${y}" stroke="#5d3f2c" stroke-width="5"/>`;
    // bed and clutter
    s += `<rect x="-40" y="1030" width="70" height="420" rx="14" fill="#5b3a2a" stroke="${C.line}" stroke-width="7"/>
      <rect x="-40" y="1200" width="320" height="240" rx="26" fill="#7a86c9" stroke="${C.line}" stroke-width="7"/>
      <path d="M-30,1270 Q120,1240 270,1290" fill="none" stroke="#5f6aa8" stroke-width="7"/>
      <rect x="30" y="1150" width="150" height="80" rx="30" fill="#e9e6f5" stroke="${C.line}" stroke-width="7"/>
      <rect x="-20" y="1430" width="290" height="40" fill="#4a3226"/>
      ${[[860, 1560, -8], [960, 1660, 10]].map(([x, y, r]) => `<g transform="rotate(${r} ${x} ${y})"><path d="M${x - 55},${y - 50} L${x + 55},${y - 50} L${x + 40},${y + 45} L${x - 40},${y + 45} Z" fill="#fff" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/><path d="M${x - 50},${y - 20} L${x + 50},${y - 20}" stroke="${C.red}" stroke-width="14"/><path d="M${x - 25},${y - 50} Q${x},${y - 95} ${x + 25},${y - 50}" fill="none" stroke="${C.line}" stroke-width="6"/></g>`).join("")}
      <rect x="40" y="1600" width="200" height="110" rx="8" fill="#e8783c" stroke="${C.line}" stroke-width="6"/><path d="M40,1630 L240,1630" stroke="${C.line}" stroke-width="5"/>`;
    return s;
  }
  const bg = (c1, c2) => `<defs><radialGradient id="g" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>`;

  function bank(b) {
    const rows = [["Takeaway", "-£23.40"], ["Pay later", "-£30.00"], ["Streaming", "-£10.99"], ["Takeaway", "-£18.75"], ["Takeaway", "-£16.20"]];
    let s = bg("#2b3a6b", "#141b33");
    s += `<g class="pop"><rect x="250" y="300" width="580" height="1080" rx="80" fill="#0e0f14" stroke="${C.line}" stroke-width="8"/>
      <rect x="278" y="340" width="524" height="1000" rx="52" fill="#f5f6fb"/>
      <rect x="470" y="356" width="140" height="22" rx="11" fill="#0e0f14"/>
      ${T(540, 470, 34, "CURRENT ACCOUNT", { f: "#7b8094", ff: "Nunito", w: 900, ls: 3 })}
      ${T(540, 640, 170, b.balance || "£0.00", { f: C.red })}
      ${T(540, 700, 32, "Available balance", { f: "#7b8094", ff: "Nunito", w: 800 })}
      <path d="M320,760 L760,760" stroke="#dfe2ec" stroke-width="4"/>`;
    rows.forEach(([a, v], i) => {
      const y = 840 + i * 92;
      s += `<circle cx="350" cy="${y - 12}" r="26" fill="#e3e6f0"/>${T(395, y, 38, a, { a: "start", f: "#22252f", ff: "Nunito", w: 800 })}${T(760, y, 38, v, { a: "end", f: "#22252f", ff: "Nunito", w: 900 })}`;
    });
    return s + `</g>`;
  }
  function calendar(b) {
    return bg("#3a2a62", "#1a1430") + `<g class="pop"><rect x="270" y="380" width="540" height="620" rx="34" fill="#fff" stroke="${C.line}" stroke-width="9"/>
      <path d="M270,414 Q270,380 304,380 L776,380 Q810,380 810,414 L810,540 L270,540 Z" fill="${C.red}" stroke="${C.line}" stroke-width="9"/>
      <rect x="360" y="340" width="34" height="90" rx="17" fill="#d9d9e3" stroke="${C.line}" stroke-width="7"/><rect x="686" y="340" width="34" height="90" rx="17" fill="#d9d9e3" stroke="${C.line}" stroke-width="7"/>
      ${T(540, 494, 70, b.month || "", {})}${T(540, 900, 330, b.date || "", { f: "#15151c" })}</g>
      ${T(540, 1160, 64, b.sub || "", { f: C.gold, st: C.line, sw: 12 })}`;
  }
  function receipt(b) {
    const n = (b.lines || []).length;
    const h = 210 + Math.max(1, n) * 120;
    let s = bg("#7a1f2b", "#3a0d14") + `<g class="pop"><path d="M250,300 L830,300 L830,${300 + h} ${Array.from({ length: 12 }, (_, i) => `L${830 - (i + 0.5) * 48.33},${300 + h + (i % 2 ? 0 : 26)}`).join(" ")} L250,${300 + h} Z" fill="#fbfaf5" stroke="${C.line}" stroke-width="8" stroke-linejoin="round"/>
      ${T(540, 400, 60, "THIS MONTH", { f: "#22252f" })}<path d="M300,440 L780,440" stroke="#22252f" stroke-width="5" stroke-dasharray="14 10"/>`;
    (b.lines || []).forEach(([a, v], i) => {
      const y = 540 + i * 120, last = i === n - 1;
      s += `<g class="${last ? "line-new" : ""}">${T(300, y, 52, a, { a: "start", f: "#22252f", ff: "Nunito", w: 900 })}${T(780, y, 60, v, { a: "end", f: C.red })}</g>`;
    });
    if (!n) s += T(540, 560, 120, "?", { f: "#c9c4b8" });
    return s + `</g>`;
  }
  function subs() {
    const names = ["FLIXO", "STREAMLY", "VIDZ+", "WATCHR", "BINGEBOX", "TUBE PRO"];
    const cols = ["#e94560", "#3c6df0", "#9b51e0", "#f2994a", "#27ae60", "#56ccf2"];
    let s = bg("#253055", "#10162b");
    names.forEach((nm, i) => {
      const x = 130 + (i % 2) * 430, y = 330 + Math.floor(i / 2) * 330;
      s += `<g class="tile" data-i="${i}" style="transform-origin:${x + 175}px ${y + 120}px"><rect x="${x}" y="${y}" width="350" height="240" rx="30" fill="${cols[i]}" stroke="${C.line}" stroke-width="8"/>
        <path d="M${x + 150},${y + 70} L${x + 215},${y + 115} L${x + 150},${y + 160} Z" fill="#fff" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/>
        ${T(x + 175, y + 222, 34, nm, { st: C.line, sw: 8 })}
        ${i === 0 ? `<g class="mark">${T(x + 175, y + 40, 40, "WATCHES THIS", { f: C.green, st: C.line, sw: 9 })}</g>` : `<g class="mark"><rect x="${x + 10}" y="${y + 70}" width="330" height="90" rx="10" fill="none" stroke="${C.red}" stroke-width="8" transform="rotate(-8 ${x + 175} ${y + 115})"/>${T(x + 175, y + 135, 54, "NEVER", { f: C.red, tr: `rotate(-8 ${x + 175} ${y + 115})`, st: "#fff", sw: 6 })}</g>`}</g>`;
    });
    return s;
  }
  function card(b) {
    return bg("#1d1d24", "#050507") + `<g class="pop"><rect x="170" y="440" width="740" height="460" rx="40" fill="#24242c" stroke="${C.line}" stroke-width="9"/>
      <rect x="170" y="440" width="740" height="460" rx="40" fill="url(#shine)"/>
      <defs><linearGradient id="shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3a46"/><stop offset="1" stop-color="#121216"/></linearGradient></defs>
      <rect x="240" y="560" width="120" height="90" rx="14" fill="#d7b46a" stroke="${C.line}" stroke-width="6"/>
      <path d="M240,605 L360,605 M300,560 L300,650" stroke="#a8873f" stroke-width="5"/>
      ${T(240, 760, 54, "•••• •••• •••• 4412", { a: "start", f: "#d9d6cf", ff: "Nunito", w: 800, ls: 4 })}
      ${T(240, 850, 40, "THEO M.", { a: "start", f: "#d9d6cf", ff: "Nunito", w: 900, ls: 4 })}
      ${T(850, 530, 44, "CREDIT", { a: "end", f: "#d7b46a", ff: "Nunito", w: 900, ls: 6 })}</g>
      ${T(540, 1110, 150, b.owed || "", { f: C.red, st: C.line, sw: 14 })}
      <g class="stamp" style="transform-origin:540px 1240px">${T(540, 1270, 80, b.apr || "", { f: C.gold, st: C.line, sw: 12 })}</g>`;
  }
  function stat(b) {
    const c = { red: ["#c0303c", "#5e1018"], navy: ["#2a3870", "#0f1530"], green: ["#1f8f5a", "#0b3d25"] }[b.bg || "navy"];
    return bg(c[0], c[1]) + `<g class="pop">${T(540, 860, b.big && b.big.length > 5 ? 190 : 260, b.big || "", { st: C.line, sw: 18 })}</g>
      ${T(540, 990, 60, b.small || "", { f: C.gold, st: C.line, sw: 12 })}`;
  }
  function crypto(b) {
    const pts = [[170, 520], [260, 470], [340, 560], [420, 520], [500, 660], [580, 620], [660, 780], [740, 740], [820, 930], [900, 1010]];
    return bg("#1a1d2b", "#08090f") + `<g>
      <path d="M150,380 L150,1080 L940,1080" fill="none" stroke="#3a3f55" stroke-width="6"/>
      ${[500, 640, 780, 920].map((y) => `<path d="M150,${y} L940,${y}" stroke="#23273a" stroke-width="3"/>`).join("")}
      <path class="drawline" d="M${pts.join(" L")}" fill="none" stroke="${C.red}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
      <g class="pop"><circle cx="540" cy="330" r="80" fill="${C.gold}" stroke="${C.line}" stroke-width="8"/>${T(540, 352, 60, "COIN", { f: C.line })}</g>
      <g class="stamp" style="transform-origin:800px 470px">${T(800, 500, 130, b.change || "", { f: C.red, st: C.line, sw: 14 })}</g></g>`;
  }
  function vote(b) {
    const wrap = (s, n = 16) => { const w = String(s).split(" "); const out = [""]; w.forEach((x) => { if ((out[out.length - 1] + " " + x).trim().length > n) out.push(x); else out[out.length - 1] = (out[out.length - 1] + " " + x).trim(); }); return out; };
    const box = (y, letter, text, col) => `<g class="opt" style="transform-origin:540px ${y + 140}px"><rect x="110" y="${y}" width="860" height="280" rx="34" fill="#20263f" stroke="${col}" stroke-width="10"/>
      <circle cx="230" cy="${y + 140}" r="80" fill="${col}" stroke="${C.line}" stroke-width="8"/>${T(230, y + 172, 96, letter, { f: C.line })}
      ${wrap(text).map((l, i, a) => T(620, y + 150 + (i - (a.length - 1) / 2) * 66, 56, l, { ff: "Nunito", w: 900 })).join("")}</g>`;
    return bg("#26305a", "#0d1124") + `${T(540, 470, 84, b.q || "YOU DECIDE", { f: C.gold, st: C.line, sw: 12 })}
      ${box(580, "A", b.a || "", C.green)}${box(930, "B", b.b || "", "#ff7ab6")}`;
  }
  function end(b, ep) {
    return `<rect width="${W}" height="${H}" fill="#050505"/><path d="M90,1330 L990,1330" stroke="#c8a96a" stroke-width="3"/>
      ${T(540, 1150, 130, "FIX THEO", { f: C.gold, st: "#000", sw: 4 })}
      ${T(540, 1250, 50, `DAY ${ep.day + 1} TOMORROW`, { ff: "Nunito", w: 900, ls: 6 })}
      ${T(540, 1430, 44, "LEDGE · DESK", { f: "#c8a96a", ff: "Nunito", w: 900, ls: 14 })}
      ${T(540, 1490, 34, "ledgedesk.com", { f: "#8f8a80", ff: "Nunito", w: 800, ls: 2 })}`;
  }
  const SCENES = { room, bank, calendar, receipt, subs, card, stat, crypto, vote, end };

  /* ---------- HUD, stamp, caption ---------- */
  function hud(ep) {
    return `<g><rect x="36" y="96" width="180" height="120" rx="20" fill="#1c2033" stroke="#3b4266" stroke-width="5"/>
      ${T(126, 136, 26, "DAY", { f: "#aab1d6", ff: "Nunito", w: 900, ls: 3 })}${T(126, 198, 60, `${ep.day}/${ep.of}`, {})}
      <rect x="232" y="96" width="250" height="120" rx="20" fill="#1c2033" stroke="#3b4266" stroke-width="5"/>
      ${T(357, 136, 26, "MONEY SCORE", { f: "#aab1d6", ff: "Nunito", w: 900, ls: 3 })}${T(310, 196, 56, `${ep.score}%`, { a: "start", f: C.green })}
      <rect x="252" y="160" width="46" height="14" rx="7" fill="#2e3452"/><rect x="252" y="160" width="${Math.max(6, 46 * ep.score / 100)}" height="14" rx="7" fill="${C.green}"/>
      ${T(1040, 140, 30, "LEDGE · DESK", { a: "end", f: "#c8a96a", ff: "Nunito", w: 900, ls: 8, st: "#000", sw: 6 })}</g>`;
  }
  const stampSVG = (txt) => `<g class="bigstamp" style="transform-origin:540px 1300px"><g transform="rotate(-8 540 1300)">
      <rect x="${540 - txt.length * 30 - 40}" y="1230" width="${txt.length * 60 + 80}" height="140" rx="14" fill="rgba(255,255,255,.9)" stroke="${C.red}" stroke-width="12"/>
      ${T(540, 1340, 100, txt, { f: C.red })}</g></g>`;

  function capHTML(chunk, tone) {
    const hi = tone === "red" ? C.red : C.gold;
    return esc(chunk).replace(/\*([^*]+)\*/g, `<span style="color:${hi}">$1</span>`);
  }

  /* ---------- timeline ---------- */
  let EP = null, TL = null, cur = -1, els = {};
  window.setup = (ep, tl) => { EP = ep; TL = tl; };
  const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  const back = (x) => { x = Math.min(1, Math.max(0, x)); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

  function build(i) {
    const b = EP.beats[i];
    const stage = document.getElementById("stage");
    const scene = (SCENES[b.scene] || room)(b, EP);
    const withTheo = b.scene === "room" || b.scene === "end";
    stage.innerHTML = `<div id="punch" style="position:absolute;inset:0;transform-origin:50% 45%">
        <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0">${scene}</svg>
        ${withTheo ? `<div id="theo" style="position:absolute;left:270px;top:${b.scene === "end" ? -100 : 420}px;transform-origin:50% 100%;${b.scene === "end" ? "transform:scale(.6)" : ""}">${theo({ face: b.face || (b.scene === "end" ? "happy" : "neutral"), pose: b.pose || (b.scene === "end" ? "wave" : "idle") })}</div>` : ""}
        ${b.stamp ? `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0">${stampSVG(b.stamp)}</svg>` : ""}
      </div>
      ${b.scene === "end" ? "" : `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0">${hud(EP)}</svg>`}
      <div id="cap" style="position:absolute;left:40px;right:40px;top:${b.scene === "end" ? 1580 : withTheo ? 980 : 1440}px;text-align:center"></div>`;
    els = {
      punch: document.getElementById("punch"), theo: document.getElementById("theo"), cap: document.getElementById("cap"),
      eyes: [...stage.querySelectorAll(".eye")], armR: stage.querySelector("#armR"), pops: [...stage.querySelectorAll(".pop")],
      stamp: stage.querySelector(".bigstamp"), smallStamps: [...stage.querySelectorAll(".stamp")], tiles: [...stage.querySelectorAll(".tile")],
      line: stage.querySelector(".drawline"), newLine: stage.querySelector(".line-new"), opts: [...stage.querySelectorAll(".opt")], chunk: -1
    };
  }

  window.draw = (t) => {
    let i = TL.beats.findIndex((x) => t >= x.start && t < x.end);
    if (i < 0) i = t < TL.beats[0].start ? 0 : TL.beats.length - 1;
    if (i !== cur) { build(i); cur = i; }
    const B = TL.beats[i], b = EP.beats[i], lt = t - B.start, D = B.end - B.start;
    els.punch.style.transform = `scale(${1.07 - 0.07 * ease(lt / 0.28)})`;
    if (els.theo) {
      const base = b.scene === "end" ? "scale(.6) " : "";
      els.theo.style.transform = `${base}translateY(${Math.sin(t * 2.4) * 6}px)`;
      const blink = (t % 3.3) < 0.12;
      els.eyes.forEach((e) => (e.style.transform = blink ? "scaleY(.08)" : ""));
      if (els.armR && (b.pose === "wave" || (b.scene === "end"))) els.armR.setAttribute("transform", `rotate(${Math.sin(t * 9) * 9} 272 362)`);
    }
    els.pops.forEach((p) => { p.style.transformOrigin = "540px 800px"; p.style.transform = `scale(${0.6 + 0.4 * back(lt / 0.35)})`; p.style.opacity = Math.min(1, lt / 0.12); });
    if (els.stamp) { const a = Math.min(1, Math.max(0, (lt - 0.25) / 0.18)); els.stamp.style.opacity = a; els.stamp.style.transform = `scale(${2.2 - 1.2 * ease(a)})`; }
    els.smallStamps.forEach((s) => { const a = Math.min(1, Math.max(0, (lt - D * 0.45) / 0.18)); s.style.opacity = a; s.style.transform = `scale(${2 - ease(a)})`; });
    els.tiles.forEach((tile, k) => { const a = (lt - 0.15 - k * 0.12) / 0.3; tile.style.opacity = Math.min(1, Math.max(0, a * 2)); tile.style.transform = `scale(${0.5 + 0.5 * back(a)})`;
      const m = tile.querySelector(".mark"); const mk = (lt - D * 0.45 - k * 0.14) / 0.15; if (m) { m.style.opacity = Math.min(1, Math.max(0, mk)); } });
    if (els.line) els.line.setAttribute("stroke-dashoffset", String(1 - ease((lt - 0.3) / Math.max(0.8, D * 0.6))));
    if (els.newLine) { const a = (lt - 0.2) / 0.3; els.newLine.style.opacity = Math.min(1, Math.max(0, a)); els.newLine.setAttribute("transform", `translate(${60 * (1 - ease(a))} 0)`); }
    els.opts.forEach((o, k) => { const a = (lt - 0.6 - k * 1.1) / 0.3; o.style.opacity = Math.min(1, Math.max(0, a * 1.5)); o.style.transform = `scale(${0.7 + 0.3 * back(a)})`; });
    // caption: one chunk at a time, popping in
    let c = -1;
    B.chunks.forEach((ch, k) => { if (t >= ch.t) c = k; });
    if (c !== els.chunk) { els.chunk = c; els.cap.innerHTML = c >= 0 ? `<span class="cap">${capHTML(B.chunks[c].text, b.tone)}</span>` : ""; }
    if (c >= 0) { const a = (t - B.chunks[c].t) / 0.13; const sp = els.cap.firstChild; if (sp) sp.style.transform = `scale(${1.32 - 0.32 * ease(a)})`; }
  };
})();
