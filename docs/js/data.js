import { pick, shuffle, randi, rand } from './engine.js';
import { OBJECT_NAMES } from './props.js';
import { pickExcuse, uniqueLine } from './excuses.js';

export const STEP_TOOL = { removal: 'tweezers', shot: 'shot', blood: 'blood', surgery: 'surgery', reflex: 'reflex', steth: 'steth', cast: 'cast', babyshot: 'shot' };
export const STEP_NOTE = {
  removal: 'Something stuck. Use the <b>tweezers</b>.',
  shot: 'Needs a shot. Use the <b>syringe</b>.',
  babyshot: 'Baby needs a vaccine. Use the <b>syringe</b>. Good luck.',
  blood: 'Needs a blood test. Use the <b>blood kit</b>.',
  surgery: 'Needs surgery. Grab the <b>scalpel</b>.',
  reflex: 'Check reflexes with the <b>reflex hammer</b>.',
  steth: 'Listen to the heart with the <b>stethoscope</b>.',
  cast: 'Broken arm. Needs a <b>cast</b>.',
};

const SKIN = ['#ffe0c4', '#f9d0b0', '#f1c27d', '#e0ac69', '#c68642', '#a0662e', '#8d5524', '#5c3a21'];
const HAIR = ['#2b1d14', '#3b2a20', '#6d4c2f', '#a0522d', '#d4a017', '#e8c170', '#1d1d1d', '#b5651d'];
const HAIR_OLD = ['#e0e0e0', '#bdbdbd', '#f5f5f5', '#9e9e9e'];
const HAIR_FUN = ['#ff5d8f', '#3ec1d3', '#9b5de5', '#06d6a0'];
const SHIRTS = ['#4ea8de', '#ff8a2a', '#06d6a0', '#ef476f', '#ffd166', '#9b5de5', '#118ab2', '#f15bb5', '#8ac926', '#ff595e', '#2ec4b6', '#e76f51'];
const PANTS = ['#3d5a80', '#264653', '#6d597a', '#2b2d42', '#7f5539', '#495057', '#5e548e'];
const SHOES = ['#1d2b36', '#ffffff', '#e63946', '#3a86ff', '#6d4c2f', '#ffbe0b'];

const NAMES = {
  m: { kid: ['Max', 'Leo', 'Noah', 'Sam', 'Jayden', 'Kai', 'Mateo', 'Ollie', 'Finn', 'Arjun', 'Ezra', 'Malik'], teen: ['Tyler', 'Marcus', 'Diego', 'Ethan', 'Jamal', 'Kenji', 'Liam', 'Omar'], adult: ['Dave', 'Raj', 'Luis', 'Gary', 'Steve', 'Brian', 'Darnell', 'Felix', 'Hank', 'Chen', 'Ivan', 'Pedro', 'Theo'], elder: ['Harold', 'Bernard', 'Walter', 'Earl', 'Frank', 'Herbert', 'Morris', 'Gus'] },
  f: { kid: ['Mia', 'Lily', 'Ella', 'Ruby', 'Aria', 'Nora', 'Zara', 'Ivy', 'Luna', 'Amara', 'Sofia', 'Hana'], teen: ['Zoe', 'Maya', 'Keisha', 'Priya', 'Ava', 'Lucia', 'Imani', 'Yuki'], adult: ['Linda', 'Brenda', 'Fatima', 'Rosa', 'Nadia', 'Grace', 'Tamara', 'Mei', 'Ines', 'Olive', 'Gloria', 'Dana'], elder: ['Gertrude', 'Mildred', 'Doris', 'Edna', 'Agnes', 'Bertha', 'Ruth', 'Pearl'] },
};
const LAST = ['Pickles', 'Bumbleton', 'McGee', 'Featherstone', 'Wigglesworth', 'Noodleman', 'Butterfield', 'Crumb', 'Okafor', 'Nguyen', 'Garcia', 'Patel', 'Kowalski', 'Johansson', 'Kim', "O'Malley", 'Rossi', 'Honeycutt', 'Sprinkle', 'Fumbleton', 'Tanaka', 'Mendez', 'Abara', 'Lindqvist', 'Haddad', 'Puddingston'];
const AGES = { kid: [6, 11], teen: [13, 17], adult: [22, 58], elder: [67, 93] };
const VOICE = { kid: 1.55, teen: 1.2, adult: 0.95, elder: 0.82 };

