// Every injury excuse in the game. Each one is tagged with the ages that can say it:
// k = kid, t = teen, a = adult, e = elder. Patients never repeat an excuse (see pickExcuse).
// Blood tests are left out on purpose: those keep their original lines in data.js.

export const EXCUSES = {
  removal: [
    'kt|I wanted to see if a {obj} fits in my {where}. Good news: it does.',
    "kt|My brother bet me I couldn't fit a {obj} in my {where}. I won. Now I need help.",
    "k|There's a {obj} in my {where}. I didn't put it there. (I put it there.)",
    "t|Okay so there's a {obj} in my {where} and I need this fixed before anyone at school finds out.",
    't|I was trying a life hack. The life hack put a {obj} in my {where}.',
    'a|I have a {obj} stuck in my {where}. My kid dared me. I am a grown adult. I took the dare.',
    'ta|I sneezed, and somehow a {obj} ended up IN my {where}. Science cannot explain it.',
    'e|I put my {obj} somewhere safe. Turns out it was my {where}.',
    "e|There's a {obj} in my {where}. Been there since 1987. I'd like it back now.",
    'k|I was playing hide and seek with a {obj}. It hid in my {where}. It is winning.',
    "k|My little sister put a {obj} in my {where} while I was asleep. I'm telling Mom.",
    'kt|I tried to make my {where} a secret hiding spot for my {obj}. Turns out it is TOO secret.',
    'a|I fell asleep on the couch and the dog sat on me. Now there is a {obj} in my {where}. Do not ask me how.',
    'ta|I was cleaning my {where} with a {obj}. Looking back, that was the wrong tool.',
    'kt|We were doing a magic trick. The {obj} was supposed to come OUT of my {where}.',
    "e|My grandson said there's a {obj} in my {where}. I said that's ridiculous. He was right. Don't tell him.",
    'k|I was pretending to be a piggy bank. With a {obj}. In my {where}.',
    'a|I had too much stuff in my hands, so I put the {obj} in my... you know what, it is in my {where}.',
    't|My friend threw a {obj} and I tried to catch it with my {where}. I caught it.',
    'kta|I took a nap on the floor of the craft room. I woke up with a {obj} in my {where}.',
    "e|Sometimes I hear a little rattle in my {where}. Pretty sure it's a {obj}. Or my brain.",
    'k|I wanted my {where} to have a pet. So I gave it a {obj}.',
    "a|At trivia night, the question was 'can a {obj} fit in your {where}?' I went for the bonus points.",
    'kt|We played a game called "What Fits?" Turns out a {obj} fits in my {where}.',
    'a|I built some furniture and had one {obj} left over. I found where it goes. My {where}.',
    'e|I dropped a {obj} in my soup, ate the soup, and now it is in my {where}. The body is a mystery.',
    'kt|I tried to whistle through my {where}. I thought a {obj} would help. It did not help.',
    "a|My smart speaker said 'put the {obj} in the box.' I misheard. Badly.",
    'k|A {obj} fell off the top bunk. My {where} was right under it. What are the odds?',
    't|I balanced a {obj} on my face for a video. It fell into my {where}. Then the video ended.',
    'e|I looked for my {obj} for three whole days. Found it. My {where}. Mystery solved.',
    'ae|I snored so loud a {obj} got sucked into my {where}. My family thinks they know who did it.',
  ],
  shot: [
    "k|Mom says I need a shot. Mom also once said broccoli was 'tree candy,' so I don't trust anyone here.",
    "k|I'm getting my school shots. I'm not scared. YOU'RE scared. ...Is it a big needle?",
    't|I need my booster shot. Can you make it quick? My group chat is on fire right now.',
    't|Shot time. If I pass out, tell everyone I got hurt doing something cool.',
    "a|I'm going on a trip and they said I need a shot. ONE shot. Right? ...Right?",
    "e|Flu shot, please. I've outlived three doctors. No pressure.",
    "e|Give me the shot. I once fought a goose in 1974. I'm not afraid of a needle.",
    'ka|A raccoon licked me. I think it was being friendly. The nurse says I still need a shot.',
    'ta|I got scratched by a stray cat I tried to rescue. The cat did not want to be rescued.',
    'kt|I stepped on an old rusty bike pedal. My dad said "that is a shot." I thought he meant basketball.',
    'a|My job requires a flu shot. My job also requires me to pretend I like Mondays.',
    "t|I'm going to summer camp and they need proof I got my shots. Also proof I can swim. One problem at a time.",
    'kte|It is flu season and I would like to NOT get the flu. That is the whole plan.',
    "a|I cut my hand on a rusty gate while chasing my neighbor's chickens. Long story. The chickens won.",
    "k|I'm here for my shot. I brought my lucky sock for courage.",
    'e|My doctor says I need a pneumonia shot. I say I need a nap. We compromised. I am here.',
    'a|I got bitten by a very small, very angry squirrel. I am not going to explain further.',
    "t|I need a shot for my trip to my cousin's farm. Apparently the goats there are \"a lot.\"",
    'k|The school nurse sent a note home. It said "SHOTS" in really big letters. So here I am.',
    'ae|I stepped on a nail in my garage. I keep telling that nail to move. It never listens.',
    "e|I'm getting my shingles shot. Not the roof kind. I asked.",
    't|My team needs everybody vaccinated before the tournament. I am the goalie. I block things. Not needles, though.',
    'a|I am traveling somewhere with a LOT of mosquitoes. I need a shot. And probably a bigger hat.',
    "kt|A neighbor's hamster bit me. The hamster is fine. Everyone keeps asking about the hamster.",
    'e|Booster shot, please. I want to be boosted. Like a rocket.',
    'a|I scraped my arm on an old metal slide at the park. I was not supposed to be on the slide. I am a grown-up.',
    'k|I need my shot so I can get a sticker. The shot is just the price of the sticker.',
    "t|Allergy shot. I'm allergic to cats, which is bad, because my mom just adopted six.",
    'ae|My doctor says I am "due." I am due for a vacation. Instead I got a shot. Typical.',
    'kt|I got a splinter from an old fence. Grandma says that means a shot. Grandma is VERY dramatic.',
  ],
  appendix: [
    "k|My tummy hurts on the right side. Like, REALLY hurts. Like it's mad at me.",
    't|Bad pain on my right side. I googled it. Google says I have 47 diseases.',
    'a|Sharp pain on my right side. I think my appendix is starting a rebellion.',
    "e|My appendix has been grumbling since the '80s. Today it's yelling.",
    'kt|My belly hurts so bad I could not even finish my pizza. That NEVER happens.',
    'a|Something on my right side is poking me from the inside. Rude.',
    'ae|My stomach only hurts on one side. Just the one side. It is picking favorites.',
    'k|My belly button hurt and then the hurt moved to the side. Is pain allowed to MOVE?',
    't|The right side of my stomach is killing me. Not in a good way. Is there a good way?',
    'a|I have a pain in my side that feels like a tiny goblin with a fork.',
    'e|My belly hurts on the right. My left side is fine, thank you for asking.',
    'kt|I woke up with my tummy screaming. Not out loud. Okay, a little out loud.',
    'a|The pain in my right side is so bad I cancelled bowling. I never cancel bowling.',
    "te|It hurts when I laugh. And when I don't laugh. And when I think about laughing.",
    "k|My appendix is angry. I don't even know what an appendix is, but it is DEFINITELY angry.",
    'a|My right side hurts like I swallowed a cactus. I did not swallow a cactus. I checked.',
  ],
  swallowed: [
    'k|I swallowed my {obj}. It was an accident. Mostly.',
    'k|I swallowed a whole {obj}. Now my belly makes noises.',
    't|So I may have swallowed a {obj}. Long story. It involves a video challenge.',
    'a|I swallowed a {obj} on a bet. I won the bet. I lost the {obj}.',
    'a|My belly squeaks when I walk. Might be the {obj} I swallowed at the office party.',
    'e|I swallowed a {obj}. At my age, you stop asking questions.',
    'kt|My friend said I could not eat a {obj}. I proved him wrong. I regret proving him wrong.',
    'k|I was being a snake. Snakes swallow things whole. So I swallowed a {obj}.',
    'a|I was sleep-eating again. This time I sleep-ate a {obj}.',
    'e|I thought the {obj} was a dinner roll. My glasses were in the other room.',
    't|I was trying to set a world record for biggest {obj} ever swallowed. I think I set it.',
    'k|My dog was going to eat my {obj}, so I ate it first. To protect it.',
    'a|I was hungry and the {obj} looked delicious. It was not delicious.',
    'kt|I was laughing really hard and then the {obj} was gone. And I was the only one near it.',
    'e|My grandkids hid a {obj} in my pudding. I found it. Well, my stomach found it.',
    'a|I swallowed a {obj} during a magic show. I was not the magician. I was the audience.',
    'k|I wanted to know what a {obj} tastes like. Answer: plastic. Also now it lives in me.',
    "t|My little brother dared me to swallow a {obj}. I'm the older one. I should know better.",
    'ae|I ate too fast at a buffet. Somehow there was a {obj} in the buffet. I have questions for the buffet.',
    'k|I swallowed my {obj} so nobody could take it from me. Now nobody can take it. Including me.',
    'a|Every time I hiccup, my belly goes "honk." I think that is the {obj}.',
    "t|I tried to fit a {obj} in my mouth for a photo. The photo turned out great. The {obj} didn't come back.",
    'e|I swallowed a {obj} in 1962 and it is only now starting to bother me.',
    'kt|My cousin and I played "Hungry Hungry Humans." I won. I ate a {obj}.',
  ],
  reflex: [
    'k|Sports physical for soccer! Coach says I need my reflexes checked.',
    'k|School checkup! I have super fast reflexes. Watch. ...Okay, I missed it.',
    "t|School sports physical. Please don't make it weird.",
    "a|Yearly checkup. I'm begging you, don't use the little hammer. ...You're going to use the hammer.",
    'e|My knees make a noise like popcorn. Just check em.',
    'kt|I need a checkup before I can join the basketball team. I am short, but I am FAST.',
    'a|My legs keep falling asleep. Both of them. At the same time. During meetings.',
    'e|My knee only bends on Tuesdays. Today is not Tuesday.',
    'k|I kicked my teacher by accident when she tapped my knee. She said "go see a doctor." So, hi.',
    't|I want to try out for track. Coach says first I need to make sure my legs are "legal."',
    'a|I keep tripping over nothing. My family says it is my reflexes. I say the floor is out to get me.',
    'e|I want to start dancing again. My legs said "let us check with a doctor first."',
    'kt|My foot does a weird little kick every time I sneeze. Is that a superpower?',
    'a|New job, new checkup. They want to know if my legs work. I mostly sit. But they work.',
    'k|I am going to be a karate black belt someday. I need my kicks checked.',
    'te|My leg twitches like it is dancing to music I cannot hear.',
    'a|I play in a soccer league for grown-ups. Everyone is very slow. I want to stay that way. Fast, I mean.',
    'e|My doctor says to check my reflexes. My reflexes say "what?"',
    'k|My friend says a doctor can make your leg kick all by itself. I need to see this.',
    't|Physical for the ski team. If my knee does not kick, does that mean I am a robot?',
    'a|I played the floor-is-lava game with my kids. Now my legs feel... spicy.',
    'e|My bowling team needs me. Check my knees, quick. We have a tournament at four.',
  ],
  steth: [
    'k|My heart goes BOOM BOOM really fast when I play video games. Is that normal?',
    't|My heart feels fluttery. Could be stress. Could be the three energy drinks.',
    "a|My heart's been doing a drum solo lately.",
    "e|Checkup. Just make sure the old ticker's still ticking.",
    'k|I can hear my heart in my ears at night. It keeps me awake. It is SO loud.',
    'kt|I ran the mile in gym class and my heart is STILL going fast. That was yesterday.',
    'a|My smartwatch keeps telling me to "breathe." I AM breathing. Check please.',
    'e|My heart skips a beat when I see my old high school crush at bingo. Is that medical?',
    'a|I took the stairs instead of the elevator. Once. My heart has not forgiven me.',
    't|I need a heart check before marching band. The tuba is VERY heavy.',
    'k|My heart beats faster when I see a spider. Is my heart scared of spiders too?',
    'ae|I have a cough that sounds like a goose. My family wants it checked. Mostly so it stops.',
    'kt|I think I have hiccups in my heart. Is that a thing? Please say no.',
    'a|My breathing has been kind of squeaky. Like a dog toy. Not ideal.',
    'e|Annual checkup. I want to make sure everything still works before my cruise.',
    'k|My chest feels tickly when I laugh too hard. I laugh too hard a LOT.',
    't|My heart is beating in Morse code. I think it is trying to tell me something.',
    'a|I just want someone to listen to me. My heart, I mean. Listen to my heart.',
    'e|I hear a whistle when I breathe. Either my lungs or my hearing aid. One of them is playing music.',
    'kt|We had a fitness test at school and now my heart feels like a hamster on a wheel.',
    'a|A jump scare in a movie got me and my heart still feels weird. It was a cartoon.',
    'e|My heart races when the TV remote goes missing. Which is always.',
  ],
  cast: [
    'k|I tried to skateboard down the stairs. The stairs won.',
    'k|I fell off the monkey bars. The monkey bars are fine.',
    't|Broke my arm trying to backflip off the couch. The couch is also broken.',
    'a|I fell off a trampoline. Onto another trampoline. Then onto the ground.',
    "a|I broke my arm arm-wrestling my grandma. She's fine. She's still undefeated.",
    'e|Broke my wrist doing a cartwheel at my birthday party. Totally worth it.',
    'kt|I tried to ride my bike with no hands. Then with no bike.',
    'k|We were playing the floor is lava. I touched the lava. The lava was the coffee table.',
    'a|I slipped on a banana peel. I did not think that actually happened to people. It does.',
    'e|I tripped over my cat. Then my cat tripped over me. We are both upset.',
    't|I punched a punching bag wrong. The punching bag won. It does not even have arms.',
    'k|I jumped off the swing at the highest point. I flew like a bird. I landed like a potato.',
    'a|I tried to carry all the groceries in one trip. I made it. My arm did not.',
    'e|I fell off a ladder hanging holiday lights. In July. Do not ask.',
    'kt|I did a cannonball into the pool. The pool was still being filled.',
    'a|I fell down the stairs at work. I told everyone I meant to. Nobody believes me.',
    'k|I wrestled my big brother. I lost. My arm lost harder.',
    't|I was skateboarding and a squirrel ran in front of me. The squirrel is fine. I am not.',
    'e|I chased the ice cream truck. I caught it. Then it kept going.',
    'a|I tried to fix the roof myself. The roof and I are no longer speaking.',
    'kt|I was showing my friends how to do the worm. My arm did the worm. Then it broke.',
    'k|I fell out of a tree rescuing a cat. The cat climbed down by itself. Show-off.',
    'a|Pickleball accident. That is all I am going to say.',
    'e|Water aerobics got out of hand. Agnes is very competitive.',
    't|I got hit by a dodgeball so hard I flew into the bleachers. We won, though.',
    'k|I tried to jump over my little sister. She stood up.',
    'a|I dropped my phone and tried to catch it. I caught it with my wrist. The phone is fine.',
    'ae|I slipped on the ice getting the mail. It was all bills, too.',
    'kt|I raced my friend on scooters. I won. The finish line was a mailbox.',
    'k|I fell off my bunk bed in my sleep. I woke up on the floor and my arm felt like spaghetti.',
    'e|I tried one of those electric scooters. Turns out they go fast. VERY fast.',
    'a|I did a handstand at the beach to impress people. Nobody was impressed. Especially my arm.',
    't|I tried parkour off the bleachers. My parkour needs work.',
    'k|I was a superhero in the backyard. I can not actually fly. I checked.',
    "a|I was doing yoga. The video said 'downward dog.' My arm said 'downward everything.'",
    "e|I tried to break-dance at my grandson's wedding. I broke something, alright.",
  ],
  // ---------- special patients ----------
  runner: [
    "ktae|I'm here for a shot. I'm totally fine with needles. Totally. Completely. 100%.",
    'ktae|Shot day! I am SO calm about it. Look how calm I am. Very calm. Extremely calm.',
    "tae|I need a shot. Needles don't scare me. I just like to know where the exits are. For no reason.",
    'ktae|Quick question before we start: where is the nearest door? Just curious. Unrelated.',
    "tae|I'm here for my booster. I did my stretches this morning. Not for running. Just... stretches.",
    'ktae|Shots are no big deal. I wore my running shoes today. Totally random choice.',
    "tae|I'm fine. Totally fine. Is that a needle in your pocket? No? Okay. Good. Fine.",
    'tae|Tetanus shot, please. I am a brave person. Brave people do not run. Usually.',
    "ktae|I'm here for a flu shot. My legs are a little twitchy today. Ignore them.",
    'kt|I am NOT scared of shots. My mom made me promise not to run this time. I promised. Mostly.',
    "tae|Shot time. To be honest, the last doctor had to chase me. But that was a different me.",
    "ktae|Let's do this shot. Real quick. Like a race. Wait, no, not a race. Forget I said race.",
  ],
  hider: [
    "k|I need a shot? ...Hey, what's that behind you?",
    "k|I'm ready for my shot! Close your eyes and count to ten first. It's a doctor rule.",
    'k|Shots are okay. Hide and seek is better. Just saying.',
    "k|Can we play a game before the shot? It's called 'Find Me.' You're it.",
    'k|I am NOT here for a shot. I am here to... look at your room. Nice room. Lots of hiding spots.',
    "k|My shot? Sure! Hold on, I dropped something. Over there. Far away. Don't look.",
    "k|I'm very good at hiding. Like, REALLY good. That's not important right now. Or is it?",
    'k|Is that a needle? I think I hear my mom calling me. From inside a cabinet.',
    "k|I'm brave! Brave kids get a head start, right?",
    'k|Before the shot, can I check if your trash can is comfy? For science.',
  ],
  sneezy: [
    "ktae|I need my allergy shot. I'm allergic to pollen, dust, cats, and... ah... AH... hospitals.",
    'ktae|Allergy shot, please. I sneezed so hard this morning I set off a car alarm.',
    'ktae|I need an allergy shot. My nose has been running more than me. And I run a lot.',
    'ktae|My allergies are SO bad this week. I sneezed and my dog filed a complaint.',
    'ktae|Allergy shot. Fair warning: I sneeze in sets of six. Like a fireworks show.',
    "ktae|I'm allergic to grass, trees, flowers, and the color green. Shot, please.",
    'ktae|I need my allergy shot before I sneeze my glasses into another state.',
    'ktae|My sneezes have sneezes. Allergy shot, please. Ah... ah...',
    "kt|I'm allergic to spring. And summer. And sometimes my brother.",
    "ae|Allergy shot, please. Everybody at work calls me 'Bless You.' That is not my name.",
  ],
  baby: [
    'a|{Pr} needs {his} vaccine. Fair warning: {pr} bit the last doctor.',
    "a|{Pr}'s due for shots. {Pr} only stops crying for the vacuum cleaner.",
    "a|Vaccine day! {Pr}'s teething. And plotting something.",
    'a|Shot time for this little monster. {Pr} cried at a cloud yesterday. A CLOUD.',
    'a|{Pr} needs {his} shots. {Pr} has strong opinions about doctors. And socks. And everything.',
    'a|We are here for vaccines. Last time {pr} screamed so loud the fire alarm got jealous.',
    "a|{Pr} needs a shot. {Pr} is very sweet. Until {pr} isn't. Good luck.",
    'a|Baby vaccines today. {Pr} only likes three things: peekaboo, rattles, and chaos.',
    "a|{Pr}'s due for {his} shot. Don't make eye contact too long. {Pr} takes it as a challenge.",
    'a|Time for {his} vaccine. {Pr} has been awake since 4 AM, so {pr} is in a mood.',
    "a|{Pr} needs {his} shot. I brought snacks. They're for me.",
    "a|Vaccine visit! {Pr} learned to scream in a new pitch this week. You'll hear it.",
  ],
  scooter: [
    "ae|Flu shot, please. And no funny business. I've got a scooter and I'm not afraid to use it.",
    "ae|I'm here for my shot. Parked my scooter right outside. Fully charged. Just so you know.",
    "ae|Shot time? Sure. My scooter goes eight miles an hour, by the way. That's just a fun fact.",
    'ae|I need my booster. I hate needles so much I bought a scooter just to escape them.',
    "ae|My doctor says I need a shot. My scooter says 'we ride at dawn.'",
    'ae|Give me the shot and nobody gets run over. Kidding. Mostly.',
    "ae|I borrowed a scooter from the lobby. It's a long story. It's also not mine.",
    'ae|Booster shot, please. Is that your parking spot by the door? I may need it later.',
  ],
  germs: [
    'ktae|I have the worst cold of my life. My nose is a faucet and my germs are throwing a party.',
    'ktae|I am SO sick. The germs in me have names now. One is called Kevin.',
    'ktae|I have a cold so bad, even my cold has a cold.',
    'ktae|I feel like a swamp. A sneezy, coughy swamp. Fix me.',
    'ktae|My germs are winning. I can hear them cheering.',
    'kt|I caught a cold from my little brother. He caught it from a doorknob. The doorknob is fine.',
    'ktae|My throat feels like sandpaper and my nose sounds like a trumpet.',
    "ktae|I'm so stuffed up I can only smell the color gray.",
    "tae|The germs have taken over. I'm just driving this body now.",
    'ktae|I have been sick for a week. My tissues ran out. My sleeves have not.',
  ],
  triplets: [
    "k|One of us needs a shot. Guess which one! (It's not me. Or is it?)",
    "k|We're triplets! Only ONE of us is sick. We'll never tell which.",
    'k|Our mom says one of us needs a shot. We all dressed the same today. On purpose.',
    'k|We are here for a shot. One shot. For one of us. Good luck, doctor!',
    "k|Triplet power! You'll never guess who's sick. We practiced switching places for a week.",
    "k|Our teacher can't tell us apart either. One of us has a fever. Good luck.",
    'k|Only one of us needs medicine. The other two just came for the lollipops.',
    "k|Pick the right triplet, or you'll give a shot to a healthy kid! No pressure!",
  ],
  lightsout: [
    'kta|I need my shot. Hey, is that the light switch? Interesting. Very interesting.',
    "kta|Shot day. Fun fact: I'm really good at pranks. Like, REALLY good.",
    'kta|I am here for my booster. Did you know this hospital has a fuse box? I did.',
    'kta|I need a shot. Also, do you believe in ghosts? You will.',
    'kta|Shot, please. Are you afraid of the dark? No reason. Just asking.',
    'kta|My booster shot. I brought a flashlight. Not for me. For you.',
    "kta|Ready for my shot! By the way, I've been practicing my ghost noises. Woooooo.",
    'kta|Here for a shot. My friends dared me to pull the biggest prank in hospital history.',
  ],
};

