/**
 * Writes the next "Fix Theo" episode (18 Nov).
 *
 * Code builds the parts that must be right: the opening, the vote result
 * (real comment counts when there are any, otherwise "Theo went with"), the
 * money status, the next vote and the end card. The free AI (Gemini, then
 * Groq) writes only the middle: three to five beats acting out the engine's
 * facts, with a little roasting. Every figure it uses must come from those
 * facts; anything else and the beats are rejected and written again, and if
 * that fails too a plain middle is built from the facts, so an episode always
 * comes out.
 *
 * Coach mode (25 Nov, owner: "insane hooks", "Theo talking to another person", "some yelling",
 * "Theo LARPs being broke because he believes he's broke"): no narrator. An off-screen coach
 * yells at Theo, Theo argues back, and his roommate Dev piles on. Every beat has `who`
 * (coach, theo, dev, maya) and may be `loud`. The first beat is always the coach yelling the
 * day's most damning figure at him, written by code.
 */
import { advance, money, ACTIONS, startSeason2, s2Intro, leftover } from "./theo.mjs";
import { NOTES, DESK, PLOT } from "./story.mjs";
import { geminiJson, groqJson, GEMINI_FEED_MODEL, GROQ_FEED_MODELS } from "../../lib/providers.mjs";

const FACES = ["neutral", "happy", "shock", "sad", "smug", "worried"];
const POSES = ["idle", "wave", "shrug", "point"];
const SCENES = ["room", "dev", "stat", "bank", "receipt", "couple", "maya"];
const WHO = ["coach", "theo", "dev", "maya"];
const AD = /\b(ledge ?desk|ledgedesk|download|sign ?up|link in (my )?bio|app store|google play|subscribe|use code|promo)\b/i;

