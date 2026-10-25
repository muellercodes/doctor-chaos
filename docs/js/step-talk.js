// What patients say about the specific thing they came in for: before (while you pick a tool and
// get ready), after it goes well, and after it goes badly. Lines are picked by age when there is a
// list for that age, plus the "any" list.
import { pick } from './engine.js';

export const STEP_TALK = {
  shot: {
    before: {
      kid: ['Is it a big needle or a baby needle?', 'Can I squeeze your hand? Not the needle hand.', 'If I close my eyes, does it still count?', 'My friend said shots feel like a mosquito with muscles.', 'Count to three. No, count to a hundred.'],
      teen: ['Just do it fast. Do not tell me when.', "I'm not scared of needles. I'm scared of THAT needle.", 'Is this the one that makes your arm sore for two days?'],
      adult: ['I give blood all the time. Shots, though? Different story.', 'Which arm do you want? Take the left. The right one has plans.', 'I read that it helps to cough. Should I cough? I am coughing.'],
      elder: ['I have had more shots than birthdays. And that is a lot of birthdays.', 'Go ahead, dear. My arm has seen worse.', 'Is it the flu one? I like to collect those.'],
      any: ['Please tell me that is a small needle.', 'Do I need to look? I do not want to look.', 'Okay. Okay. I am ready. No I am not. Okay now I am.', 'Will it hurt more than stubbing my toe?'],
    },
    success: ['Was that it? I barely felt it!', 'My arm feels like a superhero arm now.', 'That was faster than a sneeze.', 'Wow, you have very gentle needle skills.', 'Can I have a sticker for being brave?'],
    fail: ['My arm feels like a pincushion!', 'You missed! TWICE!', 'That needle went everywhere except where it was supposed to.', 'I am never getting a shot again. Ever. Even a good one.'],
  },
  blood: {
    before: {
      kid: ['Do I have enough blood? I am pretty small.', 'Will you give my blood back after?', 'What color is my blood? Please say blue.'],
      teen: ['If I faint, please catch my phone first.', 'I am going to look at the ceiling the whole time.'],
      adult: ['I always look away. It is a whole thing.', 'Do I get the cookie after? I was promised a cookie.', 'Please find the vein on the first try. I believe in you.'],
      elder: ['My veins are hiding, dear. They are shy.', 'Good luck finding a vein. They retired years ago.'],
      any: ['How many tubes is it? Please say one.', 'Do not tell me if it looks weird.', 'I am going to think about puppies the whole time.'],
    },
    success: ['That was smooth! Where is my cookie?', 'One tube, no tears. Nice.', 'You found the vein on the first try. Impressive.', 'I did not even feel it. You are a vein wizard.'],
    fail: ['You poked me so many times I look like a connect-the-dots.', 'My vein ran away. I would have too.', 'I lost more blood on the floor than in the tube.', 'I came for a blood test, not a blood fest.'],
  },
  surgery: {
    before: {
      kid: ['Will I be asleep? Can I dream about dinosaurs?', 'Can you make my scar look like a lightning bolt?', 'Do not take out anything I need. Like my belly button.'],
      teen: ['Please make the scar look cool. Like a battle scar.', 'Can I post the X-ray after?'],
      adult: ['I signed so many forms. One of them might have been a timeshare.', 'Is this your first surgery? Do not answer.', 'Please count the sponges. Twice.'],
      elder: ['I have had my appendix out twice. Long story.', 'Wake me when it is over, dear.'],
      any: ['Is the scalpel supposed to be that shiny?', 'Do I get to keep whatever you take out?', 'Please do not sneeze during this.'],
    },
    success: ['I feel lighter! What did you take out?', 'All stitched up! I barely felt a thing.', 'That was the best surgery I have ever been asleep for.', 'You are like a tailor, but for people.'],
    fail: ['Did you leave a sponge in there? I hear squishing.', 'My stitches look like a zipper made by a raccoon.', 'I came in for a small thing. Now it is a big thing.', 'I think you took out the wrong part.'],
  },
  removal: {
    before: {
      kid: ['I promise it fell in there by accident. Mostly.', 'Please do not tell my mom how it got there.', 'Can I keep it after you get it out?'],
      teen: ['This is so embarrassing. Please do not tell anyone.', 'It was a dare. I lost the dare.'],
      adult: ['I am a grown adult. This should not have happened.', 'Do you see a lot of this? Please say yes.'],
      elder: ['In my day we used a hairpin and a prayer.', 'I have no idea how it got there. That is the honest truth.'],
      any: ['Gently. It is in there very tight.', 'Can you see it? I can feel it looking at me.', 'Please do not push it further in.'],
    },
    success: ['It is OUT! I can feel the air again!', 'Thank you! I will never put anything in there again.', 'You got it in one try. Amazing.', 'Can I have it back? For my collection.'],
    fail: ['It is still in there. I can hear it rattling.', 'You pushed it further in! Now it lives there.', 'Ow! That was the wrong spot!'],
  },
  reflex: {
    before: {
      kid: ['Do I get to kick you? Is that allowed?', 'Is that a tiny hammer for tiny nails?'],
      teen: ['If my leg kicks you, that is on you.', 'My knee is basically a spring. Watch out.'],
      adult: ['My knee has not been surprised in years.', 'I will try not to kick. No promises.'],
      elder: ['My knees have reflexes from 1962. Be patient.', 'Hit it hard, dear. My knee is hard of hearing.'],
      any: ['Why does the hammer look like a toy?', 'Should I relax? I am trying to relax. It is hard.', 'Hit the spot, not the bone.'],
    },
    success: ['Whoa! My leg did that by itself!', 'Boing! That was fun. Do it again.', 'Good reflexes! I knew I had them.'],
    fail: ['That was my shin. My SHIN.', 'You bonked everything except my knee.', 'My knee is going to remember this.'],
  },
  steth: {
    before: {
      kid: ['Can I listen too? Please? Please?', 'Is my heart loud? It feels loud.', 'Does it sound like a drum? I think it sounds like a drum.'],
      teen: ['Is that thing cold? It is cold, isn\'t it.', 'My heart is racing because you are holding that thing.'],
      adult: ['Please warm it up first. Please.', 'My heart has been through a lot. Be nice to it.'],
      elder: ['My heart is old but it shows up every day.', 'Listen close. It mumbles.'],
      any: ['Should I breathe in? Out? Both?', 'I will try to be quiet. My stomach will not.', 'Is that thing going to be cold?'],
    },
    success: ['Thump thump! Is that good? It sounded good.', 'My heart says thank you.', 'You listened so well. Nobody listens to me like that.'],
    fail: ['You were listening to my elbow the whole time.', 'My heart is fine. Your listening is not.', 'You made my heart nervous. Now it is beating weird.'],
  },
  cast: {
    before: {
      kid: ['Can it be a cool color? Like lava orange?', 'Will everyone sign it? I want EVERYONE to sign it.', 'Can I still play video games with a cast?'],
      teen: ['How long do I have to wear this? Like, in days.', 'Can you make it look tough?'],
      adult: ['I cannot believe I broke it doing THAT.', 'How am I supposed to type with a cast?'],
      elder: ['Third broken bone this year. I am collecting them.', 'Make it comfy, dear. I nap a lot.'],
      any: ['Does it go on wet or dry? I need to know.', 'Please do not wrap it too tight.', 'Is it going to itch? It is going to itch.'],
    },
    success: ['This cast is SO cool. Sign it!', 'It feels snug. In a good way.', 'I am going to decorate this thing like a cake.'],
    fail: ['This cast is so lumpy it looks like a potato.', 'You wrapped it so tight I cannot feel my fingers.', 'The cast is on the wrong arm. Wait. No. It is just bad.'],
  },
  thermo: {
    before: {
      kid: ['Is the thermometer going under my tongue? It feels weird.', 'Can it tell if I am lying about being sick?'],
      teen: ['I definitely have a fever. A school-is-tomorrow fever.', 'Please do not let me talk with it in my mouth. I will talk.'],
      adult: ['I feel like I am cooking from the inside.', 'I have been sweating and shivering. At the same time.'],
      elder: ['Back in my day we used mercury. And we liked it.', 'I am always cold. Unless I am hot.'],
      any: ['Do I have to keep my mouth shut? That is hard for me.', 'If it beeps, is that good?', 'I bet I am hotter than the sun right now.'],
    },
    success: ['So I AM sick! I knew it.', 'Now I know my number. What do I do with it?', 'Can I go home and lie on the couch now?'],
    fail: ['The thermometer fell out three times. I talked too much. Sorry.', 'You never got a reading. I am still a mystery.', 'I think it measured the room instead of me.'],
  },
  bp: {
    before: {
      kid: ['Is it going to squeeze me? Like a hug?', 'Will my arm pop? Please say no.'],
      teen: ['My blood pressure is high because of homework.', 'Do I have to sit still? For how long?'],
      adult: ['My blood pressure goes up just from being here.', 'Please do not squeeze too hard. I need this arm for work.'],
      elder: ['My doctor always says it is high. I say it is enthusiastic.', 'Squeeze away, dear. I am used to it.'],
      any: ['Is it supposed to get this tight?', 'Should I relax? Telling me to relax makes me less relaxed.', 'Pump it slow, please.'],
    },
    success: ['My numbers are good? Hooray for numbers!', 'That squeeze was perfect. Firm but fair.', 'My arm is free! And my blood pressure is fine.'],
    fail: ['You squeezed so hard my fingers turned purple.', 'You never heard the heartbeat. I was right here.', 'My arm is still tingling. Thanks a lot.'],
  },
  otoscope: {
    before: {
      kid: ['Is there a bug in my ear? I hear buzzing.', 'Can you see my brain through my ear?', 'I might have put a tiny LEGO in there. By accident. Maybe.'],
      teen: ['Please do not say there is earwax. Even if there is earwax.', 'Everything sounds like I am underwater.'],
      adult: ['My ear has been popping all week.', 'Please do not find anything gross. I will be embarrassed.'],
      elder: ['What? Oh, my ear. Yes. Look in my ear.', 'I hear a whistle. Either my ear or my hearing aid.'],
      any: ['Is the light going to be bright?', 'Do I need to tilt my head? Which way?', 'Please be gentle. My ears are delicate.'],
    },
    success: ['I can hear everything now! Even your stomach!', 'Wow, that was all in my ear?', 'My ear feels so clean it squeaks.'],
    fail: ['You poked my eardrum. It is mad now.', 'There is still stuff in there. I can hear it.', 'Now I hear a ringing. That is new.'],
  },
  drops: {
    before: {
      kid: ['I am going to blink. I am warning you now.', 'Will my eyes turn a cool color?', 'Can I keep my eyes closed? No? Ugh.'],
      teen: ['I am going to blink so much. Sorry in advance.', 'Is this going to make me look like I am crying?'],
      adult: ['I have a blinking problem. As in, I blink.', 'My eyes are so dry they sound like paper.'],
      elder: ['My eyes have seen a lot. They can handle a drop.', 'Aim carefully, dear. I wear glasses for a reason.'],
      any: ['Is it cold? It is going to be cold.', 'Do not get it on my cheek.', 'I will try not to blink. I will fail.'],
    },
    success: ['So refreshing! My eyes feel brand new.', 'I can see colors I did not know about!', 'You got both eyes! You are a sniper.'],
    fail: ['You got my nose, my cheek, and my forehead. Not my eye.', 'My face is wet and my eyes are still dry.', 'I think you put eye drops in my ear somehow.'],
  },
  bandage: {
    before: {
      kid: ['Is it going to sting? Please say no.', 'Can I pick the bandage color?', 'I fell off my bike. The bike started it.'],
      teen: ['Can you make the bandage look less dorky?', 'It is fine. It barely hurts. Okay it hurts.'],
      adult: ['I scraped it on a door. A DOOR.', 'Please do not scrub it too hard.'],
      elder: ['A little scrape. Nothing a bandage and a cookie cannot fix.', 'My skin is thin, dear. Go easy.'],
      any: ['Do you need to clean it first? That is the stinging part, right?', 'Not too much ointment. I do not want to be sticky.', 'Please put it on straight.'],
    },
    success: ['Perfect bandage. Not even crooked!', 'It does not sting anymore!', 'I am going to show everyone my bandage.'],
    fail: ['The bandage is on sideways and the scrape is still showing.', 'You scrubbed so hard it got worse.', 'I am now covered in ointment. Like a slippery seal.'],
  },
  xray: {
    before: {
      kid: ['Will I see my skeleton? Is it spooky?', 'Can you X-ray my stuffed animal too?', 'I am going to hold SO still. Watch.'],
      teen: ['If my bones look weird, do not tell me.', 'Can I get a copy for my wall?'],
      adult: ['Hold still. I can do that. I think.', 'Is the X-ray safe? Like, actually safe?'],
      elder: ['My bones are older than this machine.', 'I will hold still, dear. I am very good at holding still.'],
      any: ['Do I need to take off my jewelry?', 'Should I smile? Can bones smile?', 'Is it going to beep?'],
    },
    success: ['My skeleton looks so cool!', 'Wow. That is the inside of me.', 'Can I get the picture for my fridge?'],
    fail: ['That picture is a blur. I look like a ghost.', 'You X-rayed my elbow. It is my ankle.', 'I wiggled, sorry. But you also wiggled.'],
  },
};
// keeps each patient from repeating themselves
export function stepLine(step, kind, age, seen) {
  const t = STEP_TALK[step];
  if (!t) return null;
  let list = kind === 'before' ? [...(t.before[age] || []), ...(t.before.any || [])] : t[kind] || [];
  if (seen) { const fresh = list.filter(l => !seen.has(l)); if (fresh.length) list = fresh; }
  if (!list.length) return null;
  const l = pick(list);
  if (seen) seen.add(l);
  return l;
}
