import * as THREE from 'three';
import { toon, canvasTexture, TABLE_TOP, ease, rand, clamp } from './engine.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// silly modes unlocked with secret codes
export const FLAGS = { bighead: false, party: false, zoomies: false };
function partyHat(head, y, r, seed = 0) {
  const g = new THREE.Group(); g.position.set(0.02, y, -0.01); g.rotation.z = -0.25;
  const c = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, r * 1.5, 16), toon(['#ff5d8f', '#3ec1d3', '#ffd23f', '#9b5de5'][seed % 4])); c.position.y = r * 0.7; g.add(c);
  const p = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 8, 6), toon('#ffffff')); p.position.y = r * 1.48; g.add(p);
  head.add(g);
}

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
  const m = new THREE.MeshStandardMaterial({ map: tex });
  stripeCache.set(key, m);
  return m;
}

function darken(hex, k = 0.75) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return '#' + c.getHexString();
}

// tapered capsule: radius r1 at the top, r2 at the bottom, straight part of length len, centered on the origin
function limbGeo(r1, r2, len, seg = 14) {
  const pts = [], n = 6;
  for (let i = 0; i <= n; i++) { const a = (Math.PI / 2) * (i / n); pts.push(new THREE.Vector2(Math.max(0.0001, r2 * Math.sin(a)), -len / 2 - r2 * Math.cos(a))); }
  for (let i = 0; i <= n; i++) { const a = (Math.PI / 2) * (1 - i / n); pts.push(new THREE.Vector2(Math.max(0.0001, r1 * Math.sin(a)), len / 2 + r1 * Math.cos(a))); }
  return new THREE.LatheGeometry(pts, seg);
}
const limb = (r1, r2, len, color) => mesh(limbGeo(r1, r2, len), color);
const lathe = (prof, color, seg = 22) => mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg), color);

