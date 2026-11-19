/**
 * Sovereign debt restructuring (SOV screen): the institutions, the process,
 * the cases and the law. Written by hand and checked against sources on
 * 19 Nov 2026, chiefly the Global Sovereign Debt Roundtable's 7th co-chairs'
 * progress report (14 Oct 2026). Case statuses go stale: re-check them against
 * the next GSDR report (April and October each year) and the debtors' own
 * finance ministry statements, and update `CHECKED`.
 *
 * Reference text, not market commentary: the hourly reads never rewrite it.
 */

export const CHECKED = "19 Nov 2026";

const GSDR7 = { t: "GSDR 7th co-chairs' progress report, 14 Oct 2026", u: "https://documents1.worldbank.org/curated/en/099536310132623002/pdf/IDU-ad4e2e67-3b51-40f7-82b6-b0673b71218f.pdf" };
const PLAYBOOK = { t: "GSDR, Sovereign Debt Restructuring: A Playbook for Country Authorities (April 2026)", u: "https://www.imf.org/-/media/files/about/faq/gsdr/041526-gsdr-restructuring-playbook.pdf" };
const PARIS_CF = { t: "Paris Club: the Common Framework", u: "https://clubdeparis.org/en/sites/clubdeparis/accueil/dettes-traitements/traitements/reechelonnement-et-annulations/cadre-commun-et-lecons-tirees.html" };

/**
 * Stage, in the order a case moves through it. Used for the tracker's label.
 */
export const STAGES = {
  talks: "Before a deal",
  official: "Official deal, private pending",
  closing: "Residual creditors only",
  paused: "Bonds done, official claims suspended",
  done: "Complete"
};