const EYES = ['#5a3a22', '#5a3a22', '#3b2416', '#3b2416', '#8e7240', '#4f7f4f', '#4a7ab5', '#6f8394'];
const PRINT_COLORS = ['#ffffff', '#ffd23f', '#1d2b36', '#ff5d8f', '#7fdbff'];
export function randomLook(ageGroup, gender) {
  const old = ageGroup === 'elder', kid = ageGroup === 'kid', teen = ageGroup === 'teen';
  const hairC = old ? pick(HAIR_OLD) : (teen && Math.random() < 0.2 ? pick(HAIR_FUN) : pick(HAIR));
  let style;
  if (gender === 'm') style = old ? pick(['bald', 'bald', 'short', 'buzz']) : pick(['short', 'short', 'buzz', 'spiky', 'curly', 'afro', 'slick']);
  else style = old ? pick(['bun', 'short', 'curly', 'bob']) : kid ? pick(['pigtails', 'ponytail', 'long', 'bob', 'curly', 'afro', 'bun']) : pick(['long', 'ponytail', 'bun', 'bob', 'curly', 'afro']);
  const shirtStyle = kid ? pick(['tee', 'tee', 'tee', 'hoodie']) : teen ? pick(['tee', 'tee', 'hoodie', 'hoodie', 'polo']) : old ? pick(['button', 'sweater', 'polo', 'sweater']) : pick(['tee', 'polo', 'button', 'sweater', 'hoodie']);
  const shirt = pick(SHIRTS);
  const print = (kid || teen) && shirtStyle === 'tee' && Math.random() < 0.65 ? pick(['star', 'heart', 'bolt', 'smile', 'planet', 'paw', 'dino']) : null;
  return {
    age: ageGroup, gender,
    skin: pick(SKIN),
    hair: { style, color: hairC },
    eyes: pick(EYES),
    nose: pick(kid ? ['button', 'button', 'regular'] : ['regular', 'regular', 'long', 'wide', 'button']),
    build: kid ? pick(['slim', 'avg', 'avg']) : pick(['slim', 'avg', 'avg', 'stocky', 'round']),
    tall: kid ? rand(0.96, 1.04) : rand(0.95, 1.05),
    shirt, pants: pick(PANTS), shoes: pick(SHOES),
    shirtStyle, print, printColor: pick(PRINT_COLORS.filter(c => c !== shirt)),
    sleeves: shirtStyle === 'sweater' || shirtStyle === 'hoodie' ? 'long' : shirtStyle === 'button' ? (Math.random() < 0.6 ? 'long' : 'short') : (Math.random() < 0.25 ? 'long' : 'short'),
    shorts: kid ? Math.random() < 0.5 : teen ? Math.random() < 0.2 : false,
    socks: pick(['#ffffff', '#ffffff', '#1d2b36', '#ff5d8f', '#ffd23f']),
    shoeStyle: old ? pick(['flat', 'flat', 'sneaker']) : pick(['sneaker', 'sneaker', 'boot', 'flat']),
    belt: (shirtStyle === 'button' || shirtStyle === 'polo') && !kid && Math.random() < 0.6,
    freckles: (kid || teen) && Math.random() < 0.25,
    glasses: Math.random() < (old ? 0.6 : 0.18),
    beard: gender === 'm' && (ageGroup === 'adult' || old) && Math.random() < 0.35 ? pick(['full', 'mustache']) : null,
    stripes: shirtStyle === 'tee' && !print && Math.random() < 0.18 ? [shirt, '#ffffff'] : null,
  };
}

function baseCase(ageGroup, gender) {
  const first = pick(NAMES[gender][ageGroup]);
  const last = pick(LAST);
  const age = randi(...AGES[ageGroup]);
  return {
    first, name: `${first} ${last}`, ageGroup, gender, age, ageLabel: String(age),
    look: randomLook(ageGroup, gender),
    voice: VOICE[ageGroup] * (gender === 'f' ? 1.18 : 1) * rand(0.92, 1.08),
    steps: [], params: {}, special: null, personality: 'normal', remarks: [], basePay: 100,
  };
}

// ---------- complaint templates ----------
const SMALL_OBJ = ['lego', 'marble', 'dice', 'crayon', 'dino', 'airpod', 'coin', 'button', 'jellybean'];
const BIG_OBJ = ['duck', 'remote', 'harmonica', 'chicken', 'toycar', 'spoon', 'sock'];
// Blood test lines are unchanged on purpose (Linus: "blood being drawn is fine as is").
const C = {
  blood: {
    kid: ["The doctor wants to check my blood. Is it blue inside? Jayden said it's blue inside.", "I need a blood test. Can I watch? I want to see if I'm a robot."],
    teen: ["Blood test. If I faint, make it look like I'm just resting dramatically.", "They want to check my blood. Probably just to confirm I'm 90% pizza."],
    adult: ['Routine blood test. My smartwatch says I am mostly coffee.', 'They want to check my iron levels. I think I might be part robot.'],
    elder: ["Blood test again. Take what you need. I'm 90, I've been making the stuff for ages.", "They want my blood. Again. What are they DOING with it all?"],
  },
};

