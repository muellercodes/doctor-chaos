// Tiny synth sound kit. Everything is generated, no audio files.
let ctx = null;
let master = null;
let musicGain = null;
let sfxBus = null;
let sfxVol = 1, musicVol = 1, pitchMul = 1;
let muted = false;
let noiseBuf = null;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.8;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.3 * musicVol;
  musicGain.connect(master);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = sfxVol;
  sfxBus.connect(master);
  const len = ctx.sampleRate * 1.5;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

function tone({ freq = 440, type = 'sine', dur = 0.15, vol = 0.3, attack = 0.005, slide = 0, delay = 0, pan = 0, dest = null }) {
  const c = ensure(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = g;
  o.connect(g);
  if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
  node.connect(dest || sfxBus);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise({ dur = 0.3, vol = 0.3, freq = 1200, q = 1, type = 'bandpass', slide = 0, delay = 0, pan = 0 }) {
  const c = ensure(); if (!c) return;
  const t = c.currentTime + delay;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g);
  let node = g;
  if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
  node.connect(sfxBus);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

export const sfx = {
  unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); },
  get muted() { return muted; },
  get vol() { return sfxVol; },
  setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.8; },
  setVolumes(sv, mv) { sfxVol = sv; musicVol = mv; if (sfxBus) sfxBus.gain.value = sv; if (musicGain) musicGain.gain.value = 0.3 * mv; },
  set pitch(v) { pitchMul = v; },
  get pitch() { return pitchMul; },
  blip(p = 1) { tone({ freq: 520 * p, type: 'square', dur: 0.06, vol: 0.05 }); },
  babble(text, pitch = 1) {
    const letters = text.replace(/[^a-z]/gi, '').slice(0, 26);
    for (let i = 0; i < letters.length; i += 2) {
      const code = letters.charCodeAt(i) % 7;
      tone({ freq: (220 + code * 28) * pitch * pitchMul, type: 'triangle', dur: 0.06, vol: 0.06, delay: i * 0.032 });
    }
  },
  click() { tone({ freq: 700, type: 'triangle', dur: 0.05, vol: 0.12 }); },
  pop() { tone({ freq: 300, type: 'sine', dur: 0.12, vol: 0.25, slide: 2.6 }); },
  ding() { tone({ freq: 880, type: 'sine', dur: 0.5, vol: 0.2 }); tone({ freq: 1320, type: 'sine', dur: 0.6, vol: 0.12, delay: 0.08 }); },
  good() { [523, 659, 784].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.18, delay: i * 0.07 })); },
  great() { [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, type: 'square', dur: 0.2, vol: 0.09, delay: i * 0.08 })); },
  bad() { tone({ freq: 220, type: 'sawtooth', dur: 0.35, vol: 0.14, slide: 0.6 }); },
  buzz() { tone({ freq: 110, type: 'square', dur: 0.4, vol: 0.18 }); tone({ freq: 117, type: 'sawtooth', dur: 0.4, vol: 0.12 }); },
  ouch(p = 1) { tone({ freq: 600 * p, type: 'triangle', dur: 0.25, vol: 0.18, slide: 0.55 }); },
  coin() { tone({ freq: 988, type: 'square', dur: 0.08, vol: 0.08 }); tone({ freq: 1319, type: 'square', dur: 0.3, vol: 0.08, delay: 0.08 }); },
  cash() { noise({ dur: 0.08, vol: 0.2, freq: 3000 }); [1319, 1568, 2093].forEach((f, i) => tone({ freq: f, type: 'square', dur: 0.12, vol: 0.06, delay: 0.05 + i * 0.06 })); },
  gavel() { noise({ dur: 0.15, vol: 0.5, freq: 400, q: 2 }); tone({ freq: 140, type: 'sine', dur: 0.25, vol: 0.4 }); noise({ dur: 0.15, vol: 0.4, freq: 400, q: 2, delay: 0.25 }); tone({ freq: 140, type: 'sine', dur: 0.25, vol: 0.35, delay: 0.25 }); },
  whoosh() { noise({ dur: 0.35, vol: 0.18, freq: 400, slide: 6, q: 0.7 }); },
  jump() { tone({ freq: 300, type: 'square', dur: 0.18, vol: 0.08, slide: 2.2 }); },
  thud() { tone({ freq: 90, type: 'sine', dur: 0.2, vol: 0.4, slide: 0.5 }); noise({ dur: 0.1, vol: 0.2, freq: 300 }); },
  boing() { tone({ freq: 180, type: 'sine', dur: 0.4, vol: 0.3, slide: 3 }); },
  squeak() { tone({ freq: 1400, type: 'sine', dur: 0.12, vol: 0.12, slide: 1.4 }); },
  crack() { noise({ dur: 0.08, vol: 0.4, freq: 2500, q: 3 }); noise({ dur: 0.06, vol: 0.3, freq: 1800, q: 3, delay: 0.05 }); },
  zip() { noise({ dur: 0.4, vol: 0.15, freq: 2000, q: 4, slide: 2 }); },
  stitch() { tone({ freq: 1100, type: 'triangle', dur: 0.07, vol: 0.12 }); },
  splat() { noise({ dur: 0.25, vol: 0.35, freq: 600, slide: 0.3, q: 1 }); },
  sneeze() { noise({ dur: 0.12, vol: 0.12, freq: 800, delay: 0 }); noise({ dur: 0.5, vol: 0.5, freq: 2200, slide: 0.4, q: 0.8, delay: 0.05 }); },
  ahh(p = 1) { tone({ freq: 300 * p, type: 'triangle', dur: 0.35, vol: 0.08, slide: 1.25 }); },
  giggle(pan = 0, p = 1) { for (let i = 0; i < 4; i++) tone({ freq: (700 + Math.random() * 120) * p, type: 'sine', dur: 0.07, vol: 0.12, delay: i * 0.09, pan }); },
  heartbeat(vol = 0.5, pan = 0) {
    tone({ freq: 60, type: 'sine', dur: 0.12, vol: 0.9 * vol, slide: 0.7, pan });
    tone({ freq: 55, type: 'sine', dur: 0.1, vol: 0.6 * vol, slide: 0.7, delay: 0.16, pan });
  },
  beep() { tone({ freq: 1000, type: 'sine', dur: 0.08, vol: 0.06 }); },
  flatline() { tone({ freq: 1000, type: 'sine', dur: 1.2, vol: 0.08 }); },
  rattle() { noise({ dur: 0.06, vol: 0.18, freq: 4000, q: 2 }); },
  wah(p = 1) { tone({ freq: 500 * p, type: 'sawtooth', dur: 0.5, vol: 0.05, slide: 1.4 }); tone({ freq: 700 * p, type: 'sawtooth', dur: 0.4, vol: 0.04, slide: 0.6, delay: 0.45 }); },
  snore() { noise({ dur: 0.8, vol: 0.08, freq: 200, q: 2, slide: 1.6 }); },
  step() { tone({ freq: 140, type: 'sine', dur: 0.05, vol: 0.06 }); },
  door() { tone({ freq: 200, type: 'square', dur: 0.12, vol: 0.05, slide: 0.7 }); noise({ dur: 0.12, vol: 0.1, freq: 500 }); },
  slip() { tone({ freq: 900, type: 'sine', dur: 0.35, vol: 0.12, slide: 0.3 }); },
  fanfare() { [392, 523, 659, 784, 659, 784].forEach((f, i) => tone({ freq: f, type: 'square', dur: 0.22, vol: 0.07, delay: i * 0.12 })); },
};

