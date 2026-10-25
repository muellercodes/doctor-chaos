// Everything around the game itself: settings, achievements, secrets and codes,
// accounts, cloud saves and leaderboards.
import { sfx, music } from './audio.js';
import { h } from './ui.js';
import { icon } from './icons.js';
export { icon };

export const VERSION = '1.5.0';

const load = k => { try { return JSON.parse(localStorage.getItem(k) || 'null') || {}; } catch (e) { return {}; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString();

// Hooks the game fills in (money, save data, live settings).
export const hooks = {};

// ---------------- settings ----------------
const SET_KEY = 'doctor-chaos-settings-v1';
export const settings = { sfx: 1, music: 1, voices: true, talk: 'normal', quality: 'auto', shake: true, bigText: false, cheats: {}, ...load(SET_KEY) };
settings.cheats = { ...(settings.cheats || {}) };
export function saveSettings() { store(SET_KEY, settings); }
export function applySettings() {
  sfx.setVolumes(settings.sfx, settings.music);
  document.body.classList.toggle('big-text', !!settings.bigText);
  if (hooks.applySettings) hooks.applySettings(settings);
}

// ---------------- save slots ----------------
// Every account on this device gets its own save and profile. Playing without an account uses the
// "guest" slot. Nothing is ever copied from one account to another.
const AUTH_KEY = 'doctor-chaos-auth-v1';
export const auth = { token: null, username: null, ...load(AUTH_KEY) };
export const SAVE_BASE = 'doctor-chaos-save-v1';
const PRO_KEY = 'doctor-chaos-profile-v1';
const slotOf = name => (name ? ':' + String(name).toLowerCase() : '');
export const slotKey = (base, name = auth.username) => base + slotOf(name);
export const saveKey = () => slotKey(SAVE_BASE);
function moveSlot(fromName, toName) {
  try {
    for (const base of [SAVE_BASE, PRO_KEY]) {
      const v = localStorage.getItem(slotKey(base, fromName));
      if (v != null) { localStorage.setItem(slotKey(base, toName), v); localStorage.removeItem(slotKey(base, fromName)); }
    }
  } catch (e) { /* storage blocked */ }
}
// One-time move for devices that played before slots existed: the device save belonged to whoever was logged in.
try {
  if (!localStorage.getItem('doctor-chaos-slots-v2')) {
    if (auth.username && localStorage.getItem(slotKey(SAVE_BASE)) == null) moveSlot(null, auth.username);
    localStorage.setItem('doctor-chaos-slots-v2', '1');
  }
} catch (e) { /* ignore */ }
function guestProgress() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_BASE) || 'null');
    if (!s || (s.day <= 1 && !s.tutorialDone)) return null;
    return s;
  } catch (e) { return null; }
}

// ---------------- profile (kept across "New game") ----------------
export const profile = { ach: {}, secrets: {}, codes: {}, counters: {}, ...load(slotKey(PRO_KEY)) };
for (const k of ['ach', 'secrets', 'codes', 'counters']) profile[k] = { ...(profile[k] || {}) };
export function saveProfile() { store(slotKey(PRO_KEY), profile); queueSync(); }
export function bump(name, n = 1) { profile.counters[name] = (profile.counters[name] || 0) + n; saveProfile(); return profile.counters[name]; }
export function counter(name) { return profile.counters[name] || 0; }

// ---------------- overlay panels (work on top of the title screen too) ----------------
const app = document.getElementById('app');
const overlay = h('div', 'overlay hidden'); app.appendChild(overlay);
const toasts = h('div', 'toasts'); app.appendChild(toasts);
let panelClose = null;

export function panel(build, { cls = '' } = {}) {
  if (panelClose) panelClose(null);
  return new Promise(res => {
    overlay.innerHTML = '';
    overlay.classList.remove('hidden');
    const card = h('div', 'card panel ' + cls);
    const x = h('button', 'panel-x', icon('close')); x.setAttribute('aria-label', 'Close');
    card.appendChild(x);
    const close = v => { if (panelClose !== close) return; panelClose = null; overlay.classList.add('hidden'); overlay.innerHTML = ''; res(v); };
    panelClose = close;
    x.onclick = () => { sfx.click(); close(null); };
    overlay.onclick = e => { if (e.target === overlay) close(null); };
    build(card, close);
    overlay.appendChild(card);
  });
}
export function isPanelOpen() { return !!panelClose; }

export function message({ icon = '', title = '', html = '', buttons = [{ label: 'OK', value: true, cls: 'primary' }], cls = '' }) {
  return panel((card, close) => {
    if (icon) card.appendChild(h('div', 'card-icon', icon));
    if (title) card.appendChild(h('div', 'card-title', title));
    card.appendChild(h('div', 'card-body', html));
    const row = h('div', 'card-buttons');
    for (const b of buttons) { const el = h('button', 'btn ' + (b.cls || ''), b.label); el.onclick = () => { sfx.click(); close(b.value); }; row.appendChild(el); }
    card.appendChild(row);
  }, { cls });
}

// A found secret: shows a note and remembers it.
export function secret(id, { icon: ic = icon('sparkle'), title = 'Secret found!', html = '' } = {}) {
  const first = !profile.secrets[id];
  profile.secrets[id] = profile.secrets[id] || Date.now();
  saveProfile();
  sfx.ding && sfx.ding();
  return message({ icon: ic, title: first ? title : title + ' (again)', html, cls: 'secret-card', buttons: [{ label: 'Nice', value: true, cls: 'primary' }] });
}

