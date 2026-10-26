import * as THREE from 'three';
import { createEngine, clamp, rand, pick, shuffle, TABLE_TOP } from './engine.js';
import { buildRoom } from './room.js';
import { Person, Baby, FLAGS } from './person.js';
import * as M from './meta.js';
import { createUI, h, arm } from './ui.js';
import { sfx, music } from './audio.js';
import * as D from './data.js';
import * as C from './career.js';
import { themeFor } from './themes.js';
import * as FD from './food-data.js';
import { stepLine } from './step-talk.js';
import * as food from './games/food.js';
import { clipboard } from './props.js';
import { route, SPOTS } from './nav.js';
import { voice, unlockSpeech, stop as stopSpeech } from './speech.js';
import { NURSE_VOICE } from './ui.js';
import * as removal from './games/removal.js';
import * as shot from './games/shot.js';
import * as blood from './games/blood.js';
import * as surgery from './games/surgery.js';
import * as reflex from './games/reflex.js';
import * as steth from './games/steth.js';
import * as cast from './games/cast.js';
import * as chase from './games/chase.js';
import * as baby from './games/baby.js';
import * as sneeze from './games/sneeze.js';
import * as hide from './games/hide.js';
import * as scooter from './games/scooter.js';
import * as germs from './games/germs.js';
import * as triplets from './games/triplets.js';
import * as lightsout from './games/lightsout.js';
import * as thermo from './games/thermo.js';
import * as bp from './games/bp.js';
import * as otoscope from './games/otoscope.js';
import * as drops from './games/drops.js';
import * as bandage from './games/bandage.js';
import * as xray from './games/xray.js';
import { TOOLS } from './ui.js';

const GAMES = { removal, shot, blood, surgery, reflex, steth, cast, babyshot: baby, thermo, bp, otoscope, drops, bandage, xray,
  grill: { play: food.grill }, fryer: { play: food.fryer }, soda: { play: food.soda }, sundae: { play: food.sundae }, assemble: { play: food.assemble } };
const stepTool = st => D.STEP_TOOL[st] || st;
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ---------------- save ----------------
const SAVE_KEY = M.saveKey(); // each account (and guest play) has its own slot
const fresh = () => ({ v: 1, day: 1, money: 200, rank: 0, upgrades: { u0: 0, u1: 0, u2: 0, u3: 0, coats: 0 }, coat: '#ffffff', tutorialDone: false, seen: [], muted: false, usedExcuses: [], nextSpecialDay: null, specialBag: [], personaBag: [], lastSpecial: null, plan: null, dayRun: null, savedAt: 0, stats: { patients: 0, threeStars: 0, lawsuits: 0, paidOut: 0, bestDay: 0 } });
// older saves named the four upgrades; they are slots u0..u3 now (each rank fills them with new upgrades)
const OLD_UP = { steady: 'u0', lawyer: 'u1', shoes: 'u2', lolli: 'u3' };
function fixUpgrades(u = {}) {
  const out = { u0: 0, u1: 0, u2: 0, u3: 0, coats: u.coats || 0 };
  for (const [k, v] of Object.entries(u)) { if (OLD_UP[k]) out[OLD_UP[k]] = Math.max(out[OLD_UP[k]], Math.min(3, v | 0)); else if (/^u[0-3]$/.test(k)) out[k] = Math.max(out[k], Math.min(3, v | 0)); }
  return out;
}
function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.v === 1) return { ...fresh(), ...s, upgrades: fixUpgrades(s.upgrades), stats: { ...fresh().stats, ...s.stats } }; } catch (e) { /* ignore */ } return null; }
let state = loadSave() || fresh();
const hadSave = !!loadSave();
// Upgrade levels past the third (unlocked by promotions) still help, just a bit less each.
function upgEff(k) { const id = OLD_UP[k] || k; return Math.min(3, state.upgrades[id] || 0) + C.rankBonus(state.rank || 0); }
let gameConfig = { payBoost: 1, boostUntil: 0 };
const eventOn = k => !!(gameConfig.events && gameConfig.events[k] > Date.now());
const boostNow = () => (gameConfig.payBoost > 1 && gameConfig.boostUntil > Date.now() ? gameConfig.payBoost : 1);
function writeSave() { try { state.seen = ui.seenList(); state.muted = sfx.muted; state.savedAt = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } M.queueSync(); }

// ---------------- setup ----------------
const canvas = document.getElementById('gl');
const E = createEngine(canvas);
const R = buildRoom(E.scene);
const ui = createUI(document.getElementById('ui'), E);
ui.loadSeen(state.seen);
ui.onSeen = () => writeSave();
sfx.setMuted(!!state.muted); ui.syncMute();
let muteFlips = [];
ui.onMute = m => {
  state.muted = m; writeSave(); if (m) { music.stop(); stopSpeech(); } else music.play('clinic');
  const now = Date.now(); muteFlips = muteFlips.filter(t => now - t < 20000); muteFlips.push(now);
  if (muteFlips.length >= 20) M.unlock('sound_toggle');
};
ui.onFullscreen = () => M.goFullscreen();
// Pause menu: resume, settings, or leave to the main menu (progress is kept at the current patient).
let pauseTaps = 0;
ui.onGear = async () => {
  if (M.isPanelOpen()) return;
  E.paused = true;
  while (true) {
    setTimeout(() => {
      const ic = document.querySelector('.pause-card .card-icon');
      if (ic) ic.onclick = () => {
        pauseTaps++; sfx.blip(0.7 + pauseTaps * 0.05);
        if (pauseTaps === 10) { M.unlock('nap'); sfx.snore(); const p = document.querySelector('.pause-card .card-body') || ic.parentElement; p.insertAdjacentHTML('beforeend', '<p class="muted">Zzz... you paused so hard you fell asleep. Nurse Pat stuck a note on your forehead. It says NAPTIME.</p>'); }
      };
    }, 50);
    const v = await M.message({
      icon: M.icon('pause'), title: 'Paused',
      html: `<p>${G.cur ? `You're with <b>${G.cur.c.name}</b>.` : 'Take a breather.'}</p>`,
      buttons: [{ label: 'Resume', value: 'resume', cls: 'primary' }, { label: 'Settings', value: 'settings' }, { label: 'Exit to main menu', value: 'exit' }],
      cls: 'pause-card',
    });
    if (v === 'settings') { await M.openSettings(); continue; }
    if (v === 'exit') {
      const sure = await M.message({ icon: M.icon('door'), title: 'Leave the clinic?', html: G.tutorial ? '<p>The tutorial will start over next time.</p>' : `<p>Your money and days are saved.${G.cur ? ' This patient will be waiting when you come back.' : ''}</p>`, buttons: [{ label: 'Stay', value: false }, { label: 'Exit to menu', value: true, cls: 'primary' }] });
      if (!sure) continue;
      writeSave();
      await M.syncNow();
      location.reload();
      return;
    }
    break;
  }
  E.paused = false;
};

E.onUpdate((dt, t) => { R.monitor.update(dt); if (!clockSpin) R.updateClock(); R.tick(dt, t); });
let clockSpin = false;
const LIGHT0 = { hemi: R.hemi.intensity, hemiC: R.hemi.color.clone(), sun: R.sun.intensity };
function applyGameSettings(st) {
  ui.talk.speed = { slow: 0.6, normal: 1, fast: 1.7 }[st.talk] || 1;
  voice.speed = { slow: 0.85, normal: 1, fast: 1.3 }[st.talk] || 1;
  ui.talk.hold = { slow: 1.6, normal: 1, fast: 0.75 }[st.talk] || 1;
  E.setQuality(st.quality === 'fast');
  E.noShake = !st.shake;
  const ch = st.cheats || {};
  // silly modes from secret codes, or from an event the creator turned on for everyone
  FLAGS.bighead = !!ch.bighead || eventOn('bighead'); FLAGS.party = !!ch.party || eventOn('party'); FLAGS.zoomies = !!ch.zoomies; FLAGS.cats = !!ch.cats || eventOn('cats');
  voice.robot = !!ch.robot; voice.enabled = st.voices !== false; voice.squeaky = !!ch.squeaky;
  sfx.pitch = ch.squeaky ? 1.8 : 1;
  spooky = !!ch.spooky;
  applyLights();
}
// the room's light: the department's tint, unless the GHOST code turned on spooky lights
let spooky = false, deptLight = null;
function applyLights() {
  if (spooky) { R.hemi.color.set('#b18cff'); R.hemi.intensity = LIGHT0.hemi * 0.6; R.sun.intensity = LIGHT0.sun * 0.35; return; }
  if (deptLight) { R.hemi.color.set(deptLight.color); R.hemi.intensity = LIGHT0.hemi * deptLight.k; R.sun.intensity = LIGHT0.sun * deptLight.k; return; }
  R.hemi.color.copy(LIGHT0.hemiC); R.hemi.intensity = LIGHT0.hemi; R.sun.intensity = LIGHT0.sun;
}

// nurse NPC
const nurse = new Person({ age: 'adult', gender: 'f', skin: '#c68642', hair: { style: 'bun', color: '#2b1d14' }, shirt: '#b8a1e3', pants: '#9d84d1', shoes: '#ffffff', outfit: 'scrubs', sleeves: 'short' });
nurse.placeStanding(-2.3, -1.2, Math.atan2(2.3, 1.7));
nurse.setPose('stand', true);
nurse.target.shL = [-0.35, 0, 0.12]; nurse.target.elL = [-1.25, 0.2, 0]; nurse.target.shR = [0.05, 0, -0.12]; nurse.target.elR = [-0.25, 0, 0];
const nurseClip = clipboard(); nurseClip.scale.setScalar(0.75); nurseClip.position.set(0.0, -0.3, 0.07); nurseClip.rotation.set(-1.0, 0, 0); nurse.j.elL.add(nurseClip);
E.scene.add(nurse.root);
E.onUpdate((dt, t) => nurse.update(dt, t));
const nurseSay = (text, o = {}) => { nurse.talk(Math.min(2.5, text.length * 0.04)); return ui.say(() => nurse.headTop(), text, { name: staffName(), pitch: 1.25, key: 'nurse3d', voice: { ...NURSE_VOICE, mood: o.mood || (/!/.test(text) ? 'surprised' : 'neutral'), onStart: est => nurse.talk(est), onEnd: () => nurse.talk(0) }, ...o }); };
// a steady voice for each patient: same name, same voice
function voiceOf(c, age) {
  let hsh = 0; for (const ch of c.name || c.first || '') hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
  return { id: c.name, name: c.first, gender: c.gender || (c.look && c.look.gender) || 'm', age: age || c.ageGroup || 'adult', pitch: 0.92 + (hsh % 17) / 100, excited: c.personality === 'influencer' };
}
const nursePanel = async (text, o) => { nurse.talk(Math.min(2.5, text.length * 0.03)); return ui.nurse(text, o); };

