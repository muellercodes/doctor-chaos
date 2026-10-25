// The career ladder: 20 hospital departments with 5 ranks each (100 jobs), then fast food.
// Every rank has its own four upgrades. Each one fills one of four "slots" that do the same kind of
// thing in every department: steady hands, legal help, speed, and keeping patients happy.
// Upgrades from earlier ranks are not lost: every promotion leaves a permanent bonus behind.

export const TIERS = ['Intern', 'Resident', 'Doctor', 'Head', 'Chief'];
const SLOT_DESC = [
  'Bigger targets and steadier hands.',
  'Lawsuits cost less.',
  'Run faster when patients try to escape.',
  'Calmer babies, happier patients, bigger tips.',
];
const FOOD_DESC = [
  'Wider "just right" zones in the kitchen.',
  'Refunds cost less.',
  'Run faster when customers dash off.',
  'Happier customers and bigger tips.',
];
const SLOT_ICONS = [['hand', 'stethoscope', 'magnifier', 'wrench', 'sparkle'], ['briefcase', 'scales', 'scroll', 'shield', 'book'], ['shoe', 'runner', 'wheelchair', 'wind', 'boom'], ['lollipop', 'jar', 'gift', 'heart', 'note', 'star']];

// steps: tools this department sees more often; ages: patients it sees more often
export const DEPTS = [
  { name: 'Family Medicine', steps: {}, items: [
    ['Steady Hands', 'Warm Hands', 'Clean Gloves', 'Careful Fingers', 'Hands of Gold'],
    ['Lawyer on Speed Dial', 'Polite Apology Cards', 'Waiver Clipboard', 'Very Fine Print', 'Legal Eagle'],
    ['Running Shoes', 'Squeaky Sneakers', 'Hallway Roller Skates', 'Turbo Crocs', 'Lightning Laces'],
    ['Lollipop Jar', 'Sticker Book', 'Fish Tank', 'Comfy Gowns', 'Free Hugs Sign']] },
  { name: 'Pediatrics', ages: { kid: 3 }, steps: { shot: 2, thermo: 2 }, items: [
    ['Tiny Tweezers', 'Teddy Bear Gloves', 'Gentle Giant Hands', 'Lullaby Fingers', 'Magic Hands'],
    ['Crayon Contracts', 'Pinky Promise', 'Juice Box Deals', 'Permission Slips', 'Kid Court Judge'],
    ['Light-Up Sneakers', 'Scooter Pass', 'Hopscotch Training', 'Jungle Gym Legs', 'Rocket Shoes'],
    ['Bubble Machine', 'Cartoon TV', 'Sticker Mountain', 'Puppy Visits', 'Ice Cream Machine']] },
  { name: 'Emergency Room', steps: { bandage: 2, cast: 2, xray: 2 }, items: [
    ['Trauma Gloves', 'Laser Focus', 'Rock-Steady Coffee', 'Adrenaline Grip', 'Lightning Reflexes'],
    ['ER Lawyer', 'Liability Shield', 'Siren Excuse', 'Emergency Loophole', 'Courtroom Ambulance'],
    ['Gurney Wheels', 'Ambulance Shoes', 'Hallway Drift', 'Code Blue Sprint', 'Helicopter Pass'],
    ['Warm Blankets', 'Calm Voice', 'Snack Cart', 'Waiting Room Games', 'VIP Lounge']] },
  { name: 'Orthopedics', steps: { cast: 3, xray: 2, reflex: 2 }, items: [
    ['Plaster Pro Gloves', 'Cast Wrapping Wrist', 'Bone Setter Grip', 'Spine Straightener', 'Titanium Fingers'],
    ['Bone-Dry Contracts', 'Break-Proof Waivers', 'Skeleton Key Lawyer', 'Fracture Fine Print', 'Iron-Clad Defense'],
    ['Crutch Racing', 'Knee Brace Boost', 'Spring Ankles', 'Pogo Stick', 'Bionic Legs'],
    ['Cast Markers', 'Sign-My-Cast Party', 'Comfy Slings', 'Massage Chair', 'Hot Tub']] },
  { name: 'Cardiology', steps: { steth: 3, bp: 3 }, items: [
    ['Pulse Reader', 'Stethoscope Ears', 'Steady Heartbeat', 'EKG Fingers', 'Heart of Gold'],
    ['Heartfelt Apology', 'Cardiac Contract', 'Pacemaker Paperwork', 'Big-Hearted Lawyer', 'Heart-Shaped Loophole'],
    ['Treadmill Training', 'Cardio Kicks', 'Marathon Legs', 'Racing Heart', 'Heart Rate Turbo'],
    ['Calm Music', 'Heart Balloons', 'Valentine Cards', 'Chocolate Box', 'Love Letter Wall']] },
  { name: 'Ear, Nose and Throat', steps: { otoscope: 3, removal: 2 }, items: [
    ['Precision Cotton Swabs', 'Nose Tweezers', 'Throat Mirror', 'Ear Light Pro', 'Super Sniffer'],
    ['Earplug Defense', 'Whisper Lawyer', 'Echo Chamber Contracts', 'Mute Button', 'Loudest Lawyer'],
    ['Sneeze Propulsion', 'Tissue Toss', 'Gargle Gallop', 'Honk Horn Shoes', 'Sonic Boom Boots'],
    ['Throat Lozenges', 'Cozy Earmuffs', 'Humming Choir', 'Popsicle Freezer', 'Karaoke Room']] },
  { name: 'Eye Clinic', steps: { drops: 3 }, items: [
    ['Eagle Eye Gloves', 'Steady Dropper', 'Contact Lens Fingers', 'Laser Pointer', 'X-Ray Vision'],
    ['Fine Print Magnifier', 'Blind Spot Lawyer', 'Eye Chart Contracts', '20/20 Defense', 'Watchful Lawyer'],
    ['Fast Focus Shoes', 'Peripheral Sprint', 'Glasses Wipers', 'Eyeball Rollers', 'Blink Speed'],
    ['Fancy Frames', 'Free Sunglasses', 'Pirate Patches', 'Googly Eyes', '3D Movie Night']] },
  { name: 'Radiology', steps: { xray: 3 }, items: [
    ['Lead Apron Gloves', 'Glow Hands', 'Film Flipper', 'Bone Finder', 'Steady Snapshot'],
    ['X-Ray Proof Lawyer', 'Shadow Contracts', 'Radiant Defense', 'See-Through Waivers', 'Glowing Loophole'],
    ['Light Lead Boots', 'Darkroom Dash', 'Flash Feet', 'Beam Runner', 'Photon Sneakers'],
    ['Skeleton Stickers', 'Glow Sticks', 'Bone Puzzles', 'Spooky Light Show', 'Free Fridge Photos']] },
  { name: 'Dermatology', steps: { bandage: 3, removal: 2 }, items: [
    ['Splinter Pickers', 'Itch Scratchers', 'Gentle Peel', 'Freckle Counter', 'Silk Gloves'],
    ['Thick Skin', 'Sunscreen Contracts', 'Rash Decision Insurance', 'Scratch-and-Sniff Waivers', 'Smooth Talker'],
    ['Slippery Lotion Shoes', 'Sunburn Sprint', 'Bubble Bath Slides', 'Moisturized Momentum', 'Banana Peel Skates'],
    ['Aloe Bar', 'Bubble Bath', 'Fancy Lotions', 'Spa Day', 'Cucumber Eye Masks']] },
  { name: 'Neurology', steps: { reflex: 3, xray: 1 }, items: [
    ['Brainy Fingers', 'Nerves of Steel', 'Reflex Ruler', 'Mind Reader Gloves', 'Big Brain Hands'],
    ['Brain Trust', 'Smarty Pants Lawyer', 'Neuron Network', 'Forgetful Witness', 'Genius Defense'],
    ['Quick Thinking', 'Lightning Nerves', 'Brain Waves', 'Speed Reading', 'Teleport Thoughts'],
    ['Puzzle Corner', 'Brain Freeze Slushies', 'Thinking Caps', 'Daydream Pillows', 'Head Massage']] },
  { name: 'Germ Ward', steps: { shot: 3, thermo: 2 }, items: [
    ['Germ-Proof Gloves', 'Sanitizer Fountain', 'Antibiotic Aim', 'Microscope Eyes', 'Clean Freak Hands'],
    ['Germ-Free Contracts', 'Quarantine Lawyer', 'Hand-Washing Proof', 'Sneeze Guard Defense', 'Immune Lawyer'],
    ['Run From Germs', 'Sanitizer Slide', 'Mask Sprint', 'Bubble Suit', 'Germ Blaster Jetpack'],
    ['Tissue Towers', 'Chicken Soup', 'Fuzzy Socks', 'Hot Cocoa', 'Get Well Balloons']] },
  { name: 'Blood Bank', steps: { blood: 4 }, items: [
    ['Vein Finder', 'Steady Needle', 'Butterfly Needles', 'Vampire Gloves', 'Golden Needle'],
    ['Blood Oath', 'Blood Type Lawyer', 'Bloodhound Defense', 'Red Tape', 'Blue-Blooded Lawyer'],
    ['Bat Wings', 'Pumping Legs', 'Rapid Refill', 'Circulation Shoes', 'Red Cell Racers'],
    ['Cookies and Juice', 'Bandage Collection', 'Brave Badges', 'Vampire Capes', 'Blood Drive Party']] },
  { name: 'Sports Medicine', steps: { cast: 2, bandage: 2, bp: 2 }, ages: { teen: 3 }, items: [
    ['Tape Wrapper', 'Ice Pack Hands', 'Whistle Fingers', 'Coach Grip', 'MVP Hands'],
    ['Team Lawyer', 'Referee Review', 'Penalty Waiver', 'Instant Replay', 'Hall of Fame Defense'],
    ['Cleats', 'Sprint Spikes', 'Training Montage', 'Olympic Legs', 'Gold Medal Shoes'],
    ['Sports Drinks', 'Foam Fingers', 'Trophy Shelf', 'Mascot Visits', 'Halftime Show']] },
  { name: 'Surgery', steps: { surgery: 4 }, items: [
    ['Scalpel Steady', 'Stitch Master', 'Sterile Gloves', 'Robot Arms', "Surgeon's Touch"],
    ['Surgical Waiver', 'Second Opinion', 'Stitch-Proof Contract', 'Operating Lawyer', 'Malpractice Shield'],
    ['Scrub-In Speed', 'Operating Room Skates', 'Gurney Turbo', 'Recovery Room Rocket', 'Zero-Gravity Gurney'],
    ['Count-Backwards Game', 'Cozy Recovery Beds', 'Pudding Cups', 'Balloon Bouquets', 'Surgery Selfies']] },
  { name: 'Geriatrics', ages: { elder: 4 }, steps: { bp: 2, steth: 2 }, items: [
    ['Gentle Grip', 'Reading Glasses', 'Hearing Aid Helper', 'Bingo Dauber Fingers', 'Wise Old Hands'],
    ['Grandkid Lawyer', 'Back-in-My-Day Defense', 'Retired Judge Friend', 'Dentures Contract', 'Very Old Laws'],
    ['Mobility Scooter', 'Walker Wheels', 'Speedy Slippers', 'Rocket Rocking Chair', 'Shuffleboard Slide'],
    ['Bingo Night', 'Butterscotch Candy', 'Crossword Books', 'Knitting Circle', 'Old Movies']] },
  { name: 'Sleep Clinic', steps: { thermo: 2, bp: 2, steth: 2 }, items: [
    ['Sleepy Fingers', 'Pillow Gloves', 'Snore Stopper', 'Dream Catcher', 'Sandman Touch'],
    ['Sleep-On-It Lawyer', 'Pajama Party Contract', 'Dreamy Defense', 'Nap Clause', 'Counting Sheep Lawyer'],
    ['Sleepwalking Speed', 'Slipper Skates', 'Pillow Fight Training', 'Midnight Dash', 'Dream Jumper'],
    ['Night Lights', 'Bedtime Stories', 'Warm Milk', 'Weighted Blankets', 'Lullaby Choir']] },
  { name: 'Space Medicine', special: true, items: [
    ['Astronaut Gloves', 'Laser Scalpel', 'Gravity Grip', 'Star Map Fingers', 'Cosmic Hands'],
    ['Space Lawyer', 'Galactic Treaty', 'Alien Witness', 'Black Hole Loophole', 'Intergalactic Court'],
    ['Moon Boots', 'Jet Pack', 'Rocket Skates', 'Warp Drive', 'Light Speed'],
    ['Astronaut Ice Cream', 'Star Projector', 'Zero-G Naps', 'Alien Plushies', 'Planet Tour']] },
  { name: 'Underwater Hospital', special: true, items: [
    ['Flipper Gloves', 'Coral Tweezers', 'Octopus Arms', 'Pearl Diver Fingers', 'Mermaid Touch'],
    ['Shark Lawyer', 'Sea Turtle Judge', 'Treasure Map Contract', 'Deep Sea Defense', 'Kraken Court'],
    ['Swim Fins', 'Dolphin Rides', 'Torpedo Shoes', 'Jet Ski', 'Submarine Sprint'],
    ['Fish Tank Wall', 'Bubble Rides', 'Seashell Stickers', 'Seahorse Petting', 'Mermaid Show']] },
  { name: 'Dinosaur Clinic', special: true, items: [
    ['Fossil Brush', 'Short-Arm Tweezers', 'Dino Claw Gloves', 'Amber Fingers', 'Raptor Reflexes'],
    ['Dino Lawyer', 'Fossil Record', 'Prehistoric Precedent', 'Meteor Clause', 'Jurassic Judge'],
    ['Raptor Running', 'Pterodactyl Wings', 'Stegosaurus Skates', 'Dino Egg Hop', 'Brontosaurus Express'],
    ['Dino Nuggets', 'Volcano Hot Tub', 'Egg Hunt', 'Baby Dino Petting', 'Dino Rides']] },
  { name: 'Superhero Hospital', special: true, items: [
    ['Super Grip', 'Laser Eyes', 'Ice Powers', 'Super Precision', 'Infinity Gloves'],
    ['Secret Identity', 'Hero Lawyers', 'Cape Clause', 'Super Court', 'Hero Pardon'],
    ['Super Speed', 'Flying Cape', 'Teleporter', 'Time Freeze', 'Light Speed Legs'],
    ['Hero Posters', 'Sidekick Stickers', 'Cape Fittings', 'Mask Party', 'Statue in Your Honor']] },
];