// ---------------- achievements ----------------
export const ACHIEVEMENTS = [
  { id: 'first_patient', icon: 'stethoscope', name: 'First Day Jitters', desc: 'Treat your first patient.' },
  { id: 'orientation', icon: 'gradcap', name: 'Orientation Survivor', desc: "Finish Nurse Pat's orientation." },
  { id: 'three_stars', icon: 'star', name: 'Gold Star', desc: 'Get 3 stars on a patient.' },
  { id: 'perfect_day', icon: 'bigstar', name: 'Flawless Shift', desc: 'Get all 15 stars in one day.' },
  { id: 'day5', icon: 'calendar:5', name: 'Work Week', desc: 'Reach day 5.' },
  { id: 'day10', icon: 'calendar:10', name: 'Double Digits', desc: 'Reach day 10.' },
  { id: 'day25', icon: 'medal:25', name: 'Clinic Legend', desc: 'Reach day 25.' },
  { id: 'day50', icon: 'elder', name: 'Retirement Is a Myth', desc: 'Reach day 50.' },
  { id: 'money1k', icon: 'cash', name: 'Four Figures', desc: 'Have $1,000 in the bank.' },
  { id: 'money5k', icon: 'moneybag', name: 'Doctor Moneybags', desc: 'Have $5,000 in the bank.' },
  { id: 'money20k', icon: 'bank', name: 'Basically a Bank', desc: 'Have $20,000 in the bank.' },
  { id: 'patients25', icon: 'people', name: 'Full Waiting Room', desc: 'Treat 25 patients.' },
  { id: 'patients100', icon: 'hospital', name: 'Hundred Club', desc: 'Treat 100 patients.' },
  { id: 'tips10', icon: 'jar', name: 'Tip Jar', desc: 'Get 10 tips from happy patients.' },
  { id: 'first_lawsuit', icon: 'scales', name: 'Lawyered', desc: 'Get sued for the first time.' },
  { id: 'lawsuits10', icon: 'scroll', name: 'Frequent Defendant', desc: 'Get sued 10 times. The judge knows your name now.' },
  { id: 'mega_lawsuit', icon: 'boom', name: 'Objection!', desc: 'Get hit with a MEGA lawsuit.' },
  { id: 'bankrupt', icon: 'can', name: 'Replaced by a Vending Machine', desc: 'Go bankrupt.' },
  { id: 'caught_runner', icon: 'runner', name: 'Hallway Monitor', desc: 'Catch a runaway patient.' },
  { id: 'caught_scooter', icon: 'wheelchair', name: 'Wheelchair Grand Prix', desc: 'Catch the scooter thief.' },
  { id: 'germ_king', icon: 'crown', name: 'Royal Pain', desc: 'Defeat the King Germ.' },
  { id: 'triplets_first', icon: 'twins', name: 'Triplet Detector', desc: 'Pick the sick triplet on the first try.' },
  { id: 'lights_found', icon: 'flashlight', name: 'Night Vision', desc: 'Find the kid in the dark.' },
  { id: 'hider_found', icon: 'peek', name: 'Hide and Seek Champion', desc: 'Find a hiding patient.' },
  { id: 'baby_calm', icon: 'baby', name: 'Baby Whisperer', desc: 'Give a baby their shot.' },
  { id: 'all_specials', icon: 'tent', name: 'Seen It All', desc: 'Meet every kind of special patient.' },
  { id: 'maxed', icon: 'wrench', name: 'Fully Loaded', desc: 'Max out every upgrade.' },
  { id: 'fashion', icon: 'coat', name: 'Fashion Doctor', desc: 'Change your coat color.' },
  { id: 'kicked', icon: 'foot', name: 'Face, Meet Foot', desc: 'Get kicked in the face during a reflex test.' },
  { id: 'hammer_time', icon: 'reflex', name: 'Hammer Time', desc: 'Bonk the wrong spot 3 times in a row.' },
  { id: 'wrong_tools', icon: 'screwdriver', name: 'Is This a Scalpel?', desc: 'Pick the wrong tool 5 times on one patient.' },
  { id: 'zero_day', icon: 'melt', name: 'Zero Stars, Full Heart', desc: 'Finish a whole day with zero stars.' },
  { id: 'in_debt', icon: 'chartDown', name: 'Negative Vibes', desc: 'Have less than $0 in the bank.' },
  { id: 'vampire_blood', icon: 'vampire', name: 'Blood Bank', desc: 'Take blood from a vampire. He is not thrilled.' },
  { id: 'escaped', icon: 'wind', name: 'They Went That Way', desc: 'Let a patient escape.' },
  { id: 'all_tools', icon: 'sparkle', name: 'Tool Collector', desc: 'Use every single tool in the tray at least once.' },
  { id: 'xray_perfect', icon: 'xray', name: 'Say Cheese', desc: 'Take a perfect X-ray on the first try.' },
  { id: 'promoted', icon: 'medal:1', name: 'Moving On Up', desc: 'Get promoted by maxing out every upgrade.' },
  { id: 'director', icon: 'crown', name: 'Corner Office', desc: 'Become Hospital Director.' },
  { id: 'legend', icon: 'bigstar', name: 'Legend of Medicine', desc: 'Reach the very top rank.' },
  { id: 'inspector', icon: 'scroll', name: 'Passed Inspection', desc: 'Get 3 stars while the inspector watches.' },
  { id: 'code1', icon: 'lock', name: 'Code Breaker', desc: 'Enter a secret code.' },
  { id: 'code_all', icon: 'detective', name: 'Master Hacker', desc: 'Enter every secret code.' },
  { id: 'night_owl', icon: 'owl', name: 'Night Shift (Literally)', desc: 'Play between midnight and 4 AM.', secret: true },
  { id: 'konami', icon: 'joystick', name: 'Old School', desc: 'Enter a very old cheat code on the title screen.', secret: true },
  { id: 'tacos', icon: 'taco', name: 'Taco Tuesday', desc: 'Make it rain tacos.', secret: true },
  { id: 'roach', icon: 'roach', name: 'Health Code Violation', desc: 'Find the roach.', secret: true },
  { id: 'linus', icon: 'bulb', name: 'The Boss', desc: "Say the designer's name.", secret: true },
  { id: 'fine_print', icon: 'magnifier', name: 'Fine Print', desc: 'Find the hidden tagline.', secret: true },
  { id: 'secret_song', icon: 'note', name: 'Secret Song', desc: 'Find the secret song.', secret: true },
  { id: 'poke_demo', icon: 'point', name: 'Stop Poking Me', desc: 'Poke the patient on the title screen. A lot.', secret: true },
  { id: 'dev_mode', icon: 'laptop', name: 'Not a Developer', desc: 'Try to unlock developer mode.', secret: true },
  { id: 'waiting', icon: 'sleepFace', name: 'Waiting Room Champion', desc: 'Sit on the title screen for 3 whole minutes.', secret: true },
  { id: 'clock', icon: 'alarm', name: 'Time Traveler', desc: 'Mess with the clock.', secret: true },
  { id: 'plant', icon: 'plant', name: 'Plant Whisperer', desc: 'Give the plant some attention.', secret: true },
  { id: 'nurse_poke', icon: 'speech', name: 'Nurse Pat Knows Things', desc: 'Bother Nurse Pat until she tells you something.', secret: true },
  { id: 'sound_toggle', icon: 'soundOff', name: 'Sound of Silence', desc: 'Turn the sound off and on 10 times in a row.', secret: true },
  { id: 'coffee', icon: 'coffee', name: 'Coffee Break', desc: 'Leave a patient waiting for 2 minutes. They grew a beard.', secret: true },
  { id: 'flatline', icon: 'heart', name: 'Have You Tried Unplugging It?', desc: 'Annoy the heart monitor.', secret: true },
  { id: 'funny_bone', icon: 'bone', name: 'Funny Bone', desc: 'Find the funny bone. It is not funny. It is a bone.', secret: true },
  { id: 'cat_day', icon: 'cat', name: 'Lucky Day 13', desc: 'Meet the clinic cat.', secret: true },
  { id: 'nap', icon: 'sleepFace', name: 'Power Nap', desc: 'Find out what the pause button really does.', secret: true },
  { id: 'ach20', icon: 'trophy', name: 'Achievement Hunter', desc: 'Unlock 20 achievements.' },
  { id: 'ach_all', icon: 'sprout', name: 'Touch Grass', desc: 'Unlock every other achievement. Then go outside.' },
];
const ACH = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));
export const unlockedCount = () => ACHIEVEMENTS.filter(a => profile.ach[a.id]).length;

