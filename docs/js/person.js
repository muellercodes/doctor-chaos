import * as THREE from 'three';
import { toon, canvasTexture, TABLE_TOP, ease, rand, clamp } from './engine.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function mesh(geo, color) {
  const m = new THREE.Mesh(geo, typeof color === 'string' ? toon(color) : color);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
const capsule = (r, len, color) => mesh(new THREE.CapsuleGeometry(r, len, 6, 14), color);
const sphere = (r, color, seg = 18) => mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), color);
const boxm = (w, h, d, color) => mesh(new THREE.BoxGeometry(w, h, d), color);

const stripeCache = new Map();
function stripeMat(a, b, n = 8) {
  const key = a + b + n;
  if (stripeCache.has(key)) return stripeCache.get(key);
  const { tex } = canvasTexture(64, 64, (ctx, W, H) => {
    for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? b : a; ctx.fillRect(0, (i * H) / n, W, H / n + 1); }
  });
  const m = new THREE.MeshToonMaterial({ map: tex });
  stripeCache.set(key, m);
  return m;
}

function darken(hex, k = 0.75) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return '#' + c.getHexString();
}

// ---------------- FACE ----------------
class Face {
  constructor(head, r, cy, o = {}) {
    this.head = head; this.r = r; this.cy = cy;
    const er = 0.15 * r * (o.eyeScale || 1);
    const ex = 0.34 * r, ey = cy + 0.13 * r;
    const ez = Math.sqrt(r * r - ex * ex - (0.13 * r) ** 2) * 0.93;
    this.eyes = [];
    for (const sx of [1, -1]) {
      const g = new THREE.Group(); g.position.set(sx * ex, ey, ez);
      const e = sphere(er, '#1d2b36', 14); e.scale.set(1, 1.25, 0.6); e.castShadow = false; g.add(e);
      const hl = sphere(er * 0.32, '#ffffff', 8); hl.position.set(sx * er * 0.25 + er * 0.1, er * 0.42, er * 0.5); hl.castShadow = false; g.add(hl);
      if (o.lashes) {
        const l = boxm(er * 0.9, er * 0.22, er * 0.2, '#1d2b36'); l.position.set(sx * er * 0.95, er * 1.05, 0); l.rotation.z = sx * 0.6; l.castShadow = false; g.add(l);
      }
      head.add(g); this.eyes.push(g);
    }
    this.brows = [];
    const bz = Math.sqrt(Math.max(0, 1 - 0.34 ** 2 - 0.47 ** 2)) * r + 0.012 * r * 10 * 0.1;
    for (const sx of [1, -1]) {
      const b = boxm(0.38 * r, 0.085 * r, 0.09 * r, o.browColor || '#3b2a20'); b.castShadow = false;
      b.position.set(sx * 0.34 * r, cy + 0.48 * r, bz + 0.02 * r);
      b.userData.baseY = b.position.y;
      head.add(b); this.brows.push(b);
    }
    const nose = sphere(0.13 * r, o.noseColor || darken(o.skin || '#f1c27d', 0.92), 12); nose.position.set(0, cy - 0.08 * r, 0.97 * r); nose.castShadow = false; head.add(nose);
    this.nose = nose;
    const mg = new THREE.Group(); mg.position.set(0, cy - 0.42 * r, 0.9 * r + 0.01 * r); head.add(mg);
    this.mouthGroup = mg;
    const dark = '#5a1e2a';
    const smile = mesh(new THREE.TorusGeometry(0.24 * r, 0.05 * r, 6, 16, Math.PI), '#5a1e2a'); smile.rotation.z = Math.PI; smile.position.y = 0.12 * r;
    const frown = mesh(new THREE.TorusGeometry(0.22 * r, 0.05 * r, 6, 16, Math.PI), '#5a1e2a'); frown.position.y = -0.14 * r;
    const open = sphere(0.2 * r, dark, 14); open.scale.set(1.2, 0.95, 0.45);
    const tongue = sphere(0.12 * r, '#ff7b8a', 10); tongue.scale.set(1.2, 0.6, 0.4); tongue.position.set(0, -0.09 * r, 0.04 * r); open.add(tongue);
    const o2 = mesh(new THREE.TorusGeometry(0.1 * r, 0.05 * r, 6, 14), dark);
    const flat = boxm(0.34 * r, 0.055 * r, 0.06 * r, dark);
    const laugh = new THREE.Group();
    const ld = mesh(new THREE.CircleGeometry(0.27 * r, 18, Math.PI, Math.PI), dark); ld.position.z = 0.03 * r; laugh.add(ld);
    const teeth = boxm(0.4 * r, 0.06 * r, 0.02 * r, '#ffffff'); teeth.position.set(0, -0.03 * r, 0.04 * r); laugh.add(teeth);
    laugh.position.y = 0.06 * r;
    this.mouths = { smile, frown, open, o: o2, flat, laugh };
    for (const m of Object.values(this.mouths)) { m.visible = false; m.traverse(c => { c.castShadow = false; }); mg.add(m); }
    if (o.fangs) {
      for (const sx of [1, -1]) { const f = mesh(new THREE.ConeGeometry(0.035 * r, 0.12 * r, 6), '#ffffff'); f.rotation.z = Math.PI; f.position.set(sx * 0.1 * r, 0.05 * r, 0.04 * r); f.castShadow = false; mg.add(f); }
    }
    this.cheeks = [];
    for (const sx of [1, -1]) {
      const c = sphere(0.13 * r, '#ff9aa2', 10); c.scale.set(1, 0.7, 0.35); c.position.set(sx * 0.56 * r, cy - 0.18 * r, 0.8 * r); c.castShadow = false;
      c.visible = !!o.cheeks; head.add(c); this.cheeks.push(c);
    }
    this.alwaysCheeks = !!o.cheeks;
    this.eyeOpen = 1; this.eyeTarget = 1; this.blinkT = rand(1, 4); this.blinking = 0;
    this.expr = null; this.talking = 0; this.talkT = 0;
    this.tears = [];
    this.set('smile');
  }
  showMouth(name) { for (const [k, m] of Object.entries(this.mouths)) m.visible = k === name; }
  set(expr) {
    this.expr = expr;
    const E = {
      smile: { eye: 1, brow: 0, by: 0, mouth: 'smile' },
      neutral: { eye: 1, brow: 0, by: 0, mouth: 'flat' },
      happy: { eye: 1, brow: 0, by: 0.06, mouth: 'smile', cheeks: true },
      scared: { eye: 1.3, brow: -0.35, by: 0.08, mouth: 'o' },
      surprised: { eye: 1.3, brow: 0, by: 0.1, mouth: 'o' },
      ouch: { eye: 0.12, brow: -0.35, by: 0.02, mouth: 'open' },
      angry: { eye: 0.9, brow: 0.42, by: -0.03, mouth: 'frown' },
      sad: { eye: 0.9, brow: -0.35, by: 0.03, mouth: 'frown' },
      sleep: { eye: 0.08, brow: 0, by: -0.02, mouth: 'o' },
      laugh: { eye: 0.15, brow: 0, by: 0.06, mouth: 'laugh', cheeks: true },
      cry: { eye: 0.12, brow: -0.4, by: 0.04, mouth: 'open', tears: true },
      yell: { eye: 1.15, brow: 0.42, by: -0.02, mouth: 'open' },
      smug: { eye: 0.7, brow: 0.15, by: 0.03, mouth: 'smile' },
    }[expr] || { eye: 1, brow: 0, by: 0, mouth: 'smile' };
    this.cfg = E;
    this.eyeTarget = E.eye;
    this.brows.forEach((b, i) => { const sx = i === 0 ? 1 : -1; b.rotation.z = -sx * E.brow; b.position.y = b.userData.baseY + E.by * this.r; });
    this.showMouth(E.mouth);
    this.cheeks.forEach(c => { c.visible = this.alwaysCheeks || !!E.cheeks; });
  }
  update(dt, t) {
    this.blinkT -= dt;
    let k = this.eyeTarget;
    if (this.blinkT < 0) { this.blinking = 0.13; this.blinkT = rand(1.8, 4.5); }
    if (this.blinking > 0) { this.blinking -= dt; if (this.eyeTarget > 0.5) k = 0.1; }
    this.eyeOpen += (k - this.eyeOpen) * Math.min(1, dt * 25);
    for (const e of this.eyes) e.scale.set(this.eyeTarget > 1.1 ? 1.15 : 1, this.eyeOpen, 1);
    if (this.talking > 0) {
      this.talking -= dt; this.talkT -= dt;
      if (this.talkT < 0) { this.talkT = rand(0.06, 0.13); this.showMouth(Math.random() < 0.55 ? 'open' : (this.cfg.mouth === 'open' ? 'o' : this.cfg.mouth)); }
      if (this.talking <= 0) this.showMouth(this.cfg.mouth);
    }
    if (this.cfg.tears && Math.random() < dt * 8 && this.tears.length < 10) {
      const tr = sphere(0.05 * this.r, '#7fd6ff', 8); tr.castShadow = false;
      const eye = this.eyes[Math.random() < 0.5 ? 0 : 1];
      tr.position.copy(eye.position).add(V(0, -0.12 * this.r, 0.08 * this.r));
      tr.userData.v = V(eye.position.x * 4 * rand(0.5, 1.5), 0.2 * this.r * 10, 0.3);
      this.head.add(tr); this.tears.push(tr);
    }
    for (let i = this.tears.length - 1; i >= 0; i--) {
      const tr = this.tears[i];
      tr.userData.v.y -= dt * 3.5;
      tr.position.addScaledVector(tr.userData.v, dt);
      if (tr.position.y < this.cy - 1.6 * this.r) { this.head.remove(tr); tr.geometry.dispose(); this.tears.splice(i, 1); }
    }
  }
  talk(sec) { this.talking = sec; }
}