export const FOOD_RANKS = [
  { title: 'Fry Cook', items: ['Non-Stick Spatula', 'Refund Coupons', 'Grippy Kitchen Shoes', 'Free Toy With Meal'] },
  { title: 'Grill Cook', items: ['Flame Tamer', 'Smile and Nod', 'Sizzle Sneakers', 'Pickle Bar'] },
  { title: 'Shake Maker', items: ['Steady Scoop', 'Brain Freeze Waiver', 'Blender Boost', 'Extra Sprinkles'] },
  { title: 'Cashier', items: ['Change Counter', 'Receipt Shield', 'Speedy Register', 'Penny Jar'] },
  { title: 'Drive-Thru Voice', items: ['Clear Headset', 'Garbled Excuse', 'Roller Skates', 'Ketchup Packets'] },
  { title: 'Shift Lead', items: ['Clipboard Skills', 'Manager Voice', 'Lunch Rush Legs', 'Fancy Napkins'] },
  { title: 'Assistant Manager', items: ['Secret Sauce', 'Customer Service Smile', 'Mop Bucket Racer', 'Balloon Animals'] },
  { title: 'Manager', items: ['Golden Spatula', 'Corporate Lawyer', 'Delivery Scooter', 'Birthday Song'] },
  { title: 'Regional Manager', items: ['Franchise Fingers', 'Headquarters Hotline', 'Company Jet', 'Mascot Costume'] },
  { title: 'Burger Tycoon', items: ['Diamond Fryer', 'Burger Empire Lawyers', 'Private Helicopter', 'Free Burgers Forever'] },
];
export const FOOD_START = DEPTS.length * TIERS.length; // 100
export const MAX_RANK = FOOD_START + FOOD_RANKS.length - 1; // 109
export const isFood = r => r >= FOOD_START;

