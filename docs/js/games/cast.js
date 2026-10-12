import * as THREE from 'three';
import { clamp, pick, canvasTexture } from '../engine.js';
import { h } from '../ui.js';
import { armSetup } from './shot.js';

const COLORS = [
  { id: 'orange', label: 'Orange', hex: '#ff8a2a' },
  { id: 'blue', label: 'Blue', hex: '#3a86ff' },
  { id: 'pink', label: 'Pink', hex: '#ff5d8f' },
  { id: 'green', label: 'Green', hex: '#2ec4b6' },
  { id: 'purple', label: 'Purple', hex: '#9b5de5' },
  { id: 'white', label: 'Classic', hex: '#f5f5f5' },
];
const PICK_LINE = { orange: 'ORANGE. Obviously. Best color.', blue: 'Blue! Like the ocean. Or a blueberry.', pink: 'Pink! It matches my mood.', green: 'Green, like a cool dinosaur.', purple: 'Purple. Very royal. I am basically a king now.', white: 'Classic white. So people can sign it!' };
const AAH = ['AAAH! Gently!', 'OW OW OW! Slower!', "That's not how arms bend!"];
const TIGHT = ['TOO TIGHT! My fingers are turning purple!', 'I can hear my heartbeat in my THUMB!', "Loosen up! It's a cast, not a hug!"];

