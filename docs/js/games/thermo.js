// Thermometer: pop it in the mouth and keep the patient from talking until it beeps.
import * as THREE from 'three';
import { clamp, rand, pick, toon } from '../engine.js';
import { icon } from '../icons.js';
import { holdWith } from '../props.js';

const CHATTER = ['So anyway, about my cat—', 'Did I tell you about my— oops.', 'Is it done? Is it done yet?', 'Mmf! I have a question!', 'Wait, I just remembered something—', 'How long does this— oh no.', 'Fun fact about thermometers—'];
const SHUSHED = ['(mumbles quietly)', 'Mmm-hmm.', '(nods)', 'Mmf.', '(zips lips)'];
const FALSE = ["I wasn't even talking!", 'Rude.', '...What did I do?', 'I was being SO quiet.'];
const WRONG_SPOT = ["That's my nose!", 'Mouth! It goes in the MOUTH!', 'That is my chin, doctor.', 'Ow! My cheek!'];

function thermometer() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.13, 10), toon('#ffffff')); body.rotation.z = Math.PI / 2; body.position.x = 0.065; g.add(body);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 10, 8), toon('#b0bec5')); g.add(tip);
  const redG = new THREE.Group(); redG.position.x = 0.012; g.add(redG);
  const red = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.08, 6), toon('#e63946')); red.rotation.z = Math.PI / 2; red.position.x = 0.04; redG.add(red);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0098, 0.0098, 0.03, 10), toon('#2bb3a3')); cap.rotation.z = Math.PI / 2; cap.position.x = 0.128; g.add(cap);
  g.userData.red = redG;
  return g;
}

