import { pick, shuffle, randi, rand } from './engine.js';
import { OBJECT_NAMES } from './props.js';

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

export function randomLook(ageGroup, gender) {
  const old = ageGroup === 'elder';
  const hairC = old ? pick(HAIR_OLD) : (ageGroup === 'teen' && Math.random() < 0.2 ? pick(HAIR_FUN) : pick(HAIR));
  let style;
  if (gender === 'm') style = old ? pick(['bald', 'bald', 'short', 'buzz']) : pick(['short', 'short', 'buzz', 'spiky', 'curly', 'afro']);
  else style = old ? pick(['bun', 'short', 'curly', 'bob']) : ageGroup === 'kid' ? pick(['pigtails', 'ponytail', 'long', 'bob', 'curly', 'afro', 'bun']) : pick(['long', 'ponytail', 'bun', 'bob', 'curly', 'afro']);
  return {
    age: ageGroup, gender,
    skin: pick(SKIN),
    hair: { style, color: hairC },
    shirt: pick(SHIRTS), pants: pick(PANTS), shoes: pick(SHOES),
    sleeves: Math.random() < 0.4 ? 'long' : 'short',
    shorts: ageGroup === 'kid' && Math.random() < 0.5,
    glasses: Math.random() < (old ? 0.6 : 0.18),
    beard: gender === 'm' && (ageGroup === 'adult' || old) && Math.random() < 0.35 ? pick(['full', 'mustache']) : null,
    stripes: Math.random() < 0.12 ? [pick(SHIRTS), '#ffffff'] : null,
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
const C = {
  removal: {
    kid: ['I wanted to see if a {obj} fits in my {where}. Good news: it does.', "My brother said I couldn't fit a {obj} in my {where}. I proved him wrong. Now I need help.", "There's a {obj} in my {where}. I didn't put it there. (I put it there.)"],
    teen: ["Okay so there's a {obj} in my {where} and I need this fixed before anyone at school finds out.", 'I was trying a life hack. The life hack put a {obj} in my {where}.'],
    adult: ['I have a {obj} stuck in my {where}. My kid dared me. I am a grown adult. I took the dare.', 'I sneezed, and somehow a {obj} ended up IN my {where}. Science cannot explain it.'],
    elder: ['I put my {obj} somewhere safe. Turns out it was my {where}.', "There's a {obj} in my {where}. Been there since 1987. I'd like it back now."],
  },
  shot: {
    kid: ["Mom says I need a shot. Mom also once said broccoli was 'tree candy,' so I don't trust anyone here.", "I'm getting my school shots. I'm not scared. YOU'RE scared. ...Is it a big needle?"],
    teen: ['I need my booster shot. Can you make it quick? My group chat is on fire right now.', 'Shot time. If I pass out, tell everyone I got hurt doing something cool.'],
    adult: ['I stepped on a rusty nail. In my defense, the nail started it.', "I'm going on a trip and they said I need a shot. ONE shot. Right? ...Right?"],
    elder: ["Flu shot, please. I've outlived three doctors. No pressure.", "Give me the shot. I once fought a goose in 1974. I'm not afraid of a needle."],
  },
  blood: {
    kid: ["The doctor wants to check my blood. Is it blue inside? Jayden said it's blue inside.", "I need a blood test. Can I watch? I want to see if I'm a robot."],
    teen: ["Blood test. If I faint, make it look like I'm just resting dramatically.", "They want to check my blood. Probably just to confirm I'm 90% pizza."],
    adult: ['Routine blood test. My smartwatch says I am mostly coffee.', 'They want to check my iron levels. I think I might be part robot.'],
    elder: ["Blood test again. Take what you need. I'm 90, I've been making the stuff for ages.", "They want my blood. Again. What are they DOING with it all?"],
  },
  appendix: {
    kid: ["My tummy hurts on the right side. Like, REALLY hurts. Like it's mad at me."],
    teen: ['Bad pain on my right side. I googled it. Google says I have 47 diseases.'],
    adult: ['Sharp pain on my right side. I think my appendix is starting a rebellion.'],
    elder: ["My appendix has been grumbling since the '80s. Today it's yelling."],
  },
  swallowed: {
    kid: ['I swallowed my {obj}. It was an accident. Mostly.', 'I swallowed a whole {obj}. Now my belly makes noises.'],
    teen: ['So I may have swallowed a {obj}. Long story. It involves a video challenge.'],
    adult: ['I swallowed a {obj} on a bet. I won the bet. I lost the {obj}.', 'My belly squeaks when I walk. Might be the {obj} I swallowed at the office party.'],
    elder: ['I swallowed a {obj}. At my age, you stop asking questions.'],
  },
  reflex: {
    kid: ['Sports physical for soccer! Coach says I need my reflexes checked.', 'School checkup! I have super fast reflexes. Watch. ...Okay, I missed it.'],
    teen: ["School sports physical. Please don't make it weird."],
    adult: ["Yearly checkup. I'm begging you, don't use the little hammer. ...You're going to use the hammer."],
    elder: ['My knees make a noise like popcorn. Just check em.'],
  },
  steth: {
    kid: ['My heart goes BOOM BOOM really fast when I play video games. Is that normal?'],
    teen: ['My heart feels fluttery. Could be stress. Could be the three energy drinks.'],
    adult: ["My heart's been doing a drum solo lately."],
    elder: ["Checkup. Just make sure the old ticker's still ticking."],
  },
  cast: {
    kid: ['I tried to skateboard down the stairs. The stairs won.', 'I fell off the monkey bars. The monkey bars are fine.'],
    teen: ['Broke my arm trying to backflip off the couch. The couch is also broken.'],
    adult: ['I fell off a trampoline. Onto another trampoline. Then onto the ground.', "I broke my arm arm-wrestling my grandma. She's fine. She's still undefeated."],
    elder: ['Broke my wrist doing a cartwheel at my 80th birthday. Totally worth it.'],
  },
};

export const REMARKS = {
  kid: ['Are you a real doctor or a YouTube doctor?', 'When I grow up I want to be a doctor. Or a dragon. Probably a dragon.', 'My dad says this visit costs an arm and a leg. Do you need my arm?', 'Can I have a lollipop after? Can I have TWO?', "Is it gonna hurt? Don't answer. Your face answered.", "My hamster had surgery once. He's fine. Well... he's a different hamster now."],
  teen: ['This is literally so awkward.', 'Can you make it look cooler? Like I got it in a sword fight?', "My mom's going to post about this. I just know it.", 'Do I get a sticker? ...Asking for a friend.'],
  adult: ['Did you go to a real medical school, or one of the cheaper ones?', 'On a scale of 1 to 10, how sure are you about this?', "I wrote my will in the waiting room. You're not in it.", 'Should I be worried that the nurse is praying?', "My cousin's a doctor too. Well. He watches a lot of doctor shows.", 'Your hands are cold. Are you a vampire? ...Are you?'],
  elder: ['In my day, we just rubbed dirt on it.', "I've had worse. I was alive in the '70s.", 'You look twelve. Are you twelve?', 'My last doctor retired. I think it was because of me.', "Speak up! I can't hear you over my hip."],
};
export const SUCCESS = {
  kid: ['That was AWESOME. Do it again! ...No, wait, don\'t.', 'Can I have a sticker now?', "I didn't even cry! Okay, I cried a LITTLE."],
  teen: ['Okay... that was actually kind of fine.', "Wait, that's it? Cool. Don't tell anyone I was scared."],
  adult: ["Hey, that wasn't so bad!", "I didn't even feel that. Did you do it yet?", "You're better than my last doctor. He was a dentist."],
  elder: ['Not bad, kid. Not bad at all.', "Well, I'll be. You're a real doctor after all."],
};
export const FAIL = ["I'm calling my lawyer. Right after I call my mom.", 'That... was NOT great.', "I'm leaving a review. A LONG one.", 'My lawyer is going to LOVE you.', 'I feel worse than when I came in. Impressive, really.'];
export const WRONG_TOOL = {
  tweezers: ['Tweezers?! What are you gonna do, pluck my eyebrows?', "I don't need tweezers. Unless you plan on picking a fight."],
  shot: ['Whoa whoa whoa. Put the needle DOWN.', "A needle? For THIS? Read the chart, doc!"],
  blood: ['You want my BLOOD? For THIS?', "No blood tests! I'm using all of it right now!"],
  surgery: ['Why are you holding a scalpel?! PUT IT DOWN.', 'SURGERY?! I came in for something small!'],
  reflex: ['Why are you holding a tiny hammer?', 'If you bonk me with that, I bonk you back.'],
  steth: ["You're listening to my heart? It's saying 'wrong tool.'", 'My heart is fine! It\'s the OTHER thing!'],
  cast: ["A cast? Nothing's broken! ...Yet.", "I don't need a cast. Is that a threat?"],
};
export const NURSE_QUIPS = ['Doctor... maybe read the chart?', "I've seen worse. Not much worse.", 'I just work here.', 'Remember, they can sue.', 'Deep breaths. For you, not them.'];

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
};
export const REVIEWS = {
  3: ['Barely felt a thing. Would get injured again.', 'Fast, friendly, and only a little terrifying.', 'Gave me a lollipop AND my dignity back.', '10/10. The doctor did not scream even once.', 'Best doctor I ever had. And I have had SEVEN this year.'],
  2: ['It went fine. The doctor hummed scary music the whole time though.', 'Good doctor. Weird hammer.', 'Solid work. The nurse was nicer, though.', 'Pretty good! Only one tiny "oops."'],
  1: ['I came in with one problem. I left with two.', "I've had better. I've also had worse. Mostly better.", "The doctor said 'oops' twice. TWICE."],
  0: ['My lawyer will be in touch.', 'Do not recommend. My cat would have done better.', "I'm telling EVERYONE. Even my dentist."],
};
export const FORECAST = ['Forecast: 100% chance of chaos.', "The hospital's insurance company sent flowers. And a warning.", 'Nurse Pat brought donuts. Either nice or a bribe.', 'The waiting room smells like fear and hand sanitizer.', 'Rumor has it someone in the waiting room is wearing a cape.', "Today's lunch special: hospital pudding. Again."];

// ---------- builders ----------
function fill(t, c, step) {
  const pr = (step && c.params[step]) || {};
  const obj = pr.name || c.objName || 'thing';
  const where = pr.where || c.where || 'ear';
  return t.replace(/\{obj\}/g, obj).replace(/\{where\}/g, where);
}

function addStep(c, step) {
  c.steps.push(step);
  if (step === 'removal') {
    const o = pick(SMALL_OBJ);
    c.params.removal = { object: o, where: pick(['ear', 'nose']), name: OBJECT_NAMES[o] };
    return fill(pick(C.removal[c.ageGroup]), c, 'removal');
  }
  if (step === 'surgery') {
    if (Math.random() < 0.45) {
      c.params.surgery = { variant: 'appendix', object: 'appendix', name: 'angry appendix' };
      return pick(C.appendix[c.ageGroup]);
    }
    const o = pick(BIG_OBJ);
    c.params.surgery = { variant: 'object', object: o, name: OBJECT_NAMES[o] };
    return fill(pick(C.swallowed[c.ageGroup]), c, 'surgery');
  }
  if (step === 'steth') c.params.steth = { variant: 'normal' };
  return pick(C[step][c.ageGroup]);
}

export function normalPatient(ageGroup, gender, step) {
  const c = baseCase(ageGroup, gender);
  c.complaint = addStep(c, step);
  c.remarks = REMARKS[ageGroup];
  return c;
}

const PERSONALITIES = {
  vampire() {
    const c = baseCase('adult', 'm');
    Object.assign(c, { first: 'Vlad', name: 'Count Vlad Nightshade', age: 547, ageLabel: '547 (he says 29)', voice: 0.7, personality: 'vampire' });
    Object.assign(c.look, { skin: '#ece6f5', hair: { style: 'slick', color: '#111111' }, shirt: '#1a1a2e', pants: '#1a1a2e', shoes: '#111111', outfit: 'vampire', glasses: false, beard: null, stripes: null, sleeves: 'long' });
    c.steps = ['blood'];
    c.complaint = 'I am here for a blood test. Yes. I am aware of the irony.';
    c.remarks = ['Careful with that. It is vintage.', 'In my day, we did this with our teeth.', 'Do you need my ID? It is from the 1400s.', 'Mmm. Smells... no. No. Focus, Vlad.'];
    c.success = 'Hmm. Delicious work. I mean, nice work. NICE work.';
    return c;
  },
  pirate() {
    const c = baseCase('adult', 'm');
    Object.assign(c, { first: 'Barnaby', name: 'Captain Barnaby Saltbeard', ageLabel: String(c.age), voice: 0.78, personality: 'pirate' });
    Object.assign(c.look, { hair: { style: 'short', color: '#3b2a20' }, beard: 'full', outfit: 'pirate', stripes: ['#ffffff', '#e63946'], glasses: false, pants: '#2b2d42' });
    c.steps = ['removal'];
    c.params.removal = { object: 'coin', where: 'ear', name: 'gold doubloon' };
    c.complaint = "Arr, there be a doubloon stuck in me ear, doc. Long story. Involves a parrot.";
    c.remarks = ["Arr, careful! That be me GOOD ear!", "If ye find any treasure in there, it be MINE.", 'Me parrot did this. Me parrot is grounded.'];
    c.success = "ARRR! Ye've done it! Here, have a doubloon. ...Not THAT one.";
    return c;
  },
  trench() {
    const c = baseCase('adult', 'm');
    Object.assign(c, { first: 'Greg', name: 'Totally Normal Adult Man (Greg)', ageLabel: '47 (human years)', voice: 1.45, personality: 'trench' });
    Object.assign(c.look, { tall: 1.28, outfit: 'trench', glasses: 'sun', beard: null, hair: { style: 'none', color: '#3b2a20' }, shirt: '#b08d57', pants: '#2b2d42', sleeves: 'long', skin: pick(SKIN.slice(0, 6)), stripes: null });
    c.steps = ['steth'];
    c.params.steth = { variant: 'trench' };
    c.complaint = 'Hello. I am one normal adult human. I would like one normal checkup. And possibly a lollipop.';
    c.remarks = ['I pay my taxes. Like adults do.', 'My favorite food is coffee. Adult coffee.', 'Please do not look directly under the coat.'];
    c.success = 'Thank you, fellow adult. We— I— will be going now.';
    return c;
  },
  mime() {
    const gender = pick(['m', 'f']);
    const c = baseCase('adult', gender);
    Object.assign(c, { first: 'Marcel', name: gender === 'm' ? 'Marcel the Mime' : 'Mimi the Mime', ageLabel: '???', voice: 0, personality: 'mime' });
    Object.assign(c.look, { skin: '#f7f7f7', stripes: ['#111111', '#ffffff'], outfit: 'mime', pants: '#111111', glasses: false, beard: null, sleeves: 'long' });
    c.steps = [pick(['shot', 'reflex'])];
    c.complaint = c.steps[0] === 'shot' ? '(Mimes a giant needle. Then mimes fainting. Then mimes being fine.)' : '(Mimes kicking a ball. Mimes a tiny hammer. Taps knee. Points at you.)';
    c.remarks = ['(Mimes being trapped in an invisible box.)', '(Mimes crying. Silently. Very dramatic.)', '(Gives you a big thumbs up. Then a smaller, worried thumbs up.)', '(Mimes calling a lawyer.)'];
    c.success = '(Mimes a standing ovation. Bows to nobody.)';
    c.fail = '(Mimes writing a VERY long angry letter.)';
    return c;
  },
  influencer() {
    const gender = pick(['m', 'f']);
    const c = baseCase('teen', gender);
    Object.assign(c, { first: gender === 'm' ? 'Brayden' : 'Madison', name: gender === 'm' ? 'Brayden Clout' : 'Madison Glow', personality: 'influencer' });
    c.look.outfit = 'influencer'; c.look.glasses = false;
    c.steps = ['cast'];
    c.complaint = 'I broke my arm doing a challenge for my channel. Can you make the cast, like, aesthetic? For content?';
    c.remarks = ["Wait, do that again, I wasn't recording.", 'Say hi to my followers! All twelve of them!', "This is going to get SO many likes. Like, at least four."];
    c.success = 'OMG. This cast is going to break the internet. Unlike my arm. Which is already broken.';
    return c;
  },
  grandma() {
    const c = baseCase('elder', 'f');
    Object.assign(c, { first: 'Bertha', name: 'Grandma Bertha Butterfield', age: 88, ageLabel: '88', personality: 'grandma' });
    c.look.hair = { style: 'bun', color: '#f5f5f5' }; c.look.glasses = true;
    c.steps = ['shot'];
    c.complaint = "Give me the shot, sonny. I've survived two hip replacements and a 1987 perm. Do your worst.";
    c.remarks = ["Is that the needle? I've knitted with bigger.", 'Hurry up, my show starts at four.', 'You remind me of my grandson. He also wiggles too much.'];
    c.success = "Ha! Didn't even flinch. Here, have a hard candy. It's from 2003.";
    return c;
  },
  ticklish() {
    const gender = pick(['m', 'f']);
    const ag = pick(['adult', 'teen', 'adult']);
    const c = normalPatient(ag, gender, 'steth');
    c.params.steth = { variant: 'ticklish' };
    c.personality = 'ticklish';
    c.complaint = "Just a checkup! Fair warning... I am EXTREMELY ticklish. Like, dangerously.";
    c.remarks = ['Hehe— no— HAHA— stop—', "Don't you DARE wiggle that thing.", 'I once laughed so hard I fell off a boat.'];
    return c;
  },
  conspiracy() {
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

function specialPatient(type, ageGroup, gender) {
  if (type === 'runner') {
    const c = baseCase(ageGroup, gender);
    c.special = 'runner';
    c.steps = [pick(['shot', 'shot', 'blood'])];
    c.complaint = c.steps[0] === 'shot' ? "I'm here for a shot. I'm totally fine with needles. Totally. Completely. 100%." : "Blood test! Love those. No problem. Needles don't scare me AT ALL.";
    c.remarks = REMARKS[ageGroup];
    c.success = 'Okay. Okay. Sorry about the running. And the screaming.';
    return c;
  }
  if (type === 'hider') {
    const c = baseCase('kid', gender);
    c.special = 'hider';
    c.steps = ['shot'];
    c.complaint = "I need a shot? ...Hey, what's that behind you?";
    c.remarks = REMARKS.kid;
    c.success = "Hide and seek AND a shot? Best day ever. Well... second best.";
    return c;
  }
  if (type === 'sneezy') {
    const c = baseCase(ageGroup, gender);
    c.special = 'sneezy';
    c.steps = ['shot'];
    c.complaint = "I need my allergy shot. I'm allergic to pollen, dust, cats, and... ah... AH... hospitals.";
    c.remarks = ["Sorry! It's the pollen! Or... you? Is it you?", 'That one had my name on it. Sorry.', "It's not contagious! Probably!"];
    c.success = 'I can breathe! Through my NOSE! What a time to be alive.';
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
    c.complaint = pick([`${pr} needs ${babyG === 'm' ? 'his' : 'her'} vaccine. Fair warning: ${pr.toLowerCase()} bit the last doctor.`, `${pr}'s due for shots. ${pr} only stops crying for the vacuum cleaner.`, `Vaccine day! ${pr}'s teething. And plotting something.`]);
    c.parentRemarks = [`${pr} gets the crying from ${parentGender === 'm' ? 'me' : (babyG === 'm' ? 'his' : 'her') + ' dad'}.`, 'Try the silly face! No, the OTHER silly face.', 'Do you have kids? You will find out.', `Last week ${pr.toLowerCase()} cried for an hour because a banana broke.`];
    c.success = `${babyName} didn't even notice! You're a wizard. A medical wizard.`;
    c.voice = 1.9;
    return c;
  }
  return null;
}

export const personaPatient = name => (PERSONALITIES[name] ? PERSONALITIES[name]() : null);

// ---------- day generation ----------
const ALL_STEPS = ['removal', 'shot', 'blood', 'surgery', 'reflex', 'steth', 'cast'];

export function generateDay(day) {
  const ages = shuffle(['kid', 'adult', pick(['teen', 'elder']), pick(['kid', 'adult', 'elder']), pick(['adult', 'teen', 'kid'])]);
  let genders = shuffle(['m', 'f', 'm', 'f', pick(['m', 'f'])]);
  const specialsPool = ['runner', 'baby', 'sneezy', 'hider'];
  let specials;
  if (day === 1) specials = ['runner'];
  else if (day === 2) specials = shuffle(['baby', 'hider', 'sneezy']).slice(0, 2);
  else specials = shuffle(specialsPool).slice(0, day >= 4 ? (Math.random() < 0.5 ? 3 : 2) : 2);
  const personas = shuffle(Object.keys(PERSONALITIES));
  const nPersona = day === 1 ? 1 : (Math.random() < 0.5 ? 2 : 1);
  const steps = shuffle(ALL_STEPS);
  const slots = [];
  for (let i = 0; i < 5; i++) slots.push(null);
  // place specials in the middle-ish, personalities elsewhere
  const order = day === 1 ? [2, 4, 1, 3, 0] : shuffle([1, 2, 3, 4, 0]);
  let oi = 0;
  for (const s of specials) slots[order[oi++]] = { type: 'special', s };
  for (let k = 0; k < nPersona && oi < 5; k++) slots[order[oi++]] = { type: 'persona', p: personas[k] };
  // day 1: first patient is always a plain one
  if (day === 1 && slots[0]) { const t = slots[0]; slots[0] = null; const free = slots.findIndex((x, i) => i > 0 && !x); if (free >= 0) slots[free] = t; }
  const out = [];
  let si = 0;
  for (let i = 0; i < 5; i++) {
    const slot = slots[i];
    const ag = ages[i], g = genders[i];
    let c;
    if (slot && slot.type === 'special') c = specialPatient(slot.s, ag === 'elder' && slot.s === 'runner' ? 'adult' : ag, g);
    else if (slot && slot.type === 'persona') c = PERSONALITIES[slot.p]();
    else {
      let st = steps[si++ % steps.length];
      if (day === 1 && i === 0) st = pick(['removal', 'shot', 'cast']);
      c = normalPatient(ag, g, st);
      if (day >= 3 && Math.random() < 0.3) {
        const extra = pick(ALL_STEPS.filter(x => x !== st && x !== 'surgery'));
        const more = addStep(c, extra);
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
  Object.assign(c.look, { skin: '#f1c27d', hair: { style: 'short', color: '#6d4c2f' }, shirt: '#ff8a2a', pants: '#3d5a80', glasses: false, beard: 'mustache', stripes: null });
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
