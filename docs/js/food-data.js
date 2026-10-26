// Fast food mode: customers, orders and everything they say.
import { pick, rand, shuffle } from './engine.js';
import { randomLook } from './data.js';
import { burgerOrder } from './games/food.js';

const NAMES = {
  m: { kid: ['Milo', 'Jasper', 'Theo', 'Ezra', 'Finn', 'Otis', 'Kai', 'Leo', 'Arlo', 'Rex'], teen: ['Tyler', 'Mason', 'Jayden', 'Diego', 'Malik', 'Owen', 'Connor'], adult: ['Gary', 'Steve', 'Marcus', 'Raj', 'Doug', 'Frank', 'Andre', 'Tom'], elder: ['Walter', 'Harold', 'Bernie', 'Earl', 'Clarence', 'Herb'] },
  f: { kid: ['Luna', 'Ivy', 'Hazel', 'Pippa', 'Mae', 'Zoe', 'Nova', 'Ruby', 'June', 'Wren'], teen: ['Madison', 'Ava', 'Sofia', 'Priya', 'Kayla', 'Jade', 'Brooke'], adult: ['Linda', 'Tasha', 'Meg', 'Rosa', 'Carol', 'Dana', 'Nina', 'Beth'], elder: ['Edna', 'Mildred', 'Dot', 'Gladys', 'Irene', 'Fern'] },
};
const AGES = { kid: [6, 11], teen: [13, 17], adult: [22, 58], elder: [67, 93] };
const VOICE = { kid: 1.55, teen: 1.2, adult: 0.95, elder: 0.82 };
const SIZES = ['small', 'medium', 'large'];
const DRINKS = [['Cola', '#5d3a1a'], ['Orange', '#ff8a2a'], ['Lemon-Lime', '#c5e86c'], ['Grape', '#7b3fa0'], ['Root Beer', '#4a2511']];
const CONES = [['Vanilla', '#fff6e0'], ['Chocolate', '#7b4a2a'], ['Strawberry', '#ffb3c7'], ['Swirl', '#e8d1b0']];

// what each kind of customer says when they order
const ORDER_OPEN = {
  kid: ['Hi! Um. Um. Okay I know what I want.', 'Can I please have', 'My mom said I can order by myself! I want', 'Hello burger person!', 'I would like', 'Okay okay okay. I want'],
  teen: ['Uh, hey. Can I get', 'Yeah, hi. Lemme get', "What's good here? Never mind. Just give me", 'Hey. So. I need', 'Can I get'],
  adult: ['Hi there. I will have', 'Hello. Could I get', "I'm on my lunch break, so quickly please:", 'Good afternoon. I would like', "Let's see. I'll take"],
  elder: ['Hello, young man or young lady. I would like', 'Now let me see here. I will have', "In my day this cost a nickel. Anyway, I'd like", 'Speak up, dear! Oh, my turn? I would like', 'Good day. I shall have'],
};
const ORDER_CLOSE = {
  kid: ['Please and thank you!', 'And a toy! Is there a toy?', 'That is all. I am very hungry.', 'Thank you burger person!', ''],
  teen: ["That's it.", 'Thanks.', 'Can you hurry? My friends are waiting.', ''],
  adult: ['Thank you.', "And please don't forget anything.", 'That will be all.', ''],
  elder: ['Thank you, dear.', 'And a napkin. Several napkins.', 'Take your time. I have all day. Literally.', ''],
};
function itemText(it) {
  if (it.kind === 'burger') return `a burger, ${it.done === 'well' ? 'well done' : 'medium'}`;
  if (it.kind === 'fries') return it.salt >= 4 ? 'fries with extra salt' : it.salt <= 2 ? 'fries with just a little salt' : 'some fries';
  if (it.kind === 'soda') return `a ${it.size} ${it.flavor[0]}`;
  if (it.kind === 'cone') return `a ${it.flavor[0].toLowerCase()} ice cream cone`;
  return 'something';
}