const BASE_COSTS = [[260, 560, 1000], [220, 480, 880], [150, 360, 700], [150, 330, 650]];
const nice = n => (n < 1000 ? Math.round(n / 10) * 10 : n < 100000 ? Math.round(n / 50) * 50 : Math.round(n / 1000) * 1000);

export function rankInfo(r) {
  r = Math.max(0, Math.min(MAX_RANK, r | 0));
  if (isFood(r)) {
    const f = FOOD_RANKS[r - FOOD_START];
    return { rank: r, food: true, title: f.title, dept: 'Doctor Burger', tier: r - FOOD_START, deptIndex: -1, special: false, steps: {}, ages: null };
  }
  const d = DEPTS[Math.floor(r / TIERS.length)], t = r % TIERS.length;
  const title = t <= 1 ? `${d.name} ${TIERS[t]}` : t === 2 ? `${d.name} Doctor` : t === 3 ? `Head of ${d.name}` : `Chief of ${d.name}`;
  return { rank: r, food: false, title, dept: d.name, tier: t, deptIndex: Math.floor(r / TIERS.length), special: !!d.special, steps: d.steps || {}, ages: d.ages || null };
}
export function upgradesFor(r) {
  const info = rankInfo(r);
  const mult = 1 + 0.32 * r;
  return [0, 1, 2, 3].map(slot => {
    let name, icon, desc;
    if (info.food) { name = FOOD_RANKS[r - FOOD_START].items[slot]; desc = FOOD_DESC[slot]; icon = SLOT_ICONS[slot][(r + slot) % SLOT_ICONS[slot].length]; }
    else { name = DEPTS[info.deptIndex].items[slot][info.tier]; desc = SLOT_DESC[slot]; icon = SLOT_ICONS[slot][(info.deptIndex + info.tier) % SLOT_ICONS[slot].length]; }
    return { id: 'u' + slot, slot, name, desc, icon, costs: BASE_COSTS[slot].map(c => nice(c * mult)) };
  });
}
// Permanent bonus from every rank already finished (it levels off, so it never gets silly).
export const rankBonus = r => 2.4 * (1 - Math.pow(0.75, Math.max(0, r)));
export const payMult = r => 1 + 0.3 * r;
export const billMult = r => 1 + 0.2 * r;
export const suitMult = r => 1 + 0.15 * r;
export const diffBonus = r => 0.42 * (1 - Math.pow(0.965, Math.max(0, r)));
// what changes about the job at this rank
export function twists(r) {
  const i = rankInfo(r);
  const t = i.tier;
  return {
    patients: t >= 4 && !i.food ? 6 : i.food && t >= 5 ? 6 : 5,
    twoChance: Math.min(0.75, 0.3 + 0.08 * t + 0.002 * r),
    inspector: t >= 2 || (i.food && t >= 1),
    emergencies: t >= 4 ? 2 : t >= 3 ? 1 : 0,
    specialDaily: i.special || t >= 4,
  };
}
export function perksText(r) {
  const i = rankInfo(r), tw = twists(r), out = [];
  if (i.food) {
    out.push('The hospital turned into a burger place. Patients are customers now.');
    out.push('Every promotion pays more.');
    return out;
  }
  if (Object.keys(i.steps).length) { const w = Object.keys(i.steps).map(stepWord); out.push(`More ${w.length > 1 ? w.slice(0, -1).join(', ') + ' and ' + w[w.length - 1] : w[0]}.`); }
  if (i.ages) out.push(`Lots of ${Object.keys(i.ages).map(a => ({ kid: 'kids', teen: 'teenagers', elder: 'grandparents' }[a] || a)).join(' and ')}.`);
  if (tw.inspector) out.push('A hospital inspector watches one patient a day.');
  if (tw.emergencies) out.push(tw.emergencies > 1 ? 'Two emergencies a day.' : 'One emergency a day.');
  if (tw.patients > 5) out.push('Six patients a day.');
  if (tw.specialDaily) out.push('A special patient every day.');
  out.push('Patients pay more. Everything gets a little harder.');
  return out;
}
function stepWord(s) {
  return { shot: 'shots', blood: 'blood tests', surgery: 'surgeries', reflex: 'reflex tests', steth: 'heart checks', cast: 'broken bones', thermo: 'fevers', bp: 'blood pressure checks', otoscope: 'ear problems', drops: 'eye problems', bandage: 'scrapes', xray: 'X-rays', removal: 'stuck things' }[s] || s;
}
