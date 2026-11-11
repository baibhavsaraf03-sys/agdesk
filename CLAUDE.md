# Ledge Desk (repo: agdesk) — notes for Claude

Read this instead of exploring. Grep for the names below; do not read `app/page.jsx` whole.

## Layout
- `app/page.jsx` (3,000 lines, the entire UI). Find things by grep: `function TVWidget`, `function Grid`, `function Block`, `function FXScreen`, `screen === "MAC"` (one block per screen code: HOME, WLD, ASIA, EMEA, AMER, GRN, SFT, MAC, FX, DOOM, JRN...).
- `app/globals.css` — all styles, one line per rule. `.grid/.grow/.gnm/.gpx/.gch` is the three-column quote grid; `.srcs` is the source-link list.
- `lib/tv.js` — every TradingView symbol (`TAPE`, `TV_GROUPS` keyed by screen code).
- `lib/geo.js` — political-risk flashpoints, keyword matching and the shipping/trade/air-travel markers for the GEO screen. It reads the existing news streams; it measures reporting, never probability.
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

## Naming
- The site is called Ledge Desk (drawn as LEDGE·DESK). The repo, the Vercel URL and the `agdesk.*` localStorage keys keep the old name on purpose: renaming the keys would wipe visitors' saved progress.

## Interface conventions
- No emoji or glyph icons, no feature-card grids, no inline `style={{}}` for new work. Use the tokens and classes in `globals.css`; serif for headings, sans for text, mono only for codes and figures.
- Sidebar order (`NAV_GROUPS`) runs beginner to advanced on purpose: Start here, Your desk, Daily, Markets, Commodities, Disciplines, Advanced.
- The analyst renders from `analystBody(side)` both on the AGN screen and in the side panel (`agnOpen`). `ask(text, shown)` opens the panel; `shown` is the label displayed instead of a long prompt.
- DOOM has a live layer above its tabs: `reads.doom` (zone `doom`, three scheduled reads per US session, news filtered by `AI_TRADE_RE` in `lib/doomsday.js`), a TradingView tile (`TV_GROUPS.DOOM`) and live headlines. The tabs below it are the static argument in `lib/doomsday.js`.
- Reads carry `short` (three plain sentences, shown by `InShort`) and, for `ag`, `macro`.
- To look at the site locally: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=local-dummy npx next build` then `next start` with the same two variables. Without them every page returns a 500. News and widgets are empty offline.

## Money (parked, not live)
- Paid plans (Free 20/day, Plus $20 +100/month, Pro $100 +500/month) and labelled section sponsorship (US visitors only) are built on the `monetization` branch, commit bcf51fe, and reverted from `main` at the owner's request until viability is settled. Do not merge without being asked.
- That branch's `supabase/migrations/20261111_plans.sql` also drops a policy ("Service role manages profiles") from the 2024 profiles migration that lets any signed-in user rewrite any profile. Worth running for that alone.
- The whole UI is one client-rendered page with `#SCREEN` routes, so search engines see a single URL. Any SEO or published-articles work starts with real server-rendered routes (e.g. `/learn/[slug]`, `/glossary/[term]`, `/articles/[slug]`).

## Working rules
- Verify with `npx next build` before pushing. Push to `main`; Vercel deploys automatically.
- Ship patches (commits), never bulk copies of the repo.
- Never give the owner a command containing a placeholder value.
- Running costs must stay at zero: Gemini free tier first, Anthropic only as fallback.
- Supabase `service_role` key is server-only: never `NEXT_PUBLIC_`, never in the browser.

## State at 10 Nov 2026 (update or delete as items close)
Done (10 Nov, second pass): sidebar reordered beginner-first; landing and home rebuilt without icon cards; analyst side panel with "Summarise this screen"; GEO political-risk screen; `short` summaries added to the read schema; widget follows light/dark theme; top bar height bug fixed.

Done earlier: widget symbols cleaned in `lib/tv.js`; widget re-mounts per screen; agricultural read publishes a `macro` array shown on MAC (falls back to the 20 Oct snapshot until a read lands); DOOM sources and watch-item layout fixed; FX screen shows an "unavailable" message.

Not yet confirmed on the live site:
- `INDEX:FTSEMIB` (EMEA), `BLACKBULL:US30` (AMER).
- GRN, SFT and MAC widgets (`BMFBOVESPA:`, `CMCMARKETS:`, `TVC:USOIL`, `TVC:UKOIL`).
- The macro section and the "In short" summaries: appear after the next scheduled read of each zone (or a manual run of the Market reads action).
- DOOM live layer: the `NASDAQ:`/`NYSE:` stock tiles in the widget, and the first `doom` read (run the action with zone `doom`).
- GEO headline matching against live feeds (tested only on sample headlines).
- USD/TRY in the EMEA verified figures.

Open tasks:
1. Check the items above; remove anything still blank.
2. Build `/api/fx` so the Currencies screen has data.
3. Split `app/page.jsx` into one file per screen.
4. Key rotation (owner does this by hand; never ask for keys in chat):
   - Anthropic key: used as `ANTHROPIC_API_KEY` in Vercel env and GitHub Actions secrets. Set a spend cap at the same time.
   - Groq key: used only by the tradebot on the Pi, not by this repo.
   - Google OAuth client secret: used by the Supabase Auth Google provider, not by this repo's env.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
