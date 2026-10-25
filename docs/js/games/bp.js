// Blood pressure cuff: pump it into the green, then catch the very first heartbeat as the air lets out.
import * as THREE from 'three';
import { clamp, rand, pick, toon } from '../engine.js';
import { icon } from '../icons.js';
import { armSetup } from './shot.js';

const OVER = ['OW! Too tight!', 'My arm is turning into a balloon!', "That's a LOT of squeeze!", 'Easy! I still need that arm!'];
const EARLY = ["Not yet! There's nothing to hear.", 'Too early. My heart was napping.', 'You clicked before my heart even started.'];

export async function play(G, P) {
  const { E, ui, sfx } = G;
  const person = P.person;
  await G.howTo('bp', 'Pressure Cuff: Blood Pressure', [
    '<b>Tap fast</b> to pump the cuff up into the <b>green</b>. Not too high!',
    'Then the air lets out slowly. Watch the heart light and listen for the <b>first beat</b>.',
    '<b>Click the moment</b> the first beat shows up. Too early or too late does not count.',
  ], icon('bp'));
  const S = E.scope();
  const side = 'L';
  await armSetup(G, P, side, 'upper');
  const sh = person.j['sh' + side];
  // the cuff wraps the upper arm
  const cuffG = new THREE.Group(); cuffG.position.set(0, -0.13, 0);
  const cuffMat = toon('#3a86ff', { side: THREE.DoubleSide });
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 22, 1, true), cuffMat); cuffG.add(cuff);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.115, 0.012), toon('#2b6cd1')); strap.position.set(0, 0, 0.074); cuffG.add(strap);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.07, 6), toon('#1d2b36')); tube.position.set(0.02, -0.085, 0.07); tube.rotation.z = 0.3; cuffG.add(tube);
  const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 18), toon('#ffffff')); gauge.rotation.x = Math.PI / 2; gauge.position.set(0.035, -0.125, 0.075); cuffG.add(gauge);
  sh.add(cuffG);
  S.defer(() => sh.remove(cuffG));
  const diff = G.tutorial ? 0 : Math.min(1.4, G.diff);
  const ZONE = [0.6, 0.76];
  const presM = ui.meter({ label: 'Pressure', vertical: true, marker: true, zones: [{ from: 0, to: ZONE[0], color: '#d9e2ec' }, { from: ZONE[0], to: ZONE[1], color: '#7be495' }, { from: ZONE[1], to: 0.9, color: '#ffe08a' }, { from: 0.9, to: 1, color: '#ff8b8b' }] });
  const heart = h0(ui);
  let p = 0, phase = 'pump', inZone = 0, over = 0, early = 0, misses = 0, beating = false, beatT = 0, sinceBeat = 0, sys = 0, done = false, errT = 0;
  G.dbg = { kind: 'bp', get phase() { return phase; }, p: () => p, zone: ZONE, beating: () => beating };
  ui.hint('<b>Tap fast</b> to pump the cuff into the <b>green</b>!');
  let endRes;
  const ended = new Promise(r => { endRes = r; });
  const startListen = () => {
    phase = 'listen'; sys = rand(0.44, 0.56); beating = false; beatT = 0; sinceBeat = 0;
    ui.hint('The air is letting out... <b>click on the very first heartbeat!</b>');
    sfx.zip();
  };
  S.update(dt => {
    if (phase === 'pump') {
      p = Math.max(0, p - dt * 0.035);
      if (p >= ZONE[0] && p <= ZONE[1]) { inZone += dt; if (inZone > 0.7) { sfx.good(); ui.popAt(person.wp(sh, 0, -0.13, 0.08), 'Good!', 'good'); startListen(); } } else inZone = 0;
    } else if (phase === 'listen') {
      p = Math.max(0, p - dt * (0.075 + diff * 0.035));
      if (!beating && p <= sys) { beating = true; beatT = 0; sinceBeat = 0; }
      if (beating) {
        sinceBeat += dt; beatT -= dt;
        if (beatT <= 0) { beatT = 0.72; sfx.heartbeat(0.9); heart.beat(); cuffG.scale.setScalar(1.04); setTimeout(() => cuffG.scale.setScalar(1), 120); }
        if (p < sys - 0.22) {
          misses++; beating = false; sfx.bad(); G.mood(-6);
          G.say(pick(['Did you hear that? You missed it!', 'My heart was going THUMP the whole time!', 'Hello? Doctor? It was beating!']), { key: 'c', hold: 0.8 });
          if (misses >= 3) { phase = 'done'; endRes(true); return; }
          phase = 'pump'; p = 0.2; ui.hint('Missed it. <b>Pump it back up</b> and try again.');
        }
      }
    }
    presM.set(p);
    const k = 1 + p * 0.12; cuff.scale.set(k, 1, k);
  });
  S.on('down', () => {
    if (phase === 'pump') {
      p += 0.055 + Math.random() * 0.012; sfx.blip(0.6 + p);
      if (p > 0.9) {
        over++; p = 0.74; sfx.ouch(P.c.voice || 1); person.expr('ouch'); person.wiggle = 0.4; G.mood(-8);
        G.say(pick(OVER), { key: 'c', hold: 0.7 }); setTimeout(() => person.expr('smile'), 700);
      }
    } else if (phase === 'listen') {
      if (!beating) {
        early++; sfx.bad(); G.mood(-3);
        ui.popAt(person.headTop(), 'Too early!', 'bad');
        G.say(pick(EARLY), { key: 'c', hold: 0.6 });
      } else if (!done) {
        done = true; errT = sinceBeat; phase = 'done'; endRes(false);
      }
    }
  });
  const failed = await ended;
  presM.remove(); heart.remove(); ui.hint(null);
  let score = 5;
  if (!failed) {
    const top = Math.round(sys * 250), bottom = Math.round(sys * 250 * rand(0.62, 0.7));
    const q = errT < 0.35 ? 'PERFECT!' : errT < 0.9 ? 'Nice!' : 'A bit late...';
    sfx.ding();
    ui.popAt(person.wp(sh, 0, -0.13, 0.08), `${top}/${bottom} ${q}`, errT < 0.9 ? 'good' : 'bad');
    score = clamp(100 - over * 12 - early * 10 - misses * 22 - Math.max(0, errT - 0.35) * 35, 20, 100);
    await E.wait(1.0);
  }
  S.end();
  person.setPose('sit');
  if (failed) return { score: 5, fail: true, severity: 1, reason: 'bp' };
  return { score, fail: false };
}

// a little heart light next to the pressure meter that flashes on every beat
function h0(ui) {
  const el = document.createElement('div');
  el.className = 'bp-heart';
  el.innerHTML = icon('heart');
  document.querySelector('#ui .meters').appendChild(el);
  return {
    beat() { el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); },
    remove() { el.remove(); },
  };
}
