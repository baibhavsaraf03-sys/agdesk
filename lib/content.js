// Auto-ported from the Ag Desk terminal. Content lives here so the UI,
// the agent route and the scheduled feed job all read the same source.

export const EXCHANGES = [
    ["TYO","Japan Exchange Group","Tokyo","Asia/Tokyo","Nikkei 225",540,930,"ASIA"],
    ["KRX","Korea Exchange","Seoul","Asia/Seoul","KOSPI",540,930,"ASIA"],
    ["SSE","Shanghai Stock Exchange","Shanghai","Asia/Shanghai","SSE Composite",570,900,"ASIA"],
    ["SZSE","Shenzhen Stock Exchange","Shenzhen","Asia/Shanghai","SZSE Component",570,900,"ASIA"],
    ["HKEX","Hong Kong Exchanges","Hong Kong","Asia/Hong_Kong","Hang Seng",570,960,"ASIA"],
    ["TWSE","Taiwan Stock Exchange","Taipei","Asia/Taipei","TAIEX",540,810,"ASIA"],
    ["SGX","Singapore Exchange","Singapore","Asia/Singapore","Straits Times",540,1020,"ASIA"],
    ["NSE","National Stock Exchange","Mumbai","Asia/Kolkata","Nifty 50",555,930,"ASIA"],
    ["BSE","BSE","Mumbai","Asia/Kolkata","Sensex",555,930,"ASIA"],
    ["IDX","Indonesia Stock Exchange","Jakarta","Asia/Jakarta","IDX Composite",540,900,"ASIA"],
    ["ASX","Australian Securities Exchange","Sydney","Australia/Sydney","S&P/ASX 200",600,960,"ASIA"],
    ["NZX","New Zealand Exchange","Wellington","Pacific/Auckland","S&P/NZX 50",600,1005,"ASIA"],
    ["TAD","Tadawul","Riyadh","Asia/Riyadh","TASI",600,900,"EMEA"],
    ["DFM","Dubai Financial Market","Dubai","Asia/Dubai","DFM General",600,870,"EMEA"],
    ["IST","Borsa Istanbul","Istanbul","Europe/Istanbul","BIST 100",600,1080,"EMEA"],
    ["JSE","Johannesburg Stock Exchange","Johannesburg","Africa/Johannesburg","FTSE/JSE All-Share",540,1020,"EMEA"],
    ["LSE","London Stock Exchange","London","Europe/London","FTSE 100",480,990,"EMEA"],
    ["EUN","Euronext","Paris","Europe/Paris","CAC 40",540,1050,"EMEA"],
    ["AEX","Euronext Amsterdam","Amsterdam","Europe/Amsterdam","AEX",540,1050,"EMEA"],
    ["DBG","Deutsche Borse","Frankfurt","Europe/Berlin","DAX",540,1050,"EMEA"],
    ["SIX","SIX Swiss Exchange","Zurich","Europe/Zurich","SMI",540,1050,"EMEA"],
    ["BIT","Borsa Italiana","Milan","Europe/Rome","FTSE MIB",540,1050,"EMEA"],
    ["BME","Bolsa de Madrid","Madrid","Europe/Madrid","IBEX 35",540,1050,"EMEA"],
    ["OMX","Nasdaq Stockholm","Stockholm","Europe/Stockholm","OMXS30",540,1050,"EMEA"],
    ["BMV","Bolsa Mexicana","Mexico City","America/Mexico_City","S&P/BMV IPC",510,900,"AMER"],
    ["NYSE","New York Stock Exchange","New York","America/New_York","S&P 500",570,960,"AMER"],
    ["NDQ","Nasdaq","New York","America/New_York","Nasdaq Composite",570,960,"AMER"],
    ["TSX","Toronto Stock Exchange","Toronto","America/Toronto","S&P/TSX Composite",570,960,"AMER"],
    ["B3","B3","Sao Paulo","America/Sao_Paulo","Ibovespa",600,1020,"AMER"]
  ];