export const CASES = [
  {
    id: "zmb", iso: "ZMB", name: "Zambia", frame: "Common Framework", stage: "closing",
    default: "Nov 2020",
    imf: "Extended Credit Facility approved Aug 2022; completed Jan 2026; a follow-up programme requested",
    official: "Agreement in principle Jun 2023; 10 of 16 bilateral agreements signed",
    private: "Eurobond exchange closed May 2024; a few non-bonded commercial lenders remain",
    now: "Over 94% of the debt inside the restructuring is settled. The first Common Framework case to default and among the slowest: three and a half years from default to the bond exchange.",
    src: [GSDR7]
  },
  {
    id: "gha", iso: "GHA", name: "Ghana", frame: "Common Framework", stage: "closing",
    default: "Dec 2022",
    imf: "Extended Credit Facility approved May 2023; sixth and final review Jul 2026, followed by a non-financing Policy Coordination Instrument",
    official: "Agreement in principle Jan 2024; 16 of 25 bilateral agreements signed",
    private: "Domestic debt exchanged first (2023); about $13bn of Eurobonds exchanged in 2024 with a face-value haircut",
    now: "Residual non-bonded commercial creditors are under 5% of the perimeter, and the IMF reports all debt indicators back under its low-income thresholds.",
    src: [GSDR7, { t: "IMF, Ghana: 2026 Article IV and sixth ECF review", u: "https://www.elibrary.imf.org/view/journals/002/2026/212/article-A001-en.xml" }]
  },
  {
    id: "eth", iso: "ETH", name: "Ethiopia", frame: "Common Framework", stage: "official",
    default: "Dec 2023",
    imf: "Extended Credit Facility approved Jul 2024; fifth review completed Jul 2026",
    official: "Agreement in principle Mar 2025, memorandum Jul 2025; 11 of 14 bilateral agreements signed",
    private: "January 2026 bond deal rejected by the official creditors as too generous; a revised offer was rejected by bondholders in May; a third deal (29 Jun 2026: new $880m bond, a 12% haircut) was cleared as comparable on 20 Aug 2026. The exchange itself is still pending.",
    now: "The clearest live test of comparability of treatment: the official creditor committee, co-chaired by China and France, vetoed a private deal it judged to ask too little of bondholders.",
    src: [GSDR7, { t: "Ethiopia Ministry of Finance, 20 Aug 2026", u: "https://www.mofed.gov.et/blog/ethiopia-announces-favourable-comparability-of-treatment-assessment-of-official-creditor-committee-regarding-agreed-terms-of-eurobond-restructuring/" }, { t: "Ethiopia Ministry of Finance, 29 Jun 2026", u: "https://www.mofed.gov.et/blog/ethiopia-reaches-agreement-in-principle-with-ad-hoc-committee-of-bondholders-on-principal-financial-terms-of-restructuring-of-2024-notes/" }]
  },
  {
    id: "lka", iso: "LKA", name: "Sri Lanka", frame: "Outside the Common Framework (middle income)", stage: "closing",
    default: "Apr 2022",
    imf: "Extended Fund Facility approved Mar 2023; combined fifth and sixth reviews May 2026",
    official: "Agreement in principle Nov 2023 with a committee of 17 creditors (co-chaired by Japan, India and France) plus a separate deal with China Exim; 9 of 17 bilateral agreements signed",
    private: "Bond exchange completed at the end of 2024; a holdout, Hamilton Reserve Bank, is suing in New York and awaits a ruling",
    now: "About 94% of the external debt in the perimeter is done, about 99% counting agreements in principle. Domestic debt was restructured before the external deal.",
    src: [GSDR7]
  },
  {
    id: "ukr", iso: "UKR", name: "Ukraine", frame: "Wartime, outside any framework", stage: "paused",
    default: "2022 standstill",
    imf: "Extended Fund Facility in place; debt targets set by the programme",
    official: "Payments suspended by the Group of Creditors of Ukraine",
    private: "About $20bn of Eurobonds restructured in 2024; the 2015 GDP warrants ($2.6bn) exchanged into new notes due 2032 in Dec 2025 with 99.06% support",
    now: "The GDP warrants, which could have cost $6bn to $20bn if growth recovered, are gone. Official claims remain suspended while the war continues.",
    src: [{ t: "Interfax, 25 Dec 2025: GDP warrant restructuring completed", u: "https://interfax.com/newsroom/top-stories/115448/" }]
  },
  {
    id: "sen", iso: "SEN", name: "Senegal", frame: "Common Framework (requested)", stage: "talks",
    default: "Not in default; still paying external debt",
    imf: "Earlier $1.8bn programme suspended over misreported debt; staff-level agreement 1 Sep 2026 on about $2.2bn over 36 months, pending Board approval and a misreporting waiver",
    official: "Common Framework treatment requested Sep 2026; the IMF hosted a first meeting with external creditors on 6 Oct 2026",
    private: "CFA franc domestic debt kept outside the perimeter; the government calls it a reprofiling, not a restructuring",
    now: "The next Common Framework case and the test of whether the process can run faster than it did for Zambia and Ethiopia.",
    src: [GSDR7, { t: "Reuters via Polity, 2 Sep 2026", u: "https://polity.org.za/article/senegal-agrees-to-restore-debt-sustainability-in-return-for-imf-programme-2026-09-02" }]
  },
  {
    id: "ven", iso: "VEN", name: "Venezuela", frame: "Outside any framework", stage: "talks",
    default: "2017",
    imf: "No programme; engagement with the IMF and World Bank resumed in 2026",
    official: "China and Russia are thought to hold large claims on opaque terms",
    private: "Intent to restructure sovereign and PDVSA debt announced 13 May 2026; estimates of the total run from $150bn to $170bn; creditors' claims collide over CITGO in US courts",
    now: "Likely the largest and most legally tangled restructuring since Argentina. No terms yet.",
    src: [{ t: "PIIE, Are Venezuelan bondholders trying to jump the line?", u: "https://piie.com/blogs/realtime-economics/2026/are-venezuelan-bondholders-trying-jump-line" }, { t: "#PublicDebtIsPublic, Barriers to Venezuela's Debt Restructuring", u: "https://publicdebtispublic.mdi.georgetown.edu/wp/resources/green-light-red-tape-barriers-to-venezuelas-debt-restructuring/" }]
  },
  {
    id: "lbn", iso: "LBN", name: "Lebanon", frame: "Outside any framework", stage: "talks",
    default: "Mar 2020",
    imf: "No programme; an IMF deal depends on a financial gap law and a bank restructuring law that remain stalled",
    official: "Little official bilateral debt; the problem is private and domestic",
    private: "About $31bn of Eurobonds in default for over six years",
    now: "No restructuring can start until an IMF programme exists, and that waits on Lebanon's own banking laws.",
    src: [{ t: "ThePrint (Reuters), 11 Jan 2026", u: "https://theprint.in/world/imf-sees-some-progress-on-lebanon-reforms-says-external-support-needed/2648768" }]
  },
  {
    id: "tcd", iso: "TCD", name: "Chad", frame: "Common Framework", stage: "done",
    default: "None on bonds; debt to Glencore restructured",
    imf: "Extended Credit Facility approved Dec 2021",
    official: "Agreement Nov 2022: no nominal relief, since higher oil prices restored sustainability",
    private: "Glencore-led commercial loans reprofiled",
    now: "The first Common Framework case, closed in under two years but with almost no debt reduction.",
    src: [GSDR7, PARIS_CF]
  },
  {
    id: "sur", iso: "SUR", name: "Suriname", frame: "Outside the Common Framework", stage: "done",
    default: "2020",
    imf: "Extended Fund Facility, final review Apr 2025",
    official: "Paris Club and other official creditors agreed; prepayment of the rescheduled debt agreed in 2026",
    private: "Bond exchange closed Nov 2023, with an oil-linked value recovery instrument",
    now: "Finished: the IMF's 2026 assessment says the programme restored fiscal and debt sustainability.",
    src: [GSDR7]
  }
];

