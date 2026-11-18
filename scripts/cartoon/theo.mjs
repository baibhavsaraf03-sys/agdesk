/**
 * Theo's money engine (18 Nov). Every figure in a "Fix Theo" episode comes
 * from here, never from the AI: his budget, the card, the choices viewers
 * vote on and what each one changes. The story is fiction; the arithmetic
 * (interest, payoff times, yearly totals) is real and worked out below.
 *
 * State lives in scripts/cartoon/state/theo.json and is committed by the
 * workflow after each episode, so the story carries on day to day. A season
 * is 14 days: one choice a day from the 13 below, then the finale.
 */

export const START = {
  day: 1, of: 14, score: 8,
  income: 2900, side: 0,                     // take-home pay a month, side income a month
  rent: 1050, takeout: 240, subs: 65.94, bnpl: 160, phone: 85, other: 1250,
  card: 1800, apr: 0.249, cardExtra: 0, promo: null,
  savings: 0, autoSave: 0, crypto: 300, match: false,
  done: [], vote: ["cancel_subs", "delete_delivery"], history: []
};

const r2 = (x) => Math.round(x * 100) / 100;
export const money = (x, cents = false) => {
  const v = cents ? r2(x).toFixed(2) : Math.round(x).toString();
  const [a, b] = v.split(".");
  return "$" + a.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (b ? "." + b : "");
};

/** Months and interest to clear a card: minimum = interest + 1% (at least $35), plus any extra. */
export function payoff(balance, apr, extra = 0) {
  let b = balance, m = 0, interest = 0;
  while (b > 0.005 && m < 1200) {
    const i = b * apr / 12;
    interest += i;
    const pay = Math.min(b + i, Math.max(35, i + 0.01 * b) + extra);
    b = b + i - pay;
    m++;
  }
  return { months: m, years: r2(m / 12), interest: Math.round(interest) };
}
export const minimum = (s) => Math.max(35, s.card * s.apr / 12 + 0.01 * s.card);
export const monthlyInterest = (s) => (s.promo ? 0 : s.card * s.apr / 12);
export function leftover(s) {
  const card = s.card > 0 ? (s.promo ? s.promo.monthly : minimum(s) + s.cardExtra) : 0;
  return s.income + s.side - (s.rent + s.takeout + s.subs + s.bnpl + s.phone + s.other + card + s.autoSave * 26 / 12);
}

/**
 * The choices. label is what the vote card shows; apply() changes the state
 * and returns the facts the episode may use (each a short sentence with
 * figures), plus a headline number for the big stat card.
 */