export const REMARKS = {
  kid: ['Are you a real doctor or a YouTube doctor?', 'When I grow up I want to be a doctor. Or a dragon. Probably a dragon.', 'My dad says this visit costs an arm and a leg. Do you need my arm?', 'Can I have a lollipop after? Can I have TWO?', "Is it gonna hurt? Don't answer. Your face answered.", "My hamster had surgery once. He's fine. Well... he's a different hamster now.",
    'Do doctors have to go to school forever? That sounds terrible.', 'I can wiggle my ears. Wanna see? ...Okay, I can wiggle ONE ear.', 'My grandma says I have the bones of a bird. Is that bad?', 'Is that a real skeleton in the closet? Can I meet him?',
    'I ate a crayon once. The blue one. It tasted blue.', 'If I am brave, do I get a superhero name?', 'My brother said doctors steal your belly button. Is that true?', "I'm not scared. My knees are scared. I'm fine.",
    'Do you have a dog? Doctors should have dogs.', 'I know how to count to a million. Want me to start?', 'Why is the paper on the bed so crinkly?', 'My teacher says I ask too many questions. Why does she say that?'],
  teen: ['This is literally so awkward.', 'Can you make it look cooler? Like I got it in a sword fight?', "My mom's going to post about this. I just know it.", 'Do I get a sticker? ...Asking for a friend.',
    'Is there Wi-Fi in here? Asking for medical reasons.', "Don't tell my friends I was here. Or tell them I was very brave.", 'Do you have a phone charger? Mine is on 2 percent. This is an emergency too.', 'My coach says walk it off. I walked it off. It followed me.',
    'Can you write me a note so I can skip gym forever?', 'My phone says I have the flu, a broken toe and a rare frog disease.', 'Okay but like, is this going to leave a cool scar?', 'I have a test tomorrow. Can you find something wrong with me?',
    'My little brother is going to be SO jealous of this cast.', "I'm only here because my mom made me. Also because it hurts.", 'Please do not call me "buddy." I am fifteen.'],
  adult: ['Did you go to a real medical school, or one of the cheaper ones?', 'On a scale of 1 to 10, how sure are you about this?', "I wrote my will in the waiting room. You're not in it.", 'Should I be worried that the nurse is praying?', "My cousin's a doctor too. Well. He watches a lot of doctor shows.", 'Your hands are cold. Are you a vampire? ...Are you?',
    'I looked up my symptoms online. Apparently I have three days to live.', 'I have a meeting in twenty minutes. Can we speed-run this?', 'Is this covered by insurance? Do not answer that.', 'I took the day off for this. My boss thinks I am at a funeral.',
    'My kids think I am at the gym. Please do not tell them.', 'Can you also look at my back? Not medically. Just look at it. It is a weird back.', 'I brought snacks in case this takes a while. Want a pretzel?', 'Every time I come here, the magazines are older.',
    'I am usually very brave. This is the exception.', "I've been practicing my calm face. How's it look?", 'You seem young. Like, internet young.', 'The parking here costs more than the medicine.'],
  elder: ['In my day, we just rubbed dirt on it.', "I've had worse. I was alive in the '70s.", 'You look twelve. Are you twelve?', 'My last doctor retired. I think it was because of me.', "Speak up! I can't hear you over my hip.",
    'I walked here. Uphill. It was flat, but it felt uphill.', 'Back in my day doctors made house calls. On horses.', "I've outlived three doctors. Don't take it personally.", 'Is this one of those computer doctors? Are you an app?',
    'Make it quick, I left my soup on the stove. In 1987.', 'My knees predict the weather. They say it will rain on you.', 'I knit this sweater myself. It took nine years.', 'Do you know my grandson? He is also a doctor. Of computers.',
    'I am ninety percent tea at this point.', 'You kids and your fancy stethoscopes. We listened with a cup.', 'I have a coupon for this. Somewhere. In my purse. Hold on.'],
};
export const SUCCESS = {
  kid: ['That was AWESOME. Do it again! ...No, wait, don\'t.', 'Can I have a sticker now?', "I didn't even cry! Okay, I cried a LITTLE.", 'I am telling EVERYONE at school about this.', 'You are my favorite doctor. You are my only doctor. Still my favorite.', 'Wait, that was it? I was ready to be SO brave.', 'Can I keep the bandage? I want to frame it.', 'Best. Checkup. EVER.'],
  teen: ['Okay... that was actually kind of fine.', "Wait, that's it? Cool. Don't tell anyone I was scared.", 'Not gonna lie, you are kind of good at this.', 'I am rating you five stars. Out of five. Yeah.', 'That was way less bad than my mom said.', 'Cool. Can I go now? I have a thing. The thing is a nap.'],
  adult: ["Hey, that wasn't so bad!", "I didn't even feel that. Did you do it yet?", "You're better than my last doctor. He was a dentist.", 'I feel like a whole new person. A slightly sore new person.', 'I am going to leave you a very nice review. Maybe two.', 'Thank you, doctor. I take back what I said about the cheap medical school.', 'Honestly? That went better than my last haircut.'],
  elder: ['Not bad, kid. Not bad at all.', "Well, I'll be. You're a real doctor after all.", 'You have good hands. Like a piano player. Or a pickpocket.', 'I am going to tell my bridge club about you. They will be jealous.', 'That was smoother than my last three hip replacements.', 'Thank you, dear. Here, have a butterscotch.'],
};
export const FAIL = ["I'm calling my lawyer. Right after I call my mom.", 'That... was NOT great.', "I'm leaving a review. A LONG one.", 'My lawyer is going to LOVE you.', 'I feel worse than when I came in. Impressive, really.',
  'I came here to get better. I got worse. That is the opposite.', 'My grandma could have done that. My grandma is a cat.', 'I want to speak to the manager of doctors.', 'Wow. Just... wow. Not the good wow.', 'I am telling my lawyer, my mom, AND my cat.', 'Is that blood? That is blood. That is MY blood. I am suing.', 'Next time I am going to the vet. At least they give treats.'];