/** Who sits at the table, in the order they usually act. */
export const PLAYERS = [
  {
    name: "International Monetary Fund",
    short: "IMF",
    role: "Decides how much relief is needed and lends while it happens.",
    body: [
      "With the World Bank, the IMF writes the debt sustainability analysis that sets the size of the hole: how much debt service must be cut, over what years, for the country to recover. That figure, the restructuring envelope, is what every creditor then negotiates over.",
      "It will not approve a programme for a country whose debt is unsustainable unless creditors give credible assurances that they will restructure. Since 2023 those financing assurances can come before a final deal, which lets IMF money flow earlier.",
      "IMF loans themselves are never restructured: the Fund is treated as a preferred creditor and is paid first."
    ],
    src: [PLAYBOOK]
  },
  {
    name: "World Bank",
    short: "IDA / IBRD",
    role: "Co-writes the analysis, keeps lending, publishes the data.",
    body: [
      "The Bank's IDA arm gives grants and very cheap loans to the poorest countries, and it keeps lending through a restructuring. Like the IMF, it does not take haircuts on its own loans.",
      "Its International Debt Statistics are the standard public source for who a country owes. In September 2026 the two institutions approved a new low-income debt sustainability framework, which applies to analyses after their boards' 2027 summer recess."
    ],
    src: [GSDR7]
  },
  {
    name: "Paris Club",
    short: "Since 1956",
    role: "The traditional club of government lenders.",
    body: [
      "An informal group of mostly Western creditor governments, run from the French Treasury, that began when Argentina met its public creditors in Paris in 1956. It works by consensus and treats debtors case by case, and only once an IMF programme is in place.",
      "Its key rule is comparability of treatment: a country that gets relief from the Club must not then give better terms to any other creditor. Its standard terms (Classic, Houston, Naples, Cologne) and the 2003 Evian approach set how generous a deal can be."
    ],
    src: [{ t: "Paris Club", u: "https://clubdeparis.org/en/sites/clubdeparis/accueil.html" }]
  },
  {
    name: "G20 Common Framework",
    short: "Since Nov 2020",
    role: "Brings China and other new lenders to the same table.",
    body: [
      "For low-income countries, the Paris Club now sits in one official creditor committee with China, India, Saudi Arabia and others. The committee agrees terms with the debtor, then each creditor signs its own bilateral agreement, which can take a year or more.",
      "Four countries have used it: Chad, Zambia, Ghana and Ethiopia. Senegal asked to be the fifth in September 2026. Its weak points are speed and disputes between creditors over what counts as comparable."
    ],
    src: [PARIS_CF, GSDR7]
  },
  {
    name: "Global Sovereign Debt Roundtable",
    short: "Since 2023",
    role: "Where everyone agrees the rules of thumb.",
    body: [
      "Co-chaired by the IMF, the World Bank and the G20 presidency, with debtors, official lenders and private creditors in the room. It reports progress each April and October and publishes a playbook for governments facing restructuring.",
      "Its recent agreements: bilateral deals should normally be signed within 12 months of the committee's memorandum, a template memorandum now exists, and there is no presumption either way about including domestic debt."
    ],
    src: [GSDR7, PLAYBOOK]
  },
  {
    name: "Private creditors",
    short: "Bondholders and banks",
    role: "Negotiate last, and bind each other by vote.",
    body: [
      "Bondholders organise into ad hoc committees with financial and legal advisers; commercial banks and commodity traders negotiate separately. They usually settle after the official creditors, and the official committee then checks whether the deal is comparable.",
      "Modern bonds carry collective action clauses: if a large enough majority agrees, the new terms bind everyone, which limits holdouts. Recent deals often add value recovery instruments that pay more if the economy or a commodity does better than the IMF forecast."
    ],
    src: [PLAYBOOK]
  },
  {
    name: "China",
    short: "Largest bilateral lender to many poor countries",
    role: "A creditor the old system was not built for.",
    body: [
      "Chinese state lenders are the biggest official creditor for many low-income countries but are not Paris Club members. China co-chairs committees under the Common Framework (Zambia, Ethiopia) and has pressed hard for strict comparability, arguing that private and multilateral lenders should share losses too.",
      "Arguments over which Chinese lenders count as official, and whether the World Bank and IMF should take losses, slowed Zambia's case in particular."
    ],
    src: [{ t: "CNBC Africa, Paris Club says Common Framework needs fixing", u: "https://www.cnbcafrica.com/2026/debt-restructuring-framework-for-poorer-nations-needs-fixing-paris-club-says" }]
  }
];

