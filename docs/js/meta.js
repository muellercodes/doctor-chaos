// Everything around the game itself: settings, achievements, secrets and codes,
// accounts, cloud saves and leaderboards.
import { sfx, music } from './audio.js';
import { h } from './ui.js';

export const VERSION = '1.4.0';

const load = k => { try { return JSON.parse(localStorage.getItem(k) || 'null') || {}; } catch (e) { return {}; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString();

// Hooks the game fills in (money, save data, live settings).
export const hooks = {};

// ---------------- settings ----------------
const SET_KEY = 'doctor-chaos-settings-v1';
export const settings = { sfx: 1, music: 1, talk: 'normal', quality: 'auto', shake: true, bigText: false, cheats: {}, ...load(SET_KEY) };
settings.cheats = { ...(settings.cheats || {}) };
export function saveSettings() { store(SET_KEY, settings); }
export function applySettings() {
  sfx.setVolumes(settings.sfx, settings.music);
  document.body.classList.toggle('big-text', !!settings.bigText);
  if (hooks.applySettings) hooks.applySettings(settings);
}

// ---------------- profile (kept across "New game") ----------------
const PRO_KEY = 'doctor-chaos-profile-v1';
export const profile = { ach: {}, secrets: {}, codes: {}, counters: {}, ...load(PRO_KEY) };
for (const k of ['ach', 'secrets', 'codes', 'counters']) profile[k] = { ...(profile[k] || {}) };
export function saveProfile() { store(PRO_KEY, profile); queueSync(); }
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
    const x = h('button', 'panel-x', '✕'); x.setAttribute('aria-label', 'Close');
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
export function secret(id, { icon = '🤫', title = 'Secret found!', html = '' } = {}) {
  const first = !profile.secrets[id];
  profile.secrets[id] = profile.secrets[id] || Date.now();
  saveProfile();
  sfx.ding && sfx.ding();
  return message({ icon, title: first ? title : title + ' (again)', html, cls: 'secret-card', buttons: [{ label: 'Nice', value: true, cls: 'primary' }] });
}

// ---------------- achievements ----------------
export const ACHIEVEMENTS = [
  { id: 'first_patient', icon: '🩺', name: 'First Day Jitters', desc: 'Treat your first patient.' },
  { id: 'orientation', icon: '🎓', name: 'Orientation Survivor', desc: "Finish Nurse Pat's orientation." },
  { id: 'three_stars', icon: '⭐', name: 'Gold Star', desc: 'Get 3 stars on a patient.' },
  { id: 'perfect_day', icon: '🌟', name: 'Flawless Shift', desc: 'Get all 15 stars in one day.' },
  { id: 'day5', icon: '📅', name: 'Work Week', desc: 'Reach day 5.' },
  { id: 'day10', icon: '🗓️', name: 'Double Digits', desc: 'Reach day 10.' },
  { id: 'day25', icon: '🏅', name: 'Clinic Legend', desc: 'Reach day 25.' },
  { id: 'day50', icon: '👴', name: 'Retirement Is a Myth', desc: 'Reach day 50.' },
  { id: 'money1k', icon: '💵', name: 'Four Figures', desc: 'Have $1,000 in the bank.' },
  { id: 'money5k', icon: '💰', name: 'Doctor Moneybags', desc: 'Have $5,000 in the bank.' },
  { id: 'money20k', icon: '🏦', name: 'Basically a Bank', desc: 'Have $20,000 in the bank.' },
  { id: 'patients25', icon: '👥', name: 'Full Waiting Room', desc: 'Treat 25 patients.' },
  { id: 'patients100', icon: '🏥', name: 'Hundred Club', desc: 'Treat 100 patients.' },
  { id: 'tips10', icon: '🫙', name: 'Tip Jar', desc: 'Get 10 tips from happy patients.' },
  { id: 'first_lawsuit', icon: '⚖️', name: 'Lawyered', desc: 'Get sued for the first time.' },
  { id: 'lawsuits10', icon: '📜', name: 'Frequent Defendant', desc: 'Get sued 10 times. The judge knows your name now.' },
  { id: 'mega_lawsuit', icon: '💥', name: 'Objection!', desc: 'Get hit with a MEGA lawsuit.' },
  { id: 'bankrupt', icon: '🥫', name: 'Replaced by a Vending Machine', desc: 'Go bankrupt.' },
  { id: 'caught_runner', icon: '🏃', name: 'Hallway Monitor', desc: 'Catch a runaway patient.' },
  { id: 'caught_scooter', icon: '🦽', name: 'Wheelchair Grand Prix', desc: 'Catch the scooter thief.' },
  { id: 'germ_king', icon: '👑', name: 'Royal Pain', desc: 'Defeat the King Germ.' },
  { id: 'triplets_first', icon: '👯', name: 'Triplet Detector', desc: 'Pick the sick triplet on the first try.' },
  { id: 'lights_found', icon: '🔦', name: 'Night Vision', desc: 'Find the kid in the dark.' },
  { id: 'hider_found', icon: '🙈', name: 'Hide and Seek Champion', desc: 'Find a hiding patient.' },
  { id: 'baby_calm', icon: '🍼', name: 'Baby Whisperer', desc: 'Give a baby their shot.' },
  { id: 'all_specials', icon: '🎪', name: 'Seen It All', desc: 'Meet every kind of special patient.' },
  { id: 'maxed', icon: '🛠️', name: 'Fully Loaded', desc: 'Max out every upgrade.' },
  { id: 'fashion', icon: '🥼', name: 'Fashion Doctor', desc: 'Change your coat color.' },
  { id: 'kicked', icon: '🦶', name: 'Face, Meet Foot', desc: 'Get kicked in the face during a reflex test.' },
  { id: 'hammer_time', icon: '🔨', name: 'Hammer Time', desc: 'Bonk the wrong spot 3 times in a row.' },
  { id: 'wrong_tools', icon: '🪛', name: 'Is This a Scalpel?', desc: 'Pick the wrong tool 5 times on one patient.' },
  { id: 'zero_day', icon: '🫠', name: 'Zero Stars, Full Heart', desc: 'Finish a whole day with zero stars.' },
  { id: 'in_debt', icon: '📉', name: 'Negative Vibes', desc: 'Have less than $0 in the bank.' },
  { id: 'vampire_blood', icon: '🧛', name: 'Blood Bank', desc: 'Take blood from a vampire. He is not thrilled.' },
  { id: 'escaped', icon: '💨', name: 'They Went That Way', desc: 'Let a patient escape.' },
  { id: 'code1', icon: '🔐', name: 'Code Breaker', desc: 'Enter a secret code.' },
  { id: 'code_all', icon: '🕵️', name: 'Master Hacker', desc: 'Enter every secret code.' },
  { id: 'night_owl', icon: '🦉', name: 'Night Shift (Literally)', desc: 'Play between midnight and 4 AM.', secret: true },
  { id: 'konami', icon: '🕹️', name: 'Old School', desc: 'Enter a very old cheat code on the title screen.', secret: true },
  { id: 'tacos', icon: '🌮', name: 'Taco Tuesday', desc: 'Make it rain tacos.', secret: true },
  { id: 'roach', icon: '🪳', name: 'Health Code Violation', desc: 'Find the roach.', secret: true },
  { id: 'linus', icon: '🧠', name: 'The Boss', desc: "Say the designer's name.", secret: true },
  { id: 'fine_print', icon: '🔍', name: 'Fine Print', desc: 'Find the hidden tagline.', secret: true },
  { id: 'secret_song', icon: '🎵', name: 'Secret Song', desc: 'Find the secret song.', secret: true },
  { id: 'poke_demo', icon: '👉', name: 'Stop Poking Me', desc: 'Poke the patient on the title screen. A lot.', secret: true },
  { id: 'dev_mode', icon: '🧑‍💻', name: 'Not a Developer', desc: 'Try to unlock developer mode.', secret: true },
  { id: 'waiting', icon: '😴', name: 'Waiting Room Champion', desc: 'Sit on the title screen for 3 whole minutes.', secret: true },
  { id: 'clock', icon: '⏰', name: 'Time Traveler', desc: 'Mess with the clock.', secret: true },
  { id: 'plant', icon: '🪴', name: 'Plant Whisperer', desc: 'Give the plant some attention.', secret: true },
  { id: 'nurse_poke', icon: '🗣️', name: 'Nurse Pat Knows Things', desc: 'Bother Nurse Pat until she tells you something.', secret: true },
  { id: 'sound_toggle', icon: '🔇', name: 'Sound of Silence', desc: 'Turn the sound off and on 10 times in a row.', secret: true },
  { id: 'coffee', icon: '☕', name: 'Coffee Break', desc: 'Leave a patient waiting for 2 minutes. They grew a beard.', secret: true },
  { id: 'ach20', icon: '🏆', name: 'Achievement Hunter', desc: 'Unlock 20 achievements.' },
  { id: 'ach_all', icon: '🌱', name: 'Touch Grass', desc: 'Unlock every other achievement. Then go outside.' },
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
    const el = h('div', 'toast', `<div class="toast-icon">${t.icon}</div><div><small>Achievement unlocked!</small><b>${esc(t.name)}</b></div>`);
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
export function metSpecial(type) {
  const met = typeof profile.counters.specialsMet === 'object' ? profile.counters.specialsMet : {};
  met[type] = 1; profile.counters.specialsMet = met; saveProfile();
}

export function openAchievements() {
  return panel(card => {
    card.appendChild(h('div', 'card-icon', '🏆'));
    card.appendChild(h('div', 'card-title', 'Achievements'));
    card.appendChild(h('div', 'ach-count', `${unlockedCount()} of ${ACHIEVEMENTS.length} unlocked`));
    const list = h('div', 'ach-list');
    for (const a of ACHIEVEMENTS) {
      const got = !!profile.ach[a.id];
      const hidden = a.secret && !got;
      const row = h('div', 'ach' + (got ? ' got' : ''));
      row.innerHTML = `<div class="ach-icon">${hidden ? '❔' : a.icon}</div><div class="ach-info"><b>${hidden ? 'Secret achievement' : esc(a.name)}</b><span>${hidden ? 'Keep poking around. Seriously, poke things.' : esc(a.desc)}</span></div>`;
      list.appendChild(row);
    }
    card.appendChild(list);
  }, { cls: 'ach-panel' });
}

// ---------------- secret codes ----------------
export const CODES = {
  PICKLES: { name: 'Pickle Money', desc: 'Dave Pickles left you <b>$500</b> in a jar.', money: 500 },
  HACKER: { name: 'Leet Cash', desc: '<b>$1,337</b> just appeared in your account. Nobody ask how.', money: 1337 },
  SNACK: { name: 'Vending Machine Jackpot', desc: 'The courthouse vending machine paid out <b>$250</b> and a bag of pretzels.', money: 250 },
  BIGHEAD: { name: 'Big Head Mode', desc: 'Every patient now has a very big head. Medically concerning.', cheat: 'bighead' },
  PARTY: { name: 'Party Mode', desc: 'Everyone gets a party hat. Even during surgery.', cheat: 'party' },
  SQUEAKY: { name: 'Squeaky Voices', desc: 'Everyone sounds like they swallowed a balloon.', cheat: 'squeaky' },
  ZOOMIES: { name: 'Zoomies', desc: 'Patients walk in really, really fast.', cheat: 'zoomies' },
  GHOST: { name: 'Spooky Clinic', desc: 'The lights are dim and purple now. Nurse Pat does not like it.', cheat: 'spooky' },
};
export const CHEAT_NAMES = { bighead: 'Big Head Mode', party: 'Party Mode', squeaky: 'Squeaky Voices', zoomies: 'Zoomies', spooky: 'Spooky Clinic' };

export function enterCode(raw) {
  const code = String(raw || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (!code) return { ok: false, msg: 'Type a code first.' };
  const c = CODES[code];
  if (!c) return { ok: false, msg: pickOne(['Nope. That is not a code.', 'Nurse Pat shakes her head slowly.', 'Wrong. The computer is laughing at you.', 'Not a code. Nice try though.']) };
  if (profile.codes[code]) return { ok: false, msg: `You already used ${code}. ${c.cheat ? 'Turn it on or off below.' : 'No double-dipping.'}` };
  profile.codes[code] = Date.now();
  if (c.money && hooks.addMoney) hooks.addMoney(c.money);
  if (c.cheat) { settings.cheats[c.cheat] = true; saveSettings(); applySettings(); }
  saveProfile();
  unlock('code1');
  if (Object.keys(CODES).every(k => profile.codes[k])) unlock('code_all');
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
      icon: '📱', title: 'Full screen on iPhone',
      html: `<p>iPhones don't let websites go full screen, but there's a trick:</p>
        <ol class="steps"><li>Tap the <b>Share</b> button <span class="kbd">⬆︎</span> in Safari.</li><li>Tap <b>Add to Home Screen</b>.</li><li>Open <b>Doctor Chaos</b> from your home screen.</li></ol>
        <p>It opens with no browser bars at all. Your progress comes with you if you have an account.</p>`,
    });
  }
  return message({ icon: '⛶', title: 'No full screen here', html: '<p>This browser does not allow full screen. Try Chrome, or turn your phone sideways and scroll the page up a little to hide the address bar.</p>' });
}

// ---------------- accounts & cloud ----------------
const AUTH_KEY = 'doctor-chaos-auth-v1';
export const auth = { token: null, username: null, ...load(AUTH_KEY) };
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
  await api('/progress', { method: 'PUT', authed: true, body: { save: cloudBlob(), money: Math.round(st.money), days: counter('days') } });
}
function mergeProfile(p) {
  if (!p) return;
  for (const k of ['ach', 'secrets', 'codes']) for (const [id, v] of Object.entries(p[k] || {})) if (!profile[k][id]) profile[k][id] = v;
  for (const [id, v] of Object.entries(p.counters || {})) {
    if (typeof v === 'number') profile.counters[id] = Math.max(profile.counters[id] || 0, v);
    else if (v && typeof v === 'object') profile.counters[id] = { ...(typeof profile.counters[id] === 'object' ? profile.counters[id] : {}), ...v };
  }
  store(PRO_KEY, profile);
}
// After logging in: bring the account's save onto this device, or push this device's save up.
async function reconcile(me) {
  const local = hooks.getState ? hooks.getState() : null;
  const cloud = me.save && me.save.state;
  mergeProfile(me.save && me.save.profile);
  const localFresh = !local || (local.day <= 1 && !local.tutorialDone && Math.round(local.money) === 200);
  if (cloud && (localFresh || (cloud.day === local.day && Math.round(cloud.money) === Math.round(local.money)))) {
    if (!localFresh) return syncNow();
    hooks.loadState && hooks.loadState(cloud);
    return;
  }
  if (cloud && local) {
    const v = await message({
      icon: '☁️', title: 'Which progress?',
      html: `<p>Your account has a different save than this device.</p>
        <div class="pick-save"><div><b>Account</b><span>Day ${cloud.day} · ${fmt(cloud.money)}</span></div><div><b>This device</b><span>Day ${local.day} · ${fmt(local.money)}</span></div></div>`,
      buttons: [{ label: 'Use account save', value: 'cloud', cls: 'primary' }, { label: 'Keep this device', value: 'local' }],
    });
    if (v === 'cloud') { hooks.loadState && hooks.loadState(cloud); return; }
  }
  return syncNow();
}

