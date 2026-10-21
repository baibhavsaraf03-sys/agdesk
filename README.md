# Ag Desk

An open-access markets terminal. 29 world exchanges by trading session, agricultural commodities in depth, sixteen tutorials that assume you have never traded anything, 38 academic frameworks you can apply to live events, and an analyst you can question.

Everything except the analyst and the journal works with no account at all.

---

## What's in it

| Screen | What it does |
|---|---|
| `START` | Front door for someone who has never traded |
| `RISK` | How money is actually lost — the regulator data and the six mechanisms |
| `TUT` | Sixteen tutorials in four tracks: basics, futures, options, doing it safely |
| `GLOS` | 47 terms in plain English, also usable inline across the whole site |
| `WLD` | All 29 exchanges with live local clocks and open/closed status |
| `ASIA` `EMEA` `AMER` | Session reads, refreshed at the open, midday and close of five zones |
| `DESK` `GRN` `SFT` `TRD` `WCH` `MAC` | Agricultural commodities |
| `FLOW` | The world's largest capital reallocations, with what each is and is not evidence for |
| `ECON` `LAW` `IR` `POL` | 38 frameworks students are examined on, each applicable to today's reads |
| `SEM` | Turns any framework plus today's news into a seminar contribution, essay plan or exam answer |
| `MTD` | The nine-part method for reading a market |
| `JRN` | Your own daily read, saved to your account |
| `AGN` | The analyst |
| `SET` | Sign in, your own API key, usage |
| `TERMS` | Terms of use, the disclaimer, and exactly what is stored |

Type a code in the command bar, or tap the strip. `HELP` lists everything. `↑` and `↓` walk your command history.

---

## Going public

The two halves of this have completely different economics, and that is the whole strategy.

**Fixed cost, unlimited audience.** The market reads cost the same whether one person reads them or a hundred thousand do: sixteen scheduled jobs a day, a few tens of dollars a month. The tutorials, glossary, frameworks, flows, risk primer and world clock cost nothing to serve at all. That is most of the site, and it should be fully open with no account.

**Variable cost per user.** Only the analyst scales with traffic. So that is the only thing behind an account, and it has three separate brakes:

1. **Per account** — `FREE_DAILY_MESSAGES`, default 20 a day, tracked in the database so private windows do not reset it.
2. **Site-wide** — `GLOBAL_DAILY_MESSAGE_CAP`, a single counter across every user. This one number decides your worst possible day. At 2,000 Haiku messages that is roughly $1.
3. **Provider** — a hard monthly spend limit on the key itself in the Anthropic console.

When the global cap trips, the analyst returns a clear message and everything else keeps working. The site degrades rather than breaking, and you cannot be surprised by a bill.

### Keeping yourself unlimited

Sign in once, find your id under **Authentication → Users** in Supabase, then:

```sql
update public.profiles
   set plan = 'pro', daily_override = 1000000
 where user_id = 'YOUR-UUID-HERE';
```

That lifts your per-account cap. To also exempt yourself from the global breaker, add the same id to `ADMIN_USER_IDS`. Your usage still bills to your key, but at Haiku prices personal use is pennies a month.

### What actually breaks at scale

Vercel's free tier covers a few hundred daily visitors comfortably. Past that you want Pro at $20 a month, mostly for function invocations. Supabase's free tier allows 50,000 monthly active users and 500MB, which the journal will not trouble for a long time. Neither is the binding constraint — the analyst is, and the caps above handle it.

## Cost model

Two tiers, chosen so that running this cannot produce a surprise bill.

**Free, no account:** every screen except the analyst and the journal. No cost to you, no limit.

**Free account:** 20 analyst messages a day plus a journal that saves. On Haiku this runs at roughly 2,000 exchanges per dollar, so a hundred daily users costs about a dollar a day.

**Bring your own key:** a user pastes their own Anthropic key in `SET`, and their usage is billed to them by Anthropic rather than to you. No limit, no account needed. The key lives in their browser and is sent to your server only to make the request — it is never stored.

