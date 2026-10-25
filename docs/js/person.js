import * as THREE from 'three';
import { toon, canvasTexture, TABLE_TOP, ease, rand, clamp } from './engine.js';
import { Face, headGeometry, headPoint, skinTexture, hairShell } from './face.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// silly modes unlocked with secret codes
export const FLAGS = { bighead: false, party: false, zoomies: false, cats: false };
function catEars(head, y, r, color) {
  for (const sx of [1, -1]) {
    const e = new THREE.Mesh(new THREE.ConeGeometry(r * 0.32, r * 0.55, 4), toon(color)); e.position.set(sx * r * 0.5, y, -r * 0.05); e.rotation.set(0, Math.PI / 4, -sx * 0.35); head.add(e);
    const inn = new THREE.Mesh(new THREE.ConeGeometry(r * 0.18, r * 0.36, 4), toon('#ff9aa2')); inn.position.set(sx * r * 0.49, y - r * 0.04, r * 0.03); inn.rotation.set(0, Math.PI / 4, -sx * 0.35); head.add(inn);
  }
}
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

// ---------------- materials that look like real stuff ----------------
const fabricCache = new Map();
function fabricMat(color, kind = 'cotton') {
  const key = color + kind;
  if (fabricCache.has(key)) return fabricCache.get(key);
  const { tex } = canvasTexture(128, 128, (ctx, W, H) => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
    if (kind === 'denim') {
      ctx.lineWidth = 1;
      for (let i = -H; i < W; i += 2) { ctx.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.045)'; ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H * 0.5, H); ctx.stroke(); }
      for (let i = 0; i < 260; i++) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(Math.random() * W, Math.random() * H, 3, 1); }
    }
    for (let i = 0; i < 1400; i++) { ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.035)'; ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4, 4);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: kind === 'denim' ? 0.92 : 0.88 });
  fabricCache.set(key, m);
  return m;
}
const hairCache = new Map();
function hairMat(color) {
  if (hairCache.has(color)) return hairCache.get(color);
  const base = new THREE.Color(color);
  const { tex } = canvasTexture(256, 128, (ctx, W, H) => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * W, len = 20 + Math.random() * 70, y = Math.random() * H - 20;
      const c = base.clone().multiplyScalar(Math.random() < 0.5 ? 0.7 : 1.35);
      ctx.strokeStyle = `rgba(${Math.min(255, c.r * 255) | 0},${Math.min(255, c.g * 255) | 0},${Math.min(255, c.b * 255) | 0},0.35)`;
      ctx.lineWidth = 0.8 + Math.random(); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + rand(-4, 4), y + len / 2, x + rand(-6, 6), y + len); ctx.stroke();
    }
  });
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.05 });
  hairCache.set(color, m);
  return m;
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
    this.hs = ({ kid: 1.06, teen: 0.9, adult: 0.84, elder: 0.84 }[age] || 0.84) * (FLAGS.bighead ? 1.6 : 1);
    const skin = spec.skin || '#f1c27d';
    const shirt = spec.shirt || '#4ea8de';
    const pants = spec.pants || '#3d5a80';
    const shoes = spec.shoes || '#1d2b36';
    const hairC = spec.hair?.color || '#3b2a20';
    const shirtMat = spec.stripes ? stripeMat(spec.stripes[0], spec.stripes[1]) : fabricMat(shirt);
    const pantsMat = fabricMat(pants, /^#(3d5a80|1d3557|2b4a6f|34495e|3b5998|4a6fa5)$/i.test(pants) || spec.jeans ? 'denim' : 'cotton');

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
    const pelvis = lathe([[0.0, -0.09], [0.11, -0.085], [0.155, -0.03], [0.162, 0.03], [0.15, 0.1], [0.0, 0.1]], pantsMat);
    pelvis.scale.set(1.05 * wide * (fem ? 1.04 : 1), 1, 0.7); this.body.add(pelvis);
    j.spine = new THREE.Group(); j.spine.position.y = 0.06; this.body.add(j.spine);
    // torso: shaped chest, waist and shoulders. The front stays about 0.13 deep where the stethoscope and surgery need it.
    const belly = build === 'round' ? 0.184 : 0.16;
    const chestR = fem ? 0.17 : 0.178;
    // the shirt hangs a little over the waistband so the two never fight for the same spot
    const torso = lathe([[0.0, -0.04], [0.168, -0.035], [0.176, 0.02], [belly + 0.008, 0.14], [0.17, 0.26], [chestR, 0.38], [chestR * 1.01, 0.46], [0.162, 0.53], [0.11, 0.585], [0.06, 0.6], [0.0, 0.6]], shirtMat, 32);
    torso.scale.set(1.05 * wide * (fem ? 0.96 : 1), 1, 0.72); j.spine.add(torso);
    this.torso = torso;
    this.buildTop(style, shirt, shirtDark, skin, wide, fem, spec);
    j.neck = new THREE.Group(); j.neck.position.y = 0.585; j.spine.add(j.neck);
    const neck = mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.13, 12), skin); neck.position.y = 0.04; j.neck.add(neck);
    j.head = new THREE.Group(); j.head.position.y = 0.04; j.head.scale.setScalar(this.hs); j.neck.add(j.head);
    const HR = 0.16, HC = 0.15;
    // a sculpted head with painted skin (cheeks, nose, wrinkles and freckles live in the texture)
    const kidish = age === 'kid';
    this.ageGroup = age; this.fem = fem;
    const shapeO = { kid: kidish, nose: spec.nose === 'long' ? 1.3 : spec.nose === 'button' || kidish ? 0.6 : 1, wideNose: spec.nose === 'wide', chubby: kidish || build === 'round', jaw: fem ? 0.8 : 1.1 };
    let hsh = 0; for (const ch of JSON.stringify(spec)) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
    const skinTex = skinTexture(skin, { kid: kidish, elder: age === 'elder', freckles: spec.freckles, stubble: !fem && age === 'adult' && !spec.beard && hsh % 3 === 0 });
    this.skinMat = new THREE.MeshStandardMaterial({ map: skinTex, roughness: 0.58 });
    this.owned = [this.skinMat, skinTex];
    const head = mesh(headGeometry(HR, shapeO), this.skinMat); head.position.y = HC; j.head.add(head);
    this.headMesh = head;
    for (const sx of [1, -1]) {
      const ep = headPoint(new THREE.Vector3(sx, -0.06, -0.08).normalize(), HR, shapeO);
      const ear = new THREE.Group(); ear.position.set(ep.x + sx * 0.004, HC + ep.y, ep.z); ear.rotation.y = sx * 0.35; j.head.add(ear);
      const outer = sphere(0.033, skin, 14); outer.scale.set(0.36, 1, 0.72); ear.add(outer);
      const rim = mesh(new THREE.TorusGeometry(0.026, 0.006, 6, 16, Math.PI * 1.4), skin); rim.rotation.set(0, sx * Math.PI / 2, Math.PI * 0.35); rim.position.x = sx * 0.006; rim.scale.y = 1.25; rim.castShadow = false; ear.add(rim);
      const inn = sphere(0.016, darken(skin, 0.8), 8); inn.position.set(sx * 0.009, -0.004, 0.004); inn.scale.set(0.3, 0.9, 0.7); inn.castShadow = false; ear.add(inn);
      const lobe = sphere(0.011, skin, 8); lobe.position.set(0, -0.03, 0.002); lobe.castShadow = false; ear.add(lobe);
    }
    this.face = new Face(j.head, HR, HC, { skin, skinMat: this.skinMat, shape: d => headPoint(d, HR, shapeO), kid: kidish, lashes: fem, browColor: darken(hairC, 0.8), thickBrows: !fem && age !== 'kid', fangs: spec.outfit === 'vampire', eyeColor: spec.eyes });
    this.shapeO = shapeO;
    this.buildHair(spec, HR, HC, hairC);
    if (FLAGS.party) partyHat(j.head, HC + HR * 1.02, HR, (shirt.charCodeAt(1) || 0) + (shirt.charCodeAt(3) || 0));
    if (FLAGS.cats) catEars(j.head, HC + HR * 0.95, HR, hairC);

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
      const th = limb(0.08 * Math.sqrt(wide), 0.066, 0.27, pantsMat); th.position.y = -0.19; hip.add(th);
      const kn = j['kn' + side] = new THREE.Group(); kn.position.y = -0.4; hip.add(kn);
      const shinMat = spec.shorts ? toon(skin) : pantsMat;
      const kc = sphere(0.064, shinMat, 14); kc.position.set(0, -0.004, 0.004); kn.add(kc);
      const sn = limb(0.064, 0.047, 0.27, shinMat); sn.position.y = -0.19; kn.add(sn);
      if (spec.shorts) {
        const leg = mesh(new THREE.CylinderGeometry(0.085, 0.082, 0.1, 16, 1, true), pantsMat); leg.position.y = -0.36; hip.add(leg);
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
    // a real hand shape: palm, four two-part fingers curled a little toward the palm, and a thumb in front
    const g = new THREE.Group();
    const palm = mesh(new THREE.CapsuleGeometry(0.021, 0.034, 6, 12), skin); palm.scale.set(0.6, 1, 1.28); palm.position.y = -0.012; g.add(palm);
    const curl = 0.22;
    const lens = [0.026, 0.03, 0.028, 0.022];
    for (let i = 0; i < 4; i++) {
      const fz = -0.021 + i * 0.014;
      const f = new THREE.Group(); f.position.set(0, -0.046, fz); f.rotation.set((i - 1.5) * -0.05, 0, -sx * curl * 0.6); g.add(f);
      const p1 = mesh(new THREE.CapsuleGeometry(0.0072, lens[i] * 0.5, 3, 8), skin); p1.position.y = -lens[i] * 0.3; p1.castShadow = false; f.add(p1);
      const f2 = new THREE.Group(); f2.position.y = -lens[i] * 0.6; f2.rotation.z = -sx * curl; f.add(f2);
      const p2 = mesh(new THREE.CapsuleGeometry(0.0064, lens[i] * 0.42, 3, 8), skin); p2.position.y = -lens[i] * 0.28; p2.castShadow = false; f2.add(p2);
    }
    const th = new THREE.Group(); th.position.set(-sx * 0.006, -0.012, 0.028); th.rotation.set(-0.55, 0, -sx * 0.25); g.add(th);
    const t1 = mesh(new THREE.CapsuleGeometry(0.0085, 0.016, 3, 8), skin); t1.position.y = -0.012; t1.castShadow = false; th.add(t1);
    const t2 = mesh(new THREE.CapsuleGeometry(0.0075, 0.012, 3, 8), skin); t2.position.set(0, -0.03, 0.002); t2.castShadow = false; th.add(t2);
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
    const hm = hairMat(color);
    const shapeO = this.shapeO || {};
    const kid = this.ageGroup === 'kid';
    let hsh = 0; for (const ch of JSON.stringify(spec)) hsh = (hsh * 33 + ch.charCodeAt(0)) >>> 0;
    const part = ((hsh % 5) - 2) * 0.12;
    const shell = o => { const m = mesh(hairShell(HR, shapeO, { part, ...o }), hm); m.position.y = HC; h.add(m); return m; };
    // pieces that sit on the outside of the skull shell
    const out = (dx, dy, dz, k = 1.0) => { const d = new THREE.Vector3(dx, dy, dz).normalize(); const p = headPoint(d, HR, shapeO); return p.addScaledVector(d, 0.012 * k).add(new THREE.Vector3(0, HC, 0)); };
    switch (style) {
      case 'none': break;
      case 'bald': {
        // a horseshoe of short hair around the back and sides
        shell({ front: 2, side: -0.02, back: 0.15, thick: 0.035, crown: 0.42 });
        break;
      }
      case 'buzz': shell({ front: 0.5, side: 0.14, back: -0.3, thick: 0.022, recede: this.fem ? 0 : 0.04 }); break;
      case 'short': shell({ front: kid ? 0.4 : 0.48, side: 0.14, back: -0.32, thick: 0.075, recede: !this.fem && this.ageGroup !== 'kid' ? 0.05 : 0 }); break;
      case 'spiky': {
        shell({ front: 0.45, side: 0.15, back: -0.3, thick: 0.06 });
        for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; const p = out(Math.cos(a) * 0.45, 0.85, Math.sin(a) * 0.45 - 0.1, 4); const c = mesh(new THREE.ConeGeometry(0.03, 0.09, 6), hm); c.position.copy(p); c.lookAt(p.clone().multiplyScalar(2).sub(new THREE.Vector3(0, HC, 0))); c.rotateX(Math.PI / 2); h.add(c); }
        break;
      }
      case 'curly': {
        shell({ front: 0.4, side: 0.05, back: -0.35, thick: 0.08 });
        for (let i = 0; i < 70; i++) { const a = i * 2.39996, y = 0.98 - (i / 70) * 1.25; const rr = Math.sqrt(Math.max(0, 1 - y * y)); const dz = Math.sin(a) * rr, dx = Math.cos(a) * rr; if (dz > 0.3 && y < 0.42) continue; const s = sphere(0.024, hm, 8); s.position.copy(out(dx, y, dz, 4.5)); h.add(s); }
        break;
      }
      case 'afro': { shell({ front: 0.38, side: -0.05, back: -0.3, thick: 0.08 }); const s = sphere(0.2, hm, 24); s.position.set(0, HC + 0.09, -0.05); s.scale.set(1.08, 0.92, 1.02); h.add(s); break; }
      case 'bob': { shell({ front: kid ? 0.3 : 0.38, side: -0.35, back: -0.55, thick: 0.1 }); break; }
      case 'long': {
        shell({ front: 0.46, side: -0.2, back: -0.5, thick: 0.08 });
        const b = capsule(0.12, 0.22, hm); b.scale.set(1.15, 1, 0.42); b.position.set(0, HC - 0.12, -0.11); h.add(b);
        break;
      }
      case 'ponytail': {
        shell({ front: 0.46, side: 0.1, back: -0.35, thick: 0.055 });
        const tie = mesh(new THREE.TorusGeometry(0.022, 0.008, 6, 12), '#e63946'); tie.position.set(0, HC + 0.05, -0.17); tie.rotation.x = 0.3; h.add(tie);
        const p = capsule(0.035, 0.17, hm); p.position.set(0, HC - 0.04, -0.21); p.rotation.x = 0.35; h.add(p);
        break;
      }
      case 'bun': { shell({ front: 0.46, side: 0.1, back: -0.3, thick: 0.05 }); const b = sphere(0.065, hm, 14); b.position.copy(out(0, 0.75, -0.65, 3)); h.add(b); break; }
      case 'pigtails': {
        shell({ front: 0.36, side: 0.05, back: -0.35, thick: 0.055 });
        for (const sx of [1, -1]) { const p = capsule(0.04, 0.11, hm); p.position.set(sx * 0.165, HC - 0.03, -0.06); p.rotation.z = sx * 0.4; h.add(p); const tie = mesh(new THREE.TorusGeometry(0.02, 0.007, 6, 12), '#ff5d8f'); tie.position.set(sx * 0.15, HC + 0.03, -0.06); tie.rotation.set(0, Math.PI / 2, sx * 0.4); h.add(tie); }
        break;
      }
      case 'slick': shell({ front: 0.5, side: 0.15, back: -0.3, thick: 0.045, recede: 0.03 }); break;
      default: shell({});
    }
    if (spec.beard === 'full') {
      const b = mesh(hairShell(HR, shapeO, { front: -0.18, side: -0.1, back: 2, thick: 0.05, beard: true }), hm);
      b.position.y = HC; h.add(b);
      // the beard grows below the cheeks and around the chin only
      const m = capsule(0.018, 0.075, hm); m.rotation.z = Math.PI / 2; m.position.copy(out(0, -0.27, 1, 0.3)); h.add(m);
    }
    if (spec.beard === 'mustache' || spec.outfit === 'trench') { const m = capsule(0.016, 0.07, spec.outfit === 'trench' ? hairMat('#3b2a20') : hm); m.rotation.z = Math.PI / 2; m.position.copy(out(0, -0.27, 1, 0.3)); h.add(m); }
  }

  addGlasses(color, sun) {
    const g = new THREE.Group(); const HC = 0.15;
    const eyes = this.face.eyes.map(e => e.position);
    const z = Math.max(eyes[0].z, eyes[1].z) + 0.03;
    for (const e of eyes) {
      const ring = mesh(new THREE.TorusGeometry(0.031, 0.0045, 6, 22), color); ring.scale.y = 0.85; ring.position.set(e.x, e.y, z); ring.castShadow = false; g.add(ring);
      const lensM = sun ? toon('#263238') : new THREE.MeshStandardMaterial({ color: '#dff4ff', transparent: true, opacity: 0.18, roughness: 0.05 });
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.031, 20), lensM); l.scale.y = 0.85; l.position.set(e.x, e.y, z - 0.001); g.add(l);
      if (!sun) (this.owned = this.owned || []).push(lensM);
      const arm = boxm(0.004, 0.004, z - 0.0, color); arm.position.set(e.x + Math.sign(e.x) * 0.032, e.y + 0.006, z / 2); arm.castShadow = false; g.add(arm);
    }
    const br = mesh(new THREE.TorusGeometry(0.012, 0.004, 5, 10, Math.PI), color); br.position.set(0, eyes[0].y + 0.004, z + 0.002); br.castShadow = false; g.add(br);
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
  dispose() { this.face.dispose(); for (const o of this.owned || []) o.dispose && o.dispose(); }

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
    // body language: heads drop when sad, tip back when laughing or surprised
    this.j.head.rotation.x += this.face.headTilt;
    if (this.face.headTilt > 0.12) this.j.spine.rotation.x += (this.face.headTilt - 0.12) * 0.6;
    if (this.face.expr === 'laugh') this.body.position.y += Math.abs(Math.sin(t * 14)) * 0.008;
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
    this.face = new Face(j.head, HR, HC - 0.012, { skin, eyeScale: 1.15, kid: true, browColor: '#c9a27e' });
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
  dispose() { this.face.dispose(); }
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
