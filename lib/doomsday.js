/**
 * AI Bubble War Room — "Doomsday" desk.
 *
 * Thesis: AI companies are engaged in circular financing that inflates
 * revenue and capex figures. The Nov 5 2026 crash (-12.25% SOX, -6.3%
 * Nasdaq-100) was the first break. This section maps the loops, the
 * positions, the contagion, and the playbook.
 *
 * All data from public sources. Not financial advice.
 */

export const CRASH_STATS = [
  { label: "Nasdaq-100 wipeout", value: "$2.3T", note: "Single day, Nov 5", tone: "red" },
  { label: "SOX semiconductor", value: "-12.25%", note: "Worst day on record", tone: "red" },
  { label: "VIX spike", value: "+65%", note: "To 27.45, 2yr high", tone: "amber" },
  { label: "Retail selling", value: "$358M", note: "Biggest since Mar 2020", tone: "red" },
];

export const CRASH_TABLE = [
  { ticker: "NVDA",  name: "NVIDIA",    close: "$183.78", drop: "-8.2%",  exposure: "Critical" },
  { ticker: "AMD",   name: "AMD",       close: "$413.75", drop: "-15.4%", exposure: "Critical" },
  { ticker: "MU",    name: "Micron",    close: "$672.86", drop: "-15.4%", exposure: "High" },
  { ticker: "CRWV",  name: "CoreWeave", close: "$41.50",  drop: "-14.3%", exposure: "Critical" },
  { ticker: "AVGO",  name: "Broadcom",  close: "$297.04", drop: "-8.7%",  exposure: "High" },
  { ticker: "ORCL",  name: "Oracle",    close: "$113.25", drop: "-8.5%",  exposure: "Critical" },
  { ticker: "NBIS",  name: "Nebius",    close: "$116.57", drop: "-17.6%", exposure: "High" },
  { ticker: "TSLA",  name: "Tesla",     close: "$344.16", drop: "-10.7%", exposure: "Moderate" },
  { ticker: "META",  name: "Meta",      close: "$593.95", drop: "-5.7%",  exposure: "Critical" },
  { ticker: "MSFT",  name: "Microsoft", close: "$536.66", drop: "-3.4%",  exposure: "Critical" },
];

export const CAPEX_DATA = [
  { year: "2022", capex: 200, revenue: 50 },
  { year: "2023", capex: 300, revenue: 100 },
  { year: "2024", capex: 410, revenue: 180 },
  { year: "2025", capex: 725, revenue: 267 },
  { year: "2027e", capex: 1000, revenue: 400 },
];

export const CAPEX_RATIOS = [
  { name: "Oracle", ratio: 86 },
  { name: "Meta", ratio: 54 },
  { name: "MSFT", ratio: 47 },
  { name: "GOOG", ratio: 46 },
  { name: "AMZN", ratio: 25 },
  { name: "AI Avg", ratio: 34 },
];

export const CIRCULAR_STATS = [
  { label: "OpenAI vendor commits", value: "$1.15T", note: "vs $33B run-rate revenue", tone: "red" },
  { label: "Leverage ratio", value: "35x", note: "Commitments / Revenue", tone: "amber" },
  { label: "Enterprise AI ROI", value: "80%", note: "Fail to deliver value", tone: "red" },
  { label: "Hyperscaler debt 2026", value: "$175B", note: "Up from $120B in 2025", tone: "amber" },
];

