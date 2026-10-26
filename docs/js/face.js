// Faces: a sculpted head, painted skin, real-looking eyes, and a mouth and brows that move
// smoothly between expressions so patients can actually show how they feel.
import * as THREE from 'three';
import { toon, canvasTexture, rand, clamp } from './engine.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const dir = (x, y, z) => V(x, y, z).normalize();
const lerp = (a, b, k) => a + (b - a) * k;

// ---------------- head shape ----------------
const F = {
  noseTip: dir(0, -0.1, 1), noseBridge: dir(0, 0.1, 1), nostrilL: dir(0.085, -0.17, 1), nostrilR: dir(-0.085, -0.17, 1),
  browL: dir(0.3, 0.34, 0.9), browR: dir(-0.3, 0.34, 0.9), socketL: dir(0.32, 0.12, 0.94), socketR: dir(-0.32, 0.12, 0.94),
  cheekL: dir(0.5, -0.14, 0.85), cheekR: dir(-0.5, -0.14, 0.85), chin: dir(0, -0.74, 0.68), lips: dir(0, -0.42, 0.9),
  templeL: dir(0.8, 0.25, 0.4), templeR: dir(-0.8, 0.25, 0.4),
};
export const FACE_DIRS = F;
const bump = (d, c, w) => { const a = Math.acos(clamp(d.dot(c), -1, 1)); return Math.exp(-(a * a) / (w * w)); };
// Where the skin is, in a given direction from the middle of the head (head-local units, radius r).
export function headPoint(d, r, o = {}) {
  const nose = o.nose ?? 1, jaw = o.jaw ?? 1;
  let R = 1;
  R += 0.026 * (bump(d, F.browL, 0.15) + bump(d, F.browR, 0.15));
  R -= 0.045 * (bump(d, F.socketL, 0.1) + bump(d, F.socketR, 0.1));
  R += 0.018 * (bump(d, F.cheekL, 0.17) + bump(d, F.cheekR, 0.17)) * (o.chubby ? 1.8 : 1);
  R += 0.035 * jaw * bump(d, F.chin, 0.14);
  R += 0.016 * bump(d, F.lips, 0.11);
  R -= 0.02 * (bump(d, F.templeL, 0.25) + bump(d, F.templeR, 0.25));
  let x = d.x * R, y = d.y * R, z = d.z * R;
  x *= o.kid ? 0.93 : 0.86; y *= o.kid ? 1.03 : 1.1; if (z < 0) z *= 1.06;
  if (y < 0) { const k = Math.pow(Math.min(1, -y / 1.1), 1.6); x *= 1 - (o.kid ? 0.08 : 0.12) * k * jaw; if (z < 0) z *= 1 - 0.25 * k; }
  if (z > 0.62) z = 0.62 + (z - 0.62) * 0.86;
  // the nose sits on top of the flattened face so it keeps its shape
  if (d.z > 0) {
    const n = nose * (0.19 * bump(d, F.noseTip, 0.085) + 0.075 * bump(d, F.noseBridge, 0.07) + 0.05 * bump(d, dir(0, -0.05, 1), 0.09))
      + 0.042 * (bump(d, F.nostrilL, 0.05) + bump(d, F.nostrilR, 0.05)) * (o.wideNose ? 1.5 : 1);
    z += n;
  }
  return V(x * r, y * r, z * r);
}
export function headGeometry(r, o = {}) {
  const g = new THREE.SphereGeometry(1, 64, 48);
  const p = g.attributes.position, d = V(0, 0, 0);
  for (let i = 0; i < p.count; i++) {
    d.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    const q = headPoint(d, r, o);
    p.setXYZ(i, q.x, q.y, q.z);
  }
  g.computeVertexNormals();
  return g;
}

