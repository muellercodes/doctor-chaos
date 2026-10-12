import * as THREE from 'three';
import { hammer } from '../props.js';
import { clamp, pick } from '../engine.js';

const MISS = ["That's my shin, doc.", 'Ow! That is NOT my knee.', 'Wrong spot! Are you bonking randomly?', "Hey! That's my OTHER leg."];
const WEAK = ['...Was that it? Nothing happened.', 'Did you hit it? I felt a breeze.', "I've been hit harder by a feather."];
const GOOD = ['WHOA! My leg did that all by itself!', 'Ha! It kicked! Do it again!', "Look at that! I'm a natural!"];
const MEGA = ['Sorry! ...Not sorry.', 'Oh no! Doc, are you okay?!', 'Did my foot just hit your FACE?'];

export async function play(G, P) {
  const { E, ui, sfx } = G;
  const person = P.person;
  await G.howTo('reflex', 'Reflex Hammer: Bonk the Knee', [
    'Move the hammer to the <b>yellow circle</b> just below the kneecap.',
    '<b>Hold</b> to wind up. The power bar goes up and down.',
    '<b>Let go in the green</b>. Too soft does nothing. Too hard... well. You will see.',
  ], '🔨');
  const S = E.scope();
  person.setPose('sit');
  await E.wait(0.3);
  person.snap();
  const s = person.s;
  const kL = person.wp(person.j.knL), kR = person.wp(person.j.knR);
  const center = kL.clone().lerp(kR, 0.5); center.y -= 0.08 * s; center.z += 0.05 * s;
  await E.frame(center, 0.65 * s, 0.45 * s, new THREE.Vector3(0, 0.35, 1), 0.8);
  const diff = G.tutorial ? 0 : G.diff;
  const ringR = 0.032 * s * G.tol;
  const ham = hammer(); ham.scale.setScalar(s * 0.95); S.add(ham);
  const aimDot = new THREE.Mesh(new THREE.RingGeometry(0.006 * s, 0.01 * s, 20), new THREE.MeshBasicMaterial({ color: '#1d2b36', depthTest: false })); aimDot.material.userData.dispose = true; aimDot.renderOrder = 5; S.add(aimDot);
  const fidget = P.c.ageGroup === 'kid' ? 0.18 : 0.08;
  let penalty = 0, mega = 0, fidgetOn = true;
  const order = ['R', 'L'];
  for (const side of order) {
    const knee = person.j['kn' + side];
    const ringMat = new THREE.MeshBasicMaterial({ color: '#ffd23f' }); ringMat.userData.dispose = true;
    const ring = new THREE.Mesh(new THREE.RingGeometry(ringR / s * 0.75, ringR / s, 32), ringMat);
    ring.position.set(0, -0.07, 0.066);
    knee.add(ring);
    S.defer(() => knee.remove(ring));
    S.update((dt, t) => {
      if (fidgetOn) person.off['kn' + side][0] = Math.sin(t * (2.2 + diff * 1.5)) * fidget;
      ring.scale.setScalar(1 + Math.sin(t * 7) * 0.08);
    });
    ui.hint(`Bonk the <b>${side === 'R' ? 'first' : 'second'} knee</b>! Hold to wind up, <b>let go in the green</b>.`);
    let attempts = 0, done = false;
    while (!done) {
      const powM = ui.meter({ label: 'Power', marker: true, zones: [{ from: 0, to: 0.45, color: '#d9e2ec' }, { from: 0.45, to: 0.76, color: '#7be495' }, { from: 0.76, to: 1, color: '#ff8b8b' }] });
      let charging = false, released = null, pw = 0, ph = 0;
      G.dbg = { kind: 'reflex', knee: () => person.wp(knee, 0, -0.07, 0.066), pw: () => pw, charging: () => charging };
      await new Promise(res => {
        const offD = () => { charging = true; ph = 0; };
        const offU = () => { if (charging) { charging = false; released = pw; } };
        E.input.listeners.down.add(offD); E.input.listeners.up.add(offU);
        const off = S.update(dt => {
          const kp = person.wp(knee, 0, -0.07, 0.066);
          const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(kp.z + 0.04 * s));
          const p = E.pointerOnPlane(plane);
          if (p) { aimDot.position.copy(p); ham.position.copy(p).add(new THREE.Vector3(0.03 * s, 0.035 * s, 0.02 * s)); }
          ham.rotation.set(0.2, 0.3, -0.6 - (charging ? pw * 0.9 : 0));
          if (charging) { ph += dt * (1.25 + diff * 0.8); pw = 1 - Math.abs(1 - (ph % 2)); }
          powM.set(pw);
          if (released !== null) { E.input.listeners.down.delete(offD); E.input.listeners.up.delete(offU); off(); res(); }
        });
        S.defer(() => { E.input.listeners.down.delete(offD); E.input.listeners.up.delete(offU); });
      });
      powM.remove();
      attempts++;
      const kp = person.wp(knee, 0, -0.07, 0.066);
      const hp = ham.position;
      const dist = Math.hypot(hp.x - kp.x, hp.y - kp.y);
      // swing
      const r0 = ham.rotation.z;
      await E.tween(0.09, k => { ham.rotation.z = r0 + 1.1 * k; });
      sfx.thud();
      await E.tween(0.12, k => { ham.rotation.z = r0 + 1.1 * (1 - k); });
      if (dist > ringR * 1.6) {
        penalty += 12; sfx.ouch(P.c.voice || 1); person.expr('ouch'); G.mood(-8);
        G.say(pick(MISS), { key: 'c', hold: 0.9 });
        setTimeout(() => person.expr('smile'), 700);
      } else if (released < 0.45) {
        penalty += 6;
        G.say(pick(WEAK), { key: 'c', hold: 0.9 });
      } else {
        fidgetOn = false;
        const megaKick = released > 0.76;
        const kick = megaKick ? -1.55 : -1.05;
        sfx.boing();
        person.poseSpeed = 9;
        await E.tween(0.12, k => { person.off['kn' + side][0] = kick * k; }, t => t);
        if (megaKick) {
          mega++; penalty += 22;
          E.shake(0.06); ui.flash('rgba(255,255,255,0.8)'); sfx.thud();
          ui.popCenter('OOF! 💫', 'bad');
          const bp = E.basePos.clone();
          await E.tween(0.15, k => { E.basePos.y = bp.y + 0.06 * s * k; E.basePos.z = bp.z + 0.12 * s * k; });
          person.expr('surprised');
          G.say(pick(MEGA), { key: 'c', hold: 1 });
          await E.tween(0.5, k => { E.basePos.y = bp.y + 0.06 * s * (1 - k); E.basePos.z = bp.z + 0.12 * s * (1 - k); });
        } else {
          person.expr('happy');
          ui.popAt(kp, 'BOING!', 'good');
          sfx.good();
          G.say(pick(GOOD), { key: 'c', hold: 0.9 });
        }
        await E.tween(0.4, k => { person.off['kn' + side][0] = kick * (1 - k); });
        fidgetOn = true;
        done = true;
      }
      if (!done && attempts >= 4) { done = true; penalty += 10; }
      await E.wait(0.25);
    }
    person.off['kn' + side][0] = 0;
    ring.visible = false;
  }
  fidgetOn = false;
  person.off.knL[0] = 0; person.off.knR[0] = 0;
  ui.hint(null);
  S.end();
  const score = clamp(100 - penalty, 0, 100);
  if (score < 20 && !G.tutorial) return { score, fail: true, severity: 1, reason: 'reflex' };
  return { score, fail: false };
}