// ---------------- game context ----------------
const G = {
  THREE, E, ui, sfx, music, room: R,
  tutorial: false,
  cur: null,
  // Ramps up over the first week, creeps a little after that, and every promotion adds a step.
  get diff() { const d = state.day; return clamp(0.2 + (d - 1) * 0.12, 0, 1) + clamp((d - 8) * 0.025, 0, 0.35) + C.diffBonus(state.rank || 0); },
  get tol() { return 1 + 0.13 * upgEff('steady'); },
  upg: k => Math.min(4, upgEff(k)),
  get rank() { return state.rank || 0; },
  get coatColor() { return state.coat; },
  bandageColor: '#ffcc80',
  howTo: (id, title, lines, icon) => ui.howTo(id, title, lines, icon),
  addMoney(n) { state.money += n; ui.setHUD({ money: state.money }); if (n > 0) M.bump('earned', n); },
  mood(d) { if (G.cur) G.cur.mood = clamp(G.cur.mood + d, 0, 100); },
  ach: id => M.unlock(id),
  remark() {
    const P = G.cur; if (!P || !P.c.remarks || !P.c.remarks.length) return;
    if (Math.random() < 0.05 && P.c.personality !== 'mime' && !(P.person instanceof Baby)) { G.say(pick(D.PICKLES_LINES), { key: 'remark', hold: 2.2 }); return; }
    // most of the time, talk about the thing they came in for
    if (!G.food && P.c.personality === 'normal' && G.curStep && Math.random() < 0.75) {
      P.saidLines = P.saidLines || new Set();
      const l = stepLine(G.curStep, 'before', P.c.ageGroup, P.saidLines);
      if (l) { G.say(l, { key: 'remark', hold: 1.6 }); return; }
    }
    P.remarkPool = P.remarkPool && P.remarkPool.length ? P.remarkPool : [...P.c.remarks].sort(() => Math.random() - 0.5);
    G.say(P.remarkPool.pop(), { key: 'remark', hold: 1.6 });
  },
  say(text, o = {}) {
    const P = G.cur; if (!P) return Promise.resolve();
    let t = text;
    const mime = P.c.personality === 'mime';
    if (mime && !t.startsWith('(')) t = /!|\?|OW|AA|OU/i.test(t) ? pick(['(Silently screams. Very dramatic.)', '(Mimes fainting. Gets back up.)', '(Points at you angrily. No sound.)']) : pick(['(Nods enthusiastically.)', '(Gives a thumbs up.)', '(Mimes applause.)']);
    if (P.person instanceof Baby) t = pick(['Goo?', 'Bwaah!', 'Ga ga!', 'Pfffbt.']);
    P.person.talk(Math.min(2.5, t.length * 0.045));
    const who = voiceOf(P.c, P.person instanceof Baby ? 'baby' : null);
    who.mood = o.mood || (P.person.face && P.person.face.expr) || 'neutral';
    who.onStart = est => P.person.talk(est); who.onEnd = () => P.person.talk(0);
    return ui.say(() => P.person.headTop(), t, { name: P.c.first, pitch: mime ? 0 : P.c.voice, voice: mime ? null : who, ...o });
  },
};
window.__G = G;
window.__D = D;
window.__state = () => state;
window.__applyGift = g => applyGift(g);   // test hook: apply an admin action locally
M.initMeta({
  addMoney: n => { state.money += n; ui.setHUD({ money: state.money }); writeSave(); M.checkState(state); },
  getState: () => state,
  applyGift,
  secretWord: w => secretWord(w),
  upgradeList: () => upgradesNow().map(u => ({ id: u.id, name: u.name, icon: u.icon })),
  career: C,
  onConfig: c => { gameConfig = c || gameConfig; applyGameSettings(M.settings); },
  loadState: st => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } location.reload(); },
  resetTips: () => ui.resetSeen(),
  specialTypes: D.SPECIAL_TYPES,
  applySettings: applyGameSettings,
});

// ---------------- helpers ----------------
function disposeObj(o) { o.traverse(x => { if (x.geometry) x.geometry.dispose(); }); }
const fmt = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString();

function walkRoute(person, to, speed = 1.5, run = false) {
  const p = person.root.position;
  return person.walkPath(E, route({ x: p.x, z: p.z }, to), speed, run);
}

// Fast food mode (promotion 100 and up): the room, the nurse and all the words change.
let nurseCap = null;
function applyTheme() {
  const on = C.isFood(state.rank || 0);
  const info = C.rankInfo(state.rank || 0);
  const th = on ? null : themeFor(info.deptIndex);
  G.food = on; ui.food = on;
  // every department looks like its own place, and its patients dress the part
  R.setDept(th);
  FLAGS.wear = th ? th.wear : null;
  deptLight = th ? th.light : null;
  applyLights();
  R.setFood(on);
  ui.setHUD({ job: info.title });
  ui.setNurseName(on ? 'Manager Pat' : 'Nurse Pat');
  if (on && !nurseCap) {
    nurseCap = new THREE.Group();
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), new THREE.MeshStandardMaterial({ color: '#e63946', roughness: 0.6 }));
    const bill = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.012, 20, 1, false, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: '#e63946', roughness: 0.6 }));
    bill.position.set(0, 0.035, 0.07); bill.scale.set(1, 1, 0.9);
    nurseCap.add(crown, bill); nurseCap.position.set(0, 0.2, 0.0); nurseCap.rotation.x = -0.15;
    nurse.j.head.add(nurseCap);
  }
  if (nurseCap) nurseCap.visible = on;
}
const staffName = () => (G.food ? 'Manager Pat' : 'Nurse Pat');

// While a procedure runs, speech bubbles sit in a corner and input starts clean.
async function inGame(fn) {
  ui.dock = true; ui.clearBubbles(); E.input.requireRelease();
  try { return await fn(); } finally { ui.dock = false; ui.clearBubbles(); E.input.requireRelease(); }
}
// Tap anywhere to skip a line of dialogue (not during procedures).
window.addEventListener('pointerdown', e => {
  if (ui.dock || M.isPanelOpen()) return;
  if (e.target && e.target.closest && e.target.closest('input, .panel, .overlay')) return;
  if (ui.skipLines()) stopSpeech();
}, true);

// Close-up on a patient's face while they talk, so you can see how they feel.
function faceCam(person, dur = 0.6) {
  if (!person || !person.headCenter) return Promise.resolve();
  const s = person.s || 0.6;
  // aim a little above the head so the face sits low in the frame and the speech bubble fits on top
  const c = person.headCenter(); c.y += 0.14 * s;
  return E.frame(c, 0.85 * s, 0.68 * s, new THREE.Vector3(0.18, 0.04, 1), dur);
}

async function enterPatient(P) {
  const { person, parent } = P;
  await E.home(0.6);
  sfx.door();
  await R.openDoor(E, true);
  if (P.extras && P.extras.length) {
    const kids = [P.extras[0], person, P.extras[1]];
    const xs = [-0.62, 0, 0.62];
    const goIn = async (kid, i) => {
      await E.wait(i * 0.55);
      kid.placeStanding(SPOTS.door.x, SPOTS.door.z, 0);
      kid.setPose('stand', true);
      kid.root.visible = true;
      await kid.walkPath(E, [SPOTS.doorIn], 1.6);
      await walkRoute(kid, { x: xs[i], z: 1.0 + (i === 1 ? 0.12 : 0) }, 1.6);
      await kid.hopOnTable(E, xs[i]);
    };
    const all = Promise.all(kids.map(goIn));
    await E.wait(2.4);
    R.openDoor(E, false); sfx.door();
    await all;
    return;
  }
  const walker = parent || person;
  walker.placeStanding(SPOTS.door.x, SPOTS.door.z, 0);
  walker.setPose('stand', true);
  walker.root.visible = true;
  await walker.walkPath(E, [SPOTS.doorIn], 1.5);
  const closing = R.openDoor(E, false); sfx.door();
  if (parent) {
    await walkRoute(parent, SPOTS.parent, 1.5);
    await parent.faceTo(E, Math.atan2(-SPOTS.parent.x, 0.25 - SPOTS.parent.z), 0.35);
    await closing;
    person.placeSitting();
    person.root.scale.setScalar(0.01); person.root.visible = true;
    sfx.pop();
    await E.tween(0.3, k => person.root.scale.setScalar(Math.max(0.01, k)));
  } else {
    await walkRoute(person, SPOTS.front, 1.5);
    await closing;
    if (G.food) { await person.faceTo(E, 0, 0.3); person.setPose('stand'); }
    else await person.hopOnTable(E);
  }
}

async function exitPatient(P, stars = 2) {
  const { person, parent } = P;
  await E.home(0.5);
  if (person.root.visible && P.c.special !== 'triplets') {
    const mood = ['sad', 'meh', 'good', 'great'][stars] || 'good';
    const seen = new Set(state.byeSeen || []);
    if (!parent) {
      person.expr(mood === 'sad' ? 'angry' : mood === 'meh' ? 'worried' : 'happy');
      const line = G.food ? FD.foodGoodbye(mood, seen) : D.goodbye(P.c, mood, seen);
      state.byeSeen = [...(state.byeSeen || []), line].slice(-160);
      G.say(line, { key: 'c', hold: 0.6 });
    } else {
      const line = D.goodbye({ ...P.c.parent, ageGroup: 'adult', steps: P.c.steps }, mood, seen);
      state.byeSeen = [...(state.byeSeen || []), line].slice(-160);
      ui.say(() => parent.headTop(), line, { name: P.c.parent.title, key: 'parent', hold: 0.6, voice: voiceOf({ name: P.c.parent.first || P.c.parent.title, gender: P.c.parent.look && P.c.parent.look.gender, ageGroup: 'adult' }) });
    }
  }
  if (parent) {
    sfx.pop();
    await E.tween(0.25, k => person.root.scale.setScalar(Math.max(0.01, 1 - k)));
    person.root.visible = false;
    sfx.door(); R.openDoor(E, true);
    await walkRoute(parent, SPOTS.doorIn, 1.7);
    await parent.walkPath(E, [SPOTS.door], 1.7);
    parent.root.visible = false;
  } else if (person.root.visible) {
    if (!G.food) await person.hopOff(E, SPOTS.front.x, SPOTS.front.z);
    sfx.door(); R.openDoor(E, true);
    await walkRoute(person, SPOTS.doorIn, 1.7);
    await person.walkPath(E, [SPOTS.door], 1.7);
    person.root.visible = false;
  }
  await R.openDoor(E, false);
}

async function runnerSequence(P) {
  const { person, c } = P;
  person.expr('scared'); person.setPose('scared'); person.wiggle = 0.8;
  sfx.ouch(c.voice);
  await G.say(pick(['Is that a NEEDLE?! NOPE. NOPE NOPE NOPE!', 'Oh no. Oh no no no no. BYE!', "Actually I just remembered I'm late for... ANYTHING ELSE!"]), { key: 'c', hold: 0.3 });
  await person.hopOff(E, SPOTS.front.x, SPOTS.front.z);
  sfx.door(); R.openDoor(E, true);
  await walkRoute(person, SPOTS.doorIn, 4.2, true);
  await person.walkPath(E, [SPOTS.door], 4.2, true);
  person.root.visible = false;
  R.openDoor(E, false);
  nurseSay('Well don\'t just stand there, Doctor. GET THEM!', { hold: 0.6 });
  await E.wait(0.9);
  ui.flash('rgba(255,255,255,0.9)');
  const r = await inGame(() => chase.play(G, P));
  ui.clearBubbles();
  await E.home(0);
  if (r.caught) {
    person.root.visible = true;
    person.placeSitting(); person.setPose('sit', true); person.expr('sad');
    await G.say(pick(['Okay, okay! You win. Just... be gentle.', 'Fine. FINE. Do the thing.', 'I was just... stretching my legs. Very fast.']), { key: 'c', hold: 0.6 });
  } else {
    await nursePanel("They got away. The front desk says they're suing us for \"emotional cardio.\" That's not a real thing. They're doing it anyway.", { button: 'Ugh' });
  }
  return r;
}