export async function play(G, P) {
  const { E, ui, sfx } = G;
  const person = P.person;
  await G.howTo('thermo', 'Thermometer: Fever Check', [
    'Move the thermometer to the <b>mouth</b> and click to pop it in.',
    'Patients LOVE to talk. When a <b>"!"</b> pops up, tap fast to <b>SHH</b> them.',
    "Don't shush them when they're quiet. And don't let it fall out 3 times!",
  ], icon('thermo'));
  const S = E.scope();
  person.setPose('sit'); await E.wait(0.3); person.snap();
  person.idle = false; S.defer(() => { person.idle = true; });
  const s = person.s * person.hs;
  const mouthW = () => { person.root.updateMatrixWorld(true); return person.face.mouthGroup.getWorldPosition(new THREE.Vector3()); };
  const m0 = mouthW();
  await E.frame(m0.clone().add(new THREE.Vector3(0.04 * s, 0.04 * s, 0)), 0.55 * s, 0.4 * s, new THREE.Vector3(0.12, 0.08, 1), 0.8);
  const diff = G.tutorial ? 0 : Math.min(1.4, G.diff);
  const th = thermometer(); th.scale.setScalar(person.s * 1.15); S.add(th);
  const hand = holdWith(th, G.coatColor || '#ffffff', [0.122, 0, 0], [0, 0, Math.PI / 2], 0.85);
  const R = 0.05 * s * G.tol;
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.9, depthTest: false }); ringMat.userData.dispose = true;
  const ring = new THREE.Mesh(new THREE.RingGeometry(R * 0.75, R, 28), ringMat); ring.renderOrder = 5; S.add(ring);
  let phase = 'place', reading = 0, drops = 0, falseShh = 0, placeMiss = 0, cue = false, cueT = 0, urgeT = 0, busy = false;
  const finalTemp = rand(99.6, 102.8);
  const readM = ui.meter({ label: 'Reading', value: 0, fill: '#ff6b6b' });
  G.dbg = { kind: 'thermo', get phase() { return phase; }, mouth: mouthW, cue: () => cue };
  ui.hint('Move the thermometer to the <b>mouth</b> and click!');
  const plane = () => new THREE.Plane(new THREE.Vector3(0, 0, 1), -(mouthW().z + 0.035 * s));
  let endRes;
  const ended = new Promise(r => { endRes = r; });

  const newUrge = () => { urgeT = rand(1.2, 2.6) - diff * 0.5; };
  async function fallOut() {
    busy = true; phase = 'falling'; drops++;
    person.expr('happy'); person.talk(1.2); G.say(pick(CHATTER), { key: 'c', hold: 0.8 });
    sfx.slip();
    const p0 = th.position.clone();
    await E.tween(0.45, k => { th.position.set(p0.x + 0.05 * s * k, p0.y - 0.35 * s * k * k, p0.z + 0.05 * s * k); th.rotation.z = -0.25 - k * 2; });
    sfx.thud();
    reading = Math.max(0, reading - 0.3);
    if (drops >= 3) { endRes(true); return; }
    ui.hint('It fell out! Put it back in the <b>mouth</b>.');
    phase = 'place'; busy = false; person.expr('smile');
  }
  S.update((dt, t) => {
    const m = mouthW();
    ring.position.copy(m); ring.position.z += 0.025 * s; ring.scale.setScalar(1 + Math.sin(t * 7) * 0.08);
    ring.visible = phase === 'place'; hand.visible = phase === 'place';
    if (phase === 'place') {
      const p = E.pointerOnPlane(plane());
      if (p) { th.position.copy(p); th.rotation.set(0, -0.3, -0.2); }
    } else if (phase === 'read') {
      th.position.copy(m).add(new THREE.Vector3(0.002 * s, -0.004 * s, 0.006 * s));
      th.rotation.set(0, -0.5, -0.28 + Math.sin(t * 3) * 0.03);
      if (!cue) {
        reading += dt / (6.5 + diff * 3);
        urgeT -= dt;
        if (urgeT <= 0) { cue = true; cueT = Math.max(0.45, 0.95 - diff * 0.32); person.expr('surprised'); ui.popAt(person.headTop(), '!', 'bad'); sfx.blip(1.5); }
      } else {
        cueT -= dt;
        if (cueT <= 0 && !busy) { cue = false; fallOut(); }
      }
      if (reading >= 1 && !busy) { busy = true; phase = 'done'; endRes(false); }
    }
    readM.set(reading);
    th.userData.red.scale.x = 0.25 + 0.75 * clamp(reading, 0, 1);
  });
  S.on('down', () => {
    if (phase === 'place') {
      const p = E.pointerOnPlane(plane());
      const m = mouthW();
      if (p && Math.hypot(p.x - m.x, p.y - m.y) < R * 1.4) {
        phase = 'read'; sfx.pop(); person.expr('neutral'); newUrge();
        ui.hint('Keep them quiet! When you see <b>!</b>, tap to <b>SHH</b>.');
      } else {
        placeMiss++; sfx.bad(); person.expr('angry'); G.mood(-4);
        G.say(pick(WRONG_SPOT), { key: 'c', hold: 0.6 });
        setTimeout(() => person.expr('smile'), 600);
      }
    } else if (phase === 'read') {
      if (cue) {
        cue = false; newUrge(); sfx.good();
        ui.popAt(person.headTop(), 'SHH!', 'good');
        person.expr('neutral'); G.say(pick(SHUSHED), { key: 'c', hold: 0.4 });
      } else {
        falseShh++; G.mood(-4); reading = Math.max(0, reading - 0.04);
        ui.popAt(person.headTop(), 'Shh?', 'bad');
        person.expr('angry'); G.say(pick(FALSE), { key: 'c', hold: 0.6 });
        setTimeout(() => { if (phase === 'read' && !cue) person.expr('neutral'); }, 700);
      }
    }
  });
  const failed = await ended;
  readM.remove(); ring.visible = false; ui.hint(null);
  if (!failed) {
    sfx.ding();
    th.userData.red.scale.x = 1;
    ui.popAt(person.headTop(), `${finalTemp.toFixed(1)}°F`, 'good');
    await E.wait(0.4);
    G.say(finalTemp > 100.4 ? pick(['A fever! I KNEW it. I am basically a doctor.', 'So I AM sick! Can I stay home tomorrow?', 'Is that bad? That sounds bad.']) : pick(['Normal! I am a normal temperature!', 'Phew. Not a fever. Just dramatic.']), { key: 'c', hold: 0.8 });
    await E.wait(0.9);
  }
  S.end();
  person.expr('smile');
  if (failed) return { score: 5, fail: true, severity: 1, reason: 'thermo' };
  return { score: clamp(100 - drops * 18 - falseShh * 7 - placeMiss * 5, 20, 100), fail: false };
}