export const GLOSSARY = [
    ["Arabica","The higher-grade coffee bean, grown at altitude. It's the one quoted on the main coffee futures market, so when you see a coffee price it usually means arabica."],
    ["Backwardation","When the price for delivery soon is higher than for delivery later. It means buyers want the goods now, which is a sign supply is tight. The opposite of contango."],
    ["Basis","The gap between the local cash price where you actually sell and the futures price on the exchange. It's set by local transport and storage, so it tells you what the physical market is doing rather than the paper one."],
    ["Bushel","A unit of volume used for grain in the US. One corn futures contract covers 5,000 bushels — roughly 127 tonnes."],
    ["Call option","The right, but not the duty, to buy something at a fixed price before a deadline. You pay for that right. If the price never rises above your fixed price, you lose what you paid and nothing more."],
    ["Carry","When the price for later delivery is higher than for sooner, so the market is effectively paying you to store the goods. A sign supply is comfortable. Also called contango."],
    ["Carryout","How much of a crop is left over at the end of the marketing year, before the new harvest. It's the cushion, and it matters far more to price than how big the harvest was."],
    ["CBOT","The Chicago Board of Trade, the exchange where most US grain futures trade."],
    ["Commitments of Traders","A weekly US report showing how big a bet each type of trader is holding. It's how you see whether funds are heavily long or short."],
    ["Contango","When later delivery costs more than sooner delivery. Same thing as carry. It means supply is comfortable enough that the market pays you to hold goods."],
    ["Contract","On a futures exchange, a standardised agreement to buy or sell a fixed quantity at a fixed date. You can't buy half a contract — the size is set by the exchange."],
    ["Crush","Processing soybeans into meal and oil. The crush margin is what processors earn doing it, and it tells you how much demand there is for beans."],
    ["Delivery month","The month a futures contract settles. Contracts are named by it — December corn, November soybeans."],
    ["Derivative","Any financial product whose value comes from something else. Futures and options are derivatives: their price derives from the price of the underlying crop."],
    ["Ending stocks","Same as carryout — what's left over at the end of the season."],
    ["Expiry","The deadline on an option or futures contract. After it, the contract no longer exists. An option that is worthless at expiry simply ends, and the buyer loses the whole premium."],
    ["FAO","The UN's Food and Agriculture Organization. It publishes the Food Price Index, a widely used measure of global food costs."],
    ["Fundamentals","The real-world supply and demand facts — how much was grown, how much is being eaten, how much is in storage — as opposed to price patterns or positioning."],
    ["Futures","An agreement to buy or sell a set amount of something at a set price on a set future date. Originally invented so farmers could lock in a price before harvest."],
    ["Hedge","Using a financial contract to protect against a price move you don't want, rather than to bet on one. A farmer selling futures before harvest is hedging."],
    ["HRW","Hard Red Winter wheat, the main US bread-wheat class, traded in Kansas City."],
    ["Leverage","Controlling a large position with a small deposit. It multiplies gains and losses equally, which is why it's the main reason beginners lose more than they expected."],
    ["Liquidation","Traders closing positions, often in a hurry. When large funds liquidate, their selling pushes the price down regardless of what the crop is actually doing."],
    ["Long","Owning something, or holding a bet that the price will rise. The opposite of short."],
    ["Managed money","Professional investment funds. Collectively they hold positions large enough that their buying and selling moves prices on its own."],
    ["Margin","The deposit an exchange requires to hold a futures position. It is not a down payment — if the market moves against you, you must add more or be closed out."],
    ["Margin call","A demand to add money to your account because losses have eaten into your deposit. If you can't pay, your position is closed at whatever the price is, locking in the loss."],
    ["Moving average","The average price over the last N days, redrawn each day. The 100-day and 200-day versions matter mostly because large automated funds use them to decide whether to be long or short."],
    ["Open interest","How many contracts are currently outstanding. Rising open interest with rising price means new money is coming in."],
    ["Option","The right, but not the duty, to buy or sell at a fixed price before a deadline. The buyer's maximum loss is the premium paid. The seller's loss can be far larger."],
    ["Oversold","A price that has fallen a long way very fast. It describes speed, not value — an oversold market can keep falling for weeks."],
    ["Position sizing","Deciding how much to risk on one idea. It is the single thing that most determines whether someone survives, and it has nothing to do with picking winners."],
    ["Premium","The price you pay for an option. If the option expires worthless, this is what you lose — all of it."],
    ["Put option","The right, but not the duty, to sell something at a fixed price before a deadline. Farmers buy puts as insurance against the price falling before harvest."],
    ["Roll","Closing a futures contract that is about to expire and opening the next one, so you keep the position without ever handling the physical goods. Almost all speculators roll."],
    ["Short","Betting the price will fall, by selling something you don't own and buying it back later. Losses on a short have no fixed ceiling, because a price can keep rising."],
    ["Speculator","Someone trading to profit from price moves rather than because they produce or use the goods. Most market participants are speculators."],
    ["Spread","Two meanings. In trading, the difference between two contract months, traded as one position. In dealing, the gap between the buy and sell price you're quoted — a hidden cost on every trade."],
    ["SRW","Soft Red Winter wheat, the US class traded in Chicago, used for biscuits and cakes rather than bread."],
    ["Stocks-to-use","Ending stocks divided by annual demand. It turns a leftover quantity into days of cushion, which is what actually drives price."],
    ["Stop loss","An order that automatically closes your position if price reaches a set level, capping the loss. It can fill worse than the level you set if the market moves fast."],
    ["Theta","The rate at which an option loses value as time passes, even if the price doesn't move. It's why buying options and waiting is usually a losing approach."],
    ["Tick","The smallest price move a contract can make, and therefore the smallest amount you can gain or lose per contract."],
    ["Underlying","The actual thing a derivative is based on — the corn behind a corn future, the shares behind a share option."],
    ["Volatility","How much a price swings around. High volatility makes options more expensive, because a big move becomes more likely."],
    ["WASDE","The World Agricultural Supply and Demand Estimates — the US government's monthly balance sheet for every major crop. The most important scheduled report in agricultural markets."],
    ["Yield","In farming, how much crop comes off an acre. Nothing to do with the financial meaning of yield."]
  ];

