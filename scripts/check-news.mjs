#!/usr/bin/env node
/**
 * Verifies every free news source, one zone at a time.
 *
 *   node scripts/check-news.mjs           # all zones
 *   node scripts/check-news.mjs eur ams   # just these
 *
 * Needs no keys and writes nothing. Run it when a read looks thin: a dead feed
 * degrades one zone quietly, and this names which source stopped answering.
 */

import { fetchNews } from "../lib/news.mjs";

const ZONES = ["anz", "eas", "ind", "eur", "ams", "ag"];
const picked = process.argv.slice(2).filter((z) => ZONES.includes(z));
const list = picked.length ? picked : ZONES;
const verbose = process.argv.includes("--all");

const gdelt = process.env.NEWS_GDELT === "1";
console.log(
  `Checking ${list.length} zone(s) from publisher RSS — no rate limits, so this is quick.` +
    (gdelt ? " GDELT is enabled and will add ~9s per zone." : "")
);

let total = 0;
let anyFailed = false;

process.env.NEWS_VERBOSE = process.env.NEWS_VERBOSE || "1";

for (const zone of list) {
  console.log(`\n=== ${zone.toUpperCase()} ===`);
  const started = Date.now();
  const { items, ok, failed } = await fetchNews(zone);
  const took = Math.round((Date.now() - started) / 1000);
  total += items.length;

  const show = verbose ? items : items.slice(0, 6);
  for (const a of show) console.log(`  ${a.title.slice(0, 96)}  [${a.source}]`);
  if (items.length > show.length) console.log(`  … and ${items.length - show.length} more`);
  if (!items.length) console.log("  (nothing)");

  if (ok.length) console.log(`  answered: ${ok.length} source(s) in ${took}s`);
  if (failed.length) {
    anyFailed = true;
    failed.forEach((f) => console.log(`  FAILED  ${f}`));
  }
}

console.log(`\n${total} headlines across ${list.length} zone(s).`);
console.log("Pass --all to print every headline rather than the first six.");
process.exit(anyFailed ? 1 : 0);
