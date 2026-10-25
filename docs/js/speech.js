// Voices for patients and Nurse Pat.
// 1) Recorded lines: docs/voice/manifest.json lists a recording for each sentence each voice can say.
//    If every sentence of a line has one, the line plays through Web Audio, one sentence after
//    another, nudged in pitch and speed for the speaker's age and mood.
// 2) Otherwise the device's own text-to-speech, using the most natural voice the device has,
//    with pitch, speed and pauses shaped by the speaker's mood.
// Either way, nothing here can stall the game: if a voice does not start quickly it is dropped,
// and every line has a hard time limit.
import { music, sfx } from './audio.js';

export const voice = { enabled: true, robot: false, squeaky: false, speed: 1 };
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let all = [];
const FEMALE = /samantha|victoria|karen|moira|tessa|fiona|zira|susan|hazel|serena|allison|\bava\b|kate|kathy|princess|vicki|catherine|nicky|martha|joana|female|woman|libby|sonia|aria|jenny|michelle|emma|olivia|zoe|noelle|shelley|sandy|flo|grandma|ana\b|emily|natasha|clara|nora|ivy|joanna|kendra|kimberly|salli|amy|ruth|siri female/i;
const MALE = /\balex\b|daniel|fred|\btom\b|david|mark|rishi|george|aaron|arthur|oliver|\blee\b|gordon|ralph|junior|albert|\bmale\b|\bman\b|ryan|guy|eric|james|brian|christopher|roger|thomas|evan|nathan|reed|rocko|eddy|grandpa|andrew|steffan|davis|tony|jason|matthew|joey|justin|kevin|siri male/i;
const NOVELTY = /bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|hysterical|deranged|pipe organ|albert|junior|ralph|fred|kathy|princess/i;
const ROBOT = /zarvox|trinoids|ralph|fred/i;
// voices that sound like people, best first
const QUALITY = [/natural/i, /neural/i, /premium/i, /enhanced/i, /siri/i, /google (us|uk) english/i, /online/i];
function load() {
  if (!synth) return;
  all = synth.getVoices().filter(v => /^en(-|_|$)/i.test(v.lang));
}
if (synth) { load(); if (synth.addEventListener) synth.addEventListener('voiceschanged', load); else synth.onvoiceschanged = load; }
// headless test runs stay quiet and fast
const QUIET = typeof navigator !== 'undefined' && (navigator.webdriver || /[?&](test|lineup)\b/.test(location.search));

export const canSpeak = () => !!synth && typeof SpeechSynthesisUtterance !== 'undefined' && all.length > 0;

const hashStr = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };
const score = v => { const i = QUALITY.findIndex(r => r.test(v.name)); return (i < 0 ? 0 : 10 - i) + (/en[-_]US/i.test(v.lang) ? 0.5 : /en[-_]GB/i.test(v.lang) ? 0.3 : 0); };
function pickVoice(who) {
  const normal = all.filter(v => !NOVELTY.test(v.name));
  if (voice.robot) { const r = all.find(v => ROBOT.test(v.name) && NOVELTY.test(v.name)) || all.find(v => ROBOT.test(v.name)); if (r) return r; }
  const want = who.gender === 'f' ? FEMALE : MALE;
  const avoid = who.gender === 'f' ? MALE : FEMALE;
  let list = normal.filter(v => want.test(v.name) && !(who.gender === 'f' ? /\bmale\b/i : /female/i).test(v.name));
  if (!list.length) list = normal.filter(v => !avoid.test(v.name));
  if (!list.length) list = normal;
  if (!list.length) return null;
  // keep only the best sounding voices of this kind, then give each speaker a steady pick among them
  const best = Math.max(...list.map(score));
  const top = list.filter(v => score(v) >= best - 0.6);
  return top[hashStr(who.id || who.name || 'x') % top.length];
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
// A line is recorded sentence by sentence, so lines built from pieces (goodbyes, two-part complaints)
// still find their recordings. Returns [{ say, key }] for the parts that have words in them.
export function pieces(text) {
  // tags and stage directions go first, so a "(sentence.)" inside parentheses is not cut in half
  const raw = String(text || '').replace(/<[^>]+>/g, ' ').replace(/\([^)]*\)/g, ' ').split(/(?<=[.!?\u2026])["'\]]*\s+/);
  const out = [];
  for (const r of raw) { const say = speakable(r); if (say) out.push({ say, key: lineKey(say) }); }
  return out;
}
// the key a recording is filed under (same rule as the build script)
export function lineKey(text) {
  const t = speakable(text).toLowerCase().replace(/[^a-z0-9?! ]+/g, ' ').replace(/\s+/g, ' ').trim();
  let a = 0x811c9dc5, b = 0x9747b28c;
  for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); a = Math.imul(a ^ c, 16777619) >>> 0; b = Math.imul(b ^ c, 0x5bd1e995) >>> 0; b = (b ^ (b >>> 13)) >>> 0; }
  return a.toString(36) + b.toString(36);
}