export function openAccount() {
  return panel((card, close) => {
    const render = () => {
      card.querySelectorAll(':scope > :not(.panel-x)').forEach(n => n.remove());
      card.appendChild(h('div', 'card-icon', '👤'));
      if (auth.token) {
        card.appendChild(h('div', 'card-title', esc(auth.username)));
        const st = hooks.getState ? hooks.getState() : {};
        card.appendChild(h('div', 'card-body', `<div class="acct-stats"><div><b>${fmt(st.money || 0)}</b><span>bank</span></div><div><b>${counter('days')}</b><span>days played</span></div><div><b>${unlockedCount()}</b><span>achievements</span></div></div><p class="muted">Your progress saves to your account after every patient, so you can play on any device.</p>`));
        const row = h('div', 'card-buttons');
        const lb = h('button', 'btn primary', '📊 Leaderboards'); lb.onclick = () => { sfx.click(); close(null); openLeaderboard(); };
        const out = h('button', 'btn', 'Log out'); out.onclick = async () => { sfx.click(); await syncNow(); api('/logout', { method: 'POST', authed: true }); setAuth(null); render(); };
        row.append(lb, out);
        card.appendChild(row);
        const del = h('button', 'link-btn danger', 'Delete my account');
        del.onclick = async () => {
          const ok = await message({ icon: '🗑️', title: 'Delete account?', html: `<p>This removes <b>${esc(auth.username)}</b> from the leaderboards and deletes the cloud save. The game on this device keeps its progress.</p>`, buttons: [{ label: 'Cancel', value: false }, { label: 'Delete it', value: true, cls: 'danger' }] });
          if (!ok) return openAccount();
          const r = await api('/me', { method: 'DELETE', authed: true });
          if (r.ok) setAuth(null);
          openAccount();
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
        setAuth({ token: r.token, username: r.username });
        sfx.great();
        if (mode === 'create') await syncNow();
        else { const me = await api('/me', { authed: true }); if (me.ok) await reconcile(me); }
        openAccount();
      };
    };
    render();
  }, { cls: 'acct-panel' });
}

export function openLeaderboard() {
  return panel(card => {
    card.appendChild(h('div', 'card-icon', '📊'));
    card.appendChild(h('div', 'card-title', 'Leaderboards'));
    const tabs = h('div', 'tabs');
    const tM = h('button', 'tab on', '💰 Most money'), tD = h('button', 'tab', '📅 Most days');
    tabs.append(tM, tD); card.appendChild(tabs);
    const box = h('div', 'lb-box'); card.appendChild(box);
    const foot = h('div', 'lb-foot'); card.appendChild(foot);
    const show = async by => {
      tM.classList.toggle('on', by === 'money'); tD.classList.toggle('on', by === 'days');
      box.innerHTML = '<div class="lb-msg">Loading…</div>';
      if (auth.token) await syncNow();
      const r = await api('/leaderboard?by=' + by, { authed: true });
      if (!r.ok) { box.innerHTML = `<div class="lb-msg">${esc(r.error)}</div>`; return; }
      if (!r.top.length) { box.innerHTML = '<div class="lb-msg">Nobody here yet. Be the first!</div>'; }
      else {
        const rows = r.top.map((x, i) => `<tr class="${auth.username && x.username.toLowerCase() === auth.username.toLowerCase() ? 'me' : ''}"><td class="rk">${['🥇', '🥈', '🥉'][i] || i + 1}</td><td class="nm">${esc(x.username)}</td><td class="vl">${by === 'money' ? fmt(x.value) : x.value + (x.value === 1 ? ' day' : ' days')}</td></tr>`).join('');
        box.innerHTML = `<table class="lb">${rows}</table>`;
      }
      if (r.me) foot.innerHTML = `You're <b>#${r.me.rank}</b> with <b>${by === 'money' ? fmt(r.me.value) : r.me.value + ' days'}</b>.`;
      else foot.innerHTML = '';
    };
    tM.onclick = () => { sfx.click(); show('money'); };
    tD.onclick = () => { sfx.click(); show('days'); };
    if (!auth.token) {
      const join = h('button', 'btn small primary', 'Make an account to join');
      join.onclick = () => { sfx.click(); openAccount(); };
      const wrap = h('div', 'card-buttons'); wrap.appendChild(join); card.appendChild(wrap);
    }
    show('money');
  }, { cls: 'lb-panel' });
}

// ---------------- settings panel ----------------
export function openSettings() {
  let devTaps = 0;
  return panel(card => {
    card.appendChild(h('div', 'card-icon', '⚙️'));
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
    row('🔊 Sound effects', slider('sfx'));
    row('🎵 Music', slider('music'));
    row('💬 Talking speed', seg('talk', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']]));
    row('✨ Graphics', seg('quality', [['auto', 'Pretty'], ['fast', 'Fast']]));
    row('📳 Screen shake', toggle(() => settings.shake, v => { settings.shake = v; saveSettings(); applySettings(); }));
    row('🔠 Bigger text', toggle(() => settings.bigText, v => { settings.bigText = v; saveSettings(); applySettings(); }));
    const fsb = h('button', 'btn small', isFullscreen() ? 'Exit full screen' : 'Go full screen');
    fsb.onclick = () => { sfx.click(); goFullscreen(); };
    row('⛶ Full screen', fsb);
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
    const cr = row('🔐 Codes', codeRow); cr.classList.add('wide');
    list.appendChild(codeMsg);
    const cheatBox = h('div', 'cheats'); list.appendChild(cheatBox);
    const renderCheats = () => {
      cheatBox.innerHTML = '';
      const avail = Object.entries(CODES).filter(([k, c]) => c.cheat && profile.codes[k]).map(([, c]) => c.cheat);
      for (const ch of avail) {
        const r = h('div', 'set-row');
        r.appendChild(h('span', 'set-label', '🎉 ' + CHEAT_NAMES[ch]));
        r.appendChild(toggle(() => !!settings.cheats[ch], v => { settings.cheats[ch] = v; saveSettings(); applySettings(); }));
        cheatBox.appendChild(r);
      }
    };
    renderCheats();
    const btns = h('div', 'card-buttons');
    const tut = h('button', 'btn small', 'Show how-to tips again');
    tut.onclick = () => { sfx.click(); hooks.resetTips && hooks.resetTips(); tut.textContent = 'Done!'; tut.disabled = true; };
    const acct = h('button', 'btn small', auth.token ? '👤 ' + esc(auth.username) : '👤 Account');
    acct.onclick = () => { sfx.click(); openAccount(); };
    btns.append(tut, acct); card.appendChild(btns);
    const erase = h('button', 'link-btn danger', 'Erase everything on this device');
    erase.onclick = async () => {
      const ok = await message({ icon: '⚠️', title: 'Erase everything?', html: '<p>This wipes your days, money, upgrades, achievements and settings on this device. If you have an account, your cloud save stays.</p>', buttons: [{ label: 'Cancel', value: false }, { label: 'Erase it all', value: true, cls: 'danger' }] });
      if (!ok) return openSettings();
      try { ['doctor-chaos-save-v1', SET_KEY, PRO_KEY, AUTH_KEY].forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
      location.reload();
    };
    card.appendChild(erase);
    const ver = h('div', 'version', `Doctor Chaos v${VERSION} · Game design by Linus`);
    ver.onclick = () => {
      devTaps++;
      if (devTaps === 7) { unlock('dev_mode'); secret('dev', { icon: '🧑‍💻', title: 'Developer mode', html: '<p>Developer mode unlocked!</p><p class="muted">Just kidding. There is no developer mode. Nurse Pat is the developer now. She has already filed three bug reports about you.</p>' }); }
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
    console.log('%c🩺 DOCTOR CHAOS', 'font-size:20px;font-weight:bold;color:#ff8a2a');
    console.log('%cPsst. You opened the console. That makes you a hacker. Secret code: HACKER. Nurse Pat is watching.', 'color:#2bb3a3');
  } catch (e) { /* ignore */ }
  if (auth.token) {
    const me = await api('/me', { authed: true });
    if (me.ok) {
      if (hooks.onAuth) hooks.onAuth(auth);
      mergeProfile(me.save && me.save.profile);
      // same account on another device: whichever save is newer wins
      const cloud = me.save && me.save.state, local = hooks.getState ? hooks.getState() : null;
      if (cloud && (!local || (cloud.savedAt || 0) > (local.savedAt || 0))) hooks.loadState && hooks.loadState(cloud);
      else queueSync(true);
    }
  }
}
export { music };
