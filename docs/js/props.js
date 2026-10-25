import * as THREE from 'three';
import { toon } from './engine.js';

function m(geo, color, opts) {
  const mat = typeof color === 'string' ? toon(color, opts) : color;
  const x = new THREE.Mesh(geo, mat);
  x.castShadow = true;
  return x;
}
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const C = (rt, rb, h, s = 16) => new THREE.CylinderGeometry(rt, rb, h, s);
const S = (r, s = 16) => new THREE.SphereGeometry(r, s, Math.round(s * 0.7));
const glassMat = () => { const mm = new THREE.MeshStandardMaterial({ color: '#e3f6ff', transparent: true, opacity: 0.45 }); mm.userData.dispose = true; return mm; };

// ---------------- DOCTOR'S HAND ----------------
// A gloved hand that grips along its local Y axis. The forearm always points toward the
// bottom right of the view (like your own right arm reaching in), whatever the tool is doing.
const ARM_DIR = new THREE.Vector3(0.42, -0.58, 0.7).normalize();
const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3(), _s = new THREE.Vector3();
export function gloveHand(coat = '#ffffff') {
  const g = new THREE.Group();
  const glove = '#5aa9e6';
  const fist = m(S(0.026, 18), glove, { roughness: 0.45 }); fist.scale.set(1.15, 1.3, 1.0); g.add(fist);
  for (let i = 0; i < 4; i++) { const k = m(S(0.0085, 10), glove, { roughness: 0.45 }); k.position.set(0.021, -0.02 + i * 0.0135, 0.014); g.add(k); }
  const thumb = m(new THREE.CapsuleGeometry(0.0085, 0.022, 4, 8), glove, { roughness: 0.45 }); thumb.position.set(-0.016, 0.026, 0.012); thumb.rotation.set(0.4, 0, 0.5); g.add(thumb);
  const arm = new THREE.Group(); g.add(arm);
  const wrist = m(C(0.019, 0.022, 0.06, 14), glove, { roughness: 0.45 }); wrist.position.y = 0.04; arm.add(wrist);
  const cuff = m(new THREE.TorusGeometry(0.023, 0.005, 6, 16), glove, { roughness: 0.45 }); cuff.rotation.x = Math.PI / 2; cuff.position.y = 0.07; arm.add(cuff);
  const sleeve = m(C(0.034, 0.04, 0.42, 16), coat); sleeve.position.y = 0.28; arm.add(sleeve);
  const sleeveEnd = m(new THREE.TorusGeometry(0.034, 0.006, 6, 18), coat); sleeveEnd.rotation.x = Math.PI / 2; sleeveEnd.position.y = 0.075; arm.add(sleeveEnd);
  arm.updateMatrixWorld = function (force) {
    if (this.parent) {
      this.parent.matrixWorld.decompose(_v, _pq, _s);
      _q.setFromUnitVectors(_up, ARM_DIR);
      this.quaternion.copy(_pq.invert().multiply(_q));
      this.matrixWorldNeedsUpdate = true;
    }
    THREE.Object3D.prototype.updateMatrixWorld.call(this, force);
  };
  g.traverse(o => { o.castShadow = false; });
  return g;
}
export function holdWith(tool, coat, pos, rot = [0, 0, 0], scale = 1) {
  const hnd = gloveHand(coat);
  hnd.position.set(...pos); hnd.rotation.set(...rot); hnd.scale.setScalar(scale);
  tool.add(hnd);
  return hnd;
}