export const METHOD = [
    { t:"The four prices", i:"The futures screen is one of four prices. The other three tell you more.",
      b:"Futures is the exchange price for a standardised contract at a delivery month. Basis is the local cash price minus nearby futures. Cash is what an elevator actually pays today. Spread is the difference between two delivery months.\n\nFutures move on global news and fund money. Basis moves on local logistics — who needs grain where, right now. When futures fall and basis firms, the physical market is disagreeing with the paper market, and the physical market is usually closer to the truth about supply.",
      w:"On 8 October, Minneapolis cash soybean bids were quoted at −65 to −55 cents against November futures, unchanged on the day, while futures themselves dropped a dime. Basis flat while futures fall means the elevator didn't have to chase. Harvest grain was arriving on schedule.",
      k:"Pick one local basis number and track it daily. Three sessions of firming basis against falling futures means something is tightening that the screen hasn't priced." },
    { t:"Reading a WASDE", i:"Production is the headline. Carryout is the number.",
      b:"WASDE is USDA's monthly balance sheet. Beginning stocks plus production plus imports equals supply. Crush, feed, food and exports equal use. Supply minus use is ending stocks, or carryout.\n\nPrice responds to carryout far more than to production, because carryout is the cushion. A big crop with a big export programme can be bullish. A small crop with collapsed demand can be bearish.",
      w:"The 9 October WASDE raised US corn production by 234 million bushels and cut the season-average price to $4.70. The same report recorded the smallest US wheat crop since 1970 and raised the wheat price to $6.30. Opposite moves, identical logic.",
      k:"Write down your own carryout estimate before each report. The trade reacts to the surprise against expectation, not to the absolute number." },
    { t:"Stocks-to-use", i:"Carryout only means something as a fraction of annual demand.",
      b:"Stocks-to-use is ending stocks divided by total use. It converts a bushel count into days of cushion. A 740-million-bushel carryout means nothing until you know whether annual use is 1.9 billion or 12 billion.\n\nTight stocks-to-use makes price behaviour convex: small supply shocks produce large price moves, because there is no buffer to absorb them. That convexity is why the ratio matters more than the level.",
      w:"USDA projects 2026/27 US wheat ending stocks at 740 million bushels, 20% below last year. The cushion shrank by a fifth in one season, which is why USDA lifted its price forecast even though export demand was disappointing.",
      k:"Falling stocks-to-use alongside weak demand is the most interesting setup in agriculture. It means the market is cheap for a reason that can reverse quickly." },
    { t:"Positioning", i:"Price is supply and demand. Movement is often just who owns what.",
      b:"Managed money — the funds — takes large directional positions. When funds hold a big net long and the market turns, the liquidation itself drives prices lower, independent of fundamentals.\n\n\"Oversold\" tells you the move was fast, not that it is over. A fund with a long still to sell will keep selling into oversold readings. The question is never whether it looks cheap. It is whether the position is finished.",
      w:"Through mid-October, corn fell as funds offloaded a net long, with analysts noting the market was oversold and still falling. The level that mattered wasn't a valuation — it was $4.57¼, the 6 August low, below which liquidation would likely accelerate.",
      k:"Read the weekly Commitments of Traders. When fund net position and price diverge, the position usually wins in the short run." },
    { t:"Technicals that matter", i:"A few specific levels matter because funds and algorithms use them. Most don't.",
      b:"Three categories earn attention. Contract and prior-move lows, because protective stops cluster there. The 100- and 200-day moving averages, because systematic money uses them as a regime filter. Report-day highs and lows, because they mark the last full repricing of the fundamentals.\n\nEverything else — most oscillators, most chart patterns — is noise in markets where a weather forecast can reset the entire picture overnight.",
      w:"On 20 October, December corn sat well below both its 100-day and 200-day averages while soybeans sat well above both. Same complex, same harvest, opposite regimes. That divergence is itself a trade idea.",
      k:"A close below the low set on report day means the market has rejected the last official fundamental read. That is a real signal." },
    { t:"Spreads and carry", i:"The calendar spread tells you whether the market wants your grain now or later.",
      b:"Compare two delivery months of the same commodity. When the deferred month trades above the nearby — carry, or contango — the market is paying you to store, which means supply is comfortable. When the nearby trades above the deferred — inversion, or backwardation — the market wants it now, which means supply is tight.\n\nSpreads are also quieter than flat price, because macro factors that move both legs cancel out. That makes them a cleaner read on the physical market.",
      w:"Through harvest, with soybean spreads steady and the last 30% of the crop still to come off, analysts expected spreads to firm as the pipeline cleared. Firming spreads during harvest means demand is absorbing the flush.",
      k:"Spreads often turn before flat price does. Watch the nearby-to-next-month spread as your tightness gauge." },
    { t:"Seasonality", i:"Agriculture has a calendar, and the calendar creates repeatable pressure.",
      b:"Harvest pressure is the big one: supply arrives all at once and producers sell to pay bills, pushing prices down regardless of the annual balance sheet. Then comes the post-harvest recovery as the pipeline empties. Then the weather market, where price embeds a risk premium for a crop that doesn't exist yet.\n\nSouthern Hemisphere crops run on the opposite calendar, which is why Brazilian production estimates move Chicago prices in January.",
      w:"Mid-October 2026: soybean harvest wrapping, corn harvest on its final 30%, funds liquidating, prices making new lows for the move. Textbook harvest pressure — which tells you the weakness is partly mechanical rather than a pure demand verdict.",
      k:"Separate seasonal weakness from structural weakness. Price falling during the window when it always falls tells you far less than the same fall in February." },
    { t:"The macro overlay", i:"Four non-agricultural numbers set the backdrop for every crop.",
      b:"The dollar, because most commodities are priced in it, so strength makes them expensive for everyone else and caps rallies. Crude oil, because corn becomes ethanol and vegetable oils become biodiesel, so energy sets a floor under feedstock demand. Interest rates, because they price the cost of carrying inventory and of fund leverage. Freight and fertiliser, because they are input and delivery costs that pass into next year's acreage decisions.",
      w:"On 20 October, crude was up $2.20 while the dollar index remained firmly in an uptrend — one tailwind, one headwind, pulling the complex sideways. Meanwhile the World Bank projects fertiliser prices up 31% in 2026, a cost shock that lands on 2027 yields rather than on today's price.",
      k:"When a crop moves and none of these four explain it, the move is agricultural. That is when fundamentals are actually talking." },
    { t:"Finding the underrated trade", i:"Look for where price is doing something the stated fundamentals say it shouldn't.",
      b:"Crowded markets — corn, soybeans, coffee, cocoa — are efficiently priced because everyone models them. The opportunity sits in markets that are economically huge but financially under-covered, and specifically where you can name a contradiction.\n\nThree kinds are worth hunting. Price rising against ample inventory, which means something is wrong with the inventory number or with access to it. An input moving far more than its outputs, which means the cost shock hasn't transmitted yet. An index diverging from its components, which means the aggregate is hiding two opposite stories.",
      w:"Rice, October 2026. Prices in key Asian exporting countries up 10–13% despite large inventories, with Indonesia at record highs. Price up against ample stocks means the move is policy and access, not supply — and India, around 40% of world exports, can reprice the market with one announcement.",
      k:"Write the contradiction as one sentence before you take a view. If you can't, you don't have a trade. You have a hunch." }
  ];