const toastQ = [];
let toasting = false;
function showToast(a) {
  toastQ.push(a);
  if (toasting) return;
  const next = () => {
    const t = toastQ.shift();
    if (!t) { toasting = false; return; }
    toasting = true;
    const el = h('div', 'toast', `<div class="toast-icon">${icon(t.icon)}</div><div><small>Achievement unlocked!</small><b>${esc(t.name)}</b></div>`);
    toasts.appendChild(el);
    try { sfx.coin(); } catch (e) { /* ignore */ }
    setTimeout(() => el.classList.add('out'), 3000);
    setTimeout(() => { el.remove(); next(); }, 3400);
  };
  next();
}

export function unlock(id) {
  const a = ACH[id];
  if (!a || profile.ach[id]) return false;
  profile.ach[id] = Date.now();
  saveProfile();
  showToast(a);
  const n = unlockedCount();
  if (n >= 20) unlock('ach20');
  if (ACHIEVEMENTS.every(x => x.id === 'ach_all' || profile.ach[x.id])) unlock('ach_all');
  return true;
}
export const has = id => !!profile.ach[id];

// Checks that only need the save state.
export function checkState(state) {
  if (!state) return;
  const m = state.money, d = state.day, st = state.stats || {};
  if (m >= 1000) unlock('money1k');
  if (m >= 5000) unlock('money5k');
  if (m >= 20000) unlock('money20k');
  if (m < 0) unlock('in_debt');
  if (d >= 5) unlock('day5');
  if (d >= 10) unlock('day10');
  if (d >= 25) unlock('day25');
  if (d >= 50) unlock('day50');
  if (st.patients >= 1) unlock('first_patient');
  if (st.patients >= 25) unlock('patients25');
  if (st.patients >= 100) unlock('patients100');
  if (st.lawsuits >= 1) unlock('first_lawsuit');
  if (st.lawsuits >= 10) unlock('lawsuits10');
  const u = state.upgrades || {};
  if ((u.steady || 0) >= 3 && (u.lawyer || 0) >= 3 && (u.shoes || 0) >= 3 && (u.lolli || 0) >= 3 && u.coats) unlock('maxed');
  if (counter('tips') >= 10) unlock('tips10');
  const met = profile.counters.specialsMet || {};
  if (typeof met === 'object' && hooks.specialTypes && hooks.specialTypes.every(t => met[t])) unlock('all_specials');
  const hr = new Date().getHours();
  if (hr >= 0 && hr < 4) unlock('night_owl');
}
export function usedTool(id, all) {
  const used = typeof profile.counters.toolsUsed === 'object' ? profile.counters.toolsUsed : {};
  if (!used[id]) { used[id] = 1; profile.counters.toolsUsed = used; saveProfile(); }
  if (all.every(t => used[t])) unlock('all_tools');
}
export function metSpecial(type) {
  const met = typeof profile.counters.specialsMet === 'object' ? profile.counters.specialsMet : {};
  met[type] = 1; profile.counters.specialsMet = met; saveProfile();
}

export function openAchievements() {
  return panel(card => {
    card.appendChild(h('div', 'card-icon', icon('trophy')));
    card.appendChild(h('div', 'card-title', 'Achievements'));
    card.appendChild(h('div', 'ach-count', `${unlockedCount()} of ${ACHIEVEMENTS.length} unlocked`));
    const list = h('div', 'ach-list');
    for (const a of ACHIEVEMENTS) {
      const got = !!profile.ach[a.id];
      const hidden = a.secret && !got;
      const row = h('div', 'ach' + (got ? ' got' : ''));
      row.innerHTML = `<div class="ach-icon">${icon(hidden ? 'lock' : a.icon)}</div><div class="ach-info"><b>${hidden ? 'Secret achievement' : esc(a.name)}</b><span>${hidden ? 'Keep poking around. Seriously, poke things.' : esc(a.desc)}</span></div>`;
      list.appendChild(row);
    }
    card.appendChild(list);
  }, { cls: 'ach-panel' });
}