async function scooterSequence(P) {
  const { person, c } = P;
  person.expr('scared'); person.setPose('scared'); person.wiggle = 0.6;
  await G.say(pick(["A needle?! Not today! To the SCOOTER!", 'Nope! Time to ride!', "I didn't buy a scooter to sit around getting SHOTS!"]), { key: 'c', hold: 0.3 });
  await person.hopOff(E, SPOTS.front.x, SPOTS.front.z);
  sfx.door(); R.openDoor(E, true);
  await walkRoute(person, SPOTS.doorIn, 3.2, true);
  await person.walkPath(E, [SPOTS.door], 3.2, true);
  person.root.visible = false;
  R.openDoor(E, false);
  sfx.whoosh();
  nurseSay('Did they just steal a SCOOTER? Grab a wheelchair, Doctor!', { hold: 0.6 });
  await E.wait(1.0);
  ui.flash('rgba(255,255,255,0.9)');
  const r = await inGame(() => scooter.play(G, P));
  ui.clearBubbles();
  await E.home(0);
  if (r.caught) {
    person.root.visible = true;
    person.placeSitting(); person.setPose('sit', true); person.expr('sad');
    await G.say(pick(['Fine. FINE. But the scooter was worth it.', 'Okay, you win. That was the most fun I have had in years, though.', 'Do NOT tell my grandkids about this.']), { key: 'c', hold: 0.6 });
  } else {
    await nursePanel('They got away on the scooter. The lobby wants it back. And they are suing us. For letting them escape. Somehow.', { button: 'Ugh' });
  }
  return r;
}

async function germsSequence(P) {
  const { person } = P;
  person.expr('sad'); sfx.sneeze();
  await G.say(pick(['*COUGH* *COUGH* Sorry. My germs are very loud today.', 'Ah... AH... CHOO! Oops. That one had friends in it.']), { key: 'c', hold: 0.4 });
  await nursePanel("Those germs are too tough for a regular shot. Hop in the <b>Micro-Sub</b>. We'll shrink you down so you can blast them first!", { button: 'Shrink me!' });
  ui.flash('rgba(127,219,255,0.9)'); sfx.whoosh();
  const r = await inGame(() => germs.play(G, P));
  ui.clearBubbles();
  await E.home(0);
  ui.flash('rgba(127,219,255,0.6)');
  person.expr('happy');
  await G.say(r.boss ? 'Whoa. I feel like a whole new nose.' : 'I feel a little better. The germs are hiding, though.', { key: 'c', hold: 0.6 });
  await nursePanel('Great. Now give them the shot to finish the job.', { button: 'On it' });
  return r;
}

async function lightsOutSequence(P) {
  const { person } = P;
  person.expr('smug');
  await G.say(pick(["Hey, doc... what's that behind you?", 'Hehehe. Get ready.', 'Oh no, I hope nobody flips that switch. *flips switch*']), { key: 'c', hold: 0.3 });
  const h0 = R.hemi.intensity, s0 = R.sun.intensity;
  sfx.crack();
  for (let i = 0; i < 3; i++) { R.hemi.intensity = 0.05; R.sun.intensity = 0; await E.wait(0.12); R.hemi.intensity = h0; R.sun.intensity = s0; await E.wait(0.1); }
  R.hemi.intensity = 0.04; R.sun.intensity = 0;
  person.root.visible = false;
  nurseSay("AAH! Who turned off the lights?! Doctor, take this flashlight!", { hold: 0.6 });
  await E.wait(1.2);
  const r = await inGame(() => lightsout.play(G, P));
  ui.clearBubbles();
  R.hemi.intensity = h0; R.sun.intensity = s0;
  await E.home(0);
  person.root.visible = true;
  person.placeSitting(); person.setPose('sit', true);
  person.expr('laugh');
  await G.say(r.found ? 'Best. Prank. EVER. Okay, okay, I will get my shot.' : 'You never found me! Hehe. I got bored and came back. Shot time, I guess.', { key: 'c', hold: 0.6 });
  return r;
}

function lawsuitAmount(sev) {
  const base = sev >= 3 ? rand(1100, 2000) : sev === 2 ? rand(450, 800) : rand(160, 300);
  const raw = base * (1 + (state.day - 1) * 0.06) * C.suitMult(state.rank || 0);
  const cut = raw * (1 - Math.min(0.8, 0.2 * upgEff('lawyer')));
  return { raw: Math.round(raw / 10) * 10, final: Math.round(cut / 10) * 10 };
}

// Leave the tool tray open for two minutes and the patient grows a beard.
function coffeeBreak(P) {
  if (G.cur !== P || !(P.person instanceof Person)) return;
  M.unlock('coffee');
  const hp = P.person.j.head;
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), new THREE.MeshStandardMaterial({ color: (P.c.look.hair && P.c.look.hair.color) || '#3b2a20' }));
  b.scale.set(1.05, 0.95, 0.6); b.position.set(0, 0.05, 0.08); hp.add(b);
  sfx.pop();
  G.say(pick(["I've been waiting so long I grew a beard.", 'Is the doctor... still here? I have aged.', 'I came in for a checkup. Now I have a beard. Thanks.']), { key: 'c', hold: 1.6 });
}

// Poking things in the room while picking a tool.
const pokes = { nurse: 0, clock: 0, plant: 0, monitor: 0, spins: 0 };
E.input.listeners.down.add(async () => {
  if (!G.dbg || G.dbg.kind !== 'tool' || M.isPanelOpen()) return;
  const hit = E.pickObjects([nurse.root, R.clock, R.plant, R.monitor.group]);
  if (!hit) return;
  let o = hit.object; while (o && o !== nurse.root && o !== R.clock && o !== R.plant && o !== R.monitor.group) o = o.parent;
  if (o === R.monitor.group) {
    const n = ++pokes.monitor;
    sfx.beep();
    if (n === 6) {
      pokes.monitor = 0; M.unlock('flatline');
      R.monitor.setFlat(true); sfx.flatline();
      await nurseSay('DOCTOR! The monitor! Oh. Wait. You just unplugged it. Stop that.', { hold: 1.4 });
      R.monitor.showText(['BEEP', 'BOOP'], 4);
      setTimeout(() => R.monitor.setFlat(false), 4200);
    }
    return;
  }
  if (o === nurse.root) {
    const n = ++pokes.nurse;
    nurse.wiggle = 0.4; sfx.boing && sfx.boing();
    if (n === 12) { M.unlock('nurse_poke'); nurseSay("OKAY. Fine. A secret code: it's the thing you throw on your birthday. Five letters. Now stop poking me.", { hold: 3 }); }
    else nurseSay(pick(['Yes?', 'Can I help you, Doctor?', 'Please pick a tool.', 'I am working.', 'Poking the nurse is not a medical procedure.', 'Doctor.']), { hold: 1 });
  } else if (o === R.clock) {
    const n = ++pokes.clock;
    sfx.click();
    if (n === 8) {
      M.unlock('clock'); clockSpin = true;
      const hands = R.clock.children.slice(-2);
      await E.tween(1.6, k => { hands[0].rotation.z = k * 30; hands[1].rotation.z = -k * 12; });
      clockSpin = false; pokes.clock = 0; pokes.spins++;
      if (pokes.spins >= 2) { pokes.spins = 0; sfx.thud(); nurseSay('You knocked the clock crooked. There is a note taped to the back. It says TICKTOCK. Who tapes notes to clocks?', { hold: 3 }); }
      else nurseSay('Stop touching the clock. Time is fragile.', { hold: 1.6 });
    }
  } else if (o === R.plant) {
    const n = ++pokes.plant;
    sfx.ahh && sfx.ahh(1.6);
    if (n === 5) { M.unlock('plant'); pokes.plant = 0; nurseSay('The plant says thank you. The plant has been very lonely.', { hold: 1.6 }); }
  }
});

// ---------------- one patient ----------------
// A customer says the order is wrong. Sometimes they are right (the station work was sloppy) and
// sometimes they are just picky. Manager Pat always sides with the customer.
async function wrongOrder(P, results, worst, deserved) {
  const { c } = P;
  const person = P.person;
  const step = worst.step;
  person.expr(pick(['angry', 'yell'])); sfx.buzz(); G.mood(-8);
  await faceCam(person, 0.5);
  await G.say(pick(deserved ? FD.FOOD_ANGRY[step] || FD.FOOD_PICKY : FD.FOOD_PICKY), { key: 'c', hold: 1.1 });
  await E.home(0.5);
  await nurseSay(pick(FD.MANAGER_REMAKE), { hold: 1.2, mood: 'angry' });
  const what = FD.STATION_NAMES[step] || 'order';
  const v = await ui.card({
    icon: M.icon('scroll'), title: 'Wrong order?!',
    html: `<p><b>${c.first}</b> says you got the order wrong.</p><p class="muted">Make the ${what} again, or say sorry and hand over a coupon.</p>`,
    buttons: [{ label: 'Make it again', value: 'redo', cls: 'primary' }, { label: 'Sorry! Have a coupon', value: 'coupon', cls: 'plain' }],
  });
  M.bump('wrong_orders');
  if (v !== 'redo') {
    P.coupon = true; person.expr('sad'); await faceCam(person, 0.5);
    await G.say(pick(FD.FOOD_COUPON), { key: 'c', hold: 0.9 }); P.saidLast = true;
    await E.home(0.5);
    return;
  }
  ui.hideChart(); ui.clearBubbles();
  music.play('focus');
  let res;
  try { res = await inGame(() => GAMES[step].play(G, P, c.params[step] || {})); } catch (err) { console.error('remake crashed', err); res = { score: 70, fail: false }; }
  ui.hint(null); ui.timer.hide(); ui.clearActions(); ui.hideChart();
  music.play('clinic');
  person.setPose && person.setPose('stand');
  await E.home(0.6);
  res.step = step;
  if (res.fail || res.score < 50) {
    results.push({ ...res, fail: true, severity: 1, reason: 'wrong_order' });
    person.expr('angry'); await faceCam(person, 0.5);
    await G.say(pick(FD.FOOD_REMAKE_BAD), { key: 'c', hold: 0.9 }); P.saidLast = true;
    return;
  }
  results[results.indexOf(worst)] = { ...res, score: Math.max(res.score, worst.score) };
  if (!deserved) { P.sorryTip = true; M.unlock('picky_customer'); }
  person.expr(deserved ? 'happy' : 'smile'); await faceCam(person, 0.5);
  await G.say(pick(deserved ? FD.FOOD_REMAKE_OK : FD.FOOD_REMAKE_SORRY), { key: 'c', hold: 1 }); P.saidLast = true;
}

