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
 * resolves simply renders blank, so if a tile looks empty, correct it here Ã¢â‚¬â€
 * search the symbol on tradingview.com and use the EXCHANGE:TICKER form shown
 * in the chart header.
 */

/** Matches --surface in globals.css, so the widgets sit flush with the panels. */
const PANEL = "#0b1613";

/** The scrolling band at the top of the market screens. */
export const TAPE = [
  { proName: "SP:SPX", title: "S&P 500" },
  { proName: "NASDAQ:IXIC", title: "Nasdaq" },
  { proName: "TVC:UKX", title: "FTSE 100" },
  { proName: "XETR:DAX", title: "DAX" },
  { proName: "TVC:NI225", title: "Nikkei" },
  { proName: "TVC:HSI", title: "Hang Seng" },
  { proName: "NSE:NIFTY", title: "Nifty 50" },
  { proName: "TVC:DXY", title: "Dollar index" },
  { proName: "TVC:GOLD", title: "Gold" },
  { proName: "NYMEX:CL1!", title: "WTI" }
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
        ["TVC:NI225", "Nikkei 225"],
        ["TSE:TOPIX", "TOPIX"],
        ["KRX:KOSPI", "KOSPI"],
        ["TVC:HSI", "Hang Seng"],
        ["SSE:000001", "SSE Composite"],
        ["SZSE:399001", "SZSE Component"],
        ["TWSE:IX0001", "TAIEX"],
        ["TVC:STI", "Straits Times"]
      ]
    },
    {
      name: "India",
      symbols: [
        ["NSE:NIFTY", "Nifty 50"],
        ["NSE:BANKNIFTY", "Nifty Bank"],
        ["BSE:SENSEX", "Sensex"]
      ]
    },
    {
      name: "Australia & New Zealand",
      symbols: [
        ["ASX:XJO", "S&P/ASX 200"],
        ["ASX:XAO", "All Ordinaries"],
        ["NZX:NZ50G", "S&P/NZX 50"]
      ]
    }
  ],
  EMEA: [
    {
      name: "Europe",
      symbols: [
        ["TVC:UKX", "FTSE 100"],
        ["TVC:SXXP", "STOXX Europe 600"],
        ["XETR:DAX", "DAX"],
        ["EURONEXT:PX1", "CAC 40"],
        ["EURONEXT:AEX", "AEX"],
        ["SIX:SMI", "SMI"],
        ["MIL:FTSEMIB", "FTSE MIB"],
        ["BME:IBC", "IBEX 35"],
        ["OMXSTO:OMXS30", "OMXS30"]
      ]
    },
    {
      name: "Middle East & Africa",
      symbols: [
        ["BIST:XU100", "BIST 100"],
        ["TADAWUL:TASI", "TASI"],
        ["JSE:J203", "FTSE/JSE All-Share"]
      ]
    }
  ],
  AMER: [
    {
      name: "United States",
      symbols: [
        ["SP:SPX", "S&P 500"],
        ["NASDAQ:IXIC", "Nasdaq Composite"],
        ["DJ:DJI", "Dow Jones"],
        ["TVC:RUT", "Russell 2000"],
        ["TVC:VIX", "VIX"]
      ]
    },
    {
      name: "Rest of the Americas",
      symbols: [
        ["TSX:TSX", "S&P/TSX Composite"],
        ["BMV:ME", "S&P/BMV IPC"],
        ["BMFBOVESPA:IBOV", "Ibovespa"]
      ]
    }
  ],
  WLD: [
    {
      name: "Benchmarks by session",
      symbols: [
        ["ASX:XJO", "S&P/ASX 200"],
        ["TVC:NI225", "Nikkei 225"],
        ["TVC:HSI", "Hang Seng"],
        ["NSE:NIFTY", "Nifty 50"],
        ["TVC:UKX", "FTSE 100"],
        ["XETR:DAX", "DAX"],
        ["SP:SPX", "S&P 500"],
        ["BMFBOVESPA:IBOV", "Ibovespa"]
      ]
    }
  ],
  GRN: [
    {
      name: "Grains & oilseeds",
      symbols: [
        ["CBOT:ZC1!", "Corn"],
        ["CBOT:ZS1!", "Soybeans"],
        ["CBOT:ZW1!", "Chicago wheat"],
        ["CBOT:KE1!", "KC hard red winter wheat"],
        ["CBOT:ZM1!", "Soybean meal"],
        ["CBOT:ZL1!", "Soybean oil"],
        ["CBOT:ZR1!", "Rough rice"]
      ]
    }
  ],
  SFT: [
    {
      name: "Softs",
      symbols: [
        ["ICEUS:KC1!", "Arabica coffee"],
        ["ICEUS:CC1!", "Cocoa"],
        ["ICEUS:SB1!", "Sugar no. 11"],
        ["ICEUS:CT1!", "Cotton no. 2"],
        ["ICEUS:OJ1!", "Orange juice"]
      ]
    }
  ],
  MAC: [
    {
      name: "Macro backdrop",
      symbols: [
        ["TVC:DXY", "Dollar index"],
        ["TVC:US10Y", "US 10-year yield"],
        ["TVC:US02Y", "US 2-year yield"],
        ["TVC:DE10Y", "Bund 10-year yield"],
        ["TVC:GB10Y", "Gilt 10-year yield"],
        ["NYMEX:CL1!", "WTI crude"],
        ["ICEEUR:BRN1!", "Brent crude"],
        ["TVC:GOLD", "Gold"]
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
    // that paints no background of its own leaves that showing through Ã¢â‚¬â€ so
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
 * widget's effect keys off it Ã¢â‚¬â€ which tore the iframe down and rebuilt it
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