// things customers say while they wait, tied to what they ordered
export const FOOD_REMARKS = {
  burger: ['Is the burger made of real cow? Asking for a cow.', 'I like my burger like I like my naps: well done.', 'Can you make the burger smile? Like with ketchup?', 'I can smell the grill from here. It smells like happiness.', 'Last time my burger was so raw it mooed.', 'Please do not burn it. I have trust issues with burgers.'],
  fries: ['Are the fries crispy? I need them crispy. My whole day depends on it.', 'I am going to dip every single fry in my drink. Do not judge me.', 'Fries are just potatoes that went to college.', 'If you give me a soggy fry I will cry.'],
  soda: ['Not too much ice. Ice is a scam.', 'Can I get a refill? I have not gotten it yet. I am planning ahead.', 'Is it extra fizzy? I like it when it tickles my nose.', 'Please fill it all the way. All. The. Way.'],
  cone: ['Is the ice cream machine working? It is NEVER working.', 'I want it tall. Like a tower. A delicious tower.', 'Can I lick the nozzle? Kidding. Mostly.', 'Please do not drop it. I have seen things.'],
  any: ['Is the doctor still here? Oh, YOU are the doctor? Weird career move.', 'I heard this used to be a hospital. Is the food safe?', 'Why is there a stethoscope by the fryer?', 'My cousin got a shot here last year. Now I get fries. Progress.', 'Do you have a kids menu? I am an adult. I just like the toys.', 'What is the secret sauce? I will not tell anyone. I will tell everyone.', 'Your hairnet looks great. Very professional.', 'This place smells like fries and hand sanitizer. A good combo.'],
};
export const FOOD_WRONG = {
  grill: ['I did not order anything grilled. Put down the spatula.', 'Why are you grilling? I want a drink!', 'Is that for me? I did not order that.'],
  fryer: ['Fries? I did not say fries. My mouth did not make that word.', 'Not the fryer! Read the ticket!', 'Unless that is MY order, step away from the fryer.'],
  soda: ['I did not order a drink. I am very hydrated.', 'Why are you pouring a soda?', 'Read the ticket, please!'],
  sundae: ['Ice cream? I did not order ice cream. Now I want ice cream. Thanks a lot.', 'Not dessert yet!', 'The ice cream machine works?! Wait, that is not my order.'],
  assemble: ['You are building a burger I did not order.', 'Why are you stacking buns? Read the ticket!', 'That is a very nice burger. For someone else.'],
};
export const FOOD_IMPATIENT = ['Hello? Is my order being made?', 'I could have cooked it myself by now.', 'Is the fryer on strike?', 'My stomach is growling. It is growling AT you.', 'Tick tock, burger person.'];
export const FOOD_SUCCESS = {
  kid: ['THIS IS THE BEST BURGER IN THE WORLD!', 'Yum yum yum! Can I come back tomorrow?', 'I am going to eat ALL of it. Even the pickle.'],
  teen: ["Okay that's actually fire.", 'Not bad. Not bad at all.', 'Taking a picture of this before I eat it.'],
  adult: ['Perfect. Exactly what I wanted.', 'Wow, that was fast. And it looks great.', 'Five stars. Would eat again.'],
  elder: ['Just like the diner back home.', 'Now THAT is a proper meal.', 'Well, I will be. That looks delicious.'],
};
export const FOOD_FAIL = ['I want a refund. And a different burger. And an apology.', 'This is NOT what I ordered.', 'I am writing a review. A very long one.', 'Can I speak to the manager? Oh. You are with the manager.', 'Even the hospital food was better than this. And it was a hospital.', 'My dog would not eat this. My dog eats socks.'];
export const FOOD_REFUND = {
  raw: 'The burger was so raw it walked off the plate.',
  burnt: 'The burger was so burnt the smoke alarm sent a review.',
  soggy: 'The fries were floppy. FLOPPY. Fries should never flop.',
  burnt_fries: 'The fries were black. Like, charcoal black. Like, grill-the-burger-on-them black.',
  overflow: 'The soda went everywhere. My shoes are now fizzy.',
  short_pour: 'Half a soda for a whole soda price. I am outraged.',
  ice_mess: 'Most of my ice cream landed on the floor. The floor enjoyed it. I did not.',
  wrong_burger: 'My burger was stacked upside down. The bun was in the middle.',
  wrong_order: 'They got my order wrong. Then they got it wrong AGAIN.',
};
// "You got my order wrong!" When the station work really was off, they say exactly what is wrong.
export const FOOD_ANGRY = {
  grill: ['Excuse me. This burger is RAW. It just mooed at me.', 'I said well done. This is well burnt.', 'This patty is cold in the middle. COLD. Like my heart right now.', 'Is this a burger or a hockey puck?'],
  fryer: ['These fries are soggy. They are basically potato noodles.', 'Where is the salt? I asked for salt!', 'These fries are way too salty. I can feel my blood pressure going up.', 'These fries are burnt. I can taste the smoke.'],
  soda: ['This cup is half empty. I ordered a WHOLE drink.', 'This is mostly foam! I cannot drink bubbles!', 'Hey! This is not the size I ordered!', 'The cup is sticky. And not full. Mostly sticky.'],
  sundae: ['My ice cream is falling over! It is leaning like a tower!', 'This cone is lopsided. It looks sad.', 'Where is the ice cream? This is just a cone with a dream.', 'Half of my ice cream is on the outside of the cone!'],
  assemble: ['There are pickles on this! I said NO pickles!', 'The bun is upside down. The burger is upside down. My day is upside down.', 'Where is the cheese? I specifically asked for cheese!', 'The lettuce is on the bottom! That is illegal!'],
};
// Picky customers who say it is wrong even when it is not.
export const FOOD_PICKY = ['This is NOT what I ordered!', 'Hmm. No. This is wrong. I can feel it.', 'I wanted it with extra love. I do not taste any love.', 'Wrong! I ordered the exact same thing, but different.', 'This does not look like the picture on the menu!', 'Excuse me, this burger is looking at me funny.', 'Hold on. I changed my mind. And you should have known that.'];
// Manager Pat, every single time
export const MANAGER_REMAKE = ['The customer is always right. Even when they are wrong. Make it again.', 'Rule number one: the customer is always right. Rule number two: make it again.', 'Ugh. Fine. Remake it. Smile while you do it.', 'Let me guess. Make it again? Make it again.'];
// after a good remake
export const FOOD_REMAKE_OK = ['Now THAT is what I ordered. Thank you.', 'Much better. See? Was that so hard?', 'Okay, okay. This one is perfect. I forgive you.', 'Yes! Finally! You are a burger hero.'];
// the picky ones, after the remake, when they figure it out
export const FOOD_REMAKE_SORRY = ['Oh. Wait. The first one was right. I was looking at my friend\'s order. Sorry.', 'Hmm. This looks exactly like the first one. I am going to leave a tip and walk away quietly.', 'You know what, I was just hungry and grumpy. Here, keep the change.', 'My mom says I have to say sorry. Sorry. It was fine.'];
export const FOOD_REMAKE_BAD = ['Worse. It is WORSE. How is it worse?', 'I asked for a fix, not a sequel.', 'Nope. I want my money back.'];
export const FOOD_COUPON = ['A coupon? Fine. I am still telling my friends.', 'Hmph. I will take the coupon. And the attitude.', 'Okay. But I am eating it angrily.', 'A coupon for my next visit? There might not BE a next visit.'];
export const STATION_NAMES = { grill: 'burger patty', fryer: 'fries', soda: 'drink', sundae: 'ice cream cone', assemble: 'burger' };