// ---------------- POSES ----------------
const JOINTS = ['spine', 'neck', 'head', 'shL', 'shR', 'elL', 'elR', 'hipL', 'hipR', 'knL', 'knR'];
const BASE = { spine: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], shL: [0, 0, 0.07], shR: [0, 0, -0.07], elL: [0, 0, 0], elR: [0, 0, 0], hipL: [0, 0, 0], hipR: [0, 0, 0], knL: [0, 0, 0], knR: [0, 0, 0] };
const SIT = { hipL: [-1.52, 0, 0.07], hipR: [-1.52, 0, -0.07], knL: [1.48, 0, 0], knR: [1.48, 0, 0], shL: [-0.28, 0, 0.12], shR: [-0.28, 0, -0.12], elL: [-0.75, 0, 0], elR: [-0.75, 0, 0] };
export const POSES = {
  stand: {},
  sit: SIT,
  lie: { shL: [0, 0, 0.1], shR: [0, 0, -0.1] },
  armOutR: { ...SIT, shR: [0, -0.12, -1.5], elR: [0, 0, 0] },
  armOutL: { ...SIT, shL: [0, 0.12, 1.5], elL: [0, 0, 0] },
  scared: { ...SIT, shL: [-0.2, 0, 2.5], shR: [-0.2, 0, -2.5], elL: [-0.5, 0, 0], elR: [-0.5, 0, 0] },
  cheer: { ...SIT, shL: [0, 0, 2.7], shR: [0, 0, -2.7], elL: [0, 0, 0.3], elR: [0, 0, -0.3] },
  shrug: { ...SIT, shL: [-0.5, 0, 0.9], shR: [-0.5, 0, -0.9], elL: [-1.4, 0, 0], elR: [-1.4, 0, 0] },
  run: { spine: [0.18, 0, 0] },
  cheerStand: { shL: [0, 0, 2.7], shR: [0, 0, -2.7], elL: [0, 0, 0.3], elR: [0, 0, -0.3] },
  hold: { ...SIT, shL: [-1.1, 0.3, 0.1], elL: [-0.9, 0, 0] },
};