/** How a restructuring runs, condensed from the GSDR playbook. */
export const STEPS = [
  { t: "Stop and prepare", d: "The government decides its debt cannot be paid, often suspends payments, and hires financial and legal advisers. It talks to IMF and World Bank staff early." },
  { t: "Size the hole", d: "IMF and World Bank staff write the debt sustainability analysis and the programme's numbers. These fix the restructuring envelope: how much relief creditors must give in total." },
  { t: "Staff-level agreement", d: "The IMF and the government agree a programme of reforms and loans, still subject to the IMF Board." },
  { t: "Financing assurances", d: "Official creditors form a committee and promise to restructure in line with the envelope. With those assurances the IMF Board approves the programme and money starts to flow." },
  { t: "Official deal", d: "The committee agrees terms in principle, then a memorandum, then each government signs a bilateral agreement. The playbook now expects that within 12 months of the memorandum." },
  { t: "Private deal", d: "Bondholders and commercial lenders negotiate. The official committee checks that their deal is comparable before it goes ahead." },
  { t: "Exchange", d: "Old bonds are swapped for new ones. Collective action clauses bind the minority who vote no; any who still refuse may sue." },
  { t: "Back to normal", d: "The IMF programme runs its reviews, and the country tries to return to markets. Holdout litigation can go on for years." }
];

/** Concepts a reader needs to follow the cases. */
export const TERMS = [
  { t: "Comparability of treatment", d: "No creditor should get a better deal than the official creditors gave. Measured mainly by the cut in net present value and by debt service relief during the IMF programme, not only by the face-value haircut." },
  { t: "Restructuring perimeter", d: "Which debts are inside the deal. IMF and World Bank loans and, usually, short-term trade finance are outside; domestic debt may or may not be." },
  { t: "Haircut", d: "The loss to creditors. A face-value haircut cuts the amount owed; a net present value haircut also counts lower interest and longer maturities, and is usually larger." },
  { t: "Preferred creditor treatment", d: "The custom that the IMF and the multilateral banks are repaid in full and take no losses. China and others have challenged it for the development banks." },
  { t: "Lending into arrears", d: "The IMF policy that lets it lend to a country that is behind on payments to private creditors if the country is negotiating in good faith, and to official creditors only under stricter conditions." },
  { t: "Value recovery instrument", d: "An extra payment that kicks in if growth, exports or a commodity price beats the IMF forecast. Used in Ghana, Zambia, Sri Lanka and Suriname to bridge disagreements about the future." },
  { t: "Holdout", d: "A creditor who refuses the exchange and sues for full payment, often having bought the debt cheaply on the secondary market. Critics call them vulture funds." }
];

