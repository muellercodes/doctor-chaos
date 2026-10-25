// Patients (and Nurse Pat) really talk, using the browser's built-in text-to-speech.
// Each speaker gets a steady voice picked from what the device has, with pitch and speed
// shaped by age. If a device has no voices, the old babble sounds play instead.
import { music } from './audio.js';

export const voice = { enabled: true, robot: false, squeaky: false, speed: 1 };
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let all = [];
const FEMALE = /samantha|victoria|karen|moira|tessa|fiona|zira|susan|hazel|serena|allison|ava|kate|kathy|princess|vicki|catherine|nicky|martha|joana|female|woman|libby|sonia|aria|jenny|michelle|emma|olivia/i;
const MALE = /alex|daniel|fred|tom|david|mark|rishi|george|aaron|arthur|oliver|lee|gordon|ralph|junior|albert|male|man|ryan|guy|eric|james|brian|christopher|roger|thomas/i;
const NOVELTY = /bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|hysterical|deranged|pipe organ/i;
const ROBOT = /zarvox|trinoids|ralph|fred/i;
function load() {
  if (!synth) return;
  all = synth.getVoices().filter(v => /^en(-|_|$)/i.test(v.lang));
}
if (synth) { load(); if (synth.addEventListener) synth.addEventListener('voiceschanged', load); else synth.onvoiceschanged = load; }
// headless test runs stay quiet and fast
const QUIET = typeof navigator !== 'undefined' && (navigator.webdriver || /[?&](test|lineup)\b/.test(location.search));

export const canSpeak = () => !!synth && typeof SpeechSynthesisUtterance !== 'undefined' && all.length > 0;

const hashStr = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };
function pickVoice(who) {
  const normal = all.filter(v => !NOVELTY.test(v.name));
  if (voice.robot) { const r = all.find(v => ROBOT.test(v.name) && NOVELTY.test(v.name)) || all.find(v => ROBOT.test(v.name)); if (r) return r; }
  const local = normal.filter(v => v.localService !== false);
  const pool = local.length ? local : normal;
  const want = who.gender === 'f' ? FEMALE : MALE;
  const avoid = who.gender === 'f' ? MALE : FEMALE;
  let list = pool.filter(v => want.test(v.name) && !(who.gender === 'f' ? /\bmale\b/i : /female/i).test(v.name));
  if (!list.length) list = pool.filter(v => !avoid.test(v.name));
  if (!list.length) list = pool;
  // prefer the main accents, then keep each speaker on the same voice
  const us = list.filter(v => /en[-_](US|GB)/i.test(v.lang));
  if (us.length >= 2) list = us;
  return list[hashStr(who.id || who.name || 'x') % list.length];
}

// Turn bubble text into something worth saying out loud.
export function speakable(text) {
  let t = String(text || '').replace(/<[^>]+>/g, ' ');
  t = t.replace(/\([^)]*\)/g, ' ');            // stage directions like (nods)
  t = t.replace(/\*([^*]+)\*/g, ' $1 ');        // *cough* -> cough
  t = t.replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, ' ');
  t = t.replace(/\.{3,}|…/g, ', ').replace(/—|–/g, ', ').replace(/\s+/g, ' ').trim();
  t = t.replace(/\b([A-Z]{2,})\b/g, m => (m.length <= 3 && /^(OK|TV|ER|CT|MRI)$/.test(m) ? m : m.toLowerCase())); // shouty caps read better as words
  return /[a-z0-9]/i.test(t) ? t : '';
}

let current = null;
export function stop() {
  if (!synth) return;
  if (current) { const c = current; current = null; c.finish(); }
  try { synth.cancel(); } catch (e) { /* ignore */ }
}
// who: { id, name, gender: 'm'|'f', age: 'kid'|'teen'|'adult'|'elder'|'baby', pitch (around 1) }
// Returns null when nothing is spoken, or { done: Promise, est: seconds }.
export function speak(text, who = {}) {
  if (QUIET || !voice.enabled || !canSpeak()) return null;
  const say = speakable(text);
  if (!say) return null;
  stop();
  const u = new SpeechSynthesisUtterance(say);
  const v = pickVoice(who);
  if (v) { u.voice = v; u.lang = v.lang; }
  const age = who.age || 'adult';
  let pitch = { baby: 1.9, kid: 1.55, teen: 1.2, adult: who.gender === 'f' ? 1.1 : 0.9, elder: who.gender === 'f' ? 0.95 : 0.75 }[age] || 1;
  pitch *= who.pitch ? Math.max(0.7, Math.min(1.35, who.pitch)) : 1;
  let rate = { baby: 1, kid: 1.08, teen: 1.1, adult: 1.02, elder: 0.86 }[age] || 1;
  if (who.excited) rate *= 1.12;
  if (voice.squeaky) pitch = 2;
  if (voice.robot) { pitch = Math.min(pitch, 0.4); rate *= 0.9; }
  u.pitch = Math.max(0, Math.min(2, pitch));
  u.rate = Math.max(0.5, Math.min(1.8, rate * voice.speed));
  u.volume = 1;
  const est = say.length / (13 * u.rate) + 0.4;
  let finished = false, resolve;
  const done = new Promise(r => { resolve = r; });
  const entry = {
    finish() { if (finished) return; finished = true; music.duck(false); who.onEnd && who.onEnd(); resolve(); },
  };
  u.onstart = () => { music.duck(true); who.onStart && who.onStart(est); };
  u.onend = u.onerror = () => { if (current === entry) current = null; entry.finish(); };
  current = entry;
  // safety net: some browsers never fire onend
  setTimeout(() => { if (current === entry) current = null; entry.finish(); }, (est * 1.6 + 1.5) * 1000);
  try { synth.speak(u); } catch (e) { entry.finish(); return null; }
  return { done, est };
}
// iOS only allows speech after a tap; speaking nothing during the first tap unlocks it.
let unlocked = false;
export function unlockSpeech() {
  if (unlocked || !synth) return;
  unlocked = true;
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) { /* ignore */ }
  load();
}