export const TUTORIALS = [
    { tr:"A", trn:"Before you risk anything", t:"What a market actually is",
      s:"Two people disagreeing about price, repeated millions of times.",
      b:["A market is just a place where people who want to sell meet people who want to buy, and the price settles where those two pressures balance. Nothing more mystical than that.","What makes a financial market different from a shop is that the price changes constantly, in public, and anyone can be on either side. A shop has one seller and many buyers. A market has thousands of both, all changing their minds.","When you hear that corn 'fell 2 cents today', what happened is that sellers were slightly more motivated than buyers. That's it. The entire apparatus of analysis in this terminal exists to work out *why* one side became more motivated, and whether that reason will persist."],
      story:"On 20 October 2026, December corn traded around $4.70 a bushel. That number means: at that moment, enough people were willing to sell corn for December delivery at $4.70 to meet everyone willing to buy at $4.70. Shift either group's willingness and the number moves.",
      risk:"The common beginner error is treating the price as a fact about corn. It isn't. It's a fact about what people currently believe about corn, which is a different and much less stable thing.",
      q:"Explain to me, as a total beginner, why the price of a crop can fall on a day when nothing about the crop itself changed." },

    { tr:"A", trn:"Before you risk anything", t:"The four things you can actually buy",
      s:"Shares, funds, futures, options — and only two are suitable for beginners.",
      b:["**Shares** are small pieces of a company. Buy one and you own part of the business. If it does well over years, your piece is worth more. You can lose everything you put in but never more.","**Funds and ETFs** are baskets of many shares bought in one go. They spread your money across hundreds of companies so one failure doesn't ruin you. For most people starting out this is the entire sensible answer.","**Futures** are agreements to buy or sell a fixed amount of something at a fixed price on a fixed date. You put down a deposit rather than the full value, which means you can lose far more than you deposited.","**Options** are the right, but not the obligation, to buy or sell at a fixed price before a deadline. Buying them caps your loss at what you paid. Selling them does not cap it at all."],
      story:"A bakery that needs wheat next March can buy a March wheat future today and know exactly what it will pay. That's the original purpose of the whole market — certainty for people who handle the physical goods. The speculation came afterwards.",
      risk:"Shares and funds can take all of your money. Futures and uncovered options can take more than all of it. That difference is the single most important thing on this screen, and it is the reason the first two are where beginners belong.",
      q:"I have never invested before. Compare shares, ETFs, futures and options for someone in my position, and be blunt about which ones I should not touch yet." },

    { tr:"A", trn:"Before you risk anything", t:"How money is actually lost",
      s:"Six mechanisms, and none of them is 'picking the wrong direction'.",
      b:["Beginners assume losing means guessing direction wrong. In practice, most losses come from mechanisms that operate regardless of whether your view was correct.","The six are: leverage multiplying an ordinary move into a wipe-out; options decaying while you wait; invisible costs compounding with frequency; being right but too early to survive; competing against better-resourced opponents; and the behaviour that losing itself triggers.","The RISK screen covers each one with worked numbers. It is the single most valuable screen in this terminal and it takes four minutes."],
      story:"India's market regulator SEBI found that in financial year 2026, about 88% of individual options traders lost money and 66% of individual futures traders did. Among under-30s the figure was 89%. These are not unlucky people — they are people meeting the mechanisms above.",
      risk:"If you take one thing from this entire terminal: the question is never 'will I pick right?' It is 'how much will it cost me when I pick wrong, and how many times can I afford that?'",
      q:"Go through the six ways beginners lose money in trading and give me a concrete example of each with real numbers." },

    { tr:"A", trn:"Before you risk anything", t:"Practise with fake money first",
      s:"Months of it. There is no version of this where skipping that step works.",
      b:["Almost every broker offers a demo or paper-trading account: real prices, real charts, fake money. Use one for months before risking anything.","Do it properly or it's worthless. Use a position size you would actually use with real money. Write down why you're entering before you enter. Record what happened and whether your reasoning was right, separately from whether you made money — those are different questions.","The purpose is not to prove you can make fake money. It is to find out how you behave when a position goes against you, which is information you cannot get any other way."],
      story:"A useful bar to clear: twenty paper trades where you wrote the reasoning first, and where you'd be comfortable showing all twenty to someone who knows the market. Most people don't clear it, which is exactly the point of the exercise.",
      risk:"Paper trading has one blind spot. It can't reproduce how you feel when real money is disappearing, and that feeling is what breaks most people's rules. Assume you will behave worse with real money than you did with fake, and size accordingly.",
      q:"Design me a paper-trading routine for a complete beginner: what to record, how long to do it, and how to tell whether I'm actually improving rather than getting lucky." },

    { tr:"B", trn:"Futures", t:"What a futures contract is",
      s:"A binding promise to trade later at a price agreed now.",
      b:["Imagine a farmer in May. Her wheat won't be ready until August. She doesn't know what it will be worth then — it could be $7 or $5, and that difference decides whether she makes a profit.","So she finds a baker who has the opposite problem: he needs wheat in August and doesn't want to pay $7. They agree now to trade in August at $6. Both of them have swapped uncertainty for certainty.","That agreement is a futures contract. An exchange standardises it — same quantity, same quality, same dates — so that strangers can make the same deal without knowing each other, and guarantees both sides will pay up.","The crucial detail: it's binding. Unlike an option, you don't get to walk away if the price goes the wrong way."],
      story:"If wheat is $7 in August, the farmer still sells at $6 and misses out. If it's $5, the baker still pays $6 and overpays. Neither is upset, because neither was trying to win — both were buying certainty. Speculators are the people who join that market trying to win.",
      risk:"Because it's binding and because you only put down a deposit, a futures position can generate losses with no natural stopping point. This is categorically different from buying a share.",
      q:"Explain a futures contract to me using an everyday example that has nothing to do with farming, and then tell me what makes it dangerous." },

    { tr:"B", trn:"Futures", t:"Contract size, ticks and why you can't buy a little bit",
      s:"The exchange decides the quantity, and it's usually bigger than you expect.",
      b:["You can't buy £50 of corn futures. The exchange sets the contract size, and for corn that's 5,000 bushels — around 127 tonnes. At $4.70 a bushel that's $23,500 of corn in one contract.","The smallest price move allowed is the tick. For corn it's a quarter of a cent per bushel, which across 5,000 bushels is $12.50. So every tick the market moves, you gain or lose $12.50 per contract, automatically.","This is why futures are unforgiving for small accounts. The position size isn't your choice — it's the exchange's — and it's large."],
      story:"If December corn moves from $4.70 to $4.57 — the support level on the GRN screen, and an ordinary week's move — that's 13 cents, or $650 per contract. If your account held $2,000, you've just lost nearly a third of it on a move that barely registers as news.",
      risk:"Some exchanges offer smaller 'mini' or 'micro' contracts. They reduce the size but change nothing about the mechanism. A smaller version of a dangerous instrument is still that instrument.",
      q:"Work out for me exactly how much one corn futures contract would gain or lose for each cent the price moves, and what that means for a £2,000 account." },

    { tr:"B", trn:"Futures", t:"Margin — the part that actually hurts",
      s:"It is a performance bond, not a payment. You can be asked for more at any time.",
      b:["To hold a futures contract you deposit margin with the exchange. It's typically a small fraction of the contract's value — perhaps 5–10%. People hear this and think of a deposit on a house. It isn't.","Each day the exchange revalues your position. If it's moved against you, money moves out of your account that same day. This is called marking to market, and it happens whether or not you agree with the move.","If your balance drops below the maintenance level, you get a margin call: add money now, or the position gets closed at the current price. Not at a price you choose. At whatever it is at that moment."],
      story:"Deposit $1,500 to hold one corn contract worth $23,500. Corn falls 30 cents. You have lost $1,500 — the entire deposit — on a 6% move. The broker asks for more money the same day. If you can't send it, the position closes and the loss is locked in, even if corn recovers the following week.",
      risk:"This is the mechanism by which people lose more than they deposited. In a fast market, your position can be closed at a price far worse than your stop level, leaving a negative balance you legally owe.",
      q:"Explain margin calls to me step by step with a worked example, including how someone ends up owing their broker money." },

    { tr:"B", trn:"Futures", t:"Rolling, and why nobody takes delivery",
      s:"Contracts expire. Speculators move to the next one rather than receive 127 tonnes of corn.",
      b:["Every futures contract has a delivery month. If you still hold it at expiry, in principle you must deliver or receive the actual goods.","In practice almost nobody does. Speculators close the expiring contract and open the next month — this is called rolling. Brokers usually force-close retail positions before delivery anyway.","Rolling has a cost. If the next month is more expensive than the one you're leaving, you pay that difference every time you roll, which quietly erodes a long-held position."],
      story:"This is why the contracts are named by month — December corn, November soybeans. When the GRN screen says 'Corn · Dec', that is specifically the contract settling in December, and it will stop existing. The price of December corn and March corn are related but not the same number.",
      risk:"Long-term commodity funds that roll continuously can lose money over years even when the commodity's price is flat, purely from roll costs. If you ever see a commodity ETF badly lagging the commodity it tracks, this is usually why.",
      q:"Explain what rolling a futures contract means and how roll costs can make a commodity fund lose money even when the commodity price doesn't fall." },

    { tr:"C", trn:"Options", t:"Calls and puts in plain English",
      s:"A call is the right to buy. A put is the right to sell. Neither is an obligation.",
      b:["Think of a deposit on a house. You pay £1,000 to hold the right to buy at £300,000 within three months. If prices rise to £330,000 you exercise that right and you're £30,000 better off. If prices fall to £280,000 you walk away and lose only the £1,000.","That's a call option. You bought the right to buy at a fixed price, and the most you could lose was what you paid for the right.","A put is the mirror image — the right to sell at a fixed price. A farmer worried about wheat falling before harvest can buy a put, guaranteeing a floor under what she'll receive. If prices rise instead, she abandons the put and sells at the better market price, out only the premium.","The word that does the work in both is 'right'. You are never forced to go through with it."],
      story:"Say wheat is $6.30. A farmer buys a put giving her the right to sell at $6.00 for a premium of 20 cents. If wheat crashes to $5.00 she still sells at $6.00. If it rallies to $7.00 she lets the put expire, loses the 20 cents, and sells at $7.00. She bought insurance.",
      risk:"Everything above describes *buying* options, where your loss is capped. Selling options is a completely different activity with uncapped losses — covered two lessons from here.",
      q:"Explain calls and puts with an everyday analogy that isn't about houses or farming, and make sure I understand why the buyer's loss is capped." },

    { tr:"C", trn:"Options", t:"The three numbers that define an option",
      s:"Strike, expiry, premium. Change any one and you have a different contract.",
      b:["**Strike** is the fixed price you get to buy or sell at. A $6.00 wheat put lets you sell at $6.00 no matter what the market does.","**Expiry** is the deadline. After it, the right vanishes. An option is not a position you can hold indefinitely — it has a death date built in.","**Premium** is what you pay for the right. It's set by how far the strike is from the current price, how long until expiry, and how wildly the market has been moving. More time and more volatility both mean a higher premium.","Every option quote is these three numbers plus whether it's a call or a put. Once you can read those, you can read any option chain."],
      story:"'December corn $4.80 call at 12 cents' means: the right to buy December corn at $4.80, expiring with the December contract, costing 12 cents a bushel. Across 5,000 bushels that's $600 paid, and corn needs to reach $4.92 before you've broken even.",
      risk:"Notice the breakeven. Being right about direction isn't enough — the move has to be big enough to cover the premium as well. Beginners routinely buy options, watch the price go the way they predicted, and still lose money.",
      q:"Walk me through reading an option quote, and calculate the breakeven price for a beginner using a specific example." },

    { tr:"C", trn:"Options", t:"Why an option loses value just by sitting there",
      s:"Time decay. The clock takes your money whether or not the market moves.",
      b:["An option's value comes partly from the chance that the price will move your way before expiry. As time passes, there's less chance left, so the option is worth less — even if nothing else changed.","This is called theta, and it accelerates. An option loses value slowly when there are months left and very quickly in the final weeks.","The practical consequence: buying an option and waiting is a losing position by default. You aren't neutral while you wait. You're paying rent."],
      story:"Buy a corn call for 12 cents with two months to expiry. Corn goes absolutely nowhere for six weeks. Your option might now be worth 4 cents. You've lost two-thirds of your money and the market did literally nothing.",
      risk:"This is why so many option buyers lose. They were not wrong about direction — they were wrong about timing, and options punish timing errors more harshly than any other instrument. SEBI's finding that equity options produced 92% of individual traders' total losses is theta doing its work at scale.",
      q:"Explain time decay to a beginner with a month-by-month worked example showing an option losing value while the price stays flat." },

    { tr:"C", trn:"Options", t:"Buying versus selling — the asymmetry that ruins people",
      s:"Buyers risk a known amount. Sellers risk an unknown one.",
      b:["When you buy an option, the most you can lose is the premium. Known, capped, fixed on day one.","When you sell an option, you collect the premium up front and take on the obligation. If the buyer exercises, you must deliver. Your loss is whatever the market does to you, and there is no ceiling.","Selling options feels wonderful for a long time. You collect small premiums repeatedly and most of them expire worthless, so most months are profitable. This builds confidence that the strategy works.","Then one move happens that is larger than every premium you ever collected, combined."],
      story:"Sell 50 cents of premium a month for two years and collect $12. Then one event moves the market $20 against you. Two years of gains gone, plus $8 more, in a single week. This pattern has a name on trading desks: picking up pennies in front of a steamroller.",
      risk:"Selling uncovered options is the single most dangerous thing a retail account can do. Brokers require large deposits for it, and those deposits are not a safety feature for you — they're protection for the broker.",
      q:"Explain why selling options is more dangerous than buying them, with a specific example of how a seller can lose far more than they collected." },

    { tr:"C", trn:"Options", t:"The honest use — insurance, not lottery tickets",
      s:"Options were invented to transfer risk, and that's still what they're good at.",
      b:["Strip away the speculation and an option is an insurance contract. Someone who owns a risk pays someone else to carry it. That's a genuinely useful economic function.","A farmer buying a put is insuring against prices falling before harvest. A food company buying a call is insuring against the cost of its ingredients rising. Both are reducing uncertainty in a real business.","A speculator buying an option isn't insuring anything. They're paying a premium for a chance at a payout — which is a sensible trade only if they've correctly judged that the premium is too cheap for the risk involved. That judgement is hard, and the people selling them options do it professionally."],
      story:"Look at the fertiliser entry on the TRD screen. The World Bank projects fertiliser prices up 31% in 2026. A farming business genuinely exposed to that could hedge it. A speculator with no exposure is doing something entirely different, against better-informed counterparties.",
      risk:"The clearest question to ask before buying any option: am I reducing a risk I already have, or creating a new one? Beginners almost always do the second while telling themselves it's the first.",
      q:"Explain how a farmer and a food manufacturer would each use options to reduce real business risk, and contrast that with what a speculator is doing." },

    { tr:"D", trn:"Doing it", t:"Position sizing — the only thing that keeps you alive",
      s:"Decide what you lose when wrong, before you decide what you'll buy.",
      b:["Everyone starts by asking what to buy. Experienced traders start by asking how much to risk, because that answer determines survival and the first one doesn't.","A common rule is to risk no more than 1% of your account on any single idea. With £10,000 that's £100 at risk per trade. Not £100 invested — £100 lost if the position goes to your exit point.","The arithmetic matters: at 1% risk, ten consecutive losses costs you about 10% and you continue. At 20% risk, four losses costs you more than half your money and the maths of recovery turns brutal — down 50% requires a 100% gain just to get level."],
      story:"Say you want to be long corn with an exit at $4.57, the August low, from $4.70 entry. That's 13 cents of risk, which on one full contract is $650. If 1% of your account is £100, one contract is roughly six times too large. The correct position size is zero contracts — the trade doesn't fit your account, and no amount of conviction changes that.",
      risk:"That last point is the one beginners refuse to accept. Sometimes the correct position size is zero, and the discipline is in taking it rather than shrinking your stop to make the trade fit.",
      q:"Teach me position sizing with worked numbers: if I have £5,000 and risk 1% per trade, show me how to calculate my maximum position for a specific trade." },

    { tr:"D", trn:"Doing it", t:"Reading a chart without fooling yourself",
      s:"Most chart patterns are noise. Three things aren't.",
      b:["A price chart shows what has happened, and humans are extremely good at seeing patterns in it that were never there. Most of what's sold as technical analysis is this.","Three things genuinely matter because large amounts of money actually act on them. Prior lows and highs, because protective orders cluster there. The 100- and 200-day moving averages, because big automated funds use them to decide which way to be positioned. And the high and low from the day a major report landed, because that was the market's last full repricing of the facts.","Everything else — most indicators, most named patterns — is noise in a market where a weather forecast can reset the whole picture overnight."],
      story:"On the GRN screen, December corn's $4.57¼ support is the 6 August low. It matters not because the shape looks a certain way but because a great many stop-loss orders sit just underneath it. If price reaches them, they trigger, and the selling accelerates. That's a mechanical fact, not a prediction.",
      risk:"If you can't explain why a level matters in terms of what someone would actually do at it, you're pattern-matching rather than analysing. That distinction is the whole difference between the two.",
      q:"Show me how to tell the difference between a chart level that matters and one I'm imagining, using examples." },

    { tr:"D", trn:"Doing it", t:"Your first paper trade, step by step",
      s:"Write it down before you click. The writing is the exercise.",
      b:["**Step one.** Open the DESK screen and pick one market you can explain to someone else. If you can't explain it, pick a different one.","**Step two.** Open the JRN screen and fill all six boxes: what moved, what the official numbers say, who's holding what, which levels matter, what the macro backdrop is, and the contradiction in one sentence. If the sixth box won't fill, stop — you don't have a trade, you have a hunch.","**Step three.** Decide your exit before your entry. Where does this idea get proven wrong? That level, not a round number, is where you'd get out.","**Step four.** Calculate your position size from the distance to that exit and your 1% risk limit. If the answer is less than one contract, the honest answer is no trade.","**Step five.** Place it on paper. Then send the journal entry to the analyst for marking, before you know the outcome. That ordering is deliberate — it's the only way to judge reasoning independently of luck."],
      story:"Do this twenty times. Then look back and ask a different question from the obvious one: not how many made money, but how many had reasoning that still looks sound now. Those two numbers are rarely the same, and the gap between them is what you're actually trying to close.",
      risk:"The point of this exercise isn't to get good at predicting. It's to build a written record that lets you distinguish a good decision from a good outcome. Without that record, you'll remember your wins and forget why your losses happened.",
      q:"Walk me through placing my first paper trade step by step, using whatever market is on the desk today." }
  ];