async function runPatient(c, idx, total, hooks = {}) {
  ui.setHUD({ patient: `${G.food ? 'Customer' : 'Patient'} ${idx + 1}/${total}${c.inspector ? ' · Inspector' : c.emergency ? ' · Rush order' : ''}` });
  let person, parent = null;
  if (c.special === 'baby') {
    parent = new Person(c.parent.look);
    parent.root.visible = false;
    E.scene.add(parent.root);
    person = new Baby(c.baby);
    person.root.visible = false;
  } else { person = new Person(c.look); person.root.visible = false; }
  E.scene.add(person.root);
  const extras = [];
  if (c.special === 'triplets') {
    for (let k = 0; k < 2; k++) { const tw = new Person(JSON.parse(JSON.stringify(c.look))); tw.root.visible = false; E.scene.add(tw.root); extras.push(tw); }
  }
  const actors = [person, ...extras, ...(parent ? [parent] : [])];
  const offU = E.onUpdate((dt, t) => { for (const a of actors) a.update(dt, t); });
  const P = { person, parent, extras, c, mood: Math.min(95, 70 + 5 * upgEff('lolli')) };
  G.cur = P;
  if (c.special) M.metSpecial(c.special);
  await enterPatient(P);
  const showNote = G.tutorial || state.day <= 2;
  if (c.inspector) await nursePanel(pick(['Heads up. A hospital <b>inspector</b> is watching this one. Three stars gets you a bonus. A lawsuit costs extra.', 'See the person with the clipboard in the hallway? That is the <b>inspector</b>. Do this one right.']), { button: 'No pressure' });
  if (c.emergency) await nursePanel(pick(['This one is an <b>EMERGENCY</b>. Pick the right tool before the timer runs out!', '<b>Emergency!</b> No time to stare at the tool tray. Pick fast!']), { button: 'Go!' });
  if (c.special !== 'baby') {
    person.expr(c.personality === 'mime' ? 'smug' : pick(['worried', 'sad', 'smile', 'worried']));
    await faceCam(person);
    await G.say(c.complaint, { key: 'c', hold: 0.8 });
    await E.home(0.55);
  }
  const results = [];
  let wrong = 0;
  let extra = null;
  for (let i = 0; i < c.steps.length; i++) {
    const step = c.steps[i];
    const tool = stepTool(step);
    G.curStep = step;
    ui.chart(c, { note: showNote && !G.food ? D.STEP_NOTE[step] : null, tools: c.steps.map(stepTool), current: i });
    G.stepTool = tool; G.dbg = { kind: 'tool' };
    if (hooks.beforeTool) await hooks.beforeTool(step, i);
    while (true) {
      const coffee = setTimeout(() => coffeeBreak(P), 120000);
      let waited = 0;
      const tick = setInterval(() => { if (E.paused) return; waited += 2; if (waited > 14) G.mood(-1); }, 2000);
      const bored = setTimeout(() => { if (G.cur === P && c.special !== 'baby') G.say(pick(G.food ? FD.FOOD_IMPATIENT : D.IMPATIENT[c.ageGroup] || D.IMPATIENT.adult), { key: 'c', hold: 1.2 }); }, 25000);
      let emT = null;
      if (c.emergency) {
        let left = C.twists(state.rank || 0).emergencies > 1 ? 8 : 10;
        ui.timer.show(left);
        emT = setInterval(() => {
          if (E.paused) return;
          left -= 0.25; ui.timer.set(left);
          if (left <= 0) {
            P.lateTools = (P.lateTools || 0) + 1; G.mood(-10); sfx.buzz(); ui.shakeTray(); person.expr('angry');
            nurseSay(pick(['Too slow, Doctor! Pick something!', 'EMERGENCY means fast!', 'Tick tock, Doctor!']), { hold: 1 });
            left = C.twists(state.rank || 0).emergencies > 1 ? 8 : 10;
          }
        }, 250);
      }
      const t = await ui.pickTool({ title: G.food ? (c.steps.length > 1 ? `Step ${i + 1} of ${c.steps.length}: pick a station` : 'Pick the right station') : c.steps.length > 1 ? `Problem ${i + 1} of ${c.steps.length}: pick a tool` : 'Pick the right tool', highlight: G.tutorial ? tool : null });
      clearTimeout(coffee); clearTimeout(bored); clearInterval(tick);
      if (emT) { clearInterval(emT); ui.timer.hide(); }
      if (t === tool) break;
      wrong++; ui.shakeTray(); sfx.bad(); G.mood(-6);
      if (wrong >= 5) M.unlock('wrong_tools');
      person.expr('angry');
      if (c.special === 'baby') nurseSay(pick(['That is not for babies, Doctor.', 'The baby is judging you. I am also judging you.']), { hold: 1 });
      else G.say(pick((G.food ? FD.FOOD_WRONG[t] : D.WRONG_TOOL[t]) || D.NURSE_QUIPS), { key: 'c', hold: 1 });
      if (wrong % 2 === 0) nurseSay(pick(G.food ? FD.FOOD_QUIPS : D.NURSE_QUIPS), { hold: 1 });
      if (G.tutorial) await nursePanel(`Close! But Dave needs the one that's <b>glowing</b>.`);
    }
    ui.hideTray(); ui.hideChart(); ui.clearBubbles();
    person.expr('smile');
    if (c.special !== 'baby' && !G.tutorial && !c.special && Math.random() < (i === 0 ? 0.6 : 0.4)) { G.remark(); await E.wait(1.2); }
    if (hooks.beforeGame) await hooks.beforeGame(step, i);
    // special pre-events
    if (c.special === 'runner' && !extra) {
      extra = await runnerSequence(P);
      M.unlock(extra.caught ? 'caught_runner' : 'escaped');
      if (!extra.caught) { results.push({ score: 0, fail: true, severity: 1, reason: 'chase', step }); break; }
    }
    if (c.special === 'hider' && !extra) {
      person.expr('scared');
      await G.say(pick(['NOPE!', "Nuh-uh! You can't shot what you can't FIND!", 'Is that a needle?! BYE!']), { key: 'c', hold: 0.3 });
      extra = await inGame(() => hide.play(G, P));
      M.unlock('hider_found');
    }
    if (c.special === 'sneezy' && !extra) extra = await inGame(() => sneeze.play(G, P));
    if (c.special === 'scooter' && !extra) {
      extra = await scooterSequence(P);
      M.unlock(extra.caught ? 'caught_scooter' : 'escaped');
      if (!extra.caught) { results.push({ score: 0, fail: true, severity: 1, reason: 'scooter', step }); break; }
    }
    if (c.special === 'germs' && !extra) { extra = await germsSequence(P); if (extra.boss) M.unlock('germ_king'); }
    if (c.special === 'lightsout' && !extra) { extra = await lightsOutSequence(P); if (extra.found) M.unlock('lights_found'); }
    if (c.special === 'triplets' && !extra) {
      extra = await inGame(() => triplets.play(G, P));
      person = P.person;
      if (!extra.fail && extra.score >= 100) M.unlock('triplets_first');
      if (extra.fail) { results.push({ ...extra, step }); break; }
    }
    let res;
    music.play(step === 'surgery' ? 'surgery' : 'focus');
    try {
      res = await inGame(() => GAMES[step].play(G, P, c.params[step] || {}));
    } catch (err) {
      console.error('minigame crashed', step, err);
      res = { score: 60, fail: false };
    }
    ui.hint(null); ui.timer.hide(); ui.clearActions();
    music.play('clinic');
    res.step = step;
    results.push(res);
    if (!res.fail) M.usedTool(tool, TOOLS.map(t => t.id));
    if (res.afterLine && !res.fail) { await E.home(0.5); await G.say(res.afterLine, { key: 'c', hold: 1.4 }); }
    person.setPose && person.setPose(G.food ? 'stand' : 'sit');
    await E.home(0.6);
    if (res.fail) break;
  }
  // ---------- "you got my order wrong!" (Doctor Burger) ----------
  if (G.food && !G.tutorial && results.length && !results.some(r => r.fail) && !hooks.noComplaints) {
    const worst = results.reduce((a, r) => (r.score < a.score ? r : a));
    const deserved = worst.score < 62 && Math.random() < 0.75;
    const picky = !deserved && Math.random() < 0.12 + C.rankInfo(state.rank || 0).tier * 0.015;
    if (deserved || picky || G.forceWrongOrder) await wrongOrder(P, results, worst, deserved);
  }
  // ---------- evaluate ----------
  const fail = results.some(r => r.fail);
  const severity = Math.max(0, ...results.map(r => r.severity || 0));
  const failRes = results.find(r => r.fail);
  let score = results.reduce((a, r) => a + r.score, 0) / Math.max(1, results.length);
  if (extra && extra.score !== undefined) score = score * 0.8 + extra.score * 0.2;
  score = clamp(score - wrong * 6 - (P.lateTools || 0) * 8, 0, 100);
  // a coupon instead of a remake: one star at most, and the coupon comes out of the pay
  const stars = fail ? 0 : P.coupon ? 1 : score >= 88 ? 3 : score >= 65 ? 2 : 1;
  const raise = C.payMult(state.rank || 0) * boostNow();
  let pay = fail ? 0 : Math.round(c.basePay * raise * [0, 0.6, 0.82, 1][stars] * (P.coupon ? 0.6 : 1));
  // a picky customer who turns out to be wrong leaves a sorry tip
  const tip = !fail && ((stars === 3 && P.mood > 55) || P.sorryTip) ? Math.round(c.basePay * raise * (0.15 + 0.05 * upgEff('lolli') + (P.sorryTip ? 0.15 : 0))) : 0;
  const escaped = extra && extra.caught === false;
  person = P.person;
  if (stars === 3) M.unlock('three_stars');
  if (tip) M.bump('tips');
  if (!fail && c.special === 'baby') M.unlock('baby_calm');
  if (!fail && c.personality === 'vampire' && results.some(r => r.step === 'blood')) M.unlock('vampire_blood');
  // reaction
  if (!escaped) {
    if (fail) { person.expr(c.special === 'baby' ? 'cry' : pick(['angry', 'angry', 'yell', 'cry'])); if (c.special !== 'baby') await faceCam(person, 0.5); if (c.special === 'baby') await ui.say(() => parent.headTop(), pick(['My lawyer will be calling.', 'We are LEAVING.']), { name: c.parent.title, key: 'parent', hold: 1, voice: voiceOf({ name: c.parent.first || c.parent.title, gender: c.parent.look && c.parent.look.gender, ageGroup: 'adult' }) }); else { const stepFail = !G.food && failRes && Math.random() < 0.65 ? stepLine(failRes.step, 'fail', c.ageGroup) : null; await G.say(c.fail || stepFail || pick(G.food ? FD.FOOD_FAIL : D.FAIL), { key: 'c', hold: 0.8 }); } }
    else if (c.special !== 'baby' && !P.saidLast) { person.expr(pick(['happy', 'happy', 'laugh'])); await faceCam(person, 0.5); const stepWin = !G.food && c.personality === 'normal' && Math.random() < 0.6 ? stepLine(pick(c.steps), 'success', c.ageGroup) : null;
      await G.say(c.success || stepWin || pick((G.food ? FD.FOOD_SUCCESS : D.SUCCESS)[c.ageGroup] || D.SUCCESS.adult), { key: 'c', hold: 0.8 }); }
  }
  // results card
  const review = pick((G.food ? FD.FOOD_REVIEWS : D.REVIEWS)[stars]);
  const who = c.special === 'baby' ? `${c.parent.title} of ${c.first}` : `${c.first}${typeof c.age === 'number' ? ', ' + c.age : ''}`;
  sfx[stars === 3 ? 'great' : stars > 0 ? 'good' : 'bad']();
  if (stars === 3) music.sting('win');
  await ui.card({
    cls: 'result-card',
    html: `<div class="result-name">${c.name}</div>${ui.stars(stars)}
      <div class="result-pay ${pay ? '' : 'zero'}">${pay ? '+' + fmt(pay) : '$0'}${tip ? ` <span class="tip">+${fmt(tip)} tip!</span>` : ''}</div>
      <div class="review">“${review}”<span>${who}</span></div>`,
    buttons: [{ label: fail ? 'Uh oh...' : 'Next', value: true }],
  });
  let bonus = 0;
  if (c.inspector && stars === 3) {
    bonus = Math.round(pay * 0.5);
    await nursePanel(G.food ? `The secret shopper loved it. Bonus: <b>${fmt(bonus)}</b>!` : `The inspector wrote "flawless" on the clipboard. Hospital bonus: <b>${fmt(bonus)}</b>!`, { button: 'Nice' });
    M.unlock('inspector');
  }
  const earned = pay + tip + bonus;
  if (earned) { G.addMoney(earned); sfx.cash(); }
  let lawsuit = null;
  if (fail) {
    const amt = lawsuitAmount(severity);
    if (c.inspector) { amt.raw = Math.round(amt.raw * 1.5 / 10) * 10; amt.final = Math.round(amt.final * 1.5 / 10) * 10; }
    if (G.food) { amt.raw = Math.round(amt.raw * 0.6 / 10) * 10; amt.final = Math.round(amt.final * 0.6 / 10) * 10; }
    lawsuit = { amount: amt.final, raw: amt.raw, reason: failRes.reason };
    sfx.gavel(); music.sting('lose');
    const txt = G.food ? (FD.FOOD_REFUND[failRes.reason] || 'This was not what I ordered.') : D.lawsuitText(failRes.reason, c, failRes.step);
    const plaintiff = c.special === 'baby' ? `${c.parent.first} (${c.parent.title} of ${c.first})` : c.name;
    await ui.card({
      cls: 'summons',
      icon: M.icon(G.food ? 'scroll' : 'scales'),
      title: G.food ? 'REFUND!' : "YOU'VE BEEN SUED!",
      html: `<div class="case">${plaintiff} <i>v.</i> ${G.food ? 'Doctor Burger' : 'Doctor Chaos'}</div>
        <div class="severity sev${severity}">${G.food ? 'Angry review' : ['', 'Small Claims', 'Serious Lawsuit', 'MEGA LAWSUIT'][severity] || 'Lawsuit'}</div>
        <div class="claim">“${txt}”</div>
        <div class="damages">${G.food ? 'Refund plus a free meal' : 'Damages'}: <b>${fmt(amt.final)}</b>${amt.final < amt.raw ? `<small>${G.food ? 'Your coupons' : 'Your lawyer'} got it down from ${fmt(amt.raw)}.</small>` : ''}</div>
        <div class="fine-print">Case No. ${Math.floor(rand(100000, 999999))}.${severity >= 3 ? " Clerk's note: the courthouse vending machine code is SNACK. Please stop asking." : ''}</div>`,
      buttons: [{ label: G.food ? 'Sorry!' : 'Pay up', value: true }],
    });
    G.addMoney(-amt.final);
    sfx.coin();
    state.stats.lawsuits++; state.stats.paidOut += amt.final;
    if (severity >= 3) M.unlock('mega_lawsuit');
  }
  state.stats.patients++;
  if (stars === 3) state.stats.threeStars++;
  M.checkState(state);
  if (!escaped) await exitPatient(P, stars);
  offU();
  for (const a of actors) { E.scene.remove(a.root); disposeObj(a.root); a.dispose && a.dispose(); }
  G.cur = null;
  return { c, stars, pay: earned, lawsuit, review, fail };
}