// ---------------- secret codes ----------------
// Secret codes. The game only keeps a hash of each code word plus a description scrambled with the
// word itself, so reading the source does not give the codes away.
const codeHash = w => { let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995; for (const ch of w) { const c = ch.charCodeAt(0); a = Math.imul(a ^ c, 0x01000193) >>> 0; b = Math.imul(b ^ c, 0x5bd1e995) >>> 0; b = (b ^ (b >>> 15)) >>> 0; } return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0'); };
function unscramble(d, w) {
  try {
    const bin = atob(d), k = new TextEncoder().encode(w + '#doctorchaos');
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) ^ k[i % k.length];
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (e) { return null; }
}
const CODE_TABLE = [
  { h: '9aab47983e1b0ddd', d: 'K2stKiEgcRlGPwoXBB4GSCwAHTUwYWduITZQB01ZVisTFQ1BPxozIi8uP2U/RgIbQw0AB0NUA1FXZXlzd2MnbQMNAUMVTxgCGk9NX3IkLCUpPHEZUV9TCQ==' },
  { h: '83558c3fff72fb34', d: 'M2MtKig3AV5NLxEKBkMrABwbam1hLyAhQEZVQUgNTEdZTVxAf31sKXtySREcF1QOAhMNAB0WLGEqJWUrTBEdQxUMEQwdDxtdaA8sKSo2WkQOEB9PGgwfT01faiwsJSArAV5eUEdYDw==' },
  { h: '184f3bcd8497dd67', d: 'KGwvIiZGRlVBIgocBwEPCFMeLyIrIk0BTykVDBkTBxVNX3EqJDAoAV5NNxwKUgAHFB0HOyE0MC4DEgoNEAYcBEgMDhA7Jy8ma1MFBgdUAAcXSF0NTXd8dHN3DAZRQxUBFkMJQQ0SNG4uJWtTFgoXDgoeEEZDQ1E+IS8mMgFeXVZEEg==' },
  { h: 'd879727715e8ba3c', d: 'OWspKSgkZhlGLQoTTzoGCQVPPi0tImppYyBGFwxBTk03FQ0TFlMyKDMhIC8wAwoAFFQHExBIAE8FJzs+aCcoIwMMCgIQQVIuDQUGECMlKzFlIitNBwoRGgYcBEZDQ1EhISIpMWN+AQYGBBwKEwdKHA==' },
  { h: 'f51b2bb7dfc850df', d: 'K2M8NTRGRlVBJA4AFxFBIhw0JHB4e0cBHABWVVAmHgQdCj8vN3Q+RhAcQxVPAgIaFRZTOCAmenlmEgoNVAsHEQEPCFMjNCAzPFEdQUFYTRELDQAbUWpjIjUrVx1NHg==' },
  { h: '3776664ad327bd74', d: 'KHM7JCwuexlGPBIBChMIEUE5HDoyMDZjZ3tHARwAVlVQJh4EHQo8PzBlMiQsTQAcQxgGGQZIFQcWKnEmMiAnNUwTCgdUDlIBCQ0DHDw/e2dtaTpLAQ4XVlVQEBkUChI4KHc4' },
  { h: '3702a3ede0ee7329', d: 'IW0hLCQgcRlGNQwbAhsGG0NDUT4qPC5rf3FzBRsKEQEGEEgWDh8xbyYjaTc2QggDGlhPAAYJDQMKeikuPj1rcQ9GDAsRDgZBUkMVHDUiJig6Zy4=' },
  { h: '19181530f670fba1', d: 'PGohMjlGRlVBJx8dDAMYTzArISE6NwFITQcRHBFBUkM7GyJoIzozSxAcQxUdF0MMCAJTJiYrcyRWFh8PEU8cDB9PTz0yOjw2dHMFG0MQABcQSA8AB2ckJjgxAw0bTVZDUAAABA4HZXJtICRMCwQaVhI=' },
  { h: 'bb5b46a1c8ab04b5', d: 'OXAvNyhGRlVBNh0TFQ1BPxI2OyQ4MQFITQcRHBFBUkMuUzE6JDMxAwsJQzYdExUNQT8SNjskODEDFxsKFwQXERtBDh0mcn00ewdVX1NIQBBdSAcAAWImKTNlUBAGAB8KAEMOFAEXbHBtdChMCgoaVlVDU1gc' },
  { h: 'a76274bdeabfe23c', d: 'PmM8Niw9AV5NJhUdBQIQQSwcKS03NDU3UUZDQRAKAQBKW00yZTIxPiQ2QAFPDgEcFxYFQQ0cMCY6I2EhTBEdQxEOABQJGU8QKi0+MiIsSgsBQxIAAENUA1FXcXFia246HUpPJAYAARBGQT0aJil+dyMtV0QIERscAU1KTU0eKi83LmNiF1RfHg==' },
  { h: '0e69a219eb1d8c9e', d: 'PXcgLzQnbXRnZREBDQ1PMAwGBE1fZDErPTpgdWwcTBEdQxIaHA0RQQ0cKDBuJypiOCE3VwxPXxZRVlBYUVNcJGtuOjZiPC0sRgoMBlpPOxdIDQ4GIT0rKnk2JytlVAwADxFPBgoFBEFRancjITcnNmx/EFRfHg==' },
  { h: '819cae7daef8aa01', d: 'NmchNk4BTVlWLBMXSCQOAT5nY3VHARwAVlVQJh4EHQptNS4jSgEBF1QHExBIAg4HbSAuJVBEAQwDQVItHRMcFm0VLiMDDRxDFQMeBhoGBhBtMSB3VwwGEFpNXkELCQoSOWd1dUAFGxBWEg==' },
  { h: 'b6811559106fd3dc', d: 'NWM+NSQoZxlGIQIETz8MBgQWUWJjNDE6LmcZRjYMAU8cAhgRChduLj50PSUgAwcAFhcHUgIGBU8VITQ+MGlxJx1AXVZEU10BVkEGHW41ODFpLjBQDAYMGhxcQURDAhwgJCl2c39wExk=' },
  { h: '4b880d936271dab2', d: 'L2stKjkqYXEBMAYOEU87EEgsAB0xMGFndismOEBGVUEgBxdDCw0AED9pKyowb38pHUBZU0RTXQFWQRsSJCwnayAgYz9LAU8BFQwZTUg1Bh4xaTEuNSMvMgMNHEMZABwGEU9NX3YkLCUxNmFxFVRfHg==' },
  { h: 'c476f5c155d46299', d: 'OWcrMS8qbWoBNgABGxtSNQcIDBYxZ2lyJio8MwFeTSIYA1ITCRUGFiwxNnA2LiM7AwgGCBFPAAwKDhsAYisqJ2xvDRVmNEFDNiA9M0ZDQ1EhLSAxNm11clELDQwATQ8=' },
];
export const CODE_COUNT = CODE_TABLE.length;
// older saves stored the code word itself; move those to the hash
function migrateCodes() {
  for (const k of Object.keys(profile.codes)) {
    if (/^[A-Z]+$/.test(k)) {
      const row = CODE_TABLE.find(r => r.h === codeHash(k)); const info = row && unscramble(row.d, k);
      delete profile.codes[k];
      if (info && !profile.codes[row.h]) profile.codes[row.h] = { t: Date.now(), name: info.name, cheat: info.cheat || null };
    }
  }
}
migrateCodes();
export const CHEAT_NAMES = { bighead: 'Big Head Mode', party: 'Party Mode', squeaky: 'Squeaky Voices', zoomies: 'Zoomies', spooky: 'Spooky Clinic', cats: 'Cat Ears', robot: 'Robot Voices' };

export function enterCode(raw) {
  const code = String(raw || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (!code) return { ok: false, msg: 'Type a code first.' };
  const hsh = codeHash(code);
  const row = CODE_TABLE.find(r => r.h === hsh);
  const c = row && unscramble(row.d, code);
  if (!c) return { ok: false, msg: pickOne(['Nope. That is not a code.', 'Nurse Pat shakes her head slowly.', 'Wrong. The computer is laughing at you.', 'Not a code. Nice try though.']) };
  if (profile.codes[hsh]) return { ok: false, msg: `You already used ${code}. ${c.cheat ? 'Turn it on or off below.' : 'No double-dipping.'}` };
  profile.codes[hsh] = { t: Date.now(), name: c.name, cheat: c.cheat || null };
  if (c.money && hooks.addMoney) hooks.addMoney(c.money);
  if (c.cheat) { settings.cheats[c.cheat] = true; saveSettings(); applySettings(); }
  saveProfile();
  unlock('code1');
  if (CODE_TABLE.every(r => profile.codes[r.h])) unlock('code_all');
  return { ok: true, msg: `<b>${c.name}!</b> ${c.desc}` };
}
function pickOne(a) { return a[Math.floor(Math.random() * a.length)]; }

// ---------------- full screen ----------------
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia('(display-mode: fullscreen)').matches || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const canFullscreen = () => !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
export const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement) || standalone();
export async function goFullscreen() {
  if (isFullscreen()) {
    try { if (document.exitFullscreen) await document.exitFullscreen(); else if (document.webkitExitFullscreen) document.webkitExitFullscreen(); } catch (e) { /* ignore */ }
    return;
  }
  const el = document.documentElement;
  if (canFullscreen() && !(isIOS() && !el.requestFullscreen)) {
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' }); else el.webkitRequestFullscreen();
      try { await screen.orientation.lock('landscape'); } catch (e) { /* not supported, fine */ }
      return;
    } catch (e) { /* fall through to instructions */ }
  }
  if (isIOS()) {
    return message({
      icon: icon('phone'), title: 'Full screen on iPhone',
      html: `<p>iPhones don't let websites go full screen, but there's a trick:</p>
        <ol class="steps"><li>Tap the <b>Share</b> button <span class="kbd">${icon('share', 'in')}</span> in Safari.</li><li>Tap <b>Add to Home Screen</b>.</li><li>Open <b>Doctor Chaos</b> from your home screen.</li></ol>
        <p>It opens with no browser bars at all. Your progress comes with you if you have an account.</p>`,
    });
  }
  return message({ icon: icon('fullscreen'), title: 'No full screen here', html: '<p>This browser does not allow full screen. Try Chrome, or turn your phone sideways and scroll the page up a little to hide the address bar.</p>' });
}