// ---------------- PERSON ----------------
export class Person {
  constructor(spec) {
    this.spec = spec;
    const age = spec.age || 'adult';
    const S = { kid: 0.66, teen: 0.86, adult: 0.94, elder: 0.9 }[age] || 0.94;
    this.s = S * (spec.tall || 1);
    this.hs = { kid: 1.26, teen: 1.08, adult: 1, elder: 1 }[age] || 1;
    const skin = spec.skin || '#f1c27d';
    const shirt = spec.shirt || '#4ea8de';
    const pants = spec.pants || '#3d5a80';
    const shoes = spec.shoes || '#1d2b36';
    const hairC = spec.hair?.color || '#3b2a20';
    const shirtMat = spec.stripes ? stripeMat(spec.stripes[0], spec.stripes[1]) : toon(shirt);

    this.root = new THREE.Group();
    this.body = new THREE.Group(); this.body.scale.setScalar(this.s); this.root.add(this.body);
    const j = this.j = {};
    const pelvis = boxm(0.34, 0.16, 0.21, pants); this.body.add(pelvis);
    j.spine = new THREE.Group(); j.spine.position.y = 0.06; this.body.add(j.spine);
    const torso = capsule(0.17, 0.3, shirtMat); torso.position.y = 0.3; torso.scale.set(1.05, 1, 0.74); j.spine.add(torso);
    this.torso = torso;
    j.neck = new THREE.Group(); j.neck.position.y = 0.585; j.spine.add(j.neck);
    const neck = mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.12, 10), skin); neck.position.y = 0.04; j.neck.add(neck);
    j.head = new THREE.Group(); j.head.position.y = 0.05; j.head.scale.setScalar(this.hs); j.neck.add(j.head);
    const HR = 0.16, HC = 0.15;
    const head = sphere(HR, skin, 24); head.position.y = HC; j.head.add(head);
    this.headMesh = head;
    for (const sx of [1, -1]) { const ear = sphere(0.032, skin, 10); ear.position.set(sx * 0.158, HC - 0.01, -0.01); ear.scale.set(0.6, 1, 0.9); j.head.add(ear); }
    this.face = new Face(j.head, HR, HC, { skin, lashes: spec.gender === 'f', browColor: darken(hairC, 0.8), cheeks: age === 'kid', fangs: spec.outfit === 'vampire' });
    this.buildHair(spec, HR, HC, hairC);

    // arms
    const sleeveLong = spec.sleeves === 'long';
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? 1 : -1;
      const sh = j['sh' + side] = new THREE.Group(); sh.position.set(sx * 0.215, 0.52, 0); j.spine.add(sh);
      const ua = capsule(0.056, 0.2, shirtMat); ua.position.y = -0.13; sh.add(ua);
      const el = j['el' + side] = new THREE.Group(); el.position.y = -0.27; sh.add(el);
      const fa = capsule(0.05, 0.18, sleeveLong ? shirtMat : toon(skin)); fa.position.y = -0.12; el.add(fa);
      const hand = sphere(0.058, skin, 12); hand.position.y = -0.26; el.add(hand);
      this['upperArm' + side] = ua; this['forearm' + side] = fa; this['hand' + side] = hand;
      // legs
      const hip = j['hip' + side] = new THREE.Group(); hip.position.set(sx * 0.095, -0.02, 0); this.body.add(hip);
      const th = capsule(0.077, 0.26, pants); th.position.y = -0.19; hip.add(th);
      const kn = j['kn' + side] = new THREE.Group(); kn.position.y = -0.4; hip.add(kn);
      const sn = capsule(0.063, 0.26, spec.shorts ? toon(skin) : toon(pants)); sn.position.y = -0.19; kn.add(sn);
      const foot = boxm(0.11, 0.07, 0.21, shoes); foot.position.set(0, -0.4, 0.045); kn.add(foot);
      this['thigh' + side] = th; this['shin' + side] = sn;
    }
    this.buildOutfit(spec, skin, HR, HC);
    if (spec.glasses) this.addGlasses(spec.glasses === 'sun' ? '#1d2b36' : '#1d2b36', spec.glasses === 'sun');

    this.cur = {}; this.target = {}; this.off = {};
    for (const k of JOINTS) { this.cur[k] = BASE[k].slice(); this.target[k] = BASE[k].slice(); this.off[k] = [0, 0, 0]; }
    this.poseName = 'stand';
    this.poseSpeed = 9;
    this.walkAmt = 0; this.walkTarget = 0; this.walkSpeed = 1; this.walkPhase = 0; this.running = false;
    this.wiggle = 0; this.shiver = 0; this.bounce = 0;
    this.lookYaw = 0; this.lookPitch = 0;
    this.breath = rand(0, 6);
    this.root.traverse(o => { if (o.isMesh) o.userData.person = this; });
    this.setPose('stand', true);
    this.placeStanding(0, 0, 0);
  }

  buildHair(spec, HR, HC, color) {
    const h = this.j.head;
    const style = spec.hair?.style || 'short';
    const cap = (theta = 0.42, tilt = -0.28, rr = 1.05) => {
      const m = mesh(new THREE.SphereGeometry(HR * rr, 24, 12, 0, Math.PI * 2, 0, Math.PI * theta), color);
      m.position.y = HC; m.rotation.x = tilt; h.add(m); return m;
    };
    switch (style) {
      case 'none': break;
      case 'bald': {
        for (const sx of [1, -1]) { const s = sphere(0.055, color, 10); s.scale.set(0.7, 1, 1.3); s.position.set(sx * 0.14, HC + 0.03, -0.05); h.add(s); }
        break;
      }
      case 'buzz': cap(0.4, -0.3, 1.02); break;
      case 'short': cap(0.42, -0.3); break;
      case 'spiky': {
        cap(0.4, -0.3);
        for (let i = 0; i < 7; i++) { const c = mesh(new THREE.ConeGeometry(0.045, 0.12, 8), color); const a = (i / 7) * Math.PI * 2; c.position.set(Math.cos(a) * 0.08, HC + 0.15, Math.sin(a) * 0.08 - 0.02); c.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); h.add(c); }
        break;
      }
      case 'curly': {
        cap(0.38, -0.3);
        for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, b = 0.35 + (i % 3) * 0.22; const s = sphere(0.055, color, 10); s.position.set(Math.cos(a) * Math.sin(b) * HR * 1.05, HC + Math.cos(b) * HR * 1.05, Math.sin(a) * Math.sin(b) * HR * 1.05 - 0.02); if (s.position.z > 0.09 && s.position.y < HC + 0.1) continue; h.add(s); }
        break;
      }
      case 'afro': { const s = sphere(0.215, color, 20); s.position.set(0, HC + 0.1, -0.07); s.scale.set(1.05, 0.9, 1); h.add(s); break; }
      case 'bob': { cap(0.62, -0.42, 1.06); break; }
      case 'long': {
        cap(0.45, -0.32);
        const b = capsule(0.13, 0.2, color); b.scale.set(1.18, 1, 0.45); b.position.set(0, HC - 0.07, -0.1); h.add(b);
        break;
      }
      case 'ponytail': {
        cap(0.45, -0.32);
        const p = capsule(0.05, 0.16, color); p.position.set(0, HC + 0.04, -0.2); p.rotation.x = 0.6; h.add(p);
        break;
      }
      case 'bun': { cap(0.45, -0.3); const b = sphere(0.075, color, 12); b.position.set(0, HC + 0.17, -0.07); h.add(b); break; }
      case 'pigtails': {
        cap(0.45, -0.32);
        for (const sx of [1, -1]) { const p = capsule(0.045, 0.1, color); p.position.set(sx * 0.17, HC + 0.02, -0.05); p.rotation.z = sx * 0.7; h.add(p); }
        break;
      }
      case 'slick': {
        cap(0.44, -0.2, 1.04);
        const peak = mesh(new THREE.ConeGeometry(0.03, 0.06, 4), color); peak.rotation.x = Math.PI + 0.3; peak.position.set(0, HC + 0.12, 0.12); h.add(peak);
        break;
      }
      default: cap();
    }
    if (spec.beard === 'full') { const b = sphere(0.12, color, 14); b.scale.set(1.1, 0.75, 0.62); b.position.set(0, HC - 0.11, 0.07); h.add(b); }
    if (spec.beard === 'mustache' || spec.outfit === 'trench') { const m = capsule(0.02, 0.07, spec.outfit === 'trench' ? '#3b2a20' : color); m.rotation.z = Math.PI / 2; m.position.set(0, HC - 0.045, 0.152); h.add(m); }
  }

  addGlasses(color, sun) {
    const g = new THREE.Group(); const HC = 0.15, r = 0.16;
    for (const sx of [1, -1]) {
      const ring = mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 18), color); ring.position.set(sx * 0.055, HC + 0.02, 0.165); g.add(ring);
      if (sun) { const l = mesh(new THREE.CircleGeometry(0.04, 18), '#263238'); l.position.set(sx * 0.055, HC + 0.02, 0.167); g.add(l); }
    }
    const br = boxm(0.03, 0.008, 0.008, color); br.position.set(0, HC + 0.025, 0.168); g.add(br);
    for (const sx of [1, -1]) { const arm = boxm(0.006, 0.006, 0.15, color); arm.position.set(sx * 0.095, HC + 0.025, 0.09); g.add(arm); }
    this.j.head.add(g);
    this.glasses = g;
  }

  buildOutfit(spec, skin, HR, HC) {
    const h = this.j.head;
    const o = spec.outfit;
    if (o === 'vampire') {
      const cape = mesh(new THREE.CylinderGeometry(0.2, 0.36, 0.95, 18, 1, true, Math.PI * 0.6, Math.PI * 0.8), toon('#1a1a2e', { side: THREE.DoubleSide }));
      cape.position.set(0, 0.2, -0.02); cape.rotation.y = Math.PI; this.j.spine.add(cape);
      for (const sx of [1, -1]) { const c = mesh(new THREE.ConeGeometry(0.09, 0.26, 4), '#b5172f'); c.position.set(sx * 0.12, 0.66, -0.06); c.rotation.z = -sx * 0.35; this.j.spine.add(c); }
    }
    if (o === 'pirate') {
      const band = mesh(new THREE.SphereGeometry(HR * 1.07, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.36), '#e63946'); band.position.y = HC; band.rotation.x = -0.25; h.add(band);
      const knot = sphere(0.04, '#e63946', 10); knot.position.set(0, HC + 0.05, -0.17); h.add(knot);
      const patch = mesh(new THREE.CircleGeometry(0.045, 16), '#111'); patch.position.set(-0.055, HC + 0.025, 0.172); h.add(patch);
      const strap = mesh(new THREE.TorusGeometry(0.165, 0.007, 6, 30), '#111'); strap.position.y = HC + 0.04; strap.rotation.set(0.3, 0, 0.45); h.add(strap);
      const ring = mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 12), '#ffd23f'); ring.position.set(0.165, HC - 0.06, 0.0); h.add(ring);
    }
    if (o === 'trench') {
      const coat = mesh(new THREE.CylinderGeometry(0.23, 0.3, 0.95, 18), '#b08d57'); coat.position.y = 0.18; coat.scale.z = 0.8; this.j.spine.add(coat);
      const belt = mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.05, 18), '#7a5c32'); belt.position.y = 0.12; belt.scale.z = 0.8; this.j.spine.add(belt);
      const collar = mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.12, 14, 1, true), toon('#9c7a46', { side: THREE.DoubleSide })); collar.position.y = 0.6; this.j.spine.add(collar);
      const brim = mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.015, 24), '#4a3b2a'); brim.position.y = HC + 0.11; h.add(brim);
      const crown = mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.13, 20), '#4a3b2a'); crown.position.y = HC + 0.18; h.add(crown);
      const bandM = mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.03, 20), '#1d2b36'); bandM.position.y = HC + 0.135; h.add(bandM);
    }
    if (o === 'mime') {
      const b = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 20), '#111'); b.position.set(0.03, HC + 0.15, -0.01); b.rotation.z = -0.25; h.add(b);
      const nub = sphere(0.02, '#111', 8); nub.position.set(0.04, HC + 0.185, -0.01); h.add(nub);
    }
    if (o === 'influencer') {
      const phone = boxm(0.07, 0.13, 0.012, '#1d2b36'); phone.position.set(0, -0.3, 0.04); phone.rotation.x = -0.4; this.j.elL.add(phone);
      const scr = boxm(0.06, 0.11, 0.002, '#7fdbff'); scr.position.set(0, 0, 0.007); phone.add(scr);
      const sg = new THREE.Group(); for (const sx of [1, -1]) { const l = mesh(new THREE.CircleGeometry(0.04, 16), '#ff5d8f'); l.position.set(sx * 0.055, 0, 0); sg.add(l); }
      sg.position.set(0, HC + 0.13, 0.11); sg.rotation.x = -0.9; h.add(sg);
    }
    if (o === 'scrubs') {
      const capM = mesh(new THREE.SphereGeometry(HR * 1.08, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.33), '#b8a1e3'); capM.position.y = HC; capM.rotation.x = -0.25; h.add(capM);
    }
    if (o === 'grandpa') {
      const bow = mesh(new THREE.TorusGeometry(0.03, 0.012, 6, 12), '#e63946'); bow.position.set(0, 0.6, 0.12); bow.scale.x = 1.6; this.j.spine.add(bow);
    }
  }

  // ----- poses -----
  setPose(name, instant = false) {
    const p = { ...BASE, ...(POSES[name] || {}) };
    for (const k of JOINTS) { this.target[k] = p[k].slice(); if (instant) this.cur[k] = p[k].slice(); }
    this.poseName = name;
    if (instant) this.applyJoints(0);
  }
  snap() { for (const k of JOINTS) this.cur[k] = this.target[k].slice(); this.applyJoints(0); this.root.updateMatrixWorld(true); }
  applyJoints(t) {
    for (const k of JOINTS) {
      const c = this.cur[k], o = this.off[k];
      this.j[k].rotation.set(c[0] + o[0], c[1] + o[1], c[2] + o[2]);
    }
  }
  expr(name) { this.face.set(name); }
  talk(sec) { this.face.talk(sec); }

  update(dt, t) {
    const k = 1 - Math.exp(-dt * this.poseSpeed);
    for (const jn of JOINTS) { const c = this.cur[jn], tg = this.target[jn]; for (let i = 0; i < 3; i++) c[i] += (tg[i] - c[i]) * k; }
    this.applyJoints(t);
    // walking (blended in and out so legs never snap)
    this.walkAmt += (this.walkTarget - this.walkAmt) * Math.min(1, dt * 8);
    if (this.walkAmt > 0.01) {
      this.walkPhase += dt * 9 * this.walkSpeed;
      const s = Math.sin(this.walkPhase);
      const w = this.walkAmt;
      const amp = (this.running ? 0.9 : 0.55) * w;
      this.j.hipL.rotation.x += s * amp; this.j.hipR.rotation.x -= s * amp;
      this.j.knL.rotation.x += Math.max(0, -s) * amp * 1.2; this.j.knR.rotation.x += Math.max(0, s) * amp * 1.2;
      this.j.shL.rotation.x -= s * amp * 0.9; this.j.shR.rotation.x += s * amp * 0.9;
      if (this.running) { this.j.elL.rotation.x -= 1.2 * w; this.j.elR.rotation.x -= 1.2 * w; this.j.shL.rotation.z += 0.4 * w; this.j.shR.rotation.z -= 0.4 * w; }
      this.body.position.y = Math.abs(Math.cos(this.walkPhase)) * 0.03 * w;
    } else this.body.position.y = 0;
    // breathing / idle
    this.breath += dt;
    this.j.spine.scale.y = 1 + Math.sin(this.breath * 2.2) * 0.012;
    this.j.head.rotation.y += this.lookYaw;
    this.j.head.rotation.x += this.lookPitch;
    if (this.face.talking > 0) this.j.head.rotation.x += Math.sin(t * 18) * 0.03;
    if (this.wiggle > 0) { this.wiggle -= dt; this.body.rotation.z = Math.sin(t * 30) * 0.08 * Math.min(1, this.wiggle * 2); this.body.rotation.y = Math.sin(t * 22) * 0.06 * Math.min(1, this.wiggle * 2); } else { this.body.rotation.z = 0; this.body.rotation.y = 0; }
    if (this.shiver > 0) { this.shiver -= dt; this.body.position.x = Math.sin(t * 60) * 0.006; } else this.body.position.x = 0;
    this.face.update(dt, t);
  }

  // ----- placement -----
  get standY() { return 0.855 * this.s; }
  get sitY() { return TABLE_TOP + 0.08 * this.s; }
  get lieY() { return TABLE_TOP + 0.13 * this.s; }
  placeStanding(x, z, ry = 0) { this.root.position.set(x, this.standY, z); this.root.rotation.set(0, ry, 0, 'YXZ'); }
  placeSitting() { this.root.position.set(0, this.sitY, 0.24); this.root.rotation.set(0, 0, 0, 'YXZ'); this.setPose('sit', true); }

  headTop() { const v = new THREE.Vector3(); this.j.head.getWorldPosition(v); v.y += (0.36 * this.hs) * this.s; return v; }
  headCenter() { const v = new THREE.Vector3(0, 0.15, 0); this.j.head.localToWorld(v); return v; }
  wp(obj, x = 0, y = 0, z = 0) { this.root.updateMatrixWorld(true); return obj.localToWorld(new THREE.Vector3(x, y, z)); }

  // Walk along a list of {x, z} points, turning smoothly and never snapping.
  walkPath(E, pts, speed = 1.4, run = false) {
    const list = pts.filter(Boolean);
    if (!list.length) return Promise.resolve();
    this.running = run; this.walkSpeed = run ? 1.6 : 1; this.walkTarget = 1;
    this.setPose(run ? 'run' : 'stand');
    let i = 0;
    return new Promise(res => {
      const off = E.onUpdate(dt => {
        const tg = list[i];
        const p = this.root.position;
        const dx = tg.x - p.x, dz = tg.z - p.z, d = Math.hypot(dx, dz);
        const step = speed * dt;
        if (d > 0.001) {
          const want = Math.atan2(dx, dz);
          let dy = want - this.root.rotation.y;
          while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
          this.root.rotation.y += dy * Math.min(1, dt * 12);
        }
        if (step >= d) {
          p.x = tg.x; p.z = tg.z; i++;
          if (i >= list.length) { off(); this.walkTarget = 0; this.running = false; res(); }
        } else { p.x += dx / d * step; p.z += dz / d * step; }
      });
    });
  }
  walkTo(E, x, z, speed = 1.4, run = false) { return this.walkPath(E, [{ x, z }], speed, run); }
  async faceTo(E, ry, dur = 0.3) { const r0 = this.root.rotation.y; let d = ry - r0; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; if (Math.abs(d) < 0.01) return; await E.tween(dur, k => { this.root.rotation.y = r0 + d * k; }); }
  // From standing in front of the table (facing the camera), hop backwards onto it.
  async hopOnTable(E, x = 0) {
    await this.faceTo(E, 0, 0.3);
    const p0 = this.root.position.clone();
    this.setPose('sit');
    const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    await E.tween(0.6, (e, k) => {
      const back = sm(0.25, 1, k);
      this.root.position.x = p0.x + (x - p0.x) * back;
      this.root.position.z = p0.z + (0.24 - p0.z) * back;
      this.root.position.y = p0.y + (this.sitY - p0.y) * sm(0, 1, k) + Math.sin(k * Math.PI) * 0.2;
    }, t => t);
    this.root.position.set(x, this.sitY, 0.24);
    this.root.rotation.set(0, 0, 0, 'YXZ');
  }
  // From sitting on the table, hop forward onto the floor in front of it.
  async hopOff(E, x = 0, z = 1.0) {
    const p0 = this.root.position.clone();
    this.setPose('stand');
    const sm = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    await E.tween(0.55, (e, k) => {
      const fwd = sm(0, 0.6, k);
      this.root.position.x = p0.x + (x - p0.x) * fwd;
      this.root.position.z = p0.z + (z - p0.z) * fwd;
      this.root.position.y = p0.y + (this.standY - p0.y) * sm(0.2, 1, k) + Math.sin(k * Math.PI) * 0.15;
    }, t => t);
  }
  // Lie back on the table: tilt back with knees up, swing around, then straighten the legs.
  async lieDown(E) {
    const p0 = this.root.position.clone();
    this.root.rotation.order = 'YXZ';
    this.setPose('sit');
    const sm = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    await E.tween(1.0, (e, k) => {
      const tilt = sm(0, 0.45, k), turn = sm(0.4, 0.9, k);
      this.root.rotation.set(-Math.PI / 2 * tilt, Math.PI / 2 * turn, 0, 'YXZ');
      this.root.position.set(p0.x + (0.25 - p0.x) * turn, p0.y + (this.lieY - p0.y) * tilt + Math.sin(tilt * Math.PI) * 0.06, p0.z + (0.1 - p0.z) * tilt + (0 - 0.1) * turn);
    }, t => t);
    this.root.position.set(0.25, this.lieY, 0);
    this.root.rotation.set(-Math.PI / 2, Math.PI / 2, 0, 'YXZ');
    this.setPose('lie');
    await E.wait(0.35);
    this.lying = true;
  }
  // Reverse of lieDown: knees up, swing back around, sit up.
  async sitUp(E) {
    this.root.rotation.order = 'YXZ';
    this.setPose('sit');
    await E.wait(0.3);
    const p0 = this.root.position.clone();
    const sm = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    await E.tween(0.9, (e, k) => {
      const turn = sm(0, 0.5, k), tilt = sm(0.45, 1, k);
      this.root.rotation.set(-Math.PI / 2 * (1 - tilt), Math.PI / 2 * (1 - turn), 0, 'YXZ');
      this.root.position.set(p0.x + (0 - p0.x) * turn, p0.y + (this.sitY - p0.y) * tilt + Math.sin(tilt * Math.PI) * 0.06, p0.z + (0.1 - p0.z) * turn + (0.24 - 0.1) * tilt);
    }, t => t);
    this.root.position.set(0, this.sitY, 0.24);
    this.root.rotation.set(0, 0, 0, 'YXZ');
    this.lying = false;
  }
  // useful world points
  armInfo(side = 'R') {
    this.root.updateMatrixWorld(true);
    const sh = this.j['sh' + side], el = this.j['el' + side];
    return {
      shoulder: sh.localToWorld(V(0, 0, 0)),
      deltoid: sh.localToWorld(V(0, -0.09, 0.058)),
      elbow: el.localToWorld(V(0, 0, 0)),
      inner: el.localToWorld(V(0, -0.02, 0.05)),
      forearmMid: el.localToWorld(V(0, -0.12, 0)),
      wrist: el.localToWorld(V(0, -0.22, 0)),
      hand: el.localToWorld(V(0, -0.26, 0)),
      r: 0.055 * this.s,
    };
  }
  chestFront() { this.root.updateMatrixWorld(true); return this.j.spine.localToWorld(V(0, 0.36, 0.13)); }
  bellyFront() { this.root.updateMatrixWorld(true); return this.j.spine.localToWorld(V(0, 0.18, 0.13)); }
}