// ---------------- TOOLS ----------------
// Syringe: needle tip at origin, barrel extends along +Y.
export function syringe(liquid = '#7fdbff') {
  const g = new THREE.Group();
  const needle = m(C(0.0016, 0.0016, 0.06, 6), '#cfd8dc'); needle.position.y = 0.03; g.add(needle);
  const hub = m(C(0.008, 0.012, 0.016, 12), '#ff8a2a'); hub.position.y = 0.068; g.add(hub);
  const barrel = m(C(0.017, 0.017, 0.14, 18), glassMat()); barrel.position.y = 0.146; g.add(barrel);
  const liq = m(C(0.014, 0.014, 0.12, 14), liquid); liq.position.y = 0.137; g.add(liq);
  for (let i = 0; i < 5; i++) { const t = m(B(0.012, 0.002, 0.002), '#1d2b36'); t.position.set(0.012, 0.1 + i * 0.022, 0.012); g.add(t); }
  const flange = m(B(0.06, 0.006, 0.02), '#eceff1'); flange.position.y = 0.217; g.add(flange);
  const plunger = new THREE.Group(); plunger.position.y = 0.2; g.add(plunger);
  const rod = m(C(0.005, 0.005, 0.11, 8), '#eceff1'); rod.position.y = 0.055; plunger.add(rod);
  const thumb = m(C(0.018, 0.018, 0.006, 16), '#eceff1'); thumb.position.y = 0.112; plunger.add(thumb);
  const stopper = m(C(0.015, 0.015, 0.01, 14), '#37474f'); stopper.position.y = -0.003; plunger.add(stopper);
  g.userData = {
    setFill(f) { liq.scale.y = Math.max(0.001, f); liq.position.y = 0.077 + 0.12 * f / 2; plunger.position.y = 0.08 + 0.12 * f; },
  };
  g.userData.setFill(1);
  return g;
}

// tweezers: tips at origin, handle up +Y
export function tweezers() {
  const g = new THREE.Group();
  const a = new THREE.Group(), b = new THREE.Group();
  const arm1 = m(B(0.008, 0.16, 0.004), '#cfd8dc'); arm1.position.y = 0.08; a.add(arm1);
  const arm2 = m(B(0.008, 0.16, 0.004), '#cfd8dc'); arm2.position.y = 0.08; b.add(arm2);
  const grip1 = m(B(0.01, 0.05, 0.006), '#ff8a2a'); grip1.position.y = 0.1; a.add(grip1);
  const grip2 = m(B(0.01, 0.05, 0.006), '#ff8a2a'); grip2.position.y = 0.1; b.add(grip2);
  a.position.y = 0; b.position.y = 0;
  const top = new THREE.Group(); top.position.y = 0.16; g.add(top);
  a.position.set(0, -0.16, 0); b.position.set(0, -0.16, 0);
  const pa = new THREE.Group(); pa.position.y = 0.16; pa.add(a); g.add(pa);
  const pb = new THREE.Group(); pb.position.y = 0.16; pb.add(b); g.add(pb);
  g.userData = { open(k) { pa.rotation.z = 0.04 + 0.12 * k; pb.rotation.z = -(0.04 + 0.12 * k); } };
  g.userData.open(1);
  return g;
}

export function scalpel() {
  const g = new THREE.Group();
  const blade = m(new THREE.ConeGeometry(0.012, 0.05, 3), '#e0e0e0'); blade.position.y = 0.025; blade.scale.z = 0.25; g.add(blade);
  const handle = m(B(0.016, 0.13, 0.006), '#90a4ae'); handle.position.y = 0.115; g.add(handle);
  const grip = m(B(0.018, 0.05, 0.008), '#ff8a2a'); grip.position.y = 0.13; g.add(grip);
  return g;
}

// reflex hammer: head at origin, handle along +Y
export function hammer() {
  const g = new THREE.Group();
  const head = m(C(0.035, 0.035, 0.075, 3), '#e63946'); head.rotation.z = Math.PI / 2; g.add(head);
  const handle = m(C(0.006, 0.008, 0.26, 8), '#cfd8dc'); handle.position.y = 0.13; g.add(handle);
  const end = m(S(0.012, 8), '#cfd8dc'); end.position.y = 0.26; g.add(end);
  return g;
}

