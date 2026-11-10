/**
 * Political risk: flashpoints and what each would disturb.
 *
 * Nothing here predicts a war, and the screen says so. What can be done
 * honestly for free is to count how much of today's reporting is about each
 * flashpoint, show which of those headlines use escalation language, and say
 * in advance which shipping lanes, trade flows and air routes sit in the way.
 * A reader who knows the exposure before the headline arrives is not
 * improvising when it does.
 *
 * `match` decides whether a headline belongs to a flashpoint. Each entry is a
 * list of patterns that must ALL be present, and any one entry is enough, so
 * "India ... China" matches but a headline about only one of them does not.
 */

export const FLASHPOINTS = [
  {
    id: "taiwan",
    name: "Taiwan Strait",
    parties: "China · Taiwan · United States",
    match: [[/taiwan|taipei/i], [/\bstrait\b/i, /china|beijing|pla\b/i]],
    why:
      "Beijing claims Taiwan and has not ruled out force; the United States supplies Taiwan's defence without a formal treaty. Military drills around the island are the usual signal of pressure, and they have at times closed sea and air space for days.",
    markers: {
      shipping:
        "The strait is one of the busiest container routes in the world. Closure sends ships around the east of the island, adding time and insurance cost to Asia–Europe and intra-Asia trade.",
      trade:
        "Taiwan makes the large majority of the world's most advanced logic chips. Nothing else on this list has a single point of failure that reaches as far into electronics, cars and data centres.",
      travel:
        "Drill zones cut into the Taipei flight region and the main Japan and Korea to South-East Asia corridors, forcing reroutes and cancellations."
    }
  },
  {
    id: "india-china",
    name: "India–China border",
    parties: "India · China",
    match: [[/\bindia|new delhi|\bmodi\b/i, /china|beijing|\bxi\b/i], [/ladakh|galwan|arunachal|line of actual control/i]],
    why:
      "The Himalayan border is undefined along the Line of Actual Control. The 2020 Galwan Valley clash killed soldiers on both sides, the first deaths there in decades, and both armies have kept large forces forward since.",
    markers: {
      shipping:
        "The dispute is on land, so the direct shipping effect is small. The indirect one is naval: both navies operate in the Indian Ocean, which carries most of China's oil imports.",
      trade:
        "China is one of India's largest sources of imports, especially electronics components and pharmaceutical ingredients. After 2020 India answered with investment screening and app bans rather than tariffs.",
      travel:
        "Direct passenger flights between the two countries were suspended for about five years after 2020. Flight and visa rules are an early, cheap lever for either side."
    }
  },
  {
    id: "russia-nato",
    name: "Russia–NATO",
    parties: "Russia · Ukraine · NATO members",
    match: [[/russia|moscow|kremlin|putin/i, /nato|ukrain|kyiv|baltic|poland|finland|estonia|latvia|lithuania|kaliningrad/i]],
    why:
      "Russia's full-scale invasion of Ukraine began in February 2022. The escalation risk markets watch is the war touching a NATO member directly: airspace violations, sabotage of cables and pipelines, or strikes near the alliance's border.",
    markers: {
      shipping:
        "Russia and Ukraine are both major wheat and sunflower-oil exporters through the Black Sea. In the Baltic, undersea cables and pipelines have been damaged repeatedly since 2022.",
      trade:
        "Western sanctions cut Russian energy out of most European supply, and Europe now pays the world price for liquefied gas. Fertiliser and metals are the less-noticed exposures.",
      travel:
        "Russian airspace is closed to most Western airlines and EU airspace to Russian ones, which lengthens Europe–Asia flights by hours. Ukrainian airspace has been closed to civil flights since the invasion."
    }
  },
  {
    id: "gulf",
    name: "Gulf and Red Sea",
    parties: "Iran · Israel · Gulf states · Yemen's Houthis",
    match: [[/hormuz|red sea|houthi|bab[- ]el[- ]mandeb|suez/i], [/\biran|tehran/i, /israel|strike|sanction|nuclear|tanker|gulf|missile/i]],
    why:
      "Two chokepoints sit either side of the Arabian Peninsula. Conflict involving Iran threatens the Strait of Hormuz; attacks from Yemen threaten the Red Sea approach to the Suez Canal.",
    markers: {
      shipping:
        "Roughly a fifth of the world's oil passes through Hormuz. When Red Sea attacks began in late 2023, most container lines diverted around Africa, adding around ten days to Asia–Europe voyages.",
      trade:
        "Oil and liquefied gas first, then fertiliser, much of which is made from Gulf gas. Longer voyages tie up ships, so freight rates rise on routes that are nowhere near the conflict.",
      travel:
        "The Gulf hubs connect Europe with Asia and Australia. Airspace closures over Iran, Iraq or Israel push those flights onto narrow corridors and add hours."
    }
  }
];

/** Words that mark a headline as about escalation rather than background. */
export const ESCALATION =
  /\b(strikes?|missiles?|troops|invasion|invades?|blockade|drills?|exercises?|mobili[sz]\w*|incursion|shell(?:ed|ing)|clash\w*|warships?|warplanes?|fighter jets?|drones?|nuclear|attack\w*|killed|sabotage|seiz\w+|ultimatum|escalat\w+|retaliat\w+)\b/i;

/** What a headline touches, in the three terms a reader can act on. */
export const MARKERS = [
  { k: "shipping", t: "Shipping", re: /\b(ship\w*|vessels?|tankers?|ports?|strait|canal|freight|blockade|navy|naval|maritime|cargo|cables?|pipelines?)\b/i },
  { k: "trade", t: "Trade", re: /\b(tariffs?|sanction\w*|exports?|imports?|trade|embargo|bans?|supply chains?|chips?|semiconductors?|oil|gas|grain|wheat)\b/i },
  { k: "travel", t: "Air travel", re: /\b(flights?|airspace|airlines?|airports?|aviation|no-fly|visas?)\b/i }
];

const HOURS_72 = 72 * 3600 * 1000;

/**
 * Sort a pile of headlines onto the flashpoints.
 *
 * `level` describes reporting, not probability: how many headlines from the
 * last three days use escalation language. It is a prompt to go and read, and
 * the screen labels it that way.
 */
export function scanFlashpoints(items, now = Date.now()) {
  return FLASHPOINTS.map((f) => {
    const seen = new Set();
    const hits = [];
    for (const it of items || []) {
      const title = String(it?.title || "");
      if (!title || seen.has(title)) continue;
      if (!f.match.some((all) => all.every((re) => re.test(title)))) continue;
      seen.add(title);
      const t = Date.parse(it.when || "");
      hits.push({
        ...it,
        recent: isFinite(t) ? now - t < HOURS_72 : false,
        hot: ESCALATION.test(title),
        tags: MARKERS.filter((m) => m.re.test(title)).map((m) => m.k)
      });
    }
    const hot = hits.filter((h) => h.hot && h.recent).length;
    const level = hot >= 4 ? "elevated" : hot >= 1 ? "watch" : "quiet";
    const touched = MARKERS.filter((m) => hits.some((h) => h.recent && h.tags.includes(m.k))).map((m) => m.k);
    return { ...f, hits, hot, level, touched };
  });
}
