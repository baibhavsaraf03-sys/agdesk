/**
 * The framework layer.
 *
 * Each entry is something a student at LSE, Oxford, Bocconi, HEC, Chicago or
 * Wharton is examined on, written so it can be applied to whatever the
 * terminal is showing today. The `apply` field is the prompt that asks the
 * analyst to do exactly that, which is the point of the whole section:
 * seminar contributions and exam answers are graded on whether you can take a
 * framework off the shelf and use it on something real.
 */

export const DISCIPLINES = [
  /* ===================================================================== */
  {
    code: "ECON",
    title: "Economics",
    blurb:
      "The models you are examined on, each paired with what it actually predicts and where it breaks. Apply any of them to today's market reads.",
    tracks: [
      {
        name: "Microeconomics",
        items: [
          {
            t: "Elasticity",
            s: "How much quantity moves when price does — and why that decides who bears a tax.",
            b: "Price elasticity of demand is the percentage change in quantity divided by the percentage change in price. Below 1 in absolute terms, demand is inelastic: people buy nearly the same amount however the price moves. Above 1, elastic.\n\nThe exam point is almost never the number itself. It is incidence: when demand is inelastic and supply elastic, buyers bear nearly the whole burden of a tax or a supply shock. That is why energy and staple food shocks hit household budgets so hard and why governments reach for subsidies rather than letting the price clear.",
            news:
              "Any commodity price spike. Rice demand is highly inelastic, which is precisely why a 10% supply disruption produces a far larger price move and why exporting governments intervene.",
            apply:
              "Take the most significant price move on the terminal today and analyse it through elasticity: estimate whether demand and supply are elastic or inelastic, work out who bears the burden, and say what that predicts about government intervention."
          },
          {
            t: "Market failure and externalities",
            s: "When prices leave something out, markets produce the wrong quantity.",
            b: "An externality is a cost or benefit falling on someone outside the transaction. Pollution is the classic negative one; vaccination the classic positive. Where externalities exist, the private optimum diverges from the social optimum, and the market produces too much or too little.\n\nThe Pigouvian answer is a tax or subsidy equal to the external cost. The Coasean answer is that if property rights are clear and bargaining is cheap, parties will negotiate to the efficient outcome regardless of who holds the right. Which answer an examiner wants usually depends on whether transaction costs are the focus.",
            news:
              "Carbon pricing, emissions trading schemes, and the fight over who pays for climate adaptation.",
            apply:
              "Identify an externality visible in today's market reads, name whether it is positive or negative, and compare what a Pigouvian tax and a Coasean bargain would each prescribe."
          },
          {
            t: "Game theory and strategic interaction",
            s: "Outcomes when each player's best move depends on what everyone else does.",
            b: "A Nash equilibrium is a set of strategies where nobody gains by deviating alone. The prisoner's dilemma shows that individually rational choices can produce collectively terrible outcomes. Repeated play changes this: cooperation becomes sustainable when the shadow of the future is long enough.\n\nFor finance and politics, the useful extensions are commitment and credibility. A threat only works if carrying it out would be rational when the moment comes. Most central bank communication, most trade negotiation and most cartel behaviour is an exercise in making otherwise incredible commitments believable.",
            news:
              "OPEC+ production decisions, trade tariff retaliation, central bank forward guidance.",
            apply:
              "Find a situation in today's reads with two or more strategic actors, model it as a game, identify the equilibrium, and explain what would have to change for the outcome to shift."
          },
          {
            t: "Information asymmetry",
            s: "When one side knows more, markets can unravel entirely.",
            b: "Akerlof's market for lemons shows that if buyers cannot tell good from bad, they pay an average price, good sellers withdraw, quality falls, price falls again, and the market can collapse. Adverse selection happens before a transaction; moral hazard after it, when being insured changes behaviour.\n\nThe standard remedies are signalling, where the informed party takes a costly action only worth taking if their type is good, and screening, where the uninformed party designs a menu that sorts types. Education as a signal, deductibles as screening, credit ratings as a mix of both.",
            news:
              "Private credit valuation opacity, which regulators have flagged precisely because nobody outside can price the assets.",
            apply:
              "Identify an information asymmetry in today's reads, classify it as adverse selection or moral hazard, and assess whether existing signalling or screening mechanisms are adequate."
          },
          {
            t: "Behavioural economics",
            s: "Systematic departures from the rational actor, and when they matter.",
            b: "Prospect theory holds that people evaluate outcomes as gains and losses relative to a reference point rather than in absolute terms, and that losses hurt roughly twice as much as equivalent gains please. That alone explains the disposition effect, where investors sell winners too early and hold losers too long.\n\nOther workhorses: anchoring, where an irrelevant number shapes a judgement; availability, where vivid events are overweighted; and overconfidence, which is the best-documented predictor of excessive trading and underperformance.",
            news:
              "Retail trading loss statistics. Regulators repeatedly find most individual derivatives traders lose, and the behavioural literature explains why the pattern is so stable.",
            apply:
              "Pick a market move on the terminal and identify which behavioural biases would plausibly be driving participants, distinguishing carefully between a bias and a rational response to new information."
          }
        ]
      },
      {
        name: "Macroeconomics",
        items: [
          {
            t: "IS-LM and AD-AS",
            s: "The workhorse models for what moves output, prices and interest rates together.",
            b: "IS-LM puts goods-market equilibrium against money-market equilibrium and gives you the interest rate and output level where both hold. Fiscal expansion shifts IS right, raising output and rates; monetary expansion shifts LM right, raising output and lowering rates.\n\nAD-AS extends this to prices. The examinable content is usually the crowding-out debate: how much does government borrowing raise rates and squeeze private investment? The answer depends on where you are in the cycle and how the central bank responds, which is why the same policy can be expansionary in a slump and merely inflationary at full employment.",
            news:
              "Any large fiscal deficit running alongside tight monetary policy. The US combination of a deficit near 6% of GDP with restrictive rates is the textbook setup.",
            apply:
              "Use IS-LM to analyse the current fiscal and monetary mix in whichever economy features most in today's reads, and state what the model predicts for rates and output."
          },
          {
            t: "The Phillips curve",
            s: "The inflation-unemployment trade-off, and why it keeps dying and coming back.",
            b: "The original curve claimed a stable trade-off: lower unemployment, higher inflation. The 1970s destroyed it. Friedman and Phelps showed that once expectations adjust, the long-run curve is vertical at the natural rate, so there is no permanent trade-off, only a temporary one while expectations lag.\n\nThe modern New Keynesian version makes inflation depend on expected future inflation and the output gap. That is why central bankers obsess over expectations: if they become unanchored, disinflation requires a far deeper recession. Anchoring is the entire argument for independence and inflation targets.",
            news:
              "Post-shock disinflation. When headline inflation falls back from a supply shock without a recession, the anchoring story is doing the work.",
            apply:
              "Assess whether inflation expectations appear anchored in the economies covered by today's reads, and say what evidence would change your view."
          },
          {
            t: "The Taylor rule",
            s: "A formula for what the policy rate should be — and a yardstick for what it is.",
            b: "The rule sets the nominal policy rate equal to the neutral real rate plus current inflation, plus a weight on the inflation gap and a weight on the output gap. Taylor's original weights were 0.5 on each.\n\nIts value is not that central banks follow it, because they do not mechanically. It is that it gives you a benchmark. When the actual rate sits far below the rule, policy is loose relative to conditions; far above and it is tight. Essay answers that compute the gap and then explain the deviation score much better than ones that describe policy narratively.",
            news:
              "Any central bank decision. Compute the implied rule rate from current inflation and the output gap, then compare.",
            apply:
              "Compute an approximate Taylor rule rate for the main central bank featured in today's reads, compare it to the actual policy rate, and explain the gap."
          },
          {
            t: "The impossible trinity",
            s: "Free capital movement, a fixed exchange rate, independent monetary policy: pick two.",
            b: "A country cannot simultaneously have an open capital account, a pegged exchange rate and a monetary policy aimed at domestic conditions. Attempting all three means the peg breaks, capital controls appear, or policy independence is surrendered.\n\nThis is the single most useful frame for emerging market crises and for understanding why the euro area has the structure it does. Members gave up independent monetary policy to keep capital mobility and a fixed rate within the union. China keeps policy independence and a managed rate by restricting capital flows.",
            news:
              "Currency interventions, capital control announcements, and any central bank defending a peg.",
            apply:
              "Identify a country in today's reads facing the trilemma, say which corner it has chosen, and analyse the cost of that choice."
          },
          {
            t: "Solow growth and convergence",
            s: "Why poor countries can grow fast, and why that eventually stops.",
            b: "Output depends on capital, labour and technology. With diminishing returns to capital, an economy accumulating capital grows quickly at first and slows as it approaches its steady state. Long-run growth per worker therefore comes only from technological progress, which the basic model leaves unexplained.\n\nConditional convergence is the testable claim: countries converge to their own steady state, determined by savings rates, population growth and institutions, not to a common one. That caveat is where most of the interesting work happens, and it is why institutional quality dominates modern growth empirics.",
            news:
              "India's growth trajectory, and arguments about whether it can sustain high growth as its capital stock deepens.",
            apply:
              "Apply the Solow framework to the fastest-growing economy in today's reads: identify what is driving growth now and what would be required to sustain it."
          },
          {
            t: "Financial accelerator and balance sheet channels",
            s: "Why small shocks become large recessions when balance sheets are stretched.",
            b: "Bernanke, Gertler and Gilchrist showed that credit market frictions amplify shocks. When asset prices fall, borrowers' net worth falls, collateral shrinks, lenders demand more, borrowing falls, spending falls, and asset prices fall again. The mechanism runs both ways, which is why credit booms and busts are asymmetric and why recoveries from financial crises are slow.\n\nThis is the theoretical backbone of macroprudential regulation: capital buffers, loan-to-value caps and stress tests all exist to stop the amplifier running.",
            news:
              "Commercial real estate refinancing at higher rates, margin debt at records, and private credit leverage stacked at fund and portfolio level.",
            apply:
              "Identify where in today's reads the financial accelerator could operate, and assess which balance sheets would transmit a shock."
          }
        ]
      },
      {
        name: "Trade and development",
        items: [
          {
            t: "Comparative advantage",
            s: "Trade gains come from relative, not absolute, efficiency.",
            b: "Ricardo's result is that two countries gain from trade even when one is better at producing everything, so long as their opportunity costs differ. The Heckscher-Ohlin extension predicts countries export goods intensive in their abundant factor.\n\nStolper-Samuelson is the part that explains politics: trade raises the real return to the abundant factor and lowers it for the scarce one. That is why trade liberalisation produces domestic losers who are concentrated and vocal, while the gains are diffuse. Any essay on trade politics that misses this is incomplete.",
            news:
              "Tariff policy, supply chain reshoring, and which domestic industries lobby hardest against it.",
            apply:
              "Take a trade development in today's reads and identify, using Stolper-Samuelson, which domestic groups gain and lose and what political response that predicts."
          },
          {
            t: "Institutions and growth",
            s: "Why some countries are rich: the property rights argument and its critics.",
            b: "Acemoglu, Johnson and Robinson argue that inclusive institutions, which secure property rights and permit broad participation, cause growth, while extractive institutions concentrate rents and suppress it. Their colonial settler-mortality instrument was an attempt to establish causation rather than correlation.\n\nThe critiques are examinable too: geography arguments from Diamond and Sachs, the cultural strand from Weber through Putnam, and the East Asian developmental state literature, which shows sustained growth under institutions that were far from inclusive.",
            news:
              "Any comparison of emerging market trajectories, and debates about state capacity in rapid industrialisation.",
            apply:
              "Compare two economies appearing in today's reads through the institutional lens, and say honestly where the institutional explanation struggles."
          },
          {
            t: "Dutch disease and the resource curse",
            s: "Why resource wealth can make an economy poorer.",
            b: "A resource boom raises the real exchange rate, which makes manufacturing and tradable services uncompetitive. The tradable sector shrinks, and when the resource price falls there is nothing to fall back on. That is the economic mechanism.\n\nThe political mechanism is separate and arguably stronger: resource rents are easy to tax and easy to capture, which weakens the fiscal bargain between state and citizen, funds patronage, and makes authoritarian durability cheaper. Both channels are examinable and they are often conflated.",
            news:
              "Commodity exporters during price booms, and sovereign wealth fund design as the standard remedy.",
            apply:
              "Identify a resource-dependent economy in today's reads and assess which channel of the resource curse, economic or political, is more binding there."
          }
        ]
      }
    ]
  },

  /* ===================================================================== */
  {
    code: "LAW",
    title: "Law",
    blurb:
      "Doctrine, leading cases and the regulators that matter, oriented toward commercial and financial practice in the UK, EU and US.",
    tracks: [
      {
        name: "Contract and obligations",
        items: [
          {
            t: "Formation and consideration",
            s: "What turns a negotiation into a binding agreement.",
            b: "The common law requires offer, acceptance, consideration and intention to create legal relations. Consideration must move from the promisee and must be sufficient but need not be adequate, which is why nominal consideration works and past consideration does not.\n\nCivil law systems do without consideration entirely, relying on cause or simply on consent. That divergence matters commercially: a gratuitous promise enforceable in Germany may be unenforceable in England, which is one reason choice-of-law clauses are negotiated as hard as substantive terms.",
            news:
              "Any cross-border commercial dispute where the governing law clause determines the outcome.",
            apply:
              "Explain how a common law and a civil law court would differ in approaching the enforceability of a gratuitous commercial undertaking."
          },
          {
            t: "Breach, remedies and remoteness",
            s: "What you actually get when the other side fails to perform.",
            b: "The expectation measure puts the claimant in the position they would have occupied had the contract been performed. Hadley v Baxendale limits recovery to losses arising naturally or within the reasonable contemplation of both parties at formation, which is why unusual losses must be flagged in advance.\n\nSpecific performance is exceptional in the common law and ordinary in civil systems. Penalty clauses are unenforceable in England following Cavendish v Makdessi, which replaced the old genuine pre-estimate test with a question about whether the clause protects a legitimate interest and is proportionate.",
            news:
              "Supply chain disruption litigation, and force majeure arguments after shocks.",
            apply:
              "Analyse a commercial disruption visible in today's reads as a contract problem: identify likely breaches, the measure of damages and the remoteness limits."
          },
          {
            t: "Negligence and economic loss",
            s: "Why the law is reluctant to compensate pure financial harm.",
            b: "Negligence requires duty, breach, causation and damage not too remote. Duty in novel situations follows the Caparo factors: foreseeability, proximity, and whether it is fair, just and reasonable to impose one.\n\nPure economic loss, unaccompanied by physical damage, is generally irrecoverable. The exception from Hedley Byrne covers negligent misstatement where there is an assumption of responsibility and reasonable reliance. That exception is the foundation of auditor and adviser liability, and Caparo itself narrowed it sharply by holding auditors owe no duty to individual investors.",
            news:
              "Auditor liability after corporate failures; adviser negligence claims following investment losses.",
            apply:
              "Assess whether an adviser or auditor would owe a duty of care to investors in a scenario drawn from today's reads, applying Caparo and Hedley Byrne."
          }
        ]
      },
      {
        name: "Company and securities",
        items: [
          {
            t: "Separate legal personality and lifting the veil",
            s: "Salomon, and the very narrow circumstances in which courts look behind it.",
            b: "Salomon v Salomon established that a properly incorporated company is a distinct legal person, so its debts are not its members'. Limited liability follows from that and is the foundation of modern capital markets.\n\nThe veil is lifted rarely. Prest v Petrodel confined it to the evasion principle: where a person deliberately interposes a company to frustrate an existing legal obligation. Concealment alone is not enough, because the court can simply look at the facts. Most claimants now succeed on other grounds, such as trusts or agency, rather than on veil-piercing.",
            news:
              "Group insolvencies and attempts to reach parent company assets.",
            apply:
              "Explain, using Prest, when a claimant could reach a parent company's assets in a corporate group failure of the kind seen in today's reads."
          },
          {
            t: "Directors' duties",
            s: "Who directors owe duties to, and what happens near insolvency.",
            b: "Under the Companies Act 2006 directors must promote the success of the company for the benefit of members as a whole, having regard to a statutory list including employees, suppliers, the environment and long-term consequences. The section 172 list is a process requirement, not a licence for stakeholders to sue.\n\nThe shift that matters is the creditor duty. BTI v Sequana confirmed that as insolvency becomes probable, directors must consider creditors' interests, and the weight of that consideration increases as insolvency approaches. That is the single most practically important company law development of recent years.",
            news:
              "Rising corporate insolvencies, where boards must decide when to pivot to creditor interests.",
            apply:
              "Analyse when the creditor duty would engage for a company in financial distress of the kind appearing in today's reads, and what directors should do differently."
          },
          {
            t: "Insider dealing and market abuse",
            s: "The offence, the civil regime, and why the two differ.",
            b: "The UK Market Abuse Regulation prohibits insider dealing, unlawful disclosure and market manipulation on a civil standard enforced by the FCA. Criminal insider dealing under the Criminal Justice Act 1993 requires a higher standard and is prosecuted far less often.\n\nIn the US, there is no general insider dealing statute. Liability is built on Rule 10b-5 fraud, which requires a breach of a duty: the classical theory covers insiders trading on their own company's information, the misappropriation theory covers outsiders breaching a duty to the information's source, and Dirks governs tippee liability through the personal benefit test.",
            news:
              "Enforcement actions around major corporate announcements and earnings.",
            apply:
              "Compare how the UK and US regimes would treat a hypothetical trade ahead of a market-moving announcement from today's reads."
          },
          {
            t: "Financial regulation architecture",
            s: "Who regulates what, and the post-2008 settlement.",
            b: "The UK runs twin peaks: the FCA for conduct and market integrity, the PRA within the Bank of England for prudential soundness of banks and insurers. The EU runs ESMA, EBA and EIOPA alongside national authorities, with MiFID II governing conduct and market structure. The US is fragmented across the SEC, CFTC, Federal Reserve, OCC and state regulators.\n\nThe examinable themes are regulatory arbitrage, where activity migrates to the least demanding jurisdiction or into the non-bank sector, and the perimeter problem, where risk accumulates just outside supervision. Private credit growth is the live example.",
            news:
              "Financial Stability Board work on non-bank leverage and private credit.",
            apply:
              "Identify a regulatory perimeter problem visible in today's reads and assess which authority, if any, has the tools to address it."
          }
        ]
      },
      {
        name: "Competition and public law",
        items: [
          {
            t: "Abuse of dominance and cartels",
            s: "Articles 101 and 102, and the Chicago-Brussels divergence.",
            b: "Article 101 TFEU prohibits agreements restricting competition; Article 102 prohibits abuse of a dominant position. Dominance is usually inferred above roughly 40 to 50% market share, though the real test is the ability to act independently of competitors and customers.\n\nThe transatlantic divergence is examinable and real. US antitrust since the 1970s has centred consumer welfare measured by price, making it reluctant to intervene absent demonstrable harm. EU competition law retains a stronger concern with market structure and protection of the competitive process itself, which is why EU enforcement against large technology firms has been more aggressive.",
            news:
              "Digital markets enforcement, the DMA, and merger challenges in concentrated sectors.",
            apply:
              "Take a market concentration issue from today's reads and analyse how EU and US authorities would each approach it."
          },
          {
            t: "Judicial review and proportionality",
            s: "How courts police the exercise of public power.",
            b: "The traditional English grounds are illegality, irrationality and procedural impropriety, with legitimate expectation as a fourth strand. Wednesbury unreasonableness sets a high bar: a decision so unreasonable no reasonable authority could have reached it.\n\nProportionality, imported through EU law and the Human Rights Act, is more intensive: the measure must pursue a legitimate aim, be rationally connected to it, be no more intrusive than necessary, and strike a fair balance. Which standard applies, and whether proportionality is displacing Wednesbury generally, is a live and heavily examined question.",
            news:
              "Challenges to emergency economic measures, sanctions designations and regulatory decisions.",
            apply:
              "Assess a government or regulatory intervention in today's reads as a judicial review problem, identifying the grounds and the likely standard of scrutiny."
          },
          {
            t: "Sanctions and extraterritoriality",
            s: "When one state's law reaches across borders, and what happens when regimes collide.",
            b: "US secondary sanctions reach non-US persons dealing with designated parties, enforced through dollar clearing and access to US markets. The EU's Blocking Statute purports to make compliance with certain US measures unlawful within the EU, putting multinationals in genuine conflict of laws.\n\nThe doctrinal questions are the basis for jurisdiction under international law, the effects doctrine, and whether comity constrains any of it in practice. The honest answer is that enforcement capacity rather than doctrine usually determines the outcome.",
            news:
              "Export controls, energy sanctions, and compliance decisions by banks and commodity traders.",
            apply:
              "Analyse a sanctions or export control measure in today's reads: identify the jurisdictional basis claimed and the conflicts it creates for multinational firms."
          }
        ]
      }
    ]
  },

  /* ===================================================================== */
  {
    code: "IR",
    title: "International Relations",
    blurb:
      "The theoretical traditions and the mid-range theories, applied to what is actually happening in the world economy today.",
    tracks: [
      {
        name: "The major traditions",
        items: [
          {
            t: "Realism",
            s: "States pursue security in anarchy; capability, not intention, is what counts.",
            b: "Classical realism locates conflict in human nature; neorealism, following Waltz, locates it in structure. Without a sovereign above states, each must provide its own security, and efforts to do so threaten others. That is the security dilemma, and it operates even between states with no aggressive intent.\n\nOffensive realism, associated with Mearsheimer, holds that states maximise relative power and that great power competition is therefore unavoidable. Defensive realism holds that security is usually achievable short of hegemony. The distinction matters for what each predicts about rising powers.",
            news:
              "Supply chain securitisation, export controls on strategic technology, and resource nationalism.",
            apply:
              "Apply a realist reading to the most geopolitically significant development in today's reads, and state what it predicts next."
          },
          {
            t: "Liberalism and institutions",
            s: "Why cooperation persists even without a world government.",
            b: "Liberal institutionalism accepts anarchy but argues institutions reduce transaction costs, provide information, lengthen the shadow of the future and make defection detectable. That shifts the payoff structure enough to sustain cooperation. Keohane's work on regimes after hegemony is the canonical statement.\n\nCommercial liberalism adds that economic interdependence raises the cost of conflict, and democratic peace theory adds that democracies rarely fight one another. Both claims have serious empirical literatures and serious critics, and examiners reward knowing the critiques.",
            news:
              "WTO dispute settlement, climate agreements, and whether institutions constrain great powers in practice.",
            apply:
              "Assess whether international institutions are constraining or merely reflecting state behaviour in a development from today's reads."
          },
          {
            t: "Constructivism",
            s: "Interests are not given; they are produced by ideas, norms and identity.",
            b: "Wendt's claim that anarchy is what states make of it is the standard entry point. The same material structure can produce rivalry or community depending on shared understandings. Five hundred British nuclear weapons mean something different to Washington than five North Korean ones, and no materialist theory explains that.\n\nThe mechanisms are norm entrepreneurship, norm cascades and internalisation. Constructivism is strongest at explaining change that materialist theories cannot, such as decolonisation or the taboo on chemical weapons, and weakest at prediction.",
            news:
              "Shifts in what counts as a legitimate economic weapon, and the normalisation of economic statecraft.",
            apply:
              "Give a constructivist account of a development in today's reads, focusing on how definitions of legitimate behaviour are shifting."
          }
        ]
      },
      {
        name: "International political economy",
        items: [
          {
            t: "Hegemonic stability",
            s: "Open economic orders need a dominant state willing to pay for them.",
            b: "Kindleberger argued the interwar depression deepened because Britain could no longer stabilise the system and the United States would not. The theory holds that an open trading order is a public good requiring a hegemon to underwrite liquidity, absorb imports in downturns and enforce rules.\n\nThe critique is substantial: Keohane showed regimes outlived American preponderance, and the theory struggles to explain cooperation during relative decline. The current version of the debate concerns whether anyone will underwrite the system as American willingness narrows.",
            news:
              "Dollar dominance, the scale of US external liabilities, and reserve currency alternatives.",
            apply:
              "Assess the hegemonic stability argument against the current position of the dollar and US external balance as shown in today's reads."
          },
          {
            t: "Weaponised interdependence",
            s: "Networks built for efficiency become instruments of coercion.",
            b: "Farrell and Newman's argument is that globalised networks are not flat. They have hubs, and states with jurisdiction over hubs gain two capacities: the panopticon effect, seeing flows others cannot, and the chokepoint effect, cutting others off. Dollar clearing, SWIFT, semiconductor fabrication and cloud infrastructure are the canonical examples.\n\nThis is the most useful recent framework for economic statecraft, because it explains why interdependence produces leverage rather than only mutual restraint, which is the opposite of what commercial liberalism predicted.",
            news:
              "Financial sanctions, semiconductor export controls, and attempts to build parallel payment systems.",
            apply:
              "Identify a chokepoint visible in today's reads, say who controls it, and assess how durable that control is."
          },
          {
            t: "The security dilemma in economics",
            s: "Defensive economic measures that make everyone less secure.",
            b: "The logic transfers directly. One state secures its supply chains, which another reads as an attempt at leverage, prompting its own securitisation, prompting further measures. Each step is defensive in intent and threatening in effect.\n\nThe result is fragmentation that leaves all parties with higher costs and less resilience than cooperative arrangements would. Distinguishing genuine security requirements from protectionism dressed in security language is the analytically hard part and the thing examiners test.",
            news:
              "Critical minerals policy, food export restrictions, and friend-shoring initiatives.",
            apply:
              "Take an economic security measure in today's reads and assess whether it is a genuine security response or protectionism, and what spiral it may set off."
          },
          {
            t: "Food and energy security",
            s: "Why staple commodities are political before they are economic.",
            b: "Food price spikes have a documented association with political instability, which is why exporting governments restrict exports during shortages even though it worsens global supply. Each unilaterally rational restriction makes the aggregate shortage more severe, a collective action failure with a clear game-theoretic structure.\n\nThe Russian invasion of Ukraine and successive export bans on rice and wheat are the modern cases. Energy works similarly but with more concentrated producers, making cartel dynamics rather than panic hoarding the dominant mechanism.",
            news:
              "Rice and sugar export policy, fertiliser trade disruption, and food price indices.",
            apply:
              "Analyse an agricultural trade restriction in today's reads as a collective action problem, and assess what institutional arrangement could mitigate it."
          }
        ]
      }
    ]
  },

  /* ===================================================================== */
  {
    code: "POL",
    title: "Political Science",
    blurb:
      "Comparative politics and political economy: why governments do what they do, and why similar pressures produce different outcomes.",
    tracks: [
      {
        name: "Institutions and policymaking",
        items: [
          {
            t: "Veto players",
            s: "Policy change requires every actor with a veto to agree, so count them.",
            b: "Tsebelis showed that the capacity for policy change depends on the number of veto players, the ideological distance between them, and their internal cohesion. More players, further apart, means more status quo bias.\n\nThis travels well. It explains why US fiscal consolidation is hard, why coalition governments struggle with structural reform, and why crises often produce change: they temporarily collapse the distance between players. It is also the most immediately usable framework in comparative essays, because it generates predictions rather than descriptions.",
            news:
              "Budget deadlocks, debt ceiling fights, and EU fiscal rule negotiation.",
            apply:
              "Count the veto players in a policy question from today's reads and predict whether meaningful change is likely."
          },
          {
            t: "Median voter and its limits",
            s: "Why parties converge, and the many reasons they often don't.",
            b: "Downs predicted that in a two-party system with single-peaked preferences on one dimension, both parties converge on the median voter. The prediction is elegant and frequently wrong, and the reasons it fails are the examinable content.\n\nPrimaries pull candidates toward party medians. Multi-dimensional issue spaces destroy the single-peaked assumption. Activists and donors supply resources conditional on positioning. Turnout is not uniform across the distribution. Each of these is a well-developed literature in its own right.",
            news:
              "Policy polarisation on economic questions and the politics of inflation.",
            apply:
              "Explain why a current economic policy debate in today's reads has not converged on the median voter position."
          },
          {
            t: "State capacity",
            s: "What governments can actually do, as distinct from what they announce.",
            b: "State capacity has fiscal, administrative and coercive dimensions. Tilly's argument that war made the state and the state made war locates the origin of modern fiscal capacity in military competition. Contemporary work ties capacity to development outcomes more tightly than regime type does.\n\nThe practical analytical move is to separate announcement from implementation. A government announcing an ambitious subsidy or enforcement regime may lack the administrative machinery to deliver it, and whether it does is usually observable in advance.",
            news:
              "Subsidy schemes, tax collection reform, and credit programmes in emerging markets.",
            apply:
              "Assess whether a government in today's reads has the capacity to implement a policy it has announced, and what evidence supports your view."
          }
        ]
      },
      {
        name: "Political economy",
        items: [
          {
            t: "Varieties of capitalism",
            s: "Liberal and coordinated market economies solve the same problems differently.",
            b: "Hall and Soskice distinguish liberal market economies, which coordinate through competitive markets and arm's-length contracting, from coordinated market economies, which use non-market relationships: industry associations, bank-based finance, works councils.\n\nThe key claim is institutional complementarity. Patient bank finance supports firm-specific skills, which support incremental innovation; arm's-length finance supports general skills and radical innovation. That predicts different specialisations and explains why institutional transplants so often fail.",
            news:
              "German and French corporate financing versus US capital markets; the structure of European equity markets.",
            apply:
              "Compare how a liberal and a coordinated market economy in today's reads are responding to the same economic pressure, and explain the divergence institutionally."
          },
          {
            t: "Collective action and concentrated interests",
            s: "Small organised groups beat large diffuse ones, reliably.",
            b: "Olson's logic is that large groups face free-riding because each member's contribution is negligible and benefits are non-excludable, while small groups with concentrated stakes organise easily. The result is that policies imposing small costs on many and large benefits on few persist against the general interest.\n\nThis explains agricultural subsidies, tariff protection and regulatory capture more economically than any other framework, and it is the standard answer to why obviously welfare-reducing policies survive democratic scrutiny.",
            news:
              "Agricultural support programmes and sectoral protection measures.",
            apply:
              "Identify a policy in today's reads that concentrates benefits and disperses costs, and name the organised interest sustaining it."
          },
          {
            t: "Political business cycles",
            s: "Whether and how incumbents manipulate the economy before elections.",
            b: "Nordhaus's opportunistic model predicts pre-election stimulus and post-election contraction. Hibbs's partisan model predicts systematic differences instead, with left governments tolerating inflation for lower unemployment and right governments the reverse.\n\nRational expectations largely undermined the naive opportunistic version, since voters anticipate it. Central bank independence was designed partly to remove the instrument. The modern literature finds stronger effects in fiscal than monetary policy and in newer democracies than established ones.",
            news:
              "Pre-election fiscal packages and pressure on nominally independent central banks.",
            apply:
              "Assess whether any fiscal or monetary decision in today's reads shows evidence of electoral timing, and what would distinguish that from a genuine policy response."
          },
          {
            t: "Populism and economic grievance",
            s: "What the evidence actually supports about the economic roots of political backlash.",
            b: "The economic insecurity account holds that trade shocks, automation and austerity generate support for anti-establishment parties. Autor, Dorn and Hanson's work on the China shock found durable political polarisation in exposed US regions, and comparable European findings exist.\n\nThe cultural backlash account, associated with Norris and Inglehart, holds that value change rather than economics drives it. The honest position is that the two interact: economic shocks activate cultural grievances rather than operating independently. Examiners reward recognising the interaction rather than picking a side.",
            news:
              "Electoral outcomes in trade-exposed regions and the politics of cost-of-living pressure.",
            apply:
              "Analyse the political consequences of an economic development in today's reads, distinguishing economic from cultural mechanisms."
          }
        ]
      }
    ]
  }
];