// stethoscope chest piece facing -Z (toward patient), tube going up
export function stethoscope() {
  const g = new THREE.Group();
  const disc = m(C(0.035, 0.035, 0.016, 24), '#cfd8dc'); disc.rotation.x = Math.PI / 2; g.add(disc);
  const dia = m(C(0.031, 0.031, 0.004, 24), '#eceff1'); dia.rotation.x = Math.PI / 2; dia.position.z = -0.009; g.add(dia);
  const stem = m(C(0.008, 0.008, 0.04, 8), '#90a4ae'); stem.position.set(0, 0.03, 0.006); g.add(stem);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.05, 0.006), new THREE.Vector3(0.02, 0.15, 0.05), new THREE.Vector3(-0.04, 0.3, 0.12), new THREE.Vector3(0.02, 0.5, 0.2)]);
  const tube = m(new THREE.TubeGeometry(curve, 30, 0.007, 8), '#26a69a'); g.add(tube);
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.055, 32), new THREE.MeshBasicMaterial({ color: '#5dffb0', transparent: true, opacity: 0 }));
  glow.material.userData.dispose = true;
  glow.position.z = -0.002; g.add(glow);
  g.userData = { glow };
  return g;
}

export function swab() {
  const g = new THREE.Group();
  const pad = m(S(0.03, 12), '#ffffff'); pad.scale.set(1, 0.5, 1); g.add(pad);
  const stick = m(C(0.004, 0.004, 0.1, 6), '#f5deb3'); stick.position.y = 0.06; g.add(stick);
  return g;
}

export function vial(color = '#c62828') {
  const g = new THREE.Group();
  const tube = m(C(0.03, 0.03, 0.2, 20), glassMat()); tube.position.y = 0.1; g.add(tube);
  const bottom = m(S(0.03, 16), glassMat()); bottom.scale.y = 0.6; g.add(bottom);
  const liq = m(C(0.026, 0.026, 0.2, 16), color); liq.position.y = 0; g.add(liq);
  const cap = m(C(0.034, 0.034, 0.04, 20), '#7b1fa2'); cap.position.y = 0.215; g.add(cap);
  const line = m(new THREE.TorusGeometry(0.032, 0.003, 6, 24), '#1d2b36'); line.rotation.x = Math.PI / 2; g.add(line);
  const line2 = m(new THREE.TorusGeometry(0.032, 0.003, 6, 24), '#1d2b36'); line2.rotation.x = Math.PI / 2; g.add(line2);
  g.userData = {
    setFill(f) { liq.scale.y = Math.max(0.001, f); liq.position.y = 0.2 * f / 2; },
    setZone(a, b) { line.position.y = 0.2 * a; line2.position.y = 0.2 * b; },
  };
  g.userData.setFill(0);
  return g;
}

export function clipboard() {
  const g = new THREE.Group();
  const board = m(B(0.26, 0.34, 0.012), '#a47148'); g.add(board);
  const paper = m(B(0.22, 0.28, 0.002), '#ffffff'); paper.position.set(0, -0.015, 0.007); g.add(paper);
  for (let i = 0; i < 6; i++) { const l = m(B(0.17, 0.006, 0.001), '#90a4ae'); l.position.set(0, 0.07 - i * 0.035, 0.009); g.add(l); }
  const clip = m(B(0.1, 0.035, 0.02), '#b0bec5'); clip.position.set(0, 0.16, 0.01); g.add(clip);
  return g;
}

export function mask() {
  const g = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#b2fab4', transparent: true, opacity: 0.8 }));
  cup.material.userData.dispose = true;
  cup.rotation.x = -Math.PI / 2; g.add(cup);
  const tube = m(C(0.015, 0.015, 0.12, 10), '#81c784'); tube.position.z = 0.1; tube.rotation.x = Math.PI / 2; g.add(tube);
  const strap = m(new THREE.TorusGeometry(0.075, 0.006, 6, 20), '#4caf50'); g.add(strap);
  return g;
}