export const RISKS = [
    { h:"1 · Leverage means you can lose more than you put in",
      body:"With a futures contract you don't pay for the goods. You put down a deposit — the margin — that might be a twentieth of the contract's value. That means a 5% price move against you can wipe out your entire deposit, and a 10% move leaves you owing money you never deposited. Beginners understand that leverage multiplies gains. They rarely internalise that it multiplies losses by exactly the same factor.",
      read:"Work it through. One corn contract covers 5,000 bushels. At $4.70 that is $23,500 of corn, and the exchange might ask for roughly $1,500 to hold it. If corn falls 30 cents — an ordinary week — you have lost $1,500. Your entire deposit, on a 6% move.\n\nThis is not an unusual outcome. It is the normal behaviour of the instrument." },
    { h:"2 · Options lose value while you wait",
      body:"An option is a right that expires. Every day that passes, that right is worth slightly less, because there is less time left for the price to move your way. This is called theta. You can be completely correct about direction and still lose the whole premium because you were right too late.",
      read:"This is the trap that catches the most beginners. Buying options feels safe — your maximum loss is the premium, which is true. What people miss is how often that maximum loss actually happens.\n\nSEBI found 88% of individual options traders lost money, and that equity options accounted for 92% of all individual traders' losses. The limited downside is real; it just arrives far more often than people expect." },
    { h:"3 · The costs you don't see",
      body:"Every trade has a spread — the gap between the price you can buy at and the price you can sell at. Cross it twice, on the way in and the way out, and you start every position slightly behind. Add commission, exchange fees, overnight financing and tax, and a strategy that looks mildly profitable on paper can be reliably unprofitable in practice.",
      read:"The arithmetic that matters: if your costs are 0.2% per round trip and you trade twice a week, you need roughly 20% a year of gross profit just to break even.\n\nFrequency is the hidden enemy. The more often you trade, the more of these you pay, and the more the odds tilt against you — which is why high-activity traders do measurably worse." },
    { h:"4 · Being right but early is the same as being wrong",
      body:"Markets can stay mispriced longer than a leveraged position can survive. If your analysis says wheat is too cheap and you are correct, but wheat first falls another 15% before turning, you will be closed out at the bottom and the eventual rally will happen without you.",
      read:"This is why professionals talk about position sizing more than forecasting. A small enough position survives being early. A large one does not, no matter how good the analysis was.\n\nIt is also why 'oversold' is such a dangerous word. It describes how fast something fell, not whether it has finished falling." },
    { h:"5 · The money is concentrated against you",
      body:"The other side of your trade is usually a professional with better data, lower costs, faster execution and a research team. In agricultural markets specifically, the other side may be a company that physically owns grain elevators and knows what is in them.",
      read:"This is not a reason never to participate. It is a reason to be honest about where your edge could possibly come from.\n\nFor a private individual the realistic edges are patience, the freedom to do nothing for months, and the ability to hold a view for years. None of those involve trading frequently." },
    { h:"6 · Losing triggers behaviour that loses more",
      body:"After a loss, people increase position size to win it back, abandon their rules, and trade more often. This is the most reliably destructive pattern in the whole activity, and knowing about it is not sufficient to avoid it.",
      read:"SEBI's data points at this indirectly: traders under 30 lost money at the highest rate of any age group, 89%, and lower-income traders took 53% of total losses while doing 43% of the turnover. The people who could least afford losses were trading hardest.\n\nThe only reliable defence is a rule written down before you have any money at risk, and a size small enough that no single loss makes you want to break it." }
  ];