// ---------------- hair ----------------
// A shell of hair that follows the real skull, with a natural hairline (higher in front, above the
// ears, lower at the back). It thins out to nothing at the edge so it blends into the skin.
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function hairShell(r, shapeO, o = {}) {
  const front = o.front ?? 0.5, side = o.side ?? 0.12, back = o.back ?? -0.32, thick = (o.thick ?? 0.07) * r;
  const src = new THREE.SphereGeometry(1, 56, 40);
  const pos = src.attributes.position, n = pos.count;
  const mask = new Float32Array(n), d = V(0, 0, 0);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    d.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    let line = d.z >= 0 ? side + (front - side) * smooth(0.12, 0.85, d.z) : side + (back - side) * smooth(0, 0.6, -d.z);
    if (o.part && d.z > 0.3) line -= 0.05 * Math.exp(-((d.x - o.part) ** 2) / 0.01);
    if (o.recede && d.z > 0.3) line += o.recede * Math.exp(-((Math.abs(d.x) - 0.42) ** 2) / 0.02);
    let m = d.y - line;
    if (o.crown != null) m = Math.min(m, o.crown - d.y);
    if (o.beard) {
      // below the cheekbones, up the jaw to sideburns, around (not over) the mouth
      const bl = -0.16 + 0.3 * smooth(0.35, 0.9, Math.abs(d.x));
      m = Math.min(bl - d.y, d.z + 0.1);
      if (Math.abs(d.x) < 0.2 && d.y > -0.56 && d.y < -0.3 && d.z > 0.6) m = -1;
    }
    mask[i] = m;
    const taper = smooth(-0.02, 0.14, m);
    const q = headPoint(d, r, shapeO);
    const t = 0.004 * r + thick * taper * (1 + 0.35 * Math.max(0, d.y));
    out[i * 3] = q.x + d.x * t; out[i * 3 + 1] = q.y + d.y * t; out[i * 3 + 2] = q.z + d.z * t;
  }
  const idx = src.index.array, keep = [];
  for (let k = 0; k < idx.length; k += 3) { const a = idx[k], b = idx[k + 1], c = idx[k + 2]; if (mask[a] > -0.025 && mask[b] > -0.025 && mask[c] > -0.025) keep.push(a, b, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(out, 3));
  g.setAttribute('uv', src.attributes.uv.clone());
  g.setIndex(keep);
  g.computeVertexNormals();
  src.dispose();
  return g;
}

