/**
 * Everything on Ledge Desk, in plain words, for /info. Grouped the way the
 * menu is (lib/nav.js). Keep it true to what the site does: when a screen is
 * added or changes, update its line here too. `account: true` marks features
 * that need a (free) account.
 */

export const FEATURE_AREAS = [
  {
    id: "today",
    t: "Today",
    lede: "What is happening now, in one place.",
    items: [
      { c: "HOME", t: "Home", d: "Five dials (S&P 500, FTSE 100, the mood dial, gold and AI exposure), the hour's headline from each region, a countdown to the next major release and the S&P 500 session so far." },
      { c: "NEWS", t: "News", d: "Free headlines from named publishers across finance, politics, international relations and law, refreshed through the day." },
      { c: "CAL", t: "Calendar", d: "Every scheduled rate decision and major release (Fed, ECB, Bank of England, Bank of Japan, US jobs and inflation and more) with countdowns in your own time zone, filters, and downloads to Google or Apple Calendar." },
      { c: "GEO", t: "Political risk", d: "Flashpoints around the world, how much reporting each is getting, what they would disturb, and live ship and aircraft traffic at the shipping chokepoints." }
    ]
  },
  {
    id: "markets",
    t: "Markets",
    lede: "Prices, charts and the questions traders actually ask.",
    items: [
      { c: "CHT", t: "Charts", d: "Full charts with drawing tools and indicators, one, two or four at once. Type CHT GOLD in the command bar to open gold." },
      { c: "WLD", t: "World", d: "All 29 exchanges with their local clocks and whether each is open right now." },
      { c: "ASIA", t: "Asia, EMEA, Americas", d: "A written read of each region's session (open, midday, close), updated hourly, with the figures behind it." },
      { c: "FX", t: "Currencies", d: "Policy rates, two-year yields and hedge-fund positioning for the major currencies, and the releases that move them." },
      { c: "SOV", t: "Sovereign debt", d: "Countries restructuring their debt, the roles of the IMF, World Bank, Paris Club and Common Framework, the law on holdout creditors, and who any developing country owes, from World Bank data." },
      { c: "INS", t: "Insider buying", d: "Company officers and directors buying their own shares on the open market, read from every SEC Form 4, with clusters where three or more insiders buy within two weeks." },
      { c: "BVB", t: "Bull vs bear", d: "Two AI writers argue for and against a large US stock using only figures from its SEC filings; a third judges. Every number is checked against the filings." },
      { c: "MAC", t: "Macro", d: "The dollar, crude oil, interest rates, freight and fertiliser." },
      { c: "MEME", t: "Meme stocks", d: "What r/wallstreetbets is talking about, hourly, and whether the price is moving with the talk." },
      { c: "DOOM", t: "Doomsday", d: "The case that AI stocks are a bubble, laid out in full, with an hourly note on where each part of the argument stands now and the strongest case against it." },
      { c: "FLOW", t: "Flows", d: "The world's largest movements of money, and what each is and is not evidence for." }
    ]
  },
  {
    id: "commod",
    t: "Commodities",
    lede: "A full agricultural desk.",
    items: [
      { c: "DESK", t: "Ag brief", d: "The agricultural commodities read, with the reasoning behind each line." },
      { c: "GRN", t: "Grains", d: "Grain and oilseed prices and the levels that matter." },
      { c: "SFT", t: "Softs", d: "Coffee, cocoa and sugar." },
      { c: "TRD", t: "Underrated", d: "Markets the coverage is missing, checked for contradictions." },
      { c: "WCH", t: "Watch", d: "What decides the next few sessions." }
    ]
  },
  {
    id: "learn",
    t: "Learn",
    lede: "From never having traded to reading the market for yourself.",
    items: [
      { c: "START", t: "Start", d: "Where to begin if you have never traded." },
      { c: "TUT", t: "Tutorials", d: "Sixteen lessons from zero, also readable without the desk at ledgedesk.com/learn." },
      { c: "RISK", t: "Risk", d: "How money is actually lost: the evidence and the six ways it happens." },
      { c: "GLOS", t: "Glossary", d: "Every term in plain English, also at ledgedesk.com/glossary." },
      { c: "MTD", t: "Method", d: "Nine lessons on reading a market the way a desk does." },
      { c: "ECON", t: "Economics, Law, Intl Rel, Politics", d: "The models, cases and theories you are examined on, each applied to today's news." },
      { c: "SEM", t: "Seminar", d: "Turn any framework and today's news into a contribution, an essay plan or an exam answer." },
      { c: "TRK", t: "Track record", d: "How the site's own signals (insider clusters, meme labels, bull-vs-bear verdicts, the mood dial) did afterwards against the S&P 500. Too few cases are shown as too early, never as numbers." },
      { c: "SRC", t: "Sources", d: "Where the current reads came from." }
    ]
  },
  {
    id: "desk",
    t: "My desk",
    lede: "Your own corner of the site.",
    items: [
      { c: "AGN", t: "Analyst", d: "Ask anything. It reads the live desk and remembers the conversation. \"Summarise this screen\" works from any screen." },
      { c: "POS", t: "My positions", d: "Link your broker to see what you hold and how it stands, read-only through SnapTrade (Schwab, Fidelity, E*TRADE, Robinhood, Interactive Brokers, Webull, Trading 212 and others). Ledge Desk can never trade or move money. Or type positions in, or import your broker's CSV, kept on your device only, with a stop and target for each.", account: "to link a broker" },
      { c: "WL", t: "Watchlist", d: "Your own symbols with live quotes. Saved to your account so it follows you between devices; works in the browser without one." },
      { c: "ALR", t: "Alerts", d: "Notifications on your phone or computer for release times, price levels, headline words and Doomsday verdict changes. No app needed.", account: true },
      { c: "JRN", t: "Journal", d: "Your own daily read of the market, saved privately to your account.", account: true },
      { c: "SET", t: "Settings", d: "Sign in, use your own AI key, and see your usage." }
    ]
  }
];

