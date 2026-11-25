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
  // Looks: Theo (curls, green hoodie) and Maya (long hair, mustard sweater).
  const LOOKS = {
    theo: { skin: "#c68863", skinD: "#a86c4b", bag: "#8c5a3e", hair: "#23202b", top: "#2a9d68", topD: "#1f7a50", jean: "#3f5d8f", jeanD: "#324a73", style: "curls" },
    maya: { skin: "#e2b08a", skinD: "#c48f69", bag: "#c9926c", hair: "#3b2418", top: "#e0a526", topD: "#b98318", jean: "#2b2a33", jeanD: "#1d1c24", style: "long" },
    // Dev (25 Nov): Theo's roommate. Buzz cut under a backwards red cap, orange tee, grey joggers.
    dev: { skin: "#8a5a3c", skinD: "#6e452c", bag: "#6e452c", hair: "#141217", top: "#ee7a2f", topD: "#c45f1c", jean: "#6c7080", jeanD: "#555867", style: "cap" }
  };
  let L = LOOKS.theo;
  function arm(pts, id) {
    const d = `M${pts[0]} L${pts[1]} L${pts[2]}`;
    const [hx, hy] = pts[2];
    return `<g id="${id}">
      <path d="${d}" fill="none" stroke="${C.line}" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="${L.top}" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${hx}" cy="${hy}" r="25" fill="${L.skin}" stroke="${C.line}" stroke-width="6"/></g>`;
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
      s += `<path d="M${cx - rx},${cy + (face === "smug" ? 2 : -6)} A${rx},${ry} 0 0 1 ${cx + rx},${cy + (face === "smug" ? 2 : -6)} Z" fill="${L.skin}" stroke="${C.line}" stroke-width="5"/>`;
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
    return b.map(([a, c, d, e]) => `<path d="M${a},${c} L${d},${e}" stroke="${L.hair}" stroke-width="13" stroke-linecap="round"/>`).join("");
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
  function theo(o = {}) { return person(o, "theo"); }
  function maya(o = {}) { return person(o, "maya"); }
  function dev(o = {}) { return person(o, "dev"); }
  function person({ face = "neutral", pose = "idle" } = {}, who = "theo") {
    L = LOOKS[who];
    const P = POSES[pose] || POSES.idle;
    const isMaya = who === "maya", isDev = who === "dev";
    const curls = (stroke) => CURLS.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${L.hair}"${stroke ? ` stroke="${C.line}" stroke-width="12"` : ""}/>`).join("");
    return `<svg viewBox="0 0 400 820" width="540" height="1107" overflow="visible">
      <!-- legs and shoes -->
      <path d="M120,566 L192,566 L188,748 L132,748 Z" fill="${L.jean}" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M208,566 L280,566 L268,748 L212,748 Z" fill="${L.jean}" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M160,600 L158,740 M240,600 L242,740" stroke="${L.jeanD}" stroke-width="4"/>
      <path d="M118,742 L190,742 L192,770 Q192,786 176,786 L102,786 Q88,786 94,770 Z" fill="${C.shoe}" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M210,742 L282,742 L306,770 Q312,786 296,786 L222,786 Q208,786 208,770 Z" fill="${C.shoe}" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M96,774 L190,774 M210,774 L306,774" stroke="${C.sole}" stroke-width="6"/>
      <path d="M140,756 L176,756 M228,756 L268,756" stroke="${isMaya ? "#ff7ab6" : C.gold}" stroke-width="7" stroke-linecap="round"/>
      <!-- body -->
      <rect x="178" y="318" width="44" height="40" fill="${L.skinD}" stroke="${C.line}" stroke-width="6"/>
      ${isMaya || isDev ? "" : `<ellipse cx="200" cy="350" rx="96" ry="30" fill="${L.topD}" stroke="${C.line}" stroke-width="6"/>`}
      <path d="M110,368 Q112,344 152,338 L248,338 Q288,344 290,368 L300,560 Q300,578 284,578 L116,578 Q100,578 100,560 Z" fill="${L.top}" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/>
      ${isDev ? `<path d="M168,340 Q200,370 232,340" fill="none" stroke="${C.line}" stroke-width="6"/>${T(200, 470, 64, "24", { f: "#fff", st: C.line, sw: 8 })}` : isMaya ? `<path d="M168,340 Q200,372 232,340" fill="none" stroke="${C.line}" stroke-width="6"/><path d="M110,540 L290,540" stroke="${L.topD}" stroke-width="16"/><path d="M130,420 L150,400 L170,420 L190,400 L210,420 L230,400 L250,420 L270,400" fill="none" stroke="${L.topD}" stroke-width="6"/>` : `<path d="M140,482 L260,482 L270,544 L130,544 Z" fill="${L.topD}" stroke="${C.line}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M184,350 L180,416 M216,350 L220,416" stroke="${C.shoe}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="180" cy="420" r="7" fill="${C.shoe}" stroke="${C.line}" stroke-width="3"/><circle cx="220" cy="420" r="7" fill="${C.shoe}" stroke="${C.line}" stroke-width="3"/>`}
      ${arm(P.L, "armL")}${arm(P.R, "armR")}
      <!-- head -->
      <g id="head">
        ${isMaya ? `<path d="M74,230 Q60,90 200,82 Q340,90 326,230 L338,420 Q300,446 262,430 L262,300 L138,300 L138,430 Q100,446 62,420 Z" fill="${L.hair}" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/>` : ""}
        <ellipse cx="88" cy="232" rx="22" ry="28" fill="${L.skin}" stroke="${C.line}" stroke-width="6"/>
        <ellipse cx="312" cy="232" rx="22" ry="28" fill="${L.skin}" stroke="${C.line}" stroke-width="6"/>
        ${isMaya ? `<circle cx="88" cy="266" r="8" fill="${C.gold}" stroke="${C.line}" stroke-width="3"/><circle cx="312" cy="266" r="8" fill="${C.gold}" stroke="${C.line}" stroke-width="3"/>` : isDev ? "" : curls(true)}
        <ellipse cx="200" cy="222" rx="112" ry="120" fill="${L.skin}" stroke="${C.line}" stroke-width="6"/>
        ${isMaya ? `<path d="M86,212 Q92,104 200,98 Q308,104 314,212 Q292,150 238,140 Q210,176 150,176 Q110,170 86,212 Z" fill="${L.hair}" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/>` : isDev ? `<path d="M90,200 Q92,104 200,100 Q308,104 310,200 Q300,150 200,146 Q100,150 90,200 Z" fill="#c8202f" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/><path d="M96,176 Q40,170 22,196 Q60,206 104,196 Z" fill="#a0141f" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/><rect x="186" y="128" width="28" height="18" rx="6" fill="#fff" stroke="${C.line}" stroke-width="4"/>` : curls(false)}
        ${isMaya || isDev ? "" : `<path d="M92,190 Q120,150 200,146 Q280,150 308,190 Q290,168 200,166 Q110,168 92,190 Z" fill="${L.hair}"/>`}
        ${eye(160, face)}${eye(240, face)}
        ${isMaya ? `<path d="M128,206 L120,198 M134,200 L130,190 M272,206 L280,198 M266,200 L270,190" stroke="${C.line}" stroke-width="5" stroke-linecap="round"/>` : ""}
        <path d="M134,266 Q160,276 186,266 M214,266 Q240,276 266,266" fill="none" stroke="${L.bag}" stroke-width="4" stroke-linecap="round"/>
        ${brows(face)}
        <path d="M197,240 Q188,264 204,268" fill="none" stroke="${C.line}" stroke-width="5" stroke-linecap="round"/>
        <g class="mc">${mouth(face)}</g><g class="mo" style="display:none"><path d="M168,294 Q200,288 232,294 Q228,336 200,338 Q172,336 168,294 Z" fill="${C.mouth}" stroke="${C.line}" stroke-width="5" stroke-linejoin="round"/><path d="M178,298 L222,298 Q220,306 200,307 Q180,306 178,298 Z" fill="#fff"/><ellipse cx="200" cy="326" rx="14" ry="6" fill="#d9536a"/></g>
        ${face === "worried" || face === "shock" ? `<path d="M300,150 Q312,170 300,182 Q288,170 300,150 Z" fill="#7fd3ff" stroke="${C.line}" stroke-width="4"/>` : ""}
      </g>
    </svg>`;
  }

  /* ---------- scenes (each returns SVG markup for 1080x1920) ---------- */
  const T = (x, y, s, txt, o = {}) => `<text x="${x}" y="${y}" font-size="${s}" text-anchor="${o.a || "middle"}" fill="${o.f || "#fff"}" font-family="${o.ff || (document.body.classList.contains("sketch") ? "Permanent Marker" : "Luckiest Guy")}" ${o.w ? `font-weight="${o.w}"` : ""} ${o.ls ? `letter-spacing="${o.ls}"` : ""} ${o.st ? `stroke="${o.st}" stroke-width="${o.sw || 10}" paint-order="stroke" stroke-linejoin="round"` : ""} ${o.tr ? `transform="${o.tr}"` : ""}>${esc(txt)}</text>`;

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

  function bank(b, ep) {
    const c = ep.cur || "£", food = ep.food || "Takeaway";
    const rows = [[food, `-${c}23.40`], ["Pay later", `-${c}40.00`], ["Streaming", `-${c}10.99`], [food, `-${c}18.75`], [food, `-${c}16.20`]];
    let s = bg("#2b3a6b", "#141b33");
    s += `<g class="pop"><rect x="250" y="300" width="580" height="1080" rx="80" fill="#0e0f14" stroke="${C.line}" stroke-width="8"/>
      <rect x="278" y="340" width="524" height="1000" rx="52" fill="#f5f6fb"/>
      <rect x="470" y="356" width="140" height="22" rx="11" fill="#0e0f14"/>
      ${T(540, 470, 34, "CURRENT ACCOUNT", { f: "#7b8094", ff: "Nunito", w: 900, ls: 3 })}
      ${T(540, 640, 170, b.balance || "0.00", { f: C.red })}
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
      ${T(540, 400, 60, b.title || "THE MATH", { f: "#22252f" })}<path d="M300,440 L780,440" stroke="#22252f" stroke-width="5" stroke-dasharray="14 10"/>`;
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
    // Sized to fit the 1080px frame: Luckiest Guy averages about 0.62em a character.
    const fit = (txt, max, room = 980) => Math.max(40, Math.min(max, Math.floor(room / (0.62 * Math.max(1, String(txt || "").length)))));
    return bg(c[0], c[1]) + `<g class="pop">${T(540, 860, fit(b.big, 260), b.big || "", { st: C.line, sw: 18 })}</g>
      ${T(540, 990, fit(b.small, 60), b.small || "", { f: C.gold, st: C.line, sw: 12 })}`;
  }
  // The figure for a stat line in 3D: a heavy banner across the top of the shot.
  function statBanner(b) {
    const col = { red: "#c8202f", navy: "#22306a", green: "#16804f" }[b.bg || "navy"];
    const fit = (txt, max, room = 900) => Math.max(40, Math.min(max, Math.floor(room / (0.62 * Math.max(1, String(txt || "").length)))));
    return `<g transform="rotate(-3 540 420)"><rect x="70" y="270" width="940" height="330" rx="18" fill="${col}" stroke="#14131b" stroke-width="10"/>
      ${T(540, 470, fit(b.big, 190), b.big || "", { st: "#14131b", sw: 16 })}${T(540, 560, fit(b.small, 54, 860), b.small || "", { f: C.gold, st: "#14131b", sw: 10 })}</g>`;
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
      ${T(540, 1150, ep.season === 2 ? 110 : 130, ep.season === 2 ? "THEO & MAYA" : "FIX THEO", { f: C.gold, st: "#000", sw: 4 })}
      ${ep.day + 1 < ep.of
        ? T(540, 1250, 50, `FOLLOW TO VOTE ON DAY ${ep.day + 1}`, { f: C.green, ff: "Nunito", w: 900, ls: 4 })
        : T(540, 1250, 50, ep.day >= ep.of ? "SEASON 2 SOON" : "THE FINALE TOMORROW", { ff: "Nunito", w: 900, ls: 6 })}
      ${T(540, 1430, 44, "LEDGE · DESK", { f: "#c8a96a", ff: "Nunito", w: 900, ls: 14 })}
      ${T(540, 1490, 34, "ledgedesk.com", { f: "#8f8a80", ff: "Nunito", w: 800, ls: 2 })}`;
  }
  // Theo's phone showing Ledge Desk, drawn in the site's Noir look.
  function wrapText(txt, n) { const out = [""]; String(txt).split(" ").forEach((w) => { if ((out[out.length - 1] + " " + w).trim().length > n) out.push(w); else out[out.length - 1] = (out[out.length - 1] + " " + w).trim(); }); return out; }
  function desk(b) {
    const G = "#c8a96a", INK = "#ece7dc", MUTE = "#8f8a80";
    let s = bg("#1a1610", "#050403") + `<g class="pop"><rect x="230" y="260" width="620" height="1140" rx="84" fill="#111" stroke="${C.line}" stroke-width="8"/>
      <rect x="258" y="300" width="564" height="1060" rx="58" fill="#050505"/>
      <rect x="470" y="316" width="140" height="22" rx="11" fill="#111"/>
      ${T(540, 420, 30, "LEDGE · DESK", { f: G, ff: "Nunito", w: 900, ls: 10 })}
      <path d="M300,450 L780,450" stroke="#2a2723" stroke-width="3"/>`;
    const label = (t) => T(300, 520, 26, t, { a: "start", f: MUTE, ff: "Nunito", w: 900, ls: 5 });
    const serif = (x, y, size, t, f = INK, a = "start") => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${a}" fill="${f}" font-family="Cormorant" font-weight="600">${esc(t)}</text>`;
    if (b.screen === "glossary") {
      s += label("GLOSSARY") + serif(300, 640, 104, b.term || "", G) + `<path d="M300,680 L360,680" stroke="${G}" stroke-width="4"/>`;
      wrapText(b.def || "", 26).forEach((l, i) => (s += T(300, 760 + i * 58, 40, l, { a: "start", f: INK, ff: "Nunito", w: 800 })));
    } else if (b.screen === "lesson") {
      s += label("LESSON");
      wrapText(b.title || "", 16).forEach((l, i) => (s += serif(300, 640 + i * 88, 84, l, G)));
      const y0 = 660 + wrapText(b.title || "", 16).length * 88;
      wrapText(b.line || "", 26).forEach((l, i) => (s += T(300, y0 + i * 56, 38, l, { a: "start", f: INK, ff: "Nunito", w: 800 })));
      s += `<rect x="300" y="1180" width="480" height="12" rx="6" fill="#2a2723"/><rect class="grow" x="300" y="1180" width="300" height="12" rx="6" fill="${G}"/>`;
    } else if (b.screen === "calendar") {
      s += label("ECONOMIC CALENDAR") + serif(300, 640, 76, b.title || "", G) + T(300, 700, 36, b.when || "", { a: "start", f: C.green, ff: "Nunito", w: 900, ls: 4 });
      (b.rows || []).forEach(([a, c], i) => { const y = 800 + i * 110; s += `<path d="M300,${y - 50} L780,${y - 50}" stroke="#2a2723" stroke-width="3"/>` + T(300, y, 40, a, { a: "start", f: INK, ff: "Nunito", w: 800 }) + `<rect x="680" y="${y - 36}" width="100" height="46" rx="8" fill="none" stroke="${G}" stroke-width="3"/>` + T(730, y - 2, 28, c, { f: G, ff: "Nunito", w: 900 }); });
    } else if (b.screen === "mood") {
      s += label("MARKET MOOD");
      const cx = 540, cy = 900, r = 210;
      s += `<path d="M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}" fill="none" stroke="#2a2723" stroke-width="26" stroke-linecap="round"/>
        <path d="M${cx - r},${cy} A${r},${r} 0 0 1 ${cx - r * 0.5},${cy - r * 0.866}" fill="none" stroke="${C.red}" stroke-width="26" stroke-linecap="round"/>
        <g class="needle" style="transform-origin:${cx}px ${cy}px"><path d="M${cx},${cy} L${cx - r * 0.82},${cy - 40}" stroke="${INK}" stroke-width="10" stroke-linecap="round"/></g>
        <circle cx="${cx}" cy="${cy}" r="18" fill="${G}"/>` + T(540, 1060, 92, b.word || "", { f: C.red, ff: "Nunito", w: 900, ls: 6 }) + T(540, 1130, 30, "READ OFF THE VIX", { f: MUTE, ff: "Nunito", w: 900, ls: 5 });
    } else if (b.screen === "alert") {
      s += label("ALERTS") + `<rect x="300" y="580" width="480" height="300" rx="20" fill="#0f0e0c" stroke="${G}" stroke-width="3"/>` +
        serif(330, 680, 64, b.title || "", G) + wrapText(b.detail || "", 24).map((l, i) => T(330, 750 + i * 44, 32, l, { a: "start", f: INK, ff: "Nunito", w: 800 })).join("") +
        `<rect x="640" y="800" width="110" height="56" rx="28" fill="${C.green}"/><circle cx="722" cy="828" r="22" fill="#fff"/>` + T(330, 840, 28, "ON", { a: "start", f: C.green, ff: "Nunito", w: 900, ls: 4 });
    } else if (b.screen === "watchlist") {
      s += label("WATCHLIST");
      (b.rows || []).forEach(([a, n], i) => { const y = 640 + i * 140; s += `<path d="M300,${y - 70} L780,${y - 70}" stroke="#2a2723" stroke-width="3"/>` + serif(300, y, 58, a, INK) + T(300, y + 46, 30, n, { a: "start", f: MUTE, ff: "Nunito", w: 800 }) +
        `<path d="M600,${y} l30,-14 l30,10 l30,-26 l30,6 l40,-20" fill="none" stroke="${C.green}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`; });
    }
    return s + `</g>`;
  }
  const SCENES = { room, bank, calendar, receipt, subs, card, stat, crypto, vote, end, desk, couple: room, maya: room, dev: room };

  /* ---------- HUD, stamp, caption ---------- */
  function hud(ep) {
    return `<g><rect x="36" y="96" width="180" height="120" rx="20" fill="#1c2033" stroke="#3b4266" stroke-width="5"/>
      ${T(126, 136, 26, ep.season === 2 ? "S2 · DAY" : "DAY", { f: "#aab1d6", ff: "Nunito", w: 900, ls: 3 })}${T(126, 198, 60, `${ep.day}/${ep.of}`, {})}
      <rect x="232" y="96" width="250" height="120" rx="20" fill="#1c2033" stroke="#3b4266" stroke-width="5"/>
      ${T(357, 136, 26, "MONEY SCORE", { f: "#aab1d6", ff: "Nunito", w: 900, ls: 3 })}${T(310, 196, 56, `${ep.score}%`, { a: "start", f: C.green })}
      <rect x="252" y="160" width="46" height="14" rx="7" fill="#2e3452"/><rect x="252" y="160" width="${Math.max(6, 46 * ep.score / 100)}" height="14" rx="7" fill="${C.green}"/>
      ${T(1040, 140, 30, "LEDGE · DESK", { a: "end", f: "#c8a96a", ff: "Nunito", w: 900, ls: 8, st: "#000", sw: 6 })}</g>`;
  }
  // In 3D the caption sits low, so the stamp goes up by the head instead.
  const stampSVG = (txt, y = 1300) => `<g class="bigstamp" style="transform-origin:540px ${y}px"><g transform="rotate(-8 540 ${y})">
      <rect x="${540 - txt.length * 30 - 40}" y="${y - 70}" width="${txt.length * 60 + 80}" height="140" rx="14" fill="rgba(255,255,255,.9)" stroke="${C.red}" stroke-width="12"/>
      ${T(540, y + 40, 100, txt, { f: C.red })}</g></g>`;

  function capHTML(chunk, tone) {
    const hi = tone === "red" ? C.red : C.gold;
    return document.body.classList.contains("sketch") ? esc(chunk).replace(/\*([^*]+)\*/g, `<span class="hi">$1</span>`) : esc(chunk).replace(/\*([^*]+)\*/g, `<span style="color:${hi}">$1</span>`);
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
    let cast = b.scene === "couple" || (b.scene === "end" && EP.season === 2) ? ["theo", "maya"] : b.scene === "dev" ? ["theo", "dev"] : b.scene === "maya" ? ["maya"] : (b.scene === "room" || b.scene === "end") ? ["theo"] : [];
    // 3D: a figure line keeps the people on screen, with the number floating above them (25 Nov).
    const statUp = !!window.World && b.scene === "stat";
    if (statUp) cast = b.who === "dev" ? ["theo", "dev"] : b.who === "maya" || (EP.season === 2 && b.who !== "theo") ? ["theo", "maya"] : ["theo"];
    const withTheo = cast.length > 0;
    // 3D (25 Nov): people and the room are drawn by kit3d.js on the canvas underneath; the SVG layer keeps cards, stamps, HUD and captions.
    const td = !!window.World && cast.length > 0 && b.scene !== "end";
    if (window.World) { document.getElementById("gl").style.visibility = td ? "visible" : "hidden"; if (td) window.World.set(b, cast); }
    const place = (who, i) => {
      const end = b.scene === "end", duo = cast.length === 2;
      const left = end && duo ? (i ? 400 : 140) : duo ? (i ? 520 : 30) : 270, top = end ? -100 : duo ? 560 : 420, sc = end ? 0.6 : duo ? 0.8 : 1;
      const o = who !== "theo" ? { face: b.mface || b.face || "neutral", pose: b.mpose || (duo ? "idle" : b.pose) || "idle" } : { face: b.face || (end ? "happy" : "neutral"), pose: b.pose || (end ? "wave" : "idle") };
      return `<div class="person" data-who="${who}" data-sc="${sc}" style="position:absolute;left:${left}px;top:${top}px;transform-origin:50% 100%;transform:scale(${sc})">${who === "maya" ? maya(o) : who === "dev" ? dev(o) : theo(o)}</div>`;
    };
    stage.innerHTML = `<div id="punch" style="position:absolute;inset:0;transform-origin:50% 45%">
        ${td ? "" : `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0">${scene}</svg>`}
        ${statUp ? `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0"><g class="pop">${statBanner(b)}</g></svg>` : ""}
        ${td ? "" : cast.map(place).join("")}
        ${b.stamp ? `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0">${stampSVG(b.stamp, td ? 470 : 1300)}</svg>` : ""}
      </div>
      ${b.scene === "end" ? "" : `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0">${hud(EP)}</svg>`}
      ${EP.format === "coach" ? `<div id="flash" style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(255,40,40,0) 35%,rgba(255,30,30,.75));opacity:0;pointer-events:none"></div>` : ""}
      <div id="cap" style="position:absolute;left:40px;right:40px;top:${b.scene === "end" ? 1580 : td ? 1330 : cast.length === 2 ? 1560 : withTheo ? 980 : 1440}px;text-align:center">
        ${EP.format === "coach" && b.who ? `<div class="who who-${b.who}">${{ coach: "COACH", theo: "THEO", dev: "DEV", maya: "MAYA" }[b.who] || ""}</div>` : ""}<div id="capline"></div></div>`;
    els = {
      punch: document.getElementById("punch"), people: [...stage.querySelectorAll(".person")], cap: document.getElementById("capline") || document.getElementById("cap"),
      flash: document.getElementById("flash"), tag: stage.querySelector(".who"), cast, td,
      eyes: [...stage.querySelectorAll(".eye")], armR: [...stage.querySelectorAll("#armR")], pops: [...stage.querySelectorAll(".pop")], needle: stage.querySelector(".needle"),
      stamp: stage.querySelector(".bigstamp"), smallStamps: [...stage.querySelectorAll(".stamp")], tiles: [...stage.querySelectorAll(".tile")],
      line: stage.querySelector(".drawline"), newLine: stage.querySelector(".line-new"), opts: [...stage.querySelectorAll(".opt")], chunk: -1
    };
  }

  window.draw = (t) => {
    let i = TL.beats.findIndex((x) => t >= x.start && t < x.end);
    if (i < 0) i = t < TL.beats[0].start ? 0 : TL.beats.length - 1;
    if (i !== cur) { build(i); cur = i; }
    const B = TL.beats[i], b = EP.beats[i], lt = t - B.start, D = B.end - B.start;
    if (EP.format === "coach") {
      // Camera: a close-up on whoever is talking, a slow push on Theo while the coach talks,
      // and a hard punch-in with shake on a yelled line. A new framing on every line keeps the eye busy.
      const duo = els.cast.length === 2, k = els.cast.indexOf(b.who);
      const ox = k < 0 ? 540 : duo ? (k ? 790 : 300) : 540, oy = k < 0 ? 760 : duo ? 1020 : 720;
      let sc = k >= 0 ? 1.2 + 0.05 * (lt / D) : (els.cast.length ? 1.0 + 0.08 * (lt / D) : 1.0);
      let dx = 0, dy = 0, rot = 0;
      if (B.loud) {
        sc += 0.22 * (1 - ease(lt / 0.35));
        const amp = 26 * Math.max(0.15, 1 - lt / 0.9);
        dx = amp * Math.sin(t * 83.1) * Math.cos(t * 37.7); dy = amp * Math.sin(t * 71.3 + 1.7); rot = 1.4 * Math.sin(t * 59.9) * Math.max(0, 1 - lt / 0.9);
      } else sc += 0.08 * (1 - ease(lt / 0.22));
      if (els.td) { window.World.frame(t, lt, D, B); els.punch.style.transform = B.loud ? `translate(${dx * 0.5}px,${dy * 0.5}px) rotate(${rot}deg)` : ""; }
      else { els.punch.style.transformOrigin = `${ox}px ${oy}px`; els.punch.style.transform = `translate(${dx}px,${dy}px) rotate(${rot}deg) scale(${sc})`; }
      if (els.flash) els.flash.style.opacity = B.loud ? Math.max(0, 0.9 - lt / 0.3) + 0.12 * (Math.sin(t * 30) > 0.6 ? 1 : 0) * (lt < 1 ? 1 : 0) : 0;
      // Mouths move only while their owner is speaking.
      const talking = t >= B.voice && t <= B.vend, open = Math.floor(t * 11) % 3 !== 0;
      els.people.forEach((p) => { const me = p.dataset.who === b.who && talking && open; const mo = p.querySelector(".mo"), mc = p.querySelector(".mc"); if (mo) { mo.style.display = me ? "" : "none"; mc.style.display = me ? "none" : ""; } });
      if (els.tag) els.tag.style.transform = `scale(${0.7 + 0.3 * back(lt / 0.2)})`;
    } else
    els.punch.style.transform = `scale(${1.07 - 0.07 * ease(lt / 0.28)})`;
    els.people.forEach((p, k) => { p.style.transform = `scale(${p.dataset.sc}) translateY(${Math.sin(t * 2.4 + k * 1.3) * 6}px)`; });
    const blink = (t % 3.3) < 0.12;
    els.eyes.forEach((e) => (e.style.transform = blink ? "scaleY(.08)" : ""));
    els.armR.forEach((a, k) => { const pose = k === 0 ? b.pose : b.mpose; if (pose === "wave" || b.scene === "end") a.setAttribute("transform", `rotate(${Math.sin(t * 9) * 9} 272 362)`); });
    if (els.needle) els.needle.style.transform = `rotate(${-8 + 10 * ease(lt / 0.8) + Math.sin(t * 7) * 1.5}deg)`;
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
    if (c !== els.chunk) { els.chunk = c; els.cap.innerHTML = c >= 0 ? `<span class="cap${B.loud ? " loud" : ""}">${capHTML(B.chunks[c].text, b.tone)}</span>` : ""; }
    const sketch = document.body.classList.contains("sketch");
    if (sketch && !document.body.classList.contains("td")) {
      // Lines boil: a different wobble every 4 frames, as when each drawing is traced again by hand.
      els.punch.style.filter = `url(#boil${Math.floor(t * 7.5) % 3})`;
    }
    if (sketch) {
      const sp = els.cap.firstChild;
      if (sp) sp.style.transform = B.loud ? `rotate(${[-3, 2.5, -2, 3.5].at(c % 4) + Math.sin(t * 61) * 1.2}deg) scale(${1.25 - 0.13 * ease((t - (B.chunks[c]?.t || 0)) / 0.12)})` : `rotate(${[-1.6, 1.2, -0.8, 1.8].at(c % 4)}deg)`;
    } else if (c >= 0) { const a = (t - B.chunks[c].t) / 0.13; const sp = els.cap.firstChild; if (sp) sp.style.transform = `scale(${1.32 - 0.32 * ease(a)})`; }
  };
})();