// ---------------- skin texture ----------------
// Painted in the head's own UV space: u wraps around (front of the face at u = 0.25), v runs top to bottom.
const uvOf = d => { let phi = Math.atan2(d.z, -d.x); if (phi < 0) phi += Math.PI * 2; return { u: phi / (Math.PI * 2), v: Math.acos(clamp(d.y, -1, 1)) / Math.PI }; };
function shade(hex, k) { const c = new THREE.Color(hex); return `rgb(${Math.round(clamp(c.r * k, 0, 1) * 255)},${Math.round(clamp(c.g * k, 0, 1) * 255)},${Math.round(clamp(c.b * k, 0, 1) * 255)})`; }
export function skinTexture(skin, o = {}) {
  return canvasTexture(512, 256, (ctx, W, H) => {
    ctx.fillStyle = skin; ctx.fillRect(0, 0, W, H);
    const at = d => { const { u, v } = uvOf(d); return [u * W, v * H]; };
    const blob = (d, rx, ry, color, a) => { const [x, y] = at(d); const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry)); g.addColorStop(0, color.replace('A', a)); g.addColorStop(1, color.replace('A', 0)); ctx.save(); ctx.translate(x, y); ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); ctx.translate(-x, -y); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, Math.max(rx, ry), 0, Math.PI * 2); ctx.fill(); ctx.restore(); };
    // tiny variation so skin is not flat plastic
    for (let i = 0; i < 2600; i++) { ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.035)'; ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
    // warmth on the cheeks, nose and chin; a little shadow around the eyes
    const blush = o.kid ? 0.32 : 0.2;
    blob(F.cheekL, 26, 18, 'rgba(225,95,95,A)', blush); blob(F.cheekR, 26, 18, 'rgba(225,95,95,A)', blush);
    blob(F.noseTip, 11, 9, 'rgba(215,95,90,A)', 0.16);
    // fake shadows and highlights that give the nose and eyes some depth
    blob(dir(0.085, -0.02, 1), 5, 14, 'rgba(110,55,40,A)', 0.09); blob(dir(-0.085, -0.02, 1), 5, 14, 'rgba(110,55,40,A)', 0.09);
    blob(dir(0, -0.25, 0.97), 7, 5, 'rgba(110,55,40,A)', 0.12);
    blob(dir(0.07, -0.17, 1), 5, 3, 'rgba(80,35,30,A)', 0.22); blob(dir(-0.07, -0.17, 1), 5, 3, 'rgba(80,35,30,A)', 0.22);
    blob(dir(0, 0.06, 1), 3, 12, 'rgba(255,240,230,A)', 0.22);
    blob(dir(0.32, 0.22, 0.92), 14, 4, 'rgba(70,40,40,A)', 0.14); blob(dir(-0.32, 0.22, 0.92), 14, 4, 'rgba(70,40,40,A)', 0.14);
    blob(dir(0, -0.6, 0.8), 14, 5, 'rgba(60,30,30,A)', 0.12);
    blob(F.chin, 18, 10, 'rgba(210,100,95,A)', 0.08);
    blob(dir(0.33, 0.05, 0.94), 15, 6, 'rgba(70,40,60,A)', o.elder ? 0.2 : 0.1); blob(dir(-0.33, 0.05, 0.94), 15, 6, 'rgba(70,40,60,A)', o.elder ? 0.2 : 0.1);
    if (o.stubble) { const [x, y] = at(F.chin); for (let i = 0; i < 1400; i++) { const a = Math.random() * Math.PI, rr = 18 + Math.random() * 44; const px = x + Math.cos(a) * rr * 1.6, py = y - 22 + Math.sin(a) * rr * 0.75; if (py < y - 30) continue; ctx.fillStyle = 'rgba(40,30,25,0.22)'; ctx.fillRect(px, py, 1.2, 1.2); } }
    ctx.strokeStyle = shade(skin, 0.78); ctx.lineCap = 'round';
    if (o.elder) {
      ctx.lineWidth = 1.1; ctx.globalAlpha = 0.24;
      for (let i = 0; i < 3; i++) { const [x, y] = at(dir(0, 0.55 + i * 0.07, 0.83)); ctx.beginPath(); ctx.moveTo(x - 36, y + 2); ctx.quadraticCurveTo(x, y - 3, x + 36, y + 2); ctx.stroke(); }
      for (const sx of [1, -1]) {
        const [ex, ey] = at(dir(sx * 0.5, 0.12, 0.86));
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(ex, ey + i * 2.5); ctx.lineTo(ex + sx * 5, ey + i * 3.5); ctx.stroke(); }
        const [nx, ny] = at(dir(sx * 0.13, -0.2, 0.98)); ctx.beginPath(); ctx.moveTo(nx, ny); ctx.quadraticCurveTo(nx + sx * 6, ny + 12, nx + sx * 7, ny + 22); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (o.freckles) {
      for (let i = 0; i < 30; i++) { const d = dir(rand(-0.5, 0.5), rand(-0.18, 0.04), 0.9); const [x, y] = at(d); ctx.fillStyle = shade(skin, 0.75); ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(x, y, rand(0.6, 1.2), 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }).tex;
}

// ---------------- eyes ----------------
const irisCache = new Map();
function irisTex(color) {
  if (irisCache.has(color)) return irisCache.get(color);
  const t = canvasTexture(128, 128, (ctx, W) => {
    const c = W / 2;
    const g = ctx.createRadialGradient(c, c, 4, c, c, c);
    g.addColorStop(0, shade(color, 1.45)); g.addColorStop(0.45, shade(color, 1.1)); g.addColorStop(0.85, shade(color, 0.75)); g.addColorStop(0.97, shade(color, 0.35)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, c, 0, 7); ctx.fill();
    for (let i = 0; i < 90; i++) { const a = Math.random() * Math.PI * 2, r0 = c * 0.32, r1 = c * rand(0.6, 0.92); ctx.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); ctx.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); ctx.stroke(); }
  }).tex;
  irisCache.set(color, t);
  return t;
}
const sclera = new THREE.MeshStandardMaterial({ color: '#f7f5ef', roughness: 0.18 });
// a flat disc bent onto the front of a ball of radius R (so the iris sits on the eye, not floating in front)
function onEye(rad, R, seg, rings, cx = 0, cy = 0) {
  const g = new THREE.RingGeometry(0.00001, rad, seg, rings);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + cx, y = p.getY(i) + cy; p.setXYZ(i, x, y, Math.sqrt(Math.max(0, R * R - x * x - y * y))); }
  g.computeVertexNormals();
  return g;
}
const pupilMat = new THREE.MeshBasicMaterial({ color: '#0b0d10' });
const glintMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