/** Things that work everywhere rather than on one screen. */
export const ACROSS = [
  { t: "Command bar", d: "Press / and type a code (CAL, FX, POS) or a shortcut such as CHT GOLD, WL EURUSD or CAL USD." },
  { t: "Search the menu", d: "Search screen names, codes and descriptions; naming a market offers its chart." },
  { t: "Essential or Full desk", d: "Start with the essentials and switch to the full desk when you want everything." },
  { t: "Plain English", d: "Turn it on and jargon anywhere on screen becomes tappable for a plain explanation." },
  { t: "Noir and Blanc", d: "A dark and a light theme with the same look." },
  { t: "Install it like an app", d: "Add Ledge Desk to your phone's home screen or install it from Chrome or Edge. Needed for alerts on an iPhone." },
  { t: "Share today's card", d: "A one-image summary of today's markets for your phone's share sheet." },
  { t: "Ask from anywhere", d: "\"Ask the analyst\" buttons on calendar releases, countries, positions and meme stocks send the context with your question." }
];

/** Reading pages that work without the desk. */
export const PAGES = [
  { href: "/about", t: "About", d: "Who made Ledge Desk, why, and how the AI parts are kept in check." },
  { href: "/learn", t: "Lessons", d: "The sixteen tutorials as ordinary web pages." },
  { href: "/glossary", t: "Glossary", d: "Every term, one page each." },
  { href: "/articles", t: "Articles", d: "Reviewed articles by readers. Anyone with an account can submit one." },
  { href: "/account", t: "Account", d: "Your details, sign out, and delete your account and everything in it." },
  { href: "/privacy", t: "Privacy", d: "What is kept about you, why, and who else handles it." },
  { href: "/accessibility", t: "Accessibility", d: "How the site is built to be usable, and its known limits." }
];

/** How the information gets there, so readers can judge it. */
export const HOW = [
  "Prices are delayed and come from free public sources (Yahoo Finance, Stooq, TradingView's free widgets, central banks, the US Treasury, the ECB, the World Bank, the SEC, the IMF and the CFTC).",
  "The written reads are drafted by AI every hour from those figures and named publishers' headlines, and are told never to invent a number.",
  "Reference material (lessons, glossary, method, terms, the Doomsday argument) is written by hand and is not rewritten by the AI.",
  "Nothing on the site is a recommendation to buy or sell anything, and the site never trades for you."
];
