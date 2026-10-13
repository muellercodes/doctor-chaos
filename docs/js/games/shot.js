import * as THREE from 'three';
import { syringe, swab, bandage } from '../props.js';
import { clamp, rand } from '../engine.js';

export async function armSetup(G, P, side = 'R', focus = 'upper') {
  const { E } = G;
  const person = P.person;
  person.setPose(side === 'R' ? 'armOutR' : 'armOutL');
  await E.wait(0.45);
  person.snap();
  const a = person.armInfo(side);
  const s = person.s;
  let center, w;
  if (focus === 'upper') { center = a.shoulder.clone().lerp(a.wrist, 0.33); w = 0.62 * s; }
  else { center = a.elbow.clone().lerp(a.hand, 0.45); w = 0.62 * s; }
  center.y += 0.02 * s;
  await E.frame(center, w, w * 0.62, new THREE.Vector3(0, 0.22, 1), 0.8);
  return a;
}

const AIM_MISS = ['Missed the spot!', "That's not my arm, that's the TABLE.", 'Ow! Wrong spot!', 'Did you... close your eyes?'];
const ANGLE_MISS = ['OW! Wrong angle!', 'Sideways?! Who taught you this?!', 'Yeowch! Line it up!'];
const TOO_FAST = ['OWWW! Too fast!', 'Slow down! SLOW DOWN!', "It's not a race!"];

