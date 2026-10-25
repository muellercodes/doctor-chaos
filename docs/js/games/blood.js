import * as THREE from 'three';
import { needleTube, vial, bandage } from '../props.js';
import { clamp, rand } from '../engine.js';
import { armSetup } from './shot.js';
import { icon } from '../icons.js';

const VEIN_VS = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const VEIN_FS = `uniform vec3 uLight; uniform float uR; uniform vec3 uColor; varying vec3 vW;
void main(){ float d = distance(vW.xy, uLight.xy); float a = 1.0 - smoothstep(uR*0.35, uR, d); if (a < 0.01) discard; gl_FragColor = vec4(uColor, a*0.95); }`;

const MISS_THIN = ["That vein's too tiny!", "That's a baby vein. Find the big one!", 'Nope, too small!'];
const MISS_NONE = ["That's just arm, doc.", 'OW! There is NO vein there!', "Are you poking me for fun?"];

export async function play(G, P, prm = {}) {
  const { E, ui, sfx } = G;
  const person = P.person;
  await G.howTo('blood', 'Blood Kit: Draw Blood', [
    '<b>Tap the arm</b> to tie the stretchy band.',
    'Veins are hiding! Move the purple <b>Vein Finder</b> light around to find the <b>big</b> blue vein, then <b>click on it</b>.',
    '<b>Hold</b> to fill the tube. It speeds up! <b>Let go</b> when it reaches the lines.',
  ], icon('blood'));
  const S = E.scope();
  const side = 'R';
  const a = await armSetup(G, P, side, 'lower');
  const s = person.s;
  const diff = G.tutorial ? 0 : G.diff;
  const frontZ = a.elbow.z + 0.05 * s + 0.003;
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -frontZ);
  const axis = a.wrist.clone().sub(a.elbow).normalize();
  const perp = new THREE.Vector3(-axis.y, axis.x, 0);

  // ---- phase 1: tourniquet ----
  ui.hint('<b>Tap the upper arm</b> to tie the band.');
  const tq = new THREE.Mesh(new THREE.TorusGeometry(0.06 * s, 0.012 * s, 8, 24), new THREE.MeshStandardMaterial({ color: '#3a86ff' }));
  tq.material.userData.dispose = true;
  const tqPos = a.elbow.clone().lerp(a.shoulder, 0.35);
  tq.position.copy(tqPos); tq.rotation.y = Math.PI / 2; tq.scale.setScalar(1.6); tq.visible = false; S.add(tq);
  const tapGuide = new THREE.Mesh(new THREE.RingGeometry(0.035 * s, 0.045 * s, 28), new THREE.MeshBasicMaterial({ color: '#ffd23f' }));
  tapGuide.material.userData.dispose = true;
  G.dbg = { kind: 'blood', phase: 'tq', tq: new THREE.Vector3(tqPos.x, tqPos.y, frontZ) };
  tapGuide.position.copy(tqPos); tapGuide.position.z = frontZ + 0.003; S.add(tapGuide);
  S.update((dt, t) => tapGuide.scale.setScalar(1 + Math.sin(t * 6) * 0.1));
  await new Promise(res => {
    S.on('down', function onDown() {
      if (tq.visible) return;
      const p = E.pointerOnPlane(plane);
      if (p && p.distanceTo(new THREE.Vector3(tqPos.x, tqPos.y, frontZ)) < 0.12 * s) { tq.visible = true; res(); }
    });
  });
  tapGuide.visible = false;
  sfx.squeak();
  await E.tween(0.3, k => tq.scale.setScalar(1.6 - 0.6 * k));
  G.say(Math.random() < 0.5 ? 'Tight! TIGHT!' : 'Is my arm supposed to feel like a balloon?', { key: 'c', hold: 0.9 });

  // ---- phase 2: find vein ----
  const lightR = 0.075 * s;
  const veins = [];
  const mkVein = (offset, r, good) => {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = -0.2 + i * 0.12;
      const p = a.elbow.clone().addScaledVector(axis, t * 0.24 * s).addScaledVector(perp, offset * s + Math.sin(i * 1.3 + offset * 40) * 0.006 * s);
      p.z = frontZ;
      pts.push(p);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const mat = new THREE.ShaderMaterial({ vertexShader: VEIN_VS, fragmentShader: VEIN_FS, transparent: true, depthWrite: false, uniforms: { uLight: { value: new THREE.Vector3(99, 99, 99) }, uR: { value: lightR }, uColor: { value: new THREE.Color(good ? '#2b59ff' : '#5b7cff') } } });
    mat.userData.dispose = true;
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, r * s, 8), mat);
    S.add(m);
    veins.push({ mesh: m, pts: curve.getSpacedPoints(60), r: r * s, good });
  };
  const goodOff = rand(-0.012, 0.012);
  const order = Math.random() < 0.5 ? 1 : -1;
  mkVein(goodOff, 0.0085 * G.tol, true);
  mkVein(goodOff + order * 0.03, 0.0028, false);
  mkVein(goodOff - order * 0.034, 0.0026, false);
  const glowMat = new THREE.MeshBasicMaterial({ color: '#c77dff', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending });
  glowMat.userData.dispose = true;
  const glow = new THREE.Mesh(new THREE.CircleGeometry(lightR, 32), glowMat); S.add(glow);
  const glowRing = new THREE.Mesh(new THREE.RingGeometry(lightR * 0.96, lightR, 40), new THREE.MeshBasicMaterial({ color: '#c77dff' }));
  glowRing.material.userData.dispose = true; S.add(glowRing);
  ui.hint('Move the <b>Vein Finder</b> light around. <b>Click the BIG blue vein!</b>');
  let misses = 0, quality = 0, hit = null, failed = false;
  G.dbg.phase = 'vein'; G.dbg.vein = veins[0].pts[30];
  const maxMiss = G.tutorial ? 99 : 3;
  let pending = null;
  S.on('down', () => { pending = E.pointerOnPlane(plane); });
  await new Promise(res => {
    const off = S.update(() => {
      const p = E.pointerOnPlane(plane);
      if (p) {
        glow.position.set(p.x, p.y, frontZ + 0.002); glowRing.position.copy(glow.position);
        for (const v of veins) v.mesh.material.uniforms.uLight.value.copy(p);
      }
      if (!pending) return;
      const c = pending; pending = null;
      let best = null;
      for (const v of veins) {
        let d = 1e9; for (const q of v.pts) d = Math.min(d, Math.hypot(q.x - c.x, q.y - c.y));
        const reach = v.good ? v.r * 2.6 + 0.004 * s : v.r * 3;
        if (d < reach && (!best || (v.good && !best.v.good))) best = { v, d, reach };
      }
      if (best && best.v.good) { quality = 1 - best.d / best.reach; hit = c; off(); res(); return; }
      misses++;
      sfx.ouch(P.c.voice || 1); ui.flash(); person.expr('ouch'); person.wiggle = 0.4;
      G.say(best ? MISS_THIN[misses % 3] : MISS_NONE[misses % 3], { key: 'ouch', hold: 1 });
      G.mood(-10);
      setTimeout(() => person.expr('scared'), 600);
      if (misses >= maxMiss) { failed = true; off(); res(); }
    });
  });
  glow.visible = false; glowRing.visible = false;
  if (failed) {
    ui.hint(null); S.end(); person.setPose('sit');
    return { score: 5, fail: true, severity: 1, reason: 'blood_miss' };
  }
  for (const v of veins) { v.mesh.material.uniforms.uR.value = lightR * 0.8; v.mesh.material.uniforms.uLight.value.copy(hit); }
  sfx.good(); ui.popAt(hit, 'Found it!', 'good');

  // ---- phase 3: fill ----
  const nd = needleTube(); nd.scale.setScalar(s * 1.5);
  nd.position.copy(hit); nd.position.z += 0.004;
  nd.rotation.set(0.5, 0, -Math.atan2(axis.x, axis.y) + Math.PI, 'ZYX');
  S.add(nd);
  const v = vial(prm.color || '#c62828');
  const vScale = s * 0.55;
  v.scale.setScalar(vScale);
  const vp = a.elbow.clone().lerp(a.wrist, 0.72); vp.y += 0.065 * s; vp.z += 0.05 * s;
  v.position.copy(vp); S.add(v);
  const zoneW = (0.12 - diff * 0.04) * G.tol;
  const zLo = 0.78 - zoneW / 2, zHi = 0.78 + zoneW / 2;
  v.userData.setZone(zLo, zHi);
  const fillM = ui.meter({ label: 'Tube', vertical: true, value: 0, fill: '#d62828', zones: [{ from: zLo, to: zHi, color: '#7be495' }] });
  ui.hint('<b>Hold</b> to fill the tube. <b>Let go</b> between the two lines!');
  let f = 0, holdT = 0, over = false, remarked = false, done = false;
  G.dbg.phase = 'fill'; G.dbg.f = () => f; G.dbg.zone = [zLo, zHi]; G.dbg.hit = hit;
  person.expr('scared');
  await new Promise(res => {
    S.on('up', () => { if (f >= zLo && !done) { done = true; } });
    const off = S.update(dt => {
      if (E.input.down && !done) {
        holdT += dt;
        f += dt * (0.09 + holdT * (0.3 + diff * 0.12));
        if (!remarked && f > 0.3) { remarked = true; if (P.c.personality === 'vampire' || Math.random() < 0.5) G.remark(); }
      } else holdT = 0;
      if (f >= 1) { f = 1; over = true; done = true; }
      v.userData.setFill(f); fillM.set(f);
      if (done) { off(); res(); }
    });
  });
  fillM.remove();
  ui.hint(null);
  let score;
  if (over) {
    sfx.bad(); ui.popCenter('TOO MUCH!', 'bad');
    G.say('WHOA! Whoa whoa. Are you saving some for later?!', { key: 'ouch', hold: 1.2 });
    person.expr('surprised');
    await E.wait(1.0);
    if (!G.tutorial) { S.end(); person.setPose('sit'); return { score: 10, fail: true, severity: 1, reason: 'blood_over' }; }
    score = 40;
  } else {
    const err = f > zHi ? (f - zHi) : 0;
    score = clamp(100 - misses * 15 - err * 250 - (1 - quality) * 15, 20, 100);
    sfx.ding(); ui.popAt(v.position, f <= zHi ? 'Perfect fill!' : 'A little extra...', f <= zHi ? 'good' : '');
  }
  await E.wait(0.4);
  nd.visible = false; tq.visible = false;
  const band = bandage(G.bandageColor || '#ffcc80'); band.scale.setScalar(s * 1.1);
  band.position.copy(hit); band.position.z += 0.003; S.add(band);
  sfx.pop();
  await E.wait(0.6);
  S.end();
  person.setPose('sit');
  return { score, fail: false };
}
