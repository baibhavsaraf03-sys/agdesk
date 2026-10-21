#!/usr/bin/env node
/**
 * Verifies every public-domain quote source, one zone at a time.
 *
 *   node scripts/check-quotes.mjs            # all zones
 *   node scripts/check-quotes.mjs ams eur    # just these
 *
 * Needs no API keys and writes nothing. Run it whenever a read looks thin:
 * government endpoints change shape occasionally, and this tells you which
 * one stopped answering rather than leaving you to guess.
 */

import { fetchQuotes } from "../lib/quotes.mjs";

const ZONES = ["anz", "eas", "ind", "eur", "ams", "ag"];
const picked = process.argv.slice(2).filter((z) => ZONES.includes(z));
const list = picked.length ? picked : ZONES;

let totalRows = 0;
let anyFailed = false;

for (const zone of list) {
  console.log(`\n=== ${zone.toUpperCase()} ===`);
  try {
    const { rows, ok, failed } = await fetchQuotes(zone);
    totalRows += rows.length;

    if (rows.length === 0) console.log("  (no rows)");
    for (const r of rows) {
      const change = r.ch ? `  ${r.ch}` : "";
      console.log(`  ${r.nm.padEnd(34)} ${String(r.px).padStart(14)}${change.padStart(10)}   [${r.src}, ${r.asof}]`);
    }

    if (ok.length) console.log(`  answered: ${ok.join(", ")}`);
    if (failed.length) {
      anyFailed = true;
      failed.forEach((f) => console.log(`  FAILED  ${f}`));
    }
  } catch (err) {
    anyFailed = true;
    console.log(`  ERROR ${err.message}`);
  }
}

console.log(`\n${totalRows} verified rows across ${list.length} zone(s).`);
if (!process.env.FRED_API_KEY) {
  console.log("FRED_API_KEY is not set, so oil, the dollar index and fertiliser PPI are skipped.");
  console.log("A key is free from https://fredaccount.stlouisfed.org/apikeys");
}
process.exit(anyFailed ? 1 : 0);