export function rattle() {
  const g = new THREE.Group();
  const ball = m(S(0.05, 16), '#ffd23f'); ball.position.y = 0.13; g.add(ball);
  const band = m(new THREE.TorusGeometry(0.05, 0.01, 6, 20), '#ff5d8f'); band.position.y = 0.13; band.rotation.x = Math.PI / 2; g.add(band);
  const h = m(C(0.012, 0.012, 0.1, 8), '#3ec1d3'); h.position.y = 0.05; g.add(h);
  const knob = m(S(0.02, 10), '#ff5d8f'); g.add(knob);
  return g;
}

export function bandage(color = '#ffcc80') {
  const g = new THREE.Group();
  const strip = m(B(0.09, 0.035, 0.004), color); g.add(strip);
  const pad = m(B(0.03, 0.03, 0.006), '#ffffff'); g.add(pad);
  for (const x of [-0.035, 0.035]) { const d = m(S(0.004, 6), '#ff5d8f'); d.position.set(x, 0, 0.003); g.add(d); }
  return g;
}

export function needleTube() { // blood draw needle with tube
  const g = new THREE.Group();
  const needle = m(C(0.0015, 0.0015, 0.045, 6), '#cfd8dc'); needle.position.y = 0.022; g.add(needle);
  const wing = m(B(0.06, 0.012, 0.002), '#64b5f6'); wing.position.y = 0.05; g.add(wing);
  const body = m(C(0.006, 0.006, 0.03, 8), '#64b5f6'); body.position.y = 0.06; g.add(body);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.075, 0), new THREE.Vector3(0.02, 0.15, 0.02), new THREE.Vector3(0.1, 0.2, 0.05), new THREE.Vector3(0.2, 0.18, 0.06)]);
  const tube = m(new THREE.TubeGeometry(curve, 24, 0.004, 6), '#e57373'); g.add(tube);
  return g;
}