export const FALLBACK_FEED = {
    stamp:"SNAPSHOT 20 OCT 2026", live:false,
    headline:"Global ag, with the underrated trades pulled out",
    lede:"Embedded snapshot from the close on 20 October 2026. The scheduled refresh replaces this each weekday morning.",
    boards:[
      { title:"Grains · early session", unit:"¢/bu", kind:"grain", rows:[
        {nm:"Corn · Dec", px:"—", ch:"+0 to 1", dir:"up"},
        {nm:"Soybeans · Nov", px:"—", ch:"+3 to 4", dir:"up"},
        {nm:"Wheat", px:"—", ch:"+2 to 3", dir:"up"},
        {nm:"Crude oil", px:"$/bbl", ch:"+2.20", dir:"up"}
      ]},
      { title:"Softs · day move", unit:"day", kind:"soft", rows:[
        {nm:"Coffee", px:"310.26 ¢/lb", ch:"−1.72%", dir:"down"},
        {nm:"Cocoa", px:"5,651 $/t", ch:"−0.58%", dir:"down"},
        {nm:"Sugar", px:"20.50 ¢/lb", ch:"−0.34%", dir:"down"}
      ]}
    ],
    levels:[
      {nm:"Corn Dec · support", px:"$4.57¼", ch:"6 Aug low", dir:"flat"},
      {nm:"Corn Dec · resistance", px:"$4.81¼", ch:"10-day MA", dir:"flat"},
      {nm:"Corn · pivot", px:"$4.70", ch:"weekly", dir:"flat"},
      {nm:"Soybeans · pivot", px:"$12.50", ch:"weekly", dir:"flat"},
      {nm:"Soymeal · pivot", px:"$350", ch:"weekly", dir:"flat"},
      {nm:"Bean oil · pivot", px:"66.50¢", ch:"weekly", dir:"flat"},
      {nm:"SRW wheat · pivot", px:"$6.50", ch:"weekly", dir:"flat"},
      {nm:"HRW wheat · pivot", px:"$7.00", ch:"weekly", dir:"flat"},
      {nm:"KC wheat Dec · support", px:"$6.89½", ch:"200-day MA", dir:"flat"}
    ],
    softNote:"Month and year moves tell a different story than the day: coffee +12.3% on the month but −25.0% on the year; cocoa +5.7% / −4.4%; sugar +11.5% on the month and +34.5% year on year, after a 19-month high of 21.24¢.",
    sections:[
      { h:"The contradiction worth understanding today",
        body:"The World Bank projects the agriculture price index to fall 6% in 2026 — a 30% drop in beverage prices outweighing a 2% rise in food. On 18–19 October, Reuters and the FAO reported global food inflation accelerating and persisting into 2027. Both are correct.",
        read:"Why both hold: the index is a weighted basket. Coffee and cocoa are unwinding from 2024–25 records and dragging the aggregate down, while staples — wheat, rice, vegetable oils — go the other way.\n\nIn practice: trade the index and you're short; trade staples and you're long. Most coverage conflates the two, which is exactly where mispricing lives.\n\nThe general lesson: when an aggregate diverges from its components, it's hiding two opposite stories. Go find them." },
      { h:"Grains: the regime split",
        body:"December corn sits well below both its 100-day and 200-day moving averages with funds still offloading a net long. Soybeans sit well above both. Same complex, same harvest, opposite regimes. Full levels under GRN.",
        read:"Where these levels come from: not chart patterns but stop clusters. Prior-move lows are where protective sell orders sit. Moving averages are where systematic funds flip their regime filter. Report-day extremes mark the last full repricing of fundamentals.\n\nWhy the split matters: corn and soybeans share weather, acreage and harvest logistics. When they diverge this cleanly, something specific to one is doing the work — here, Chinese soybean buying against a corn crop USDA just raised by 234 million bushels." },
      { h:"What the October WASDE set",
        body:"Season-average 2026/27 farm prices: corn $4.70/bu, soybeans $12.00, wheat $6.30, upland cotton 77¢/lb. Corn's forecast fell on a 234-million-bushel production increase. Wheat's rose on the smallest US crop since 1970, with ending stocks at 740 million bushels — 20% below last year.",
        read:"Read the carryout, not the crop. Two opposite price moves in one report, same logic. Corn: more production, bigger cushion, lower price. Wheat: smallest crop in 56 years, cushion down a fifth, higher price.\n\nThen divide. 740 million bushels means nothing until it's a fraction of annual use. Stocks-to-use turns a bushel count into days of cushion, and tight cushions make prices convex." }
    ],
    macro:[
      { h:"The backdrop",
        body:"Commodities broadly are forecast +16% for 2026, the first annual rise since 2022. September saw the energy index +25.7%, crude +21.2%, gas +15.3%, food +3.8%, fertilisers +0.4%, beverages −4.6%. US CPI came in hot at 3.7%. The dollar index remains firmly in an uptrend — a headwind across the complex. StoneX projects the 2026/27 cocoa surplus at a minimum 25,000 tonnes, down from 422,000 this season.",
        read:"Four numbers set the backdrop for every crop. The dollar caps rallies by making dollar-priced goods expensive abroad. Crude sets a floor under feedstock demand through ethanol and biodiesel. Rates price the cost of carrying inventory. Freight and fertiliser pass into next year's acreage.\n\nThe test: when a crop moves and none of these four explain it, the move is agricultural. That's when fundamentals are actually talking." }
    ],
    trades:[
      { name:"Rice",
        body:"Prices in key Asian exporting countries are up 10–13% despite large inventories. Indonesian rice has hit record highs on delayed-rain forecasts, and the AMIS GOI rice sub-index rose 3% month-on-month to its highest since March 2025. India is roughly 40% of world exports and can reprice the market with one policy announcement.",
        contra:"Price is rising against ample stocks, which means the move is policy and access — not supply." },
      { name:"Fertiliser",
        body:"The World Bank's fertiliser index is projected to rise 31% year on year in 2026 — a larger move than any crop — driven by export disruption through the Strait of Hormuz. Fertiliser is up to 60% of palm production costs. Farmers cut application rates now; yields fall in 2027.",
        contra:"The biggest move in agriculture is filed under chemicals, so the crop desks aren't pricing it." },
      { name:"Natural rubber",
        body:"TSR20 is forecast to rise from $1.75/kg to $1.90–1.95, having already gained 11% in a recent stretch. China is nearly two-thirds of global use. Reuters' Q4 technical outlook expected a broad commodity correction except coffee; rubber wasn't in the frame.",
        contra:"An agricultural crop that trades on industrial demand falls between two desks and gets covered by neither." },
      { name:"Palm oil",
        body:"Palm and soybean oil are both projected to rise 8% in 2026. Palm faces El Niño production risk into 2026–27 plus the fertiliser squeeze, with seasonality likely to flatten the peak rebound. Indonesian vegetable oil prices are up 7% this year even though Indonesia is the largest producer.",
        contra:"The biggest producer has domestic inflation in its own output — an export-policy signal, not a crop signal." },
      { name:"Wheat, as a spread",
        body:"Wheat is up more than 30% in 2026, and the FAO reported world prices rose 6.3% in September to the highest since August 2023, helped by the 1970-low US crop. Yet US futures are capped by a 740-million-bushel carryout and disappointing export demand.",
        contra:"Global tightness against US-specific slack. That's a spread, not a flat-price view." }
    ],
    watch:[
      {nm:"Chinese soybean buying", note:"558kt booked over 3 days"},
      {nm:"Ivory Coast rainfall", note:"cocoa swing factor"},
      {nm:"Corn $4.57¼", note:"Aug low — breach accelerates"},
      {nm:"World Bank CMO", note:"October edition due"},
      {nm:"India sugar policy", note:"record domestic price"}
    ],
    sources:[]
  };

