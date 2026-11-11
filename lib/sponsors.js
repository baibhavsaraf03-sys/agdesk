/**
 * Sponsorship.
 *
 * A sponsor supports a section. They get a labelled line at the top of it and
 * nothing else: no say over what is written, no sight of it beforehand, and
 * no placement of a trade, a price target or a recommendation. That last rule
 * is the one that keeps this on the right side of the US anti-touting rule
 * (Securities Act s.17(b)), which is about being paid to publicise a
 * security, and of the FTC's requirement that paid relationships are
 * disclosed clearly.
 *
 * To add a sponsor, add an entry to SPONSORS and push. Dates are inclusive,
 * in UTC; an entry outside its dates is simply not shown.
 *
 *   { screen: "GRN", name: "Example Grain Co", url: "https://example.com",
 *     line: "Grain logistics across the Midwest.", from: "2026-12-01", to: "2026-12-31" }
 */

/** What can be sponsored. `price` is US dollars a month; null shows "on request". */
export const SPONSOR_SLOTS = [
  { screen: "HOME", label: "Home", what: "The daily front page: headlines and verified figures.", price: null },
  { screen: "NEWS", label: "News", what: "The four news streams.", price: null },
  { screen: "GEO", label: "Political risk", what: "Flashpoints and what they would disturb.", price: null },
  { screen: "WLD", label: "World markets", what: "The global benchmark screen.", price: null },
  { screen: "ASIA", label: "Asia session", what: "The Asia-Pacific session read.", price: null },
  { screen: "EMEA", label: "Europe session", what: "The Europe, Middle East and Africa session read.", price: null },
  { screen: "AMER", label: "Americas session", what: "The Americas session read.", price: null },
  { screen: "DESK", label: "Agricultural brief", what: "The daily agricultural read.", price: null },
  { screen: "GRN", label: "Grains", what: "Corn, soybeans and wheat.", price: null },
  { screen: "SFT", label: "Softs", what: "Coffee, cocoa, sugar and cotton.", price: null },
  { screen: "TUT", label: "Tutorials", what: "The lessons, from zero.", price: null }
];

/** Live and scheduled sponsorships. Empty until one is sold. */
export const SPONSORS = [];

/** The sponsorships running on a given day. */
export function activeSponsors(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return SPONSORS.filter(
    (s) => s && s.screen && s.name && (!s.from || s.from <= today) && (!s.to || s.to >= today)
  ).map(({ screen, name, url, line }) => ({
    screen,
    name,
    line: line || "",
    url: /^https:\/\//.test(url || "") ? url : ""
  }));
}