// a head that is a little narrower at the jaw and taller at the crown than a ball
function headGeo(r) {
  const g = new THREE.SphereGeometry(r, 28, 20);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const u = y / r;
    x *= 0.94;
    if (u < 0) { const k = Math.pow(-u, 1.6); x *= 1 - 0.16 * k; if (z < 0) z *= 1 - 0.18 * k; }
    else { y *= 1.03; if (z < 0) z *= 1.04; }
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

const printCache = new Map();
function printMat(kind, color) {
  const key = kind + color;
  if (printCache.has(key)) return printCache.get(key);
  const { tex } = canvasTexture(128, 128, (ctx, W, H) => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = color; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.beginPath();
    if (kind === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 22 : 54; ctx.lineTo(64 + Math.cos(a) * rr, 68 + Math.sin(a) * rr); } ctx.closePath(); }
    else if (kind === 'heart') { ctx.moveTo(64, 104); ctx.bezierCurveTo(10, 66, 22, 18, 64, 42); ctx.bezierCurveTo(106, 18, 118, 66, 64, 104); }
    else if (kind === 'bolt') { [[72, 10], [30, 72], [60, 72], [48, 118], [98, 50], [68, 50], [84, 10]].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
    else if (kind === 'smile') { ctx.arc(64, 64, 50, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.beginPath(); ctx.arc(46, 52, 7, 0, 7); ctx.arc(82, 52, 7, 0, 7); ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.beginPath(); ctx.arc(64, 66, 26, 0.2, Math.PI - 0.2); ctx.stroke(); }
    else if (kind === 'planet') { ctx.arc(64, 64, 34, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.lineWidth = 9; ctx.strokeStyle = color; ctx.beginPath(); ctx.ellipse(64, 64, 58, 16, -0.4, 0, Math.PI * 2); ctx.stroke(); }
    else if (kind === 'paw') { ctx.ellipse(64, 80, 30, 26, 0, 0, 7); ctx.fill(); [[30, 44], [52, 26], [76, 26], [98, 44]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 12, 15, 0, 0, 7); ctx.fill(); }); }
    else if (kind === 'dino') { [[18, 96], [26, 70], [46, 58], [62, 34], [80, 22], [104, 24], [110, 38], [92, 44], [84, 62], [92, 96], [78, 96], [72, 78], [52, 80], [46, 96]].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
    if (kind !== 'smile' && kind !== 'paw') { ctx.fill(); ctx.stroke(); }
  });
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  printCache.set(key, m);
  return m;
}

// ---------------- FACE ----------------
class Face {
  constructor(head, r, cy, o = {}) {
    this.head = head; this.r = r; this.cy = cy;
    const skinC = o.skin || '#f1c27d';
    const er = 0.135 * r * (o.eyeScale || 1);
    this.er = er;
    const ex = 0.33 * r, ey = cy + 0.12 * r;
    const ez = Math.sqrt(r * r - (ex / 0.94) ** 2 - (0.12 * r * 0.97) ** 2) - 0.035 * r;
    this.eyes = []; this.lids = []; this.irises = [];
    const irisC = o.eyeColor || '#5a3a22';
    for (const sx of [1, -1]) {
      const g = new THREE.Group(); g.position.set(sx * ex, ey, ez); g.rotation.y = sx * 0.12;
      const inner = new THREE.Group(); inner.scale.set(1, 1.08, 0.72); g.add(inner);
      const white = sphere(er, '#fbfbf7', 16); white.castShadow = false; inner.add(white);
      const iris = new THREE.Group(); inner.add(iris);
      const ir = sphere(er * 0.62, irisC, 14); ir.scale.set(1, 1, 0.28); ir.position.z = er * 0.9; ir.castShadow = false; iris.add(ir);
      const pu = sphere(er * 0.3, '#14181c', 10); pu.scale.set(1, 1, 0.3); pu.position.z = er * 0.98; pu.castShadow = false; iris.add(pu);
      const hl = sphere(er * 0.14, '#ffffff', 6); hl.position.set(er * 0.22, er * 0.24, er * 1.06); hl.castShadow = false; iris.add(hl);
      // eyelid: a dome of skin that rotates down over the eye to blink
      const lidG = new THREE.Group(); inner.add(lidG);
      const lid = mesh(new THREE.SphereGeometry(er * 1.14, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), skinC); lid.castShadow = false; lidG.add(lid);
      const lash = mesh(new THREE.TorusGeometry(er * 1.14, er * (o.lashes ? 0.16 : 0.09), 5, 18, Math.PI), '#1d2b36'); lash.rotation.x = Math.PI / 2; lash.castShadow = false; lidG.add(lash);
      if (o.lashes) { const fl = boxm(er * 0.5, er * 0.14, er * 0.14, '#1d2b36'); fl.position.set(sx * er * 1.2, 0, er * 0.35); fl.rotation.y = -sx * 0.6; fl.rotation.z = sx * 0.5; fl.castShadow = false; lidG.add(fl); }
      head.add(g); this.eyes.push(g); this.lids.push(lidG); this.irises.push(iris);
    }
    // brows
    this.brows = [];
    for (const sx of [1, -1]) {
      const b = mesh(new THREE.CapsuleGeometry(0.035 * r, 0.26 * r, 4, 8), o.browColor || '#3b2a20'); b.castShadow = false;
      b.rotation.order = 'ZYX'; b.scale.set(1, 1, 0.55);
      b.position.set(sx * 0.34 * r, cy + 0.43 * r, 0.86 * r);
      b.userData.baseY = b.position.y; b.userData.sx = sx;
      head.add(b); this.brows.push(b);
    }
    // nose
    const noseC = darken(skinC, 0.93);
    const nose = new THREE.Group(); nose.position.set(0, cy - 0.06 * r, 0.9 * r); head.add(nose);
    const kind = o.nose || 'regular';
    const nl = kind === 'long' ? 1.25 : kind === 'button' ? 0.7 : 1;
    const nw = kind === 'wide' ? 1.3 : 1;
    const bridge = mesh(new THREE.CapsuleGeometry(0.05 * r, 0.2 * r * nl, 4, 8), noseC); bridge.rotation.x = -0.32; bridge.position.set(0, 0.05 * r, 0.03 * r); bridge.castShadow = false; nose.add(bridge);
    const tip = sphere(0.085 * r * (kind === 'button' ? 1.1 : 1), noseC, 12); tip.position.set(0, -0.07 * r * nl, 0.1 * r * nl); tip.castShadow = false; nose.add(tip);
    for (const sx of [1, -1]) { const w = sphere(0.058 * r * nw, noseC, 10); w.position.set(sx * 0.075 * r * nw, -0.1 * r * nl, 0.05 * r); w.castShadow = false; nose.add(w); }
    if (kind === 'button') bridge.visible = false;
    this.nose = nose;
    // mouth
    const mg = new THREE.Group(); mg.position.set(0, cy - 0.42 * r, 0.86 * r); head.add(mg);
    this.mouthGroup = mg;
    const dark = '#5a1e2a', lip = darken(skinC, 0.72);
    const smile = mesh(new THREE.TorusGeometry(0.21 * r, 0.04 * r, 6, 16, Math.PI), lip); smile.rotation.z = Math.PI; smile.position.y = 0.1 * r;
    const frown = mesh(new THREE.TorusGeometry(0.19 * r, 0.04 * r, 6, 16, Math.PI), lip); frown.position.y = -0.12 * r;
    const open = sphere(0.17 * r, dark, 14); open.scale.set(1.2, 0.95, 0.45);
    const tongue = sphere(0.1 * r, '#ff7b8a', 10); tongue.scale.set(1.2, 0.6, 0.4); tongue.position.set(0, -0.08 * r, 0.04 * r); open.add(tongue);
    const topTeeth = boxm(0.22 * r, 0.04 * r, 0.02 * r, '#ffffff'); topTeeth.position.set(0, 0.11 * r, 0.06 * r); open.add(topTeeth);
    const o2 = mesh(new THREE.TorusGeometry(0.085 * r, 0.04 * r, 6, 14), dark);
    const flat = mesh(new THREE.CapsuleGeometry(0.025 * r, 0.24 * r, 4, 8), lip); flat.rotation.z = Math.PI / 2;
    const laugh = new THREE.Group();
    const ld = mesh(new THREE.CircleGeometry(0.24 * r, 18, Math.PI, Math.PI), dark); ld.position.z = 0.03 * r; laugh.add(ld);
    const teeth = boxm(0.36 * r, 0.06 * r, 0.02 * r, '#ffffff'); teeth.position.set(0, -0.03 * r, 0.04 * r); laugh.add(teeth);
    laugh.position.y = 0.06 * r;
    this.mouths = { smile, frown, open, o: o2, flat, laugh };
    for (const m of Object.values(this.mouths)) { m.visible = false; m.traverse(c => { c.castShadow = false; }); mg.add(m); }
    if (o.fangs) {
      for (const sx of [1, -1]) { const f = mesh(new THREE.ConeGeometry(0.035 * r, 0.12 * r, 6), '#ffffff'); f.rotation.z = Math.PI; f.position.set(sx * 0.1 * r, 0.05 * r, 0.04 * r); f.castShadow = false; mg.add(f); }
    }
    this.cheeks = [];
    for (const sx of [1, -1]) {
      const c = sphere(0.12 * r, '#ff9aa2', 10); c.scale.set(1, 0.7, 0.3); c.position.set(sx * 0.5 * r, cy - 0.16 * r, 0.8 * r); c.castShadow = false;
      c.material = c.material.clone(); c.material.transparent = true; c.material.opacity = 0.75;
      c.visible = !!o.cheeks; head.add(c); this.cheeks.push(c);
    }
    if (o.freckles) {
      for (let i = 0; i < 10; i++) {
        const sx = i % 2 ? 1 : -1; const f = sphere(0.018 * r, darken(skinC, 0.7), 5); f.castShadow = false;
        const fx = sx * (0.18 + ((i * 37) % 10) / 10 * 0.28) * r, fy = cy + (-0.22 + ((i * 53) % 10) / 10 * 0.17) * r;
        f.position.set(fx, fy, Math.sqrt(Math.max(0, r * r - (fx / 0.94) ** 2 - (fy - cy) ** 2)) * 0.995); head.add(f);
      }
    }
    if (o.wrinkles) {
      for (let i = 0; i < 2; i++) { const w = mesh(new THREE.TorusGeometry(0.42 * r, 0.012 * r, 4, 14, Math.PI * 0.42), darken(skinC, 0.78)); w.rotation.z = Math.PI * 0.29; w.position.set(0, cy + (0.28 + i * 0.12) * r, 0.62 * r); w.rotation.x = -0.55 - i * 0.12; w.castShadow = false; head.add(w); }
    }
    this.alwaysCheeks = !!o.cheeks;
    this.eyeOpen = 1; this.eyeTarget = 1; this.blinkT = rand(1, 4); this.blinking = 0;
    this.lookT = rand(0.5, 2); this.look = new THREE.Vector2(); this.lookGoal = new THREE.Vector2();
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
      happy: { eye: 0.92, brow: 0, by: 0.06, mouth: 'smile', cheeks: true },
      scared: { eye: 1.3, brow: -0.35, by: 0.08, mouth: 'o' },
      surprised: { eye: 1.3, brow: 0, by: 0.1, mouth: 'o' },
      ouch: { eye: 0.12, brow: -0.35, by: 0.02, mouth: 'open' },
      angry: { eye: 0.8, brow: 0.42, by: -0.03, mouth: 'frown' },
      sad: { eye: 0.85, brow: -0.35, by: 0.03, mouth: 'frown' },
      sleep: { eye: 0.05, brow: 0, by: -0.02, mouth: 'o' },
      laugh: { eye: 0.15, brow: 0, by: 0.06, mouth: 'laugh', cheeks: true },
      cry: { eye: 0.12, brow: -0.4, by: 0.04, mouth: 'open', tears: true },
      yell: { eye: 1.15, brow: 0.42, by: -0.02, mouth: 'open' },
      smug: { eye: 0.66, brow: 0.15, by: 0.03, mouth: 'smile' },
    }[expr] || { eye: 1, brow: 0, by: 0, mouth: 'smile' };
    this.cfg = E;
    this.eyeTarget = E.eye;
    this.brows.forEach(b => { const sx = b.userData.sx; b.rotation.set(0, 0, Math.PI / 2 - sx * E.brow); b.position.y = b.userData.baseY + E.by * this.r; });
    this.showMouth(E.mouth);
    this.cheeks.forEach(c => { c.visible = this.alwaysCheeks || !!E.cheeks; });
  }
  update(dt, t) {
    this.blinkT -= dt;
    let k = this.eyeTarget;
    if (this.blinkT < 0) { this.blinking = 0.12; this.blinkT = rand(1.8, 5); }
    if (this.blinking > 0) { this.blinking -= dt; if (this.eyeTarget > 0.5) k = 0.04; }
    this.eyeOpen += (k - this.eyeOpen) * Math.min(1, dt * 28);
    const lidA = -0.72 + (1 - this.eyeOpen) * 2.5;
    for (const l of this.lids) l.rotation.x = Math.min(1.85, lidA);
    const wide = this.eyeTarget > 1.1 ? 1.12 : 1;
    for (const e of this.eyes) e.scale.setScalar(wide);
    // eyes wander a little, and look back at you when talking
    this.lookT -= dt;
    if (this.lookT < 0) {
      this.lookT = rand(0.7, 2.8);
      if (Math.random() < 0.4 || this.talking > 0) this.lookGoal.set(0, 0);
      else this.lookGoal.set(rand(-1, 1), rand(-0.6, 0.6));
    }
    this.look.lerp(this.lookGoal, Math.min(1, dt * 18));
    for (const ir of this.irises) ir.position.set(this.look.x * this.er * 0.24, this.look.y * this.er * 0.16, 0);
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
  talk(sec) { this.talking = sec; this.lookGoal.set(0, 0); }
}

// ---------------- POSES ----------------
const JOINTS = ['spine', 'neck', 'head', 'shL', 'shR', 'elL', 'elR', 'hipL', 'hipR', 'knL', 'knR'];
const BASE = { spine: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], shL: [0, 0, 0.07], shR: [0, 0, -0.07], elL: [0, 0, 0], elR: [0, 0, 0], hipL: [0, 0, 0], hipR: [0, 0, 0], knL: [0, 0, 0], knR: [0, 0, 0] };
// sitting: hands resting on the thighs instead of hanging off the table
const SIT = { hipL: [-1.52, 0, 0.07], hipR: [-1.52, 0, -0.07], knL: [1.48, 0, 0], knR: [1.48, 0, 0], shL: [-0.24, 0, 0.09], shR: [-0.24, 0, -0.09], elL: [-0.62, 0, -0.34], elR: [-0.62, 0, 0.34] };
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
    this.hs = ({ kid: 1.12, teen: 0.95, adult: 0.9, elder: 0.9 }[age] || 0.9) * (FLAGS.bighead ? 1.55 : 1);
    const skin = spec.skin || '#f1c27d';
    const shirt = spec.shirt || '#4ea8de';
    const pants = spec.pants || '#3d5a80';
    const shoes = spec.shoes || '#1d2b36';
    const hairC = spec.hair?.color || '#3b2a20';
    const shirtMat = spec.stripes ? stripeMat(spec.stripes[0], spec.stripes[1]) : toon(shirt);

    this.root = new THREE.Group();
    this.body = new THREE.Group(); this.body.scale.setScalar(this.s); this.root.add(this.body);
    const j = this.j = {};
    const fem = spec.gender === 'f';
    const build = spec.build || 'avg';
    const wide = { slim: 0.92, avg: 1, stocky: 1.1, round: 1.08 }[build] || 1;
    const style = spec.shirtStyle || 'tee';
    const longSleeves = spec.sleeves === 'long' || style === 'hoodie' || style === 'sweater';
    const shirtDark = darken(spec.stripes ? spec.stripes[0] : shirt, 0.82);
    // hips and pants
    const pelvis = lathe([[0.0, -0.09], [0.11, -0.085], [0.155, -0.03], [0.165, 0.03], [0.158, 0.1], [0.0, 0.1]], pants);
    pelvis.scale.set(1.05 * wide * (fem ? 1.04 : 1), 1, 0.7); this.body.add(pelvis);
    j.spine = new THREE.Group(); j.spine.position.y = 0.06; this.body.add(j.spine);
    // torso: shaped chest, waist and shoulders. The front stays about 0.13 deep where the stethoscope and surgery need it.
    const belly = build === 'round' ? 0.184 : 0.16;
    const chestR = fem ? 0.17 : 0.178;
    const torso = lathe([[0.0, -0.05], [0.15, -0.045], [0.163, 0.02], [belly, 0.14], [0.17, 0.26], [chestR, 0.38], [chestR * 1.01, 0.46], [0.162, 0.53], [0.11, 0.585], [0.06, 0.6], [0.0, 0.6]], shirtMat, 26);
    torso.scale.set(1.05 * wide * (fem ? 0.96 : 1), 1, 0.72); j.spine.add(torso);
    this.torso = torso;
    this.buildTop(style, shirt, shirtDark, skin, wide, fem, spec);
    j.neck = new THREE.Group(); j.neck.position.y = 0.585; j.spine.add(j.neck);
    const neck = mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.13, 12), skin); neck.position.y = 0.04; j.neck.add(neck);
    j.head = new THREE.Group(); j.head.position.y = 0.04; j.head.scale.setScalar(this.hs); j.neck.add(j.head);
    const HR = 0.16, HC = 0.15;
    const head = mesh(headGeo(HR), skin); head.position.y = HC; j.head.add(head);
    this.headMesh = head;
    for (const sx of [1, -1]) {
      const ear = sphere(0.034, skin, 12); ear.position.set(sx * 0.148, HC - 0.012, -0.012); ear.scale.set(0.42, 1, 0.8); j.head.add(ear);
      const inn = sphere(0.02, darken(skin, 0.82), 8); inn.position.set(sx * 0.158, HC - 0.012, -0.004); inn.scale.set(0.3, 0.9, 0.7); inn.castShadow = false; j.head.add(inn);
    }
    this.face = new Face(j.head, HR, HC, { skin, lashes: fem, browColor: darken(hairC, 0.8), cheeks: age === 'kid', fangs: spec.outfit === 'vampire', eyeColor: spec.eyes, nose: spec.nose, freckles: spec.freckles, wrinkles: age === 'elder' });
    this.buildHair(spec, HR, HC, hairC);
    if (FLAGS.party) partyHat(j.head, HC + HR * 0.85, HR, (shirt.charCodeAt(1) || 0) + (shirt.charCodeAt(3) || 0));

    // arms
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? 1 : -1;
      const sh = j['sh' + side] = new THREE.Group(); sh.position.set(sx * 0.215 * wide, 0.52, 0); j.spine.add(sh);
      const cap = sphere(0.056, shirtMat, 14); cap.position.y = -0.03; cap.scale.set(0.95, 0.8, 0.92); sh.add(cap);
      const ua = limb(0.054, 0.047, 0.19, longSleeves ? shirtMat : toon(skin)); ua.position.y = -0.13; sh.add(ua);
      if (!longSleeves) {
        const slv = mesh(new THREE.CylinderGeometry(0.059, 0.058, 0.1, 16, 1, true), shirtMat); slv.position.y = -0.03; sh.add(slv);
        const hem = mesh(new THREE.TorusGeometry(0.058, 0.007, 5, 18), shirtDark); hem.rotation.x = Math.PI / 2; hem.position.y = -0.08; hem.castShadow = false; sh.add(hem);
      }
      const el = j['el' + side] = new THREE.Group(); el.position.y = -0.27; sh.add(el);
      const elb = sphere(0.046, longSleeves ? shirtMat : toon(skin), 12); el.add(elb);
      const fa = limb(0.046, 0.037, 0.17, longSleeves ? shirtMat : toon(skin)); fa.position.y = -0.12; el.add(fa);
      if (longSleeves) { const cuff = mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.035, 14), shirtDark); cuff.position.y = -0.205; el.add(cuff); }
      const hand = this.buildHand(skin, sx); hand.position.y = -0.255; el.add(hand);
      this['elbow' + side] = elb; this['cuff' + side] = longSleeves ? el.children[el.children.length - 2] : null;
      this['upperArm' + side] = ua; this['forearm' + side] = fa; this['hand' + side] = hand;
      // legs
      const hip = j['hip' + side] = new THREE.Group(); hip.position.set(sx * 0.095 * wide, -0.02, 0); this.body.add(hip);
      const th = limb(0.08 * Math.sqrt(wide), 0.066, 0.27, pants); th.position.y = -0.19; hip.add(th);
      const kn = j['kn' + side] = new THREE.Group(); kn.position.y = -0.4; hip.add(kn);
      const shinMat = spec.shorts ? toon(skin) : toon(pants);
      const kc = sphere(0.05, shinMat, 12); kc.position.set(0, -0.005, 0.02); kn.add(kc);
      const sn = limb(0.064, 0.047, 0.27, shinMat); sn.position.y = -0.19; kn.add(sn);
      if (spec.shorts) {
        const leg = mesh(new THREE.CylinderGeometry(0.085, 0.082, 0.1, 16, 1, true), pants); leg.position.y = -0.36; hip.add(leg);
        const sock = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.07, 12), spec.socks || '#ffffff'); sock.position.y = -0.35; kn.add(sock);
      } else {
        const hemL = mesh(new THREE.CylinderGeometry(0.056, 0.058, 0.03, 12), darken(pants, 0.85)); hemL.position.y = -0.355; kn.add(hemL);
      }
      const foot = this.buildShoe(shoes, spec.shoeStyle, sx); foot.position.set(0, -0.4, 0.045); kn.add(foot);
      this['thigh' + side] = th; this['shin' + side] = sn;
    }
    this.longSleeves = longSleeves; this.skinC = skin; this.shirtDarkC = shirtDark; this.shirtMatRef = shirtMat;
    if (spec.belt) {
      const belt = mesh(new THREE.CylinderGeometry(0.166, 0.166, 0.03, 26, 1, true), '#4a3424'); belt.position.y = 0.075; belt.scale.set(1.05 * wide, 1, 0.73); this.body.add(belt);
      const buckle = boxm(0.04, 0.032, 0.012, '#d9b44a'); buckle.position.set(0, 0.075, 0.123); this.body.add(buckle);
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
    this.breath = rand(0, 6); this.breath0 = this.breath;
    if (age === 'elder') this.posture = { spine: [0.09, 0, 0], neck: [0.1, 0, 0], head: [-0.12, 0, 0] };
    this.root.traverse(o => { if (o.isMesh) o.userData.person = this; });
    this.setPose('stand', true);
    this.placeStanding(0, 0, 0);
  }

  // Roll a long sleeve up before a shot (upper arm) or a blood draw or cast (forearm).
  rollUp(side = 'R', part = 'upper') {
    if (!this.longSleeves || this.outfitLocked) return;
    this.rolled = this.rolled || {};
    const key = side + part;
    if (this.rolled[key]) return;
    this.rolled[key] = true;
    const skinM = toon(this.skinC);
    const sh = this.j['sh' + side];
    if (part === 'upper') {
      this['upperArm' + side].material = skinM;
      this['forearm' + side].material = skinM; this['elbow' + side].material = skinM;
      if (this['cuff' + side]) this['cuff' + side].visible = false;
      const roll = mesh(new THREE.TorusGeometry(0.056, 0.016, 6, 18), this.shirtMatRef); roll.rotation.x = Math.PI / 2; roll.position.y = -0.05; sh.add(roll);
    } else {
      this['forearm' + side].material = skinM; this['elbow' + side].material = skinM;
      if (this['cuff' + side]) this['cuff' + side].visible = false;
      const roll = mesh(new THREE.TorusGeometry(0.05, 0.016, 6, 18), this.shirtMatRef); roll.rotation.x = Math.PI / 2; roll.position.y = -0.2; sh.add(roll);
    }
  }

  buildHand(skin, sx) {
    const g = new THREE.Group();
    const palm = sphere(0.042, skin, 12); palm.scale.set(0.55, 1.05, 1); g.add(palm);
    for (let i = 0; i < 4; i++) {
      const f = mesh(new THREE.CapsuleGeometry(0.0105, 0.034 - Math.abs(i - 1.5) * 0.006, 3, 6), skin);
      f.position.set(0, -0.055 + Math.abs(i - 1.5) * 0.004, -0.024 + i * 0.016); f.rotation.x = 0.12 - i * 0.05; f.castShadow = false; g.add(f);
    }
    const th = mesh(new THREE.CapsuleGeometry(0.012, 0.03, 3, 6), skin); th.position.set(-sx * 0.012, -0.012, 0.04); th.rotation.set(0.9, 0, -sx * 0.3); th.castShadow = false; g.add(th);
    return g;
  }

  buildShoe(color, style = 'sneaker', sx) {
    const g = new THREE.Group();
    const up = mesh(new THREE.CapsuleGeometry(0.047, 0.11, 6, 12), color); up.rotation.x = Math.PI / 2; up.scale.set(1.08, 1, 0.78); up.position.set(0, 0.002, 0.012); g.add(up);
    const soleC = style === 'boot' ? darken(color, 0.6) : style === 'flat' ? darken(color, 0.75) : '#f4f4f0';
    const sole = mesh(new THREE.CapsuleGeometry(0.05, 0.12, 4, 10), soleC); sole.rotation.x = Math.PI / 2; sole.scale.set(1.12, 1, 0.3); sole.position.set(0, -0.03, 0.012); g.add(sole);
    if (style === 'boot') { const shaft = mesh(new THREE.CylinderGeometry(0.056, 0.058, 0.1, 14), color); shaft.position.set(0, 0.05, -0.04); g.add(shaft); }
    if (style === 'sneaker') { const stripe = boxm(0.004, 0.02, 0.07, '#ffffff'); stripe.position.set(-sx * 0.05, 0.0, 0.01); stripe.rotation.y = -sx * 0.06; stripe.castShadow = false; g.add(stripe); const lace = boxm(0.05, 0.006, 0.05, '#ffffff'); lace.position.set(0, 0.036, 0.05); lace.castShadow = false; g.add(lace); }
    return g;
  }

  // collars, hoods, buttons and prints on top of the torso
  buildTop(style, shirt, dark, skin, wide, fem, spec) {
    const sp = this.j.spine;
    const add = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = false; sp.add(m); return m; };
    if (style === 'tee' || style === 'sweater' || style === 'hoodie') {
      const col = mesh(new THREE.TorusGeometry(0.068, style === 'sweater' ? 0.016 : 0.011, 6, 22), dark); col.rotation.x = Math.PI / 2 - 0.12; col.scale.set(1, 0.85, 1); add(col, 0, 0.585, 0.008);
    }
    if (style === 'polo' || style === 'button') {
      for (const sx of [1, -1]) { const flap = boxm(0.07, 0.012, 0.05, shirt === '#ffffff' ? '#eeeeee' : darken(shirt, 0.92)); flap.rotation.set(-0.5, sx * 0.5, sx * 0.4); add(flap, sx * 0.04, 0.585, 0.05); }
      const n = style === 'button' ? 5 : 2;
      for (let i = 0; i < n; i++) { const b = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 8), '#f2f2f2'); b.rotation.x = Math.PI / 2; const y = 0.53 - i * 0.1; add(b, 0, y, 0.124 - Math.max(0, 0.04 - (0.53 - y) * 0.2) * 0.2); }
      if (style === 'button') { const placket = boxm(0.022, 0.46, 0.004, darken(shirt, 0.9)); add(placket, 0, 0.32, 0.12); }
    }
    if (style === 'hoodie') {
      const hood = sphere(0.13, shirt, 16); hood.scale.set(1.15, 0.6, 0.7); hood.castShadow = true; add(hood, 0, 0.56, -0.1);
      for (const sx of [1, -1]) { const st = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.09, 6), '#f4f4f4'); add(st, sx * 0.03, 0.5, 0.128); }
      const pocket = boxm(0.17, 0.08, 0.012, dark); pocket.scale.set(wide, 1, 1); add(pocket, 0, 0.13, 0.116);
    }
    if (spec.print) {
      const pr = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), printMat(spec.print, spec.printColor || '#ffffff'));
      add(pr, 0, 0.37, 0.131);
    }
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
    const post = this.posture && this.poseName !== 'lie' && !this.lying ? this.posture : null;
    for (const k of JOINTS) {
      const c = this.cur[k], o = this.off[k], p = post && post[k];
      this.j[k].rotation.set(c[0] + o[0] + (p ? p[0] : 0), c[1] + o[1] + (p ? p[1] : 0), c[2] + o[2] + (p ? p[2] : 0));
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
    if (this.idle !== false && this.walkAmt < 0.05 && !this.lying) {
      // tiny idle head drift so nobody sits like a statue
      this.j.head.rotation.y += Math.sin(t * 0.53 + this.breath0) * 0.035 + Math.sin(t * 1.31 + this.breath0 * 2) * 0.012;
      this.j.head.rotation.z += Math.sin(t * 0.41 + this.breath0) * 0.02;
    }
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
    if (FLAGS.zoomies) speed *= 2.6;
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
    if (FLAGS.party) partyHat(j.head, HC + HR * 0.85, HR);
    if (FLAGS.bighead) j.head.scale.setScalar(1.4);
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