// ---------------- accounts & cloud ----------------
const API = location.hostname.endsWith('github.io') ? 'https://doctor-chaos.pages.dev/api' : '/api';
async function api(path, { method = 'GET', body, authed = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authed && auth.token) headers.Authorization = 'Bearer ' + auth.token;
  let res;
  try { res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); } catch (e) { return { ok: false, error: "Can't reach the server. Check your internet." }; }
  let data = null;
  try { data = await res.json(); } catch (e) { /* not json */ }
  if (!res.ok || !data) {
    if (res.status === 401 && authed) { setAuth(null); }
    return { ok: false, error: (data && data.error) || (res.status === 404 ? 'Accounts are not available on this copy of the game.' : 'Something went wrong. Try again in a bit.') };
  }
  return { ok: true, ...data };
}
function setAuth(a) {
  auth.token = a ? a.token : null; auth.username = a ? a.username : null;
  if (a) store(AUTH_KEY, { token: auth.token, username: auth.username }); else { try { localStorage.removeItem(AUTH_KEY); } catch (e) { /* ignore */ } }
  if (hooks.onAuth) hooks.onAuth(auth);
}
export const loggedIn = () => !!auth.token;
// The account named exactly "Creater" gets a guide to every secret (the server checks too).
export const isCreator = () => !!auth.token && auth.username === 'Creater';
export function openGuide() {
  return panel(async card => {
    card.appendChild(h('div', 'card-icon', icon('book')));
    card.appendChild(h('div', 'card-title', 'The Secret Guide'));
    const body = h('div', 'guide', '<div class="lb-msg">Unlocking the vault…</div>');
    card.appendChild(body);
    const r = await api('/guide', { authed: true });
    if (!r.ok) { body.innerHTML = `<div class="lb-msg">${esc(r.error)}</div>`; return; }
    body.innerHTML = '<p class="muted">For the creator only. Tap a secret to reveal how to find it.</p>' + r.guide.map(sec => `<h3>${esc(sec.title)}</h3>` + sec.items.map(([name, how]) => {
      return `<details class="g-item"><summary>${esc(name)}</summary><p>${esc(how)}</p></details>`;
    }).join('')).join('');
  }, { cls: 'guide-panel' });
}