// ---------------- tutorial ----------------
async function runTutorial() {
  G.tutorial = true;
  ui.showHUD(true);
  ui.setHUD({ day: 0, label: 'Orientation', money: state.money, patient: '' });
  await E.home(0.8);
  await nursePanel("Welcome to your first day, Doctor! I'm <b>Nurse Pat</b>. I've trained eleven doctors. Three of them are still doctors.");
  await nursePanel('Every day, <b>5 patients</b> come in. You read their chart, pick the <b>right tool</b>, and fix them up.');
  await nursePanel("Do a good job and you get paid. Mess up badly and... well. People <b>sue</b>. A lot. Let's practice on Dave.");
  const c = D.tutorialPatient();
  const r = await runPatient(c, 0, 1, {
    beforeTool: async (step, i) => {
      if (i === 0) {
        await nursePanel("This is Dave's <b>chart</b>. It says what's wrong. Dave needs a <b>shot</b> first, so grab the <b>Syringe</b> from your tool tray (it's glowing).", { button: 'Got it' });
      } else {
        await nursePanel('Nice! Now that marble. Grab the <b>Tweezers</b>.', { button: 'On it' });
      }
    },
  });
  G.tutorial = false;
  await nursePanel(`That's the job! You earned <b>${fmt(r.pay)}</b>. Better work = more stars = more money.`);
  await nursePanel('Some patients are... <b>special</b>. Runners. Hiders. Sneezers. Babies. You will see. Oh, you will see.');
  await nursePanel("Spend your money on <b>upgrades</b> at the end of each day. Ready? Let's open the clinic!", { button: "Let's go!" });
  state.tutorialDone = true;
  M.unlock('orientation');
  writeSave();
}

// ---------------- day ----------------
// Special mini-game patients show up about every other day, on a random schedule.
function planDay(day) {
  if (state.plan && state.plan.day === day) return state.plan;
  if (state.nextSpecialDay == null) state.nextSpecialDay = day + pick([0, 1]);
  let special = null;
  if (day >= state.nextSpecialDay || C.twists(state.rank || 0).specialDaily || eventOn('specials')) {
    if (!state.specialBag || !state.specialBag.length) {
      let bag = shuffle(D.SPECIAL_TYPES);
      if (bag[0] === state.lastSpecial) bag.push(bag.shift());
      state.specialBag = bag;
    }
    special = state.specialBag.shift();
    state.lastSpecial = special;
    state.nextSpecialDay = day + pick([1, 2, 2, 2, 3, 3]);
  }
  let persona = null;
  if (Math.random() < 0.55) {
    if (!state.personaBag || !state.personaBag.length) state.personaBag = shuffle(D.PERSONA_NAMES);
    persona = state.personaBag.shift();
  }
  state.plan = { day, special, persona };
  return state.plan;
}

window.__planDay = d => planDay(d);
window.__shop = () => shop();

function dayLine(day) {
  const hr = new Date().getHours();
  if (hr >= 0 && hr < 4) return 'It is the middle of the night. Even the patients are yawning. Nurse Pat is wearing pajamas under her scrubs.';
  if (day === 13) { M.unlock('cat_day'); return 'Day 13. Nurse Pat brought a black cat for luck. It is wearing a tiny lab coat and a name tag that says MEOW. Nurse Pat swears that is also a secret code.'; }
  if (day === 42) return 'Day 42. The answer to everything. Except medicine. You still have to do the medicine.';
  if (day === 100) return 'Day 100! The hospital board sent a card. It says "Wow. Still here?"';
  return pick(G.food ? FD.FOOD_FORECAST : D.FORECAST);
}

// today's line of patients (or customers) for the current job
function makeLine(day, count) {
  const plan = planDay(day);
  const used = new Set(state.usedExcuses || []);
  const rk = state.rank || 0, info = C.rankInfo(rk), tw = C.twists(rk);
  const n = count || tw.patients;
  let list = G.food ? FD.generateOrderDay(day, { n, tier: info.tier }) : D.generateDay(day, { used, special: count ? null : plan.special, persona: plan.persona, rank: rk, n, twoChance: tw.twoChance, stepBias: info.steps, ageBias: info.ages });
  list = list.slice(0, n);
  state.usedExcuses = [...used];
  // promoted doctors get inspectors and emergencies
  const normal = list.map((c, i) => (c.special ? -1 : i)).filter(i => i > 0 || count);
  const order = shuffle(normal);
  if (tw.inspector && order.length) list[order.pop()].inspector = true;
  for (let k = 0; k < tw.emergencies && order.length; k++) list[order.pop()].emergency = true;
  return JSON.parse(JSON.stringify(list));
}

async function playDay() {
  G.tutorial = false;
  await M.claimGifts();
  await M.loadConfig();
  const day = state.day;
  ui.showHUD(true);
  ui.setHUD({ day, money: state.money, patient: '' });
  // Resume a day that was left part way through, at the next patient.
  let run = state.dayRun && state.dayRun.day === day && Array.isArray(state.dayRun.list) && state.dayRun.idx < state.dayRun.list.length ? state.dayRun : null;
  // a job change part way through the day: the people still waiting are swapped for ones who fit the new job
  if (run && (run.redo || run.list.slice(run.idx).some(c => !!c.food !== !!G.food))) {
    const left = run.list.length - run.idx;
    const fresh = makeLine(day, left);
    run.list = [...run.list.slice(0, run.idx), ...fresh];
    delete run.redo;
    writeSave();
  }
  if (!run) {
    const list = makeLine(day);
    run = state.dayRun = { day, list: JSON.parse(JSON.stringify(list)), idx: 0, out: [], startMoney: state.money };
    writeSave();
    await E.home(0.6);
    await ui.card({
      icon: M.icon('hospital'),
      title: `Day ${day}`,
      html: `<p class="day-rank">${M.icon('medal:1', 'in')} ${C.rankInfo(rankOf()).title}</p>${boostNow() > 1 ? `<p class="boost">${M.icon('sparkle', 'in')} ${boostNow()}x pay today!</p>` : ''}<p><b>${WEEKDAYS[(day - 1) % 7]}.</b> ${list.length} ${G.food ? 'customers in line' : 'patients in the waiting room'}.</p><p class="muted">${dayLine(day)}</p>`,
      buttons: [{ label: G.food ? 'Open the restaurant!' : 'Open the clinic!', value: true }],
    });
  } else {
    await E.home(0.6);
    await ui.card({
      icon: M.icon('hospital'),
      title: `Welcome back!`,
      html: `<p>Day ${day}, ${G.food ? 'customer' : 'patient'} ${run.idx + 1} of ${run.list.length} is still waiting.</p><p class="muted">${pick(G.food ? FD.FOOD_WELCOME : D.WELCOME_BACK)}</p>`,
      buttons: [{ label: G.food ? 'Next customer!' : 'Next patient!', value: true }],
    });
  }
  while (run.idx < run.list.length) {
    const sent = sentPatient(day);
    if (sent) { run.list.splice(run.idx, 0, sent); writeSave(); }
    const r = await runPatient(run.list[run.idx], run.idx, run.list.length);
    run.out.push({ name: r.c.name, stars: r.stars, pay: r.pay, lawsuit: r.lawsuit ? { amount: r.lawsuit.amount } : null, review: r.review, fail: r.fail });
    run.idx++;
    G.onPatientDone && G.onPatientDone(r);
    writeSave();
  }
  state.dayRun = null;
  await endOfDay(run.out, run.startMoney);
}