export const LOOPS = [
  {
    name: "Microsoft <> OpenAI",
    from: "Microsoft",
    action: "$13B invest",
    to: "OpenAI",
    back: "$250B Azure spend",
    note: "Microsoft invests in OpenAI, OpenAI spends it back on Azure, Microsoft books it as cloud revenue growth. Plus $659M/yr revenue share back to Microsoft."
  },
  {
    name: "NVIDIA <> OpenAI",
    from: "NVIDIA",
    action: "$30B invest",
    to: "OpenAI",
    back: "Buys GPUs",
    note: "NVIDIA invests capital, OpenAI buys NVIDIA chips with it. NVIDIA reports as revenue. Stock rises. NVIDIA invests more."
  },
  {
    name: "AMD Equity-for-Chips",
    from: "AMD",
    action: "160M warrants at $0.01/sh",
    to: "Meta / OpenAI",
    back: "$100B+ chips",
    note: "AMD gives customers equity warrants to buy chips. Customers buy chips, earn equity in the supplier. AMD books it as revenue. Not arm's-length."
  },
  {
    name: "The Neocloud Laundromat",
    from: "NVIDIA",
    action: "Invests in",
    to: "CoreWeave",
    back: "Buys GPUs from NVIDIA",
    note: "NVIDIA invests in CoreWeave, CoreWeave buys NVIDIA GPUs, rents them to OpenAI, who pays with money from NVIDIA and Microsoft. Same money cycling, each entity counting it as revenue. This is the Nortel playbook."
  },
  {
    name: "Startup Revenue Laundering",
    from: "VCs",
    action: "Fund",
    to: "Cursor / Harvey",
    back: "100% to Anthropic / OpenAI",
    note: "Cursor reportedly spends 100% of its revenue on Anthropic. Harvey raised $960M - most flows to OpenAI/Anthropic. VC money becomes 'API revenue'."
  },
];

export const POSITIONS = [
  { tier: 1, ticker: "CRWV", name: "CoreWeave", entry: 43, stop: 52, target: 25, conviction: "high", reason: "Pure neocloud - NVIDIA-financed, burns cash, IPO lockup expiring" },
  { tier: 1, ticker: "NVDA", name: "NVIDIA", entry: 190, stop: 215, target: 130, conviction: "high", reason: "Kingpin of every circular loop, $30B into OpenAI" },
  { tier: 1, ticker: "ORCL", name: "Oracle", entry: 118, stop: 135, target: 75, conviction: "high", reason: "86% capex/revenue, $300B Stargate anchor, massive debt raise" },
  { tier: 2, ticker: "AMD", name: "AMD", entry: 440, stop: 510, target: 300, conviction: "med", reason: "Equity-for-chips warrants, $100B+ Meta deal, overvalued" },
  { tier: 2, ticker: "AVGO", name: "Broadcom", entry: 310, stop: 350, target: 220, conviction: "med", reason: "$350B OpenAI commitment, AI ASIC revenue concentration" },
  { tier: 2, ticker: "MU", name: "Micron", entry: 700, stop: 800, target: 450, conviction: "med", reason: "HBM demand tied to AI buildout, cyclical memory" },
  { tier: 3, ticker: "META", name: "Meta", entry: 610, stop: 680, target: 420, conviction: "med", reason: "54% capex/revenue, $135B AI spend, 160M AMD warrants" },
  { tier: 3, ticker: "QQQ", name: "Nasdaq-100", entry: 490, stop: 530, target: 380, conviction: "low", reason: "Macro AI unwind, broad tech selloff, contagion play" },
];

export const CONTAGION_STATS = [
  { label: "UK food prices since 2021", value: "+50%", note: "Grim milestone Nov 2026", tone: "red" },
  { label: "London flat prices", value: "-7%+", note: "Since start of 2023", tone: "red" },
  { label: "Tech layoffs 2026", value: "100K+", note: "AI cited as #1 reason", tone: "amber" },
  { label: "New builds sold at loss", value: "38%", note: "England & Wales 2025", tone: "red" },
];

export const CONTAGION_CARDS = [
  {
    title: "UK Housing",
    body: "London flats down 7%+ since 2023. Westminster -27%, Kensington -20%. Mortgage costs up £280/mo after Middle East conflict rate spike. 38% of new-build flats selling at a loss. Real-terms losses of 25-30% for London flat owners."
  },
  {
    title: "Food Prices",
    body: "UK food prices on track to rise 50% since 2021 by November 2026. Food inflation still running hot despite headline CPI falling. Lower-income households squeezed hardest. Iran energy shock adding pressure."
  },
  {
    title: "Tech Job Market",
    body: "101,743 AI-driven job cuts through June 2026 - double all of 2025. AI is now the #1 cited reason for layoffs. Microsoft cut 8,750. Oracle 21,000. Amazon 16,000. Meta 9,700. Block cut 40% of staff."
  },
  {
    title: "Hyperscaler Debt Bomb",
    body: "Debt issuance: $120B (2025) to $175B (2026) to projected $300B/yr. This is the bailout trigger. When revenue doesn't cover the debt service, these bonds blow up."
  },
  {
    title: "Enterprise AI Failure",
    body: "80% of AI projects fail to deliver business value (Morgan Stanley). Only 21% of S&P 500 can cite measurable AI benefit. 95% of GenAI pilots had no P&L impact (MIT)."
  },
  {
    title: "Bailout Dynamics",
    body: "OpenAI proposed government equity stake. Bernie Sanders wants 50% ownership tax. David Sacks says 'no bailout' but admin took 90+ actions to help AI industry. AI capex is propping up GDP - too big to fail."
  },
];