/** Flat list, used by the command parser and the seminar tool. */
export const ALL_FRAMEWORKS = DISCIPLINES.flatMap((d) =>
  d.tracks.flatMap((tr) =>
    tr.items.map((it) => ({ ...it, discipline: d.code, track: tr.name }))
  )
);

/** Essay and seminar scaffolds, which is what students actually get marked on. */
export const SEMINAR_MODES = [
  {
    key: "seminar",
    label: "Seminar contribution",
    prompt:
      "Build me a seminar contribution of about 90 seconds. Take the framework I name and the most relevant development on the terminal today. Structure it as: the claim, the mechanism, the evidence, and the strongest objection to my own argument. Do not hedge everything — take a position and defend it."
  },
  {
    key: "essay",
    label: "Essay plan",
    prompt:
      "Give me an essay plan. Take the framework I name and today's reads. Structure it as: a thesis stated in one sentence, three substantive sections each with its claim and evidence, the strongest counter-argument with a genuine response, and a conclusion that does more than summarise. Name specific scholars and cases where they are relevant."
  },
  {
    key: "exam",
    label: "Exam answer",
    prompt:
      "Write this as a timed exam answer under pressure. Lead with the answer, define terms once, use the framework explicitly, apply it to a real example from today's reads, acknowledge the limits of the framework, and conclude. Around 600 words."
  },
  {
    key: "critique",
    label: "Steelman the other side",
    prompt:
      "Take whatever position the framework I name implies about today's reads, then make the strongest possible case against it. Name the scholars who hold the opposing view and the evidence they rely on. Do not strawman."
  },
  {
    key: "compare",
    label: "Compare two frameworks",
    prompt:
      "Apply two different frameworks to the same development on the terminal today. Show where they agree, where they diverge, and what evidence would distinguish between them. End by saying which travels better here and why."
  }
];
