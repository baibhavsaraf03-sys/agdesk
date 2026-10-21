/**
 * Structural capital flows.
 *
 * The analytical discipline this screen teaches: capital expenditure is a
 * costly signal. Nobody builds a fabrication plant, a mine or a gigawatt of
 * generation on a whim, so where multi-year money is being committed tells you
 * what large allocators actually believe — as distinct from what they say.
 *
 * But a flow is evidence about belief, not about outcome. Every entry below
 * therefore separates what the number supports from what it does not, and
 * names what you would observe if the thesis were failing. That last field is
 * the one that makes the difference between analysis and astrology.
 */

export const FLOW_TAGS = {
  accelerating: { label: "Accelerating", color: "#3ee08a" },
  contested:    { label: "Contested",    color: "#e8b43d" },
  reversing:    { label: "Reversing",    color: "#ff6b57" },
  constraint:   { label: "Binding constraint", color: "#53d2e0" }
};

export const FLOWS_PREFACE = {
  h: "How to read a capital flow without embarrassing yourself",
  body:
    "Capital expenditure is the most honest signal in economics, because it is expensive to fake. A company that commits ten years of cash to a facility is telling you what it genuinely expects, in a way no earnings call can. That makes tracking large flows genuinely useful. It also makes them very easy to over-read.",
  read:
    "The failure mode is treating a flow as a prophecy. Money going into defence or uranium is evidence that allocators expect demand for defence or uranium. It is not evidence about whether a war happens, because the investment is a hedge against a possibility, not a prediction of a certainty. Insurance premiums rising tells you risk is being repriced; it does not tell you the house burns down.\n\nThe second failure mode is taking the number at face value. Figures circulate with the decimal point in the wrong place, with announcements counted as spending, with multi-year totals quoted as annual ones, and with pledges counted that were never disbursed. The IEA notes a large gap between the roughly USD 65 billion of critical minerals public finance committed by advanced economies in 2025 and what has actually been paid out. Always ask: over what period, committed or spent, and measured by whom.\n\nThe third is reading one flow alone. The interesting analysis is almost always where two flows compete for the same electricity, the same copper, the same fiscal space or the same political permission. That competition is where you find the binding constraint, and the binding constraint is what actually determines outcomes."
};