export const CONTAGION_CHAIN = [
  { stage: "Stage 1 (Now)", text: "AI stock selloff → chip stocks crater → Nasdaq correction → VIX spikes", tone: "red" },
  { stage: "Stage 2 (Weeks)", text: "Hyperscaler capex cuts → neocloud revenue disappears → CoreWeave/IREN/Nebius bonds distressed → data center construction freezes", tone: "amber" },
  { stage: "Stage 3 (Months)", text: "AI startup funding dries up → mass layoffs in AI → VC marks down portfolios → pension fund losses", tone: "amber" },
  { stage: "Stage 4 (6-12mo)", text: "Hyperscaler debt downgrades → credit spreads widen → bond market stress → broader recession → housing accelerates down", tone: "red" },
  { stage: "Stage 5 (Political)", text: "Government intervention - bailout, stimulus, or 'strategic investment'. Taxpayer on the hook.", tone: "dim" },
];

export const PLAYBOOK = [
  { when: "This week", text: "Open a spread betting account. IG Markets - sign up online, FCA regulated, no minimum deposit. Takes 1-2 days for verification. Start with a demo account to learn the interface." },
  { when: "Week 1 - Wait for the bounce", text: "Don't short into a crash. After the -12% on semis, expect a dead cat bounce of 3-5% over the next few sessions. Watch for it. When NVDA recovers toward $190-195 or SOX bounces 5%+, that's your entry window." },
  { when: "Week 1-2 - Tier 1 entries", text: "Open your highest-conviction shorts: CoreWeave (CRWV) - pure neocloud play, NVIDIA-financed, burns cash. NVIDIA (NVDA) - the kingpin, every loop flows through them. Oracle (ORCL) - 86% capex/revenue ratio, Stargate anchor." },
  { when: "Week 3-4 - Tier 2 if green", text: "Add if Tier 1 is working: AMD - equity-for-chips scandal makes this vulnerable. Broadcom (AVGO) - heavy OpenAI commitment exposure. Micron (MU) - memory demand tied to AI buildout." },
  { when: "Monthly - Manage", text: "Take profit in thirds. First 1/3 at +15%. Move stop to breakeven. Trail the rest with a 10% trailing stop. Reassess thesis each week - check earnings, capex guidance, debt issuance." },
  { when: "Bail signal", text: "Close everything if: Government announces direct bailout or equity stake. Fed announces emergency measures for tech. NVIDIA posts genuine non-circular revenue beat. Or your total drawdown hits 10%." },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/* COUNTER-THESIS — things that could blow up the short                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

export const COUNTER_STATS = [
  { label: "NVIDIA Q2 revenue", value: "$96.2B", note: "Up 106% YoY, beat by $4B", tone: "green" },
  { label: "Anthropic run-rate", value: "$30B+", note: "80x growth in 18 months", tone: "green" },
  { label: "Enterprise AI ROI", value: "88%", note: "Report positive revenue impact (NVIDIA survey)", tone: "green" },
  { label: "OpenAI enterprise share", value: "40%+", note: "Non-circular consumer + enterprise demand", tone: "green" },
];

export const COUNTER_ARGS = [
  {
    title: "Revenue is real and growing fast",
    risk: "HIGH",
    body: "NVIDIA posted $96.2B in Q2, up 106% YoY, beating estimates by $4B. Guided $108B for Q3 and ~70% growth for fiscal 2028 ($690-700B). Anthropic's run-rate went from ~$375M (early 2024) to $30B+ (mid-2026) — 80x. OpenAI enterprise revenue crossed 40% of total sales with 9M paying business users. This isn't all circular — 910M weekly active users are real consumers paying for ChatGPT.",
    implication: "If revenue keeps compounding, the 'circular' thesis is noise against the signal. Shorts against NVDA face the most dangerous chart in the market — relentless upward revisions."
  },
  {
    title: "NVIDIA's non-circular demand is ~75%",
    risk: "HIGH",
    body: "CFO Colette Kress said AI lab deals (the 'circular' part) will be 'roughly a quarter' of next year's business. That means ~75% comes from sovereign AI, enterprise, non-AI-lab neoclouds, and other buyers. Non-hyperscale customers are growing 100% per year. NVIDIA has $99.4B in cash, $127B trailing FCF, and customers pay in ~60 days.",
    implication: "Shorting NVDA at $190 against a company printing $127B/yr FCF is shorting into a cash cannon. Even if the circular quarter blows up, the other 75% can absorb it."
  },
  {
    title: "Valuations are NOT dot-com stretched",
    risk: "MEDIUM",
    body: "Alphabet, Meta, Microsoft, and NVIDIA trade at roughly 22-25x forward earnings — close to the Nasdaq-100 average of ~22x. Cisco traded at 200x earnings at the 2000 peak. The Mag-7 are generating real earnings, not burning cash on eyeballs. Even after the Nov 5 crash, these multiples are historically normal.",
    implication: "The dot-com analogy only works for neoclouds (CRWV, IREN, Nebius) and unprofitable startups. Shorting NVDA or META at 25x forward earnings is not shorting Pets.com at 1000x."
  },
  {
    title: "Government will protect, not destroy",
    risk: "MEDIUM",
    body: "David Sacks said 'no bailout' publicly, but the admin took 90+ pro-AI actions. A crash that wipes AI stocks threatens GDP (AI capex is propping it up), pension funds, and US tech leadership vs China. A bailout would PREVENT the collapse you're betting on. Jason Furman (Harvard) says AI isn't systemically risky like banks, so even a crash produces only a shallow recession — not the cascade your contagion chain requires.",
    implication: "If the government steps in early (tax credits, accelerated depreciation, direct investment), the crash gets arrested. Your Stage 4-5 contagion chain never fires."
  },
  {
    title: "Short squeeze / momentum risk",
    risk: "CRITICAL",
    body: "NVIDIA is one of the most heavily watched stocks on earth. A dead-cat bounce of 5-10% triggers stop-losses on leveraged shorts. With spread betting at typical 10-20x leverage, a 5% move against you = 50-100% of margin. Michael Burry has been calling AI a bubble since 2024 — and NVDA went from $130 to $190 in that time. Being right on the thesis but wrong on timing is the same as being wrong.",
    implication: "Spread betting shorts on NVDA with a stop at $215 means you're risking 13% ($190 to $215). At 10x leverage that's 130% of your margin per position. One earnings beat wipes you."
  },
  {
    title: "The TAM is human labour, not software",
    risk: "HIGH",
    body: "Sequoia's David Cahn: 'The TAM is actually human labour.' The global knowledge-worker wage bill is $25-35T. Even capturing 1-2% of that is $250-700B. Harvard/P&G found AI individuals match two-person teams. If agentic AI replaces 15-100x the compute per task (Jensen's claim), the demand curve has barely started.",
    implication: "If AI captures even a fraction of the labour TAM, current capex looks like Amazon building AWS in 2006 — expensive, mocked, and ultimately the right call."
  },
  {
    title: "Jevons paradox — cheaper compute = MORE spending",
    risk: "MEDIUM",
    body: "OpenAI token prices fell 90%+ over three years. Historically, making a resource cheaper doesn't reduce total spend — it explodes it. Electricity, bandwidth, cloud storage all followed this pattern. Cheaper AI inference could mean MORE capex, not less, as new use cases become viable.",
    implication: "The 'capex must fall' thesis assumes static demand. But falling costs could trigger a demand surge that makes current spending look conservative."
  },
  {
    title: "CoreWeave's backlog is real",
    risk: "MEDIUM",
    body: "CoreWeave ended 2025 with $66.8B contracted backlog, up from $15B a year earlier. Revenue topped $5B for 2025 with projections for hypergrowth in 2026-2027. Yes, much is NVIDIA-linked, but contracted backlog with take-or-pay clauses from Microsoft, OpenAI and others isn't vapour. IPO lockup expiry could cause selling pressure but doesn't make the revenue fake.",
    implication: "If CRWV proves it can generate cash flow from the backlog, the IPO lockup selloff is a buying opportunity — not confirmation of the short thesis."
  },
];

export const VERDICT = {
  thesis_score: "6/10",
  summary: "The circular financing observation is directionally correct but the thesis overstates how much of the AI economy is circular (~25% of NVDA, less for others). The revenue growth is too fast and too broad-based for a pure Ponzi reading. The biggest risk to the short is timing — being right about the destination but wrong about the route.",
  strongest_point: "The neocloud shorts (CRWV, ORCL) — these have the weakest standalone economics and highest debt-to-revenue. If anything cracks, they crack first.",
  weakest_point: "Shorting NVDA and META — these are cash-rich, profitable companies trading at normal multiples. Even Burry hasn't made money on this trade in two years.",
  recommendation: "If proceeding: size positions TINY (0.5-1% of capital per trade max), focus on Tier 1 neoclouds only (CRWV, ORCL), avoid NVDA and META entirely until you see actual revenue deceleration in earnings. Paper trade for 3 months first."
};

/** OpenAI vendor commitments ($B) — the $1.15T in obligations */
export const VENDOR_COMMITS = [
  { name: "Broadcom", value: 350 },
  { name: "Oracle",   value: 300 },
  { name: "MSFT",     value: 250 },
  { name: "NVIDIA",   value: 100 },
  { name: "AMD",      value: 90 },
  { name: "AWS",      value: 38 },
  { name: "CoreWeave", value: 22 },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ECONOMIC MODELS — charts and scenario analysis                           */
/* ═══════════════════════════════════════════════════════════════════════════ */

/** Hyperscaler capex vs AI revenue (aggregate Big-5: MSFT, GOOG, AMZN, META, ORCL) */
export const CAPEX_VS_REVENUE = [
  { year: "2022", capex: 140, aiRev: 18,  fcf: 210 },
  { year: "2023", capex: 200, aiRev: 45,  fcf: 195 },
  { year: "2024", capex: 310, aiRev: 105, fcf: 180 },
  { year: "2025", capex: 370, aiRev: 190, fcf: 155 },
  { year: "H1 2026", capex: 260, aiRev: 160, fcf: 40 },
  { year: "2026e", capex: 705, aiRev: 380, fcf: 75 },
  { year: "2027e", capex: 900, aiRev: 560, fcf: 110 },
];

/** Individual hyperscaler Q1 2026 cash-flow snapshot ($B) */
export const HYPERSCALER_FCF = [
  { name: "Meta",      opCF: 32, capex: 20, fcf: 12,  fcfYoY: "+20%" },
  { name: "Microsoft", opCF: 47, capex: 31, fcf: 16,  fcfYoY: "-22%" },
  { name: "Alphabet",  opCF: 46, capex: 36, fcf: 10,  fcfYoY: "-38%" },
  { name: "Amazon",    opCF: 37, capex: 44, fcf: -7,  fcfYoY: "-95%" },
  { name: "NVIDIA",    opCF: 35, capex: 3,  fcf: 32,  fcfYoY: "+85%" },
];

/** Enterprise AI ROI gap — the demand-side problem */
export const ROI_GAP = {
  headline: "The $2.5T question: who's actually making money from AI?",
  stats: [
    { label: "Companies seeing ROI", value: "29%", source: "WRITER 2026", tone: "red" },
    { label: "AI pilots with P&L impact", value: "5%", source: "MIT NANDA", tone: "red" },
    { label: "Projects abandoned 2025", value: "42%", source: "S&P Global", tone: "red" },
    { label: "AI spend deferred to 2027", value: "25%", source: "Forrester", tone: "amber" },
    { label: "Can link AI to P&L", value: "<33%", source: "Gartner", tone: "red" },
    { label: "Measurable ROI established", value: "7%", source: "KPMG Q2 2026", tone: "red" },
  ],
  paradox: "97% of executives say they personally benefit from AI. Only 29% say their company does. The gap between personal productivity and enterprise ROI is the thesis in one number.",
};

/** Three scenarios for the AI economy — bull, base, bear */
export const SCENARIOS = [
  {
    name: "Bull (counter-thesis wins)",
    probability: "30%",
    tone: "green",
    thesis_outcome: "Shorts destroyed",
    description: "AI revenue compounds 60%+ annually. Enterprise ROI gap closes as agentic AI delivers real automation. Capex spending is the 2006-AWS moment — looks crazy now, looks obvious in hindsight.",
    triggers: [
      "Enterprise AI ROI crosses 50% (currently 29%)",
      "Hyperscaler AI revenue growth sustains >60% through 2027",
      "Agentic AI replaces measurable labour hours at scale",
      "NVIDIA non-circular revenue exceeds 80%",
    ],
    position_impact: "Total loss. NVDA to $250+, CRWV stabilises, all stops hit. At 10x leverage, 130%+ loss on margin per position.",
    what_you_lose: "If you size at 1% capital per trade across 5 positions = 5% capital at risk. At 10x leverage with stops, max loss ~65% of margin deployed = ~3.25% of total capital.",
  },
  {
    name: "Base (messy middle)",
    probability: "45%",
    tone: "amber",
    thesis_outcome: "Mixed results",
    description: "AI revenue grows but decelerates to 30-40%. Some circular revenue exposed but not catastrophic. Capex growth slows. Neoclouds struggle, megacaps survive but trade sideways. The bubble deflates slowly rather than popping.",
    triggers: [
      "NVIDIA revenue growth slows to 30-40% (from 70%+)",
      "1-2 neoclouds enter distress (CRWV, IREN, or Nebius)",
      "Enterprise ROI stays below 35% but doesn't collapse",
      "Hyperscaler capex guidance flat or modest cuts",
    ],
    position_impact: "CRWV and ORCL shorts work (30-50% profit). NVDA and META shorts break even or small loss. Net positive but not the windfall you're modelling.",
    what_you_lose: "Nothing — this is the scenario where discipline matters. Take profits on Tier 1, close Tier 2-3 early.",
  },
  {
    name: "Bear (thesis wins)",
    probability: "25%",
    tone: "red",
    thesis_outcome: "Shorts pay off",
    description: "Circular financing exposed in earnings. Neocloud defaults or restructuring. Hyperscaler capex cuts 20-30%. Enterprise AI disillusionment accelerates. Contagion into credit markets.",
    triggers: [
      "SEC investigation into circular revenue recognition",
      "CoreWeave or Nebius misses debt covenants",
      "NVIDIA revenue actually declines QoQ",
      "Major enterprise cancels AI commitment publicly",
    ],
    position_impact: "CRWV to $15-20 (60-70% profit), ORCL to $75-85 (30-40%), NVDA to $130-150 (25-35%). Full thesis payout on Tier 1.",
    what_you_lose: "Nothing — but you have to survive the volatility to get here. The path to -50% on CRWV goes through +30% first.",
  },
];

/** Position risk calculator inputs */
export const RISK_MODEL = {
  spreadBetLeverage: { typical: 10, max: 20 },
  marginCallThreshold: 0.5,  // 50% of margin
  scenarios: [
    { move: "+5%",  leveraged: "+50%",  margin: "Margin call likely", survive: false },
    { move: "+10%", leveraged: "+100%", margin: "Wiped out", survive: false },
    { move: "+15%", leveraged: "+150%", margin: "Owe broker money", survive: false },
    { move: "-10%", leveraged: "-100%", margin: "Target: take 1/3 profit", survive: true },
    { move: "-20%", leveraged: "-200%", margin: "Target: take 2/3 profit", survive: true },
    { move: "-30%", leveraged: "-300%", margin: "Full target hit", survive: true },
  ],
};

/** Thesis stress test — weighted scoring */
export const STRESS_TEST = {
  factors: [
    {
      name: "Revenue growth sustainability",
      bull_case: "NVDA 70% growth, Anthropic 80x in 18mo — this isn't slowing",
      bear_case: "Growth is circular — NVDA's own money buying its own chips via proxies",
      weight: 25,
      bull_score: 8,
      bear_score: 5,
      verdict: "Bull wins on numbers. 75% non-circular is too much real demand to dismiss. But the 25% circular is a real risk if it unwinds simultaneously.",
    },
    {
      name: "Enterprise ROI / demand durability",
      bull_case: "TAM is $25-35T in human labour — even 1% capture justifies everything",
      bear_case: "Only 5% of pilots hit P&L, 42% of projects abandoned, 7% have measurable ROI",
      weight: 20,
      bull_score: 5,
      bear_score: 7,
      verdict: "Bear wins on current data. The ROI gap is the strongest counter-counter argument. If companies keep spending without returns, that's the textbook capex bubble.",
    },
    {
      name: "Valuation / multiple risk",
      bull_case: "22-25x forward earnings is normal, not dot-com. Real profits, real cash",
      bear_case: "Earnings are inflated by circular revenue and one-time AI-lab equity marks",
      weight: 15,
      bull_score: 7,
      bear_score: 4,
      verdict: "Bull wins for megacaps. META and NVDA at 25x with real FCF isn't a bubble multiple. The dot-com comparison only sticks for neoclouds trading on backlog alone.",
    },
    {
      name: "Free cash flow trajectory",
      bull_case: "Meta still generating $12B/Q FCF. NVIDIA $32B. Capex is self-funded",
      bear_case: "Amazon FCF is -$7B. Alphabet down 38%. Microsoft down 22%. Trend is clear",
      weight: 20,
      bull_score: 4,
      bear_score: 7,
      verdict: "Bear wins on trajectory. Even if current levels are survivable, the direction is alarming. Amazon burning cash to fund AI capex is the canary.",
    },
    {
      name: "Government / political intervention",
      bull_case: "AI is a strategic asset — 90+ pro-AI admin actions, no one lets it fail",
      bear_case: "Bailout props up stocks and kills the short. Bernie Sanders wants 50% tax",
      weight: 10,
      bull_score: 6,
      bear_score: 3,
      verdict: "Wildcard. Government intervention is BAD for your short either way — bailout arrests the crash, regulation kills profitability. Both prevent the clean unwind you need.",
    },
    {
      name: "Short execution risk",
      bull_case: "Spread betting leverage means huge gains if right",
      bear_case: "Same leverage means catastrophic losses if wrong. 5% against you = 50% of margin gone. Burry lost money on this trade for 2 years",
      weight: 10,
      bull_score: 3,
      bear_score: 8,
      verdict: "Bear (i.e. risk to YOU). The asymmetry works against you. Shorts have unlimited downside, capped upside. With leverage, the margin math is brutal even if the thesis is right but early.",
    },
  ],
  overall: {
    bull_weighted: 56,  // sum of (bull_score * weight) / sum(weights)
    bear_weighted: 58,  // sum of (bear_score * weight) / sum(weights)
    spread: 2,
    interpretation: "Near-even. The thesis is not strong enough for high-conviction leveraged shorts. The bear case wins on FCF trajectory and enterprise ROI, but the bull case wins on valuation and revenue growth. This is a coin flip dressed up as analysis.",
  },
};

/** Revised strategy — what to actually do given the stress test */
export const REVISED_STRATEGY = {
  headline: "Adjusted playbook after stress testing",
  tl_dr: "The original thesis is directionally right about circular financing but structurally wrong about which companies to short and how much leverage to use. The counter-thesis doesn't negate your position — it refines it. Focus narrows from 8 positions to 2-3, leverage drops from 10-20x to 3-5x, and the time horizon extends.",
  adjustments: [
    {
      action: "DROP from short list",
      tickers: ["NVDA", "META", "QQQ"],
      reason: "NVDA prints $127B/yr FCF with 75% non-circular revenue. Shorting it at 25x forward earnings is fighting a cash cannon. META generates $12B FCF per quarter. QQQ is too diversified. These are the positions the counter-thesis kills.",
    },
    {
      action: "KEEP — highest conviction",
      tickers: ["CRWV", "ORCL"],
      reason: "CoreWeave: pure neocloud, NVIDIA-financed, negative FCF, IPO lockup expiring. Oracle: 86% capex/revenue, Stargate anchor tenant, massive debt raise. These are the positions where the circular thesis is strongest AND the counter-thesis is weakest.",
    },
    {
      action: "WATCH — conditional entry only",
      tickers: ["AMD", "MU"],
      reason: "AMD's equity-for-chips warrants are genuinely unusual and could be an accounting problem. Micron is cyclical memory — if AI capex slows, HBM demand collapses. But wait for actual revenue deceleration before entering.",
    },
    {
      action: "REDUCE leverage",
      detail: "From 10-20x to 3-5x. At 5x leverage, a 10% move against you costs 50% of margin instead of 100-200%. You survive the dead-cat bounce and the earnings beats that are coming.",
    },
    {
      action: "ADD a hedge",
      detail: "If shorting CRWV and ORCL, go long NVDA or buy QQQ calls as a hedge. If the thesis is right, neoclouds die first and megacaps follow later — but if you're wrong, the megacap long limits your loss. This turns a directional bet into a pair trade.",
    },
    {
      action: "EXTEND time horizon",
      detail: "The original playbook assumes weeks. The FCF data says this takes 6-18 months to play out. Amazon's FCF going from +$38B to -$7B didn't crash the stock — it takes quarters of deterioration. Be patient or be wrong.",
    },
  ],
};

export const SOURCES = [
  { t: "Yahoo Finance - Nov 5 Market Crash", u: "https://finance.yahoo.com/markets/live/stock-market-today-thursday-november-5-dow-sp-500-nasdaq-plunge-chip-stocks-melt-down-193726491.html" },
  { t: "Bloomberg - AI Circular Deals", u: "https://www.bloomberg.com/graphics/2026-ai-circular-deals/" },
  { t: "Where's Your Ed At - AI Circular Psychosis", u: "https://www.wheresyoured.at/premium-ais-circular-psychosis/" },
  { t: "BlockEden - Circular Financing Loop", u: "https://blockeden.xyz/blog/2026/03/06/ai-circular-financing-loop-vendor-financing/" },
  { t: "AI Capex Bubble 2026 - Revenue Analysis", u: "https://tooldirectory.ai/blog/ai-capex-bubble-2026-where-the-revenue-actually-is" },
  { t: "AI Layoffs Tracker 2026", u: "https://founderreports.com/ai-layoffs-tracker/" },
  { t: "HOA - UK House Price Crash Analysis", u: "https://hoa.org.uk/news/house-price-crash/" },
  { t: "Truthout - AI Bailout Analysis", u: "https://truthout.org/articles/taxpayers-must-not-be-on-the-hook-for-bailing-out-the-ai-industry/" },
  { t: "ExplainX - Nov 5 AI Stock Crash", u: "https://explainx.ai/blog/ai-stocks-crash-nov-5-2026-nvidia-micron-amd-coreweave-why-data-center-midterm-fears-bubble-2026" },
  { t: "Fortune - NVIDIA Q2 Results, 70% Growth", u: "https://fortune.com/2026/08/26/nvidia-q2-growth-results-jensen-huang/" },
  { t: "IoT Analytics - Why There Is No AI Bubble", u: "https://iot-analytics.com/why-there-is-no-ai-bubble-analysis/" },
  { t: "CNBC - NVIDIA Circular Financing Accusations", u: "https://www.cnbc.com/2026/08/11/nvidia-tries-to-quiet-circular-financing-accusations-wall-street-unsure-it-will-.html" },
  { t: "FPT AI - Enterprise AI ROI 88% Positive", u: "https://factory.fpt.ai/news/enterprise-ai-in-2026-88-report-positive-roi" },
  { t: "OpenAI Enterprise Revenue 40%+ of Sales", u: "https://www.shopifreaks.com/openai-says-enterprise-revenue-has-crossed-40-of-total-sales-and-is-on-pace-to-match-consumer-revenue-by-end-of-2026/" },
  { t: "Anthropic Revenue Surpasses $30B Run Rate", u: "https://thedeepdive.ca/anthropic-revenue-run-rate-surpasses-30-billion-as-enterprise-demand-accelerates/" },
  { t: "Om Malik - Hyperscaler AI Spend Analysis", u: "https://om.co/2026/04/30/what-i-learned-about-hyperscalers-ai-spend/" },
  { t: "Enterprise AI: 59% Spend $1M+, 29% See ROI", u: "https://tech-insider.org/ca/enterprise-ai-adoption-roi-gap-2026/" },
  { t: "Why 79% of Enterprises Struggle with AI ROI", u: "https://ai2.work/blog/why-79-of-enterprises-still-struggle-to-turn-ai-into-roi" },
  { t: "Short Sellers Bank $5.6B Against AI Stocks", u: "https://www.tipranks.com/news/short-sellers-bank-5-6b-betting-against-ai-stocks" },
  { t: "KPMG - Enterprise AI ROI Disconnect", u: "https://www.pulse.bot/ai/news/kpmg-report-finds-enterprise-disconnect-between-ai-and-its-roi-e22f1555-d776-47ea-8c31-7ee81a94af8e/" },
  { t: "Hyperscalers Hit $700B in 2026 AI Spending", u: "https://finance.yahoo.com/sectors/technology/articles/hyperscalers-hit-700-billion-2026-111243744.html" },
];