The scheduled reads are the larger line. Sixteen runs a day on Sonnet with web search enabled; budget in the low tens of dollars a month and check your first week's actual usage before assuming.

**Set a hard spend cap on the API key in the Anthropic console before you deploy.** Open access with an uncapped key is how people wake up to a four-figure bill.

---

## Where the numbers come from

Real-time equity index levels are a licensed product. Every free data API — Twelve Data, Finnhub, Alpha Vantage — permits internal, non-display use only; public display starts at their business tiers. Scraping Yahoo through `yfinance` or `yahoo-finance2` works technically but their terms prohibit redistribution. For an open-access site that is the binding constraint, so the data is split three ways:

**Public-domain figures, stored and reasoned over.** `lib/quotes.mjs` pulls Treasury par yields, ECB reference exchange rates, the ECB main refinancing rate and the Bank of England Bank Rate — all published by the issuing institution and free to redistribute. With a free `FRED_API_KEY` it adds EIA oil prices, the Fed's broad dollar index and fertiliser PPI. These are fetched before each scheduled read, written into the database, and passed to the model as facts it must not contradict.

**Equity index levels, displayed only.** TradingView's embedded widgets carry licensed data and are meant for public sites. The numbers stay inside their iframe, so our code cannot read them — which is the trade for not paying a display licence. Symbol groups live in `lib/tv.js`; a tile that renders blank means the symbol was renamed, and correcting it there is the whole fix.

**Everything else, researched.** The model searches for what moved and why, and writes the interpretation. It no longer produces the quote grid, because asking a language model to remember numbers is the one thing guaranteed to go wrong.

Verify every source at any time, no keys needed:

```bash
node scripts/check-quotes.mjs          # all zones
node scripts/check-quotes.mjs ams eur  # just these
```

Government endpoints change shape occasionally. That script tells you which one stopped answering instead of leaving you to infer it from a thin read.

## Setup

Four services, about an hour. Nothing here needs a terminal beyond the last step.

### 1. Supabase — database and sign-in

1. Create a project at [supabase.com](https://supabase.com). The free tier is enough.
2. Open the **SQL Editor**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql), and run it. It is safe to re-run.
3. Go to **Authentication → Providers**, enable **Google**, and follow its instructions to create OAuth credentials in Google Cloud Console. Set the authorised redirect URI to the one Supabase shows you.
4. Go to **Project Settings → API** and copy three values: the project URL, the `anon` public key, and the `service_role` key.

The `service_role` key bypasses every access rule. It goes in server environment variables only — never in anything prefixed `NEXT_PUBLIC_`.

### 2. Anthropic — the analyst and the reads