// ---------------- expressions ----------------
// eye: how open (1 normal), squint: lower lid up, brow: raise, inner: inner brow tilt (+ angry, - worried),
// open/smile/width/pucker/asym: mouth, teeth: show teeth, blush, tint: 'red' | 'pale', sweat, tears, head: head tilt
export const EXPR = {
  smile: { eye: 1, squint: 0.15, brow: 0.05, inner: 0, open: 0.04, smile: 0.5, width: 1, teeth: 0.3 },
  neutral: { eye: 1, squint: 0, brow: 0, inner: 0, open: 0, smile: 0.05, width: 0.95 },
  happy: { eye: 0.9, squint: 0.55, brow: 0.15, inner: -0.05, open: 0.28, smile: 0.95, width: 1.15, teeth: 1, blush: 0.5, head: -0.06 },
  laugh: { eye: 0.2, squint: 0.9, brow: 0.2, inner: -0.1, open: 0.75, smile: 1, width: 1.2, teeth: 1, blush: 0.8, head: -0.16 },
  surprised: { eye: 1.3, squint: 0, brow: 0.75, inner: -0.1, open: 0.6, smile: 0, width: 0.8, pucker: 0.7, head: -0.08 },
  scared: { eye: 1.3, squint: 0, brow: 0.6, inner: -0.6, open: 0.35, smile: -0.45, width: 1.2, teeth: 1, tint: 'pale', sweat: true, head: 0.05 },
  worried: { eye: 1.05, squint: 0.1, brow: 0.3, inner: -0.65, open: 0.06, smile: -0.35, width: 0.92, asym: 0.3, sweat: true },
  ouch: { eye: 0.08, squint: 0.7, brow: -0.2, inner: -0.4, open: 0.5, smile: -0.6, width: 1.25, teeth: 1, tint: 'red', head: 0.08 },
  angry: { eye: 0.86, squint: 0.3, brow: -0.25, inner: 0.85, open: 0.1, smile: -0.7, width: 0.95, teeth: 0.4, tint: 'red', head: 0.1 },
  yell: { eye: 1.1, squint: 0.15, brow: -0.15, inner: 0.85, open: 0.95, smile: -0.35, width: 1.1, teeth: 1, tint: 'red' },
  sad: { eye: 0.92, squint: 0.08, brow: 0.25, inner: -0.85, open: 0.04, smile: -0.75, width: 0.9, pout: 1, head: 0.1 },
  cry: { eye: 0.12, squint: 0.6, brow: 0.25, inner: -0.85, open: 0.55, smile: -0.9, width: 1.15, teeth: 0.6, tears: true, blush: 0.9, tint: 'red', head: 0.12 },
  smug: { eye: 0.62, squint: 0.3, brow: 0.1, inner: 0.2, open: 0, smile: 0.55, width: 1, asym: 0.75, browAsym: 0.5, head: -0.05 },
  sleep: { eye: 0, squint: 0.2, brow: -0.05, inner: 0, open: 0.18, smile: 0, width: 0.75, pucker: 0.5, head: 0.25 },
  disgust: { eye: 0.6, squint: 0.5, brow: -0.1, inner: 0.5, open: 0.12, smile: -0.4, width: 1.05, asym: -0.5, teeth: 0.6, head: 0.08 },
};
const DEF = { eye: 1, squint: 0, brow: 0, inner: 0, open: 0, smile: 0, width: 1, pucker: 0, asym: 0, browAsym: 0, teeth: 0, blush: 0, pout: 0, head: 0 };

