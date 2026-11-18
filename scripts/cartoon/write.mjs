/**
 * Writes the next "Fix Theo" episode (18 Nov).
 *
 * Code builds the parts that must be right: the opening, the vote result
 * (real comment counts when there are any, otherwise "Theo went with"), the
 * money status, the next vote and the end card. The free AI (Gemini, then
 * Groq) writes only the middle: four to eight beats acting out the engine's
 * facts, with a little roasting. Every figure it uses must come from those
 * facts; anything else and the beats are rejected and written again, and if
 * that fails too a plain middle is built from the facts, so an episode always
 * comes out.
 */
import { advance, money, ACTIONS, startSeason2, s2Intro, leftover } from "./theo.mjs";
import { NOTES, DESK, PLOT } from "./story.mjs";
import { geminiJson, groqJson, GEMINI_FEED_MODEL, GROQ_FEED_MODELS } from "../../lib/providers.mjs";

const FACES = ["neutral", "happy", "shock", "sad", "smug", "worried"];
const POSES = ["idle", "wave", "shrug", "point"];
const SCENES = ["room", "stat", "bank", "receipt", "couple", "maya"];
const AD = /\b(ledge ?desk|ledgedesk|download|sign ?up|link in (my )?bio|app store|google play|subscribe|use code|promo)\b/i;

const SCHEMA = {
  type: "object",
  properties: {
    beats: {
      type: "array",
      items: {
        type: "object",
        properties: {
          scene: { type: "string", enum: SCENES },
          say: { type: "string", description: "One or two short spoken sentences. Figures in digits ($55, 16 months, 24.9%)." },
          cap: { type: "string", description: "2 or 3 very short UPPERCASE chunks split by ' / ', one key word wrapped in *stars*. Example: 'HE SAVES / *$55* A MONTH'." },
          face: { type: "string", enum: FACES },
          pose: { type: "string", enum: POSES },
          mface: { type: "string", enum: FACES, description: "couple or maya scenes: Maya's face" },
          mpose: { type: "string", enum: POSES, description: "couple or maya scenes: Maya's pose" },
          stamp: { type: "string", description: "Optional red stamp for a roast, 2 or 3 words, UPPERCASE, or empty." },
          big: { type: "string", description: "stat scene: the big figure, e.g. '$55/MO'." },
          small: { type: "string", description: "stat scene: a short UPPERCASE label." },
          bg: { type: "string", enum: ["red", "navy", "green"] },
          balance: { type: "string", description: "bank scene: the balance shown, e.g. '$90.00'." },
          lines: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" } }, required: ["label", "value"] } }
        },
        required: ["scene", "say", "cap"]
      }
    },
    caption: { type: "string", description: "Instagram caption: 2 to 4 short sentences about today's money lesson, then 'Comment A or B for tomorrow.' No hashtags, no emoji." },
    hashtags: { type: "array", items: { type: "string" } }
  },
  required: ["beats", "caption"]
};

const nums = (s) => (String(s).match(/\d[\d,]*(\.\d+)?/g) || []).map((x) => x.replace(/,/g, "").replace(/\.0+$/, ""));

function allowedNumbers(f) {
  const set = new Set();
  const add = (s) => nums(s).forEach((n) => set.add(n));
  [...f.result.facts, f.result.big, f.result.small, f.event?.text || "", money(f.leftover), money(Math.abs(f.leftover)), money(f.card), money(f.savings),
    String(f.score), String(f.day), String(f.of), String(f.day + 1), "24.9", String(f.monthlyInterest), String(f.event?.onCard || "")].forEach(add);
  for (let i = 0; i <= 12; i++) set.add(String(i));
  // Cents forms ($54.95 -> 54.95 and 55)
  [...set].forEach((n) => { if (n.includes(".")) set.add(String(Math.round(Number(n)))); });
  return set;
}

