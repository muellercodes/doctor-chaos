// Eye drops: one drop in each eye. The patient blinks. A lot. On purpose, probably.
import * as THREE from 'three';
import { clamp, rand, pick, toon } from '../engine.js';
import { icon } from '../icons.js';
import { holdWith } from '../props.js';

const NOSE = ["That's my nose!", 'My cheek is not thirsty.', 'Wrong spot! That went in my ear. Somehow.', 'Ack! My forehead!'];
const LID = ['Hey! You got my eyelid!', 'I blinked! Sorry! Not sorry!', 'My eye closed by itself! It does that!'];
const GOOD = ['Ahh, cold!', 'Ooh, that feels better.', 'Blinky blinky blinky!', 'WOW, that is refreshing.'];

function dropper() {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.07, 12), new THREE.MeshStandardMaterial({ color: '#bde0fe', transparent: true, opacity: 0.8 }));
  glass.material.userData.dispose = true; glass.position.y = 0.035; g.add(glass);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), toon('#ff5d8f')); bulb.scale.y = 1.4; bulb.position.y = 0.082; g.add(bulb);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.008, 12), toon('#ffffff')); ring.position.y = 0.066; g.add(ring);
  g.userData.bulb = bulb;
  return g;
}

export async function play(G, P) {
  const { E, ui, sfx } = G;
  const person = P.person;
  await G.howTo('drops', 'Eye Drops', [
    'Move the dropper <b>right above an eye</b>.',
    'Click to squeeze out <b>one drop</b>. It only counts if the eye is <b>open</b> when it lands.',
    'One drop in <b>each eye</b>. Watch out, this patient blinks a LOT.',
  ], icon('drops'));
  const S = E.scope();
  person.setPose('sit'); await E.wait(0.2);
  person.idle = false; S.defer(() => { person.idle = true; person.lookPitch = 0; person.face.blinkT = 2; });
  await E.tween(0.5, k => { person.lookPitch = -0.55 * k; });
  person.root.updateMatrixWorld(true);
  const s = person.s * person.hs;
  const eyeW = i => { person.root.updateMatrixWorld(true); return person.face.eyes[i].getWorldPosition(new THREE.Vector3()); };
  const mid = eyeW(0).add(eyeW(1)).multiplyScalar(0.5);
  await E.frame(mid, 0.42 * s, 0.3 * s, new THREE.Vector3(0, 1.1, 0.75), 0.8);
  const diff = G.tutorial ? 0 : Math.min(1.4, G.diff);
  const dr = dropper(); dr.scale.setScalar(person.s * 1.1); S.add(dr);
  holdWith(dr, G.coatColor || '#ffffff', [0, 0.078, 0], [0, 0, 0], 0.75);
  const R = 0.032 * s * G.tol * (G.tutorial ? 1.3 : 1);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.9, depthTest: false }); ringMat.userData.dispose = true;
  const ring = new THREE.Mesh(new THREE.RingGeometry(R * 0.78, R, 28), ringMat); ring.renderOrder = 5; ring.rotation.x = -Math.PI / 2; S.add(ring);
  const done = [false, false];
  let misses = 0, falling = null, blinkWait = rand(0.6, 1.2), flinchArmed = false, finished = false;
  const face = person.face;
  const targetEye = () => (done[0] ? 1 : 0);
  const height = () => mid.y + 0.13 * s;
  const plane = () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -height());
  const aimPt = () => { const e = eyeW(targetEye()); return new THREE.Vector3(e.x, height(), e.z); };
  G.dbg = { kind: 'drops', aim: aimPt, open: () => face.eyeOpen > 0.75 && face.blinking <= 0 && blinkWait > 0.45, falling: () => !!falling };
  ui.hint('Hold the dropper over an eye, then <b>click</b> when it is open!');
  let endRes;
  const ended = new Promise(r => { endRes = r; });
  S.update((dt, t) => {
    face.blinkT = 99; // we control the blinking here
    blinkWait -= dt;
    if (blinkWait <= 0) { face.blinking = rand(0.18, 0.42); blinkWait = rand(0.55, 1.5) - diff * 0.3 + face.blinking; }
    const p = E.pointerOnPlane(plane());
    if (p) dr.position.copy(p);
    const e = eyeW(targetEye());
    ring.position.set(e.x, e.y + 0.012 * s, e.z); ring.scale.setScalar(1 + Math.sin(t * 7) * 0.08);
    if (falling) {
      falling.v += 9.8 * dt;
      falling.m.position.y -= falling.v * dt * 0.35;
      // nervous patients sometimes blink right before it lands
      if (flinchArmed && falling.m.position.y - e.y < 0.04 * s) { flinchArmed = false; face.blinking = 0.3; blinkWait = 0.5; }
      if (falling.m.position.y <= e.y + 0.004 * s) land();
    }
  });
  function land() {
    const m = falling.m; falling = null;
    const pos = m.position.clone(); m.visible = false;
    let best = -1, bd = 1e9;
    for (let i = 0; i < 2; i++) { if (done[i]) continue; const e = eyeW(i); const d = Math.hypot(pos.x - e.x, pos.z - e.z); if (d < bd) { bd = d; best = i; } }
    const open = face.eyeOpen > 0.55 && face.blinking <= 0;
    if (best >= 0 && bd < R * 1.25 && open) {
      done[best] = true; sfx.good(); sfx.pop();
      ui.popAt(eyeW(best), 'Plip!', 'good');
      face.blinking = 0.35; blinkWait = 0.9;
      G.say(pick(GOOD), { key: 'c', hold: 0.5 });
      if (done[0] && done[1] && !finished) { finished = true; endRes(false); }
    } else {
      misses++; sfx.splat(); G.mood(-5); person.wiggle = 0.25;
      ui.popAt(pos, 'Splash!', 'bad');
      G.say(best >= 0 && bd < R * 1.6 ? pick(LID) : pick(NOSE), { key: 'c', hold: 0.6 });
      if (misses >= 6 && !finished) { finished = true; endRes(true); }
    }
  }
  S.on('down', () => {
    if (falling || finished) return;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.006 * s / person.s * person.s, 10, 8), new THREE.MeshStandardMaterial({ color: '#7fdbff' }));
    m.material.userData.dispose = true; m.scale.y = 1.3;
    m.position.copy(dr.position); S.add(m);
    falling = { m, v: 0 };
    flinchArmed = !G.tutorial && Math.random() < 0.12 + diff * 0.12;
    sfx.blip(1.8);
    dr.userData.bulb.scale.set(0.8, 1.1, 0.8); setTimeout(() => dr.userData.bulb.scale.set(1, 1.4, 1), 140);
  });
  const failed = await ended;
  ring.visible = false; ui.hint(null);
  await E.wait(0.5);
  S.end();
  await E.tween(0.4, k => { person.lookPitch = -0.55 * (1 - k); });
  if (failed) return { score: 5, fail: true, severity: 1, reason: 'drops' };
  return { score: clamp(100 - misses * 13, 20, 100), fail: false };
}