export const FLOWS = [
  /* ------------------------------------------------------------------ */
  {
    name: "AI compute build-out",
    scale: "Global AI investment forecast above $1 trillion in 2026",
    tag: "accelerating",
    body:
      "Goldman Sachs forecasts global AI investment exceeding one trillion dollars in 2026. Dell'Oro projects total data centre capital expenditure reaching $1.7 trillion by 2030, with hyperscaler spending alone in the $600–726 billion range this year. Reporting has noted hyperscalers spending in the region of 102% of cloud revenue on capital expenditure, which is to say they are investing more than the business currently generates.\n\nThis is the largest voluntary private capital reallocation of the decade. It is not driven by regulation or subsidy, which is what makes it informative: these are firms with unusually good information about demand putting their own balance sheets behind a view.",
    evidence:
      "That the firms closest to AI demand expect it to be very large and expect compute to remain the bottleneck. Spending above current revenue is a strong signal, because it is painful if wrong.",
    notEvidence:
      "That the returns will materialise, or that they will accrue to the firms spending. Railway and fibre build-outs were both correct about the technology and ruinous for most of the original investors. Infrastructure booms frequently create enormous value and destroy the capital that built them.",
    refute:
      "Watch the gap between capex and revenue growth. If capex keeps compounding while cloud and AI revenue decelerates for two or three consecutive quarters, the thesis is breaking. Also watch depreciation schedules: if useful-life assumptions on GPUs get extended, that is earnings management buying time.",
    second:
      "Electricity demand is the first-order consequence, which collides directly with the energy flow below. Then grid interconnection queues, then gas turbine and transformer lead times, then local politics over water and land. The constraint migrates from chips to power to permits.",
    ask:
      "Analyse the AI capital expenditure cycle as an infrastructure boom. Compare it to railways in the 1840s and fibre in the late 1990s, and say specifically what is different this time and what is the same."
  },

  /* ------------------------------------------------------------------ */
  {
    name: "Energy system investment",
    scale: "$3.4 trillion total in 2026; $2.2 trillion of it clean energy",
    tag: "accelerating",
    body:
      "The IEA's World Energy Investment 2026 puts total global energy investment at around $3.4 trillion this year, of which roughly $2.2 trillion goes to clean energy — close to double what fossil fuels receive. This is the single largest capital flow on the planet and it has crossed a threshold that took two decades to reach.\n\nThe composition matters more than the headline. A growing share is going into grids and storage rather than generation, which is the tell that the constraint has moved from producing electricity to moving and timing it.",
    evidence:
      "That the economics of renewable generation now stand largely on their own, and that capital allocators treat the transition as a commercial opportunity rather than a compliance cost. Money at this scale does not move on sentiment.",
    notEvidence:
      "That emissions targets will be met, or that the transition is fast enough. Investment running at double fossil fuel levels is consistent with both a successful transition and one that arrives two decades late. The flow tells you about direction, not pace against a target.",
    refute:
      "Watch grid investment as a share of the total. If generation keeps growing while grid and storage lag, curtailment rises, returns fall, and investment follows. Also watch whether clean energy investment in emerging markets outside China actually grows — that has been the persistent weak point.",
    second:
      "Copper, aluminium and transformer demand. Electricity price volatility as intermittent supply grows faster than storage. And a fiscal consequence: governments dependent on fuel taxation face a revenue hole they have mostly not planned for."
  },

  /* ------------------------------------------------------------------ */
  {
    name: "Military expenditure",
    scale: "$2.887 trillion in 2025 — a record, and the steepest rise in 16 years",
    tag: "accelerating",
    body:
      "SIPRI's April 2026 figures put world military spending at a record $2.887 trillion, with the sharpest increases in Europe and Asia and the fastest overall growth in sixteen years. European NATO members account for a disproportionate share of the increase.\n\nUnlike the AI and energy flows, this one is almost entirely public money, which means it competes directly with every other government spending priority and with debt service.",
    evidence:
      "That governments have revised their assessments of the probability of conflict upward, and that this revision is broad rather than confined to one region. Defence budgets are politically costly to raise, so the increase is a genuine signal of changed expectations.",
    notEvidence:
      "That a major war is coming. This is the error worth being clearest about. Rearmament is a hedge against a possibility and, in deterrence theory, is specifically intended to make conflict less likely. Reading a defence budget as a forecast of war inverts the logic its proponents are using. It is equally consistent with successful deterrence, with alliance burden-shifting, and with domestic industrial policy wearing a security badge.",
    refute:
      "Watch whether spending converts into deliverable capability. Announced budgets, procurement contracts and actual deliveries are three different numbers, and in several European countries the gap between them is enormous. Munitions production rates are the honest metric, not budget headlines.",
    second:
      "Fiscal crowding-out, which collides with the debt service flow below. Industrial demand for specialty steel, explosives precursors and semiconductors. And a security dilemma dynamic: each defensive increase reads as threatening elsewhere, prompting further increases.",
    ask:
      "Apply the security dilemma to the current global rearmament. Distinguish carefully between evidence that conflict is more likely and evidence that states are hedging, and say what would separate the two empirically."
  },

  /* ------------------------------------------------------------------ */
  {
    name: "Sovereign debt service",
    scale: "Global debt past $365 trillion; US net interest heading from $1.0tn to $2.1tn",
    tag: "constraint",
    body:
      "The IIF puts global debt beyond $365 trillion in 2026, up from $348 trillion in 2025. In the US specifically, net interest costs rise from roughly $1.0 trillion (3.3% of GDP) to about $2.1 trillion (4.6%) by 2036 on CBO projections, with gross federal debt going from 123% of GDP to 136%.\n\nThe number that matters most is not the stock but the relationship between the average interest rate on the debt and the growth rate. A CRFB analysis of CBO's February 2026 baseline suggests the US rate could exceed the growth rate from FY2031 — the technical definition of a debt spiral.",
    evidence:
      "That fiscal space is closing across the advanced economies simultaneously, and that interest is becoming one of the largest line items in several national budgets. This is arithmetic rather than forecast.",
    notEvidence:
      "That a sovereign default or crisis is imminent. Countries that borrow in their own currency do not default in the way corporates do; they inflate, financially repress, or grow out of it. The constraint is real but it binds through politics and inflation rather than through missed payments.",
    refute:
      "Watch the term premium and auction tails rather than the debt stock. Investors demanding more compensation for duration, or weak bid-to-cover ratios on long-dated issues, is what deterioration actually looks like. A rising debt ratio with stable auctions is not a crisis.",
    second:
      "Direct competition with defence and ageing-related spending for the same budget. Pressure on central bank independence as governments find high rates intolerable. And an international dimension: the US net external liability of roughly $21–27 trillion has to be willingly financed by foreigners every single day."
  },

  /* ------------------------------------------------------------------ */
  {
    name: "Critical minerals",
    scale: "Investment FELL 9% in 2025 — the contrarian entry on this screen",
    tag: "reversing",
    body:
      "This is the flow that contradicts the narrative, which is exactly why it belongs here. IEA figures show critical mineral investment declined 9% in 2025, ending several years of growth. Battery metals capital spending fell more than 20%, the largest drop in over a decade, with lithium companies cutting roughly 40%. Exploration spending fell more than 10%, and lithium and nickel exploration dropped about 45%.\n\nCopper is the exception: copper-focused companies raised spending 8%. Public finance commitments in advanced economies reached about $65 billion in 2025, over four times the 2023 level — but the IEA explicitly notes a large gap between commitment and disbursement.",
    evidence:
      "That the 2021–23 minerals boom was a price-driven capital cycle, and that falling prices have done what falling prices always do. It is also evidence that government strategic announcements are not translating into actual mine development at anything like the announced pace.",
    notEvidence:
      "That demand expectations have fallen. Projected copper supply deficits remain around 25% by 2035. Investment falling while expected demand holds is the setup for a supply crunch, not a demand collapse. Falling capex in a mineral with a ten-year development lead time is a bullish long-run signal, not a bearish one.",
    refute:
      "Watch whether the copper deficit projection narrows further — it already moved from about 30% to 25% — and whether substitution or recycling closes more of the gap than expected. Also watch whether the $65 billion of public commitments actually disburses.",
    second:
      "Concentration risk, which is the under-discussed part. Excluding rare earths, the top refining country's average share rose to 72% in 2025. China's share of global copper smelting capacity went from about 15% to 50% since 2005, and it holds over three-quarters of battery pre-treatment capacity. The chokepoint is refining, not mining.",
    ask:
      "Critical mineral investment fell 9% while projected demand held. Work through what that divergence implies for prices over a ten-year horizon, and name what would invalidate the conclusion."
  },

  /* ------------------------------------------------------------------ */
  {
    name: "Nuclear and uranium",
    scale: "Tight conversion capacity; modest exploration growth — not a capital flood",
    tag: "contested",
    body:
      "Uranium deserves its own entry because it is the clearest case of narrative outrunning numbers. The IEA records that uranium markets have strengthened since 2020 and that exploration spending has shown modest growth — modest being the operative word. There has been no capital surge remotely comparable to AI or energy generally.\n\nThe structural facts are about concentration rather than volume. The top three countries account for almost three-quarters of uranium mining and around 70% of conversion and enrichment capacity. Conversion capacity in particular is already tight, and the IEA notes more investment will be needed to avoid bottlenecks.",
    evidence:
      "That nuclear is being taken seriously again as firm low-carbon generation, partly because AI data centres need round-the-clock power that intermittent sources cannot supply alone. The bottleneck is in conversion and enrichment, not in the ground.",
    notEvidence:
      "Anything whatsoever about weapons proliferation or conflict. Civil uranium demand and weapons programmes run on different enrichment levels, different facilities and different supply chains. Reading civil nuclear investment as a military signal is a category error — and in any case the volumes involved are nowhere near large enough to carry that weight.",
    refute:
      "Watch conversion and enrichment capacity additions rather than mine announcements. If conversion stays tight while reactor approvals accelerate, the price signal moves to the midstream. If Western enrichment capacity expands materially, the concentration risk eases.",
    second:
      "Small modular reactor economics, which remain unproven at scale. Grid siting politics. And a geopolitical dimension: dependence on a small number of enrichment suppliers is exactly the chokepoint structure the weaponised interdependence literature describes."
  },

  /* ------------------------------------------------------------------ */
  {
    name: "Private credit migration",
    scale: "$1.4 trillion, from $0.23 trillion in 2010",
    tag: "contested",
    body:
      "Private credit has grown from roughly $0.23 trillion in Q1 2010 to about $1.4 trillion in Q1 2026, with leveraged loans adding roughly another $1 trillion. Together they account for around 45% of lending to private non-financial corporations.\n\nThis is not new money so much as the same money relocating out of supervised banks into vehicles regulators can see much less of. The Financial Stability Board published a full report on the resulting vulnerabilities on 6 May 2026.",
    evidence:
      "That bank capital rules worked as intended by making certain lending uneconomic for banks — and that the lending did not stop, it moved. Regulation changes where risk sits far more reliably than it changes how much there is.",
    notEvidence:
      "That the system is safer. The FSB flags valuation opacity, inconsistent default definitions, leverage stacked at both fund and portfolio-company level, redemption mismatches in semi-liquid vehicles, and rising payment-in-kind usage. Nor is the separation from banks clean: the six largest US banks hold an estimated $300–322 billion in committed lending to private equity and private credit.",
    refute:
      "Watch payment-in-kind share and the Proskauer default index, which recorded 2.51% for Q2 2026 across 716 loans. Rising PIK means borrowers cannot service cash interest — the clearest early warning available.",
    second:
      "If this sector is tested in a downturn, the first casualty is the assumption that it is uncorrelated with banks. Watch regional bank disclosures for indirect exposure."
  },

  /* ------------------------------------------------------------------ */
  {
    name: "Commercial real estate repricing",
    scale: "~$875 billion of US loans maturing in 2026; office CMBS delinquency at a record",
    tag: "reversing",
    body:
      "The MBA puts roughly $875 billion of US commercial real estate loans — 17% of all outstanding CRE mortgages — maturing during 2026, with borrowers refinancing 150 to 250 basis points above their original rates. CMBS office delinquency hit an all-time high of 12.34% in January 2026, the highest since Trepp began tracking in 2000.\n\nThis is a capital flow running in reverse: value being written down rather than committed. Of loans that have already matured and remain unresolved, 83.7% are delinquent and 92.7% are in special servicing.",
    evidence:
      "That remote working produced a permanent reduction in demand for a specific asset class, and that the adjustment runs through refinancing rather than through missed monthly payments. These are maturity defaults, not cash-flow defaults.",
    notEvidence:
      "A general property crash or a systemic banking event. Office is distinct from industrial, residential and data centre property, which have entirely different demand pictures. Aggregating them produces nonsense.",
    refute:
      "Watch regional bank CRE concentration ratios and loan loss provisioning. US CRE debt totals $4.8 trillion with banks the largest holders, and it is regional rather than money-centre banks that are exposed.",
    second:
      "Municipal tax bases in office-dependent downtowns. Conversion economics to residential, which usually fail on floor-plate depth. And the mirror image abroad: Indian office vacancy fell from 17.2% in 2021 to 13.9% in Q1 2026 as the same work relocated."
  },

  /* ------------------------------------------------------------------ */
  {
    name: "Household leverage in emerging Asia",
    scale: "Indian household debt at 45.5% of GDP, a record, and rising every quarter",
    tag: "contested",
    body:
      "Indian household debt reached a record 45.5% of GDP, with non-housing retail loans at 58.4% of household borrowing — up from about 50% in 2019-20. Gold loans grew at a 42.4% compound rate since March 2024 to ₹5.14 trillion by May 2026. Small-ticket delinquencies hit 6.4% in March 2026, up from 4.5% two years earlier, with roughly half of those loans going to under-35s.\n\nThe composition is the story. Only 26.3% of Indian household debt is housing-secured, against roughly 72% in the US. This is borrowing to consume, not to acquire assets.",
    evidence:
      "That financial inclusion is working in the narrow sense — credit-active population went from 11% to about 28% of the population in a decade — and that fintech lenders, holding 56.8% of small-ticket personal loans with 70.5% of books unsecured, have filled a gap banks would not.",
    notEvidence:
      "That a crisis is near. Indian banks are in unusually good shape, with gross NPAs at a multi-decadal low of 1.8% and capital adequacy at record highs. The stress sits on households, not on the system that lends to them. That is a distributional problem, not a systemic one.",
    refute:
      "Watch borrowers holding unsecured loans from five or more lenders, which the RBI has specifically flagged. Also watch gold prices: ₹5.14 trillion of credit collateralised by one volatile asset is a concentrated bet.",
    second:
      "Consumption growth borrowed from the future. Political salience of debt relief. And a market consequence: households servicing 10–15% consumer loans are not the households who fund a deep domestic equity market."
  },

  /* ------------------------------------------------------------------ */
  {
    name: "Margin and leverage in public markets",
    scale: "US margin debt at a record $1.53 trillion, up 51.5% year on year",
    tag: "contested",
    body:
      "FINRA margin debt hit an all-time high of roughly $1.53 trillion in June 2026, up 7.9% in a month and 51.5% year on year, while investor credit balances fell to a record -$1.06 trillion. Since the data begins in 1997, only three prior periods saw growth this fast: late 1999 to early 2000, mid-2007, and spring 2021.\n\nIndia's equivalent is far smaller but growing faster: the MTF book hit a record ₹1.54 lakh crore in September 2026, roughly $16 billion, having grown 65.4% year on year while the index fell.",
    evidence:
      "That risk appetite is elevated and that a meaningful share of market gains is being bought with borrowed money. Leverage rising while an index falls, as in India, is a particularly poor combination.",
    notEvidence:
      "That a crash is imminent. Margin debt to total market capitalisation sits at 1.88%, within the historical 1.5–2.0% range. The market grew too. The three prior analogues all ended badly, but three observations is not a sample.",
    refute:
      "Watch margin debt relative to market cap rather than in absolute terms, and watch the credit balance. A sharp fall in margin debt after a price decline is the forced-selling signature.",
    second:
      "Amplification in a downturn. In India specifically, nearly half of MTF exposure sits in illiquid non-F&O mid and small caps with some brokers near SEBI's 500% of net worth ceiling, which is a liquidation-cascade structure."
  },

  /* ------------------------------------------------------------------ */
  {
    name: "Fertiliser and the agricultural input shock",
    scale: "World Bank fertiliser index projected +31% in 2026",
    tag: "constraint",
    body:
      "The World Bank projects its fertiliser index rising 31% year on year in 2026 — a larger move than any crop in the agricultural complex — driven by export disruption through the Strait of Hormuz. Fertiliser represents up to 60% of palm oil production costs and is a major input across every major crop.\n\nThe transmission is lagged in a way that is easy to miss. Farmers facing higher input costs reduce application rates now; the yield consequence lands in the following season.",
    evidence:
      "That an energy and geopolitical shock is propagating into food supply through the input channel rather than directly. This is the mechanism by which conflict becomes food inflation eighteen months later.",
    notEvidence:
      "An immediate food crisis. Prompt crop prices can fall while fertiliser rises — they are currently doing exactly that in grains. The effect appears in 2027 harvests, not in this week's futures.",
    refute:
      "Watch application rates and planted area in the major producing regions. If farmers absorb the cost rather than cutting application, the yield effect does not materialise.",
    second:
      "Food price inflation in import-dependent economies, which has a well-documented association with political instability. Export restrictions by producing countries, each individually rational and collectively ruinous."
  },

  /* ------------------------------------------------------------------ */
  {
    name: "Work relocation and the GCC build-out",
    scale: "Global Capability Centres taking 40–50% of Indian office absorption in 2026",
    tag: "accelerating",
    body:
      "Indian Grade A office leasing is projected near 70 million square feet in 2026 with net absorption around 55 million, and Global Capability Centres — multinationals relocating engineering, analytics and back-office functions — account for 40 to 50% of it. Office vacancy fell from 17.2% in 2021 to 13.9% by Q1 2026, with rents up 2% to 15% across the top eight cities.\n\nThis is the same phenomenon as the US office collapse, observed from the other end. Work did not disappear. It moved.",
    evidence:
      "That a large, durable relocation of knowledge work is under way, and that it is being capitalised in physical property rather than remaining a remote-working arrangement. Signing fifteen-year leases is a much stronger commitment than a hiring announcement.",
    notEvidence:
      "That the jobs are equivalent to those displaced, or that the trend is immune to automation. The functions most readily relocated are often those most readily automated, which makes this flow unusually exposed to the AI flow at the top of this screen.",
    refute:
      "Watch GCC headcount growth against square footage. If space keeps growing while headcount flattens, firms are building for an expansion that AI may make unnecessary.",
    second:
      "Indian urban infrastructure strain. A listings pipeline for Indian exchanges as these assets convert into REITs. And a political consequence in origin countries, where visible offshoring has historically been potent electoral material."
  }
];