1. Create a key at [console.anthropic.com](https://console.anthropic.com).
2. Set a monthly spend limit on it. Do this now rather than later.

### 3. Vercel — hosting

1. Push this repository to GitHub.
2. Import it at [vercel.com](https://vercel.com). It will detect Next.js automatically.
3. Add these environment variables in **Project Settings → Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
AGENT_MODEL             = claude-haiku-5-5
FREE_DAILY_MESSAGES     = 20
NEXT_PUBLIC_SITE_URL    = https://your-domain.com
```

4. Deploy.
5. Go back to Supabase, **Authentication → URL Configuration**, and add `https://your-domain.com/auth/callback` to the redirect allow list. Sign-in fails silently if you skip this.

### 4. GitHub Actions — the scheduled reads

In your repository, **Settings → Secrets and variables → Actions**, add three secrets:

```
ANTHROPIC_API_KEY
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Optionally add a repository *variable* `FEED_MODEL` if you want something other than `claude-sonnet-5-5`.

Then go to the **Actions** tab, pick **Market reads**, and use **Run workflow** to fire one by hand before trusting the schedule. Pick zone `ams`, phase `close`. If it succeeds, the Americas screen fills in within five minutes.

---

## Local development

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

Run a single read locally:

```bash
node scripts/feed-read.mjs --zone eas --phase open
```

---

## The schedule

Sixteen reads a day. Cron in GitHub Actions is UTC and does not follow daylight saving, so the local times below drift by an hour twice a year. That does not matter much for a market read; adjust the workflow if it bothers you.

| Zone | Open | Midday | Close |
|---|---|---|---|
| Australia / NZ | 10:12 Sydney | 12:13 | 16:34 |
| East Asia | 09:41 Hong Kong | 12:19 | 17:06 |
| India | 09:26 Mumbai | 12:08 | 15:44 |
| Europe / MEA | 09:14 London | 12:21 | 17:42 |
| Americas | 09:41 New York | 12:16 | 16:21 |

Plus the agricultural read at 06:42 London.

Times sit off the hour deliberately. Every scheduled job on every platform fires at `:00`, and queue delay there is real. Each read is also timed to land *after* the event it reports — Mumbai's open read runs at 09:26 because the NSE opens at 09:15.

---

## Architecture

```
app/
  page.jsx              the terminal, one client component
  api/agent/route.js    server-side Claude proxy: daily cap, BYOK bypass
  api/journal/route.js  journal CRUD, filtered by row-level security
  api/feed/route.js     public read of published market reads
  auth/callback/        OAuth code exchange
lib/
  content.js            exchanges, glossary, method, tutorials, risk
  disciplines.js        38 frameworks across economics, law, IR, politics
  flows.js              12 structural capital flows
  supabase-browser.js   anon client, safe to ship
  supabase-server.js    cookie-scoped and service-role clients, server only
scripts/feed-read.mjs   one scheduled market read
supabase/schema.sql     tables and row-level security
proxy.js                refreshes the auth session on every request
```

Three deliberate choices:

**The API key never reaches the browser.** All model calls go through `/api/agent`. A key in client-side code is a key anyone can take.

**Rate limiting is in the database, not the application.** `bump_agent_usage` is an atomic upsert returning the new count, so two requests racing cannot both slip under the cap.

**Journal privacy is enforced by row-level security.** Even if the API route had a bug, the database would refuse to return another account's rows.

### Adding paid plans later

The hook is already in place, so this is not a rewrite. `profiles.plan` defaults to `free` and a row is created automatically on sign-up. The `daily_cap` function maps plan to a message limit — currently `free` → your `FREE_DAILY_MESSAGES`, `plus` → 200, `pro` → 1000 — and the agent route reads it on every request. `profiles.daily_override` lets you set a cap for one account without touching plans.

Nothing in the app can write `plan`: there is no update policy, so only the service role can change it. To add payments you would add a Stripe webhook route that verifies the signature and writes `plan` with the service-role client. That is the whole integration.

---

## Adapting it

The content modules are plain data. Add a framework to `lib/disciplines.js` and it appears on its discipline screen and in the seminar workbench automatically. Add an exchange to `EXCHANGES` in `lib/content.js` and the world clock picks it up. Add a zone by extending `ZONE_SPEC` in the feed script, `ZONES` in `lib/content.js`, and the workflow's cron list.

---

## What this is not

It is not investment advice, and the interface says so in several places on purpose. Futures and options are leveraged instruments where losses can exceed the amount deposited, and every regulator that has studied retail derivatives trading has found most participants lose money. The `RISK` screen exists because omitting that would make the rest actively harmful.

It also carries no market-data vendor's feed and no vendor's branding. Figures come from the public sources each read cites.

The `TERMS` screen carries a disclaimer, a plain statement of what is and is not stored, and an academic-honesty note. It is written to be honest rather than to be legally sufficient for you.

**Replace it before you take payment from anyone.** Educational material is one thing; charging for something that resembles financial advice is regulated in most jurisdictions, including under the FCA in the UK. Get terms drafted for your jurisdiction.