/** The law and the courts. */
export const LAW = [
  {
    t: "NML Capital v Argentina (New York, 2012–2016)",
    d: "Holdouts from Argentina's 2001 default persuaded Judge Griesa that the bonds' pari passu (equal treatment) clause barred Argentina from paying the 93% who had exchanged unless it also paid the holdouts in full. The Second Circuit upheld the injunction and the US Supreme Court declined to hear the case in 2014, blocking Argentina's payments. Argentina settled in 2016, paying the largest holdouts about 75% of their judgments, roughly $4.65bn to NML and the funds alongside it.",
    src: [{ t: "Jones Day, Sovereign Debt Update (2016)", u: "https://jonesday.com/Sovereign-Debt-Update-06-01-2016" }, { t: "VOA (Reuters): Argentina settles with holdouts", u: "https://voanews.com/a/argentina-creditors-settle-fourteen-years-default-billions/3213996.html" }]
  },
  {
    t: "Donegal International v Zambia [2007] EWHC 197 (Comm)",
    d: "A fund bought a Zambian debt (from 1979 loans for Romanian tractors) for about $3.3m in 1999 and sued in London for over $55m. The court held Zambia bound by its 1999 settlement but cut the sum sharply, rejecting much of the interest and costs. The case became the leading argument for the UK's 2010 law.",
    src: [{ t: "Judgment, [2007] EWHC 197 (Comm)", u: "https://www.felixsalmon.com/donegal_zambia.pdf" }, { t: "Elusive certainty: implications of Donegal v Zambia (IFLR)", u: "https://core.ac.uk/download/42338017.pdf" }]
  },
  {
    t: "Debt Relief (Developing Countries) Act 2010 (UK)",
    d: "Limits what a creditor can recover in UK courts on the debt of a heavily indebted poor country to what it would have received under the HIPC initiative's terms. Made permanent in 2011.",
    src: []
  },
  {
    t: "Belgium's law of 12 July 2015",
    d: "Lets Belgian courts limit a creditor to the price it paid for sovereign debt when it seeks an illegitimate advantage, for example by buying at a deep discount and suing a country in crisis.",
    src: []
  },
  {
    t: "Collective action clauses",
    d: "Clauses that let a supermajority of bondholders change payment terms for all. Since the 2014 model clauses, a single vote across all bond series (aggregation) stops holdouts from buying a blocking stake in one series. Greece in 2012 wrote such a clause into its own law retroactively for local-law bonds.",
    src: []
  },
  {
    t: "Hamilton Reserve Bank v Sri Lanka (New York, pending)",
    d: "A holder of Sri Lanka's 2022 bond who refused the exchange is suing for full payment. The GSDR's October 2026 report says a ruling is awaited with no date set.",
    src: [GSDR7]
  },
  {
    t: "New York bills (proposed, not law)",
    d: "New York law governs about half of sovereign bonds. The Sovereign Debt Stability Act would create a restructuring process with caps on holdout recoveries; a narrower champerty bill would let courts dismiss claims on debt bought mainly to sue. Neither has passed both houses as of November 2026.",
    src: [{ t: "NY Senate, S2333 Sovereign Debt Stability Act", u: "https://www.nysenate.gov/legislation/bills/2025/S2333" }, { t: "Insurance Journal, 4 Jun 2026", u: "https://amp.insurancejournal.com/news/east/2026/06/04/872397.htm" }]
  }
];

/** Headlines about sovereign debt, for the live list on the screen. */
export const SOV_RE = /\b(IMF|International Monetary Fund|World Bank|Paris Club|Common Framework|bondholders?|Eurobonds?|haircut|debt (relief|restructuring|treatment|swap|default)|sovereign (debt|default|bonds?)|defaults? on|creditors?)\b/i;

/** Ready questions for the analyst. */
export const SOV_QUESTIONS = [
  ["Comparability of treatment", "Explain comparability of treatment in sovereign debt restructuring, using Ethiopia's 2026 bond deal as the example: why the January deal was rejected and what changed by June."],
  ["Why the IMF goes first", "Why does the IMF's debt sustainability analysis come before any creditor negotiation, and what are financing assurances?"],
  ["How CACs stop holdouts", "How do aggregated collective action clauses work, and why did Argentina's older bonds let holdouts win the pari passu case?"],
  ["Is the Common Framework working?", "Is the G20 Common Framework working? Compare Chad, Zambia, Ghana and Ethiopia on speed and debt relief, and say what Senegal's case will test."]
];