function check(beats, f) {
  const ok = allowedNumbers(f), problems = [];
  if (!Array.isArray(beats) || beats.length < 4 || beats.length > 8) problems.push(`need 4 to 8 beats, got ${beats?.length}`);
  const mayaIn = f.season === 2 || f.day >= 8;
  (beats || []).forEach((b, i) => {
    if (!SCENES.includes(b.scene) || (!mayaIn && (b.scene === "couple" || b.scene === "maya"))) problems.push(`beat ${i + 1}: scene ${b.scene} not allowed today`);
    if (AD.test([b.say, b.cap, b.stamp].join(" "))) problems.push(`beat ${i + 1}: do not mention Ledge Desk, apps, downloads or sign-ups (that scene is added separately)`);
    if (!b.say || b.say.length > 170) problems.push(`beat ${i + 1}: say missing or too long`);
    const chunks = String(b.cap || "").split("/").map((x) => x.trim()).filter(Boolean);
    if (!chunks.length || chunks.length > 3 || chunks.some((c) => c.replace(/\*/g, "").length > 20)) problems.push(`beat ${i + 1}: cap needs 1-3 chunks of at most 20 letters`);
    if (b.stamp && b.stamp.length > 16) problems.push(`beat ${i + 1}: stamp too long`);
    const text = [b.say, b.cap, b.big, b.small, b.balance, ...(b.lines || []).flatMap((l) => [l.label, l.value])].join(" ");
    const bad = nums(text).filter((n) => !ok.has(n));
    if (bad.length) problems.push(`beat ${i + 1}: figures not in the facts: ${bad.join(", ")}`);
    if (/\b(I|I'm|I've|I'll|my|me|we|our)\b/.test(b.say || "")) problems.push(`beat ${i + 1}: the narrator talks about Theo in the third person (he, his), never I or my`);
    if (b.scene === "stat" && !(b.big || "").trim()) problems.push(`beat ${i + 1}: a stat scene needs its big figure`);
    if (b.scene === "bank" && !/\d/.test(b.balance || "")) problems.push(`beat ${i + 1}: a bank scene needs a balance from the facts`);
    if (b.scene === "receipt" && !(b.lines || []).some((l) => /\d/.test(l.value || ""))) problems.push(`beat ${i + 1}: a receipt scene needs lines with figures from the facts`);
  });
  // Every figure that matters must actually be said out loud.
  const said = new Set(nums((beats || []).map((b) => b.say).join(" ")));
  const key = [...new Set(f.result.facts.flatMap(nums))].filter((n) => Number(n) > 12);
  const missing = key.filter((n) => !said.has(n));
  if (missing.length) problems.push(`these figures from the facts are never said aloud: ${missing.join(", ")}`);
  return problems;
}

function clean(b) {
  const o = { scene: b.scene, say: b.say.trim(), cap: b.cap.toUpperCase().trim() };
  if (["room", "couple", "maya"].includes(b.scene)) {
    o.face = FACES.includes(b.face) ? b.face : "neutral"; o.pose = POSES.includes(b.pose) ? b.pose : "idle";
    if (b.scene !== "room") { o.mface = FACES.includes(b.mface) ? b.mface : o.face; o.mpose = POSES.includes(b.mpose) ? b.mpose : "idle"; }
    if (b.stamp?.trim()) o.stamp = b.stamp.toUpperCase().trim();
  }
  if (b.scene === "stat") { o.big = (b.big || "").toUpperCase(); o.small = (b.small || "").toUpperCase(); o.bg = b.bg || "navy"; }
  if (b.scene === "bank") o.balance = b.balance || "$0.00";
  if (b.scene === "receipt") o.lines = (b.lines || []).slice(0, 4).map((l) => [String(l.label).toUpperCase(), l.value]);
  return o;
}

function plainMiddle(f) {
  // Hand-written fallback: the facts, with the choice's own two jokes in between.
  const r = f.result, duo = f.season === 2, jokes = (f.jokes || []).map((j) => ({ scene: duo ? "couple" : "room", ...j })), out = [];
  out.push({ scene: "room", say: r.facts[0], cap: "TODAY'S / *MOVE*", face: "worried", pose: "idle" });
  if (jokes[0]) out.push(jokes[0]);
  out.push({ scene: "stat", say: r.facts[1] || r.facts[0], cap: `*${r.big}*`, big: r.big, small: r.small, bg: "green" });
  r.facts.slice(2, 4).forEach((x) => out.push({ scene: "room", say: x, cap: "NOT BAD / *THEO*", face: "happy", pose: "point" }));
  if (jokes[1]) out.push(jokes[1]);
  if (f.event) out.push({ scene: "room", say: f.event.text + (f.event.onCard ? ` No savings yet, so it goes on the card.` : ""), cap: "AND THEN / *THIS*", face: "shock", pose: "shrug", stamp: "PLOT TWIST" });
  return out.slice(0, 8);
}

async function aiMiddle(f, last) {
  const system = "You write short, punchy scripts for a cartoon money series on Instagram called Fix Theo. " +
    "Theo is 23, lives in the US, sells phones, and is broke but likeable and slowly getting better with money. " +
    (f.season === 2 || f.day >= 8 ? "Maya is 24, a nurse, organised, saves 15% of every paycheck, but has a 2am online shopping habit; she and Theo are " + (f.season === 2 ? "a couple making money decisions together. Use scene 'couple' for both of them and set mface/mpose for Maya. " : "getting to know each other. ") : "") +
    "Tone: relatable and funny, with a light roast now and then " +
    "(a stamp like 'BOLD MOVE' or 'STILL BROKE'). Never cruel, nothing about his looks, no swearing, no real brand names, no advice to buy or sell any investment. " +
    "Use ONLY the figures given in the facts, written in digits. Do not invent any other number, percentage or date.";
  const note = NOTES[f.season || 1]?.[f.day];
  const plot = PLOT[f.season || 1]?.[f.day];
  const prompt = `${f.season === 2 ? "Season 2, " : ""}Day ${f.day} of ${f.of}. ${note ? "Today's story: " + note + "\n" : ""}` +
    (plot ? `A scene is added separately where: ${plot.say} Do not repeat it; you may refer to it.\n` : "") +
    `Yesterday's choice, now happening: ${f.choice.label}.\n` +
    `Facts you must act out, in order:\n${f.result.facts.map((x) => "- " + x).join("\n")}\n` +
    (f.event ? `Then a surprise: ${f.event.text}${f.event.onCard ? ` His savings could not cover it, so ${money(f.event.onCard)} went on the credit card.` : ""}\n` : "") +
    `Big number for one stat scene: ${f.result.big} (${f.result.small}).\n` +
    `Write 4 to 8 beats, narrated about Theo in the third person (he, his). Every figure in the facts must be said aloud in some beat. Scenes: room (Theo on screen; set face and pose; optional stamp), stat (big figure card), bank (his balance), receipt (up to 4 lines).\n` +
    `Do not write an opening, a vote or an ending: those are added separately. Do not mention any app, website or brand by name.\n` +
    `The ONLY figures you may write: ${[...allowedNumbers(f)].filter((n) => Number(n) > 12 || n.includes(".")).join(", ")} (and small counts up to 12). Never add, subtract or multiply them into new figures.\n` +
    `Ideas for jokes you may use or improve:\n${(f.jokes || []).map((j) => "- " + j.say).join("\n")}` +
    (last ? `\n\nYour last attempt was rejected: ${last.join("; ")}. Fix exactly those problems.` : "");
  const tries = [
    ...GEMINI_FEED_MODEL.split(",").map((m) => m.trim()).filter(Boolean).map((model) => () => geminiJson({ model, system, prompt, schema: SCHEMA, maxTokens: 3000 })),
    ...(process.env.GROQ_API_KEY ? GROQ_FEED_MODELS.map(({ model, tpm }) => () => groqJson({ model, tpm, system, prompt, schema: SCHEMA, maxTokens: 3000 })) : [])
  ];
  for (const t of tries) {
    try { const o = await t(); if (o?.beats) return o; } catch (e) { console.warn("  writer:", String(e.message).slice(0, 100)); }
  }
  return null;
}

const deskBeat = (season, day) => { const d = DESK[season]?.[day]; return d ? { scene: "desk", ...d } : null; };

/** Season 2, day 1: Maya properly, then the first couple vote. Written by hand. */
function season2Intro(s1) {
  const s = startSeason2(s1), r = s2Intro(s), [ka, kb] = s.vote;
  const { ACTIONS2 } = INTRO;
  const beats = [
    { scene: "couple", say: "Season two. Theo has a girlfriend.", cap: "SEASON *2*", face: "happy", pose: "wave", mface: "smug", mpose: "idle", stamp: "SHE'S REAL" },
    { scene: "maya", say: "This is Maya. She's twenty-four, a nurse, and the organised one.", cap: "THIS IS / *MAYA*", face: "happy", pose: "wave" },
    { scene: "stat", say: r.facts[1], cap: "SHE SAVES / *15%*", big: "15%", small: "OF EVERY PAYCHECK", bg: "green" },
    { scene: "stat", say: "She also has $24,000 of student loans, at 5.5%.", cap: "*$24,000* / STUDENT LOANS", big: "$24,000", small: "STUDENT LOANS AT 5.5%", bg: "navy" },
    { scene: "maya", say: "And one weakness. Online shopping, at 2am.", cap: "2AM / *SHOPPING*", face: "smug", pose: "shrug", stamp: "NOBODY'S PERFECT" },
    { scene: "couple", say: `Theo, meanwhile, now has $${Math.round(leftover(s))} left over each month. Two weeks ago he had four dollars and twelve cents.`, cap: `*$${Math.round(leftover(s))}* LEFT / EACH MONTH`, face: "smug", pose: "point", mface: "happy", mpose: "idle" },
    { scene: "couple", say: "So now they make money decisions together. And you still vote.", cap: "YOU STILL / *VOTE*", face: "happy", pose: "wave", mface: "happy", mpose: "wave" },
    { scene: "vote", say: `Day two is your call. A, ${ACTIONS2[ka].label.toLowerCase()}. Or B, ${ACTIONS2[kb].label.toLowerCase()}. Comment A, or B.`, q: "DAY 2: YOU DECIDE", a: ACTIONS2[ka].label.toUpperCase(), b: ACTIONS2[kb].label.toUpperCase(), cap: "COMMENT / *A* OR *B*" },
    { scene: "end", say: "Follow, for day two.", cap: "FOLLOW / FOR *DAY 2*" }
  ];
  const episode = { series: "Fix Theo", season: 2, day: 1, of: 10, score: s.score, cur: "$", food: "Takeout", writer: "hand", facts: r.facts, beats };
  const caption = "Season 2 of Fix Theo. Theo has gone from $4.12 to an actual plan, and now there's Maya: a nurse who saves 15% of every paycheck, has $24,000 in student loans, and shops online at 2am. From here they make money decisions together, and you still decide.\n\nComment A or B for Day 2.";
  return { episode, state: s, caption, hashtags: ["fixtheo", "couplesandmoney", "studentloans"] };
}
const INTRO = {};

/**
 * state: the saved state; winner: "a" | "b"; counts: {a, b} from comments or null.
 * Returns { episode, state, caption }. After the Season 1 finale, the next call
 * starts Season 2 with Maya's introduction.
 */
export async function writeEpisode(state, winner, counts) {
  if ((state.season || 1) === 1 && state.day >= state.of) {
    INTRO.ACTIONS2 = (await import("./theo.mjs")).ACTIONS2;
    return season2Intro(state);
  }
  const { state: next, facts: f } = advance(state, winner, counts);
  const season = f.season || 1, duo = season === 2;
  let mid = null, why = null, writer = "plain";
  for (let attempt = 0; attempt < 3 && !mid; attempt++) {
    const o = await aiMiddle(f, why);
    if (!o) break;
    const problems = check(o.beats, f);
    if (!problems.length) { mid = o; writer = "ai"; }
    else { why = problems.slice(0, 6); console.warn("  rejected:", why.join(" | ")); }
  }
  const middle = mid ? mid.beats.map(clean) : plainMiddle(f);
  // The Ledge Desk moment, worded by hand, goes after the first middle beat.
  const desk = deskBeat(season, f.day);
  if (desk) middle.splice(Math.min(1, middle.length), 0, desk);
  const plot = PLOT[season]?.[f.day];
  if (plot) middle.splice(Math.min(desk ? 2 : 1, middle.length), 0, { ...plot });

  const c = f.choice, tot = counts ? counts.a + counts.b : 0;
  const who = duo ? "Theo and Maya" : "Theo";
  const opening = [duo
    ? { scene: "couple", say: `Day ${f.day} of Theo and Maya.`, cap: `DAY *${f.day}*`, face: "neutral", pose: "wave", mface: "happy", mpose: "idle" }
    : { scene: "room", say: `Day ${f.day} of fixing Theo.`, cap: `DAY *${f.day}*`, face: "neutral", pose: "wave" }];
  if (tot > 0 && tot < 20) {
    opening.push({ scene: "stat", say: `You voted ${c.letter}: ${c.label.toLowerCase()}.`, cap: `YOU VOTED / *${c.letter}*`, big: c.letter, small: c.label.toUpperCase(), bg: "green" });
  } else if (tot > 0) {
    const pct = Math.round(100 * (c.letter === "A" ? counts.a : counts.b) / tot);
    opening.push({ scene: "stat", say: `${pct}% of you voted ${c.letter}: ${c.label.toLowerCase()}.`, cap: `*${pct}%* VOTED / *${c.letter}*`, big: `${pct}%`, small: `VOTED ${c.letter}`, bg: "green" });
  } else {
    opening.push(duo
      ? { scene: "couple", say: `${who} went with ${c.letter}: ${c.label.toLowerCase()}.`, cap: `THEY PICKED / *${c.letter}*`, face: "smug", pose: "point", mface: "happy", mpose: "idle" }
      : { scene: "room", say: `Theo went with ${c.letter}: ${c.label.toLowerCase()}.`, cap: `THEO PICKED / *${c.letter}*`, face: "smug", pose: "point" });
  }
  const lo = f.leftover;
  const status = [{ scene: "stat", say: lo >= 0 ? `Theo now has $${lo} left over each month.` : `Theo is still $${-lo} short each month.`,
    cap: lo >= 0 ? `*$${lo}* LEFT / EACH MONTH` : `STILL *$${-lo}* / SHORT`, big: lo >= 0 ? `$${lo}` : `-$${-lo}`, small: "LEFT EACH MONTH", bg: lo >= 0 ? "green" : "red" }];
  const finale = f.day >= f.of || f.next.length === 0;
  const tail = [];
  if (finale && !duo) {
    tail.push({ scene: "room", say: `Fourteen days ago, Theo had four dollars and twelve cents. Now his money score is ${f.score} percent.`, cap: `MONEY SCORE / *${f.score}%*`, face: "happy", pose: "wave" });
    tail.push({ scene: "couple", say: "And Maya just asked him on a real date. He checked his budget first. Then he said yes.", cap: "HE SAID / *YES*", face: "happy", pose: "wave", mface: "smug", mpose: "idle", stamp: "BUDGETED" });
    tail.push({ scene: "end", say: "That's season one. Season two: Theo and Maya.", cap: "SEASON *2* / NEXT" });
  } else if (finale) {
    tail.push({ scene: "couple", say: `Ten episodes. Shared bills, a plan, and money working for them. Theo's money score is ${f.score} percent.`, cap: `MONEY SCORE / *${f.score}%*`, face: "happy", pose: "wave", mface: "happy", mpose: "wave" });
    tail.push({ scene: "end", say: "That's season two. Thanks for fixing Theo with us.", cap: "THANK / *YOU*" });
  } else if (f.next.length === 1) {
    tail.push({ scene: duo ? "couple" : "room", say: `Tomorrow is the finale. The last move: ${f.next[0].label.toLowerCase()}.`, cap: "TOMORROW: / *FINALE*", face: "worried", pose: "idle", mface: "happy", mpose: "idle" });
    tail.push({ scene: "end", say: "Follow, for the finale.", cap: "FOLLOW / FOR THE *FINALE*" });
  } else {
    const [a, b] = f.next;
    tail.push({ scene: "vote", say: `Day ${f.day + 1} is your call. A, ${a.label.toLowerCase()}. Or B, ${b.label.toLowerCase()}. Comment A, or B.`, q: `DAY ${f.day + 1}: YOU DECIDE`, a: a.label.toUpperCase(), b: b.label.toUpperCase(), cap: "COMMENT / *A* OR *B*" });
    tail.push({ scene: "end", say: `Follow, for day ${f.day + 1}.`, cap: `FOLLOW / FOR *DAY ${f.day + 1}*` });
  }
  const episode = { series: "Fix Theo", season, day: f.day, of: f.of, score: f.score, cur: "$", food: "Takeout", writer,
    facts: f.result.facts, beats: [...opening, ...middle, ...status, ...tail] };
  const base = mid?.caption?.trim() || `Day ${f.day} of ${duo ? "Theo and Maya" : "fixing Theo"}: ${c.label.toLowerCase()}. ${f.result.facts.slice(1, 3).join(" ")}`;
  const caption = base.replace(/\s*Comment A or B for tomorrow\.?/i, "") + (finale || f.next.length < 2 ? "" : "\n\nComment A or B for tomorrow.");
  return { episode, state: next, caption, hashtags: mid?.hashtags || [] };
}