// ---------------- OBJECTS (things to pull out of people) ----------------
// Each returns a group roughly 1 unit in its largest dimension; caller scales.
export function object(name) {
  const g = new THREE.Group();
  switch (name) {
    case 'lego': {
      const col = ['#e63946', '#ffd23f', '#3a86ff', '#2a9d8f'][Math.floor(Math.random() * 4)];
      g.add(m(B(1, 0.55, 0.5), col));
      for (const x of [-0.25, 0.25]) for (const z of [-0.12, 0.12]) { const s = m(C(0.13, 0.13, 0.15, 14), col); s.position.set(x * 1.4, 0.34, z); g.add(s); }
      break;
    }
    case 'marble': {
      g.add(m(S(0.5, 20), '#4cc9f0'));
      const sw = m(new THREE.TorusGeometry(0.3, 0.07, 6, 18), '#f72585'); sw.rotation.x = 0.8; g.add(sw);
      break;
    }
    case 'dice': {
      g.add(m(B(0.8, 0.8, 0.8), '#ffffff'));
      const dots = [[0, 0.41, 0], [0.2, 0.41, 0.2], [-0.2, 0.41, -0.2], [0.41, 0.2, 0.2], [0.41, -0.2, -0.2], [0, 0, 0.41]];
      for (const [x, y, z] of dots) { const d = m(S(0.08, 8), '#1d2b36'); d.position.set(x, y, z); g.add(d); }
      break;
    }
    case 'crayon': {
      const col = ['#ff8a2a', '#9b5de5', '#06d6a0'][Math.floor(Math.random() * 3)];
      const b = m(C(0.18, 0.18, 0.8, 12), col); b.rotation.z = Math.PI / 2; g.add(b);
      const t = m(new THREE.ConeGeometry(0.18, 0.25, 12), col); t.rotation.z = -Math.PI / 2; t.position.x = 0.52; g.add(t);
      const lab = m(C(0.19, 0.19, 0.4, 12), '#ffffff'); lab.rotation.z = Math.PI / 2; lab.position.x = -0.05; g.add(lab);
      break;
    }
    case 'dino': {
      const col = '#6ab04c';
      const body = m(S(0.32, 14), col); body.scale.set(1.3, 0.9, 0.8); g.add(body);
      const neck = m(C(0.1, 0.14, 0.4, 10), col); neck.position.set(0.32, 0.3, 0); neck.rotation.z = -0.6; g.add(neck);
      const head = m(S(0.15, 12), col); head.position.set(0.5, 0.5, 0); g.add(head);
      const tail = m(new THREE.ConeGeometry(0.14, 0.5, 10), col); tail.position.set(-0.55, 0.05, 0); tail.rotation.z = Math.PI / 2 + 0.3; g.add(tail);
      for (const x of [-0.18, 0.18]) for (const z of [-0.14, 0.14]) { const l = m(C(0.07, 0.07, 0.25, 8), col); l.position.set(x, -0.3, z); g.add(l); }
      const eye = m(S(0.03, 6), '#1d2b36'); eye.position.set(0.58, 0.55, 0.1); g.add(eye);
      break;
    }
    case 'airpod': {
      const b = m(S(0.3, 16), '#ffffff'); b.scale.set(1, 0.9, 0.9); g.add(b);
      const stem = m(new THREE.CapsuleGeometry(0.1, 0.5, 4, 10), '#ffffff'); stem.position.set(0.15, -0.4, 0); stem.rotation.z = 0.25; g.add(stem);
      break;
    }
    case 'coin': {
      const c = m(C(0.5, 0.5, 0.1, 24), '#ffd23f'); c.rotation.x = Math.PI / 2; g.add(c);
      const r = m(new THREE.TorusGeometry(0.42, 0.04, 6, 24), '#e0b100'); r.position.z = 0.05; g.add(r);
      break;
    }
    case 'button': {
      const c = m(C(0.45, 0.45, 0.12, 20), '#ff5d8f'); c.rotation.x = Math.PI / 2; g.add(c);
      for (const [x, y] of [[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1]]) { const h = m(C(0.05, 0.05, 0.14, 8), '#a4133c'); h.rotation.x = Math.PI / 2; h.position.set(x, y, 0); g.add(h); }
      break;
    }
    case 'jellybean': {
      const b = m(new THREE.CapsuleGeometry(0.3, 0.4, 6, 14), ['#ff006e', '#8338ec', '#fb5607'][Math.floor(Math.random() * 3)]); b.rotation.z = Math.PI / 2 + 0.3; g.add(b);
      break;
    }
    case 'duck': {
      const body = m(S(0.4, 18), '#ffd23f'); body.scale.set(1.25, 0.85, 1); g.add(body);
      const head = m(S(0.25, 16), '#ffd23f'); head.position.set(0.32, 0.42, 0); g.add(head);
      const beak = m(new THREE.ConeGeometry(0.1, 0.22, 10), '#ff8a2a'); beak.rotation.z = -Math.PI / 2; beak.position.set(0.6, 0.4, 0); g.add(beak);
      for (const z of [-0.1, 0.1]) { const e = m(S(0.04, 8), '#1d2b36'); e.position.set(0.48, 0.5, z); g.add(e); }
      const tail = m(new THREE.ConeGeometry(0.12, 0.2, 8), '#ffd23f'); tail.position.set(-0.5, 0.15, 0); tail.rotation.z = 0.9; g.add(tail);
      break;
    }
    case 'remote': {
      g.add(m(B(1, 0.12, 0.3), '#37474f'));
      for (let i = 0; i < 6; i++) { const b = m(C(0.04, 0.04, 0.05, 8), i === 0 ? '#e63946' : '#cfd8dc'); b.position.set(0.35 - i * 0.13, 0.07, (i % 2) * 0.1 - 0.05); g.add(b); }
      break;
    }
    case 'harmonica': {
      g.add(m(B(1, 0.22, 0.28), '#b0bec5'));
      const top = m(B(1.02, 0.06, 0.29), '#e0e0e0'); top.position.y = 0.12; g.add(top);
      for (let i = 0; i < 8; i++) { const h = m(B(0.06, 0.08, 0.02), '#37474f'); h.position.set(-0.42 + i * 0.12, 0, 0.14); g.add(h); }
      break;
    }
    case 'chicken': {
      const body = m(new THREE.CapsuleGeometry(0.16, 0.6, 6, 12), '#ffe066'); body.rotation.z = Math.PI / 2; g.add(body);
      const head = m(S(0.14, 12), '#ffe066'); head.position.set(0.5, 0.12, 0); g.add(head);
      const comb = m(B(0.1, 0.1, 0.03), '#e63946'); comb.position.set(0.52, 0.27, 0); g.add(comb);
      const beak = m(new THREE.ConeGeometry(0.05, 0.12, 8), '#ff8a2a'); beak.rotation.z = -Math.PI / 2; beak.position.set(0.66, 0.1, 0); g.add(beak);
      for (const x of [-0.25, -0.15]) { const l = m(C(0.02, 0.02, 0.3, 6), '#ff8a2a'); l.position.set(x - 0.2, -0.05, 0); l.rotation.z = 1.2; g.add(l); }
      break;
    }
    case 'toycar': {
      g.add(m(B(1, 0.3, 0.5), '#e63946'));
      const cab = m(B(0.5, 0.25, 0.45), '#e63946'); cab.position.set(-0.05, 0.27, 0); g.add(cab);
      const win = m(B(0.4, 0.18, 0.46), '#bde0fe'); win.position.set(-0.05, 0.28, 0); g.add(win);
      for (const x of [-0.32, 0.32]) for (const z of [-0.26, 0.26]) { const w = m(C(0.13, 0.13, 0.08, 14), '#1d2b36'); w.rotation.x = Math.PI / 2; w.position.set(x, -0.15, z); g.add(w); }
      break;
    }
    case 'spoon': {
      const bowl = m(S(0.22, 14), '#cfd8dc'); bowl.scale.set(1.3, 0.35, 1); bowl.position.x = 0.38; g.add(bowl);
      const h = m(B(0.7, 0.05, 0.1), '#cfd8dc'); h.position.x = -0.15; g.add(h);
      break;
    }
    case 'sock': {
      const a = m(new THREE.CapsuleGeometry(0.16, 0.5, 6, 12), '#ff8a2a'); a.rotation.z = 0.2; g.add(a);
      const f = m(new THREE.CapsuleGeometry(0.16, 0.25, 6, 12), '#ff8a2a'); f.rotation.z = Math.PI / 2; f.position.set(0.2, -0.38, 0); g.add(f);
      const s = m(new THREE.TorusGeometry(0.16, 0.04, 6, 16), '#ffffff'); s.rotation.x = Math.PI / 2; s.position.y = 0.4; g.add(s);
      break;
    }
    case 'appendix': {
      const b = m(new THREE.CapsuleGeometry(0.22, 0.45, 6, 14), '#ff6b6b'); b.rotation.z = 0.4; g.add(b);
      addFace(g, 0.22, 'angry', new THREE.Vector3(0, 0.1, 0.2));
      break;
    }
    default: g.add(m(S(0.5, 14), '#ff8a2a'));
  }
  return g;
}