// The five scheduled equity zones, grouped onto three regional screens,
// plus the agricultural read which has a screen of its own.
export const ZONES = {
  anz: { label: "Australia & New Zealand", tz: "Australia/Sydney",   screen: "ASIA" },
  eas: { label: "East Asia",               tz: "Asia/Hong_Kong",     screen: "ASIA" },
  ind: { label: "India",                   tz: "Asia/Kolkata",       screen: "ASIA" },
  eur: { label: "Europe, Middle East & Africa", tz: "Europe/London", screen: "EMEA" },
  ams: { label: "Americas",                tz: "America/New_York",   screen: "AMER" }
};

// Shared with the agent so it answers in the terminal's own vocabulary.
export const METHOD_SUMMARY =
  "The method taught here has nine parts: (1) the four prices — futures, basis, cash, spread; " +
  "(2) reading a WASDE, carryout over production; (3) stocks-to-use as days of cushion and why " +
  "tight ratios make price convex; (4) positioning and fund liquidation, where 'oversold' means " +
  "fast not finished; (5) the few technicals that matter — prior-move lows, 100/200-day averages, " +
  "report-day extremes; (6) spreads and carry as the tightness gauge; (7) seasonality, separating " +
  "harvest pressure from structural weakness; (8) the macro overlay — dollar, crude, rates, " +
  "freight and fertiliser; (9) finding the underrated trade by naming a contradiction in one sentence.";

export const AGENT_RULES = [
  "Be direct and concrete. No filler, no flattery, no restating the question.",
  "Use real numbers from the feed where they apply. Keep answers under 250 words unless marking written work or asked for depth.",
  "You have no live data beyond the feed supplied above, and the feed is dated. If something is not in it, say so rather than inventing a figure.",
  "If the user signals they are a beginner, or asks something basic, drop all jargon or define it the first time you use it, and use a concrete everyday analogy.",
  "Never make leveraged instruments sound easy or safe. Futures and options can lose more than the amount deposited, and regulators consistently find most individual traders lose money.",
  "Never tell the user to buy or sell anything and never suggest a specific trade. Teach the reasoning and let them decide."
].join(" ");
