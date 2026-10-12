// Tiny synth sound kit. Everything is generated, no audio files.
let ctx = null;
let master = null;
let musicGain = null;
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
  musicGain.gain.value = 0.22;
  musicGain.connect(master);
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
  node.connect(dest || master);
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
  node.connect(master);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

export const sfx = {
  unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); },
  get muted() { return muted; },
  setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.8; },
  blip(p = 1) { tone({ freq: 520 * p, type: 'square', dur: 0.06, vol: 0.05 }); },
  babble(text, pitch = 1) {
    const letters = text.replace(/[^a-z]/gi, '').slice(0, 26);
    for (let i = 0; i < letters.length; i += 2) {
      const code = letters.charCodeAt(i) % 7;
      tone({ freq: (220 + code * 28) * pitch, type: 'triangle', dur: 0.06, vol: 0.06, delay: i * 0.032 });
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
const SONGS = {
  clinic: { bpm: 92, wave: 'triangle', vol: 0.5, bass: [48, 48, 53, 53, 50, 50, 55, 55], lead: [72, null, 76, 74, 72, null, 69, null, 71, null, 74, 72, 71, null, 67, null, 69, null, 72, 71, 69, null, 65, null, 67, 69, 71, 72, 74, null, null, null] },
  chase: { bpm: 168, wave: 'square', vol: 0.32, bass: [45, 45, 57, 45, 48, 48, 60, 48, 43, 43, 55, 43, 40, 40, 52, 44], lead: [69, 72, 76, 72, 69, 72, 76, 79, 77, 76, 74, 72, 71, 72, 74, 76, 72, 76, 79, 76, 72, 76, 79, 84, 83, 81, 79, 77, 76, 74, 72, 71] },
  surgery: { bpm: 76, wave: 'sine', vol: 0.5, bass: [45, null, 45, null, 41, null, 41, null], lead: [69, null, null, 72, null, null, 71, null, 68, null, null, 71, null, null, 69, null] },
};
let musicTimer = null;
let currentSong = null;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

export const music = {
  play(name) {
    if (currentSong === name) return;
    this.stop();
    const c = ensure(); if (!c) return;
    const song = SONGS[name]; if (!song) return;
    currentSong = name;
    const step = 60 / song.bpm / 2;
    let i = 0;
    let next = c.currentTime + 0.1;
    musicTimer = setInterval(() => {
      if (next < c.currentTime) next = c.currentTime + 0.05;
      while (next < c.currentTime + 0.3) {
        const b = song.bass[Math.floor(i / 2) % song.bass.length];
        if (i % 2 === 0 && b) tone({ freq: mtof(b), type: 'triangle', dur: step * 1.6, vol: 0.16 * song.vol, delay: next - c.currentTime, dest: musicGain });
        const l = song.lead[i % song.lead.length];
        if (l) tone({ freq: mtof(l), type: song.wave, dur: step * 0.9, vol: 0.12 * song.vol, delay: next - c.currentTime, dest: musicGain });
        next += step; i++;
      }
    }, 80);
  },
  stop() { if (musicTimer) clearInterval(musicTimer); musicTimer = null; currentSong = null; },
};
