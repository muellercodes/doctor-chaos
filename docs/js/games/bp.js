// Blood pressure cuff: pump it into the green, then catch the very first heartbeat as the air lets out.
import * as THREE from 'three';
import { clamp, rand, pick, toon } from '../engine.js';
import { icon } from '../icons.js';
import { armSetup } from './shot.js';
import { holdWith } from '../props.js';

// A real-looking dial gauge (0 to 300) instead of a plain bar; the needle follows the pressure.
function dial(zone) {
  const el = document.createElement('div');
  el.className = 'bp-dial';
  const R = 52, cx = 60, cy = 60;
  const ang = v => (-225 + v * 270) * Math.PI / 180;
  const pt = (v, r) => [cx + Math.cos(ang(v)) * r, cy + Math.sin(ang(v)) * r];
  const arc = (a, b, r) => { const [x1, y1] = pt(a, r), [x2, y2] = pt(b, r); return `M${x1.toFixed(1)} ${y1.toFixed(1)}A${r} ${r} 0 ${(b - a) * 270 > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`; };
  let ticks = '';
  for (let i = 0; i <= 30; i++) { const v = i / 30, [x1, y1] = pt(v, R - 2), [x2, y2] = pt(v, R - (i % 5 ? 7 : 12)); ticks += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="#1d2b36" stroke-width="${i % 5 ? 1 : 2}"/>`; if (i % 5 === 0) { const [tx, ty] = pt(v, R - 21); ticks += `<text x="${tx.toFixed(1)}" y="${(ty + 3.5).toFixed(1)}" font-size="9" font-weight="700" text-anchor="middle" fill="#1d2b36">${i * 10}</text>`; } }
  el.innerHTML = `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="58" fill="#cfd8dc" stroke="#1d2b36" stroke-width="3"/><circle cx="60" cy="60" r="${R + 1}" fill="#fffef6"/>
    <path d="${arc(zone[0], zone[1], R - 4)}" stroke="#7be495" stroke-width="7" fill="none"/><path d="${arc(0.9, 1, R - 4)}" stroke="#ff8b8b" stroke-width="7" fill="none"/>${ticks}
    <text x="60" y="88" font-size="9" font-weight="700" text-anchor="middle" fill="#607d8b">mmHg</text>
    <g class="needle"><path d="M60 60L60 14" stroke="#c21d3b" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="60" r="5" fill="#1d2b36"/></g></svg>`;
  document.querySelector('#ui .meters').appendChild(el);
  const needle = el.querySelector('.needle');
  return { set(v) { needle.setAttribute('transform', `rotate(${(-135 + Math.max(0, Math.min(1.05, v)) * 270).toFixed(1)} 60 60)`); }, remove() { el.remove(); } };
}
// the squeeze bulb you pump with
function bulb() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), toon('#263238', { roughness: 0.6 })); b.scale.set(1, 1.35, 1); g.add(b);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.03, 10), toon('#90a4ae')); neck.position.y = 0.05; g.add(neck);
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.015, 10), toon('#cfd8dc')); valve.position.y = 0.07; g.add(valve);
  g.userData.ball = b;
  return g;
}

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
  const presM = dial(ZONE);
  // the pump bulb sits in the doctor's hand just below the cuff
  const pump = bulb(); pump.scale.setScalar(person.s * 0.75); S.add(pump);
  holdWith(pump, G.coatColor || '#ffffff', [0, -0.005, 0.0], [0, 0, 0], 0.75, [0, -1, 0]);
  // keep it in the lower right corner of the view, out of the way of the arm
  const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3();
  const pumpPos = () => {
    const cam = E.camera; cam.updateMatrixWorld();
    cam.getWorldDirection(_f); _r.setFromMatrixColumn(cam.matrixWorld, 0); _u.setFromMatrixColumn(cam.matrixWorld, 1);
    return cam.position.clone().addScaledVector(_f, 0.55).addScaledVector(_r, 0.21 * (E.camera.aspect / 1.78)).addScaledVector(_u, -0.13);
  };
  const heart = h0(ui);
  let p = 0, phase = 'pump', inZone = 0, over = 0, early = 0, misses = 0, beating = false, beatT = 0, sinceBeat = 0, sys = 0, done = false, errT = 0;
  G.dbg = { kind: 'bp', get phase() { return phase; }, p: () => p, zone: ZONE, beating: () => beating };
  ui.hint('<b>Tap fast</b> to pump the cuff into the <b>green</b>!');
  let endRes;
  const ended = new Promise(r => { endRes = r; });
  const startListen = () => {
    phase = 'listen'; sys = rand(0.44, 0.56); beating = false; beatT = 0; sinceBeat = 0; E.input.requireRelease(250);
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
    pump.position.copy(pumpPos());
    pump.rotation.set(0, 0, 0.5);
    const ball = pump.userData.ball; ball.scale.x += (1 - ball.scale.x) * Math.min(1, dt * 10); ball.scale.z = ball.scale.x;
  });
  S.on('down', () => {
    if (phase === 'pump') {
      p += 0.055 + Math.random() * 0.012; sfx.blip(0.6 + p);
      pump.userData.ball.scale.x = 0.7; pump.userData.ball.scale.z = 0.7;
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