export const OBJECT_NAMES = {
  lego: 'Lego brick', marble: 'marble', dice: 'die', crayon: 'crayon', dino: 'tiny dinosaur', airpod: 'earbud', coin: 'quarter',
  button: 'button', jellybean: 'jellybean', duck: 'rubber duck', remote: 'TV remote', harmonica: 'harmonica', chicken: 'rubber chicken',
  toycar: 'toy car', spoon: 'spoon', sock: 'sock', appendix: 'appendix',
};

// ---------------- ORGANS (cartoon, with faces) ----------------
export function addFace(g, r, mood = 'happy', at = new THREE.Vector3(0, 0, r)) {
  const f = new THREE.Group(); f.position.copy(at); g.add(f);
  for (const sx of [-1, 1]) { const e = m(S(r * 0.14, 8), '#1d2b36'); e.position.set(sx * r * 0.32, r * 0.12, 0); e.scale.z = 0.5; f.add(e); }
  const mouth = new THREE.Group(); f.add(mouth);
  const smile = m(new THREE.TorusGeometry(r * 0.22, r * 0.05, 6, 12, Math.PI), '#1d2b36'); smile.rotation.z = Math.PI; smile.position.y = -r * 0.08;
  const frown = m(new THREE.TorusGeometry(r * 0.2, r * 0.05, 6, 12, Math.PI), '#1d2b36'); frown.position.y = -r * 0.32;
  const o = m(new THREE.TorusGeometry(r * 0.1, r * 0.05, 6, 12), '#1d2b36'); o.position.y = -r * 0.2;
  mouth.add(smile, frown, o);
  const brows = [];
  for (const sx of [-1, 1]) { const b = m(B(r * 0.3, r * 0.07, r * 0.05), '#1d2b36'); b.position.set(sx * r * 0.32, r * 0.38, 0); f.add(b); brows.push(b); }
  f.userData.set = mood2 => {
    smile.visible = mood2 === 'happy'; frown.visible = mood2 === 'angry' || mood2 === 'sad'; o.visible = mood2 === 'shock';
    brows.forEach((b, i) => { const sx = i === 0 ? -1 : 1; b.visible = mood2 !== 'happy'; b.rotation.z = mood2 === 'angry' ? sx * 0.5 : mood2 === 'shock' || mood2 === 'sad' ? -sx * 0.4 : 0; });
  };
  f.userData.set(mood);
  g.userData.face = f;
  return f;
}