// ---------------- the mouth ----------------
// Two lips swept along curves that follow the face, a dark inside, teeth and a tongue. The shape is
// rebuilt from a handful of numbers (open, smile, width, pucker, asym) whenever they change.
class Mouth {
  constructor(parent, r, skin, curve) {
    this.r = r; this.curve = curve;
    const lipC = new THREE.Color(skin).lerp(new THREE.Color('#c0505f'), 0.38).multiplyScalar(0.92);
    this.lipMat = new THREE.MeshStandardMaterial({ color: lipC, roughness: 0.45 });
    this.N = 18; this.M = 8;
    this.upper = this.tube(); this.lower = this.tube();
    const inner = new THREE.BufferGeometry();
    inner.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.N * 2 * 3), 3));
    const idx = []; for (let i = 0; i < this.N - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    inner.setIndex(idx);
    this.innerMat = new THREE.MeshBasicMaterial({ color: '#3b1119', side: THREE.DoubleSide });
    this.inner = new THREE.Mesh(inner, this.innerMat);
    this.teethMat = new THREE.MeshStandardMaterial({ color: '#f4f1e8', roughness: 0.35 });
    this.topTeeth = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.teethMat);
    this.botTeeth = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.teethMat);
    this.tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: '#d4606f', roughness: 0.5 }));
    this.g = new THREE.Group();
    this.g.add(this.inner, this.topTeeth, this.botTeeth, this.tongue, this.upper, this.lower);
    this.g.traverse(o => { o.castShadow = false; });
    parent.add(this.g);
    this.p = { open: 0, smile: 0, width: 1, pucker: 0, asym: 0, teeth: 0, pout: 0 };
    this.key = '';
  }
  tube() {
    const g = new THREE.BufferGeometry();
    const N = this.N, M = this.M;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * M * 3), 3));
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M, c = (i + 1) * M + j, d = (i + 1) * M + (j + 1) % M; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx);
    const m = new THREE.Mesh(g, this.lipMat);
    return m;
  }
  // lip center line: x across, y up, z out of the face
  build(p) {
    const k = [p.open, p.smile, p.width, p.pucker, p.asym, p.teeth, p.pout].map(v => v.toFixed(3)).join();
    if (k === this.key) return; this.key = k;
    const r = this.r, N = this.N, M = this.M;
    const hw = 0.2 * r * p.width * (1 - 0.42 * p.pucker);
    const open = p.open * 0.36 * r;
    const lift = p.smile * 0.075 * r;
    const yU = t => open * 0.42 * (1 - t * t) * (1 - 0.15 * p.pucker) + lift * t * t + p.asym * 0.03 * r * t * (p.smile >= 0 ? 1 : -1) - 0.006 * r * Math.exp(-((t / 0.18) ** 2));
    const yL = t => -open * 0.58 * (1 - t * t) * (1 - 0.15 * p.pucker) + lift * t * t * 0.85 + p.asym * 0.025 * r * t * (p.smile >= 0 ? 1 : -1);
    const zc = x => -this.curve * x * x + (p.pucker * 0.03 * r) * (1 - (x / Math.max(hw, 1e-5)) ** 2);
    const lip = (mesh, yf, ry, rz, under) => {
      const pos = mesh.geometry.attributes.position;
      for (let i = 0; i < N; i++) {
        const t = -1 + (2 * i) / (N - 1), x = t * hw, y = yf(t), z = zc(x) + (under ? 0.004 * r * p.pout : 0);
        const th = 0.3 + 0.7 * Math.sqrt(Math.max(0, 1 - t * t)) * (1 + (under ? 0.35 * p.pout : 0) + 0.25 * p.pucker);
        for (let j = 0; j < M; j++) {
          const a = (j / M) * Math.PI * 2;
          pos.setXYZ(i * M + j, x, y + Math.sin(a) * ry * th + (under ? -ry * th * 0.6 : ry * th * 0.6), z + Math.cos(a) * rz * th);
        }
      }
      pos.needsUpdate = true; mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingSphere();
    };
    lip(this.upper, yU, 0.03 * r, 0.03 * r, false);
    lip(this.lower, yL, 0.038 * r, 0.034 * r, true);
    // the dark inside of the mouth between the lips
    const ip = this.inner.geometry.attributes.position;
    for (let i = 0; i < N; i++) {
      const t = -1 + (2 * i) / (N - 1), x = t * hw * 0.97, z = zc(x) - 0.012 * r;
      ip.setXYZ(i * 2, x, yU(t), z); ip.setXYZ(i * 2 + 1, x, yL(t), z);
    }
    ip.needsUpdate = true; this.inner.geometry.computeBoundingSphere();
    const gap = Math.max(0, yU(0) - yL(0));
    this.inner.visible = gap > 0.004 * r;
    const showTop = gap > 0.012 * r || (p.teeth > 0.5 && p.smile > 0.5);
    this.topTeeth.visible = showTop;
    this.topTeeth.scale.set(hw * 1.15, Math.min(0.065 * r, gap * 0.4 + 0.02 * r), 0.02 * r);
    this.topTeeth.position.set(0, yU(0) - this.topTeeth.scale.y * 0.4, zc(0) - 0.012 * r);
    this.botTeeth.visible = gap > 0.09 * r || (p.teeth > 0.8 && gap > 0.03 * r);
    this.botTeeth.scale.set(hw * 0.95, Math.min(0.045 * r, gap * 0.25), 0.02 * r);
    this.botTeeth.position.set(0, yL(0) + this.botTeeth.scale.y * 0.45, zc(0) - 0.016 * r);
    this.tongue.visible = gap > 0.06 * r;
    this.tongue.scale.set(hw * 0.6, Math.min(0.06 * r, gap * 0.25), 0.06 * r);
    this.tongue.position.set(0, yL(0) + this.tongue.scale.y * 0.5, zc(0) - 0.05 * r);
  }
}