async function endOfDay(out, startMoney) {
  ui.setHUD({ patient: '' });
  const earned = out.reduce((a, r) => a + r.pay, 0);
  const sued = out.reduce((a, r) => a + (r.lawsuit ? r.lawsuit.amount : 0), 0);
  const starsTotal = out.reduce((a, r) => a + r.stars, 0);
  M.bump('days');
  if (starsTotal >= 15) M.unlock('perfect_day');
  if (starsTotal === 0) M.unlock('zero_day');
  // running a clinic costs money every day: rent, supplies, and Nurse Pat's coffee
  const bills = Math.round((40 + state.day * 10) * C.billMult(state.rank || 0) / 5) * 5;
  state.money -= bills; ui.setHUD({ money: state.money });
  state.stats.costs = (state.stats.costs || 0) + bills;
  state.stats.bestDay = Math.max(state.stats.bestDay, earned - sued - bills);
  const rows = out.map(r => `<tr><td>${r.name}</td><td class="st">${M.icon('star', 'in').repeat(r.stars)}${M.icon('starOff', 'in').repeat(3 - r.stars)}</td><td class="pos">${r.pay ? '+' + fmt(r.pay) : ''}</td><td class="neg">${r.lawsuit ? '−' + fmt(r.lawsuit.amount) : ''}</td></tr>`).join('');
  const goodReview = out.filter(r => r.stars >= 2).map(r => r.review)[0];
  const badReview = out.filter(r => r.stars <= 1).map(r => r.review)[0];
  music.sting('dayEnd');
  await ui.card({
    icon: M.icon('moon'),
    title: `Day ${state.day} complete!`,
    cls: 'summary-card',
    html: `<table class="summary">${rows}</table>
      <div class="totals"><div>Earned <b class="pos">${fmt(earned)}</b></div><div>Lawsuits <b class="neg">${fmt(-sued)}</b></div><div>${G.food ? 'Kitchen' : 'Clinic'} bills <b class="neg">${fmt(-bills)}</b></div><div>Stars <b>${starsTotal}/15</b></div></div>
      <div class="bills muted">${pick(G.food ? FD.FOOD_BILLS : D.BILLS)}</div>
      ${goodReview ? `<div class="review small">“${goodReview}”</div>` : ''}${badReview ? `<div class="review small bad">“${badReview}”</div>` : ''}
      <div class="bank">Bank: <b class="${state.money < 0 ? 'neg' : 'pos'}">${fmt(state.money)}</b></div>`,
    buttons: [{ label: 'Next', value: true }],
  });
  state.day++;
  writeSave();
  M.checkState(state);
  M.queueSync(true);
  if (state.money < -1000) {
    sfx.bad();
    M.unlock('bankrupt');
    const v = await ui.card({
      icon: M.icon('can'),
      title: 'BANKRUPT!',
      html: "<p>The hospital board has replaced you with a vending machine.</p><p class=\"muted\">It only says one thing: “Have you tried drinking water?”</p>",
      buttons: [{ label: 'Start over', value: 'reset', cls: '' }, { label: 'Keep going (debt forgiven)', value: 'keep' }],
    });
    if (v === 'reset') { const keepSeen = state.seen; state = fresh(); state.tutorialDone = true; state.seen = keepSeen; writeSave(); ui.setHUD({ money: state.money }); return; }
    state.money = 0; ui.setHUD({ money: 0 }); writeSave();
  }
  await shop();
}

const COATS = ['#ffffff', '#ff8a2a', '#3a86ff', '#ff5d8f', '#2ec4b6', '#1d2b36', '#9b5de5'];
const coatList = () => M.profile.secrets.konami ? [...COATS, '#d4af37'] : COATS;
const rankOf = () => Math.max(0, Math.min(C.MAX_RANK, state.rank || 0));
const upgradesNow = () => C.upgradesFor(rankOf());
const allMaxed = () => upgradesNow().every(u => (state.upgrades[u.id] || 0) >= 3);
const canPromote = () => allMaxed() && rankOf() < C.MAX_RANK;
G.career = C;

function setRank(r, { keepUpgrades = false } = {}) {
  const was = rankOf();
  state.rank = Math.max(0, Math.min(C.MAX_RANK, r | 0));
  if (!keepUpgrades) state.upgrades = { u0: 0, u1: 0, u2: 0, u3: 0, coats: state.upgrades.coats || 0 };
  M.bump('promotions', 0);
  // the new job starts now: the room changes, and anyone still waiting today is replaced by
  // people who belong at the new job (customers at Doctor Burger, patients at the hospital)
  if (state.rank !== was) { applyTheme(); if (state.dayRun) state.dayRun.redo = true; }
}

async function promote() {
  setRank(rankOf() + 1);
  const r = rankOf(), info = C.rankInfo(r);
  writeSave();
  M.queueSync(true);
  M.unlock('promoted');
  if (r >= 10) M.unlock('promo10');
  if (r >= 25) M.unlock('promo25');
  if (r >= 50) M.unlock('promo50');
  if (info.food) M.unlock('fast_food');
  if (r >= C.MAX_RANK) M.unlock('tycoon');
  if (!info.food && info.tier === 4) M.unlock('director');
  if (r === C.FOOD_START - 1) M.unlock('legend');
  if (r % 5 === 0 && !info.food) M.unlock('new_dept');
  music.sting('promotion');
  const ups = C.upgradesFor(r);
  if (r === C.FOOD_START) {
    await ui.card({
      icon: M.icon('taco'), cls: 'promo-card', title: 'PROMOTED?!',
      html: `<p class="promo-rank">Fry Cook</p><p>After 100 promotions the hospital board ran out of jobs to give you. So they sold the hospital. It is a burger place now. You come with the building.</p><ul class="perks">${C.perksText(r).map(x => `<li>${x}</li>`).join('')}</ul>`,
      buttons: [{ label: 'Would you like fries with that?', value: true }],
    });
    await nursePanel("I'm Manager Pat now. I have a visor. Put on your hairnet, the lunch rush starts in five minutes.", { button: 'Yes, Manager Pat' });
    return;
  }
  await ui.card({
    icon: M.icon('medal:1'), cls: 'promo-card', title: 'PROMOTED!',
    html: `<p class="promo-rank">${info.title}</p><p class="promo-num">Promotion ${r} of ${C.MAX_RANK}</p>
      <ul class="perks">${C.perksText(r).map(x => `<li>${x}</li>`).join('')}</ul>
      <div class="promo-ups"><b>New ${info.food ? 'gear' : info.dept + ' gear'} in the shop:</b>${ups.map(u => `<span>${M.icon(u.icon, 'in')} ${u.name}</span>`).join('')}</div>
      <p class="muted">Your old upgrades stay with you as a permanent bonus.</p>`,
    buttons: [{ label: "Let's go!", value: true }],
  });
  await nursePanel(pick([`Congratulations. Welcome to ${info.dept}. I'll get you a bigger clipboard.`, `${info.title}? Wow. I've worked here eleven years and I'm still "Nurse."`, 'Promoted. Great. Now the patients will expect you to know things.', `New department, new gear. Try not to break any of it.`]), { button: 'Thanks, Pat' });
}

async function shop() {
  await M.claimGifts();
  while (canPromote()) await promote();
  return new Promise(res => {
    const modal = ui.modalEl;
    const render = () => {
      modal.innerHTML = '';
      const r = rankOf(), info = C.rankInfo(r);
      const card = h('div', 'card shop-card');
      card.appendChild(h('div', 'card-icon', M.icon('cart')));
      card.appendChild(h('div', 'card-title', info.food ? 'Kitchen Shop' : 'Upgrade Shop'));
      card.appendChild(h('div', 'shop-rank', `${M.icon('medal:1', 'in')} <b>${info.title}</b><span>${r < C.MAX_RANK ? `Promotion ${r} of ${C.MAX_RANK}. Max out all four to get promoted.` : 'Top of the burger world. Nowhere left to climb.'}</span>`));
      card.appendChild(h('div', 'shop-bank', `Bank: <b class="${state.money < 0 ? 'neg' : 'pos'}">${fmt(state.money)}</b>`));
      const list = h('div', 'shop-list');
      for (const u of upgradesNow()) {
        const lvl = state.upgrades[u.id] || 0;
        const cost = lvl < 3 ? u.costs[lvl] : undefined;
        const row = h('div', 'shop-row');
        row.innerHTML = `<div class="shop-icon">${M.icon(u.icon)}</div><div class="shop-info"><b>${u.name}</b><span>${u.desc}</span><div class="dots">${[0, 1, 2].map(i => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</div></div>`;
        const b = h('button', 'btn small ' + (cost !== undefined && state.money >= cost ? 'primary' : ''), cost === undefined ? 'MAX' : fmt(cost));
        b.disabled = cost === undefined || state.money < cost;
        b.onclick = async () => {
          state.money -= cost; state.upgrades[u.id] = lvl + 1; sfx.cash(); ui.setHUD({ money: state.money }); writeSave(); M.checkState(state);
          if (canPromote()) { modal.classList.add('hidden'); while (canPromote()) await promote(); }
          render();
        };
        row.appendChild(b);
        list.appendChild(row);
      }
      // coats
      const crow = h('div', 'shop-row');
      if (!state.upgrades.coats) {
        crow.innerHTML = `<div class="shop-icon">${M.icon('coat')}</div><div class="shop-info"><b>Fancy Coats</b><span>Unlock coat colors for your doctor.</span></div>`;
        const b = h('button', 'btn small ' + (state.money >= 100 ? 'primary' : ''), '$100');
        b.disabled = state.money < 100;
        b.onclick = () => { state.money -= 100; state.upgrades.coats = 1; sfx.cash(); ui.setHUD({ money: state.money }); writeSave(); render(); };
        crow.appendChild(b);
      } else {
        crow.innerHTML = `<div class="shop-icon">${M.icon('coat')}</div><div class="shop-info"><b>Coat color</b><div class="swatches">${coatList().map(cc => `<button class="sw ${cc === state.coat ? 'on' : ''}" data-c="${cc}" style="background:${cc}"></button>`).join('')}</div></div>`;
        crow.querySelectorAll('.sw').forEach(s => (s.onclick = () => { state.coat = s.dataset.c; sfx.click(); M.unlock('fashion'); writeSave(); render(); }));
      }
      list.appendChild(crow);
      card.appendChild(list);
      const row = h('div', 'card-buttons');
      const next = h('button', 'btn primary', `Start Day ${state.day}`);
      next.onclick = () => { sfx.click(); modal.classList.add('hidden'); modal.innerHTML = ''; res(); };
      row.appendChild(next);
      card.appendChild(row);
      modal.appendChild(card);
      modal.classList.remove('hidden');
      arm(card, 380);
    };
    render();
  });
}

// Gifts and changes sent from the creator's admin panel.
const VISITOR_TITLES = { runner: 'a runner', baby: 'a baby', sneezy: 'a sneezer', hider: 'a hider', scooter: 'a scooter thief', germs: 'a kid full of germs', triplets: 'triplets', lightsout: 'a lights-out prankster', vampire: 'the vampire', pirate: 'the pirate', trench: 'a very tall adult', mime: 'the mime', influencer: 'the influencer', grandma: 'Grandma Bertha', ticklish: 'a ticklish patient', conspiracy: 'Kevin Truthseeker' };
// a patient the creator sent: they cut in line as the next patient
function sentPatient(day) {
  const v = state.sendPatient;
  if (!v || G.food) return null;
  state.sendPatient = null;
  const used = new Set(state.usedExcuses || []);
  let c;
  try { c = D.PERSONA_NAMES.includes(v) ? D.personaPatient(v, used) : D.testSpecialPatient(v, used); } catch (e) { console.error(e); return null; }
  if (!c) return null;
  c.basePay = 90 + day * 15 + 40;
  c.sentBy = true;
  return JSON.parse(JSON.stringify(c));
}