// How each mood changes a voice: pitch and speed multipliers, and pauses between sentences (seconds).
export const MOODS = {
  neutral: { p: 1, r: 1, gap: 0.15 },
  smile: { p: 1.03, r: 1.02, gap: 0.14 },
  happy: { p: 1.08, r: 1.06, gap: 0.1 },
  laugh: { p: 1.12, r: 1.1, gap: 0.08 },
  surprised: { p: 1.12, r: 1.06, gap: 0.12 },
  scared: { p: 1.14, r: 1.16, gap: 0.06 },
  worried: { p: 1.04, r: 0.97, gap: 0.22 },
  ouch: { p: 1.1, r: 1.14, gap: 0.05 },
  angry: { p: 0.94, r: 1.12, gap: 0.08 },
  yell: { p: 0.98, r: 1.16, gap: 0.05 },
  sad: { p: 0.92, r: 0.86, gap: 0.35 },
  cry: { p: 0.96, r: 0.84, gap: 0.4 },
  smug: { p: 0.95, r: 0.92, gap: 0.2 },
  sleep: { p: 0.9, r: 0.8, gap: 0.4 },
  disgust: { p: 0.96, r: 0.98, gap: 0.2 },
};
const AGE = {
  baby: { p: 1.9, r: 1 }, kid: { p: 1.5, r: 1.06 }, teen: { p: 1.18, r: 1.08 },
  adultm: { p: 0.9, r: 1.02 }, adultf: { p: 1.08, r: 1.02 }, elderm: { p: 0.78, r: 0.88 }, elderf: { p: 0.95, r: 0.88 },
};
const ageKey = who => (who.age === 'adult' || who.age === 'elder' ? who.age + (who.gender === 'f' ? 'f' : 'm') : who.age || 'adultm');
// recorded voices also tell teen boys and girls apart
const recKey = who => (who.id === 'nurse-pat' ? 'nurse' : who.age === 'teen' ? 'teen' + (who.gender === 'f' ? 'f' : 'm') : ageKey(who));

// ---------------- recorded lines ----------------
let manifest = null, manifestP = null, actx = null;
const bufCache = new Map();
function loadManifest() {
  if (!manifestP) manifestP = fetch('voice/manifest.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null).then(m => {
    // lines: { voiceId: 'key key key' } becomes a Set per voice
    if (m && m.lines) for (const id of Object.keys(m.lines)) m.lines[id] = new Set(String(m.lines[id]).split(' '));
    manifest = m; return m;
  });
  return manifestP;
}
if (!QUIET && typeof fetch !== 'undefined') loadManifest();
// which recorded voice suits this speaker (the manifest lists voices per age and gender)
function recVoice(who) {
  if (!manifest || !manifest.voices) return null;
  const k = recKey(who);
  const list = manifest.voices[k] || manifest.voices[ageKey(who)] || manifest.voices[who.gender === 'f' ? 'adultf' : 'adultm'];
  if (!list || !list.length) return null;
  return list[hashStr(who.id || who.name || 'x') % list.length];
}
// every sentence of the line needs a recording in this voice, or the whole line uses the device voice
function recFor(text, who) {
  const v = recVoice(who); if (!v) return null;
  const set = manifest.lines && manifest.lines[v.id];
  if (!set) return null;
  const parts = pieces(text);
  if (!parts.length || !parts.every(p => set.has(p.key))) return null;
  return { urls: parts.map(p => `voice/${v.id}/${p.key}.mp3`), v };
}
async function loadClip(url) {
  let buf = bufCache.get(url);
  if (buf) return buf;
  const res = await fetch(url).catch(() => null);
  if (!res || !res.ok) return null;
  buf = await actx.decodeAudioData(await res.arrayBuffer()).catch(() => null);
  if (!buf) return null;
  if (bufCache.size > 120) bufCache.delete(bufCache.keys().next().value);
  bufCache.set(url, buf);
  return buf;
}
async function playRecorded(rec, who, mood, entry) {
  if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false; actx = new AC(); }
  if (actx.state === 'suspended') { try { await actx.resume(); } catch (e) { /* ignore */ } }
  const bufs = await Promise.all(rec.urls.map(loadClip));
  if (bufs.some(b => !b)) return false;
  if (entry.finished) return true;
  const m = MOODS[mood] || MOODS.neutral;
  // the recording already sounds like the right kind of person; small shifts for age, person and mood
  const shift = (rec.v.shift || 1) * (who.pitch ? 1 + Math.max(-0.06, Math.min(0.06, (who.pitch - 1) * 0.6)) : 1) * Math.sqrt(m.p * m.r);
  const rate = Math.max(0.6, Math.min(1.8, shift * (voice.squeaky ? 1.5 : 1) * (voice.robot ? 0.85 : 1) * Math.sqrt(voice.speed || 1)));
  const g = actx.createGain(); g.gain.value = Math.min(1, sfx.vol); g.connect(actx.destination);
  // sentences back to back, with the mood's pause between them
  let t = actx.currentTime + 0.02;
  const srcs = [];
  bufs.forEach((buf, i) => {
    const src = actx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    src.connect(g); src.start(t); srcs.push(src);
    t += buf.duration / rate + (i < bufs.length - 1 ? m.gap : 0);
  });
  const dur = t - actx.currentTime;
  entry.stopFn = () => { for (const s of srcs) { try { s.stop(); } catch (e) { /* ignore */ } } };
  srcs[srcs.length - 1].onended = () => entry.finish();
  entry.started(dur);
  return true;
}