// Extra endings, only used if a player ever runs out of fresh excuses for a procedure.
const TAILS = [
  'This is my second time this week.', 'My mom says this one does not count.', 'Please do not put this in my file.',
  'I would like to speak to the manager of my body.', 'My cat saw the whole thing.', 'I have already made a video about it.',
  'I am never doing that again. Probably.', 'My lawyer says I should not say more.', 'I blame Mondays.',
  'The internet said it would be fine.', 'Everyone at school knows already.', 'It seemed like a good idea at 2 AM.',
  'My grandma is never going to let me forget this.', 'I have learned nothing.', 'Do not tell my dentist.',
  'In my defense, it looked easy on TV.', 'This is the plot of a movie I watched.', 'I was very confident at the time.',
  'Ten out of ten, would not recommend.', 'My dog is very disappointed in me.',
];

const AGE_LETTER = { kid: 'k', teen: 't', adult: 'a', elder: 'e' };

function fillVars(text, vars) {
  return text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

// Picks an excuse nobody has used yet. `used` is a Set of excuse keys and is updated.
export function pickExcuse(kind, ageGroup, used, vars = {}) {
  const pool = EXCUSES[kind] || [];
  const letter = AGE_LETTER[ageGroup] || 'a';
  const parse = line => { const i = line.indexOf('|'); return { ages: line.slice(0, i), text: line.slice(i + 1) }; };
  const all = pool.map(parse);
  const key = t => kind + ':' + t;
  let options = all.filter(x => x.ages.includes(letter) && !used.has(key(x.text)));
  if (!options.length) options = all.filter(x => !used.has(key(x.text)));
  if (options.length) {
    const ch = options[Math.floor(Math.random() * options.length)];
    used.add(key(ch.text));
    return fillVars(ch.text, vars);
  }
  // every excuse has been used: combine one with an ending that has never been used with it
  const combos = [];
  for (const x of all) for (const t of TAILS) { const k = key(x.text + ' ' + t); if (!used.has(k)) combos.push({ text: x.text + ' ' + t, k, fits: x.ages.includes(letter) }); }
  const fit = combos.filter(cb => cb.fits);
  const list = fit.length ? fit : combos;
  if (!list.length) { const x = all[Math.floor(Math.random() * all.length)]; return fillVars(x.text, vars); }
  const ch = list[Math.floor(Math.random() * list.length)];
  used.add(ch.k);
  return fillVars(ch.text, vars);
}

// Same idea for fixed lists of lines (the funny characters): never repeat a line exactly.
export function uniqueLine(kind, list, used) {
  const key = t => kind + ':' + t;
  const fresh = list.filter(t => !used.has(key(t)));
  if (fresh.length) { const t = fresh[Math.floor(Math.random() * fresh.length)]; used.add(key(t)); return t; }
  const combos = [];
  for (const t of list) for (const tail of TAILS) if (!used.has(key(t + ' ' + tail))) combos.push(t + ' ' + tail);
  const t = combos.length ? combos[Math.floor(Math.random() * combos.length)] : list[0];
  used.add(key(t));
  return t;
}

export function excuseCount(kind) { return (EXCUSES[kind] || []).length; }