// ---------------- gifts and the admin panel ----------------
// Gifts wait on the server until the player's game picks them up (at boot, at the start of a day, in the shop).
let claiming = false;
export async function claimGifts() {
  if (!auth.token || claiming || !hooks.applyGift) return;
  claiming = true;
  try {
    const r = await api('/gifts', { method: 'POST', authed: true });
    if (!r.ok || !r.gifts || !r.gifts.length) return;
    const lines = [];
    for (const g of r.gifts) {
      const res = hooks.applyGift(g) || { names: [] };
      const bits = [];
      if (g.money) bits.push(`<b>${fmt(g.money)}</b>`);
      bits.push(...res.names.map(esc));
      if (bits.length) lines.push(`<li>${bits.join(', ')}</li>`);
    }
    sfx.great();
    const from = r.gifts[0].from || 'the creator';
    await message({ icon: icon('gift'), title: `A gift from ${esc(from)}!`, html: `<ul class="gift-list">${lines.join('')}</ul><p class="muted">Gifted money does not count toward the money-earned leaderboard.</p>`, buttons: [{ label: 'Thank you!', value: true, cls: 'primary' }] });
    queueSync(true);
  } finally { claiming = false; }
}
export const isAdmin = isCreator;
export function openAdmin() {
  return panel((card, close) => {
    let users = [], filter = '', pick = null;
    const render = () => {
      card.querySelectorAll(':scope > :not(.panel-x)').forEach(n => n.remove());
      card.appendChild(h('div', 'card-icon', icon('shield')));
      card.appendChild(h('div', 'card-title', 'Admin Panel'));
      if (!pick) {
        card.appendChild(h('p', 'muted', 'Send money and upgrades to any player, or to yourself. Only the Creater account can open this.'));
        const search = h('input', 'admin-search'); search.placeholder = 'Find a player'; search.value = filter;
        search.oninput = () => { filter = search.value; drawList(); };
        card.appendChild(search);
        const box = h('div', 'admin-list'); card.appendChild(box);
        const drawList = () => {
          if (!users.length) { box.innerHTML = '<div class="lb-msg">Loading players…</div>'; return; }
          const me = users.find(u => u.username === auth.username);
          const rest = users.filter(u => u !== me && u.username.toLowerCase().includes(filter.toLowerCase()));
          box.innerHTML = '';
          for (const u of (me && (!filter || me.username.toLowerCase().includes(filter.toLowerCase())) ? [me, ...rest] : rest)) {
            const b = h('button', 'admin-user' + (u === me ? ' me' : ''), `<b>${esc(u.username)}${u === me ? ' (you)' : ''}</b><span>Day ${u.days || 0} · ${fmt(u.earned || 0)} earned</span>`);
            b.onclick = () => { sfx.click(); pick = u; render(); };
            box.appendChild(b);
          }
          if (!box.children.length) box.innerHTML = '<div class="lb-msg">Nobody by that name.</div>';
        };
        drawList();
        if (!users.length) api('/admin/users', { authed: true }).then(r => { if (!r.ok) { box.innerHTML = `<div class="lb-msg">${esc(r.error)}</div>`; return; } users = r.users || []; drawList(); });
        return;
      }
      // one player
      const gift = { money: 0, upgrades: {} };
      card.appendChild(h('div', 'admin-who', `To: <b>${esc(pick.username)}</b>${pick.username === auth.username ? ' (you)' : ''}`));
      const sum = h('div', 'admin-sum');
      const drawSum = () => {
        const ups = gift.upgrades === 'max' ? ['every upgrade maxed'] : Object.entries(gift.upgrades).map(([id, n]) => `${(hooks.upgradeList ? hooks.upgradeList() : []).find(u => u.id === id)?.name || id} +${n}`);
        sum.innerHTML = gift.money || ups.length ? `Sending: ${[gift.money ? fmt(gift.money) : '', ...ups].filter(Boolean).join(', ')}` : '<span class="muted">Pick some money or upgrades.</span>';
      };
      const money = h('div', 'admin-money');
      for (const n of [100, 500, 1000, 5000, 10000]) { const b = h('button', 'btn small', '+' + fmt(n)); b.onclick = () => { sfx.coin(); gift.money = Math.min(1000000, gift.money + n); drawSum(); }; money.appendChild(b); }
      const clr = h('button', 'btn small', 'Clear'); clr.onclick = () => { sfx.click(); gift.money = 0; gift.upgrades = {}; drawSum(); }; money.appendChild(clr);
      card.appendChild(h('div', 'admin-label', 'Money')); card.appendChild(money);
      const ups = h('div', 'admin-ups');
      for (const u of (hooks.upgradeList ? hooks.upgradeList() : [])) {
        const b = h('button', 'btn small', `${icon(u.icon, 'in')} ${esc(u.name)} +1`);
        b.onclick = () => { sfx.click(); if (gift.upgrades === 'max') gift.upgrades = {}; gift.upgrades[u.id] = Math.min(10, (gift.upgrades[u.id] || 0) + 1); drawSum(); };
        ups.appendChild(b);
      }
      const mx = h('button', 'btn small', icon('sparkle', 'in') + ' Max everything'); mx.onclick = () => { sfx.click(); gift.upgrades = 'max'; drawSum(); }; ups.appendChild(mx);
      card.appendChild(h('div', 'admin-label', 'Upgrades')); card.appendChild(ups);
      card.appendChild(sum); drawSum();
      const msg = h('div', 'form-err'); card.appendChild(msg);
      const row = h('div', 'card-buttons');
      const back = h('button', 'btn', 'Back'); back.onclick = () => { sfx.click(); pick = null; render(); };
      const send = h('button', 'btn primary', icon('gift', 'in') + ' Send gift');
      send.onclick = async () => {
        const hasUp = gift.upgrades === 'max' || Object.keys(gift.upgrades).length;
        if (!gift.money && !hasUp) { msg.textContent = 'Pick some money or an upgrade first.'; sfx.bad(); return; }
        send.disabled = true; send.textContent = 'Sending…';
        const r = await api('/admin/gift', { method: 'POST', authed: true, body: { to: pick.username, money: gift.money, upgrades: hasUp ? gift.upgrades : null } });
        send.disabled = false; send.innerHTML = icon('gift', 'in') + ' Send gift';
        if (!r.ok) { msg.textContent = r.error; sfx.bad(); return; }
        sfx.great();
        msg.className = 'form-ok'; msg.textContent = pick.username === auth.username ? 'Sent! Opening it now…' : `Sent! ${pick.username} gets it next time they play.`;
        gift.money = 0; gift.upgrades = {}; drawSum();
        if (pick.username === auth.username) { close(null); await claimGifts(); }
      };
      row.append(back, send); card.appendChild(row);
    };
    render();
  }, { cls: 'admin-panel' });
}

function cloudBlob() {
  const state = hooks.getState ? hooks.getState() : null;
  return { state, profile: { ach: profile.ach, secrets: profile.secrets, codes: profile.codes, counters: profile.counters } };
}
let syncTimer = null;
export function queueSync(now = false) {
  if (!auth.token) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, now ? 10 : 4000);
}
export async function syncNow() {
  if (!auth.token || !hooks.getState) return;
  const st = hooks.getState();
  if (!st) return;
  await api('/progress', { method: 'PUT', authed: true, body: { save: cloudBlob(), money: Math.round(st.money), days: counter('days'), earned: Math.round(counter('earned')) } });
}
function mergeProfile(p) {
  if (!p) return;
  for (const k of ['ach', 'secrets', 'codes']) for (const [id, v] of Object.entries(p[k] || {})) if (!profile[k][id]) profile[k][id] = v;
  for (const [id, v] of Object.entries(p.counters || {})) {
    if (typeof v === 'number') profile.counters[id] = Math.max(profile.counters[id] || 0, v);
    else if (v && typeof v === 'object') profile.counters[id] = { ...(typeof profile.counters[id] === 'object' ? profile.counters[id] : {}), ...v };
  }
  migrateCodes();
  store(slotKey(PRO_KEY), profile);
}
// Switch to another save slot. The page reloads so nothing from the old slot stays in memory.
async function switchTo(newAuth, { offerGuest = false, cloudEmpty = true } = {}) {
  const g = offerGuest && cloudEmpty ? guestProgress() : null;
  setAuth(newAuth);
  if (g) {
    const v = await message({
      icon: icon('cloud'), title: 'Bring your progress?',
      html: `<p>You played without an account on this device (Day ${g.day}, ${fmt(g.money)}).</p><p>Move that progress into <b>${esc(newAuth.username)}</b>?</p>`,
      buttons: [{ label: 'Bring it', value: true, cls: 'primary' }, { label: 'Start fresh', value: false }],
    });
    if (v) moveSlot(null, newAuth.username);
  }
  location.reload();
}