export const FOOD_REVIEWS = {
  3: ['Best burger I ever had. And I have had a LOT of burgers.', 'Fast, hot and perfect. Five stars.', 'The fries were so crispy they made music.', 'Would order again. Already did. Twice.'],
  2: ['Pretty good. The fries were a little shy.', 'Good food. The cook was humming doctor stuff though.', 'Tasty! A little slow.', 'Solid burger. Medium soda.'],
  1: ['It was food. I ate it. That is all I can say.', 'The burger was fine. The fries were sad.', 'Almost right. Almost.', 'One star for the napkins. They were nice napkins.'],
  0: ['I want my money back. And my afternoon.', 'Worst burger in town. And town has a gas station burger.', 'The manager gave me a coupon. For a different restaurant.', 'Do not eat here. Unless you like regret.'],
};
export const FOOD_FORECAST = ['Lunch rush in 3... 2... 1...', 'Manager Pat polished the spatulas. They are VERY shiny.', 'The ice cream machine is working today. Nobody knows why.', 'A bus full of hungry tourists is parked outside.', 'Someone ordered 400 nuggets online. That is tomorrow, thankfully.', 'The grill is extra hot today. So is Manager Pat.', 'The drive-thru speaker only speaks in squeaks today.'];
export const FOOD_BILLS = ['Bills: oil, buns, and a LOT of ketchup.', 'Bills: Manager Pat bought a new visor. It was expensive.', 'Bills: someone keeps stealing the good spatulas.', 'Bills: the ice cream machine needs repairs. Again.', 'Bills: 900 tiny paper cups for ketchup.'];
export const FOOD_WELCOME = ['The customer waited. They ate all the free mints.', 'Manager Pat kept the fries warm. Mostly.', 'Your hairnet was right where you left it.'];
const BYE = {
  great: ['Thanks! This place is awesome!', 'See you tomorrow! And the day after that!', 'Best. Lunch. Ever.', 'I am telling everyone about the fries.', 'Bye, burger person! You rock!', 'I am going to dream about this burger.'],
  good: ['Thanks, bye!', 'Pretty good! See ya.', 'Thanks for the food!', 'Okay, bye! Keep the change. There is no change. Bye!'],
  meh: ['Um. Thanks, I guess.', 'I will eat it in the car. Where nobody can see.', 'It is food. Bye.'],
  sad: ['I am never coming back. Unless I get hungry.', 'I want a refund. And a hug.', 'Hmph. Goodbye.', 'I am going to the taco truck next door.'],
};
export function foodGoodbye(mood, recent = new Set()) {
  for (let i = 0; i < 12; i++) { const l = pick(BYE[mood] || BYE.good); if (!recent.has(l)) return l; }
  return pick(BYE[mood] || BYE.good);
}