export const WRONG_TOOL = {
  tweezers: ['Tweezers?! What are you gonna do, pluck my eyebrows?', "I don't need tweezers. Unless you plan on picking a fight.", 'Those are for splinters. I do not have splinters. I have PROBLEMS.'],
  shot: ['Whoa whoa whoa. Put the needle DOWN.', "A needle? For THIS? Read the chart, doc!", 'If you poke me with that for no reason, I am poking you back.'],
  blood: ['You want my BLOOD? For THIS?', "No blood tests! I'm using all of it right now!", 'My blood is fine. My blood is great. Leave my blood alone.'],
  surgery: ['Why are you holding a scalpel?! PUT IT DOWN.', 'SURGERY?! I came in for something small!', 'NOPE. No cutting. I came in walking, I would like to leave walking.'],
  reflex: ['Why are you holding a tiny hammer?', 'If you bonk me with that, I bonk you back.', 'Is this a doctor visit or a game of whack-a-mole?'],
  steth: ["You're listening to my heart? It's saying 'wrong tool.'", 'My heart is fine! It\'s the OTHER thing!', 'My heart is beating very fast. Because you picked the wrong tool.'],
  cast: ["A cast? Nothing's broken! ...Yet.", "I don't need a cast. Is that a threat?", 'Wrapping me up like a burrito will NOT fix this.'],
};
export const NURSE_QUIPS = ['Doctor... maybe read the chart?', "I've seen worse. Not much worse.", 'I just work here.', 'Remember, they can sue.', 'Deep breaths. For you, not them.',
  'The chart is the clipboard. With the words on it.', 'I am going to pretend I did not see that.', 'Should I call a real doctor? Kidding. Mostly.', 'That is a bold choice, Doctor.', 'I have a lawyer on speed dial. Just saying.', 'Interesting. Wrong, but interesting.', 'Try the one that matches the problem.'];
export const IMPATIENT = {
  kid: ['Are we done yet?', 'I am SO bored. Can I play with the hammer?', 'Doctor? Hello? Are you asleep?', 'I counted the ceiling tiles. There are a LOT.'],
  teen: ['Uh... any day now.', 'I could have watched three videos by now.', 'Is this part of the treatment? The waiting?'],
  adult: ['Take your time. Not too much time.', 'I am being charged by the minute, right? I can feel it.', 'Should I come back tomorrow?'],
  elder: ['I am not getting any younger here.', 'I have had shorter naps than this.', 'Wake me up when you pick something.'],
};
export const BYE = {
  happy: ['Bye, doc! See you never! In a good way!', 'Thanks, doctor! You rock!', 'Bye! I will tell everyone you are great!', 'See ya! Not too soon, hopefully.', 'Bye, Nurse Pat! Bye, doctor!', 'Thank you! I feel amazing. Mostly.'],
  sad: ['Hmph. Goodbye.', 'I want my lollipop back. Oh wait, I never got one.', 'Bye. My lawyer will text you.', 'I am never coming back. Unless I get hurt again.', 'Well. That happened.'],
};
export const PICKLES_LINES = ["Psst. Doc. The secret code is PICKLES. Dave told me. Don't tell Dave I told you.", 'Hey, do you know the code PICKLES? Some guy named Dave keeps whispering it in the waiting room.'];

export const LAWSUIT = {
  removal: 'The {obj} is still in my {where}. I can hear it. It is laughing at me.',
  removal_hurt: 'I got zapped so many times I can now pick up radio stations.',
  shot_miss: 'Doctor missed my arm three times. Hit the table, the chair, and my dignity.',
  shot_fast: 'Shot was injected at the speed of sound. My arm is now in orbit.',
  blood_miss: 'My arm looks like a connect-the-dots puzzle.',
  blood_over: 'Doctor took enough blood to fill a smoothie cup. I would like some of it back.',
  surgery_woke: 'Woke up in the middle of surgery and made eye contact with my own stomach. It waved.',
  surgery_left: 'They left the {obj} inside me. I squeak when I sit down.',
  surgery_sloppy: 'My stitches look like a shoelace tied by a raccoon.',
  reflex: "Got bonked with a tiny hammer way too many times. Suing for 'emotional bonk damage.'",
  cast_tight: 'Cast was so tight my fingers turned the color of grape jelly.',
  cast_set: 'Doctor set my arm crooked. Now I wave goodbye whenever I say hello.',
  chase: "I was chased through the hospital by a doctor. Suing for 'cardio I did not agree to.'",
  baby: "The baby can't sue. The baby's mom CAN. The baby's mom DID.",
  steth: 'The doctor tickled me for ten minutes and called it a checkup.',
  scooter: "I escaped on a scooter and the doctor let me. Now I'm suing for my own escape. It makes sense to me.",
  triplets: "The doctor gave a shot to the WRONG triplet. Twice. Our mom is very upset. And confused.",
};
export const REVIEWS = {
  3: ['Barely felt a thing. Would get injured again.', 'Fast, friendly, and only a little terrifying.', 'Gave me a lollipop AND my dignity back.', '10/10. The doctor did not scream even once.', 'Best doctor I ever had. And I have had SEVEN this year.', 'I would let this doctor fix my car. That is a compliment.', 'Five stars. Would have given six but the chairs are lumpy.', 'My mom cried. Good tears. I think.', 'Professional, gentle, and the bandage was a nice color.'],
  2: ['It went fine. The doctor hummed scary music the whole time though.', 'Good doctor. Weird hammer.', 'Solid work. The nurse was nicer, though.', 'Pretty good! Only one tiny "oops."', 'Got the job done. Took the scenic route.', 'Decent. The waiting room has excellent magazines from 2009.', 'Would come back. Would bring a helmet.'],
  1: ['I came in with one problem. I left with two.', "I've had better. I've also had worse. Mostly better.", "The doctor said 'oops' twice. TWICE.", 'It worked, I think? I am not sure what "worked" means anymore.', 'The bandage is on my elbow. My problem was my foot.', 'One star for showing up. That is it.'],
  0: ['My lawyer will be in touch.', 'Do not recommend. My cat would have done better.', "I'm telling EVERYONE. Even my dentist.", 'I would give zero stars but the app will not let me.', 'Worst visit since the time I visited a volcano.', 'I left a review on every website. Even the weather one.'],
};
export const WELCOME_BACK = ['Nurse Pat kept your chair warm. She was sitting in it.', 'The patient waited. They read every magazine. Twice.', 'Nobody noticed you were gone. Nurse Pat noticed.', 'The waiting room clock moved. Everything else stayed exactly the same.', 'Your coffee is cold now. That is on you.', 'The next patient has been practicing their excuse.'];
export const FORECAST = ['Forecast: 100% chance of chaos.', "The hospital's insurance company sent flowers. And a warning.", 'Nurse Pat brought donuts. Either nice or a bribe.', 'The waiting room smells like fear and hand sanitizer.', 'Rumor has it someone in the waiting room is wearing a cape.', "Today's lunch special: hospital pudding. Again.",
  'The vending machine is out of everything except one sad raisin.', 'Someone left a goose in the parking lot. Not a patient. Probably.', 'The elevator music today is just one guy humming.', 'Nurse Pat is in a great mood. Nobody knows why. Everyone is nervous.', 'A kid in the waiting room is building a fort out of chairs.', 'The coffee machine made a noise like a dying robot. Coffee is canceled.',
  'Somebody stole all the good pens. Again.', 'The hospital cat is wearing a stethoscope. It is doing better than you.', 'There is a mysterious puddle in hallway B. Do not step in it.', 'The front desk phone has rung 400 times. Nobody answered it.', 'A pigeon got into the lobby and is now the most popular patient.', 'The janitor says today "feels like a sneezy one."'];