export function openAccount() {
  return panel((card, close) => {
    const render = () => {
      card.querySelectorAll(':scope > :not(.panel-x)').forEach(n => n.remove());
      card.appendChild(h('div', 'card-icon', icon('user')));
      if (auth.token) {
        card.appendChild(h('div', 'card-title', esc(auth.username)));
        const st = hooks.getState ? hooks.getState() : {};
        card.appendChild(h('div', 'card-body', `<div class="acct-stats"><div><b>${fmt(counter('earned'))}</b><span>earned</span></div><div><b>${fmt(st.money || 0)}</b><span>bank</span></div><div><b>${counter('days')}</b><span>days</span></div><div><b>${unlockedCount()}</b><span>awards</span></div></div><p class="muted">Your progress saves to your account after every patient, so you can play on any device.</p>`));
        const row = h('div', 'card-buttons');
        const lb = h('button', 'btn primary', 'Leaderboards'); lb.onclick = () => { sfx.click(); close(null); openLeaderboard(); };
        const out = h('button', 'btn', 'Log out'); out.onclick = async () => { sfx.click(); out.disabled = true; await syncNow(); await api('/logout', { method: 'POST', authed: true }); await switchTo(null); };
        row.append(lb, out);
        if (isCreator()) {
          const g = h('button', 'btn', icon('book', 'in') + ' Secret guide'); g.onclick = () => { sfx.click(); close(null); openGuide(); }; row.prepend(g);
          const ad = h('button', 'btn', icon('shield', 'in') + ' Admin'); ad.onclick = () => { sfx.click(); close(null); openAdmin(); }; row.prepend(ad);
        }
        card.appendChild(row);
        const del = h('button', 'link-btn danger', 'Delete my account');
        del.onclick = async () => {
          const ok = await message({ icon: icon('trash'), title: 'Delete account?', html: `<p>This removes <b>${esc(auth.username)}</b> from the leaderboards and deletes its saved progress for good.</p>`, buttons: [{ label: 'Cancel', value: false }, { label: 'Delete it', value: true, cls: 'danger' }] });
          if (!ok) return openAccount();
          const name = auth.username;
          const r = await api('/me', { method: 'DELETE', authed: true });
          if (!r.ok) return openAccount();
          try { [SAVE_BASE, PRO_KEY].forEach(b => localStorage.removeItem(slotKey(b, name))); } catch (e) { /* ignore */ }
          await switchTo(null);
        };
        card.appendChild(del);
        return;
      }
      card.appendChild(h('div', 'card-title', 'Your account'));
      let mode = 'create';
      const tabs = h('div', 'tabs');
      const tC = h('button', 'tab on', 'Make an account'), tL = h('button', 'tab', 'Log in');
      tabs.append(tC, tL); card.appendChild(tabs);
      const form = h('form', 'acct-form');
      form.innerHTML = `
        <label>Username<input name="u" autocomplete="username" maxlength="16" placeholder="like DrSneezy42" required></label>
        <label>Password<input name="p" type="password" autocomplete="new-password" maxlength="64" required></label>
        <label class="confirm">Password again<input name="p2" type="password" autocomplete="new-password" maxlength="64"></label>
        <div class="form-err" role="alert"></div>
        <button class="btn primary" type="submit">Make my account</button>
        <p class="fine">No email needed. <b>Don't use your real name.</b> Write your password down somewhere safe, because there's no way to get it back if you forget it.</p>`;
      card.appendChild(form);
      const err = form.querySelector('.form-err');
      const setMode = m => {
        mode = m; tC.classList.toggle('on', m === 'create'); tL.classList.toggle('on', m === 'login');
        form.querySelector('.confirm').style.display = m === 'create' ? '' : 'none';
        form.querySelector('[name=p]').autocomplete = m === 'create' ? 'new-password' : 'current-password';
        form.querySelector('button[type=submit]').textContent = m === 'create' ? 'Make my account' : 'Log in';
        err.textContent = '';
      };
      tC.onclick = () => { sfx.click(); setMode('create'); };
      tL.onclick = () => { sfx.click(); setMode('login'); };
      form.onsubmit = async e => {
        e.preventDefault();
        const u = form.u.value.trim(), p = form.p.value;
        if (!/^[A-Za-z0-9_]{3,16}$/.test(u)) { err.textContent = 'Usernames are 3 to 16 letters, numbers or _ (no spaces).'; return; }
        if (p.length < 6) { err.textContent = 'Passwords need at least 6 characters.'; return; }
        if (mode === 'create' && p !== form.p2.value) { err.textContent = "The two passwords don't match."; return; }
        const btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'One sec…';
        const r = await api(mode === 'create' ? '/register' : '/login', { method: 'POST', body: { username: u, password: p } });
        btn.disabled = false; setMode(mode);
        if (!r.ok) { err.textContent = r.error; sfx.bad(); return; }
        sfx.great();
        const wasGuest = !auth.token;
        if (!wasGuest) await syncNow(); // keep the old account's latest progress in its own cloud save
        let cloudEmpty = true;
        if (mode === 'login') {
          const me = await fetch(API + '/me', { headers: { Authorization: 'Bearer ' + r.token } }).then(x => x.json()).catch(() => null);
          cloudEmpty = !(me && me.save && me.save.state);
        }
        await switchTo({ token: r.token, username: r.username }, { offerGuest: wasGuest, cloudEmpty });
      };
    };
    render();
  }, { cls: 'acct-panel' });
}

export function openLeaderboard() {
  return panel(card => {
    card.appendChild(h('div', 'card-icon', icon('chart')));
    card.appendChild(h('div', 'card-title', 'Leaderboards'));
    const tabs = h('div', 'tabs');
    const tM = h('button', 'tab on', 'Most money earned'), tD = h('button', 'tab', 'Most days played');
    tabs.append(tM, tD); card.appendChild(tabs);
    const box = h('div', 'lb-box'); card.appendChild(box);
    const foot = h('div', 'lb-foot'); card.appendChild(foot);
    const show = async by => {
      tM.classList.toggle('on', by === 'earned'); tD.classList.toggle('on', by === 'days');
      box.innerHTML = '<div class="lb-msg">Loading…</div>';
      if (auth.token) await syncNow();
      const r = await api('/leaderboard?by=' + by, { authed: true });
      if (!r.ok) { box.innerHTML = `<div class="lb-msg">${esc(r.error)}</div>`; return; }
      if (!r.top.length) { box.innerHTML = '<div class="lb-msg">Nobody here yet. Be the first!</div>'; }
      else {
        const rows = r.top.map((x, i) => `<tr class="${auth.username && x.username.toLowerCase() === auth.username.toLowerCase() ? 'me' : ''}"><td class="rk">${i < 3 ? icon('medal:' + (i + 1), 'rank') : i + 1}</td><td class="nm">${esc(x.username)}</td><td class="vl">${by === 'days' ? x.value + (x.value === 1 ? ' day' : ' days') : fmt(x.value)}</td></tr>`).join('');
        box.innerHTML = `<table class="lb">${rows}</table>`;
      }
      if (r.me) foot.innerHTML = `You're <b>#${r.me.rank}</b> with <b>${by === 'days' ? r.me.value + ' days' : fmt(r.me.value)}</b>.`;
      else foot.innerHTML = '';
    };
    tM.onclick = () => { sfx.click(); show('earned'); };
    tD.onclick = () => { sfx.click(); show('days'); };
    if (!auth.token) {
      const join = h('button', 'btn small primary', 'Make an account to join');
      join.onclick = () => { sfx.click(); openAccount(); };
      const wrap = h('div', 'card-buttons'); wrap.appendChild(join); card.appendChild(wrap);
    }
    show('earned');
  }, { cls: 'lb-panel' });
}

