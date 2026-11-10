import VERIFIED, { NO_DATA } from "./tv-symbols.js";

/**
 * TradingView widget symbol groups.
 *
 * Why widgets at all: real-time equity index levels are a licensed product.
 * Every free data API forbids displaying them on a public site, and the paid
 * display licences start in the tens of dollars a month. TradingView's
 * embeddable widgets are the one route that is both free and licensed for
 * public display, because the data stays inside their iframe and carries their
 * attribution. The trade-off is that our own code cannot read these numbers,
 * which is why the stored market read quotes only public-domain figures from
 * lib/quotes.mjs and leaves equities to the widgets.
 *
 * Symbols occasionally get renamed on their end. A symbol that no longer
 * resolves simply renders blank, so if a tile looks empty, correct it here —
 * search the symbol on tradingview.com and use the EXCHANGE:TICKER form shown
 * in the chart header.
 */

/** Matches --surface in globals.css, so the widgets sit flush with the panels. */
const PANEL = "#0b1613";

/** The scrolling band at the top of the market screens. */
export const TAPE = [
  { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
  { proName: "FOREXCOM:NSXUSD", title: "Nasdaq" },
  { proName: "FOREXCOM:UKXGBP", title: "FTSE 100" },
  { proName: "INDEX:DEU40", title: "DAX" },
  { proName: "INDEX:NKY", title: "Nikkei" },
  { proName: "INDEX:HSI", title: "Hang Seng" },
  { proName: "BSE:SENSEX", title: "Sensex" },
  { proName: "INDEX:DXY", title: "Dollar index" },
  { proName: "CMCMARKETS:GOLD", title: "Gold" },
  { proName: "TVC:USOIL", title: "WTI" }
];

/**
 * Quote tiles per screen. Keyed by screen code so a screen can show several
 * zones at once, which ASIA does.
 */
export const TV_GROUPS = {
  ASIA: [
    {
      name: "East Asia",
      symbols: [
        ["INDEX:NKY", "Nikkei 225"],
        ["INDEX:KSIC", "KOSPI"],
        ["INDEX:HSI", "Hang Seng"],
        ["SSE:000001", "SSE Composite"],
        ["SZSE:399001", "SZSE Component"],
        ["INDEX:STI", "Straits Times"]
      ]
    },
    {
      name: "India",
      symbols: [
        ["BSE:SENSEX", "Sensex"],
        ["BSE:BSE500", "BSE 500"]
      ]
    }
  ],
  EMEA: [
    {
      name: "Europe",
      symbols: [
        ["FOREXCOM:UKXGBP", "FTSE 100"],
        ["INDEX:SX5E", "EURO STOXX 50"],
        ["INDEX:DEU40", "DAX"],
        ["INDEX:CAC40", "CAC 40"],
        ["EURONEXT:AEX", "AEX"],
        ["INDEX:SMI", "SMI"],
        ["INDEX:FTSEMIB", "FTSE MIB"],
        ["BME:IBC", "IBEX 35"],
        ["OMXSTO:OMXS30", "OMXS30"]
      ]
    }
    // No Middle East & Africa group. Borsa Istanbul, Tadawul and the JSE do
    // not license their indices to the free widget, so BIST 100, TASI and the
    // All-Share rendered as three permanently empty rows. The region is
    // covered by the written read and by the lira and rand in its verified
    // figures (lib/quotes.mjs) instead.
  ],
  AMER: [
    {
      name: "United States",
      symbols: [
        ["FOREXCOM:SPXUSD", "S&P 500"],
        ["FOREXCOM:NSXUSD", "Nasdaq Composite"],
        ["BLACKBULL:US30", "Dow Jones"]
      ]
    },
    {
      name: "Rest of the Americas",
      symbols: [
        ["TSX:TSX", "S&P/TSX Composite"],
        ["BMFBOVESPA:IBOV", "Ibovespa"]
      ]
    }
  ],
  WLD: [
    {
      name: "Benchmarks by session",
      symbols: [
        ["INDEX:NKY", "Nikkei 225"],
        ["INDEX:HSI", "Hang Seng"],
        ["BSE:SENSEX", "Sensex"],
        ["FOREXCOM:UKXGBP", "FTSE 100"],
        ["INDEX:DEU40", "DAX"],
        ["FOREXCOM:SPXUSD", "S&P 500"],
        ["BMFBOVESPA:IBOV", "Ibovespa"],
        ["TSX:TSX", "S&P/TSX Composite"]
      ]
    }
  ],
  GRN: [
    {
      name: "Grains & oilseeds",
      symbols: [
        ["BMFBOVESPA:CCM1!", "Corn"],
        ["BMFBOVESPA:SJC1!", "Soybeans"],
        ["CMCMARKETS:COTTON", "Cotton"]
      ]
    }
  ],
  SFT: [
    {
      name: "Softs & tropicals",
      symbols: [
        ["BMFBOVESPA:ICF1!", "Coffee"],
        ["CMCMARKETS:COTTON", "Cotton"],
        ["CMCMARKETS:GOLD", "Gold"],
        ["CMCMARKETS:SILVER", "Silver"]
      ]
    }
  ],
  MAC: [
    {
      name: "Macro backdrop",
      symbols: [
        ["INDEX:DXY", "Dollar index"],
        ["TVC:USOIL", "WTI crude"],
        ["TVC:UKOIL", "Brent crude"],
        ["CMCMARKETS:GOLD", "Gold"],
        ["CMCMARKETS:SILVER", "Silver"],
        ["CMCMARKETS:COPPER", "Copper"]
      ]
    }
  ]
};

/** Widget payload for the Market Quotes widget on one screen. */
function quotesConfig(screen) {
  const groups = TV_GROUPS[screen];
  if (!groups) return null;
  const live = groups
    .map((g) => ({ ...g, symbols: g.symbols.filter(([, d]) => !NO_DATA.includes(d)) }))
    .filter((g) => g.symbols.length);
  if (!live.length) return null;
  const rows = live.reduce((n, g) => n + g.symbols.length + 1, 0);
  return {
    width: "100%",
    height: Math.min(560, 34 + rows * 30),
    symbolsGroups: live.map((g) => ({
      name: g.name,
      originalName: g.name,
      symbols: g.symbols.map(([name, displayName]) => ({
        name: VERIFIED[displayName] || name,
        displayName
      }))
    })),
    showSymbolLogo: false,
    // Not transparent. An iframe's canvas is white by default, and a widget
    // that paints no background of its own leaves that showing through — so
    // "transparent" reads as "light" however dark the theme is. Painting our
    // own panel colour is the only reliable way to make it match.
    isTransparent: false,
    backgroundColor: PANEL,
    colorTheme: "dark",
    locale: "en"
  };
}

/**
 * Built once at module load, not per render.
 *
 * A config object created inside JSX is a new object every render, and the
 * widget's effect keys off it — which tore the iframe down and rebuilt it
 * continuously, so it flickered and never finished applying its own theme.
 * Freezing the configs here means each one has a stable identity for the life
 * of the page.
 */
export const TV_CONFIGS = Object.freeze(
  Object.fromEntries(Object.keys(TV_GROUPS).map((k) => [k, quotesConfig(k)]))
);

export const TAPE_CONFIG = Object.freeze({
  symbols: TAPE.filter((t) => !NO_DATA.includes(t.title))
    .map((t) => ({ ...t, proName: VERIFIED[t.title] || t.proName })),
  width: "100%",
  height: 46,
  showSymbolLogo: false,
  isTransparent: false,
  backgroundColor: PANEL,
  displayMode: "adaptive",
  colorTheme: "dark",
  locale: "en"
});
