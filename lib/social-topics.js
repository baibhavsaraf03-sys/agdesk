/**
 * What the non-site Instagram videos talk about (17 Nov).
 *
 * Written by hand so every figure is checked: the AI only writes the post
 * caption around these, and is told to add no numbers of its own. Each item
 * is one video: a hook, three or four beats (a big line and a small line),
 * and a closing line. Worked figures assume steady growth and ignore tax and
 * fees unless they say otherwise; they are illustrations, not forecasts.
 *
 * WORDS: one money or markets word explained ("money" slot).
 * HABITS: one money habit ("life" slot).
 * The rotation moves one step along each list every six posts.
 */

export const WORDS = [
  {
    key: "compound-interest",
    kicker: "One money word",
    hook: "Compound interest",
    beats: [
      { big: "Interest on interest.", small: "Your returns start earning returns of their own." },
      { big: "£100 a month", small: "Put away for 30 years at 7% a year…" },
      { big: "≈ £122,000", small: "…from £36,000 actually paid in. Time did the rest." },
      { big: "Start early.", small: "The last ten years add more than the first twenty." }
    ],
    close: "Time is the ingredient you can't buy later."
  },
  {
    key: "inflation",
    kicker: "One money word",
    hook: "Inflation",
    beats: [
      { big: "Prices creep up.", small: "The same money buys a little less every year." },
      { big: "3% a year", small: "sounds small. Over ten years, it isn't." },
      { big: "£100 → £74", small: "What £100 in cash buys after a decade of 3% inflation." },
      { big: "Cash isn't safe from it.", small: "That's why savers look for returns above inflation." }
    ],
    close: "Inflation is a tax nobody votes for."
  },
  {
    key: "index-fund",
    kicker: "One money word",
    hook: "Index fund",
    beats: [
      { big: "Buy the whole market.", small: "One fund holds every company in an index, like the S&P 500." },
      { big: "No stock picking.", small: "It follows the index up and down, nothing more." },
      { big: "Low fees.", small: "No team of analysts to pay, so costs are usually tiny." },
      { big: "Most pros lag it.", small: "Over long periods, most actively managed funds trail their index." }
    ],
    close: "Boring can be the point."
  },
  {
    key: "diversification",
    kicker: "One money word",
    hook: "Diversification",
    beats: [
      { big: "Don't bet on one horse.", small: "Spread money across many companies, places and assets." },
      { big: "One fails,", small: "the others carry on. The damage stays small." },
      { big: "It lowers risk,", small: "not just returns. That's why it's called the only free lunch." },
      { big: "It isn't magic.", small: "In a crash most things fall together, just not equally." }
    ],
    close: "Own enough that no single mistake can sink you."
  },
  {
    key: "volatility",
    kicker: "One markets word",
    hook: "Volatility",
    beats: [
      { big: "How much prices swing.", small: "Not which way: just how far and how fast." },
      { big: "The VIX", small: "measures the swings traders expect in the S&P 500 over the next month." },
      { big: "Below 15: calm.", small: "Above 30: fear. It jumps when markets drop." },
      { big: "Ledge Desk's mood dial", small: "reads the VIX every few minutes." }
    ],
    close: "Swings are the price of the return."
  },
  {
    key: "leverage",
    kicker: "One markets word",
    hook: "Leverage",
    beats: [
      { big: "Trading with borrowed money.", small: "A small deposit controls a much bigger position." },
      { big: "10× leverage:", small: "a 10% move doubles your stake…" },
      { big: "…or wipes it out.", small: "Losses grow exactly as fast as gains." },
      { big: "Most retail CFD accounts lose.", small: "Brokers must say so in the UK and EU, and the share is usually over half." }
    ],
    close: "Leverage doesn't change the odds. It changes the stakes."
  },
  {
    key: "short-selling",
    kicker: "One markets word",
    hook: "Short selling",
    beats: [
      { big: "Betting on a fall.", small: "Borrow a share, sell it now, buy it back later." },
      { big: "Price drops?", small: "You buy back cheaper and keep the difference." },
      { big: "Price rises?", small: "You buy back dearer. There's no ceiling on how high it can go." },
      { big: "A short squeeze", small: "is when rising prices force short sellers to buy, pushing it higher still." }
    ],
    close: "Unlimited upside for the stock means unlimited risk for the short."
  },
  {
    key: "bull-bear",
    kicker: "Two markets words",
    hook: "Bull vs bear",
    beats: [
      { big: "Bull market:", small: "prices rising for a long stretch. Bulls toss upwards." },
      { big: "Bear market:", small: "a fall of 20% or more from the last peak. Bears swipe down." },
      { big: "Correction:", small: "a drop of 10% to 20%. Common, and usually temporary." },
      { big: "Nobody rings a bell.", small: "Turning points are only obvious afterwards." }
    ],
    close: "Know which animal you're riding."
  },
  {
    key: "dividend",
    kicker: "One money word",
    hook: "Dividend",
    beats: [
      { big: "A share of the profit.", small: "Some companies pay part of their earnings to shareholders in cash." },
      { big: "Dividend yield", small: "is the yearly payout divided by the share price." },
      { big: "Reinvest it,", small: "and the payouts buy more shares, which pay more dividends." },
      { big: "Not guaranteed.", small: "Companies can cut or cancel dividends when times are hard." }
    ],
    close: "Paid to wait, sometimes."
  },
  {
    key: "bond-yield",
    kicker: "One markets word",
    hook: "Bond yield",
    beats: [
      { big: "A bond is a loan.", small: "You lend to a government or company; they pay interest." },
      { big: "Yield is the return", small: "you get for buying the bond at today's price." },
      { big: "Prices up, yields down.", small: "They always move in opposite directions." },
      { big: "Rising yields", small: "make borrowing dearer for everyone: homes, firms, governments." }
    ],
    close: "The bond market sets the price of money."
  },
  {
    key: "interest-rates",
    kicker: "One markets word",
    hook: "Interest rates",
    beats: [
      { big: "The price of money.", small: "Central banks like the Fed and the Bank of England set the base rate." },
      { big: "Rates up:", small: "borrowing costs more, saving pays more, spending cools." },
      { big: "Rates down:", small: "loans get cheaper and markets usually like it." },
      { big: "Decision days move markets.", small: "Ledge Desk's calendar counts down to every one." }
    ],
    close: "Everything is priced off the rate."
  },
  {
    key: "stop-loss",
    kicker: "One markets word",
    hook: "Stop loss",
    beats: [
      { big: "An exit decided in advance.", small: "An order to sell automatically if the price falls to a set level." },
      { big: "It caps the damage", small: "before emotions get a vote." },
      { big: "Not a guarantee.", small: "If a price gaps overnight, the sale can happen well below your level." },
      { big: "Set it, then leave it.", small: "Moving a stop further away defeats the point." }
    ],
    close: "Decide how you'll leave before you walk in."
  },
  {
    key: "position-sizing",
    kicker: "One markets word",
    hook: "Position sizing",
    beats: [
      { big: "How much, not what.", small: "The size of each bet matters as much as the pick." },
      { big: "The 1% rule:", small: "many traders risk no more than 1% of their account on one trade." },
      { big: "Ten losses in a row", small: "then cost about 10%, not everything." },
      { big: "Small bets survive.", small: "Staying in the game is the first job." }
    ],
    close: "Being wrong is normal. Being wiped out is optional."
  },
  {
    key: "market-cap",
    kicker: "One markets word",
    hook: "Market cap",
    beats: [
      { big: "What a company is worth", small: "on the stock market, right now." },
      { big: "Share price × shares", small: "That's the whole calculation." },
      { big: "A £5 share", small: "can belong to a bigger company than a £500 one." },
      { big: "Large, mid, small cap", small: "is how funds sort companies by size." }
    ],
    close: "The price of one share tells you almost nothing."
  },
  {
    key: "pe-ratio",
    kicker: "One markets word",
    hook: "P/E ratio",
    beats: [
      { big: "Price ÷ earnings.", small: "How many pounds investors pay for each pound of yearly profit." },
      { big: "A P/E of 20", small: "means paying 20 years of today's profit for the share." },
      { big: "High P/E:", small: "investors expect fast growth. Or the share is expensive." },
      { big: "Low P/E:", small: "a bargain, or a business in trouble. Check which." }
    ],
    close: "A ratio is a question, not an answer."
  },
  {
    key: "recession",
    kicker: "One money word",
    hook: "Recession",
    beats: [
      { big: "The economy shrinks.", small: "Output falls, jobs get harder to find, spending drops." },
      { big: "Two quarters in a row", small: "of falling GDP is the UK's usual rule of thumb." },
      { big: "Markets look ahead.", small: "Shares often fall before a recession and recover before it ends." },
      { big: "GDP releases", small: "are on Ledge Desk's calendar, to the minute." }
    ],
    close: "The headline arrives late. Markets move early."
  }
];

