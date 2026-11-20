/**
 * The Fix Theo story (18 Nov, owner's brief): Season 1 is Theo alone fixing
 * his money over 14 days; he meets Maya on day 8 and the finale ends on their
 * first real date. Season 2 is 10 episodes of the two of them making money
 * decisions together. Ledge Desk turns up more and more as Theo gets better
 * with money: something he simply uses, the way a sensible person would.
 * It is never pitched to the viewer (no "download", no "link in bio").
 *
 * NOTES[season][day] is the day's story, given to the writer as context.
 * DESK[season][day] is a moment on Ledge Desk, drawn as Theo's phone
 * showing the desk and spoken with the line given here; the code puts it in
 * the episode so its wording stays exactly as written.
 */

export const NOTES = {
  1: {
    2: "Theo's first real day of fixing things. He is nervous but trying.",
    3: "Theo realises he never knew what APR meant, even though it has been costing him for years.",
    4: "A rough day: something goes wrong and it costs money.",
    5: "Theo learns that most credit card rates move with interest rates set by the Federal Reserve.",
    6: "His roommates notice he is cooking and are suspicious.",
    7: "Crypto drops again. Old Theo would have panicked. New Theo looks before he leaps.",
    8: "At the phone store, a customer named Maya buys a phone outright, with money she saved for it. Theo has never seen anyone not use a payment plan. He is impressed and a bit awkward.",
    9: "Theo reads up on budgeting during his lunch break instead of scrolling.",
    10: "Theo and Maya get coffee. She notices he is checking a markets desk, not crypto forums. She is quietly impressed.",
    11: "Theo makes sure he never pays a bill late again.",
    12: "Maya tells Theo her money rule: pay yourself first. He takes notes, literally.",
    13: "Theo starts watching how the stock market moves, just watching and learning, not buying yet.",
    14: "Finale: Theo's money score has climbed. Maya asks him on a real date. He checks his budget first, and says yes."
  },
  2: {
    1: "Season 2 begins. Maya properly: 24, a nurse, the organised one, but with a 2am online shopping habit. Theo and Maya are dating and decide to make money decisions together. From now on, viewers vote for both of them.",
    2: "Dating on a budget without it feeling cheap.",
    3: "Big step: they move in together. The question is how to split the rent fairly.",
    4: "Living together means shared bills and shared plans.",
    5: "Grown-up stuff: protecting what they have and paying down what they owe.",
    6: "Maya really wants a dog. Theo really wants Maya to be happy. The budget has opinions.",
    7: "Theo starts investing for the first time, small and slow, for the long run.",
    8: "Phones: Theo sells them all day. Maya's screen is cracked. Temptation.",
    9: "The holidays are coming, and last year's gifts went on Theo's credit card.",
    10: "Finale: how far they have come since $4.12. They plan their next year together."
  }
};