// ---------------- settings panel ----------------
export function openSettings() {
  let devTaps = 0;
  return panel(card => {
    card.appendChild(h('div', 'card-icon', icon('gear')));
    card.appendChild(h('div', 'card-title', 'Settings'));
    const list = h('div', 'set-list'); card.appendChild(list);
    const row = (label, ctrl) => { const r = h('div', 'set-row'); r.appendChild(h('span', 'set-label', label)); r.appendChild(ctrl); list.appendChild(r); return r; };
    const slider = (key) => {
      const s = h('input'); s.type = 'range'; s.min = 0; s.max = 100; s.value = Math.round(settings[key] * 100);
      s.oninput = () => { settings[key] = s.value / 100; applySettings(); saveSettings(); };
      s.onchange = () => { if (key === 'sfx') sfx.ding(); };
      return s;
    };
    const seg = (key, opts) => {
      const g = h('div', 'seg');
      for (const [v, label] of opts) {
        const b = h('button', settings[key] === v ? 'on' : '', label);
        b.onclick = () => { sfx.click(); settings[key] = v; saveSettings(); applySettings(); g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
        g.appendChild(b);
      }
      return g;
    };
    const toggle = (get, set) => {
      const b = h('button', 'toggle' + (get() ? ' on' : ''), `<i></i>`);
      b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', String(!!get()));
      b.onclick = () => { sfx.click(); set(!get()); b.classList.toggle('on', !!get()); b.setAttribute('aria-checked', String(!!get())); };
      return b;
    };
    row(icon('soundOn', 'in') + ' Sound effects', slider('sfx'));
    row(icon('music', 'in') + ' Music', slider('music'));
    row(icon('voice', 'in') + ' Patient voices', toggle(() => settings.voices, v => { settings.voices = v; saveSettings(); applySettings(); }));
    row(icon('speech', 'in') + ' Talking speed', seg('talk', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']]));
    row(icon('palette', 'in') + ' Graphics', seg('quality', [['auto', 'Pretty'], ['fast', 'Fast']]));
    row(icon('boom', 'in') + ' Screen shake', toggle(() => settings.shake, v => { settings.shake = v; saveSettings(); applySettings(); }));
    row(icon('magnifier', 'in') + ' Bigger text', toggle(() => settings.bigText, v => { settings.bigText = v; saveSettings(); applySettings(); }));
    const fsb = h('button', 'btn small', isFullscreen() ? 'Exit full screen' : 'Go full screen');
    fsb.onclick = () => { sfx.click(); goFullscreen(); };
    row(icon('fullscreen', 'in') + ' Full screen', fsb);
    // secret codes
    const codeRow = h('form', 'code-row');
    codeRow.innerHTML = '<input name="c" placeholder="Secret code" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="btn small" type="submit">Enter</button>';
    const codeMsg = h('div', 'code-msg');
    codeRow.onsubmit = e => {
      e.preventDefault();
      const r = enterCode(codeRow.c.value);
      codeMsg.innerHTML = r.msg; codeMsg.className = 'code-msg ' + (r.ok ? 'ok' : 'no');
      if (r.ok) { sfx.great(); codeRow.c.value = ''; renderCheats(); } else sfx.bad();
    };
    const cr = row(icon('lock', 'in') + ' Codes', codeRow); cr.classList.add('wide');
    list.appendChild(codeMsg);
    const cheatBox = h('div', 'cheats'); list.appendChild(cheatBox);
    const renderCheats = () => {
      cheatBox.innerHTML = '';
      const avail = Object.values(profile.codes).filter(c => c && typeof c === 'object' && c.cheat).map(c => c.cheat);
      for (const ch of avail) {
        const r = h('div', 'set-row');
        r.appendChild(h('span', 'set-label', icon('sparkle', 'in') + ' ' + CHEAT_NAMES[ch]));
        r.appendChild(toggle(() => !!settings.cheats[ch], v => { settings.cheats[ch] = v; saveSettings(); applySettings(); }));
        cheatBox.appendChild(r);
      }
    };
    renderCheats();
    const btns = h('div', 'card-buttons');
    const tut = h('button', 'btn small', 'Show how-to tips again');
    tut.onclick = () => { sfx.click(); hooks.resetTips && hooks.resetTips(); tut.textContent = 'Done!'; tut.disabled = true; };
    const acct = h('button', 'btn small', icon('user', 'in') + ' ' + (auth.token ? esc(auth.username) : 'Account'));
    acct.onclick = () => { sfx.click(); openAccount(); };
    btns.append(tut, acct);
    if (isCreator()) {
      const g = h('button', 'btn small', icon('book', 'in') + ' Secret guide'); g.onclick = () => { sfx.click(); openGuide(); }; btns.appendChild(g);
      const ad = h('button', 'btn small', icon('shield', 'in') + ' Admin'); ad.onclick = () => { sfx.click(); openAdmin(); }; btns.appendChild(ad);
    }
    card.appendChild(btns);
    const erase = h('button', 'link-btn danger', 'Erase everything on this device');
    erase.onclick = async () => {
      const ok = await message({ icon: icon('warning'), title: 'Erase everything?', html: '<p>This wipes your days, money, upgrades, achievements and settings on this device. If you have an account, your cloud save stays.</p>', buttons: [{ label: 'Cancel', value: false }, { label: 'Erase it all', value: true, cls: 'danger' }] });
      if (!ok) return openSettings();
      try { Object.keys(localStorage).filter(k => k.startsWith('doctor-chaos-')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
      location.reload();
    };
    card.appendChild(erase);
    const ver = h('div', 'version', `Doctor Chaos v${VERSION} · Game design by Linus`);
    ver.onclick = () => {
      devTaps++;
      if (devTaps === 7) { unlock('dev_mode'); secret('dev', { icon: icon('laptop'), title: 'Developer mode', html: '<p>Developer mode unlocked!</p><p class="muted">Just kidding. There is no developer mode. Nurse Pat is the developer now. She has already filed three bug reports about you.</p>' }); }
    };
    card.appendChild(ver);
  }, { cls: 'set-panel' });
}

// called once at boot
export async function initMeta(h2) {
  Object.assign(hooks, h2);
  applySettings();
  // a little something for anyone who opens the browser console
  try {
    console.log('%cDOCTOR CHAOS', 'font-size:20px;font-weight:bold;color:#ff8a2a');
    console.log('%cPsst. You opened the console. Real hackers can read this:', 'color:#2bb3a3');
    console.log('%c01001000 01000001 01000011 01001011 01000101 01010010', 'color:#2bb3a3;font-family:monospace');
  } catch (e) { /* ignore */ }
  if (auth.token) {
    const me = await api('/me', { authed: true });
    if (me.ok) {
      if (hooks.onAuth) hooks.onAuth(auth);
      mergeProfile(me.save && me.save.profile);
      // same account on another device: whichever save is newer wins
      const cloud = me.save && me.save.state, local = hooks.getState ? hooks.getState() : null;
      if (cloud && (!local || (cloud.savedAt || 0) > (local.savedAt || 0))) hooks.loadState && hooks.loadState(cloud);
      else { queueSync(true); claimGifts(); }
    }
  }
}
export { music };