// ---------------- device voices ----------------
function splitSentences(t) {
  const out = t.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [t];
  return out.map(s => s.trim()).filter(Boolean);
}
function speakDevice(say, who, mood, entry) {
  const v = pickVoice(who);
  const a = AGE[ageKey(who)] || AGE.adultm;
  const m = MOODS[mood] || MOODS.neutral;
  let pitch = a.p * m.p * (who.pitch ? Math.max(0.75, Math.min(1.3, who.pitch)) : 1);
  let rate = a.r * m.r * (who.excited ? 1.1 : 1);
  if (voice.squeaky) pitch = 2;
  if (voice.robot) { pitch = Math.min(pitch, 0.4); rate *= 0.9; }
  const parts = splitSentences(say);
  let i = 0, startedOnce = false;
  const next = () => {
    if (entry.finished) return;
    if (i >= parts.length) { entry.finish(); return; }
    let s = parts[i++];
    // a little extra lift on questions and exclamations
    const ex = /!$/.test(s) ? 1.04 : /\?$/.test(s) ? 1.03 : 1;
    const u = new SpeechSynthesisUtterance(s);
    if (v) { u.voice = v; u.lang = v.lang; }
    u.pitch = Math.max(0, Math.min(2, pitch * ex));
    u.rate = Math.max(0.5, Math.min(1.8, rate * voice.speed * (/!$/.test(s) ? 1.04 : 1)));
    u.volume = Math.min(1, sfx.vol);
    u.onstart = () => { if (!startedOnce) { startedOnce = true; entry.started(say.length / (13 * u.rate) + parts.length * m.gap); } };
    u.onend = () => { if (entry.finished) return; setTimeout(next, m.gap * 1000); };
    u.onerror = () => entry.finish();
    try { synth.speak(u); } catch (e) { entry.finish(); }
  };
  entry.stopFn = () => { try { synth.cancel(); } catch (e) { /* ignore */ } };
  // Chrome sometimes drops the first utterance right after cancel(); give it a beat
  setTimeout(next, 30);
}

let current = null;
export function stop() {
  if (current) { const c = current; current = null; c.finish(); }
  if (synth) { try { synth.cancel(); } catch (e) { /* ignore */ } }
}
// who: { id, name, gender: 'm'|'f', age: 'kid'|'teen'|'adult'|'elder'|'baby', pitch (around 1), mood }
// Returns null when nothing is spoken, or { done: Promise, est: seconds, skip() }.
// done always resolves: when the line ends, when it is skipped, if the voice never starts (1.2s),
// or at a hard limit based on the length of the line.
export function speak(text, who = {}) {
  if (QUIET || !voice.enabled || sfx.muted) return null;
  const say = speakable(text);
  if (!say) return null;
  const rec = manifest ? recFor(text, who) : null;
  if (!rec && !canSpeak()) return null;
  stop();
  const mood = who.mood || 'neutral';
  let resolve;
  const done = new Promise(r => { resolve = r; });
  const timers = [];
  const est0 = say.length / 13 + 0.5;
  const entry = {
    finished: false, stopFn: null,
    started(dur) {
      if (entry.finished || entry.isStarted) return;
      entry.isStarted = true;
      clearTimeout(timers[0]);
      music.duck(true);
      who.onStart && who.onStart(dur);
      // hard limit once speaking: the length of the line plus a little
      timers.push(setTimeout(() => entry.finish(), (Math.max(dur, 0.5) * 1.35 + 1.2) * 1000));
    },
    finish() {
      if (entry.finished) return;
      entry.finished = true;
      timers.forEach(clearTimeout);
      if (entry.stopFn) entry.stopFn();
      if (current === entry) current = null;
      music.duck(false);
      who.onEnd && who.onEnd();
      resolve();
    },
  };
  current = entry;
  // a voice that has not started within 1.2 seconds is not going to; move on without it
  // (recordings get a little longer, since the first play of a line downloads it)
  timers[0] = setTimeout(() => { if (!entry.isStarted) entry.finish(); }, rec ? 2000 : 1200);
  if (rec) playRecorded(rec, who, mood, entry).then(ok => { if (!ok && !entry.finished) { if (canSpeak()) speakDevice(say, who, mood, entry); else entry.finish(); } });
  else speakDevice(say, who, mood, entry);
  return { done, est: est0, skip: () => entry.finish(), get started() { return !!entry.isStarted; } };
}
// iOS only allows speech after a tap; speaking nothing during the first tap unlocks it.
let unlocked = false;
export function unlockSpeech() {
  if (unlocked) return;
  unlocked = true;
  if (synth) { try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) { /* ignore */ } }
  try { const AC = window.AudioContext || window.webkitAudioContext; if (AC && !actx) actx = new AC(); if (actx && actx.state === 'suspended') actx.resume(); } catch (e) { /* ignore */ }
  load();
}
