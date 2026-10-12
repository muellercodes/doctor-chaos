import * as THREE from 'three';
import { createEngine, clamp, rand, pick, TABLE_TOP } from './engine.js';
import { buildRoom } from './room.js';
import { Person, Baby } from './person.js';
import { createUI, h } from './ui.js';
import { sfx, music } from './audio.js';
import * as D from './data.js';
import { clipboard } from './props.js';
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

const GAMES = { removal, shot, blood, surgery, reflex, steth, cast, babyshot: baby };
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ---------------- save ----------------
const SAVE_KEY = 'doctor-chaos-save-v1';
const fresh = () => ({ v: 1, day: 1, money: 200, upgrades: { steady: 0, lawyer: 0, shoes: 0, lolli: 0, coats: 0 }, coat: '#ffffff', tutorialDone: false, seen: [], muted: false, stats: { patients: 0, threeStars: 0, lawsuits: 0, paidOut: 0, bestDay: 0 } });
function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.v === 1) return { ...fresh(), ...s, upgrades: { ...fresh().upgrades, ...s.upgrades }, stats: { ...fresh().stats, ...s.stats } }; } catch (e) { /* ignore */ } return null; }
let state = loadSave() || fresh();
const hadSave = !!loadSave();
function writeSave() { try { state.seen = ui.seenList(); state.muted = sfx.muted; localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }

// ---------------- setup ----------------
const canvas = document.getElementById('gl');
const E = createEngine(canvas);
const R = buildRoom(E.scene);
const ui = createUI(document.getElementById('ui'), E);
ui.loadSeen(state.seen);
ui.onSeen = () => writeSave();
sfx.setMuted(!!state.muted); ui.syncMute();
ui.onMute = m => { state.muted = m; writeSave(); if (m) music.stop(); else music.play('clinic'); };

E.onUpdate(dt => { R.monitor.update(dt); R.updateClock(); });

// nurse NPC
const nurse = new Person({ age: 'adult', gender: 'f', skin: '#c68642', hair: { style: 'bun', color: '#2b1d14' }, shirt: '#b8a1e3', pants: '#9d84d1', shoes: '#ffffff', outfit: 'scrubs', sleeves: 'short' });
nurse.placeStanding(-2.3, -1.2, Math.atan2(2.3, 1.7));
nurse.setPose('stand', true);
nurse.target.shL = [-0.35, 0, 0.12]; nurse.target.elL = [-1.25, 0.2, 0]; nurse.target.shR = [0.05, 0, -0.12]; nurse.target.elR = [-0.25, 0, 0];
const nurseClip = clipboard(); nurseClip.scale.setScalar(0.75); nurseClip.position.set(0.0, -0.3, 0.07); nurseClip.rotation.set(-1.0, 0, 0); nurse.j.elL.add(nurseClip);
E.scene.add(nurse.root);
E.onUpdate((dt, t) => nurse.update(dt, t));
const nurseSay = (text, o = {}) => { nurse.talk(Math.min(2.5, text.length * 0.04)); return ui.say(() => nurse.headTop(), text, { name: 'Nurse Pat', pitch: 1.25, key: 'nurse3d', ...o }); };
const nursePanel = async (text, o) => { nurse.talk(Math.min(2.5, text.length * 0.03)); return ui.nurse(text, o); };

// ---------------- game context ----------------
const G = {
  THREE, E, ui, sfx, music, room: R,
  tutorial: false,
  cur: null,
  get diff() { return clamp((state.day - 1) / 7, 0, 1); },
  get tol() { return 1 + 0.14 * (state.upgrades.steady || 0); },
  upg: k => state.upgrades[k] || 0,
  get coatColor() { return state.coat; },
  bandageColor: '#ffcc80',
  howTo: (id, title, lines, icon) => ui.howTo(id, title, lines, icon),
  addMoney(n) { state.money += n; ui.setHUD({ money: state.money }); },
  mood(d) { if (G.cur) G.cur.mood = clamp(G.cur.mood + d, 0, 100); },
  remark() {
    const P = G.cur; if (!P || !P.c.remarks || !P.c.remarks.length) return;
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
    return ui.say(() => P.person.headTop(), t, { name: P.person instanceof Baby ? P.c.first : P.c.first, pitch: mime ? 0 : P.c.voice, ...o });
  },
};
window.__G = G;
window.__state = () => state;

// ---------------- helpers ----------------
function disposeObj(o) { o.traverse(x => { if (x.geometry) x.geometry.dispose(); }); }
const fmt = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString();

async function enterPatient(P) {
  const { person, parent } = P;
  await E.home(0.6);
  sfx.door();
  await R.openDoor(E, true);
  if (parent) {
    parent.placeStanding(R.door.x, -2.5, 0);
    parent.setPose('stand', true);
    await parent.walkTo(E, R.door.x - 0.2, -1.3, 1.6);
    await parent.walkTo(E, 0.95, 0.65, 1.6);
    await parent.faceTo(E, Math.atan2(-0.95, -0.4), 0.3);
    R.openDoor(E, false); sfx.door();
    person.placeSitting();
    person.root.scale.setScalar(0.01); person.root.visible = true;
    sfx.pop();
    await E.tween(0.3, k => person.root.scale.setScalar(Math.max(0.01, k)));
  } else {
    person.placeStanding(R.door.x, -2.5, 0);
    person.setPose('stand', true);
    await person.walkTo(E, R.door.x - 0.2, -1.3, 1.5);
    R.openDoor(E, false); sfx.door();
    await person.walkTo(E, 0.05, 0.95, 1.5);
    await person.faceTo(E, Math.PI, 0.2);
    await person.hopOnTable(E);
  }
}

async function exitPatient(P) {
  const { person, parent } = P;
  await E.home(0.5);
  if (parent) {
    sfx.pop();
    await E.tween(0.25, k => person.root.scale.setScalar(Math.max(0.01, 1 - k)));
    person.root.visible = false;
    sfx.door(); R.openDoor(E, true);
    await parent.walkTo(E, R.door.x - 0.2, -1.3, 1.8);
    await parent.walkTo(E, R.door.x, -2.9, 1.8);
    parent.root.visible = false;
  } else if (person.root.visible) {
    await person.hopOff(E, 0.45, 0.95);
    sfx.door(); R.openDoor(E, true);
    await person.walkTo(E, R.door.x - 0.2, -1.3, 1.7);
    await person.walkTo(E, R.door.x, -2.9, 1.7);
    person.root.visible = false;
  }
  await R.openDoor(E, false);
}

async function runnerSequence(P) {
  const { person, c } = P;
  person.expr('scared'); person.setPose('scared'); person.wiggle = 0.8;
  sfx.ouch(c.voice);
  await G.say(pick(['Is that a NEEDLE?! NOPE. NOPE NOPE NOPE!', 'Oh no. Oh no no no no. BYE!', "Actually I just remembered I'm late for... ANYTHING ELSE!"]), { key: 'c', hold: 0.3 });
  await person.hopOff(E, 0.6, 0.9);
  sfx.door(); R.openDoor(E, true);
  await person.walkTo(E, R.door.x - 0.2, -1.4, 4.2, true);
  await person.walkTo(E, R.door.x, -2.9, 4.2, true);
  person.root.visible = false;
  R.openDoor(E, false);
  nurseSay('Well don\'t just stand there, Doctor. GET THEM!', { hold: 0.6 });
  await E.wait(0.9);
  ui.flash('rgba(255,255,255,0.9)');
  const r = await chase.play(G, P);
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

function lawsuitAmount(sev) {
  const base = sev >= 3 ? rand(900, 1600) : sev === 2 ? rand(350, 650) : rand(120, 230);
  const raw = base * (1 + (state.day - 1) * 0.08);
  const cut = raw * (1 - 0.2 * (state.upgrades.lawyer || 0));
  return { raw: Math.round(raw / 10) * 10, final: Math.round(cut / 10) * 10 };
}

// ---------------- one patient ----------------
async function runPatient(c, idx, total, hooks = {}) {
  ui.setHUD({ patient: `Patient ${idx + 1}/${total}` });
  let person, parent = null;
  if (c.special === 'baby') {
    parent = new Person(c.parent.look);
    E.scene.add(parent.root);
    person = new Baby(c.baby);
    person.root.visible = false;
  } else person = new Person(c.look);
  E.scene.add(person.root);
  const offU = E.onUpdate((dt, t) => { person.update(dt, t); if (parent) parent.update(dt, t); });
  const P = { person, parent, c, mood: 70 + 5 * (state.upgrades.lolli || 0) };
  G.cur = P;
  await enterPatient(P);
  const showNote = G.tutorial || state.day <= 2;
  if (c.special !== 'baby') {
    person.expr(c.personality === 'mime' ? 'smug' : 'smile');
    await G.say(c.complaint, { key: 'c', hold: 0.8 });
  }
  const results = [];
  let wrong = 0;
  let extra = null;
  for (let i = 0; i < c.steps.length; i++) {
    const step = c.steps[i];
    const tool = D.STEP_TOOL[step];
    ui.chart(c, { note: showNote ? D.STEP_NOTE[step] : null });
    G.stepTool = tool; G.dbg = { kind: 'tool' };
    if (hooks.beforeTool) await hooks.beforeTool(step, i);
    while (true) {
      const t = await ui.pickTool({ title: c.steps.length > 1 ? `Problem ${i + 1} of ${c.steps.length}: pick a tool` : 'Pick the right tool', highlight: G.tutorial ? tool : null });
      if (t === tool) break;
      wrong++; ui.shakeTray(); sfx.bad(); G.mood(-8);
      person.expr('angry');
      if (c.special === 'baby') nurseSay(pick(['That is not for babies, Doctor.', 'The baby is judging you. I am also judging you.']), { hold: 1 });
      else G.say(pick(D.WRONG_TOOL[t]), { key: 'c', hold: 1 });
      if (wrong % 2 === 0) nurseSay(pick(D.NURSE_QUIPS), { hold: 1 });
      if (G.tutorial) await nursePanel(`Close! But Dave needs the one that's <b>glowing</b>.`);
    }
    ui.hideTray(); ui.hideChart(); ui.clearBubbles();
    person.expr('smile');
    if (c.special !== 'baby' && !G.tutorial && i === 0 && Math.random() < 0.35 && !c.special) { G.remark(); await E.wait(1.2); }
    if (hooks.beforeGame) await hooks.beforeGame(step, i);
    // special pre-events
    if (c.special === 'runner' && !extra) {
      extra = await runnerSequence(P);
      if (!extra.caught) { results.push({ score: 0, fail: true, severity: 1, reason: 'chase', step }); break; }
    }
    if (c.special === 'hider' && !extra) {
      person.expr('scared');
      await G.say(pick(['NOPE!', "Nuh-uh! You can't shot what you can't FIND!", 'Is that a needle?! BYE!']), { key: 'c', hold: 0.3 });
      extra = await hide.play(G, P);
    }
    if (c.special === 'sneezy' && !extra) extra = await sneeze.play(G, P);
    let res;
    try {
      res = await GAMES[step].play(G, P, c.params[step] || {});
    } catch (err) {
      console.error('minigame crashed', step, err);
      res = { score: 60, fail: false };
    }
    ui.hint(null); ui.timer.hide(); ui.clearActions();
    res.step = step;
    results.push(res);
    person.setPose && person.setPose('sit');
    await E.home(0.6);
    if (res.fail) break;
  }
  // ---------- evaluate ----------
  const fail = results.some(r => r.fail);
  const severity = Math.max(0, ...results.map(r => r.severity || 0));
  const failRes = results.find(r => r.fail);
  let score = results.reduce((a, r) => a + r.score, 0) / Math.max(1, results.length);
  if (extra && extra.score !== undefined) score = score * 0.8 + extra.score * 0.2;
  score = clamp(score - wrong * 5, 0, 100);
  const stars = fail ? 0 : score >= 85 ? 3 : score >= 60 ? 2 : 1;
  let pay = fail ? 0 : Math.round(c.basePay * [0, 0.55, 0.8, 1][stars]);
  const tip = !fail && stars === 3 && P.mood > 55 ? Math.round(c.basePay * (0.15 + 0.05 * (state.upgrades.lolli || 0))) : 0;
  const escaped = extra && extra.caught === false;
  // reaction
  if (!escaped) {
    if (fail) { person.expr(c.special === 'baby' ? 'cry' : 'angry'); if (c.special === 'baby') await ui.say(() => parent.headTop(), pick(['My lawyer will be calling.', 'We are LEAVING.']), { name: c.parent.title, key: 'parent', hold: 1 }); else await G.say(c.fail || pick(D.FAIL), { key: 'c', hold: 0.8 }); }
    else if (c.special !== 'baby') { person.expr('happy'); await G.say(c.success || pick(D.SUCCESS[c.ageGroup] || D.SUCCESS.adult), { key: 'c', hold: 0.8 }); }
  }
  // results card
  const review = pick(D.REVIEWS[stars]);
  const who = c.special === 'baby' ? `${c.parent.title} of ${c.first}` : `${c.first}${typeof c.age === 'number' ? ', ' + c.age : ''}`;
  sfx[stars === 3 ? 'great' : stars > 0 ? 'good' : 'bad']();
  await ui.card({
    cls: 'result-card',
    html: `<div class="result-name">${c.name}</div>${ui.stars(stars)}
      <div class="result-pay ${pay ? '' : 'zero'}">${pay ? '+' + fmt(pay) : '$0'}${tip ? ` <span class="tip">+${fmt(tip)} tip!</span>` : ''}</div>
      <div class="review">“${review}”<span>${who}</span></div>`,
    buttons: [{ label: fail ? 'Uh oh...' : 'Next', value: true }],
  });
  const earned = pay + tip;
  if (earned) { G.addMoney(earned); sfx.cash(); }
  let lawsuit = null;
  if (fail) {
    const amt = lawsuitAmount(severity);
    lawsuit = { amount: amt.final, raw: amt.raw, reason: failRes.reason };
    sfx.gavel();
    const txt = D.lawsuitText(failRes.reason, c, failRes.step);
    const plaintiff = c.special === 'baby' ? `${c.parent.first} (${c.parent.title} of ${c.first})` : c.name;
    await ui.card({
      cls: 'summons',
      icon: '⚖️',
      title: "YOU'VE BEEN SUED!",
      html: `<div class="case">${plaintiff} <i>v.</i> Doctor Chaos</div>
        <div class="severity sev${severity}">${['', 'Small Claims', 'Serious Lawsuit', 'MEGA LAWSUIT'][severity] || 'Lawsuit'}</div>
        <div class="claim">“${txt}”</div>
        <div class="damages">Damages: <b>${fmt(amt.final)}</b>${amt.final < amt.raw ? `<small>Your lawyer got it down from ${fmt(amt.raw)}.</small>` : ''}</div>`,
      buttons: [{ label: 'Pay up 😬', value: true }],
    });
    G.addMoney(-amt.final);
    sfx.coin();
    state.stats.lawsuits++; state.stats.paidOut += amt.final;
  }
  state.stats.patients++;
  if (stars === 3) state.stats.threeStars++;
  if (!escaped) await exitPatient(P);
  offU();
  E.scene.remove(person.root); disposeObj(person.root);
  if (parent) { E.scene.remove(parent.root); disposeObj(parent.root); }
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
  writeSave();
}

// ---------------- day ----------------
async function playDay() {
  G.tutorial = false;
  const day = state.day;
  ui.showHUD(true);
  ui.setHUD({ day, money: state.money, patient: '' });
  writeSave();
  const list = D.generateDay(day);
  await E.home(0.6);
  await ui.card({
    icon: '🏥',
    title: `Day ${day}`,
    html: `<p><b>${WEEKDAYS[(day - 1) % 7]}.</b> ${list.length} patients in the waiting room.</p><p class="muted">${pick(D.FORECAST)}</p>`,
    buttons: [{ label: 'Open the clinic!', value: true }],
  });
  const startMoney = state.money;
  const out = [];
  for (let i = 0; i < list.length; i++) out.push(await runPatient(list[i], i, list.length));
  await endOfDay(out, startMoney);
}

async function endOfDay(out, startMoney) {
  ui.setHUD({ patient: '' });
  const earned = out.reduce((a, r) => a + r.pay, 0);
  const sued = out.reduce((a, r) => a + (r.lawsuit ? r.lawsuit.amount : 0), 0);
  const starsTotal = out.reduce((a, r) => a + r.stars, 0);
  state.stats.bestDay = Math.max(state.stats.bestDay, earned - sued);
  const rows = out.map(r => `<tr><td>${r.c.name}</td><td class="st">${'★'.repeat(r.stars)}<span class="off">${'★'.repeat(3 - r.stars)}</span></td><td class="pos">${r.pay ? '+' + fmt(r.pay) : ''}</td><td class="neg">${r.lawsuit ? '−' + fmt(r.lawsuit.amount) : ''}</td></tr>`).join('');
  const goodReview = out.filter(r => r.stars >= 2).map(r => r.review)[0];
  const badReview = out.filter(r => r.stars <= 1).map(r => r.review)[0];
  sfx.fanfare();
  await ui.card({
    icon: '🌙',
    title: `Day ${state.day} complete!`,
    cls: 'summary-card',
    html: `<table class="summary">${rows}</table>
      <div class="totals"><div>Earned <b class="pos">${fmt(earned)}</b></div><div>Lawsuits <b class="neg">${fmt(-sued)}</b></div><div>Stars <b>${starsTotal}/15</b></div></div>
      ${goodReview ? `<div class="review small">“${goodReview}”</div>` : ''}${badReview ? `<div class="review small bad">“${badReview}”</div>` : ''}
      <div class="bank">Bank: <b class="${state.money < 0 ? 'neg' : 'pos'}">${fmt(state.money)}</b></div>`,
    buttons: [{ label: 'Next', value: true }],
  });
  state.day++;
  writeSave();
  if (state.money < -1000) {
    sfx.bad();
    const v = await ui.card({
      icon: '🥫',
      title: 'BANKRUPT!',
      html: "<p>The hospital board has replaced you with a vending machine.</p><p class=\"muted\">It only says one thing: “Have you tried drinking water?”</p>",
      buttons: [{ label: 'Start over', value: 'reset', cls: '' }, { label: 'Keep going (debt forgiven)', value: 'keep' }],
    });
    if (v === 'reset') { const keepSeen = state.seen; state = fresh(); state.tutorialDone = true; state.seen = keepSeen; writeSave(); ui.setHUD({ money: state.money }); return; }
    state.money = 0; ui.setHUD({ money: 0 }); writeSave();
  }
  await shop();
}

const UPGRADES = [
  { id: 'steady', name: 'Steady Hands', icon: '🖐️', desc: 'Wider tunnels, bigger targets, friendlier lines.', costs: [250, 500, 900] },
  { id: 'lawyer', name: 'Lawyer on Speed Dial', icon: '💼', desc: 'Every lawsuit costs 20% less per level.', costs: [200, 450, 800] },
  { id: 'shoes', name: 'Running Shoes', icon: '👟', desc: 'Run faster when patients try to escape.', costs: [150, 350, 650] },
  { id: 'lolli', name: 'Lollipop Jar', icon: '🍭', desc: 'Babies calm down faster. Happy patients tip more.', costs: [150, 300, 600] },
];
const COATS = ['#ffffff', '#ff8a2a', '#3a86ff', '#ff5d8f', '#2ec4b6', '#1d2b36', '#9b5de5'];

function shop() {
  return new Promise(res => {
    const modal = ui.modalEl;
    const render = () => {
      modal.innerHTML = '';
      const card = h('div', 'card shop-card');
      card.appendChild(h('div', 'card-icon', '🛒'));
      card.appendChild(h('div', 'card-title', 'Upgrade Shop'));
      card.appendChild(h('div', 'shop-bank', `Bank: <b class="${state.money < 0 ? 'neg' : 'pos'}">${fmt(state.money)}</b>`));
      const list = h('div', 'shop-list');
      for (const u of UPGRADES) {
        const lvl = state.upgrades[u.id] || 0;
        const cost = u.costs[lvl];
        const row = h('div', 'shop-row');
        row.innerHTML = `<div class="shop-icon">${u.icon}</div><div class="shop-info"><b>${u.name}</b><span>${u.desc}</span><div class="dots">${[0, 1, 2].map(i => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</div></div>`;
        const b = h('button', 'btn small ' + (cost !== undefined && state.money >= cost ? 'primary' : ''), cost === undefined ? 'MAX' : fmt(cost));
        b.disabled = cost === undefined || state.money < cost;
        b.onclick = () => { state.money -= cost; state.upgrades[u.id] = lvl + 1; sfx.cash(); ui.setHUD({ money: state.money }); writeSave(); render(); };
        row.appendChild(b);
        list.appendChild(row);
      }
      // coats
      const crow = h('div', 'shop-row');
      if (!state.upgrades.coats) {
        crow.innerHTML = `<div class="shop-icon">🥼</div><div class="shop-info"><b>Fancy Coats</b><span>Unlock coat colors for your doctor (shows in chases).</span></div>`;
        const b = h('button', 'btn small ' + (state.money >= 100 ? 'primary' : ''), '$100');
        b.disabled = state.money < 100;
        b.onclick = () => { state.money -= 100; state.upgrades.coats = 1; sfx.cash(); ui.setHUD({ money: state.money }); writeSave(); render(); };
        crow.appendChild(b);
      } else {
        crow.innerHTML = `<div class="shop-icon">🥼</div><div class="shop-info"><b>Coat color</b><div class="swatches">${COATS.map(cc => `<button class="sw ${cc === state.coat ? 'on' : ''}" data-c="${cc}" style="background:${cc}"></button>`).join('')}</div></div>`;
        crow.querySelectorAll('.sw').forEach(s => (s.onclick = () => { state.coat = s.dataset.c; sfx.click(); writeSave(); render(); }));
      }
      list.appendChild(crow);
      card.appendChild(list);
      const row = h('div', 'card-buttons');
      const next = h('button', 'btn primary', `Start Day ${state.day} ▸`);
      next.onclick = () => { sfx.click(); modal.classList.add('hidden'); modal.innerHTML = ''; res(); };
      row.appendChild(next);
      card.appendChild(row);
      modal.appendChild(card);
      modal.classList.remove('hidden');
    };
    render();
  });
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
  if (demo) { E.scene.remove(demo.root); disposeObj(demo.root); demo = null; }
}

function showTitle() {
  return new Promise(res => {
    const el = document.getElementById('title');
    el.classList.remove('hidden');
    const btns = el.querySelector('.title-buttons');
    btns.innerHTML = '';
    const add = (label, cls, fn) => { const b = h('button', 'btn ' + cls, label); b.onclick = () => { sfx.unlock(); sfx.click(); fn(); }; btns.appendChild(b); return b; };
    const go = mode => { el.classList.add('hidden'); res(mode); };
    if (hadSave && state.tutorialDone) {
      add(`Continue · Day ${state.day}`, 'primary big', () => go('continue'));
      add('New game', '', async () => {
        el.classList.add('hidden');
        const v = await ui.card({ title: 'Start over?', html: '<p>This erases your money, upgrades and days.</p>', buttons: [{ label: 'Cancel', value: false }, { label: 'Yes, start over', value: true }] });
        if (v) { const keepSeen = state.seen; state = fresh(); state.seen = keepSeen; writeSave(); }
        el.classList.remove('hidden');
        if (v) { btns.innerHTML = ''; add('Start with tutorial', 'primary big', () => go('tutorial')); add('Skip tutorial', '', () => go('skip')); }
      });
    } else {
      add('Start your shift', 'primary big', () => go('tutorial'));
      add('Skip tutorial', '', () => go('skip'));
    }
  });
}

// ---------------- boot ----------------
async function main() {
  window.addEventListener('pointerdown', () => { sfx.unlock(); if (!sfx.muted) music.play('clinic'); }, { once: true });
  startTitleScene();
  document.getElementById('loading')?.remove();
  const mode = await showTitle();
  stopTitleScene();
  if (!sfx.muted) music.play('clinic');
  ui.showHUD(true);
  ui.setHUD({ day: state.day, money: state.money, patient: '' });
  if (mode === 'tutorial') await runTutorial();
  if (mode === 'skip') { state.tutorialDone = true; writeSave(); }
  // debug: ?game=surgery jumps straight to a mini-game
  const q = new URLSearchParams(location.search);
  if (q.get('day')) state.day = parseInt(q.get('day'), 10) || state.day;
  while (true) await playDay();
}

// debug helpers for testing individual mini-games: ?test=surgery
const test = new URLSearchParams(location.search).get('test');
if (test) {
  (async () => {
    document.getElementById('loading')?.remove();
    document.getElementById('title').classList.add('hidden');
    ui.showHUD(true);
    ui.setHUD({ day: state.day, money: state.money, patient: 'TEST' });
    state.seen = ['removal', 'shot', 'blood', 'surgery', 'reflex', 'steth', 'cast', 'chase', 'baby', 'sneeze', 'hide'];
    ui.loadSeen(state.seen);
    const step = test;
    let c = step.startsWith('p-') ? D.personaPatient(step.slice(2)) : null;
    if (!c && ['runner', 'baby', 'sneezy', 'hider'].includes(step)) c = D.generateDay(3).find(x => x.special === step) || null;
    if (!c && ['runner', 'baby', 'sneezy', 'hider'].includes(step)) {
      for (let k = 0; k < 40 && !c; k++) c = D.generateDay(4).find(x => x.special === step);
    }
    if (!c) c = D.normalPatient(pick(['adult', 'kid', 'elder', 'teen']), pick(['m', 'f']), step === 'appendix' || step === 'swallowed' ? 'surgery' : step);
    if (step === 'appendix') c.params.surgery = { variant: 'appendix', object: 'appendix', name: 'angry appendix' };
    if (step === 'swallowed') c.params.surgery = { variant: 'object', object: 'duck', name: 'rubber duck' };
    if (new URLSearchParams(location.search).get('variant')) c.params.steth = { variant: new URLSearchParams(location.search).get('variant') };
    window.__testCase = c;
    const r = await runPatient(c, 0, 1);
    window.__testResult = r;
    console.log('TEST_DONE', JSON.stringify({ stars: r.stars, pay: r.pay, fail: r.fail }));
  })();
} else {
  main();
}
