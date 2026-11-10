# agdesk — notes for Claude

Read this instead of exploring. Grep for the names below; do not read `app/page.jsx` whole.

## Layout
- `app/page.jsx` (3,000 lines, the entire UI). Find things by grep: `function TVWidget`, `function Grid`, `function Block`, `function FXScreen`, `screen === "MAC"` (one block per screen code: HOME, WLD, ASIA, EMEA, AMER, GRN, SFT, MAC, FX, DOOM, JRN...).
- `app/globals.css` — all styles, one line per rule. `.grid/.grow/.gnm/.gpx/.gch` is the three-column quote grid; `.srcs` is the source-link list.
- `lib/tv.js` — every TradingView symbol (`TAPE`, `TV_GROUPS` keyed by screen code).
- `lib/content.js` — static copy, `FALLBACK_FEED` (shown when no live read), `ZONES`.
- `lib/quotes.mjs` — verified figures per zone (ECB FX, Treasury curve, BIS rates, FRED).
- `lib/news.mjs`, `lib/providers.mjs` — free headlines and the Gemini/Anthropic writers.
- `scripts/feed-read.mjs` — the scheduled read. Schema is `READ_TOOL`; output goes to Supabase `market_reads`, served by `app/api/feed/route.js`, read in the page as `reads[zone]` (`ag` is the agricultural one).
- `.github/workflows/feed.yml` — crons for the reads. Manual run: Actions → Market reads.
- `proxy.js` — Next.js 16 uses this, not `middleware.js` (adding one breaks the build).
- There is no `/api/fx` route; the FX screen shows an "unavailable" message by design until one exists.

## TradingView widget rules (learned the hard way)
- The free widget only quotes some feeds. Working: `INDEX:`, `FOREXCOM:` (SPXUSD, NSXUSD, UKXGBP), `BSE:`, `TSX:TSX`, `BMFBOVESPA:`, `SSE:`, `SZSE:`, `EURONEXT:AEX`, `BME:IBC`, `OMXSTO:`, `CMCMARKETS:` metals/cotton, `TVC:USOIL`.
- Blank or error: `CBOT:`, `NYMEX:`, `ICEUS:`, `ICEEUR:` futures; `TVC:` yields; `CBOE:`; `AMEX:`; `ASX:`, `NZX:`, `TSE:`, `TWSE:`, `NSE:`, `MIL:`, `BIST:`, `TADAWUL:`, `JSE:`; `PEPPERSTONE:AU200AUD`; `FOREXCOM:DJI`.
- A symbol existing on tradingview.com does not mean the widget shows it. Remove a blank row rather than guess a replacement.
- Iframes that change config need a `key` or React keeps the old one.

## Working rules
- Verify with `npx next build` before pushing. Push to `main`; Vercel deploys automatically.
- Ship patches (commits), never bulk copies of the repo.
- Never give the owner a command containing a placeholder value.
- Running costs must stay at zero: Gemini free tier first, Anthropic only as fallback.
- Supabase `service_role` key is server-only: never `NEXT_PUBLIC_`, never in the browser.

## State at 10 Nov 2026 (update or delete as items close)
Done: widget symbols cleaned in `lib/tv.js`; widget re-mounts per screen; agricultural read publishes a `macro` array shown on MAC (falls back to the 20 Oct snapshot until a read lands); DOOM sources and watch-item layout fixed; FX screen shows an "unavailable" message.

Not yet confirmed on the live site:
- `INDEX:FTSEMIB` (EMEA), `BLACKBULL:US30` (AMER).
- GRN, SFT and MAC widgets (`BMFBOVESPA:`, `CMCMARKETS:`, `TVC:USOIL`, `TVC:UKOIL`).
- The macro section: needs one run of the Market reads action, zone `ag`, phase `close`.
- USD/TRY in the EMEA verified figures.

Open tasks:
1. Check the items above; remove anything still blank.
2. Build `/api/fx` so the Currencies screen has data.
3. Split `app/page.jsx` into one file per screen.
4. Key rotation (owner does this by hand; never ask for keys in chat):
   - Anthropic key: used as `ANTHROPIC_API_KEY` in Vercel env and GitHub Actions secrets. Set a spend cap at the same time.
   - Groq key: used only by the tradebot on the Pi, not by this repo.
   - Google OAuth client secret: used by the Supabase Auth Google provider, not by this repo's env.