// ---------- builders ----------
function fill(t, c, step) {
  const pr = (step && c.params[step]) || {};
  const obj = pr.name || c.objName || 'thing';
  const where = pr.where || c.where || 'ear';
  return t.replace(/\{obj\}/g, obj).replace(/\{where\}/g, where);
}

// `used` is the saved Set of excuses that have already been said. Blood tests skip it.
function addStep(c, step, used) {
  c.steps.push(step);
  if (step === 'removal') {
    const o = pick(SMALL_OBJ);
    c.params.removal = { object: o, where: pick(['ear', 'nose']), name: OBJECT_NAMES[o] };
    return pickExcuse('removal', c.ageGroup, used, { obj: c.params.removal.name, where: c.params.removal.where });
  }
  if (step === 'surgery') {
    if (Math.random() < 0.45) {
      c.params.surgery = { variant: 'appendix', object: 'appendix', name: 'angry appendix' };
      return pickExcuse('appendix', c.ageGroup, used);
    }
    const o = pick(BIG_OBJ);
    c.params.surgery = { variant: 'object', object: o, name: OBJECT_NAMES[o] };
    return pickExcuse('swallowed', c.ageGroup, used, { obj: c.params.surgery.name });
  }
  if (step === 'blood') return pick(C.blood[c.ageGroup]);
  if (step === 'steth') c.params.steth = { variant: 'normal' };
  return pickExcuse(step, c.ageGroup, used);
}

export function normalPatient(ageGroup, gender, step, used = new Set()) {
  const c = baseCase(ageGroup, gender);
  c.complaint = addStep(c, step, used);
  c.remarks = REMARKS[ageGroup];
  return c;
}

// choose one of a persona's lines nobody has heard yet
const line = (kind, list, used) => uniqueLine(kind, list, used);