export async function play(G, P) {
  const { E, ui, sfx } = G;
  const person = P.person;
  await G.howTo('cast', 'Cast: Fix the Broken Arm', [
    'Pick a cast color!',
    '<b>Drag the hand</b> slowly to straighten the arm. Too fast hurts!',
    '<b>Draw circles</b> around the glowing ring to wrap the cast. Not too fast or it gets too tight!',
    'Then sign the cast if you want.',
  ], '🦴');
  const S = E.scope();
  const side = 'R';
  person.off.elR = [0, 0, 0];
  const a0 = await armSetup(G, P, side, 'lower');
  const s = person.s;
  const diff = G.tutorial ? 0 : G.diff;
  // choose color
  G.dbg = { kind: 'cast', phase: 'color' };
  ui.hint('Pick a cast color!');
  const col = await ui.actions(COLORS.map(c => ({ label: `<span class="swatch" style="background:${c.hex}"></span>${c.label}`, value: c, cls: 'small' })), { title: 'Cast color' });
  ui.hint(null);
  G.say(P.c.personality === 'influencer' ? 'Ooh, that will look SO good on camera.' : PICK_LINE[col.id], { key: 'c', hold: 0.8 });

  // ---- set the bone ----
  const elbowW = a0.elbow.clone();
  const straightDir = a0.wrist.clone().sub(a0.elbow); straightDir.z = 0; straightDir.normalize();
  const baseAng = Math.atan2(straightDir.y, straightDir.x);
  const crook = 0.55;
  person.off.elR = [0, 0, crook];
  person.applyJoints(0); person.root.updateMatrixWorld(true);
  const crookedW = person.wp(person.j.elR, 0, -0.22, 0);
  const crookAng = Math.atan2(crookedW.y - elbowW.y, crookedW.x - elbowW.x) - baseAng;
  const sign = Math.sign(crookAng) || 1;
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(a0.elbow.z + 0.06 * s));
  const ghostMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }); ghostMat.userData.dispose = true;
  const ghost = new THREE.Mesh(new THREE.CapsuleGeometry(0.05 * s, 0.2 * s, 4, 10), ghostMat);
  ghost.position.copy(a0.elbow.clone().lerp(a0.wrist, 0.55)); ghost.position.z += 0.01;
  ghost.rotation.z = baseAng - Math.PI / 2; S.add(ghost);
  const handRing = new THREE.Mesh(new THREE.RingGeometry(0.055 * s, 0.07 * s, 28), new THREE.MeshBasicMaterial({ color: '#ffd23f' }));
  handRing.material.userData.dispose = true; S.add(handRing);
  for (let i = 0; i < 3; i++) { const z = new THREE.Mesh(new THREE.PlaneGeometry(0.02 * s, 0.005 * s), new THREE.MeshBasicMaterial({ color: '#ff4d6d' })); z.material.userData.dispose = true; z.rotation.z = 0.7 * (i % 2 ? 1 : -1); z.position.copy(a0.elbow).add(new THREE.Vector3(-0.02 * s + i * 0.015 * s, 0.07 * s, 0.07 * s)); S.add(z); z.userData.zig = true; }
  ui.hint('<b>Drag the hand</b> slowly to straighten the arm.');
  person.expr('sad');
  G.say(pick(['Is it supposed to bend like that?', 'My arm has a new elbow. I did not order a new elbow.', 'Be gentle. Please. Pretty please.']), { key: 'c', hold: 1 });
  let cur = crook, grabbed = false, setMiss = 0, cd = 0, lastAng = crook, holdOk = 0;
  Object.assign(G.dbg, { phase: 'set', hand: () => person.wp(person.j.elR, 0, -0.26, 0), elbow: elbowW, baseAng, sign, s, cur: () => cur });
  S.on('down', () => {
    const p = E.pointerOnPlane(plane); if (!p) return;
    const hw = person.wp(person.j.elR, 0, -0.26, 0);
    if (Math.hypot(p.x - hw.x, p.y - hw.y) < 0.11 * s) { grabbed = true; sfx.pop(); }
  });
  S.on('up', () => { grabbed = false; });
  await new Promise(res => {
    const off = S.update((dt, t) => {
      const hw = person.wp(person.j.elR, 0, -0.26, 0);
      handRing.position.set(hw.x, hw.y, a0.elbow.z + 0.07 * s);
      handRing.scale.setScalar(1 + Math.sin(t * 7) * 0.08);
      cd -= dt;
      if (grabbed) {
        const p = E.pointerOnPlane(plane);
        if (p) {
          let ang = Math.atan2(p.y - elbowW.y, p.x - elbowW.x) - baseAng;
          while (ang > Math.PI) ang -= Math.PI * 2; while (ang < -Math.PI) ang += Math.PI * 2;
          const want = clamp(ang * sign, -0.15, crook + 0.3);
          const maxStep = dt * 1.1;
          const next = cur + clamp(want - cur, -maxStep, maxStep);
          const speed = Math.abs(want - lastAng) / dt;
          lastAng = want;
          if (speed > 4.2 - diff && cd <= 0 && Math.abs(want - cur) > 0.05) {
            cd = 1.0; setMiss++; G.mood(-10);
            sfx.ouch(P.c.voice || 1); ui.flash(); person.expr('ouch'); person.wiggle = 0.5;
            G.say(pick(AAH), { key: 'ouch', hold: 0.8 });
            setTimeout(() => person.expr('sad'), 700);
          }
          cur = next;
        }
      }
      person.off.elR = [0, 0, cur];
      if (Math.abs(cur) < 0.06) { holdOk += dt; if (holdOk > 0.15) { off(); res(); } } else holdOk = 0;
    });
  });
  person.off.elR = [0, 0, 0]; grabbed = false;
  ghost.visible = false; handRing.visible = false;
  S.update(() => {}); // keep scope alive
  sfx.crack();
  person.expr('surprised');
  ui.popAt(a0.elbow, '*CLICK*', 'good');
  await G.say(pick(['...Huh. That actually feels better.', 'OW— oh. Oh! That is SO much better.', 'Did it just... click? Cool. Gross. Cool.']), { key: 'c', hold: 0.5 });
  person.expr('smile');
  E.scene.traverse(o => { if (o.userData && o.userData.zig) o.visible = false; });

  // ---- wrap ----
  person.snap();
  const a = person.armInfo(side);
  const castMat = new THREE.MeshToonMaterial({ color: col.hex }); castMat.userData.dispose = true;
  const NW = 7;
  const wrist = a.wrist.clone(), elbow = a.elbow.clone().lerp(a.wrist, 0.08);
  const axis = elbow.clone().sub(wrist);
  const segLen = axis.length() / NW;
  axis.normalize();
  const castR = 0.062 * s;
  const ringGuide = S.dom(h('div', 'wrap-guide'));
  ui.root.appendChild(ringGuide);
  const tightM = ui.meter({ label: 'Tightness', vertical: true, marker: true, zones: [{ from: 0, to: 0.7, color: '#7be495' }, { from: 0.7, to: 1, color: '#ff8b8b' }] });
  const wrapM = ui.meter({ label: 'Wrapped', value: 0, fill: col.hex });
  ui.hint('<b>Draw circles</b> around the glowing ring to wrap the cast!');
  let wraps = 0, accum = 0, prevA = null, tight = 0, tightMiss = 0, wspd = 0;
  Object.assign(G.dbg, { phase: 'wrap', marker: () => wrist.clone().addScaledVector(axis, segLen * (wraps + 0.5)), tight: () => tight });
  const marker = new THREE.Mesh(new THREE.TorusGeometry(castR * 1.25, 0.006 * s, 8, 28), new THREE.MeshBasicMaterial({ color: '#ffd23f' }));
  marker.material.userData.dispose = true; marker.rotation.y = Math.PI / 2; S.add(marker);
  const bands = [];
  await new Promise(res => {
    const off = S.update((dt, t) => {
      const mp = wrist.clone().addScaledVector(axis, segLen * (wraps + 0.5));
      marker.position.copy(mp);
      marker.scale.setScalar(1 + Math.sin(t * 6) * 0.06);
      const sp = E.toScreen(mp);
      ringGuide.style.transform = `translate(${sp.x}px, ${sp.y}px)`;
      if (E.input.down) {
        const dx = E.input.cx - sp.x, dy = E.input.cy - sp.y, r = Math.hypot(dx, dy);
        if (r > 18 && r < 260) {
          const ang = Math.atan2(dy, dx);
          if (prevA !== null) {
            let d = ang - prevA; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
            accum += Math.abs(d);
            wspd = wspd * 0.85 + (Math.abs(d) / dt) * 0.15;
          }
          prevA = ang;
        } else prevA = null;
      } else { prevA = null; wspd *= 0.8; }
      const limit = 15 - diff * 3;
      if (wspd > limit) tight += dt * (wspd - limit) * 0.12; else tight = Math.max(0, tight - dt * 0.35);
      if (tight >= 1) {
        tight = 0.35; tightMiss++; G.mood(-10);
        sfx.ouch(P.c.voice || 1); ui.flash('rgba(160,90,255,0.3)'); person.expr('ouch'); person.wiggle = 0.4;
        G.say(pick(TIGHT), { key: 'ouch', hold: 1 });
        setTimeout(() => person.expr('smile'), 800);
      }
      tightM.set(tight);
      if (accum >= Math.PI * 2) {
        accum -= Math.PI * 2;
        const b = new THREE.Mesh(new THREE.CylinderGeometry(castR, castR, segLen * 1.05, 20, 1, true), castMat);
        b.position.copy(mp);
        b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
        S.add(b); bands.push(b);
        b.scale.set(1.3, 1, 1.3);
        E.tween(0.15, k => b.scale.set(1.3 - 0.3 * k, 1, 1.3 - 0.3 * k));
        wraps++; sfx.squeak();
        wrapM.set(wraps / NW);
        if (wraps >= NW) { off(); res(); }
      }
    });
  });
  marker.visible = false; ringGuide.remove(); tightM.remove(); wrapM.remove();
  sfx.good();
  // ---- sign ----
  bands.forEach(b => (b.visible = false));
  const tex = canvasTexture(512, 256, (ctx, W, H) => { ctx.fillStyle = col.hex; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 3; for (let x = 0; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 40, H); ctx.stroke(); } });
  const signMat = new THREE.MeshToonMaterial({ map: tex.tex }); signMat.userData.dispose = true;
  const full = new THREE.Mesh(new THREE.CylinderGeometry(castR, castR, segLen * NW, 32, 1, true), signMat);
  full.position.copy(wrist.clone().lerp(elbow, 0.5));
  full.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
  full.rotateY(Math.PI);
  S.add(full);
  G.dbg.phase = 'sign'; G.dbg.cast = full.position.clone();
  ui.hint('Sign the cast! <b>Draw on it</b>, then press Done.');
  G.say(pick(['Draw something cool on it!', 'Sign it! Make it look like a dragon did it.', 'Can you draw a cat? I love cats.']), { key: 'c', hold: 1 });
  const ink = '#1d2b36';
  let lastUV = null;
  S.update(() => {
    if (!E.input.down) { lastUV = null; return; }
    const hit = E.pickObjects([full], false);
    if (!hit || !hit.uv) { lastUV = null; return; }
    const x = hit.uv.x * 512, y = (1 - hit.uv.y) * 256;
    const ctx = tex.ctx;
    ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 7; ctx.lineCap = 'round';
    if (lastUV && Math.abs(lastUV.x - x) < 120) { ctx.beginPath(); ctx.moveTo(lastUV.x, lastUV.y); ctx.lineTo(x, y); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill(); }
    lastUV = { x, y };
    tex.tex.needsUpdate = true;
  });
  await ui.actions([{ label: 'Done ✓', value: true, cls: 'primary' }]);
  ui.hint(null);
  person.expr('happy');
  sfx.great();
  // keep the cast on the patient after the minigame
  const keep = full.clone();
  full.geometry.userData.keep = true;
  keep.material = signMat; signMat.userData.dispose = false;
  full.visible = false;
  const parentEl = person.j.elR;
  person.root.updateMatrixWorld(true);
  parentEl.attach(keep);
  S.end();
  person.setPose('sit');
  const score = clamp(100 - setMiss * 14 - tightMiss * 14, 15, 100);
  if (!G.tutorial && tightMiss >= 3) return { score: 10, fail: true, severity: 1, reason: 'cast_tight' };
  if (!G.tutorial && setMiss >= 4) return { score: 10, fail: true, severity: 1, reason: 'cast_set' };
  return { score, fail: false };
}
