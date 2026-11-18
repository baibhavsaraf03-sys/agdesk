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
  return s.income + s.side - (s.rent + s.takeout + s.subs + s.bnpl + s.phone + s.other + card + s.autoSave * 26 / 12 + (s.dates || 0) + (s.monthly || 0));
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
  const S2 = s.season === 2;
  const [ka, kb] = s.vote;
  const key = winner === "b" && kb ? kb : ka;
  const act = (S2 ? ACTIONS2 : ACTIONS)[key];
  const res = act.apply(s);
  (S2 ? (s.done2 = s.done2 || []) : s.done).push(key);
  s.day += 1;
  s.score = Math.min(97, s.score + (S2 ? Math.ceil(act.points / 2) : act.points));
  let event = null;
  if (!S2 && s.day % 4 === 0) {
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
  s.vote = S2 ? (PAIRS2[s.day - 1] || []) : nextVote(s);
  const choice = { key, label: act.label, letter: winner === "b" ? "B" : "A", counts };
  s.history.push({ season: s.season || 1, day: s.day, choice: key, counts, event: event?.key || null });
  return {
    state: s,
    facts: {
      day: s.day, of: s.of, score: s.score, choice, result: res, event,
      leftover: Math.round(lo), card: Math.round(s.card), savings: Math.round(s.savings),
      season: s.season || 1, jokes: act.jokes || [],
      next: s.vote.map((k) => ({ key: k, label: (S2 ? ACTIONS2 : ACTIONS)[k].label })),
      monthlyInterest: Math.round(monthlyInterest(s))
    }
  };
}

/* ---------------- Season 2: Theo and Maya (10 episodes) ---------------- */

/** Maya's money when Season 2 starts. Theo's carries over from Season 1. */
export const MAYA = { income: 3400, rent: 1300, loans: 24000, loanApr: 0.055, loanPay: 260, saves: 0.15 };
const loanPayoff = (bal, apr, pmt) => { let b = bal, m = 0, i = 0; while (b > 0.005 && m < 1200) { const x = b * apr / 12; i += x; b = b + x - Math.min(b + x, pmt); m++; } return { months: m, interest: Math.round(i) }; };
const share = (s) => s.income / (s.income + MAYA.income);