export function organ(kind) {
  const g = new THREE.Group();
  let r = 0.05;
  switch (kind) {
    case 'stomach': { const b = m(S(1, 18), '#ff8fab'); b.scale.set(0.065, 0.03, 0.05); g.add(b); r = 0.055; addFace(g, 0.04, 'happy', new THREE.Vector3(0, 0.03, 0)).rotation.x = -Math.PI / 2; break; }
    case 'liver': { const b = m(S(1, 18), '#c77dff'); b.scale.set(0.07, 0.025, 0.045); g.add(b); r = 0.055; addFace(g, 0.035, 'happy', new THREE.Vector3(0, 0.026, 0)).rotation.x = -Math.PI / 2; break; }
    case 'intestines': {
      const t = m(new THREE.TorusKnotGeometry(0.04, 0.014, 64, 8, 2, 3), '#ffb4a2'); t.rotation.x = Math.PI / 2; t.scale.z = 0.5; g.add(t); r = 0.058;
      addFace(g, 0.03, 'happy', new THREE.Vector3(0, 0.03, 0)).rotation.x = -Math.PI / 2; break;
    }
    case 'kidney': { const b = m(S(1, 14), '#e5989b'); b.scale.set(0.03, 0.02, 0.042); g.add(b); r = 0.038; addFace(g, 0.022, 'happy', new THREE.Vector3(0, 0.021, 0)).rotation.x = -Math.PI / 2; break; }
    case 'spleen': { const b = m(S(1, 14), '#9d4edd'); b.scale.set(0.035, 0.018, 0.025); g.add(b); r = 0.032; addFace(g, 0.02, 'happy', new THREE.Vector3(0, 0.019, 0)).rotation.x = -Math.PI / 2; break; }
    case 'appendix': { const b = m(new THREE.CapsuleGeometry(0.014, 0.03, 6, 10), '#ff4d6d'); b.rotation.z = Math.PI / 2; b.scale.y = 1; g.add(b); r = 0.026; addFace(g, 0.016, 'angry', new THREE.Vector3(0, 0.016, 0)).rotation.x = -Math.PI / 2; break; }
    default: { g.add(m(S(0.04, 12), '#ff8fab')); }
  }
  g.userData.r = r;
  return g;
}