// ---------------- FACE ----------------
export class Face {
  // head: the head group; r: head radius; cy: head center height in the group;
  // o.shape(d) -> point on the skin (relative to the head center); o.skinMat: the head material (tinted for blushes)
  constructor(head, r, cy, o = {}) {
    this.head = head; this.r = r; this.cy = cy; this.o = o;
    this.own = new Set();
    const shape = o.shape || (d => d.clone().multiplyScalar(r));
    const at = (d, out = 0) => { const p = shape(d); const n = d.clone(); return p.addScaledVector(n, out).add(V(0, cy, 0)); };
    this.at = at;
    const skinC = o.skin || '#f1c27d';
    this.skinMat = o.skinMat || null;
    this.baseColor = new THREE.Color('#ffffff');
    const er = (o.kid ? 0.128 : 0.112) * r * (o.eyeScale || 1);
    this.er = er;
    // ---- eyes ----
    this.eyes = []; this.lids = []; this.lower = []; this.irises = []; this.pupils = [];
    const irisC = o.eyeColor || '#5a3a22';
    for (const sx of [1, -1]) {
      const d = dir(sx * 0.32, 0.12, 0.94);
      const g = new THREE.Group(); g.position.copy(at(d, -er * 0.5)); g.rotation.y = sx * 0.1;
      const inner = new THREE.Group(); inner.scale.set(1, 0.98, 0.8); g.add(inner);
      const white = new THREE.Mesh(new THREE.SphereGeometry(er, 20, 14), sclera); inner.add(white);
      const iris = new THREE.Group(); inner.add(iris);
      const irm = new THREE.Mesh(onEye(er * 0.6, er * 1.004, 24, 5), new THREE.MeshStandardMaterial({ map: irisTex(irisC), roughness: 0.25, transparent: true })); this.own.add(irm.material);
      iris.add(irm);
      const pu = new THREE.Mesh(onEye(er * 0.25, er * 1.008, 18, 3), pupilMat); iris.add(pu);
      const gl = new THREE.Mesh(onEye(er * 0.065, er * 1.012, 8, 1, er * 0.2, er * 0.22), glintMat); iris.add(gl);
      const skinLid = toon(skinC);
      const lidG = new THREE.Group(); inner.add(lidG);
      const lid = new THREE.Mesh(new THREE.SphereGeometry(er * 1.07, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), skinLid); lidG.add(lid);
      const lash = new THREE.Mesh(new THREE.TorusGeometry(er * 1.07, er * (o.lashes ? 0.1 : 0.05), 5, 22, Math.PI), new THREE.MeshStandardMaterial({ color: '#16110e', roughness: 0.8 }));
      lash.rotation.x = Math.PI / 2; lidG.add(lash); this.own.add(lash.material);
      if (o.lashes) { const fl = new THREE.Mesh(new THREE.ConeGeometry(er * 0.12, er * 0.42, 5), lash.material); fl.position.set(sx * er * 1.12, er * 0.08, er * 0.25); fl.rotation.z = -sx * 1.1; lidG.add(fl); }
      const lowG = new THREE.Group(); inner.add(lowG);
      const low = new THREE.Mesh(new THREE.SphereGeometry(er * 1.05, 18, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), skinLid); lowG.add(low);
      head.add(g); this.eyes.push(g); this.lids.push(lidG); this.lower.push(lowG); this.irises.push(iris); this.pupils.push(pu);
    }
    // ---- brows: a soft tapered arc of hair ----
    this.brows = [];
    const browMat = new THREE.MeshStandardMaterial({ color: o.browColor || '#3b2a20', roughness: 0.9 }); this.own.add(browMat);
    for (const sx of [1, -1]) {
      const pts = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(V(sx * (0.06 + t * 0.32) * r * 0.9, Math.sin(t * Math.PI) * 0.035 * r - t * 0.012 * r, 0)); }
      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, 12, 0.02 * r * (o.thickBrows ? 1.4 : 1), 5, false);
      // taper toward the outer end
      const pp = geo.attributes.position;
      for (let i = 0; i < pp.count; i++) { const x = pp.getX(i); const t = clamp((Math.abs(x) / (r * 0.9) - 0.06) / 0.32, 0, 1); const c = curve.getPoint(t); const k = 1 - 0.55 * t; pp.setXYZ(i, c.x + (pp.getX(i) - c.x) * k, c.y + (pp.getY(i) - c.y) * k, (pp.getZ(i) - c.z) * k * 0.6); }
      geo.computeVertexNormals();
      const b = new THREE.Mesh(geo, browMat);
      const base = at(dir(sx * 0.22, 0.32, 0.93), 0.012 * r);
      b.position.copy(base); b.rotation.y = sx * 0.28;
      b.userData = { sx, base: base.clone() };
      head.add(b); this.brows.push(b);
    }
    // ---- mouth ----
    const mp = at(F.lips, 0.004 * r);
    const corner = at(dir(0.2, -0.42, 0.88), 0.004 * r);
    const curve = Math.max(0, (mp.z - corner.z)) / Math.max(1e-6, (corner.x - mp.x) ** 2);
    const mg = new THREE.Group(); mg.position.copy(mp); head.add(mg);
    this.mouthGroup = mg;
    this.mouth = new Mouth(mg, r, skinC, curve);
    if (o.fangs) for (const sx of [1, -1]) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.03 * r, 0.1 * r, 6), this.mouth.teethMat); f.rotation.z = Math.PI; f.position.set(sx * 0.09 * r, -0.03 * r, -0.005 * r); f.castShadow = false; mg.add(f); }
    // ---- blush, sweat, tears ----
    this.cheeks = [];
    const blushMat = new THREE.MeshBasicMaterial({ color: '#ff6f7d', transparent: true, opacity: 0, depthWrite: false });
    for (const sx of [1, -1]) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.11 * r, 18), blushMat); const p = at(dir(sx * 0.5, -0.12, 0.86), 0.006 * r); c.position.copy(p); c.lookAt(p.clone().add(dir(sx * 0.5, -0.12, 0.86))); c.scale.y = 0.65; head.add(c); this.cheeks.push(c); }
    this.blushMat = blushMat;
    for (const m of [blushMat, this.mouth.lipMat, this.mouth.innerMat, this.mouth.teethMat, this.mouth.tongue.material]) this.own.add(m);
    this.alwaysBlush = o.kid ? 0.25 : 0;
    this.tears = []; this.drops = [];
    this.headTilt = 0;
    this.eyeOpen = 1; this.blinkT = rand(1, 4); this.blinking = 0;
    this.lookT = rand(0.5, 2); this.look = new THREE.Vector2(); this.lookGoal = new THREE.Vector2();
    this.talking = 0; this.talkT = 0; this.talkOpen = 0; this.talkGoal = 0;
    this.cur = { ...DEF, ...EXPR.smile }; this.goal = { ...this.cur };
    this.set('smile', true);
  }
  set(expr, instant = false) {
    this.expr = expr;
    this.cfg = { ...DEF, ...(EXPR[expr] || EXPR.smile) };
    this.goal = { ...this.cfg };
    if (instant) this.cur = { ...this.goal };
  }
  update(dt, t) {
    const k = Math.min(1, dt * 10);
    for (const key of Object.keys(DEF)) this.cur[key] = lerp(this.cur[key] ?? DEF[key], this.goal[key] ?? DEF[key], k);
    const c = this.cur;
    // blinking
    this.blinkT -= dt;
    if (this.blinkT < 0) { this.blinking = 0.12; this.blinkT = rand(1.8, 5); }
    let open = c.eye;
    if (this.blinking > 0) { this.blinking -= dt; if (open > 0.5) open = 0.03; }
    this.eyeOpen += (open - this.eyeOpen) * Math.min(1, dt * 26);
    const upA = -0.75 + (1 - Math.min(1.15, this.eyeOpen)) * 2.45;
    for (const l of this.lids) l.rotation.x = Math.min(1.85, upA);
    for (const l of this.lower) l.rotation.x = 0.82 - c.squint * 0.62;
    const wide = c.eye > 1.1 ? 1 + (c.eye - 1) * 0.35 : 1;
    for (const e of this.eyes) e.scale.setScalar(wide);
    const pupil = this.goal.eye > 1.2 ? 1.25 : this.expr === 'angry' ? 0.85 : 1;
    for (const p of this.pupils) p.scale.setScalar(lerp(p.scale.x, pupil, k));
    // eyes wander, and look back at you while talking
    this.lookT -= dt;
    if (this.lookT < 0) {
      this.lookT = rand(0.7, 2.8);
      if (Math.random() < 0.45 || this.talking > 0) this.lookGoal.set(0, 0);
      else this.lookGoal.set(rand(-1, 1), rand(-0.6, 0.6));
      if (this.expr === 'sad' || this.expr === 'worried') this.lookGoal.y = -0.7;
    }
    this.look.lerp(this.lookGoal, Math.min(1, dt * 18));
    for (const ir of this.irises) ir.position.set(this.look.x * this.er * 0.24, this.look.y * this.er * 0.16, 0);
    // brows
    for (const b of this.brows) {
      const sx = b.userData.sx;
      const raise = (c.brow + (sx > 0 ? c.browAsym : -c.browAsym * 0.3)) * 0.07 * this.r;
      b.position.set(b.userData.base.x, b.userData.base.y + raise, b.userData.base.z);
      b.rotation.z = -sx * c.inner * 0.32;
    }
    // talking: the mouth opens and closes on syllables
    let talkAdd = 0;
    if (this.talking > 0) {
      this.talking -= dt; this.talkT -= dt;
      if (this.talkT < 0) { this.talkT = rand(0.07, 0.14); this.talkGoal = Math.random() < 0.3 ? 0.05 : rand(0.25, 0.6); }
    } else this.talkGoal = 0;
    this.talkOpen += (this.talkGoal - this.talkOpen) * Math.min(1, dt * 22);
    talkAdd = this.talkOpen;
    this.mouth.build({ open: Math.min(1, c.open + talkAdd * (1 - c.open)), smile: c.smile, width: c.width, pucker: c.pucker, asym: c.asym, teeth: c.teeth, pout: c.pout });
    // blush and skin tint
    this.blushMat.opacity = Math.min(0.55, (Math.max(c.blush, this.alwaysBlush)) * 0.5);
    if (this.skinMat) {
      const tint = this.cfg.tint === 'red' ? [1, 0.84, 0.82] : this.cfg.tint === 'pale' ? [0.93, 0.97, 1.0] : [1, 1, 1];
      const col = this.skinMat.color; col.setRGB(lerp(col.r, tint[0], dt * 3), lerp(col.g, tint[1], dt * 3), lerp(col.b, tint[2], dt * 3));
    }
    this.headTilt = c.head;
    // sweat drops when scared or worried
    if (this.cfg.sweat && Math.random() < dt * 1.2 && this.drops.length < 2) {
      const sx = Math.random() < 0.5 ? 1 : -1;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.035 * this.r, 8, 6), new THREE.MeshStandardMaterial({ color: '#bfe8ff', roughness: 0.05, transparent: true, opacity: 0.85 }));
      m.scale.set(0.8, 1.3, 0.6); m.position.copy(this.at(dir(sx * 0.62, 0.45, 0.66), 0.02 * this.r)); m.userData.v = 0; m.userData.life = 1.6;
      this.head.add(m); this.drops.push(m);
    }
    for (let i = this.drops.length - 1; i >= 0; i--) { const m = this.drops[i]; m.userData.life -= dt; m.userData.v += dt * 0.05 * this.r; m.position.y -= m.userData.v; if (m.userData.life <= 0) { this.head.remove(m); m.geometry.dispose(); m.material.dispose(); this.drops.splice(i, 1); } }
    // tears when crying
    if (this.cfg.tears && Math.random() < dt * 8 && this.tears.length < 10) {
      const tr = new THREE.Mesh(new THREE.SphereGeometry(0.04 * this.r, 8, 6), new THREE.MeshStandardMaterial({ color: '#8fdcff', roughness: 0.05, transparent: true, opacity: 0.9 }));
      const eye = this.eyes[Math.random() < 0.5 ? 0 : 1];
      tr.position.copy(eye.position).add(V(0, -0.11 * this.r, 0.06 * this.r));
      tr.userData.v = V(eye.position.x * 3 * rand(0.5, 1.5), 1.6 * this.r, 0.25);
      this.head.add(tr); this.tears.push(tr);
    }
    for (let i = this.tears.length - 1; i >= 0; i--) {
      const tr = this.tears[i];
      tr.userData.v.y -= dt * 3.5;
      tr.position.addScaledVector(tr.userData.v, dt);
      if (tr.position.y < this.cy - 1.6 * this.r) { this.head.remove(tr); tr.geometry.dispose(); tr.material.dispose(); this.tears.splice(i, 1); }
    }
  }
  talk(sec) { this.talking = sec; if (sec > 0) this.lookGoal.set(0, 0); }
  dispose() {
    const mats = new Set();
    this.head.traverse(o => { if (o.isMesh && o.material && o.material !== sclera && o.material !== pupilMat && o.material !== glintMat && !o.material.userData.shared) mats.add(o.material); });
    for (const m of [this.mouth.lipMat, this.mouth.innerMat, this.mouth.teethMat, this.mouth.tongue.material, this.blushMat]) mats.add(m);
    // toon() materials are shared across people; only dispose the ones this face made
    for (const m of mats) if (this.own.has(m)) m.dispose();
  }
  // for older code that toggled mouth shapes directly
  showMouth() {}
}