export const ACTIONS2 = {
  date_budget: { label: "A $50 date-night budget", points: 4,
    jokes: [{ say: "Date night is now a picnic. Theo made sandwiches. They are fine.", cap: "THEY ARE / *FINE*", face: "smug", pose: "point" },
            { say: "Maya says it is the best date they have had. Theo suspects she is being nice.", cap: "SHE'S BEING / *NICE*", face: "worried", pose: "shrug" }],
    apply(s) { s.dates = 100; return { big: "$280/MO", small: "SAVED TOGETHER", facts: [
      "Theo and Maya go out 4 nights a month, and dinner was costing about $120 a night.",
      "They set a $50 budget per date night instead.",
      "That saves $280 a month between them, $140 each."] }; } },
  money_date: { label: "A monthly money date", points: 4,
    jokes: [{ say: "They make it a proper date: snacks, a spreadsheet, and Maya's playlist.", cap: "SNACKS AND / *SPREADSHEETS*", face: "happy", pose: "wave" },
            { say: "Maya finds her own leak. She is mortified. Theo is thrilled.", cap: "HER *OWN* / LEAK", face: "smug", pose: "point", stamp: "THE TURN" }],
    apply(s) { return { big: "$540/YR", small: "FOUND ON DATE ONE", facts: [
      "Once a month, they sit down together and go through their spending.",
      "On the first one, Maya finds a $45 a month yoga membership she has not used since March.",
      "Cancelling it saves her $540 a year."] }; } },
  split_income: { label: "Split rent by income", points: 6,
    jokes: [{ say: "Theo moves in with two bags and a box of cables. Maya moves in with a plan.", cap: "A BOX OF / *CABLES*", face: "happy", pose: "shrug" },
            { say: "Theo's old roommates throw him a goodbye party. It is takeout. Some habits die hard.", cap: "IT WAS / *TAKEOUT*", face: "smug", pose: "point" }],
    apply(s) { const t = Math.round(1950 * share(s)), m = 1950 - t, was = s.rent; s.rent = t; return { big: `$${t}`, small: "THEO'S SHARE", facts: [
      "They move into a one-bed for $1,950 a month, bills included.",
      `They split it by income: Theo earns about ${Math.round(share(s) * 100)}% of what they make together, so he pays $${t} and Maya pays $${m}.`,
      `Theo was paying $${was}, so he saves $${was - t} a month. Maya was paying $1,300, so she saves $${1300 - m}.`] }; } },
  split_even: { label: "Split rent 50/50", points: 5,
    jokes: [{ say: "Theo moves in with two bags and a box of cables. Maya moves in with a plan.", cap: "A BOX OF / *CABLES*", face: "happy", pose: "shrug" },
            { say: "Fifty fifty sounds fair. Theo's budget disagrees, quietly.", cap: "THE BUDGET / *DISAGREES*", face: "worried", pose: "idle" }],
    apply(s) { const was = s.rent; s.rent = 975; return { big: "$975", small: "EACH", facts: [
      "They move into a one-bed for $1,950 a month, bills included.",
      "They split it down the middle: $975 each.",
      `Theo was paying $${was}, so he saves $${was - 975} a month. Maya was paying $1,300, so she saves $325.`] }; } },
  joint_account: { label: "A shared account for bills", points: 5,
    jokes: [{ say: "They name the account Ours. Theo wanted to call it The Vault. He was outvoted.", cap: "THE *VAULT*", face: "sad", pose: "shrug", stamp: "OUTVOTED" },
            { say: "No more who paid for groceries arguments. Just one card for the boring stuff.", cap: "ONE CARD / FOR *BORING*", face: "happy", pose: "wave" }],
    apply(s) { const t = Math.round(500 * share(s)); return { big: "YOURS MINE OURS", small: "THREE ACCOUNTS", facts: [
      "They keep their own accounts and open a third one together, just for shared bills.",
      `Groceries are about $500 a month. Split by income, Theo puts in $${t} and Maya puts in $${500 - t}.`,
      "Each pays in on payday, and the shared bills come out of that account."] }; } },
  trip_fund: { label: "Save for a trip together", points: 4,
    jokes: [{ say: "They pin a beach photo to the fridge. Theo looks at it every time he wants takeout.", cap: "THE *FRIDGE* / PHOTO", face: "happy", pose: "point" },
            { say: "Maya already has a spreadsheet for the trip. Of course she does.", cap: "OF COURSE / SHE *DOES*", face: "smug", pose: "shrug" }],
    apply(s) { s.monthly = (s.monthly || 0) + 125; return { big: "$2,000", small: "TRIP FUND", facts: [
      "They want a $2,000 trip in 8 months.",
      "That is $250 a month together, $125 each.",
      "They set it aside on payday, so the trip is paid for before they book it."] }; } },
  loan_extra: { label: "Extra $100 on Maya's loans", points: 6,
    jokes: [{ say: "Theo offers to help. Maya says no. She just wants him to cheer. He cheers loudly.", cap: "HE CHEERS / *LOUDLY*", face: "happy", pose: "wave" },
            { say: "She makes the first extra payment and does a small victory dance.", cap: "VICTORY / *DANCE*", face: "smug", pose: "point" }],
    apply(s) { const a = loanPayoff(MAYA.loans, MAYA.loanApr, MAYA.loanPay), b = loanPayoff(MAYA.loans, MAYA.loanApr, MAYA.loanPay + 100);
      return { big: `${a.months - b.months} MONTHS`, small: "SOONER", facts: [
      "Maya has $24,000 of student loans at 5.5%, paying $260 a month.",
      `At that rate they take ${a.months} months to clear and cost $${a.interest.toLocaleString("en-US")} in interest.`,
      `Paying $100 more each month clears them in ${b.months} months, with $${b.interest.toLocaleString("en-US")} in interest.`,
      `That saves her $${(a.interest - b.interest).toLocaleString("en-US")}.`] }; } },
  renters_insurance: { label: "Get renters insurance", points: 3,
    jokes: [{ say: "Theo asks what happens if the upstairs bath floods. Maya hands him the quote.", cap: "SHE HAD THE / *QUOTE*", face: "shock", pose: "shrug" },
            { say: "Insurance is boring until the day it isn't.", cap: "BORING / UNTIL IT *ISN'T*", face: "smug", pose: "point" }],
    apply(s) { s.other += 8; return { big: "$15/MO", small: "RENTERS INSURANCE", facts: [
      "Their landlord's insurance covers the building, not their stuff.",
      "The quote they get covers $20,000 of their belongings for $15 a month.",
      "They split it, so it is about $8 each."] }; } },
  adopt_dog: { label: "Adopt the dog now", points: 2,
    jokes: [{ say: "The dog's name is Budget. Theo picked it. Maya allowed it.", cap: "HIS NAME IS / *BUDGET*", face: "happy", pose: "wave", stamp: "GOOD BOY" },
            { say: "Budget has already eaten one of Theo's sneakers. Not the expensive ones, luckily. He sold those.", cap: "NOT THE / *EXPENSIVE ONES*", face: "shock", pose: "shrug" }],
    apply(s) { s.other += 75; s.savings = Math.max(0, s.savings - 100); return { big: "$150/MO", small: "THE DOG", facts: [
      "They adopt a dog from a shelter. The adoption fee is $200, split between them.",
      "Food, vet and pet insurance come to about $150 a month.",
      "That is $75 each a month, or $1,800 a year together."] }; } },
  wait_dog: { label: "Save a dog fund first", points: 4,
    jokes: [{ say: "Maya makes a folder of dogs they might adopt. It has forty dogs in it.", cap: "FORTY / *DOGS*", face: "worried", pose: "shrug" },
            { say: "Theo walks the neighbour's dog for practice. The dog is not impressed.", cap: "NOT / *IMPRESSED*", face: "sad", pose: "idle" }],
    apply(s) { s.monthly = (s.monthly || 0) + 75; return { big: "$1,800", small: "DOG FUND", facts: [
      "They decide to wait and save first.",
      "A dog costs about $150 a month in food, vet and insurance.",
      "Saving that $150 a month for a year builds an $1,800 dog fund before the dog arrives."] }; } },
  roth_ira: { label: "Theo opens a Roth IRA", points: 7,
    jokes: [{ say: "Theo opens a retirement account. He is 24. He feels very old and very smart.", cap: "OLD AND / *SMART*", face: "smug", pose: "point" },
            { say: "Maya opened hers at 21. She does not mention this. Much.", cap: "SHE DOES NOT / *MENTION IT*", face: "smug", pose: "shrug" }],
    apply(s) { s.monthly = (s.monthly || 0) + 100; return { big: "$262,481", small: "IF 7% A YEAR FOR 40 YEARS", facts: [
      "Theo opens a Roth IRA and puts in $100 a month.",
      "Over 40 years that is $48,000 of his own money.",
      "If it grew 7% a year on average, it would reach about $262,481. Markets are not guaranteed, but time does the heavy lifting."] }; } },
  index_fund: { label: "Theo buys his first index fund", points: 6,
    jokes: [{ say: "He clicks buy. Then he refreshes the app every four minutes. Maya takes his phone.", cap: "SHE TOOK / HIS *PHONE*", face: "worried", pose: "shrug", stamp: "PHONE JAIL" },
            { say: "It goes down 1% the next day. Old Theo would panic. New Theo shrugs.", cap: "NEW THEO / *SHRUGS*", face: "smug", pose: "shrug" }],
    apply(s) { s.savings = Math.max(0, s.savings - 100); return { big: "$100", small: "FIRST INVESTMENT", facts: [
      "Theo puts $100 from his savings into an index fund that owns a small slice of hundreds of companies.",
      "Its yearly fee is under 0.1%, so it costs him less than 10 cents a year on $100.",
      "It is money he will not need for years, so the daily ups and downs do not matter."] }; } },
  keep_phones: { label: "Keep the phones", points: 4,
    jokes: [{ say: "Theo sells phones all day and keeps his own. His manager calls it a cry for help.", cap: "A CRY / FOR *HELP*", face: "smug", pose: "point" },
            { say: "Maya fixes her cracked screen with Theo's weekend repair service. It's free. He hopes for a tip.", cap: "HE HOPES / FOR A *TIP*", face: "happy", pose: "wave" }],
    apply(s) { return { big: "$84/MO", small: "NOT SPENT", facts: [
      "Two new phones would cost $1,000 each, paid over 24 months.",
      "That is about $42 a month each, $84 together.",
      "They keep their phones and Theo fixes Maya's screen himself instead."] }; } },
  upgrade_phones: { label: "Upgrade with Theo's discount", points: 2,
    jokes: [{ say: "Theo uses his staff discount. He has never been more powerful.", cap: "NEVER MORE / *POWERFUL*", face: "smug", pose: "point" },
            { say: "Maya asks if they really needed new phones. Theo pretends he cannot hear her.", cap: "HE CAN'T / *HEAR HER*", face: "worried", pose: "shrug" }],
    apply(s) { s.other += 33; return { big: "$800", small: "EACH, WITH DISCOUNT", facts: [
      "Theo's 20% staff discount takes each $1,000 phone down to $800.",
      "Paid over 24 months, that is about $33 a month each.",
      "Cheaper than full price, but still $66 a month they did not spend before."] }; } },
  gift_budget: { label: "A $150 gift budget each", points: 5,
    jokes: [{ say: "Theo makes his gifts this year. Maya gets a framed copy of his first budget.", cap: "A FRAMED / *BUDGET*", face: "happy", pose: "point", stamp: "ROMANTIC?" },
            { say: "Last year's Theo bought everyone gadgets on the card. This year's Theo has a list.", cap: "THIS YEAR: / A *LIST*", face: "smug", pose: "wave" }],
    apply(s) { return { big: "$150", small: "EACH, CASH", facts: [
      "Last year, Theo put $600 of holiday gifts on his credit card.",
      "This year they each set a $150 gift budget, paid from savings, not the card.",
      "No January bill, no interest, no regret."] }; } },
  emergency_together: { label: "A shared emergency fund", points: 6,
    jokes: [{ say: "They name it For When Budget Eats Something.", cap: "FOR WHEN / *BUDGET EATS*", face: "happy", pose: "wave" },
            { say: "Theo checks the balance like it is a sports score.", cap: "LIKE A / *SPORTS SCORE*", face: "smug", pose: "point" }],
    apply(s) { s.monthly = (s.monthly || 0) + 100; return { big: "$2,000", small: "SHARED SAFETY NET", facts: [
      "They start a $2,000 emergency fund for the two of them.",
      "Putting in $100 each a month, it is full in 10 months.",
      "If the car, the dog or the boiler surprises them, it does not go on a card."] }; } },
  car: { label: "Buy a used car", points: 1,
    jokes: [{ say: "The car has a tape deck. Theo does not know what a tape is.", cap: "A *TAPE* / DECK", face: "shock", pose: "shrug" },
            { say: "Freedom costs $500 a month, it turns out.", cap: "FREEDOM: / *$500 A MONTH*", face: "worried", pose: "idle" }],
    apply(s) { s.other += 120; return { big: "$500/MO", small: "THE CAR", facts: [
      "A used car would cost them about $250 a month in payments, $150 in insurance and $100 in gas.",
      "That is about $500 a month, against $260 for their two train passes.",
      "So the car costs them $240 a month more."] }; } },
  transit: { label: "Keep taking the train", points: 5,
    jokes: [{ say: "Theo reads Ledge Desk on the train every morning. He calls it his commute briefing.", cap: "COMMUTE / *BRIEFING*", face: "smug", pose: "point" },
            { say: "Maya naps on the train. Theo guards her bag like it holds the emergency fund.", cap: "GUARDING / *THE BAG*", face: "happy", pose: "idle" }],
    apply(s) { return { big: "$240/MO", small: "KEPT", facts: [
      "A used car would cost them about $500 a month all in.",
      "Their two train passes cost $260 a month.",
      "Staying on the train keeps $240 a month in their pockets."] }; } }
};