function applyGift(g) {
  const a = g.action || { type: 'gift', money: g.money, upgrades: g.upgrades };
  const names = [];
  const fmtN = n => fmt(n);
  switch (a.type) {
    case 'gift': {
      if (a.money) { state.money += a.money; M.bump('earned', a.money); names.push(`<b>${fmtN(a.money)}</b> (counts toward money earned)`); }
      if (a.upgrades === 'max') { for (const u of upgradesNow()) state.upgrades[u.id] = 3; state.upgrades.coats = 1; names.push('every upgrade maxed out'); }
      else if (a.upgrades) {
        const ups = upgradesNow();
        for (const [k, n] of Object.entries(a.upgrades)) { const id = OLD_UP[k] || k; const u = ups.find(x => x.id === id); if (!u) continue; state.upgrades[id] = Math.min(3, (state.upgrades[id] || 0) + n); names.push(`${u.name} +${n}`); }
      }
      break;
    }
    case 'setMoney': state.money = a.value; names.push(`Bank set to <b>${fmtN(a.value)}</b>`); break;
    case 'setEarned': M.profile.counters.earned = a.value; M.saveProfile(); names.push(`Total money earned set to <b>${fmtN(a.value)}</b>`); break;
    case 'setDaysPlayed': M.profile.counters.days = a.value; M.saveProfile(); names.push(`Days played set to <b>${a.value}</b>`); break;
    case 'setDay': state.day = a.value; state.dayRun = null; state.plan = null; names.push(`Jumped to <b>day ${a.value}</b>`); break;
    case 'setRank': setRank(a.value); names.push(`Job set to <b>${C.rankInfo(a.value).title}</b>`); break;
    case 'upgrades': {
      const ups = upgradesNow();
      if (a.mode === 'max') { ups.forEach(u => { state.upgrades[u.id] = 3; }); state.upgrades.coats = 1; names.push('every upgrade maxed out'); }
      else if (a.mode === 'reset') { ups.forEach(u => { state.upgrades[u.id] = 0; }); names.push('upgrades reset'); }
      else { const u = ups[a.slot] || ups[0]; state.upgrades[u.id] = Math.min(3, (state.upgrades[u.id] || 0) + (a.n || 1)); names.push(`${u.name} +${a.n || 1}`); }
      break;
    }
    case 'unlockAwards': M.unlockAll(); names.push('every award unlocked'); break;
    case 'patient': state.sendPatient = a.value; names.push(`A special visitor is on the way: <b>${VISITOR_TITLES[a.value] || a.value}</b>${G.food ? ' (when you are back at the hospital)' : ''}`); break;
    case 'cheat': M.settings.cheats[a.mode] = !!a.on; M.saveSettings(); M.applySettings(); names.push(`<b>${M.CHEAT_NAMES[a.mode] || a.mode}</b> turned ${a.on ? 'on' : 'off'}`); break;
    case 'cheer': names.push(`<b>“${a.text}”</b>`); break;
    case 'unlockCodes': for (const w of a.codes || []) M.enterCode(w, { quiet: true }); names.push('every secret code used'); break;
    case 'reset': { const keepSeen = state.seen; state = fresh(); state.tutorialDone = true; state.seen = keepSeen; M.profile.counters.earned = 0; M.profile.counters.days = 0; M.saveProfile(); applyTheme(); names.push('a brand new start'); break; }
    default: break;
  }
  writeSave();
  M.checkState(state);
  ui.setHUD({ day: state.day, money: state.money });
  return { names, raw: true };
}

// ---------------- title ----------------
let titleOff = null;
let demo = null;
function startTitleScene() {
  demo = new Person(D.randomLook(pick(['kid', 'adult', 'elder']), pick(['m', 'f'])));
  demo.placeSitting();
  E.scene.add(demo.root);
  let a = 0, talkT = 2;
  const exprs = ['smile', 'happy', 'scared', 'surprised', 'laugh'];
  titleOff = E.onUpdate((dt, t) => {
    demo.update(dt, t);
    a += dt * 0.12;
    E.basePos.set(Math.sin(a) * 1.6, 1.55 + Math.sin(a * 0.7) * 0.1, 2.9 + Math.cos(a) * 0.3);
    E.camTarget.set(0, 1.05, 0);
    talkT -= dt;
    if (talkT < 0) { talkT = rand(1.5, 3); demo.expr(pick(exprs)); demo.wiggle = 0.3; }
  });
}
function stopTitleScene() {
  if (titleOff) titleOff();
  titleOff = null;
  if (demo) { E.scene.remove(demo.root); disposeObj(demo.root); demo.dispose(); demo = null; }
}

const TAGLINES = [
  'Malpractice makes perfect.', 'Five patients a day. Zero medical degrees.', 'Now with 40% fewer lawsuits! (Not true.)',
  'Ask your doctor if Doctor Chaos is right for you.', "We put the 'ow' in 'how are you feeling?'", 'Board certified by a board. It was a cutting board.',
  'Side effects may include: everything.', 'Nurse Pat approved. Barely.', 'Please do not lick the stethoscope.',
  'Our lawyers asked us to stop saying "trust me."', 'Free lollipop with every lawsuit.', 'Where every checkup is a check-uh-oh.',
  'Not a real doctor. Not a real hospital. Real lawsuits.', 'Voted #1 clinic in this building.', 'Have you tried turning your arm off and on again?',
  'Rated 5 stars by the vending machine.', 'Our cafeteria pudding has its own lawyer.', 'Proudly serving patients since about five minutes ago.',
  'We have a 100% success rate at opening the door.', "If it's broken, we cast it. If it's not broken... we also cast it.", 'The doctor will see you now. Unfortunately.',
  'Warning: contains Nurse Pat.', 'No refunds. No returns. No idea what we are doing.', 'Every patient leaves with a smile. Or a lawsuit. Usually both.',
  'Professionally unprofessional.', 'The stethoscope is mostly for show.', 'Practice makes... malpractice.', 'Day 1 of being a doctor. Day 0 of medical school.',
  'Stop running in the halls. Especially you, Gertrude.', 'Now with real fake medicine!', 'The X-ray machine is just a very strong flashlight.',
  'Healthy patients are just patients we have not met yet.', 'Bring your own bandages.', 'Insurance? Never heard of her.',
];

function rainTacos(el, what = 'taco', n = 40) {
  for (let i = 0; i < n; i++) {
    const t = h('div', 'taco', M.icon(what));
    t.style.left = Math.random() * 100 + 'vw';
    t.style.animationDelay = (Math.random() * 2.2) + 's';
    t.style.width = t.style.height = (34 + Math.random() * 30) + 'px';
    el.appendChild(t);
    setTimeout(() => t.remove(), 5200);
  }
}

function showTitle() {
  return new Promise(res => {
    const el = document.getElementById('title');
    el.classList.remove('hidden');
    const btns = el.querySelector('.title-buttons');
    btns.innerHTML = '';
    const cleanups = [];
    const add = (label, cls, fn) => { const b = h('button', 'btn ' + cls, label); b.onclick = () => { sfx.unlock(); sfx.click(); fn(); }; btns.appendChild(b); return b; };
    const go = mode => { cleanups.forEach(f => f()); el.classList.add('hidden'); res(mode); };
    const midDay = state.dayRun && state.dayRun.day === state.day && state.dayRun.idx > 0 ? `, patient ${state.dayRun.idx + 1}` : '';
    if (hadSave && state.tutorialDone) {
      add(`Continue · Day ${state.day}${midDay}`, 'primary big', () => go('continue'));
      add('New game', '', async () => {
        el.classList.add('hidden');
        const v = await ui.card({ title: 'Start over?', html: '<p>This erases your money, upgrades and days. Achievements stay.</p>', buttons: [{ label: 'Cancel', value: false }, { label: 'Yes, start over', value: true }] });
        if (v) { const keepSeen = state.seen; state = fresh(); state.seen = keepSeen; writeSave(); }
        el.classList.remove('hidden');
        if (v) { btns.innerHTML = ''; add('Start with tutorial', 'primary big', () => go('tutorial')); add('Skip tutorial', '', () => go('skip')); }
      });
    } else {
      add('Start your shift', 'primary big', () => go('tutorial'));
      add('Skip tutorial', '', () => go('skip'));
    }
    // menu row (rebuilt when you log in or out)
    let menu = el.querySelector('.title-menu');
    if (!menu) { menu = h('div', 'title-menu'); btns.after(menu); }
    const renderMenu = () => {
      menu.innerHTML = '';
      const mbtn = (ic, label, fn, cls = '') => { const b = h('button', 'menu-btn ' + cls, `<span>${ic}</span><small>${label}</small>`); b.onclick = () => { sfx.unlock(); sfx.click(); fn(); }; menu.appendChild(b); return b; };
      mbtn(M.icon('gear'), 'Settings', () => M.openSettings());
      mbtn(M.icon('trophy'), 'Awards', () => M.openAchievements());
      mbtn(M.icon('chart'), 'Leaders', () => M.openLeaderboard());
      mbtn(M.icon('user'), M.auth.username ? M.auth.username : 'Account', () => M.openAccount());
      if (M.isCreator()) { mbtn(M.icon('book'), 'Secrets', () => M.openGuide(), 'creator'); mbtn(M.icon('shield'), 'Admin', () => M.openAdmin(), 'creator'); }
      if (window.matchMedia('(pointer: coarse)').matches && !M.isFullscreen()) mbtn(M.icon('fullscreen'), 'Full screen', () => M.goFullscreen());
    };
    renderMenu();
    M.hooks.onAuth = () => renderMenu();
    // rotating taglines
    const tag = el.querySelector('.tagline');
    let ti = 0;
    const order = shuffle(TAGLINES.slice(1)); order.unshift(TAGLINES[0]);
    const nextTag = () => { ti = (ti + 1) % order.length; tag.classList.remove('flip'); void tag.offsetWidth; tag.classList.add('flip'); setTimeout(() => { tag.textContent = order[ti]; }, 180); };
    tag.textContent = order[0];
    const tagTimer = setInterval(nextTag, 5200);
    cleanups.push(() => clearInterval(tagTimer));
    // secret: hold the tagline for 3 seconds
    let holdT = null;
    tag.onpointerdown = () => { holdT = setTimeout(() => { holdT = null; tag.textContent = 'This tagline has been reviewed by zero doctors.'; tag.classList.add('fine'); M.unlock('fine_print'); sfx.ding(); setTimeout(() => tag.classList.remove('fine'), 4000); }, 3000); };
    tag.onpointerup = tag.onpointerleave = () => { if (holdT) { clearTimeout(holdT); holdT = null; nextTag(); } };
    // secret: spell words by tapping logo letters
    let spelled = '';
    el.querySelectorAll('.logo i').forEach(letter => {
      letter.onclick = e => {
        e.stopPropagation();
        letter.classList.remove('boing'); void letter.offsetWidth; letter.classList.add('boing');
        sfx.blip ? sfx.blip(0.8 + Math.random() * 0.6) : sfx.click();
        spelled = (spelled + letter.textContent).slice(-8);
        if (spelled.endsWith('TACOS')) { spelled = ''; rainTacos(el); M.unlock('tacos'); setTimeout(() => M.secret('tacos', { icon: M.icon('taco'), title: 'Taco Tuesday', html: '<p>It is raining tacos. This is not covered by insurance.</p>' }), 2600); }
        if (spelled.endsWith('ROACH')) { spelled = ''; const r = h('div', 'roach', M.icon('roach')); el.appendChild(r); setTimeout(() => r.remove(), 4200); M.unlock('roach'); sfx.giggle && sfx.giggle(0, 1.4); }
      };
    });
    // secret: type on the keyboard (old cheat code, or the designer's name)
    const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
    let keys = [], typed = '';
    const konami = () => {
      el.querySelector('.logo').classList.toggle('upside');
      M.unlock('konami'); sfx.fanfare();
      M.secret('konami', { icon: M.icon('joystick'), title: 'Cheat code detected!', html: '<p>Cheat codes are not allowed in medical school. You have been expelled.</p><p>Just kidding. Here is a <b>gold coat</b>. Find it in the upgrade shop.</p>' });
    };
    // the same old cheat code on a touch screen: swipe up, up, down, down, left, right, left, right, then tap twice
    let swipes = [], sw0 = null;
    const onSwDown = e => { sw0 = { x: e.clientX, y: e.clientY, t: performance.now() }; };
    const onSwUp = e => {
      if (!sw0 || M.isPanelOpen()) return;
      const dx = e.clientX - sw0.x, dy = e.clientY - sw0.y, d = Math.hypot(dx, dy);
      const g = d < 14 ? 'T' : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U');
      sw0 = null;
      if (d >= 14 && d < 40) return;
      swipes = [...swipes, g].slice(-10);
      if (swipes.join('') === 'UUDDLRLRTT') { swipes = []; konami(); }
    };
    // swipes are read on the big logo (so they never fight with scrolling the menu)
    const logoEl = el.querySelector('.logo');
    logoEl.addEventListener('pointerdown', onSwDown);
    logoEl.addEventListener('pointerup', onSwUp);
    cleanups.push(() => { logoEl.removeEventListener('pointerdown', onSwDown); logoEl.removeEventListener('pointerup', onSwUp); });
    const onKey = e => {
      if (M.isPanelOpen() || /input|textarea/i.test(document.activeElement && document.activeElement.tagName)) return;
      keys = [...keys, e.code].slice(-10);
      if (keys.join() === KONAMI.join()) { keys = []; konami(); }
      if (/^Key[A-Z]$/.test(e.code)) {
        typed = (typed + e.code.slice(3)).slice(-10);
        if (typed.endsWith('LINUS')) { typed = ''; secretWord('LINUS'); }
        if (typed.endsWith('NURSEPAT')) { typed = ''; secretWord('NURSEPAT'); }
        if (typed.endsWith('MANAGERPAT')) { typed = ''; secretWord('MANAGERPAT'); }
      }
    };
    window.addEventListener('keydown', onKey);
    cleanups.push(() => window.removeEventListener('keydown', onKey));
    // secret: tap the speaker in the credits 10 times
    const spk = el.querySelector('.spk');
    if (spk) spk.innerHTML = M.icon('soundOn', 'in');
    let spkN = 0;
    if (spk) spk.onclick = e => {
      e.stopPropagation(); spkN++;
      spk.classList.remove('boing'); void spk.offsetWidth; spk.classList.add('boing');
      if (spkN === 10) { spkN = 0; sfx.unlock(); music.play('secret'); M.unlock('secret_song'); M.secret('song', { icon: M.icon('note'), title: 'The secret song', html: '<p>You found the secret song. It is the normal song, but more confident.</p><p class="muted">Hint for another secret: the logo is hungry.</p>' }); }
    };
    // secret: poke the patient behind the menu
    let pokesDemo = 0;
    const onTitleDown = e => {
      if (e.target.closest('button, .logo i, .tagline, .spk, .credits')) return;
      if (!demo) return;
      const cr = canvas.getBoundingClientRect(); E.input.x = ((e.clientX - cr.left) / cr.width) * 2 - 1; E.input.y = -((e.clientY - cr.top) / cr.height) * 2 + 1;
      const hit = E.pickObjects([demo.root]);
      if (!hit) return;
      pokesDemo++; demo.wiggle = 0.4; demo.expr(pick(['surprised', 'angry', 'scared'])); sfx.boing && sfx.boing();
      if (pokesDemo === 7) { M.unlock('poke_demo'); ui.say(() => demo.headTop(), "Can you NOT? I'm just here for the title screen.", { name: 'Title Screen Patient', key: 'demo', hold: 2 }); }
    };
    el.addEventListener('pointerdown', onTitleDown);
    cleanups.push(() => el.removeEventListener('pointerdown', onTitleDown));
    // secret: wait three minutes on the title screen
    const idle = setTimeout(() => { if (demo) { demo.expr('sleep'); M.unlock('waiting'); tag.textContent = 'zzz... the patient fell asleep waiting for you... zzz'; } }, 180000);
    cleanups.push(() => clearTimeout(idle));
    cleanups.push(() => { M.hooks.onAuth = null; });
  });
}