const SCHEMA = {
  type: "object",
  properties: {
    beats: {
      type: "array",
      items: {
        type: "object",
        properties: {
          who: { type: "string", enum: WHO, description: "Who says this line: coach (off screen, talks TO Theo as 'you'), theo, dev (roommate), maya." },
          loud: { type: "boolean", description: "true when the line is yelled. At most 2 yelled lines." },
          scene: { type: "string", enum: SCENES, description: "room = Theo alone; dev = Theo and Dev; couple = Theo and Maya; maya = Maya alone; stat/bank/receipt = picture cards." },
          say: { type: "string", description: "One spoken line, under 14 words, in the speaker's own voice. Figures in digits ($55, 16 months, 24.9%)." },
          cap: { type: "string", description: "2 or 3 very short UPPERCASE chunks split by ' / ', one key word wrapped in *stars*. Example: 'HE SAVES / *$55* A MONTH'." },
          face: { type: "string", enum: FACES },
          pose: { type: "string", enum: POSES },
          mface: { type: "string", enum: FACES, description: "dev, couple or maya scenes: the other character's face" },
          mpose: { type: "string", enum: POSES, description: "dev, couple or maya scenes: the other character's pose" },
          stamp: { type: "string", description: "Optional red stamp for a roast, 2 or 3 words, UPPERCASE, or empty. At most 2 in the whole episode, and it must fit what that beat says (never STILL BROKE on good news)." },
          big: { type: "string", description: "stat scene: ONE figure from the facts, at most 9 characters, e.g. '$55/MO' or '101 MO'. Never a sentence or a comparison." },
          small: { type: "string", description: "stat scene: a short UPPERCASE label, at most 22 characters." },
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
  if (!Array.isArray(beats) || beats.length < 3 || beats.length > 5) problems.push(`need 3 to 4 beats, got ${beats?.length}`);
  const mayaIn = f.season === 2 || f.day >= 8;
  (beats || []).forEach((b, i) => {
    if (!SCENES.includes(b.scene) || (!mayaIn && (b.scene === "couple" || b.scene === "maya"))) problems.push(`beat ${i + 1}: scene ${b.scene} not allowed today`);
    if (AD.test([b.say, b.cap, b.stamp].join(" "))) problems.push(`beat ${i + 1}: do not mention Ledge Desk, apps, downloads or sign-ups (that scene is added separately)`);
    if (!b.say || b.say.split(/\s+/).length > 14) problems.push(`beat ${i + 1}: say missing or longer than 14 words`);
    if (!WHO.includes(b.who) || (b.who === "maya" && !mayaIn)) problems.push(`beat ${i + 1}: who must be coach, theo or dev${mayaIn ? " or maya" : ""}`);
    const chunks = String(b.cap || "").split("/").map((x) => x.trim()).filter(Boolean);
    if (!chunks.length || chunks.length > 3 || chunks.some((c) => c.replace(/\*/g, "").length > 20)) problems.push(`beat ${i + 1}: cap needs 1-3 chunks of at most 20 letters`);
    if (b.stamp && b.stamp.length > 16) problems.push(`beat ${i + 1}: stamp too long`);
    const text = [b.say, b.cap, b.big, b.small, b.balance, ...(b.lines || []).flatMap((l) => [l.label, l.value])].join(" ");
    const bad = nums(text).filter((n) => !ok.has(n));
    if (bad.length) problems.push(`beat ${i + 1}: figures not in the facts: ${bad.join(", ")}`);
    if (b.scene === "stat" && !(b.big || "").trim()) problems.push(`beat ${i + 1}: a stat scene needs its big figure`);
    if (b.scene === "stat" && (b.big || "").length > 9) problems.push(`beat ${i + 1}: big must be one short figure of at most 9 characters, not "${b.big}"`);
    if (b.scene === "stat" && (b.small || "").length > 22) problems.push(`beat ${i + 1}: small label longer than 22 characters`);
    if (b.scene === "bank" && !/\d/.test(b.balance || "")) problems.push(`beat ${i + 1}: a bank scene needs a balance from the facts`);
    if (b.scene === "receipt" && !(b.lines || []).some((l) => /\d/.test(l.value || ""))) problems.push(`beat ${i + 1}: a receipt scene needs lines with figures from the facts`);
  });
  if ((beats || []).filter((b) => b.stamp && b.stamp.trim()).length > 2) problems.push("at most 2 stamps in the episode");
  if (!(beats || []).some((b) => b.who === "dev")) problems.push("Dev the roommate must say at least one line");
  if (!(beats || []).some((b) => b.who === "theo")) problems.push("Theo must talk back at least once");
  if ((beats || []).filter((b) => b.scene === "stat").length > 2) problems.push("at most 2 stat scenes");
  // Every figure that matters must actually be said out loud.
  const said = new Set(nums((beats || []).map((b) => b.say).join(" ")));
  const key = [...new Set(f.result.facts.flatMap(nums))].filter((n) => Number(n) > 12);
  const missing = key.filter((n) => !said.has(n));
  if (missing.length) problems.push(`these figures from the facts are never said aloud: ${missing.join(", ")}`);
  return problems;
}

function clean(b) {
  const who = WHO.includes(b.who) ? b.who : "coach";
  let scene = b.scene;
  // The speaker must be on screen: Dev's lines are in the dev scene, Maya's with Maya.
  if (who === "dev" && ["room", "couple", "maya"].includes(scene)) scene = "dev";
  if (who === "maya" && ["room", "dev"].includes(scene)) scene = "couple";
  const o = { who, loud: !!b.loud, scene, say: b.say.trim(), cap: b.cap.toUpperCase().trim() };
  b = { ...b, scene };
  if (["room", "dev", "couple", "maya"].includes(b.scene)) {
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
  // Hand-written fallback in dialogue: the coach reads the facts at Theo, Dev and Theo answer with the choice's jokes.
  const r = f.result, out = [], jokes = f.jokes || [];
  out.push({ who: "coach", scene: "room", say: r.facts[0], cap: "TODAY'S / *MOVE*", face: "worried", pose: "idle" });
  if (jokes[0]) out.push({ who: "dev", scene: "dev", say: jokes[0].say, cap: jokes[0].cap, face: jokes[0].face || "worried", pose: "idle", mface: "smug", mpose: "point" });
  const bigNums = nums(r.big);
  let statDone = false;
  r.facts.slice(1, 4).forEach((x) => {
    const say = x;
    if (!statDone && nums(x).some((n) => bigNums.includes(n))) { statDone = true; out.push({ who: "coach", scene: "stat", say, cap: `*${r.big}*`, big: r.big, small: r.small, bg: "green" }); }
    else out.push({ who: "coach", scene: "room", say, cap: "LISTEN / *THEO*", face: "shock", pose: "shrug" });
  });
  out.push({ who: "theo", scene: "room", say: "Okay. But I'm still broke. Spiritually.", cap: "STILL BROKE. / *SPIRITUALLY*", face: "sad", pose: "shrug" });
  if (f.event) out.push({ who: "dev", loud: true, scene: "dev", say: "Frérot! " + f.event.text, cap: "AND THEN / *THIS*", face: "shock", pose: "shrug", mface: "shock", mpose: "point", stamp: "PLOT TWIST" });
  return out.slice(0, 5);
}

async function aiMiddle(f, last) {
  const system = "You write short, loud, funny dialogue for a cartoon money series on Instagram called Fix Theo. It must hold a scrolling viewer's attention line by line. " +
    "Theo is 23, lives in the US, sells phones, and is slowly getting better with money, but he is convinced he is broke and acts it: dry ramen, 'I can't afford joy', refusing to check his balance, calling himself broke even when the figures say otherwise. That belief is the running joke. " +
    "Coach is an off-screen voice who roasts Theo and talks to him directly as 'you'; he yells when Theo does something silly. Dev is Theo's French roommate, who catches him out and piles on; he calls Theo 'frérot' and now and then drops a French word (oh là là, voilà, allez), but otherwise speaks plain, correct English, never broken English. Theo argues back, badly. " +
    (f.season === 2 || f.day >= 8 ? "Maya is 24, a nurse, organised, saves 15% of every paycheck, but has a 2am online shopping habit; she and Theo are " + (f.season === 2 ? "a couple making money decisions together. Use scene 'couple' for both of them and set mface/mpose for Maya. " : "getting to know each other. ") : "") +
    "Tone: fast, relatable and funny, people talking over each other, a roast in most lines " +
    "(a stamp like 'BOLD MOVE' or 'STILL BROKE'). Never cruel, nothing about his looks, no swearing, no real brand names, no advice to buy or sell any investment. " +
    "Use ONLY the figures given in the facts, written in digits. Do not invent any other number, percentage or date.";
  const note = NOTES[f.season || 1]?.[f.day];
  const plot = PLOT[f.season || 1]?.[f.day];
  const prompt = `${f.season === 2 ? "Season 2, " : ""}Day ${f.day} of ${f.of}. ${note ? "Background for today, use only where it fits the facts: " + note + "\n" : ""}` +
    (plot ? `A scene is added separately where: ${plot.say} Do not repeat it; you may refer to it.\n` : "") +
    `Yesterday's choice, now happening: ${f.choice.label}.\n` +
    `Facts you must act out, in order:\n${f.result.facts.map((x) => "- " + x).join("\n")}\n` +
    (f.event ? `Then a surprise: ${f.event.text}${f.event.onCard ? ` His savings could not cover it, so ${money(f.event.onCard)} went on the credit card.` : ""}\n` : "") +
    `Big number for one stat scene: ${f.result.big} (${f.result.small}).\n` +
    `Write 3 or 4 lines of dialogue (each under 12 words: the whole episode must stay under 30 seconds). The first line must not be Theo's (he has just spoken). Each line has who: coach, theo or dev${f.season === 2 || f.day >= 8 ? " (or maya)" : ""}. Never the same speaker twice in a row. Dev speaks at least once, Theo talks back at least once, and Theo insists he is broke at least once even if the figures say he is doing better; Coach or Dev shuts that down with a figure. Mark at most 2 lines loud (yelled), the ones with the biggest reaction. Every figure in the facts must be said aloud in some line, by whoever fits. Scenes: room (Theo alone), dev (Theo and Dev; use for every Dev line), stat (big figure card), bank (his balance), receipt (up to 4 lines). Set face and pose for Theo and mface/mpose for Dev. Tell one clear story: what he did, what it changes, how he takes it. Never two stat scenes in a row.\n` +
    `Do not write an opening, a vote or an ending: those are added separately (the episode opens with Coach yelling at Theo). Do not mention any app, website or brand by name.\n` +
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

/** Today's Ledge Desk moment: the one planned for today if it fits today's choice, else any unused one that does, else none. */
function deskFor(season, day, key, used) {
  const all = DESK[season] || {};
  const fitsKey = ([, d]) => !d.fits || d.fits.includes(key);
  const free = Object.entries(all).filter(([d]) => !used.includes(`${season}:${d}`));
  const pick = free.find(([d, x]) => Number(d) === day && fitsKey([d, x])) || free.find(fitsKey);
  if (!pick) return null;
  const { fits, ...d } = pick[1];
  return { id: `${season}:${pick[0]}`, beat: { scene: "desk", ...d } };
}

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
  // Repairs instead of rejections: a roast stamp never sits on a happy beat, a second
  // picture card in a row puts Theo back on screen, at most two yelled lines.
  let loudLeft = 2;
  const middle = (mid ? mid.beats.map(clean) : plainMiddle(f)).slice(0, 6).map((b, i, a) => {
    if (b.stamp && b.face === "happy") delete b.stamp;
    if (b.loud && loudLeft-- <= 0) b.loud = false;
    if (i > 0 && !["room", "dev", "couple", "maya"].includes(b.scene) && b.scene === a[i - 1].scene) return { ...b, scene: b.who === "dev" ? "dev" : "room", face: "shock", pose: "point" };
    return b;
  });
  // The Ledge Desk moment (worded by hand) and Maya's plot scene; the coach says them.
  const pickDesk = deskFor(season, f.day, f.choice.key, state.deskUsed || []);
  const desk = pickDesk ? { who: "coach", ...pickDesk.beat } : null;
  if (pickDesk) next.deskUsed = [...(state.deskUsed || []), pickDesk.id];
  if (desk) middle.splice(Math.min(2, middle.length), 0, desk);
  const plotB = PLOT[season]?.[f.day];
  const plot = plotB ? { who: "coach", ...plotB } : null;
  if (plot) middle.splice(Math.min(desk ? 3 : 2, middle.length), 0, plot);
  // Hand-written moments stay; the AI's lines give way so the middle stays short.
  while (middle.length > 4) { const k = middle.findLastIndex((b) => b !== desk && b !== plot); if (k < 0) break; middle.splice(k, 1); }

  // Theo has just answered the coach, so the middle never opens on Theo.
  if (middle[0]?.who === "theo") { const k = middle.findIndex((b) => b.who !== "theo"); if (k > 0) middle.unshift(...middle.splice(k, 1)); }
  const c = f.choice, tot = counts ? counts.a + counts.b : 0;
  const lo = f.leftover;
  // The hook (first 2 seconds): the coach yells the day's most damning figure at Theo.
  // When Theo is actually doing fine, the yelling is about him still acting broke.
  const hook = lo < 0
    ? { say: `THEO! You are $${-lo} short. Every month!`, cap: `*$${-lo}* SHORT / EVERY MONTH`, stamp: "BROKE" }
    : f.card > 0 && lo < 60
      ? { say: `THEO! You still owe $${f.card} on that card!`, cap: `YOU OWE / *$${f.card}*`, stamp: "STILL OWES" }
      : { say: `THEO! You have $${lo} a month. Why the dry ramen?!`, cap: `*$${lo}* A MONTH. / DRY RAMEN?!`, stamp: "NOT BROKE" };
  const opening = [{ who: "coach", loud: true, scene: duo ? "couple" : "room", face: "shock", pose: "shrug", mface: "worried", mpose: "idle", ...hook }];
  const pct = tot > 0 ? Math.round(100 * (c.letter === "A" ? counts.a : counts.b) / tot) : 0;
  opening.push(tot >= 20
    ? { who: "theo", scene: "stat", say: `Relax! ${pct}% of you voted ${c.letter}. ${c.label}.`, cap: `*${pct}%* VOTED / *${c.letter}*`, big: `${pct}%`, small: `VOTED ${c.letter}`, bg: "green" }
    : { who: "theo", scene: duo ? "couple" : "room", say: `Relax! ${tot > 0 ? "You voted" : "I picked"} ${c.letter}: ${c.label.toLowerCase()}.`, cap: `DAY ${f.day}: / *${c.letter}*`, face: "smug", pose: "point", mface: "happy", mpose: "idle" });

  const status = [lo >= 0
    ? { who: "coach", scene: "stat", say: `$${lo} left every month. You. Are not. Broke.`, cap: `*$${lo}* LEFT / NOT BROKE`, big: `$${lo}`, small: "LEFT EACH MONTH", bg: "green" }
    : { who: "coach", loud: true, scene: "stat", say: `And you are STILL $${-lo} short every month!`, cap: `STILL *$${-lo}* / SHORT`, big: `-$${-lo}`, small: "LEFT EACH MONTH", bg: "red" }];
  const finale = f.day >= f.of || f.next.length === 0;
  const tail = [];
  if (finale && !duo) {
    tail.push({ who: "coach", scene: "room", say: `Fourteen days ago you had $4.12. Your money score is ${f.score} percent.`, cap: `MONEY SCORE / *${f.score}%*`, face: "happy", pose: "wave" });
    tail.push({ who: "theo", scene: "couple", say: "And Maya asked me out. I checked my budget first. I said yes!", cap: "HE SAID / *YES*", face: "happy", pose: "wave", mface: "smug", mpose: "idle", stamp: "BUDGETED" });
    tail.push({ who: "coach", scene: "end", say: "That's season one. Season two: Theo and Maya.", cap: "SEASON *2* / NEXT" });
  } else if (finale) {
    tail.push({ who: "coach", scene: "couple", say: `Ten episodes. Shared bills, a plan, money working for you. Score: ${f.score} percent.`, cap: `MONEY SCORE / *${f.score}%*`, face: "happy", pose: "wave", mface: "happy", mpose: "wave" });
    tail.push({ who: "coach", scene: "end", say: "That's season two. Thanks for fixing Theo with us.", cap: "THANK / *YOU*" });
  } else if (f.next.length === 1) {
    tail.push({ who: "coach", loud: true, scene: duo ? "couple" : "room", say: `Tomorrow is the finale! Last move: ${f.next[0].label.toLowerCase()}!`, cap: "TOMORROW: / *FINALE*", face: "worried", pose: "idle", mface: "happy", mpose: "idle" });
    tail.push({ who: "dev", scene: "end", say: "Follow, or he goes back to ramen.", cap: "FOLLOW / FOR THE *FINALE*" });
  } else {
    const [va, vb] = f.next;
    tail.push({ who: "coach", loud: true, scene: "vote", say: `Tomorrow! A, or B? Comment NOW!`, q: `DAY ${f.day + 1}: YOU DECIDE`, a: va.label.toUpperCase(), b: vb.label.toUpperCase(), cap: "COMMENT / *A* OR *B*" });
  }
  const episode = { series: "Fix Theo", format: "coach", season, day: f.day, of: f.of, score: f.score, cur: "$", food: "Takeout", writer,
    facts: f.result.facts, beats: [...opening, ...middle, ...status, ...tail] };
  const base = mid?.caption?.trim() || `Day ${f.day} of ${duo ? "Theo and Maya" : "fixing Theo"}: ${c.label.toLowerCase()}. ${f.result.facts.slice(1, 3).join(" ")}`;
  const caption = base.replace(/\s*Comment A or B for tomorrow\.?/i, "") + (finale || f.next.length < 2 ? "" : "\n\nComment A or B for tomorrow.");
  return { episode, state: next, caption, hashtags: mid?.hashtags || [] };
}