/** One vote per Season 2 day (the vote shown at the end of day 1 through day 9). */
export const PAIRS2 = [
  ["date_budget", "money_date"], ["split_income", "split_even"], ["joint_account", "trip_fund"], ["loan_extra", "renters_insurance"],
  ["adopt_dog", "wait_dog"], ["roth_ira", "index_fund"], ["keep_phones", "upgrade_phones"], ["gift_budget", "emergency_together"], ["transit", "car"]
];

/** Season 1 finished: Theo's money carries over, Maya joins, day 1 of 10. */
export function startSeason2(s1) {
  const s = JSON.parse(JSON.stringify(s1));
  s.season = 2; s.day = 1; s.of = 10; s.dates = 240; s.vote = PAIRS2[0]; s.done2 = [];
  s.history.push({ season: 2, day: 1, start: true });
  return s;
}
export const s2Intro = (s) => ({
  big: "MAYA", small: "SEASON 2", facts: [
    "Maya is 24, a nurse, and the organised one.",
    `She takes home $${MAYA.income.toLocaleString("en-US")} a month and saves 15% of every paycheck.`,
    `She has $${MAYA.loans.toLocaleString("en-US")} of student loans at 5.5%, and one weakness: online shopping at 2am.`,
    `Theo now has $${Math.round(leftover(s))} left over each month and a money score of ${s.score}%.`] });