export const HABITS = [
  {
    key: "pay-yourself-first",
    kicker: "Money habit",
    hook: "Pay yourself first",
    beats: [
      { big: "Save on payday,", small: "not with whatever is left at the end of the month." },
      { big: "Automate it.", small: "A standing order the day you're paid means no decision to skip." },
      { big: "Start with 5%.", small: "Raise it a little every time your pay rises." },
      { big: "You adapt.", small: "Most people barely notice money that never reaches their current account." }
    ],
    close: "What you don't see, you don't spend."
  },
  {
    key: "emergency-fund",
    kicker: "Money habit",
    hook: "The emergency fund",
    beats: [
      { big: "Three to six months", small: "of essential costs, kept in easy-access savings." },
      { big: "It's not an investment.", small: "It's insurance against having to sell at the worst moment." },
      { big: "Boiler. Car. Job.", small: "Life's surprises go here, not on a credit card." },
      { big: "Build it first.", small: "Then invest with money you won't need in a hurry." }
    ],
    close: "Calm money first. Brave money second."
  },
  {
    key: "24-hour-rule",
    kicker: "Money habit",
    hook: "The 24-hour rule",
    beats: [
      { big: "Want it? Wait a day.", small: "Leave anything non-essential in the basket overnight." },
      { big: "The urge fades.", small: "A lot of impulse buys don't survive the wait." },
      { big: "Same for trades.", small: "A tip that can't wait a day is usually a tip to avoid." },
      { big: "Still want it?", small: "Then buy it, guilt-free." }
    ],
    close: "Urgency is a sales technique."
  },
  {
    key: "lifestyle-creep",
    kicker: "Money habit",
    hook: "Lifestyle creep",
    beats: [
      { big: "Pay rise. New car.", small: "Spending quietly rises to meet income." },
      { big: "Ten years later,", small: "earning twice as much and still saving nothing." },
      { big: "Split every raise.", small: "Half to enjoy now, half to save or invest." },
      { big: "Notice it.", small: "Creep only works when nobody's watching." }
    ],
    close: "Earn more. Upgrade slower."
  },
  {
    key: "start-early",
    kicker: "Money habit",
    hook: "Start at 25 or 35?",
    beats: [
      { big: "£200 a month at 7%", small: "invested until age 65." },
      { big: "From 25: ≈ £525,000", small: "Paid in: £96,000." },
      { big: "From 35: ≈ £244,000", small: "Paid in: £72,000." },
      { big: "Ten years", small: "made the pot more than twice the size." }
    ],
    close: "The best time was earlier. The next best is now."
  },
  {
    key: "fees",
    kicker: "Money habit",
    hook: "Fees eat returns",
    beats: [
      { big: "£10,000 for 30 years", small: "growing at 7% a year before costs." },
      { big: "0.1% fee: ≈ £74,000", small: "A cheap index fund." },
      { big: "1% fee: ≈ £57,000", small: "A typical managed fund. Same market, £17,000 less." },
      { big: "Check the OCF.", small: "The ongoing charge is printed on every fund's factsheet." }
    ],
    close: "1% sounds tiny. It isn't."
  },
  {
    key: "rule-of-72",
    kicker: "Money habit",
    hook: "The rule of 72",
    beats: [
      { big: "72 ÷ your rate", small: "≈ the years it takes money to double." },
      { big: "At 7%:", small: "about 10 years." },
      { big: "At 3%:", small: "about 24 years." },
      { big: "Works for debt too.", small: "At 24% on a credit card, what you owe doubles in about 3 years." }
    ],
    close: "Do the sum before you sign."
  },
  {
    key: "minimum-payments",
    kicker: "Money habit",
    hook: "The minimum payment trap",
    beats: [
      { big: "£2,000 on a card", small: "at 24% a year, paying £50 a month." },
      { big: "82 months", small: "to clear it. Almost seven years." },
      { big: "≈ £2,064 in interest", small: "More than the original spending." },
      { big: "Pay more than the minimum.", small: "Clear the highest-rate debt first." }
    ],
    close: "Expensive debt is a guaranteed negative return."
  },
  {
    key: "time-in-market",
    kicker: "Money habit",
    hook: "Time in, not timing",
    beats: [
      { big: "Nobody times it well.", small: "Professionals included." },
      { big: "The best days", small: "often come right after the worst ones, in the middle of the panic." },
      { big: "Miss them,", small: "and long-run returns shrink a lot." },
      { big: "Stay invested.", small: "Regular amounts, whatever the headlines say." }
    ],
    close: "The calendar beats the clock."
  },
  {
    key: "losses-maths",
    kicker: "Money habit",
    hook: "The maths of losing",
    beats: [
      { big: "Lose 10%,", small: "you need +11% to get back." },
      { big: "Lose 20%,", small: "you need +25%." },
      { big: "Lose 50%,", small: "you need +100%. Double, just to break even." },
      { big: "Protect the downside.", small: "Big losses are much harder to undo than they look." }
    ],
    close: "Defence wins the long game."
  },
  {
    key: "net-worth",
    kicker: "Money habit",
    hook: "Know your number",
    beats: [
      { big: "Everything you own,", small: "savings, investments, pension, home equity…" },
      { big: "minus everything you owe.", small: "Cards, loans, overdraft, mortgage." },
      { big: "Check it every quarter.", small: "Ten minutes, one spreadsheet." },
      { big: "Watch the direction,", small: "not the size. Up, steadily, is the whole game." }
    ],
    close: "You can't steer what you don't measure."
  },
  {
    key: "tips",
    kicker: "Money habit",
    hook: "The hot tip",
    beats: [
      { big: "If it's on your feed,", small: "it's already in the price." },
      { big: "Ask who gains", small: "if you buy. Sometimes it's the person posting." },
      { big: "Read the source.", small: "Company filings, not screenshots." },
      { big: "Never more than you'd lose", small: "on a night out. Treat it as entertainment." }
    ],
    close: "By the time it's a tip, it's a story."
  }
];