// ---------------- BABY ----------------
export class Baby {
  constructor(spec) {
    this.spec = spec;
    const skin = spec.skin || '#f1c27d';
    const onesie = spec.shirt || '#ffd6e0';
    this.s = 1; this.hs = 1;
    this.root = new THREE.Group();
    this.body = new THREE.Group(); this.root.add(this.body);
    const j = this.j = {};
    const torso = capsule(0.105, 0.09, onesie); torso.position.y = 0.1; torso.scale.z = 0.9; this.body.add(torso);
    j.head = new THREE.Group(); j.head.position.y = 0.22; this.body.add(j.head);
    const HR = 0.125, HC = 0.11;
    const head = sphere(HR, skin, 24); head.position.y = HC; j.head.add(head);
    for (const sx of [1, -1]) { const ear = sphere(0.025, skin, 10); ear.position.set(sx * 0.122, HC, 0); ear.scale.set(0.6, 1, 0.9); j.head.add(ear); }
    this.face = new Face(j.head, HR, HC - 0.012, { skin, eyeScale: 1.25, cheeks: true, browColor: '#c9a27e' });
    if (spec.hair?.style === 'bonnet') {
      const b = mesh(new THREE.SphereGeometry(HR * 1.1, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), spec.hair.color || '#ffffff'); b.position.y = HC; b.rotation.x = -0.6; j.head.add(b);
      const rim = mesh(new THREE.TorusGeometry(HR * 0.98, 0.014, 6, 26), '#ff9aa2'); rim.position.set(0, HC + 0.035, 0.035); rim.rotation.x = -0.95; j.head.add(rim);
    } else {
      const curl = mesh(new THREE.TorusGeometry(0.025, 0.009, 6, 12, Math.PI * 1.5), spec.hair?.color || '#6d4c2f'); curl.position.set(0, HC + HR + 0.012, 0.03); j.head.add(curl);
    }
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? 1 : -1;
      const sh = j['sh' + side] = new THREE.Group(); sh.position.set(sx * 0.105, 0.17, 0); this.body.add(sh);
      const arm = capsule(0.038, 0.07, onesie); arm.position.y = -0.055; sh.add(arm);
      const hand = sphere(0.038, skin, 10); hand.position.y = -0.12; sh.add(hand);
      sh.rotation.z = sx * 0.5;
      const hip = j['hip' + side] = new THREE.Group(); hip.position.set(sx * 0.06, 0.02, 0.02); this.body.add(hip);
      const leg = capsule(0.048, 0.09, onesie); leg.rotation.x = Math.PI / 2; leg.position.z = 0.07; hip.add(leg);
      const foot = sphere(0.045, onesie, 10); foot.scale.set(1, 1.1, 0.8); foot.position.set(0, 0.01, 0.16); hip.add(foot);
    }
    const pac = new THREE.Group();
    pac.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.01, 16).rotateX(Math.PI / 2), '#7fdbff'));
    const ring = mesh(new THREE.TorusGeometry(0.018, 0.006, 6, 12), '#7fdbff'); ring.position.z = 0.012; pac.add(ring);
    pac.position.set(0, HC - 0.06, HR - 0.005); pac.visible = false; j.head.add(pac);
    this.pacifier = pac;
    this.crying = false; this.lookYaw = 0; this.lookTarget = 0; this.wiggle = 0;
    this.root.traverse(o => { if (o.isMesh) o.userData.person = this; });
  }
  placeSitting() { this.root.position.set(0, TABLE_TOP + 0.04, 0.12); this.root.rotation.set(0, 0, 0); }
  expr(name) { this.face.set(name); }
  talk(sec) { this.face.talk(sec); }
  setPose() {}
  snap() {}
  update(dt, t) {
    this.lookYaw += (this.lookTarget - this.lookYaw) * Math.min(1, dt * 10);
    this.j.head.rotation.y = this.lookYaw + (this.crying ? Math.sin(t * 9) * 0.25 : 0);
    this.j.head.rotation.z = this.crying ? Math.sin(t * 7) * 0.08 : Math.sin(t * 1.3) * 0.04;
    const flail = this.crying ? 1 : 0.15;
    this.j.shL.rotation.z = 0.5 + (this.crying ? 1.4 : 0) + Math.sin(t * 11) * 0.4 * flail;
    this.j.shR.rotation.z = -0.5 - (this.crying ? 1.4 : 0) - Math.sin(t * 11 + 1) * 0.4 * flail;
    this.j.hipL.rotation.x = Math.sin(t * 9) * 0.3 * flail;
    this.j.hipR.rotation.x = Math.sin(t * 9 + 2) * 0.3 * flail;
    this.body.scale.y = 1 + Math.sin(t * 2.5) * 0.015;
    if (this.wiggle > 0) { this.wiggle -= dt; this.body.rotation.z = Math.sin(t * 25) * 0.1; } else this.body.rotation.z = 0;
    this.face.update(dt, t);
  }
  headTop() { const v = new THREE.Vector3(); this.j.head.getWorldPosition(v); v.y += 0.32; return v; }
  headCenter() { const v = new THREE.Vector3(0, 0.11, 0); this.j.head.localToWorld(v); return v; }
}
