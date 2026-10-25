// Scrape care: clean it, dab on some ointment, and stick the bandage on straight.
import * as THREE from 'three';
import { clamp, rand, pick, toon, canvasTexture } from '../engine.js';
import { bandage as bandageProp } from '../props.js';
import { icon } from '../icons.js';
import { armSetup } from './shot.js';

const OW = ['Ow ow ow! Gently!', 'You are scrubbing like it owes you money!', 'That stings! Slower!'];
const GOO = ['Whoa, that is a LOT of goo.', 'My arm is a cupcake now.', "That's enough ointment for ten arms!"];
const MISS = ['Crooked! Try again.', "That's not where the scrape is!", 'It is sideways! Peel it off!'];

function scrapeTex() {
  return canvasTexture(128, 96, (ctx, W, H) => {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = `rgba(${200 + Math.random() * 40},${70 + Math.random() * 40},${80 + Math.random() * 30},${0.35 + Math.random() * 0.3})`;
      ctx.beginPath(); ctx.ellipse(W / 2 + rand(-34, 34), H / 2 + rand(-18, 18), rand(6, 16), rand(3, 7), rand(-0.4, 0.4), 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(180,60,70,0.45)'; ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) { ctx.beginPath(); const y = H / 2 + rand(-16, 16); ctx.moveTo(W / 2 - rand(20, 40), y); ctx.lineTo(W / 2 + rand(20, 40), y + rand(-4, 4)); ctx.stroke(); }
  }).tex;
}
function dirtTex() {
  const t = canvasTexture(128, 96, (ctx, W, H) => {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(${90 + Math.random() * 40},${65 + Math.random() * 25},${40},0.9)`; ctx.beginPath(); ctx.arc(W / 2 + rand(-40, 40), H / 2 + rand(-22, 22), rand(1.5, 4), 0, Math.PI * 2); ctx.fill(); }
  });
  return t.tex;
}

export async function play(G, P) {
  const { E, ui, sfx } = G;
  const person = P.person;
  await G.howTo('bandage', 'Bandage: Fix the Scrape', [
    '<b>Clean it:</b> hold and scrub the scrape with the wipe. Gently!',
    '<b>Ointment:</b> hold to squeeze, let go in the <b>green</b>.',
    '<b>Bandage:</b> it wiggles. Click when it lines up with the dotted outline.',
  ], icon('bandage'));
  const S = E.scope();
  const side = 'R';
  const a = await armSetup(G, P, side, 'lower');
  const el = person.j['el' + side];
  const s = person.s;
  // the scrape sits on the forearm, facing you
  const local = new THREE.Vector3(0, -0.12, 0.046);
  const scrapeMat = new THREE.MeshBasicMaterial({ map: scrapeTex(), transparent: true, depthWrite: false }); scrapeMat.userData.dispose = true;
  const scrape = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.056), scrapeMat); scrape.position.copy(local); scrape.rotation.z = Math.PI / 2; el.add(scrape);
  const dirtMat = new THREE.MeshBasicMaterial({ map: dirtTex(), transparent: true, depthWrite: false }); dirtMat.userData.dispose = true;
  const dirt = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.056), dirtMat); dirt.position.copy(local); dirt.position.z += 0.001; dirt.rotation.z = Math.PI / 2; el.add(dirt);
  S.defer(() => { el.remove(dirt); });
  const center = () => person.wp(el, local.x, local.y, local.z);
  const c0 = center();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(c0.z + 0.012));
  const diff = G.tutorial ? 0 : Math.min(1.4, G.diff);
  G.dbg = { kind: 'bandage', phase: 'clean', target: center };
  // ---- 1: clean ----
  ui.hint('Hold and <b>scrub</b> the scrape with the wipe. <b>Gently!</b>');
  const wipe = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.05 * s, 0.006 * s), toon('#f4fbff')); S.add(wipe);
  const cleanM = ui.meter({ label: 'Clean', value: 0, fill: '#5dd6ff' });
  let clean = 0, last = null, owT = 0, rough = 0;
  await new Promise(res => {
    const off = S.update(dt => {
      owT -= dt;
      const p = E.pointerOnPlane(plane);
      if (!p) return;
      wipe.position.copy(p); wipe.rotation.z = Math.sin(E.time * 20) * (E.input.down ? 0.2 : 0);
      if (E.input.down && p.distanceTo(center()) < 0.07 * s * G.tol) {
        if (last) {
          const d = p.distanceTo(last);
          clean += d / (0.5 * s);
          const speed = d / Math.max(dt, 0.001);
          if (speed > (1.9 - diff * 0.4) * s && owT <= 0) { owT = 1.3; rough++; sfx.ouch(P.c.voice || 1); person.expr('ouch'); G.mood(-4); G.say(pick(OW), { key: 'c', hold: 0.6 }); setTimeout(() => person.expr('smile'), 600); }
        }
        last = p.clone();
      } else last = null;
      dirtMat.opacity = 1 - clamp(clean, 0, 1);
      cleanM.set(clean);
      if (clean >= 1) { off(); res(); }
    });
  });
  cleanM.remove(); wipe.visible = false; sfx.good(); ui.popAt(center(), 'Clean!', 'good');
  // ---- 2: ointment ----
  G.dbg.phase = 'ointment';
  E.input.requireRelease();
  ui.hint('<b>Hold</b> to squeeze the ointment. Let go in the <b>green</b>.');
  const tube = new THREE.Group();
  const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.08, 12), toon('#ffffff')); tube.add(tb);
  const tc = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.015, 10), toon('#2bb3a3')); tc.position.y = -0.047; tube.add(tc);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.0185, 0.0185, 0.02, 12), toon('#ff5d8f')); stripe.position.y = 0.01; tube.add(stripe);
  tube.scale.setScalar(s * 1.2); tube.position.copy(center()).add(new THREE.Vector3(0.02 * s, 0.09 * s, 0.03 * s)); tube.rotation.z = -0.5; S.add(tube);
  const blob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), new THREE.MeshStandardMaterial({ color: '#fbfbf2', transparent: true, opacity: 0.85 })); blob.material.userData.dispose = true;
  blob.scale.set(0.01, 0.01, 0.01); blob.position.copy(local); blob.position.z += 0.002; el.add(blob);
  S.defer(() => el.remove(blob));
  const zone = [0.52, 0.76];
  const ointM = ui.meter({ label: 'Ointment', marker: true, zones: [{ from: 0, to: zone[0], color: '#d9e2ec' }, { from: zone[0], to: zone[1], color: '#7be495' }, { from: zone[1], to: 1, color: '#ff8b8b' }] });
  let amt = 0, goo = 0, squeezing = false;
  G.dbg.amount = () => amt; G.dbg.zone = zone;
  await new Promise(res => {
    const off = S.update(dt => {
      if (E.input.down) { squeezing = true; amt += dt * (0.32 + diff * 0.14) * (1 + amt * 0.5); tube.scale.x = s * 1.2 * 0.85; }
      else {
        tube.scale.x = s * 1.2;
        if (squeezing) {
          squeezing = false;
          if (amt >= zone[0] && amt <= zone[1]) { off(); res(); return; }
          if (amt > zone[1]) { goo++; G.mood(-4); G.say(pick(GOO), { key: 'c', hold: 0.6 }); sfx.splat(); off(); res(); return; }
          ui.popAt(center(), 'A little more...', '');
        }
      }
      amt = Math.min(1.05, amt);
      const k = clamp(amt, 0, 1);
      blob.scale.set(k * 1.1, k * 0.75, k * 0.25);
      ointM.set(amt);
      if (amt >= 1.0) { goo++; G.mood(-4); G.say(pick(GOO), { key: 'c', hold: 0.6 }); sfx.splat(); squeezing = false; off(); res(); }
    });
  });
  ointM.remove(); tube.visible = false; sfx.good();
  // ---- 3: bandage ----
  G.dbg.phase = 'stick';
  E.input.requireRelease();
  ui.hint('The bandage wiggles. <b>Click</b> when it lines up with the dotted outline!');
  const band = bandageProp(G.bandageColor || '#ffcc80'); band.scale.setScalar(s * 1.6); S.add(band);
  const ghostMat = new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: 0.006, gapSize: 0.005, depthTest: false }); ghostMat.userData.dispose = true;
  const gw = 0.144 * s, gh = 0.056 * s;
  const gg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-gw / 2, -gh / 2, 0), new THREE.Vector3(gw / 2, -gh / 2, 0), new THREE.Vector3(gw / 2, gh / 2, 0), new THREE.Vector3(-gw / 2, gh / 2, 0), new THREE.Vector3(-gw / 2, -gh / 2, 0)]);
  const ghost = new THREE.Line(gg, ghostMat); ghost.computeLineDistances(); ghost.renderOrder = 6; S.add(ghost);
  // the forearm runs along this screen angle
  const elW = person.wp(el, 0, 0, 0), wrW = person.wp(el, 0, -0.22, 0);
  const baseAng = Math.atan2(wrW.y - elW.y, wrW.x - elW.x);
  const amp = 0.7, omega = 1.8 + diff * 1.5, tolA = 0.2 * G.tol * (G.tutorial ? 1.5 : 1), tolP = 0.03 * s * G.tol;
  let tries = 0, ang = baseAng, tAcc = 0, stuck = false, aimMiss = 0;
  G.dbg.angErr = () => Math.abs(ang - baseAng); G.dbg.tolA = tolA;
  await new Promise(res => {
    S.update(dt => {
      if (stuck) return;
      tAcc += dt;
      const c = center();
      ghost.position.copy(c); ghost.position.z += 0.012; ghost.rotation.z = baseAng;
      ang = baseAng + amp * Math.sin(tAcc * omega);
      const p = E.pointerOnPlane(plane);
      if (p) band.position.copy(p);
      band.rotation.set(0, 0, ang);
    });
    S.on('down', async () => {
      if (stuck) return;
      const p = E.pointerOnPlane(plane) || center();
      const posErr = Math.hypot(p.x - center().x, p.y - center().y);
      const angErr = Math.abs(ang - baseAng);
      if (posErr < tolP && angErr < tolA) {
        stuck = true; sfx.pop(); sfx.good();
        ui.popAt(center(), angErr < tolA * 0.4 ? 'PERFECT!' : 'Nice!', 'good');
        // a fresh bandage stuck to the arm stays after this mini-game ends
        band.visible = false;
        const keep = bandageProp(G.bandageColor || '#ffcc80'); keep.scale.setScalar(1.6);
        keep.position.copy(local); keep.position.z += 0.004; keep.rotation.set(0, 0, Math.PI / 2); el.add(keep);
        res();
      } else {
        tries++; aimMiss++; sfx.bad(); G.mood(-5);
        G.say(pick(MISS), { key: 'c', hold: 0.6 });
        if (tries >= 3) { stuck = true; res(); }
      }
    });
  });
  ghost.visible = false; ui.hint(null);
  await E.wait(0.5);
  S.end();
  person.setPose('sit');
  const ok = aimMiss < 3;
  if (!ok) return { score: 10, fail: true, severity: 1, reason: 'bandage' };
  return { score: clamp(100 - rough * 6 - goo * 14 - aimMiss * 15, 20, 100), fail: false };
}