export const ACTIONS = {
  cancel_subs: {
    jokes: [{ say: "He opens his phone. Five different apps ask who's watching. Nobody is.", cap: "WHO'S / *WATCHING?*", face: "smug", pose: "point" }, { say: "He cancels them one by one. One of them offers him a discount to stay. He stays strong.", cap: "HE STAYED / *STRONG*", face: "happy", pose: "wave", stamp: "CHARACTER GROWTH" }],
    label: "Cancel the subscriptions", points: 6,
    apply(s) {
      const keep = 10.99, save = s.subs - keep;
      s.subs = keep;
      return { big: money(save) + "/MO", small: "SAVED ON STREAMING", facts: [
        `Theo cancels 5 of his 6 streaming services and keeps the 1 he actually watches.`,
        `That saves ${money(save, true)} a month.`,
        `Over a year, that is ${money(save * 12)}.`] };
    }
  },
  delete_delivery: {
    jokes: [{ say: "He opens the fridge. It's just ketchup and a lemon.", cap: "KETCHUP / AND A *LEMON*", face: "shock", pose: "shrug", stamp: "CHEF THEO" }, { say: "Night one, he makes pasta. It's burnt, but it's his.", cap: "BURNT / BUT *HIS*", face: "happy", pose: "point" }],
    label: "Delete the delivery apps", points: 7,
    apply(s) {
      const before = s.takeout; s.takeout = 60;
      const save = before - s.takeout;
      return { big: money(save) + "/MO", small: "SAVED ON TAKEOUT", facts: [
        `Theo deletes the food delivery apps and starts cooking, with 1 takeout night a week.`,
        `Takeout drops from ${money(before)} to ${money(s.takeout)} a month.`,
        `That saves ${money(save)} a month, or ${money(save * 12)} a year.`] };
    }
  },
  extra_card: {
    jokes: [{ say: "He finally opens the credit card app. He was scared of it for months.", cap: "HE OPENED / THE *APP*", face: "worried", pose: "idle" }, { say: "He sets up the extra payment before he can change his mind.", cap: "NO TAKE- / *BACKS*", face: "smug", pose: "point", stamp: "LOCKED IN" }],
    label: "Pay $100 extra on the card", points: 8,
    apply(s) {
      const a = payoff(s.card, s.apr, 0), b = payoff(s.card, s.apr, 100);
      s.cardExtra = 100;
      return { big: `${b.months} MONTHS`, small: `INSTEAD OF ${a.years >= 2 ? Math.floor(a.years) + " YEARS" : a.months + " MONTHS"}`, facts: [
        `Theo pays $100 a month on top of the minimum on his ${money(s.card)} card.`,
        `Paying only the minimum would take ${a.months} months, about ${Math.floor(a.years)} years, and cost ${money(a.interest)} in interest.`,
        `With the extra $100, it is cleared in ${b.months} months and costs ${money(b.interest)} in interest.`,
        `That saves him ${money(a.interest - b.interest)} in interest.`] };
    }
  },
  balance_transfer: {
    jokes: [{ say: "Theo reads the fine print. All of it. For the first time in his life.", cap: "HE READ / THE *FINE PRINT*", face: "worried", pose: "idle" }, { say: "He sets a reminder for when the 0% ends. Three reminders, actually.", cap: "THREE / *REMINDERS*", face: "smug", pose: "point", stamp: "ORGANISED?" }],
    label: "Move the debt to a 0% card", points: 8,
    apply(s) {
      const fee = Math.round(s.card * 0.03), months = 15, monthly = Math.ceil((s.card + fee) / months);
      const a = payoff(s.card, s.apr, 0);
      s.promo = { months, fee, monthly }; s.card = s.card + fee;
      return { big: "0%", small: `FOR ${months} MONTHS`, facts: [
        `Theo moves his card balance to a new card with 0% interest for ${months} months, if he gets approved.`,
        `There is a 3% transfer fee, which is ${money(fee)}.`,
        `Paying ${money(monthly)} a month clears it before the 0% ends.`,
        `On the minimum at 24.9%, the same debt would have cost ${money(a.interest)} in interest.`,
        `If it is not cleared in time, the rate jumps up, so the plan has to stick.`] };
    }
  },
  sell_sneakers: {
    jokes: [{ say: "He lists the sneakers online. Someone offers him half. He counters.", cap: "HE / *COUNTERED*", face: "smug", pose: "point", stamp: "BUSINESSMAN" }, { say: "He packs them up. They still smell new. Because they basically are.", cap: "BASICALLY / *NEW*", face: "sad", pose: "shrug" }],
    label: "Sell the sneakers", points: 3,
    apply(s) {
      s.savings += 90;
      return { big: "+$90", small: "SNEAKERS SOLD", facts: [
        `Theo sells the sneakers he wore twice for $90.`,
        `He paid $160 for them in 4 pay-later instalments.`,
        `The $90 goes straight into savings, his first savings ever.`] };
    }
  },
  sell_crypto: {
    jokes: [{ say: "He takes down the To the Moon poster. The moon will have to wait.", cap: "THE MOON / CAN *WAIT*", face: "sad", pose: "idle", stamp: "GROUNDED" }, { say: "He checks the price one last time. It went down again. Good timing.", cap: "DOWN / *AGAIN*", face: "shock", pose: "shrug" }],
    label: "Sell the crypto", points: 4,
    apply(s) {
      const v = s.crypto, cut = v * s.apr / 12;
      s.crypto = 0; s.card = Math.max(0, s.card - v);
      return { big: `-${money(v)}`, small: "OFF THE CARD", facts: [
        `Theo sells his crypto for ${money(v)}, down from the $500 he put in.`,
        `He puts all ${money(v)} on the credit card, which is now ${money(s.card)}.`,
        `At 24.9%, that cuts about ${money(cut, true)} of interest every month.`] };
    }
  },
  phone_plan: {
    jokes: [{ say: "He sells phone plans all day. He was on the worst one in the store.", cap: "THE *WORST* / PLAN", face: "shock", pose: "shrug", stamp: "THE IRONY" }, { say: "He switches in five minutes. His manager is not impressed.", cap: "FIVE / *MINUTES*", face: "smug", pose: "point" }],
    label: "Switch phone plans", points: 3,
    apply(s) {
      const before = s.phone; s.phone = 40;
      return { big: money(before - s.phone) + "/MO", small: "CHEAPER PHONE PLAN", facts: [
        `Theo, who sells phones for a living, finally checks his own phone plan.`,
        `He switches from ${money(before)} to ${money(s.phone)} a month.`,
        `That saves ${money(before - s.phone)} a month, or ${money((before - s.phone) * 12)} a year.`] };
    }
  },
  side_hustle: {
    jokes: [{ say: "He fixes his first screen for a friend. It only took three tries.", cap: "THREE / *TRIES*", face: "worried", pose: "idle" }, { say: "Word gets around. Now the whole building has his number.", cap: "THE WHOLE / *BUILDING*", face: "happy", pose: "wave", stamp: "LOCAL LEGEND" }],
    label: "Fix phones on weekends", points: 6,
    apply(s) {
      s.side += 200;
      return { big: "+$200/MO", small: "WEEKEND REPAIRS", facts: [
        `Theo starts fixing cracked phone screens for friends on weekends.`,
        `It brings in about $200 a month.`,
        `That is ${money(2400)} a year, if he keeps it up.`] };
    }
  },
  automate_savings: {
    jokes: [{ say: "He sets it up once. Future Theo will never even notice.", cap: "FUTURE / *THEO*", face: "smug", pose: "point", stamp: "BIG BRAIN" }, { say: "For once, his money moves without him buying something.", cap: "NOTHING / *BOUGHT*", face: "happy", pose: "wave" }],
    label: "Auto-save $50 every payday", points: 4,
    apply(s) {
      s.autoSave = 50;
      return { big: "$1,300", small: "SAVED A YEAR", facts: [
        `Theo sets up an automatic $50 transfer to savings every payday.`,
        `He is paid every 2 weeks, so that is 26 paydays a year.`,
        `That adds up to $1,300 a year without thinking about it.`] };
    }
  },
  emergency_fund: {
    jokes: [{ say: "He names the account Do Not Touch. In capital letters.", cap: "DO NOT / *TOUCH*", face: "smug", pose: "point" }, { say: "Every past emergency went on the credit card. Not anymore.", cap: "NOT / *ANYMORE*", face: "happy", pose: "wave", stamp: "GROWTH" }],
    label: "Build a $1,000 safety net", points: 5,
    apply(s) {
      const per = 50, paydays = Math.ceil(Math.max(0, 1000 - s.savings) / per);
      s.autoSave = Math.max(s.autoSave, per);
      return { big: "$1,000", small: "SAFETY NET GOAL", facts: [
        `Theo starts a $1,000 emergency fund, kept separate from spending money.`,
        `He has ${money(s.savings)} saved so far.`,
        `At $50 a payday, he gets there in ${paydays} paydays, about ${Math.ceil(paydays / 2.17)} months.`,
        `Next time something breaks, it does not go on the credit card.`] };
    }
  },
  budget: {
    jokes: [{ say: "He makes a spreadsheet. It has colors. He's very proud of the colors.", cap: "IT HAS / *COLORS*", face: "happy", pose: "point", stamp: "SPREADSHEET KING" }, { say: "Then he sees the wants column. Most of it was takeout.", cap: "THE *WANTS* / COLUMN", face: "shock", pose: "shrug" }],
    label: "Try the 50/30/20 budget", points: 5,
    apply(s) {
      const i = s.income;
      return { big: "50/30/20", small: "THE BUDGET", facts: [
        `Theo tries the 50/30/20 budget on his ${money(i)} a month take-home pay.`,
        `50% for needs is ${money(i * 0.5)}, 30% for wants is ${money(i * 0.3)}, and 20% for savings and debt is ${money(i * 0.2)}.`,
        `His rent alone is ${money(s.rent)}, so needs will be tight.`] };
    }
  },
  match_401k: {
    jokes: [{ say: "Free money was sitting there the whole time. He just never clicked the button.", cap: "FREE / *MONEY*", face: "shock", pose: "shrug", stamp: "HOW?!" }, { say: "He clicks the button.", cap: "HE CLICKED / THE *BUTTON*", face: "happy", pose: "wave" }],
    label: "Sign up for the 401(k) match", points: 6,
    apply(s) {
      s.match = true;
      return { big: "$1,260", small: "FREE MONEY A YEAR", facts: [
        `Theo finds out his job matches 401(k) contributions up to 3% of pay.`,
        `On a $42,000 salary, 3% is $1,260 a year.`,
        `If he puts in 3%, his employer adds another $1,260. He had been leaving it on the table.`] };
    }
  },
  credit_report: {
    jokes: [{ say: "He was scared to look. It's not as bad as he thought.", cap: "NOT AS / *BAD*", face: "worried", pose: "idle" }, { say: "Being scared of your money doesn't make it go away. Looking does.", cap: "JUST / *LOOK*", face: "smug", pose: "point", stamp: "WISDOM" }],
    label: "Check his credit report", points: 2,
    apply(s) {
      return { big: "FREE", small: "CREDIT REPORTS", facts: [
        `Theo checks his credit reports for free at AnnualCreditReport.com.`,
        `He finds an old store card he forgot about, with a $0 balance.`,
        `Keeping old accounts open and paying on time helps his score over time.`] };
    }
  }
};