export async function play(G, P, prm = {}) {
  const { E, ui, sfx } = G;
  const person = P.person;
  await G.howTo('shot', 'Syringe: Give a Shot', [
    '<b>Scrub</b> the yellow circle with the alcohol swab (hold and wiggle).',
    'Move the needle to the circle. It tilts back and forth. <b>Click when it lines up</b> with the dotted guide.',
    '<b>Hold</b> to push the plunger. Keep the pressure in the <b>green</b>. Too fast hurts!',
  ], '💉');
  const S = E.scope();
  const side = 'R';
  const a = await armSetup(G, P, side, 'upper');
  const s = person.s;
  const target = a.deltoid.clone();
  target.z += 0.004 * s;
  const R = 0.034 * s * G.tol * (G.tutorial ? 1.3 : 1);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(target.z + 0.012));
  G.dbg = { kind: 'shot', phase: 'clean', target, R };
  const diff = G.tutorial ? 0 : G.diff;

  // target ring
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.95 }); ringMat.userData.dispose = true;
  const ring = new THREE.Mesh(new THREE.RingGeometry(R * 0.82, R, 32), ringMat);
  ring.position.copy(target); S.add(ring);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(R * 0.18, 16), ringMat); dot.position.copy(target); dot.position.z += 0.001; S.add(dot);
  S.update((dt, t) => { ring.scale.setScalar(1 + Math.sin(t * 6) * 0.06); });

  // -------- phase 1: clean --------
  ui.hint('Hold and <b>scrub</b> the yellow circle with the alcohol swab!');
  const sw = swab(); sw.scale.setScalar(s * 1.2); sw.rotation.x = 0.9; S.add(sw);
  const cleanM = ui.meter({ label: 'Clean', value: 0, fill: '#5dd6ff' });
  let clean = 0, last = null, saidCold = false;
  await new Promise(res => {
    const off = S.update(dt => {
      const p = E.pointerOnPlane(plane);
      if (!p) return;
      sw.position.copy(p);
      if (E.input.down && p.distanceTo(target) < R * 2.2) {
        if (last) clean += p.distanceTo(last) / (0.42 * s);
        if (!saidCold && clean > 0.15) { saidCold = true; G.say(Math.random() < 0.5 ? 'Cold! COLD!' : 'Ooh, that tickles.', { key: 'c', hold: 0.8 }); }
        last = p.clone();
        sw.rotation.z = Math.sin(E.time * 30) * 0.2;
      } else last = null;
      cleanM.set(clean);
      if (clean >= 1) { off(); res(); }
    });
  });
  sfx.good(); ui.popAt(target, 'Squeaky clean! ✨', 'good');
  cleanM.remove();
  sw.visible = false;

  // -------- phase 2: aim --------
  const base = rand(0.35, 0.85) * (Math.random() < 0.5 ? 1 : -1) + Math.PI / 2; // barrel direction angle (mostly upward)
  const ghostMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 }); ghostMat.userData.dispose = true;
  const ghost = new THREE.Group();
  for (let i = 0; i < 8; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.006 * s * 1.6, 0.016 * s * 1.6, 0.002), ghostMat); d.position.y = (0.012 + i * 0.03) * s * 1.6; ghost.add(d); }
  ghost.position.copy(target); ghost.position.z += 0.004; ghost.rotation.z = base - Math.PI / 2;
  S.add(ghost);
  const syr = syringe(prm.liquid || '#7fdbff'); syr.scale.setScalar(s * 1.6); S.add(syr);
  const amp = 0.75;
  const omega = 1.9 + diff * 1.6;
  const green = 0.2 * G.tol * (G.tutorial ? 1.4 : 1);
  const angM = ui.meter({ label: 'Line it up', marker: true, zones: [{ from: 0, to: 1, color: '#ffb3b3' }, { from: 0.5 - green / (2 * amp), to: 0.5 + green / (2 * amp), color: '#7be495' }], value: 0.5 });
  ui.hint('Move the needle to the circle. <b>Click when it lines up</b> with the dotted guide!');
  let aimMiss = 0, q = 0, phaseT = 0;
  const maxAim = G.tutorial ? 99 : 3;
  let failed = false;
  let pending = null, aiming = false, curAng = base;
  G.dbg.phase = 'aim'; G.dbg.angErr = () => Math.abs(curAng - base); G.dbg.green = green;
  let pendingAng = base;
  S.on('down', () => { if (aiming) { pending = E.pointerOnPlane(plane) || target.clone(); pendingAng = curAng; } });
  while (true) {
    pending = null; aiming = true;
    let ang = base;
    await new Promise(res => {
      const offU = S.update(dt => {
        phaseT += dt;
        if (pending) { ang = pendingAng; offU(); res(); return; }
        ang = base + amp * Math.sin(phaseT * omega); curAng = ang;
        const p = E.pointerOnPlane(plane);
        if (p) { syr.position.set(p.x, p.y, target.z + 0.012); }
        syr.rotation.set(0.35, 0, ang - Math.PI / 2, 'ZYX');
        angM.set(0.5 + (ang - base) / (2 * amp));
        if (pending) { offU(); res(); }
      });
    });
    aiming = false;
    const clicked = pending;
    const posErr = new THREE.Vector2(clicked.x - target.x, clicked.y - target.y).length() / R;
    const angErr = Math.abs(ang - base);
    // poke animation
    const p0 = syr.position.clone();
    const dirv = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0.35).normalize();
    await E.tween(0.12, k => syr.position.copy(p0).addScaledVector(dirv, -0.012 * s * k));
    if (posErr > 1.3 || angErr > green) {
      aimMiss++;
      sfx.ouch(P.c.voice || 1); ui.flash(); person.expr('ouch'); person.wiggle = 0.5;
      G.say(posErr > 1.3 ? AIM_MISS[Math.floor(Math.random() * AIM_MISS.length)] : ANGLE_MISS[Math.floor(Math.random() * ANGLE_MISS.length)], { key: 'ouch', hold: 1 });
      G.mood(-12);
      await E.tween(0.2, k => syr.position.copy(p0).addScaledVector(dirv, -0.012 * s * (1 - k)));
      setTimeout(() => person.expr('scared'), 600);
      if (aimMiss >= maxAim) { failed = true; break; }
      continue;
    }
    q = 1 - 0.4 * Math.min(1, posErr / 1.3) - 0.6 * Math.min(1, angErr / green);
    sfx.good();
    ui.popAt(target, q > 0.75 ? 'PERFECT!' : 'Nice!', 'good');
    // snap to target at ideal angle
    const sp = syr.position.clone(), sa = ang;
    await E.tween(0.2, k => { syr.position.lerpVectors(sp, target.clone().add(new THREE.Vector3(0, 0, -0.006 * s)), k); syr.rotation.set(0.35, 0, sa + (base - sa) * k - Math.PI / 2, 'ZYX'); });
    break;
  }
  angM.remove();
  ghost.visible = false;
  let pressMiss = 0;
  if (!failed) {
    // -------- phase 3: push --------
    ui.hint('<b>Hold</b> to push the plunger. Keep the pressure in the <b>green</b>!');
    person.expr('scared');
    if (Math.random() < 0.5) G.remark();
    const gLo = 0.28 - 0.04 * (G.tol - 1), gHi = 0.7 + 0.05 * (G.tol - 1);
    const presM = ui.meter({ label: 'Pressure', vertical: true, marker: true, zones: [{ from: 0, to: gLo, color: '#d9e2ec' }, { from: gLo, to: gHi, color: '#7be495' }, { from: gHi, to: 0.86, color: '#ffe08a' }, { from: 0.86, to: 1, color: '#ff8b8b' }] });
    const progM = ui.meter({ label: 'Medicine', value: 0, fill: '#5dd6ff' });
    let pr = 0, prog = 0;
    G.dbg.phase = 'push'; G.dbg.pr = () => pr; G.dbg.zone = [gLo, gHi];
    const rate = (0.95 + diff * 0.7);
    await new Promise(res => {
      const off = S.update(dt => {
        if (E.input.down) pr += dt * rate * (1 + pr * 0.6); else pr -= dt * 1.5;
        pr = clamp(pr, 0, 1.05);
        if (E.input.down && pr > 0.12 && pr < 0.86) prog += dt * (pr >= gLo && pr <= gHi ? 0.34 : 0.16);
        if (pr >= 0.86) {
          pressMiss++; pr = 0.35;
          sfx.ouch(P.c.voice || 1); ui.flash(); person.expr('ouch'); person.wiggle = 0.6;
          G.say(TOO_FAST[Math.floor(Math.random() * TOO_FAST.length)], { key: 'ouch', hold: 0.9 });
          G.mood(-10);
          setTimeout(() => person.expr('scared'), 600);
        }
        presM.set(pr / 1.0);
        progM.set(prog);
        syr.userData.setFill(1 - prog);
        if (prog >= 1) { off(); res(); }
      });
    });
    presM.remove(); progM.remove();
    sfx.ding();
    // retract & bandage
    const sp = syr.position.clone();
    const dirv = new THREE.Vector3(Math.cos(base), Math.sin(base), 0.35).normalize();
    await E.tween(0.35, k => syr.position.copy(sp).addScaledVector(dirv, 0.12 * s * k));
    syr.visible = false;
    const band = bandage(G.bandageColor || '#ffcc80'); band.scale.setScalar(s * 1.1);
    const local = person.j['sh' + side].worldToLocal(target.clone());
    band.position.copy(local).multiplyScalar(1);
    band.position.z += 0.004;
    band.rotation.z = Math.PI / 2;
    person.j['sh' + side].add(band);
    band.scale.setScalar(s * 1.1 / person.s);
    sfx.pop();
  }
  ring.visible = false; dot.visible = false;
  ui.hint(null);
  S.end();
  person.setPose('sit');
  if (failed) return { score: 5, fail: true, severity: 1, reason: 'shot_miss' };
  const score = clamp(100 - aimMiss * 18 - pressMiss * 12 - (1 - q) * 25, 20, 100);
  if (pressMiss >= 4 && !G.tutorial) return { score: 10, fail: true, severity: 1, reason: 'shot_fast' };
  return { score, fail: false };
}
