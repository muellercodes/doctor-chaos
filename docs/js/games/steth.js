import * as THREE from 'three';
import { stethoscope } from '../props.js';
import { clamp, rand, pick } from '../engine.js';
import { h } from '../ui.js';

const TICKLE = ['Hehe— HAHA— stop!', 'PFFT! That tickles!', 'Hahahaha NO—', "Hee hee! I can't— HAHA!"];

export async function play(G, P, prm = {}) {
  const { E, ui, sfx } = G;
  const person = P.person;
  const variant = prm.variant || 'normal';
  await G.howTo('steth', 'Stethoscope: Find the Heartbeat', [
    'Move the stethoscope around the chest. <b>Listen</b>: the heartbeat gets <b>louder</b> (and the ring glows) when you are close.',
    '<b>Press and hold</b> on the loudest spot to lock it in.',
    'Then <b>tap along</b> with the heartbeat (click or press Space) when each beat reaches the line.',
  ], '🩺');
  const S = E.scope();
  person.setPose('sit');
  await E.wait(0.3);
  person.snap();
  const s = person.s;
  const chest = person.chestFront();
  const center = chest.clone(); center.y -= (variant === 'trench' ? 0.14 : 0.06) * s;
  await E.frame(center, 0.6 * s, (variant === 'trench' ? 0.62 : 0.48) * s, new THREE.Vector3(0, 0.12, 1), 0.8);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(chest.z + 0.025 * s));
  const st = stethoscope(); st.scale.setScalar(s * 1.5); S.add(st);
  const glow = st.userData.glow;
  const spots = [];
  if (variant === 'trench') {
    spots.push(new THREE.Vector3(chest.x + 0.05 * s, chest.y + 0.01 * s, 0));
    spots.push(new THREE.Vector3(chest.x - 0.04 * s, chest.y - 0.16 * s, 0));
    spots.push(new THREE.Vector3(chest.x + 0.03 * s, chest.y - 0.3 * s, 0));
  } else spots.push(new THREE.Vector3(chest.x + rand(0.03, 0.08) * s, chest.y + rand(-0.05, 0.03) * s, 0));
  const found = [];
  const lockR = 0.032 * s * G.tol * (G.tutorial ? 1.3 : 1);
  const hearR = 0.24 * s;
  const sigM = ui.meter({ label: 'Heartbeat signal', value: 0, fill: '#5dffb0' });
  const lockM = ui.meter({ label: 'Lock in', value: 0, fill: '#3ec1d3' });
  const tickM = variant === 'ticklish' ? ui.meter({ label: 'Tickle danger', value: 0, fill: '#ff5d8f' }) : null;
  ui.hint(variant === 'ticklish' ? 'Find the heartbeat. Move <b>SLOWLY</b> or they will giggle!' : 'Find the <b>loudest</b> heartbeat, then <b>press and hold</b> there.');
  const bpm = variant === 'trench' ? 118 : { kid: 100, teen: 92, adult: 78, elder: 68 }[P.c.ageGroup] || 80;
  let beat = 0, lock = 0, t = 0, tickle = 0, tickles = 0, flail = 0;
  let lastP = null;
  const minX = chest.x - 0.19 * s, maxX = chest.x + 0.19 * s, maxY = chest.y + 0.12 * s, minY = chest.y - (variant === 'trench' ? 0.42 : 0.32) * s;
  let foundTime = 0;
  G.dbg = { kind: 'steth', phase: 'find', spots, found, chestZ: chest.z };
  while (found.length < spots.length) {
    await new Promise(res => {
      const off = S.update(dt => {
        t += dt;
        let p = E.pointerOnPlane(plane);
        if (p) { p.x = clamp(p.x, minX, maxX); p.y = clamp(p.y, minY, maxY); }
        if (flail > 0) { flail -= dt; st.position.y -= dt * 0.5; return; }
        if (!p) return;
        st.position.set(p.x, p.y, plane.constant * -1);
        // nearest unfound spot
        let near = null, nd = 1e9;
        spots.forEach((sp, i) => { if (found.includes(i)) return; const d = Math.hypot(sp.x - p.x, sp.y - p.y); if (d < nd) { nd = d; near = i; } });
        const close = Math.pow(clamp(1 - nd / hearR, 0, 1), 1.6);
        sigM.set(close);
        beat += dt * bpm / 60;
        if (beat >= 1) {
          beat -= 1;
          sfx.heartbeat(0.08 + close * 0.92);
          if (variant === 'trench' && close > 0.3) setTimeout(() => sfx.heartbeat(0.3 * close), 140);
          glow.material.opacity = 0.2 + close * 0.8;
          st.scale.setScalar(s * 1.5 * (1 + close * 0.12));
        }
        glow.material.opacity *= Math.pow(0.05, dt);
        st.scale.lerp(new THREE.Vector3(s * 1.5, s * 1.5, s * 1.5), dt * 8);
        // tickles
        if (variant === 'ticklish' && lastP) {
          const sp = p.distanceTo(lastP) / dt / s;
          if (sp > 0.55) { tickle += (sp - 0.55) * dt * 0.9; if (Math.random() < dt * 6) { sfx.giggle(0, P.c.voice || 1); person.expr('laugh'); person.wiggle = 0.3; } }
          tickle = Math.max(0, tickle - dt * 0.15);
          tickM.set(tickle);
          if (tickle >= 1) {
            tickle = 0; tickles++; flail = 1.4; lock = 0;
            person.expr('laugh'); person.wiggle = 1.4; person.setPose('scared');
            sfx.giggle(0, P.c.voice || 1); setTimeout(() => sfx.giggle(0, P.c.voice || 1), 300);
            G.say(pick(TICKLE), { key: 'c', hold: 0.9 });
            ui.popCenter('TICKLE ATTACK!', 'bad');
            setTimeout(() => { person.setPose('sit'); person.expr('smile'); }, 1300);
            spots[near].x = chest.x + rand(0.0, 0.09) * s; spots[near].y = chest.y + rand(-0.06, 0.04) * s;
          }
        }
        lastP = p.clone();
        if (E.input.down && nd < lockR) lock += dt / 0.9; else lock = Math.max(0, lock - dt * 2);
        lockM.set(lock);
        if (lock >= 1) { lock = 0; found.push(near); off(); res(); }
      });
    });
    sfx.ding();
    ui.popAt(st.position, 'FOUND IT!', 'good');
    if (!foundTime) foundTime = t;
    if (variant === 'trench') {
      if (found.length === 1) {
        await ui.nurse('Doctor... I just heard <b>another</b> heartbeat. Somewhere lower.', { button: 'Uh oh' });
        await G.say('I am... very healthy.', { key: 'c', hold: 0.6 });
      } else if (found.length === 2) {
        await G.say('Those are... uh... my backup hearts. Adults have three. Everyone knows that.', { key: 'c', hold: 0.6 });
      }
    }
  }
  sigM.remove(); lockM.remove(); if (tickM) tickM.remove();
  if (variant === 'trench') {
    person.wiggle = 2; sfx.whoosh();
    await G.say("OK FINE! We're THREE KIDS in a trench coat! We just wanted the free lollipops!", { key: 'c', hold: 1 });
    ui.popCenter('🧒🧒🧒', 'good');
  }
  // ---- rhythm ----
  ui.hint('<b>Tap along</b> with the heartbeat! Click or press <b>Space</b> when each beat hits the line.');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const lane = S.dom(h('div', 'lane'));
  lane.innerHTML = '<div class="lane-line"></div><div class="lane-label">❤ tap on the beat</div>';
  ui.root.appendChild(lane);
  const nBeats = 6;
  const period = 60 / bpm;
  const startAt = E.time + 1.6;
  const notes = [];
  for (let i = 0; i < nBeats; i++) {
    const el = h('div', 'note', '❤'); lane.appendChild(el);
    notes.push({ t: startAt + i * period, el, judged: false, played: false });
  }
  let taps = [];
  G.dbg.phase = 'rhythm'; G.dbg.notes = notes;
  const tapFn = () => taps.push(E.time);
  S.on('down', tapFn);
  S.key((e, down) => { if (down && e.code === 'Space' && !e.repeat) tapFn(); });
  let rScore = 0;
  const judge = (n, err) => {
    n.judged = true;
    let label, pts, cls;
    if (err < 0.08) { label = 'PERFECT'; pts = 100; cls = 'good'; } else if (err < 0.16) { label = 'GOOD'; pts = 75; cls = 'good'; } else if (err < 0.3) { label = 'OK'; pts = 45; cls = ''; } else { label = 'MISS'; pts = 0; cls = 'bad'; }
    rScore += pts;
    n.el.classList.add(pts ? 'hit' : 'miss');
    const r = lane.getBoundingClientRect();
    ui.pop(label, r.left + r.width * 0.2, r.top - 10, cls);
  };
  await new Promise(res => {
    const off = S.update(() => {
      const now = E.time;
      const W = lane.clientWidth;
      for (const n of notes) {
        const x = W * 0.2 + (n.t - now) * W * 0.32;
        n.el.style.transform = `translateX(${x}px)`;
        if (!n.played && now >= n.t) { n.played = true; sfx.heartbeat(0.8); st.scale.setScalar(s * 1.7); }
        if (!n.judged && now > n.t + 0.32) judge(n, 1);
      }
      st.scale.lerp(new THREE.Vector3(s * 1.5, s * 1.5, s * 1.5), 0.15);
      while (taps.length) {
        const tp = taps.shift();
        let best = null, be = 1e9;
        for (const n of notes) { if (n.judged) continue; const e = Math.abs(tp - n.t); if (e < be) { be = e; best = n; } }
        if (best && be < 0.4) judge(best, be);
      }
      if (notes.every(n => n.judged)) { off(); res(); }
    });
  });
  await E.wait(0.4);
  ui.hint(null);
  S.end();
  person.setPose('sit');
  const findScore = clamp(100 - Math.max(0, foundTime - 7) * 4 - tickles * 12, 30, 100);
  const score = clamp(findScore * 0.45 + (rScore / nBeats) * 0.55, 10, 100);
  return { score, fail: false };
}