/** Pairs offered in this order; a losing choice comes back later. */
const ORDER = ["cancel_subs", "delete_delivery", "extra_card", "balance_transfer", "sell_sneakers", "sell_crypto", "phone_plan", "side_hustle",
  "automate_savings", "emergency_fund", "budget", "match_401k", "credit_report"];

/** Small surprises on some days, so the story has setbacks too (story figures, not facts). */
export const EVENTS = [
  { key: "screen", text: "Theo drops his own phone and cracks the screen. The repair is $129.", cost: 129 },
  { key: "birthday", text: "It is his friend's birthday dinner. He spends $85 and regrets nothing.", cost: 85 },
  { key: "overtime", text: "He picks up extra shifts at the phone store and earns $150 more.", cost: -150 },
  { key: "ticket", text: "He gets a $60 parking ticket. He does not even own a car. It was his roommate's.", cost: 60 },
  { key: "refund", text: "A $310 tax refund lands in his account.", cost: -310 }
];

export function nextVote(s) {
  const left = ORDER.filter((k) => !s.done.includes(k));
  return left.slice(0, 2);
}

/**
 * Moves the story on one day: applies yesterday's winning choice (and an event
 * every fourth day), works out the new score and the next vote, and returns
 * everything the episode needs. winner is "a" or "b"; how says whether real
 * comment counts picked it ({a, b} counts) or Theo chose because there were none.
 */