// Phones turned sideways get a one-tap full screen button for a few seconds.
{
  const mq = window.matchMedia('(orientation: landscape) and (pointer: coarse)');
  let shown = false;
  const offer = () => {
    if (!mq.matches || shown || M.isFullscreen() || !document.getElementById('title').classList.contains('hidden')) return;
    shown = true;
    const b = h('button', 'btn small primary fs-float', M.icon('fullscreen', 'in') + ' Full screen');
    b.onclick = () => { b.remove(); M.goFullscreen(); };
    document.getElementById('app').appendChild(b);
    setTimeout(() => b.remove(), 7000);
  };
  if (mq.addEventListener) mq.addEventListener('change', offer);
  window.__offerFullscreen = offer;
}

// Secret words (typed on the title screen, or in the code box in Settings on phones).
function secretWord(w) {
  if (w === 'LINUS') { M.unlock('linus'); setTimeout(() => M.secret('linus', { icon: M.icon('bulb'), title: 'Hi, Linus!', html: '<p>You designed this whole game. That makes you Nurse Pat\'s boss now.</p><p class="muted">She says she is "thrilled." She is not thrilled.</p>' }), 600); }
  else setTimeout(() => M.secret('pat', { icon: M.icon('stethoscope'), title: staffName(), html: '<p>"You typed my name. I heard it. I hear everything."</p>' }), 600);
}

// ---------------- boot ----------------
function backfillEarned() {
  if (M.profile.counters.earnedInit) return;
  let spent = state.upgrades.coats ? 100 : 0;
  for (const u of upgradesNow()) for (let i = 0; i < (state.upgrades[u.id] || 0); i++) spent += u.costs[i] || 0;
  const est = Math.max(0, Math.round(state.money - 200 + (state.stats.paidOut || 0) + spent + (state.stats.costs || 0)));
  M.profile.counters.earned = Math.max(M.counter('earned'), est);
  M.profile.counters.earnedInit = 1;
  M.saveProfile();
}

async function main() {
  window.addEventListener('pointerdown', () => { sfx.unlock(); unlockSpeech(); if (!sfx.muted && !music.current) music.play('title'); }, { once: true });
  backfillEarned();
  M.checkState(state);
  applyTheme();
  startTitleScene();
  document.getElementById('loading')?.remove();
  const mode = await showTitle();
  stopTitleScene();
  setTimeout(() => window.__offerFullscreen && window.__offerFullscreen(), 800);
  if (!sfx.muted) music.play('clinic');
  ui.showHUD(true);
  ui.setHUD({ day: state.day, money: state.money, patient: '' });
  if (mode === 'tutorial' && G.food) { state.tutorialDone = true; writeSave(); await nursePanel("Welcome to Doctor Burger! I'm Manager Pat. Read the order ticket, pick the right station, and don't burn anything.", { button: 'Got it' }); }
  else if (mode === 'tutorial') await runTutorial();
  if (mode === 'skip') { state.tutorialDone = true; writeSave(); }
  // debug: ?game=surgery jumps straight to a mini-game
  const q = new URLSearchParams(location.search);
  if (q.get('day')) state.day = parseInt(q.get('day'), 10) || state.day;
  while (true) await playDay();
}

// debug: ?lineup shows a row of random patients (for checking how they look)
const lineup = new URLSearchParams(location.search).get('lineup');
// debug helpers for testing individual mini-games: ?test=surgery
const test = new URLSearchParams(location.search).get('test');
if (lineup !== null) {
  document.getElementById('loading')?.remove();
  document.getElementById('title').classList.add('hidden');
  const ages = ['kid', 'adult', 'elder', 'teen', 'kid', 'adult', 'teen', 'elder'];
  const wear = new URLSearchParams(location.search).get('wear');   // ?lineup&wear=cape shows department outfits
  if (wear) FLAGS.wear = wear;
  const people = ages.map((a, i) => { const p = new Person(D.randomLook(a, i % 2 ? 'f' : 'm')); p.placeStanding(-2.45 + i * 0.7, 1.4, 0); p.setPose('stand', true); if (lineup === 'expr') p.expr(['smile', 'happy', 'angry', 'sad', 'scared', 'laugh', 'smug', 'ouch'][i]); E.scene.add(p.root); return p; });
  nurse.root.visible = false;
  E.onUpdate((dt, t) => people.forEach(p => p.update(dt, t)));
  E.basePos.set(0, 1.25, 4.6); E.camTarget.set(0, 0.95, 1.4);
  window.__people = people;
} else if (test) {
  (async () => {
    document.getElementById('loading')?.remove();
    document.getElementById('title').classList.add('hidden');
    ui.showHUD(true);
    ui.setHUD({ day: state.day, money: state.money, patient: 'TEST' });
    if (new URLSearchParams(location.search).get('day')) state.day = parseInt(new URLSearchParams(location.search).get('day'), 10) || 1;
    state.seen = ['removal', 'shot', 'blood', 'surgery', 'reflex', 'steth', 'cast', 'chase', 'baby', 'sneeze', 'hide', 'thermo', 'bp', 'otoscope', 'drops', 'bandage', 'xray', 'scooter', 'germs', 'triplets', 'lightsout', 'grill', 'fryer', 'soda', 'sundae', 'assemble'];
    ui.loadSeen(state.seen);
    const step = test;
    const qs = new URLSearchParams(location.search);
    if (qs.get('rank')) state.rank = parseInt(qs.get('rank'), 10) || 0;
    let c = null;
    if (['grill', 'fryer', 'soda', 'sundae', 'assemble'].includes(step)) { state.rank = Math.max(state.rank || 0, C.FOOD_START); c = FD.testOrder(step); }
    applyTheme();
    if (!c) c = step.startsWith('p-') ? D.personaPatient(step.slice(2)) : null;
    if (!c && D.SPECIAL_TYPES.includes(step)) c = D.testSpecialPatient(step);
    if (!c && ['runner', 'baby', 'sneezy', 'hider'].includes(step)) c = D.generateDay(3).find(x => x.special === step) || null;
    if (!c && ['runner', 'baby', 'sneezy', 'hider'].includes(step)) {
      for (let k = 0; k < 40 && !c; k++) c = D.generateDay(4).find(x => x.special === step);
    }
    if (!c) c = D.normalPatient(pick(['adult', 'kid', 'elder', 'teen']), pick(['m', 'f']), step === 'appendix' || step === 'swallowed' ? 'surgery' : step);
    if (step === 'appendix') c.params.surgery = { variant: 'appendix', object: 'appendix', name: 'angry appendix' };
    if (step === 'swallowed') c.params.surgery = { variant: 'object', object: 'duck', name: 'rubber duck' };
    if (new URLSearchParams(location.search).get('variant')) c.params.steth = { variant: new URLSearchParams(location.search).get('variant') };
    window.__testCase = c;
    // test pages: no surprise complaints unless asked for with &wrong (which forces one)
    G.forceWrongOrder = qs.has('wrong');
    const r = await runPatient(c, 0, 1, { noComplaints: !qs.has('wrong') });
    window.__testResult = r;
    console.log('TEST_DONE', JSON.stringify({ stars: r.stars, pay: r.pay, fail: r.fail }));
  })();
} else {
  main();
}