export const DESK = {
  // Only what Ledge Desk really has: the glossary and lessons (wording quoted
  // from lib/content.js), the economic calendar, the mood dial, Fed-decision
  // alerts and the watchlist. Never a feature it doesn't have.
  // `fits`: the choices a moment belongs with (20 Nov: a fixed day put the
  // crypto-leverage moment into a credit-card episode). The day is only a
  // preference; write.mjs uses a moment on a day whose choice it fits, once.
  1: {
    3: { fits: ["sell_crypto"], screen: "glossary", term: "Leverage", def: "Controlling a large position with a small deposit. It multiplies gains and losses equally.",
      say: "His crypto app keeps offering him ten times leverage. This time he looks it up first, in the Ledge Desk glossary. He closes the app.", cap: "HE LOOKED / IT *UP*" },
    5: { fits: ["extra_card", "balance_transfer", "credit_report", "budget"], screen: "calendar", title: "FED DECISION", when: "THIS MONTH", rows: [["Fed rate decision", "USD"], ["US jobs report", "USD"], ["US inflation", "USD"]],
      say: "Most credit card rates move with the Fed. So now Theo checks when the Fed meets, on the economic calendar. Voluntarily. Nobody asked him to.", cap: "HE CHECKS THE / *CALENDAR*" },
    7: { fits: ["sell_crypto", "match_401k", "automate_savings", "emergency_fund"], screen: "mood", word: "NERVOUS",
      say: "Instead of panic selling, he checks the market mood first. Everyone is nervous. He does nothing rash, which for Theo is a personal best.", cap: "NOTHING / *RASH*" },
    9: { fits: ["sell_crypto", "side_hustle", "emergency_fund", "sell_sneakers"], screen: "lesson", title: "How money is actually lost", line: "Six mechanisms, and none of them is picking the wrong direction.",
      say: "At lunch, Theo reads a lesson called How money is actually lost. On purpose. His coworkers are worried about him.", cap: "LUNCH BREAK / *LESSON*" },
    11: { fits: ["balance_transfer", "extra_card", "credit_report", "budget"], screen: "alert", title: "ALERT SET", detail: "Fed rate decision · 1 day before",
      say: "He sets an alert for the next Fed decision, the day his card rate could move. Old Theo found out from the bill.", cap: "HE SET AN / *ALERT*" },
    13: { fits: ["match_401k", "automate_savings", "emergency_fund", "budget"], screen: "watchlist", rows: [["S&P 500", "watching"], ["Gold", "watching"], ["Bitcoin", "just looking"]],
      say: "He adds the S&P 500 to his watchlist. Just watching how it moves for now. Learning before buying.", cap: "WATCHING / *FIRST*" }
  },
  2: {
    4: { fits: ["money_date", "joint_account", "emergency_together", "date_budget"], screen: "calendar", title: "JOBS REPORT", when: "FRIDAY", rows: [["US jobs report", "USD"], ["Fed rate decision", "USD"]],
      say: "Their Sunday money date now starts with the week ahead on the calendar. Theo calls it the briefing. Maya calls it cute.", cap: "THE *BRIEFING*" },
    7: { fits: ["roth_ira", "index_fund"], screen: "lesson", title: "Position sizing", line: "Decide what you lose when wrong, before you decide what you'll buy.",
      say: "Before investing a cent, Theo reads the Ledge Desk lesson on position sizing. Then he makes Maya quiz him on it.", cap: "QUIZ / *ME*" },
    8: { fits: ["index_fund", "roth_ira", "trip_fund", "emergency_together"], screen: "mood", word: "FEARFUL",
      say: "Markets have a scary week. They check the mood on the desk, see the fear, and stick to the plan anyway.", cap: "STICK TO / THE *PLAN*" },
    9: { fits: ["gift_budget", "index_fund", "roth_ira"], screen: "watchlist", rows: [["Gold", "Maya's"], ["S&P 500", "Theo's"]],
      say: "Maya adds gold to their watchlist. She says it is for research. Theo knows it is for a necklace.", cap: "FOR *RESEARCH*" }
  }
};

/** Story moments that must happen whoever writes the day, placed by the code like DESK. */
export const PLOT = {
  1: {
    8: { scene: "couple", say: "Then, at work, a customer named Maya buys a phone. Outright. With money she saved for it. Theo has never seen anything like it.", cap: "SHE PAID / *IN FULL*", face: "shock", pose: "shrug", mface: "smug", mpose: "idle", stamp: "WHO IS SHE" },
    10: { scene: "couple", say: "Coffee with Maya. She notices he is reading about markets, not crypto forums. She is impressed. A little.", cap: "IMPRESSED. / A *LITTLE*", face: "happy", pose: "point", mface: "smug", mpose: "idle" },
    12: { scene: "maya", say: "Maya tells him her one money rule: pay yourself first. Theo writes it down. In pen.", cap: "PAY YOURSELF / *FIRST*", face: "smug", pose: "point" }
  },
  2: {}
};