export function advance(state, winner, counts = null) {
  const s = JSON.parse(JSON.stringify(state));
  const [ka, kb] = s.vote;
  const key = winner === "b" ? kb : ka;
  const act = ACTIONS[key];
  const res = act.apply(s);
  s.done.push(key);
  s.day += 1;
  s.score = Math.min(97, s.score + act.points);
  let event = null;
  if (s.day % 4 === 0) {
    event = EVENTS[(s.day / 4 - 1) % EVENTS.length];
    if (event.cost > 0) {
      // Savings first; whatever savings can't cover goes on the card.
      const fromSavings = Math.min(s.savings, event.cost);
      s.savings -= fromSavings;
      event = { ...event, onCard: event.cost - fromSavings };
      s.card += event.onCard;
    } else s.savings += -event.cost;
  }
  const lo = leftover(s);
  s.vote = nextVote(s);
  const choice = { key, label: act.label, letter: winner === "b" ? "B" : "A", counts };
  s.history.push({ day: s.day, choice: key, counts, event: event?.key || null });
  return {
    state: s,
    facts: {
      day: s.day, of: s.of, score: s.score, choice, result: res, event,
      leftover: Math.round(lo), card: Math.round(s.card), savings: Math.round(s.savings),
      next: s.vote.map((k) => ({ key: k, label: ACTIONS[k].label })),
      monthlyInterest: Math.round(monthlyInterest(s))
    }
  };
}
