/**
 * Films ledgedesk.com for the Instagram Reels (13 Nov).
 *
 * Takes full-resolution phone screenshots (360x640 CSS pixels at 3x, so
 * 1080x1920, JPEG quality 92) of the real screens with live data, and saves
 * what the site was saying at that moment (/api/pulse, /api/feed) so the
 * captions match the footage. Run on GitHub's servers, which can reach the
 * site: see .github/workflows/reels.yml.
 *
 *   PW=<path to playwright index.mjs> node scripts/reels/capture.mjs <outdir> [site]
 */
import fs from "node:fs";
import path from "node:path";

const { chromium } = await import(process.env.PW || "playwright");
const out = path.resolve(process.argv[2] || "footage");
const SITE = (process.argv[3] || process.env.SITE || "https://ledgedesk.com").replace(/\/+$/, "");
fs.mkdirSync(out, { recursive: true });

const TERMS = "2026-11-12";
const b = await chromium.launch();

async function json(name, url) {
  try {
    const r = await fetch(url, { headers: { "user-agent": "LedgeDeskReels/1.0" } });
    fs.writeFileSync(path.join(out, name), await r.text());
    console.log(`saved ${name}`);
  } catch (e) {
    console.warn(`could not save ${name}: ${e.message}`);
  }
}

/** A fresh phone-sized browser; `desk` skips the door and the terms. */
async function phone({ theme = "dark", desk = true } = {}) {
  const ctx = await b.newContext({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "en-GB",
    timezoneId: "Europe/London",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    reducedMotion: "reduce"
  });
  await ctx.addInitScript(({ theme, desk, TERMS }) => {
    try {
      localStorage.setItem("agdesk-theme", theme);
      if (desk) {
        localStorage.setItem("agdesk.seen", "1");
        localStorage.setItem("agdesk.terms", TERMS);
        localStorage.setItem("agdesk.navmode", "pro");
      } else {
        localStorage.removeItem("agdesk.seen");
        localStorage.removeItem("agdesk.terms");
      }
    } catch {}
  }, { theme, desk, TERMS });
  return ctx;
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(out, name + ".jpg"), type: "jpeg", quality: 92 });
  console.log(`shot ${name}`);
}

async function scrollTo(page, sel, offset = 70) {
  await page.evaluate(([s, o]) => {
    const el = document.querySelector(s);
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - o);
  }, [sel, offset]);
  await page.waitForTimeout(700);
}

await json("pulse.json", `${SITE}/api/pulse`);
await json("feed.json", `${SITE}/api/feed`);

// The door, as a first-time visitor sees it; then the terms page.
{
  const ctx = await phone({ desk: false });
  const p = await ctx.newPage();
  await p.goto(SITE + "/", { waitUntil: "load" });
  await p.waitForTimeout(3500);
  await shot(p, "door");
  await p.click("text=Enter the desk");
  await p.waitForTimeout(1500);
  await shot(p, "terms");
  await ctx.close();
}

// The desk in Noir and in Blanc.
for (const theme of ["dark", "light"]) {
  const tag = theme === "dark" ? "noir" : "blanc";
  const ctx = await phone({ theme });
  const p = await ctx.newPage();
  await p.goto(SITE + "/#HOME", { waitUntil: "load" });
  await p.waitForTimeout(5000);
  await shot(p, `home-${tag}`);
  await scrollTo(p, ".inst-mood", 40);
  await shot(p, `mood-${tag}`);
  if (theme === "dark") {
    await scrollTo(p, ".inst-brief");
    await shot(p, "brief");
    await scrollTo(p, ".inst-next", 90);
    await shot(p, "next");
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.click(".navtoggle");
    await p.waitForTimeout(1200);
    await shot(p, "menu");
  }
  await ctx.close();
}

// The other screens, each in a fresh page so nothing carries over.
const SCREENS = [
  ["CHT", "chart", 12000],
  ["CAL", "calendar", 2500],
  ["MEME", "meme", 3000],
  ["DOOM", "doom", 6000],
  ["FX", "fx", 4000],
  ["WLD", "world", 9000],
  ["AGN", "analyst", 2500]
];
for (const [code, name, wait] of SCREENS) {
  const ctx = await phone();
  const p = await ctx.newPage();
  await p.goto(`${SITE}/#${code}`, { waitUntil: "load" });
  await p.waitForTimeout(wait);
  await shot(p, name);
  await ctx.close();
}

fs.writeFileSync(path.join(out, "meta.json"), JSON.stringify({ site: SITE, at: new Date().toISOString() }, null, 2));
await b.close();
console.log("done");