// one customer; steps follow the order of the items (a burger is grill, then build)
function customer(ageGroup, gender, items) {
  const first = pick(NAMES[gender][ageGroup]);
  const age = Math.floor(rand(AGES[ageGroup][0], AGES[ageGroup][1] + 1));
  const steps = [], params = {};
  for (const it of items) {
    if (it.kind === 'burger') { steps.push('grill'); params.grill = { done: it.done }; steps.push('assemble'); params.assemble = { order: burgerOrder(it.size) }; }
    if (it.kind === 'fries') { steps.push('fryer'); params.fryer = { salt: it.salt }; }
    if (it.kind === 'soda') { steps.push('soda'); params.soda = { size: it.size, flavor: it.flavor }; }
    if (it.kind === 'cone') { steps.push('sundae'); params.sundae = { flavor: it.flavor }; }
  }
  const open = pick(ORDER_OPEN[ageGroup]), close = pick(ORDER_CLOSE[ageGroup]);
  // one item per sentence, so each sentence can have a recorded voice
  const its = items.map(itemText);
  const lead = /[.!?]$/.test(open) ? its[0][0].toUpperCase() + its[0].slice(1) : its[0];
  // "Can I get a burger?" is a question; "I would like a burger." is not
  const asks = /^(can|could|may)\b/i.test(open.split(/[.!?]\s+/).pop().replace(/^(uh|yeah|hi|hey|so)[, ]+/i, '').trim());
  let complaint = `${open} ${lead}${asks ? '?' : '.'}`;
  for (const t of its.slice(1)) complaint += ` And ${t}.`;
  if (close) complaint += ' ' + close;
  const remarks = shuffle([...items.flatMap(it => FOOD_REMARKS[it.kind === 'cone' ? 'cone' : it.kind] || []), ...FOOD_REMARKS.any]).slice(0, 8);
  return {
    first, name: `${first}`, ageGroup, gender, age, ageLabel: String(age), food: true,
    look: randomLook(ageGroup, gender), voice: VOICE[ageGroup] * (gender === 'f' ? 1.18 : 1) * rand(0.92, 1.08),
    steps, params, special: null, personality: 'normal', remarks,
    complaint, items, basePay: 0,
  };
}
const randItem = (kind, tier) => {
  if (kind === 'burger') return { kind, done: pick(['medium', 'medium', 'well']), size: 5 + (tier >= 3 ? 1 : 0) + (tier >= 6 ? 1 : 0) };
  if (kind === 'fries') return { kind, salt: pick([2, 3, 3, 4]) };
  if (kind === 'soda') return { kind, size: pick(SIZES), flavor: pick(DRINKS) };
  return { kind: 'cone', flavor: pick(CONES) };
};
export function generateOrderDay(day, opts = {}) {
  const n = opts.n || 5, tier = opts.tier || 0;
  const ages = shuffle(['kid', 'adult', 'teen', 'elder', 'adult', 'kid']).slice(0, n);
  const genders = shuffle(['m', 'f', 'm', 'f', 'm', 'f']).slice(0, n);
  const out = [];
  for (let i = 0; i < n; i++) {
    // early on most orders are one or two things; meals show up as you get promoted
    const r = Math.random();
    let kinds;
    if (i === 0 && day <= 1) kinds = [pick(['soda', 'fries', 'cone'])];
    else if (r < 0.35 - tier * 0.02) kinds = [pick(['burger', 'fries', 'soda', 'cone'])];
    else if (r < 0.75) kinds = shuffle(['burger', 'fries', 'soda', 'cone']).slice(0, 2);
    else kinds = ['burger', 'fries', 'soda'];
    const c = customer(ages[i], genders[i], kinds.map(k => randItem(k, tier)));
    c.basePay = 90 + day * 15 + (c.steps.length - 1) * 45;
    out.push(c);
  }
  return out;
}

export const FOOD_QUIPS = ['Read the ticket, please.', 'That station is for a different order.', 'The ticket is the paper with the words on it.', 'Manager Pat is watching. Manager Pat is always watching.', 'Wrong station. The customer is getting hangry.'];
// a single customer who needs one station (used by the test pages)
export function testOrder(step) {
  const kind = { grill: 'burger', assemble: 'burger', fryer: 'fries', soda: 'soda', sundae: 'cone' }[step] || 'soda';
  const c = customer(pick(['kid', 'adult', 'teen', 'elder']), pick(['m', 'f']), [randItem(kind, 0)]);
  c.steps = [step];
  c.basePay = 120;
  return c;
}