const PERSONALITIES = {
  vampire(used) {
    const c = baseCase('adult', 'm');
    Object.assign(c, { first: 'Vlad', name: 'Count Vlad Nightshade', age: 547, ageLabel: '547 (he says 29)', voice: 0.7, personality: 'vampire' });
    Object.assign(c.look, { skin: '#ece6f5', hair: { style: 'slick', color: '#111111' }, shirt: '#1a1a2e', pants: '#1a1a2e', shoes: '#111111', outfit: 'vampire', glasses: false, beard: null, stripes: null, sleeves: 'long', shirtStyle: 'button', print: null, belt: false, shorts: false, shoeStyle: 'boot' });
    c.steps = ['blood'];
    c.complaint = line('vampire', ['I am here for a blood test. Yes. I am aware of the irony.', 'Blood test, please. For once, I am the one giving. Do not get used to it.', 'My doctor wants a blood sample. I have plenty. Most of it is borrowed.'], used);
    c.remarks = ['Careful with that. It is vintage.', 'In my day, we did this with our teeth.', 'Do you need my ID? It is from the 1400s.', 'Mmm. Smells... no. No. Focus, Vlad.'];
    c.success = 'Hmm. Delicious work. I mean, nice work. NICE work.';
    return c;
  },
  pirate(used) {
    const c = baseCase('adult', 'm');
    Object.assign(c, { first: 'Barnaby', name: 'Captain Barnaby Saltbeard', ageLabel: String(c.age), voice: 0.78, personality: 'pirate' });
    Object.assign(c.look, { hair: { style: 'short', color: '#3b2a20' }, beard: 'full', outfit: 'pirate', stripes: ['#ffffff', '#e63946'], glasses: false, pants: '#2b2d42', shirtStyle: 'tee', print: null, shoeStyle: 'boot', shorts: false });
    c.steps = ['removal'];
    c.params.removal = { object: 'coin', where: 'ear', name: 'gold doubloon' };
    c.complaint = line('pirate', ['Arr, there be a doubloon stuck in me ear, doc. Long story. Involves a parrot.', "Ahoy! A gold coin be stuck in me ear. Me crew bet I couldn't hide treasure there. I could.", 'Arr, me parrot buried treasure in me ear while I slept. Dig it out, doc!'], used);
    c.remarks = ['Arr, careful! That be me GOOD ear!', 'If ye find any treasure in there, it be MINE.', 'Me parrot did this. Me parrot is grounded.'];
    c.success = "ARRR! Ye've done it! Here, have a doubloon. ...Not THAT one.";
    return c;
  },
  trench(used) {
    const c = baseCase('adult', 'm');
    Object.assign(c, { first: 'Greg', name: 'Totally Normal Adult Man (Greg)', ageLabel: '47 (human years)', voice: 1.45, personality: 'trench' });
    Object.assign(c.look, { tall: 1.28, outfit: 'trench', glasses: 'sun', beard: null, hair: { style: 'none', color: '#3b2a20' }, shirt: '#b08d57', pants: '#2b2d42', sleeves: 'long', skin: pick(SKIN.slice(0, 6)), stripes: null, shirtStyle: 'tee', print: null, belt: false, shorts: false, shoeStyle: 'flat', build: 'avg' });
    c.steps = ['steth'];
    c.params.steth = { variant: 'trench' };
    c.complaint = line('trench', ['Hello. I am one normal adult human. I would like one normal checkup. And possibly a lollipop.', 'Greetings, doctor. I am a tall, regular grown-up. Please check my heart. Heart. Just the one.', 'I am here for an adult checkup. I drove here in my adult car. I have a job. At the office. Of adults.'], used);
    c.remarks = ['I pay my taxes. Like adults do.', 'My favorite food is coffee. Adult coffee.', 'Please do not look directly under the coat.'];
    c.success = 'Thank you, fellow adult. We— I— will be going now.';
    return c;
  },
  mime(used) {
    const gender = pick(['m', 'f']);
    const c = baseCase('adult', gender);
    Object.assign(c, { first: 'Marcel', name: gender === 'm' ? 'Marcel the Mime' : 'Mimi the Mime', ageLabel: '???', voice: 0, personality: 'mime' });
    Object.assign(c.look, { skin: '#f7f7f7', stripes: ['#111111', '#ffffff'], outfit: 'mime', pants: '#111111', glasses: false, beard: null, sleeves: 'long', shirtStyle: 'tee', print: null, belt: false, shorts: false, shoes: '#111111', shoeStyle: 'flat' });
    c.steps = [pick(['shot', 'reflex'])];
    c.complaint = c.steps[0] === 'shot'
      ? line('mime', ['(Mimes a giant needle. Then mimes fainting. Then mimes being fine.)', '(Pretends to roll up a sleeve. Points at arm. Covers eyes.)'], used)
      : line('mime', ['(Mimes kicking a ball. Mimes a tiny hammer. Taps knee. Points at you.)', '(Mimes a knee that will not bend. Then a knee that bends way too much.)'], used);
    c.remarks = ['(Mimes being trapped in an invisible box.)', '(Mimes crying. Silently. Very dramatic.)', '(Gives you a big thumbs up. Then a smaller, worried thumbs up.)', '(Mimes calling a lawyer.)'];
    c.success = '(Mimes a standing ovation. Bows to nobody.)';
    c.fail = '(Mimes writing a VERY long angry letter.)';
    return c;
  },
  influencer(used) {
    const gender = pick(['m', 'f']);
    const c = baseCase('teen', gender);
    Object.assign(c, { first: gender === 'm' ? 'Brayden' : 'Madison', name: gender === 'm' ? 'Brayden Clout' : 'Madison Glow', personality: 'influencer' });
    c.look.outfit = 'influencer'; c.look.glasses = false;
    c.steps = ['cast'];
    c.complaint = line('influencer', ['I broke my arm doing a challenge for my channel. Can you make the cast, like, aesthetic? For content?', 'I fell off a fountain while filming an unboxing. The box is fine. Make the cast cute, please.', 'Broke my arm doing a dance trend. I was SO close to going viral. Okay, I went viral. For falling.'], used);
    c.remarks = ["Wait, do that again, I wasn't recording.", 'Say hi to my followers! All twelve of them!', 'This is going to get SO many likes. Like, at least four.'];
    c.success = 'OMG. This cast is going to break the internet. Unlike my arm. Which is already broken.';
    return c;
  },
  grandma(used) {
    const c = baseCase('elder', 'f');
    Object.assign(c, { first: 'Bertha', name: 'Grandma Bertha Butterfield', age: 88, ageLabel: '88', personality: 'grandma' });
    c.look.hair = { style: 'bun', color: '#f5f5f5' }; c.look.glasses = true;
    c.steps = ['shot'];
    c.complaint = line('grandma', ["Give me the shot, sonny. I've survived two hip replacements and a 1987 perm. Do your worst.", "Flu shot. Make it snappy, I've got bingo and a grudge match after.", "I'm here for my booster. I've been getting shots since before shots were cool."], used);
    c.remarks = ["Is that the needle? I've knitted with bigger.", 'Hurry up, my show starts at four.', 'You remind me of my grandson. He also wiggles too much.'];
    c.success = "Ha! Didn't even flinch. Here, have a hard candy. It's from 2003.";
    return c;
  },
  ticklish(used) {
    const gender = pick(['m', 'f']);
    const ag = pick(['adult', 'teen', 'adult']);
    const c = baseCase(ag, gender);
    c.steps = ['steth'];
    c.params.steth = { variant: 'ticklish' };
    c.personality = 'ticklish';
    c.complaint = line('ticklish', ['Just a checkup! Fair warning... I am EXTREMELY ticklish. Like, dangerously.', 'Heart checkup, please. Be gentle. A feather once made me laugh for an hour.', 'Checkup! Quick warning: if you tickle me, I am not responsible for what my arms do.'], used);
    c.remarks = ['Hehe— no— HAHA— stop—', "Don't you DARE wiggle that thing.", 'I once laughed so hard I fell off a boat.'];
    return c;
  },
  conspiracy(used) {
    const c = baseCase('adult', 'm');
    Object.assign(c, { first: 'Kevin', name: 'Kevin Truthseeker', personality: 'conspiracy' });
    c.look.glasses = true;
    c.steps = ['blood'];
    c.complaint = 'Blood test. But first: is that needle connected to the WiFi? Be honest.';
    c.remarks = ['Are you writing that down? Who are you sending it to?', "I knew it. I KNEW it. I don't know what I knew, but I knew it.", 'Birds are fine. I am just saying. Birds are FINE.'];
    c.success = "Hmm. That was suspiciously normal. I'll allow it.";
    return c;
  },
};
export const PERSONA_NAMES = Object.keys(PERSONALITIES);