// ---------- music ----------
// A tiny step sequencer: pads, bass, a lead line and drums, all synthesized.
// Songs change with what is happening (title, clinic, mini-games, chases, surgery) and short stings
// play for big moments (promotion, lawsuits, end of the day).
const CH = { maj: [0, 4, 7], min: [0, 3, 7], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], dom7: [0, 4, 7, 10], sus: [0, 5, 7] };
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const chord = name => { const m = name.match(/^([A-G][#b]?)(.*)$/); return { root: NOTE[m[1]], type: CH[m[2] || 'maj'] || CH.maj }; };
const n = s => s.split(' ').map(x => (x === '.' ? null : Number(x)));
const SONGS = {
  title: { bpm: 112, lead: 'square', leadVol: 0.85, chords: ['C', 'G', 'Am', 'F'], bass: 'R..R..5.R..R.O5.',
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.',
    melody: n('72 . 76 79 . 76 74 72 74 . 71 74 . 79 77 76 72 . 76 79 . 81 79 76 77 . 76 74 72 . . .') },
  clinic: { bpm: 90, lead: 'triangle', leadVol: 0.75, chords: ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7'], bass: 'R.......5...R...',
    kick: 'x.......x.......', snare: '........x.......', hat: '....x.......x...',
    melody: n('77 . 76 . 72 . . . 76 . 74 . 71 . . . 74 . 72 . 69 . 72 . 71 . 72 . 67 . . .') },
  focus: { bpm: 104, lead: 'triangle', leadVol: 0.55, chords: ['Am', 'F', 'C', 'G'], bass: 'R.R.R.R.R.R.5.5.',
    kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx',
    melody: n('69 . . 72 . . 76 . 77 . . 76 . . 72 . 72 . . 76 . . 79 . 74 . . 71 . . . .') },
  surgery: { bpm: 74, lead: 'sine', leadVol: 0.8, chords: ['Dm', 'Bb', 'Gm', 'A'], bass: 'R...R...R...R...',
    kick: 'x..x....x..x....', snare: '................', hat: '..x...x...x...x.',
    melody: n('69 . . 72 . . 70 . 67 . . 70 . . 69 . 65 . . 69 . . 67 . 64 . . . 61 . . .') },
  chase: { bpm: 160, lead: 'square', leadVol: 0.6, chords: ['Em', 'C', 'D', 'B'], bass: 'R.RO.RR.R.RO.R5.',
    kick: 'x...x...x...x...', snare: '....x.......x..x', hat: 'x.x.x.x.x.x.x.x.',
    melody: n('76 79 83 79 76 79 83 86 84 83 81 79 76 79 81 83 74 78 81 78 74 78 81 86 83 81 79 78 75 78 79 81') },
  secret: { bpm: 132, lead: 'square', leadVol: 0.75, chords: ['F', 'C', 'Dm', 'Bb'], bass: 'R.ROR.RO5.5OR.RO',
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
    melody: n('77 79 81 79 77 . 74 76 76 77 79 77 76 . 72 74 74 76 77 76 74 . 70 72 72 74 76 77 79 81 84 .') },
};
const STINGS = {
  promotion: { bpm: 120, notes: [[60, 0, 1], [64, 1, 1], [67, 2, 1], [72, 3, 2], [67, 5, 1], [72, 6, 4], [76, 6, 4], [79, 6, 4]] },
  win: { bpm: 150, notes: [[72, 0, 1], [76, 1, 1], [79, 2, 1], [84, 3, 3]] },
  lose: { bpm: 90, notes: [[67, 0, 1], [66, 1, 1], [65, 2, 1], [64, 3, 4], [52, 3, 4]] },
  dayEnd: { bpm: 110, notes: [[67, 0, 1], [72, 1, 1], [76, 2, 1], [74, 3, 1], [72, 4, 1], [76, 5, 3], [79, 5, 3], [60, 5, 3]] },
};
let musicTimer = null, currentSong = null, stepI = 0, nextT = 0, duckOn = false;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function drum(kind, t) {
  const d = t - ctx.currentTime;
  if (kind === 'kick') { tone({ freq: 120, type: 'sine', dur: 0.18, vol: 0.5, slide: 0.35, delay: d, dest: musicGain }); }
  if (kind === 'snare') {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    s.connect(f); f.connect(g); g.connect(musicGain); s.start(t, Math.random()); s.stop(t + 0.16);
  }
  if (kind === 'hat') {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    s.connect(f); f.connect(g); g.connect(musicGain); s.start(t, Math.random()); s.stop(t + 0.06);
  }
}
function schedule(song) {
  const st = 60 / song.bpm / 4;
  while (nextT < ctx.currentTime + 0.35) {
    const pos = stepI % 16, bar = Math.floor(stepI / 16);
    const cd = chord(song.chords[bar % song.chords.length]);
    const d = nextT - ctx.currentTime;
    if (pos === 0) for (const iv of cd.type) { tone({ freq: mtof(60 + cd.root + iv - (cd.root > 6 ? 12 : 0)), type: 'triangle', dur: st * 15, vol: 0.035, attack: 0.12, delay: d, dest: musicGain }); }
    const b = song.bass[pos];
    if (b && b !== '.') { const off = b === '5' ? 7 : b === 'O' ? 12 : 0; tone({ freq: mtof(36 + cd.root + off), type: 'triangle', dur: st * 1.8, vol: 0.13, delay: d, dest: musicGain }); }
    if (pos % 2 === 0) {
      const m = song.melody[(stepI / 2) % song.melody.length];
      if (m) tone({ freq: mtof(m), type: song.lead, dur: st * 1.7, vol: 0.05 * song.leadVol, attack: 0.01, delay: d, dest: musicGain });
    }
    if (song.kick[pos] === 'x') drum('kick', nextT);
    if (song.snare[pos] === 'x') drum('snare', nextT);
    if (song.hat[pos] === 'x') drum('hat', nextT);
    nextT += st; stepI++;
  }
}
function setMusicLevel() { if (musicGain && ctx) musicGain.gain.setTargetAtTime(0.3 * musicVol * (duckOn ? 0.45 : 1), ctx.currentTime, 0.15); }

export const music = {
  get current() { return currentSong; },
  play(name) {
    if (currentSong === name) return;
    this.stop();
    const c = ensure(); if (!c) return;
    const song = SONGS[name]; if (!song) return;
    currentSong = name; stepI = 0; nextT = c.currentTime + 0.08;
    musicTimer = setInterval(() => { if (ctx.state === 'running') schedule(song); else nextT = ctx.currentTime + 0.05; }, 60);
  },
  stop() { if (musicTimer) clearInterval(musicTimer); musicTimer = null; currentSong = null; },
  // a short tune over the top; the song keeps going (quietly) underneath
  sting(name) {
    const c = ensure(); if (!c) return;
    const s = STINGS[name]; if (!s) return;
    const b = 60 / s.bpm / 2;
    duckOn = true; setMusicLevel();
    let end = 0;
    for (const [m, at, len] of s.notes) {
      tone({ freq: mtof(m), type: 'square', dur: b * len * 0.95, vol: 0.06, delay: at * b, dest: sfxBus });
      tone({ freq: mtof(m), type: 'triangle', dur: b * len, vol: 0.08, delay: at * b, dest: sfxBus });
      end = Math.max(end, (at + len) * b);
    }
    setTimeout(() => { duckOn = false; setMusicLevel(); }, end * 1000 + 300);
  },
  duck(on) { duckOn = !!on; setMusicLevel(); },
};