export const SPECIAL_TYPES = ['runner', 'baby', 'sneezy', 'hider', 'scooter', 'germs', 'triplets', 'lightsout'];

function specialPatient(type, ageGroup, gender, used) {
  const ag = ageGroup;
  if (type === 'runner') {
    const c = baseCase(ag === 'elder' ? 'adult' : ag, gender);
    c.special = 'runner';
    c.steps = ['shot'];
    c.complaint = pickExcuse('runner', c.ageGroup, used);
    c.remarks = REMARKS[c.ageGroup];
    c.success = 'Okay. Okay. Sorry about the running. And the screaming.';
    return c;
  }
  if (type === 'hider') {
    const c = baseCase('kid', gender);
    c.special = 'hider';
    c.steps = ['shot'];
    c.complaint = pickExcuse('hider', 'kid', used);
    c.remarks = REMARKS.kid;
    c.success = 'Hide and seek AND a shot? Best day ever. Well... second best.';
    return c;
  }
  if (type === 'sneezy') {
    const c = baseCase(ag, gender);
    c.special = 'sneezy';
    c.steps = ['shot'];
    c.complaint = pickExcuse('sneezy', ag, used);
    c.remarks = ["Sorry! It's the pollen! Or... you? Is it you?", 'That one had my name on it. Sorry.', "It's not contagious! Probably!"];
    c.success = 'I can breathe! Through my NOSE! What a time to be alive.';
    return c;
  }
  if (type === 'scooter') {
    const c = baseCase(Math.random() < 0.7 ? 'elder' : 'adult', gender);
    c.special = 'scooter';
    c.steps = ['shot'];
    c.complaint = pickExcuse('scooter', c.ageGroup, used);
    c.remarks = REMARKS[c.ageGroup];
    c.success = 'Fine. You win. But my scooter gets a lollipop too.';
    return c;
  }
  if (type === 'germs') {
    const c = baseCase(ag, gender);
    c.special = 'germs';
    c.steps = ['shot'];
    c.complaint = pickExcuse('germs', ag, used);
    c.remarks = ['*cough* Sorry. *COUGH*', 'Is it hot in here or is that just me? It is me. I have a fever.', 'My germs say hi. Do not say hi back.'];
    c.success = 'I feel AMAZING. Those germs did not know who they were messing with.';
    return c;
  }
  if (type === 'triplets') {
    const c = baseCase('kid', gender);
    const last = c.name.split(' ')[1];
    const names = shuffle(gender === 'm' ? ['Leo', 'Max', 'Sam', 'Finn', 'Kai', 'Noah'] : ['Mia', 'Ivy', 'Ruby', 'Luna', 'Nora', 'Ella']).slice(0, 3);
    c.special = 'triplets';
    c.triplets = names;
    c.first = names[0];
    c.name = `The ${last} Triplets`;
    c.ageLabel = `${c.age} (all three)`;
    c.steps = ['shot'];
    c.complaint = pickExcuse('triplets', 'kid', used);
    c.remarks = REMARKS.kid;
    c.success = 'Okay, you got us. Can the other two still have lollipops?';
    return c;
  }
  if (type === 'lightsout') {
    const c = baseCase(ag === 'elder' ? 'teen' : ag, gender);
    c.special = 'lightsout';
    c.steps = ['shot'];
    c.complaint = pickExcuse('lightsout', c.ageGroup, used);
    c.remarks = ['Boo. ...Too early?', 'I would never prank a doctor. Twice.', 'Is it just me, or are the lights flickering?'];
    c.success = 'Best. Prank. Ever. Also, thanks for the shot, I guess.';
    return c;
  }
  if (type === 'baby') {
    const parentGender = gender;
    const c = baseCase('adult', parentGender);
    const babyG = pick(['m', 'f']);
    const babyName = pick(babyG === 'm' ? ['Theo', 'Milo', 'Otis', 'Ezra', 'Jonah'] : ['Poppy', 'Juniper', 'Wren', 'Bea', 'Clementine']);
    c.special = 'baby';
    c.parent = { first: c.first, title: parentGender === 'm' ? 'Dad' : 'Mom', look: c.look };
    c.babyName = babyName; c.babyGender = babyG;
    c.name = `Baby ${babyName} ${c.name.split(' ')[1]}`;
    c.first = babyName;
    c.age = randi(6, 14); c.ageLabel = `${c.age} months`;
    c.baby = { skin: c.look.skin, shirt: pick(['#ffd6e0', '#bde0fe', '#caffbf', '#fdffb6', '#ffc6ff']), hair: Math.random() < 0.5 ? { style: 'bonnet', color: pick(['#ffffff', '#ffd6e0', '#bde0fe']) } : { style: 'curl', color: c.look.hair.color } };
    c.steps = ['babyshot'];
    const pr = babyG === 'm' ? 'He' : 'She';
    c.complaint = pickExcuse('baby', 'adult', used, { Pr: pr, pr: pr.toLowerCase(), his: babyG === 'm' ? 'his' : 'her' });
    c.parentRemarks = [`${pr} gets the crying from ${parentGender === 'm' ? 'me' : (babyG === 'm' ? 'his' : 'her') + ' dad'}.`, 'Try the silly face! No, the OTHER silly face.', 'Do you have kids? You will find out.', `Last week ${pr.toLowerCase()} cried for an hour because a banana broke.`];
    c.success = `${babyName} didn't even notice! You're a wizard. A medical wizard.`;
    c.voice = 1.9;
    return c;
  }
  return null;
}

export const personaPatient = (name, used = new Set()) => (PERSONALITIES[name] ? PERSONALITIES[name](used) : null);
export const testSpecialPatient = (type, used = new Set()) => specialPatient(type, pick(['kid', 'teen', 'adult', 'elder']), pick(['m', 'f']), used);

// ---------- day generation ----------
const ALL_STEPS = ['removal', 'shot', 'blood', 'surgery', 'reflex', 'steth', 'cast'];

// opts.used: Set of excuses already said (saved between days and updated here)
// opts.special: which special mini-game patient comes today (or null)
// opts.persona: which funny character visits today (or null)
export function generateDay(day, opts = {}) {
  const used = opts.used || new Set();
  const ages = shuffle(['kid', 'adult', pick(['teen', 'elder']), pick(['kid', 'adult', 'elder']), pick(['adult', 'teen', 'kid'])]);
  const genders = shuffle(['m', 'f', 'm', 'f', pick(['m', 'f'])]);
  const slots = [null, null, null, null, null];
  const free = shuffle([1, 2, 3, 4]);
  if (opts.special) slots[free.pop()] = { type: 'special', s: opts.special };
  if (opts.persona) slots[free.pop()] = { type: 'persona', p: opts.persona };
  const steps = shuffle(ALL_STEPS);
  const out = [];
  let si = 0;
  for (let i = 0; i < 5; i++) {
    const slot = slots[i];
    const ag = ages[i], g = genders[i];
    let c;
    if (slot && slot.type === 'special') c = specialPatient(slot.s, ag, g, used);
    else if (slot && slot.type === 'persona') c = PERSONALITIES[slot.p](used);
    else {
      let st = steps[si++ % steps.length];
      if (day === 1 && i === 0) st = pick(['removal', 'shot', 'cast']);
      c = normalPatient(ag, g, st, used);
      if (day >= 3 && Math.random() < 0.3) {
        const extra = pick(ALL_STEPS.filter(x => x !== st && x !== 'surgery'));
        const more = addStep(c, extra, used);
        c.complaint += ' ' + more.replace(/^I /, 'Also, I ').replace(/^My /, 'Also, my ');
      }
    }
    c.basePay = 90 + day * 15 + (c.steps.length - 1) * 60 + (c.special ? 40 : 0);
    out.push(c);
  }
  return out;
}

export function tutorialPatient() {
  const c = baseCase('adult', 'm');
  Object.assign(c, { first: 'Dave', name: 'Dave Pickles', age: 34, ageLabel: '34', voice: 0.95 });
  Object.assign(c.look, { skin: '#f1c27d', hair: { style: 'short', color: '#6d4c2f' }, shirt: '#ff8a2a', pants: '#3d5a80', glasses: false, beard: 'mustache', stripes: null, shirtStyle: 'tee', print: null, eyes: '#5a3a22', nose: 'regular', build: 'avg', tall: 1, belt: false, shorts: false, sleeves: 'short', shoeStyle: 'sneaker' });
  c.steps = ['shot', 'removal'];
  c.params.removal = { object: 'marble', where: 'ear', name: 'marble' };
  c.complaint = "Hey doc. I stepped on a rusty nail, so I need a tetanus shot. Also, unrelated, there's a marble in my ear.";
  c.remarks = ['Is this your first day? You look like it is your first day.', "Don't worry, I'm very brave. *whimpers*"];
  c.success = "Wow, both problems fixed! You're hired. Wait, you already work here.";
  c.basePay = 120;
  return c;
}

export function lawsuitText(reason, c, step) {
  const t = LAWSUIT[reason] || LAWSUIT.removal;
  return fill(t, c, step);
}
