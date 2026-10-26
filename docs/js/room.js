import * as THREE from 'three';
import { toon, canvasTexture, TABLE_TOP, ease, rand } from './engine.js';
import { drawPoster, drawSky, drawIcon } from './themes.js';

export function box(w, h, d, color, x = 0, y = 0, z = 0, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? toon(color) : color);
  m.position.set(x, y, z);
  m.castShadow = cast; m.receiveShadow = true;
  return m;
}
export function cyl(rt, rb, h, color, x = 0, y = 0, z = 0, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof color === 'string' ? toon(color) : color);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function sph(r, color, x = 0, y = 0, z = 0, seg = 20) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), typeof color === 'string' ? toon(color) : color);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
function planeTex(w, h, tex, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex }));
  m.position.set(x, y, z); m.rotation.y = ry;
  m.receiveShadow = true;
  return m;
}

function textPoster(lines, { bg = '#fff', fg = '#1d2b36', w = 512, h = 384, border = '#ff8a2a' } = {}) {
  return canvasTexture(w, h, (ctx, W, H) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = border; ctx.lineWidth = 18; ctx.strokeRect(9, 9, W - 18, H - 18);
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const total = lines.reduce((a, l) => a + l.size * 1.15, 0);
    let y = H / 2 - total / 2;
    for (const l of lines) {
      ctx.font = `${l.bold ? 700 : 500} ${l.size}px Fredoka, "Arial Rounded MT Bold", Arial, sans-serif`;
      ctx.fillStyle = l.color || fg;
      y += l.size * 0.575;
      ctx.fillText(l.text, W / 2, y);
      y += l.size * 0.575;
    }
  }).tex;
}

export function buildRoom(scene) {
  const R = { spots: {}, door: null };

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight('#ffffff', '#8fbfb5', 1.15);
  scene.add(hemi);
  R.hemi = hemi;
  const sun = new THREE.DirectionalLight('#fff1dc', 2.7);
  sun.position.set(2.5, 6.5, 4.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -6; sc.near = 1; sc.far = 18;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  R.sun = sun;

  // ---------- floor & walls ----------
  // speckled vinyl tiles like a real clinic floor
  const floorTex = canvasTexture(512, 512, (ctx, W, H) => {
    const n = 4, s = W / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#e3f1ed' : '#d3e8e2';
      ctx.fillRect(i * s, j * s, s, s);
    }
    for (let k = 0; k < 5200; k++) {
      const c = Math.random();
      ctx.fillStyle = c < 0.4 ? 'rgba(90,120,115,0.22)' : c < 0.7 ? 'rgba(255,255,255,0.55)' : c < 0.85 ? 'rgba(120,150,170,0.25)' : 'rgba(170,140,120,0.2)';
      ctx.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2.2, 1 + Math.random() * 2.2);
    }
    ctx.strokeStyle = 'rgba(80,120,115,0.3)'; ctx.lineWidth = 2;
    for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(W, i * s); ctx.stroke(); }
  }).tex;
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(5, 3.5);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.38, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0.6);
  floor.receiveShadow = true;
  scene.add(floor);

  const wallC = '#dff3ee', wainC = '#9fd8cc', trimC = '#ff8a2a';
  const paintWall = (ctx, W, H, base) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 2600; k++) { ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0,40,30,0.035)' : 'rgba(255,255,255,0.08)'; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  };
  const wallCT = canvasTexture(256, 256, (ctx, W, H) => paintWall(ctx, W, H, wallC));
  const wallTex = wallCT.tex;
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(4, 2);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.92 });
  const back = box(9.4, 3.6, 0.1, wallMat, 0, 1.8, -2.65, false); scene.add(back);
  const left = box(0.1, 3.6, 7.5, wallMat, -4.65, 1.8, 0.9, false); scene.add(left);
  const right = box(0.1, 3.6, 7.5, wallMat, 4.65, 1.8, 0.9, false); scene.add(right);
  // baseboards
  scene.add(box(9.4, 0.1, 0.03, '#7fb8ad', 0, 0.05, -2.57, false));
  scene.add(box(0.03, 0.1, 7.5, '#7fb8ad', -4.57, 0.05, 0.9, false));
  scene.add(box(0.03, 0.1, 7.5, '#7fb8ad', 4.57, 0.05, 0.9, false));
  // ceiling light panels (they glow a little)
  const panelMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff8e8', emissiveIntensity: 0.9 });
  for (const [x, z] of [[-1.6, -0.6], [1.6, -0.6], [-1.6, 1.4], [1.6, 1.4]]) { const pnl = box(1.1, 0.04, 0.55, panelMat, x, 3.58, z, false); scene.add(pnl); scene.add(box(1.16, 0.03, 0.61, '#cfd8dc', x, 3.6, z, false)); }
  const wainMat = toon(wainC), trimMat = toon(trimC);
  scene.add(box(9.4, 1.0, 0.04, wainMat, 0, 0.5, -2.59, false));
  scene.add(box(0.04, 1.0, 7.5, wainMat, -4.59, 0.5, 0.9, false));
  scene.add(box(0.04, 1.0, 7.5, wainMat, 4.59, 0.5, 0.9, false));
  scene.add(box(9.4, 0.07, 0.06, trimMat, 0, 1.02, -2.58, false));
  scene.add(box(0.06, 0.07, 7.5, trimMat, -4.58, 1.02, 0.9, false));
  scene.add(box(0.06, 0.07, 7.5, trimMat, 4.58, 1.02, 0.9, false));

  // ---------- exam table ----------
  const table = new THREE.Group();
  table.add(box(1.5, 0.08, 0.6, '#cfd8dc', 0, 0.06, 0));
  for (const [x, z] of [[-0.65, -0.22], [0.65, -0.22], [-0.65, 0.22], [0.65, 0.22]]) table.add(cyl(0.035, 0.035, 0.55, '#b0bec5', x, 0.36, z, 12));
  table.add(box(1.45, 0.3, 0.55, '#eef3f5', 0, 0.42, 0));
  for (const x of [-0.45, 0, 0.45]) { table.add(box(0.4, 0.2, 0.02, '#d6e4ea', x, 0.42, 0.28)); table.add(sph(0.022, '#ff8a2a', x, 0.42, 0.295, 10)); }
  table.add(box(2.1, 0.13, 0.8, '#26a69a', 0, TABLE_TOP - 0.065, 0));
  const paper = box(2.0, 0.006, 0.52, '#ffffff', 0, TABLE_TOP + 0.003, 0);
  paper.castShadow = false;
  table.add(paper);
  table.add(cyl(0.05, 0.05, 0.56, '#ffffff', -1.05, TABLE_TOP - 0.02, 0, 16).rotateX(Math.PI / 2));
  scene.add(table);
  R.table = table;

  // ---------- counter & upper cabinets ----------
  const counter = new THREE.Group();
  counter.position.set(-2.55, 0, -2.27);
  counter.add(box(2.2, 0.9, 0.65, '#f6f2ea', 0, 0.45, 0));
  for (const x of [-0.8, -0.27, 0.27, 0.8]) {
    counter.add(box(0.48, 0.36, 0.02, '#cfe3e8', x, 0.62, 0.33));
    counter.add(box(0.48, 0.36, 0.02, '#cfe3e8', x, 0.22, 0.33));
    counter.add(box(0.12, 0.03, 0.03, '#90a4ae', x, 0.72, 0.35));
    counter.add(box(0.12, 0.03, 0.03, '#90a4ae', x, 0.32, 0.35));
  }
  counter.add(box(2.3, 0.05, 0.7, '#546e7a', 0, 0.925, 0));
  counter.add(box(0.5, 0.02, 0.36, '#b0bec5', -0.55, 0.951, 0));
  const faucet = cyl(0.02, 0.02, 0.25, '#cfd8dc', -0.55, 1.07, -0.22, 10); counter.add(faucet);
  counter.add(box(0.03, 0.03, 0.16, '#cfd8dc', -0.55, 1.19, -0.15));
  // jars
  const glass = new THREE.MeshStandardMaterial({ color: '#e0f7fa', transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.1 });
  const jar1 = cyl(0.1, 0.1, 0.24, glass, 0.15, 1.07, 0, 20); counter.add(jar1);
  for (let i = 0; i < 9; i++) counter.add(sph(0.035, '#ffffff', 0.15 + rand(-0.05, 0.05), 0.99 + rand(0, 0.12), rand(-0.05, 0.05), 8));
  counter.add(cyl(0.105, 0.105, 0.03, '#ff8a2a', 0.15, 1.2, 0, 20));
  const jar2 = cyl(0.11, 0.11, 0.2, glass, 0.55, 1.05, 0, 20); counter.add(jar2);
  const lolliColors = ['#ff5d8f', '#ffd23f', '#3ec1d3', '#8ac926', '#ff8a2a', '#9b5de5'];
  for (let i = 0; i < 7; i++) {
    const lx = 0.55 + rand(-0.06, 0.06), lz = rand(-0.06, 0.06);
    counter.add(cyl(0.006, 0.006, 0.22, '#ffffff', lx, 1.1, lz, 6));
    counter.add(sph(0.04, lolliColors[i % 6], lx, 1.23 + rand(0, 0.04), lz, 10));
  }
  counter.add(box(0.3, 0.38, 0.12, '#ffffff', 0.95, 1.18, -0.2)); // paper towel box
  scene.add(counter);
  const upper = box(2.2, 0.7, 0.36, '#f6f2ea', -2.55, 2.32, -2.44); scene.add(upper);
  for (const x of [-3.1, -2.0]) { scene.add(box(1.05, 0.64, 0.02, '#cfe3e8', x, 2.32, -2.25)); scene.add(box(0.03, 0.14, 0.03, '#90a4ae', x + 0.4, 2.15, -2.23)); }
  R.lollipopJar = new THREE.Vector3(-2.0, 1.1, -2.27);

  // ---------- posters ----------
  const eye = canvasTexture(320, 448, (ctx, W, H) => {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, W - 10, H - 10);
    ctx.fillStyle = '#1d2b36'; ctx.textAlign = 'center';
    const rows = [['E', 92], ['F P', 56], ['T O Z', 42], ['L P E D', 32], ['P E C F D', 25], ['I M A D O C', 19], ['N O T R E A L L Y', 14], ['D A E H G I B  : E D O C', 6]];
    let y = 26;
    for (const [t, s] of rows) { y += s; ctx.font = `700 ${s}px Arial, sans-serif`; ctx.fillText(t, W / 2, y); y += 12; }
  }, 2).tex;
  const eyeChart = planeTex(0.62, 0.86, eye, 1.25, 1.62, -2.585); scene.add(eyeChart);
  const washPoster = planeTex(0.72, 0.54, textPoster([
    { text: 'WASH YOUR', size: 64, bold: true }, { text: 'HANDS', size: 96, bold: true, color: '#2bb3a3' }, { text: '(please)', size: 40 },
  ]), -2.55, 1.5, -2.585); scene.add(washPoster);
  scene.add(planeTex(0.58, 0.44, textPoster([
    { text: 'DIPLOMA', size: 56, bold: true, color: '#b5651d' }, { text: 'Doctor of Medicine', size: 34 }, { text: '(ish)', size: 30 }, { text: 'Online University', size: 28, color: '#666' },
  ], { bg: '#fff8e1', border: '#c9a227' }), 2.2, 1.95, -2.585));

  // ---------- window ----------
  const skyCT = canvasTexture(512, 352, (ctx, W, H) => drawSky(ctx, W, H, 'day'));
  const sky = skyCT.tex;
  const oldSky = canvasTexture(8, 8, (ctx, W, H) => {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#6ec6ff'); g.addColorStop(1, '#d6f0ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    for (const [x, y, s] of [[110, 90, 1], [350, 60, 0.8], [420, 170, 1.1]]) {
      ctx.beginPath(); ctx.arc(x, y, 34 * s, 0, 7); ctx.arc(x + 40 * s, y - 14 * s, 40 * s, 0, 7); ctx.arc(x + 80 * s, y, 30 * s, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#7cb342'; ctx.beginPath(); ctx.ellipse(W / 2, H + 60, W * 0.8, 150, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5d4037'; ctx.fillRect(90, 210, 18, 90);
    ctx.fillStyle = '#43a047'; ctx.beginPath(); ctx.arc(99, 200, 52, 0, 7); ctx.fill();
  }).tex;
  oldSky.dispose();
  const winM = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshBasicMaterial({ map: sky }));
  winM.position.set(-0.2, 1.9, -2.595); scene.add(winM);
  scene.add(box(1.72, 0.07, 0.08, '#ffffff', -0.2, 2.48, -2.57));
  scene.add(box(1.72, 0.07, 0.08, '#ffffff', -0.2, 1.32, -2.57));
  scene.add(box(0.07, 1.2, 0.08, '#ffffff', -1.03, 1.9, -2.57));
  scene.add(box(0.07, 1.2, 0.08, '#ffffff', 0.63, 1.9, -2.57));
  scene.add(box(0.05, 1.1, 0.06, '#ffffff', -0.2, 1.9, -2.57));
  scene.add(box(1.8, 0.12, 0.2, '#f0e6d2', -0.2, 1.27, -2.52));
  for (let i = 0; i < 5; i++) scene.add(box(1.6, 0.025, 0.02, '#fff8e1', -0.2, 2.42 - i * 0.04, -2.55));

  // ---------- clock ----------
  const clock = new THREE.Group(); clock.position.set(-0.2, 2.85, -2.58);
  const face = cyl(0.2, 0.2, 0.04, '#ffffff', 0, 0, 0, 32); face.rotation.x = Math.PI / 2; clock.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 32), toon('#ff8a2a')); clock.add(rim);
  const hH = box(0.025, 0.11, 0.01, '#1d2b36', 0, 0.05, 0.03); const hP = new THREE.Group(); hP.position.z = 0.0; hP.add(hH); clock.add(hP);
  const mH = box(0.016, 0.16, 0.01, '#1d2b36', 0, 0.075, 0.035); const mP = new THREE.Group(); mP.add(mH); clock.add(mP);
  scene.add(clock);
  R.clock = clock;
  R.updateClock = () => { const d = new Date(); mP.rotation.z = -(d.getMinutes() + d.getSeconds() / 60) / 60 * Math.PI * 2; hP.rotation.z = -((d.getHours() % 12) + d.getMinutes() / 60) / 12 * Math.PI * 2; };

  // ---------- door ----------
  const doorX = 3.3;
  scene.add(box(1.16, 2.24, 0.1, '#ffffff', doorX, 1.12, -2.6));
  const doorPivot = new THREE.Group(); doorPivot.position.set(doorX - 0.5, 0, -2.52);
  const doorM = box(1.0, 2.12, 0.06, '#ffb703', 0.5, 1.06, 0); doorPivot.add(doorM);
  doorPivot.add(box(0.5, 0.35, 0.065, '#bde0fe', 0.5, 1.6, 0));
  doorPivot.add(sph(0.04, '#90a4ae', 0.88, 1.0, 0.05, 10));
  scene.add(doorPivot);
  const exitSign = planeTex(0.5, 0.18, textPoster([{ text: 'EXAM ROOM 3', size: 64, bold: true, color: '#fff' }], { bg: '#2bb3a3', border: '#1d2b36', w: 512, h: 184 }), doorX, 2.42, -2.585);
  scene.add(exitSign);
  R.door = { x: doorX, z: -2.3, pivot: doorPivot, open: false };
  R.openDoor = (E, open = true) => { const a0 = doorPivot.rotation.y, a1 = open ? 1.4 : 0; return E.tween(0.45, k => { doorPivot.rotation.y = a0 + (a1 - a0) * k; }); };

  // ---------- heart monitor ----------
  const mon = new THREE.Group(); mon.position.set(-1.3, 0, -0.75);
  mon.add(cyl(0.03, 0.03, 1.2, '#b0bec5', 0, 0.6, 0, 10));
  mon.add(cyl(0.25, 0.25, 0.05, '#90a4ae', 0, 0.03, 0, 20));
  mon.add(box(0.55, 0.4, 0.12, '#37474f', 0, 1.38, 0));
  const monCanvas = canvasTexture(256, 180, () => {});
  const monScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.33), new THREE.MeshBasicMaterial({ map: monCanvas.tex }));
  monScreen.position.set(0, 1.38, 0.062); mon.add(monScreen);
  mon.rotation.y = 0.5;
  scene.add(mon);
  const ecg = { bpm: 78, phase: 0, pts: new Array(128).fill(0.5), flat: false, text: null, textT: 0 };
  R.monitor = {
    group: mon,
    setBPM(b) { ecg.bpm = b; }, get bpm() { return ecg.bpm; }, setFlat(f) { ecg.flat = f; },
    showText(lines, sec = 3) { ecg.text = lines; ecg.textT = sec; },
    update(dt) {
      const prev = ecg.phase;
      ecg.phase += dt * ecg.bpm / 60;
      const ph = ecg.phase % 1;
      let v = 0.55;
      if (!ecg.flat) {
        if (ph > 0.1 && ph < 0.14) v = 0.48; else if (ph > 0.14 && ph < 0.18) v = 0.1; else if (ph > 0.18 && ph < 0.22) v = 0.85; else if (ph > 0.35 && ph < 0.45) v = 0.45;
      }
      ecg.pts.push(v); ecg.pts.shift();
      if (ecg.textT > 0) {
        ecg.textT -= dt;
        const ctx = monCanvas.ctx;
        ctx.fillStyle = '#062019'; ctx.fillRect(0, 0, 256, 180);
        ctx.fillStyle = Math.floor(ecg.textT * 3) % 2 ? '#5dffb0' : '#b8ffd9'; ctx.textAlign = 'center'; ctx.font = '700 46px Arial';
        ecg.text.forEach((ln, i) => ctx.fillText(ln, 128, 78 + i * 54 - (ecg.text.length - 1) * 20));
        monCanvas.tex.needsUpdate = true;
        return;
      }
      if (Math.floor(prev * 4) !== Math.floor(ecg.phase * 4)) {
        const ctx = monCanvas.ctx;
        ctx.fillStyle = '#062019'; ctx.fillRect(0, 0, 256, 180);
        ctx.strokeStyle = 'rgba(80,255,170,0.15)'; ctx.lineWidth = 1;
        for (let x = 0; x < 256; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 180); ctx.stroke(); }
        ctx.strokeStyle = ecg.bpm > 140 ? '#ff6b6b' : '#5dffb0'; ctx.lineWidth = 4; ctx.beginPath();
        ecg.pts.forEach((p, i) => { const x = i * 2, y = 30 + p * 110; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();
        ctx.fillStyle = ecg.bpm > 140 ? '#ff6b6b' : '#5dffb0'; ctx.font = '700 34px Arial'; ctx.textAlign = 'right';
        ctx.fillText(ecg.flat ? '--' : String(Math.round(ecg.bpm)), 246, 40);
        ctx.font = '700 14px Arial'; ctx.fillText('BPM', 246, 58);
        monCanvas.tex.needsUpdate = true;
      }
    },
  };

  // ---------- instrument tray stand ----------
  const tray = new THREE.Group(); tray.position.set(1.3, 0, 0.6);
  tray.add(cyl(0.02, 0.02, 0.92, '#b0bec5', 0, 0.46, 0, 8));
  tray.add(cyl(0.2, 0.2, 0.04, '#90a4ae', 0, 0.02, 0, 16));
  tray.add(box(0.55, 0.03, 0.38, '#cfd8dc', 0, 0.93, 0));
  tray.add(box(0.55, 0.05, 0.02, '#b0bec5', 0, 0.96, 0.19));
  tray.add(box(0.55, 0.05, 0.02, '#b0bec5', 0, 0.96, -0.19));
  scene.add(tray);
  R.trayTop = new THREE.Vector3(1.3, 0.97, 0.6);
  // things on the tray: gauze pads, a cotton ball jar, tongue depressors, a kidney dish
  tray.add(box(0.1, 0.012, 0.1, '#ffffff', -0.17, 0.955, -0.08));
  tray.add(box(0.1, 0.012, 0.1, '#f7f7f7', -0.16, 0.967, -0.07));
  tray.add(cyl(0.035, 0.035, 0.09, new THREE.MeshStandardMaterial({ color: '#e0f7fa', transparent: true, opacity: 0.4, roughness: 0.05 }), 0.05, 0.99, -0.08, 14));
  for (let i = 0; i < 6; i++) tray.add(box(0.012, 0.12, 0.003, '#e8d2a6', 0.05 + (i - 2.5) * 0.008, 1.03, -0.08 + (i % 2) * 0.006));
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon('#cfd8dc')); dish.scale.set(1.3, 0.35, 0.7); dish.position.set(0.15, 0.98, 0.07); tray.add(dish);

  // ---------- clinic details: rolling stool, step stool, wall dispensers, sharps box ----------
  const stool = new THREE.Group(); stool.position.set(-0.75, 0, -0.9);
  stool.add(cyl(0.2, 0.2, 0.07, '#37474f', 0, 0.55, 0, 20));
  stool.add(cyl(0.025, 0.025, 0.45, '#90a4ae', 0, 0.3, 0, 10));
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const leg = box(0.26, 0.025, 0.04, '#78909c', Math.cos(a) * 0.12, 0.07, Math.sin(a) * 0.12); leg.rotation.y = -a; stool.add(leg); stool.add(sph(0.03, '#263238', Math.cos(a) * 0.25, 0.03, Math.sin(a) * 0.25, 10)); }
  scene.add(stool);
  const step = new THREE.Group(); step.position.set(-0.62, 0, 0.58);
  step.add(box(0.42, 0.22, 0.3, '#cfd8dc', 0, 0.11, 0)); step.add(box(0.44, 0.02, 0.32, '#37474f', 0, 0.225, 0));
  scene.add(step);
  // pillow at the head of the table
  const pillow = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.32, 6, 14), toon('#ffffff', { roughness: 0.9 })); pillow.rotation.z = Math.PI / 2; pillow.scale.set(0.45, 1, 1); pillow.position.set(-0.85, TABLE_TOP + 0.05, 0); scene.add(pillow);
  // glove boxes, sanitizer and a red sharps box on the back wall by the curtain
  const wallKit = new THREE.Group(); wallKit.position.set(0.95, 0, -2.56);
  for (const [i, c] of [[0, '#7e57c2'], [1, '#42a5f5'], [2, '#26a69a']]) { wallKit.add(box(0.24, 0.12, 0.1, '#ffffff', -0.55 + i * 0.27, 1.17, 0.05)); wallKit.add(box(0.22, 0.03, 0.005, c, -0.55 + i * 0.27, 1.19, 0.101)); wallKit.add(box(0.1, 0.025, 0.006, '#e3f2fd', -0.55 + i * 0.27, 1.15, 0.102)); }
  wallKit.add(box(0.12, 0.2, 0.09, '#eceff1', -2.12, 1.45, 0.045)); wallKit.add(box(0.05, 0.05, 0.03, '#90a4ae', -2.12, 1.33, 0.07));
  wallKit.add(box(0.2, 0.26, 0.14, '#e53935', 0.0, 0.75, 0.07)); wallKit.add(box(0.21, 0.05, 0.15, '#ffd54f', 0.0, 0.9, 0.07));
  scene.add(wallKit);
  // outlet and light switch
  scene.add(box(0.07, 0.11, 0.015, '#ffffff', 2.55, 1.15, -2.58)); scene.add(box(0.07, 0.11, 0.015, '#ffffff', -0.9, 0.35, -2.58));

  // ================= HIDING SPOTS =================
  const spot = (id, label, group, anchor, extra) => { R.spots[id] = { id, label, group, anchor, ...extra }; scene.add(group); return R.spots[id]; };

  // supply cabinet (tall, against left wall, door faces +x)
  {
    const g = new THREE.Group(); g.position.set(-4.3, 0, -0.45);
    g.add(box(0.58, 2.0, 1.0, '#e3f2fd', 0, 1.0, 0));
    const dp = new THREE.Group(); dp.position.set(0.3, 0, 0.49);
    dp.add(box(0.04, 1.9, 0.96, '#8ecae6', 0, 1.0, -0.48));
    dp.add(box(0.05, 0.2, 0.04, '#90a4ae', 0.02, 1.0, -0.88));
    const lab = planeTex(0.6, 0.2, textPoster([{ text: 'SUPPLIES', size: 72, bold: true }], { w: 512, h: 170, border: '#1d2b36' }), 0.025, 1.65, -0.48, Math.PI / 2);
    dp.add(lab);
    g.add(dp);
    const s = spot('cabinet', 'supply cabinet', g, new THREE.Vector3(-3.65, 0, -0.45), { pan: -0.9 });
    s.tell = E => E.tween(0.6, (k, raw) => { dp.rotation.y = Math.sin(raw * Math.PI * 6) * 0.08 * (1 - raw); }, ease.linear);
    s.open = E => E.tween(0.4, k => { dp.rotation.y = k * 1.5; });
    s.close = E => E.tween(0.4, k => { dp.rotation.y = 1.5 * (1 - k); });
    s.fake = 'A plastic skeleton. Probably plastic. Let\'s say plastic.';
  }
  // curtain
  {
    const g = new THREE.Group(); g.position.set(1.95, 0, -2.05);
    g.add(cyl(0.015, 0.015, 1.4, '#b0bec5', 0, 2.45, 0, 8).rotateZ(Math.PI / 2));
    const geo = new THREE.PlaneGeometry(1.3, 2.2, 40, 4);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 22) * 0.04);
    geo.computeVertexNormals();
    const ctex = canvasTexture(256, 256, (ctx, W, H) => { ctx.fillStyle = '#a0c4ff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#bde0fe'; for (let x = 0; x < W; x += 32) ctx.fillRect(x, 0, 14, H); }).tex;
    const cm = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: ctex, side: THREE.DoubleSide }));
    cm.position.set(0, 1.32, 0); cm.castShadow = true;
    g.add(cm);
    const feet = new THREE.Group();
    feet.add(box(0.09, 0.07, 0.18, '#ff5d8f', -0.07, 0.035, 0.12)); feet.add(box(0.09, 0.07, 0.18, '#ff5d8f', 0.07, 0.035, 0.12));
    feet.position.set(0.1, 0, -0.1); feet.visible = false; g.add(feet);
    const s = spot('curtain', 'curtain', g, new THREE.Vector3(1.95, 0, -1.6), { pan: 0.4 });
    s.tell = async E => { feet.visible = true; await E.tween(0.9, (k, raw) => { cm.rotation.y = Math.sin(raw * 20) * 0.04; feet.position.z = -0.1 + Math.sin(raw * Math.PI) * 0.12; }, ease.linear); feet.visible = false; cm.rotation.y = 0; };
    s.open = E => E.tween(0.4, k => { cm.scale.x = 1 - 0.6 * k; cm.position.x = -0.26 * k; });
    s.close = E => E.tween(0.4, k => { cm.scale.x = 0.4 + 0.6 * k; cm.position.x = -0.26 * (1 - k); });
    s.fake = 'Just a very surprised janitor eating a sandwich.';
  }
  // hamper
  {
    const g = new THREE.Group(); g.position.set(3.85, 0, 0.35);
    g.add(cyl(0.28, 0.24, 0.72, '#c9a66b', 0, 0.36, 0, 20));
    for (let i = 0; i < 4; i++) g.add(new THREE.Mesh(new THREE.TorusGeometry(0.27 - i * 0.01, 0.012, 6, 24), toon('#a47c48')).rotateX(Math.PI / 2).translateZ(-(0.15 + i * 0.15)));
    const lid = new THREE.Group(); lid.position.set(0, 0.73, 0);
    lid.add(cyl(0.3, 0.3, 0.05, '#a47c48', 0, 0, 0, 20)); lid.add(sph(0.04, '#a47c48', 0, 0.04, 0, 8));
    g.add(lid);
    const s = spot('hamper', 'laundry hamper', g, new THREE.Vector3(3.2, 0, 0.75), { pan: 0.9 });
    s.tell = E => E.tween(0.7, (k, raw) => { lid.position.y = 0.73 + Math.abs(Math.sin(raw * Math.PI * 3)) * 0.08; lid.rotation.z = Math.sin(raw * 18) * 0.15; }, ease.linear);
    s.open = E => E.tween(0.35, k => { lid.position.y = 0.73 + 0.3 * k; lid.rotation.z = 0.9 * k; lid.position.x = 0.25 * k; });
    s.close = E => E.tween(0.35, k => { lid.position.y = 1.03 - 0.3 * k; lid.rotation.z = 0.9 * (1 - k); lid.position.x = 0.25 * (1 - k); });
    s.fake = 'Forty-seven left socks. Where are the right ones?!';
  }
  // plant
  {
    const g = new THREE.Group(); g.position.set(-4.05, 0, -2.05);
    g.add(cyl(0.26, 0.2, 0.45, '#d4733b', 0, 0.225, 0, 16));
    g.add(cyl(0.27, 0.27, 0.06, '#c0622c', 0, 0.45, 0, 16));
    const leaves = new THREE.Group(); leaves.position.y = 0.45; g.add(leaves);
    for (let i = 0; i < 9; i++) {
      const leaf = sph(0.22, i % 2 ? '#43a047' : '#66bb6a', 0, 0, 0, 10);
      leaf.scale.set(0.45, 1.3, 0.2);
      const a = (i / 9) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 0.17, 0.4 + (i % 3) * 0.15, Math.sin(a) * 0.17);
      leaf.rotation.set(Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5);
      leaves.add(leaf);
    }
    R.plant = g;
    const s = spot('plant', 'big plant', g, new THREE.Vector3(-3.4, 0, -1.3), { pan: -0.9 });
    s.tell = E => E.tween(0.8, (k, raw) => { leaves.rotation.z = Math.sin(raw * 30) * 0.08 * (1 - raw); leaves.rotation.x = Math.cos(raw * 26) * 0.06 * (1 - raw); }, ease.linear);
    s.open = E => E.tween(0.4, (k, raw) => { leaves.rotation.z = Math.sin(raw * 30) * 0.2; });
    s.close = () => Promise.resolve();
    s.fake = 'Just a plant. It looks judgmental, though.';
  }
  // trash can
  {
    const g = new THREE.Group(); g.position.set(-1.8, 0, 1.0);
    g.add(cyl(0.2, 0.17, 0.5, '#78909c', 0, 0.25, 0, 20));
    const lid = new THREE.Group(); lid.position.set(0, 0.52, -0.2);
    lid.add(cyl(0.21, 0.21, 0.04, '#607d8b', 0, 0, 0.2, 20));
    g.add(lid);
    const eyes = new THREE.Group(); eyes.position.set(0, 0.5, 0.05); eyes.visible = false;
    for (const x of [-0.05, 0.05]) { eyes.add(sph(0.035, '#ffffff', x, 0, 0, 10)); eyes.add(sph(0.016, '#1d2b36', x, 0, 0.028, 8)); }
    g.add(eyes);
    const s = spot('trash', 'trash can', g, new THREE.Vector3(-1.2, 0, 1.45), { pan: -0.4 });
    s.tell = async E => { eyes.visible = true; await E.tween(1.0, (k, raw) => { lid.rotation.x = -Math.sin(raw * Math.PI) * 0.7; eyes.position.y = 0.5 + Math.sin(raw * Math.PI) * 0.06; }, ease.linear); eyes.visible = false; };
    s.open = E => E.tween(0.3, k => { lid.rotation.x = -1.4 * k; });
    s.close = E => E.tween(0.3, k => { lid.rotation.x = -1.4 * (1 - k); });
    s.fake = 'A banana peel and someone\'s homework. Gross. (The homework.)';
  }
  // cardboard box
  {
    const g = new THREE.Group(); g.position.set(2.55, 0, 1.25); g.rotation.y = -0.3;
    g.add(box(0.62, 0.5, 0.5, '#d7a86e', 0, 0.25, 0));
    const lab = planeTex(0.4, 0.14, textPoster([{ text: 'GLOVES (EMPTY?)', size: 56, bold: true }], { bg: '#d7a86e', border: '#d7a86e', w: 512, h: 180 }), 0, 0.33, 0.252);
    g.add(lab);
    const f1 = new THREE.Group(); f1.position.set(-0.31, 0.5, 0); f1.add(box(0.31, 0.012, 0.5, '#c8955a', 0.155, 0, 0)); g.add(f1);
    const f2 = new THREE.Group(); f2.position.set(0.31, 0.5, 0); f2.add(box(0.31, 0.012, 0.5, '#c8955a', -0.155, 0, 0)); g.add(f2);
    const s = spot('box', 'cardboard box', g, new THREE.Vector3(2.05, 0, 1.85), { pan: 0.5 });
    s.tell = E => E.tween(0.7, (k, raw) => { const a = Math.abs(Math.sin(raw * Math.PI * 3)) * 0.6; f1.rotation.z = a; f2.rotation.z = -a; }, ease.linear);
    s.open = E => E.tween(0.3, k => { f1.rotation.z = 2.2 * k; f2.rotation.z = -2.2 * k; });
    s.close = E => E.tween(0.3, k => { f1.rotation.z = 2.2 * (1 - k); f2.rotation.z = -2.2 * (1 - k); });
    s.fake = 'Packing peanuts. And one confused hamster.';
  }

  // ---------- fast food mode (after promotion 100) ----------
  // A counter, menu boards and a soda machine roll in; the exam room becomes "Doctor Burger".
  let food = null;
  function buildFood() {
    const g = new THREE.Group();
    // the counter customers stand behind
    const front = canvasTexture(512, 160, (ctx, W, H) => {
      ctx.fillStyle = '#e63946'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, 18, W, 14); ctx.fillRect(0, H - 32, W, 14);
      ctx.fillStyle = '#fff'; ctx.font = '700 64px Fredoka, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DOCTOR BURGER', W / 2, H / 2 + 2);
    }).tex;
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.95, 0.5), [toon('#c62f3b'), toon('#c62f3b'), toon('#ffffff'), toon('#c62f3b'), new THREE.MeshStandardMaterial({ map: front }), toon('#c62f3b')]);
    body.position.set(0, 0.475, 1.5); body.castShadow = true; body.receiveShadow = true; g.add(body);
    g.add(box(3.5, 0.06, 0.6, '#f4f4f0', 0, 0.97, 1.5));
    // register
    const reg = new THREE.Group(); reg.position.set(1.15, 1.0, 1.45);
    reg.add(box(0.36, 0.14, 0.32, '#37474f', 0, 0.07, 0));
    const scr = box(0.3, 0.2, 0.03, '#263238', 0, 0.27, -0.05); scr.rotation.x = -0.3; reg.add(scr);
    reg.add(box(0.26, 0.15, 0.005, '#7fdbff', 0, 0.272, -0.035).rotateX(-0.3));
    g.add(reg);
    // ketchup, mustard, napkins
    g.add(cyl(0.04, 0.045, 0.2, '#e63946', 1.55, 1.1, 1.4, 12)); g.add(cyl(0.012, 0.03, 0.05, '#e63946', 1.55, 1.22, 1.4, 8));
    g.add(cyl(0.04, 0.045, 0.2, '#ffd23f', 1.62, 1.1, 1.55, 12)); g.add(cyl(0.012, 0.03, 0.05, '#ffd23f', 1.62, 1.22, 1.55, 8));
    g.add(box(0.2, 0.16, 0.12, '#cfd8dc', 0.7, 1.08, 1.4));
    // soda machine at the end of the counter
    const soda = new THREE.Group(); soda.position.set(-1.45, 1.0, 1.4);
    soda.add(box(0.5, 0.7, 0.4, '#e63946', 0, 0.35, 0));
    soda.add(box(0.42, 0.22, 0.02, '#fff8e1', 0, 0.52, 0.21));
    for (const x of [-0.13, 0, 0.13]) soda.add(cyl(0.02, 0.02, 0.06, '#90a4ae', x, 0.25, 0.18, 8));
    g.add(soda);
    // menu boards over the posters
    const menu = (title, rows) => canvasTexture(512, 600, (ctx, W, H) => {
      ctx.fillStyle = '#1d2b36'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 14; ctx.strokeRect(7, 7, W - 14, H - 14);
      ctx.fillStyle = '#ffd23f'; ctx.font = '700 60px Fredoka, Arial'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 86);
      ctx.font = '600 40px Fredoka, Arial';
      rows.forEach(([a, b], i) => { ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(a, 40, 170 + i * 82); ctx.fillStyle = '#7be495'; ctx.textAlign = 'right'; ctx.fillText(b, W - 40, 170 + i * 82); });
    }).tex;
    const m1 = planeTex(0.66, 0.78, menu('MENU', [['Burger', '$4'], ['Fries', '$2'], ['Soda', '$1'], ['Ice cream', '$2'], ['Doctor Meal', '$7']]), 1.25, 1.62, -2.57);
    const m2 = planeTex(0.72, 0.84, menu('SPECIALS', [['The Cast Iron', '$9'], ['Stitches Fries', '$3'], ['X-Ray Shake', '$4'], ['Pill-ow Pie', '$3']]), -2.55, 1.55, -2.57);
    g.add(m1, m2);
    const sign = planeTex(0.5, 0.18, textPoster([{ text: 'KITCHEN', size: 64, bold: true, color: '#fff' }], { bg: '#e63946', border: '#1d2b36', w: 512, h: 184 }), doorX, 2.42, -2.575);
    g.add(sign);
    g.traverse(o => { if (o.isMesh) o.userData.food = true; });
    return g;
  }
  // ---------- department themes (see themes.js) ----------
  let themePoster = null, themeSign = null, themeProps = null, themeName = null;
  const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
  R.tickers = new Set();
  R.tick = (dt, t) => { for (const f of R.tickers) f(dt, t); };
  R.setDept = th => {
    const name = th ? th.name : null;
    if (name === themeName) return;
    themeName = name;
    const wall = th ? th.wall : wallC;
    paintWall(wallCT.ctx, 256, 256, wall); wallTex.needsUpdate = true;
    wainMat.color.set(th ? shade(th.wall, 0.82) : wainC);
    trimMat.color.set(th ? th.trim : trimC);
    drawSky(skyCT.ctx, 512, 352, th ? th.sky : 'day'); sky.needsUpdate = true;
    for (const o of [themePoster, themeSign]) if (o) { scene.remove(o); o.geometry.dispose(); o.material.map.dispose(); o.material.dispose(); }
    themePoster = themeSign = null;
    if (themeProps) { scene.remove(themeProps); themeProps.traverse(o => { if (o.geometry) o.geometry.dispose(); }); themeProps = null; }
    R.tickers.clear();
    washPoster.visible = !th; eyeChart.visible = true;
    if (!th) { exitSign.visible = !food || !food.visible; return; }
    themePoster = planeTex(0.66, 0.66, canvasTexture(512, 512, (ctx, W, H) => drawPoster(ctx, W, H, th.poster)).tex, -2.55, 1.55, -2.585);
    scene.add(themePoster);
    const sw = Math.min(1.25, 0.32 + th.sign.length * 0.045);
    themeSign = planeTex(sw, 0.18, textPoster([{ text: th.sign, size: 64, bold: true, color: '#fff' }], { bg: th.trim, border: '#1d2b36', w: Math.round(512 * sw / 0.5), h: 184 }), doorX, 2.42, -2.583);
    scene.add(themeSign);
    exitSign.visible = false;
    themeProps = buildProps(th);
    scene.add(themeProps);
    if (food && food.visible) { themePoster.visible = false; themeSign.visible = false; themeProps.visible = false; }
  };
  // little things in the room that make each department look like its own place
  function buildProps(th) {
    const g = new THREE.Group();
    const has = k => th.props.includes(k);
    const line = (a, b, color = '#90a4ae') => { const geo = new THREE.BufferGeometry().setFromPoints([a, b]); return new THREE.Line(geo, new THREE.LineBasicMaterial({ color })); };
    if (has('balloons')) for (const [x, c, h] of [[-1.25, '#ff5d8f', 1.95], [-1.05, '#3ec1d3', 2.1], [-1.4, '#ffd23f', 2.2]]) {
      const b = sph(0.13, c, x, h, -0.45, 18); b.scale.y = 1.18; g.add(b);
      g.add(line(new THREE.Vector3(x, h - 0.15, -0.45), new THREE.Vector3(-1.1, TABLE_TOP, -0.3), '#ffffff'));
      R.tickers.add((dt, t) => { b.position.y = h + Math.sin(t * 1.3 + x * 5) * 0.03; });
    }
    if (has('blocks')) [['#e63946', 0], ['#3a86ff', 1], ['#ffd23f', 2]].forEach(([c, i]) => { const b = box(0.12, 0.12, 0.12, c, -3.3 + i * 0.13, 1.03 + (i === 2 ? 0.12 : 0), -2.2); b.position.x -= i === 2 ? 0.2 : 0; b.rotation.y = i * 0.4; g.add(b); });
    if (has('redlight')) {
      const base = cyl(0.07, 0.08, 0.05, '#1d2b36', doorX, 2.72, -2.57, 14); base.rotation.x = Math.PI / 2; g.add(base);
      const lamp = sph(0.075, new THREE.MeshStandardMaterial({ color: '#ff1744', emissive: '#ff1744', emissiveIntensity: 0.6 }), doorX, 2.72, -2.5, 14); g.add(lamp);
      R.tickers.add((dt, t) => { lamp.material.emissiveIntensity = 0.2 + Math.max(0, Math.sin(t * 7)) * 1.4; });
    }
    if (has('crutches')) for (const dx of [0, 0.12]) { const c = cyl(0.016, 0.016, 1.3, '#b0bec5', 0.55 + dx, 0.66, -2.5, 8); c.rotation.z = 0.12; g.add(c); g.add(box(0.16, 0.04, 0.05, '#546e7a', 0.47 + dx, 1.3, -2.5)); }
    if (has('lightbox')) {
      eyeChart.visible = false;
      const lb = planeTex(0.7, 0.86, canvasTexture(320, 400, (ctx, W, H) => {
        ctx.fillStyle = '#cfe8ff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#16212e'; ctx.fillRect(18, 18, W - 36, H - 36);
        drawIcon(ctx, 'skull', W / 2, H * 0.28, 1.1, '#e3f2fd');
        ctx.strokeStyle = '#e3f2fd'; ctx.lineWidth = 9; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(W / 2, H * 0.42); ctx.lineTo(W / 2, H * 0.85); ctx.stroke();
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(W / 2, H * 0.48 + i * 22, 70 - i * 6, 10, 0, 0, Math.PI); ctx.stroke(); }
      }).tex, 1.25, 1.62, -2.583);
      lb.material = new THREE.MeshBasicMaterial({ map: lb.material.map }); g.add(lb);
    }
    if (has('hazard')) {
      const sign = new THREE.Group(); sign.position.set(2.35, 0, -1.9); sign.rotation.y = -0.4;
      for (const sx of [-1, 1]) { const pnl = box(0.34, 0.6, 0.02, '#ffd23f', 0, 0.3, sx * 0.09); pnl.rotation.x = sx * 0.28; sign.add(pnl); }
      const lab = planeTex(0.28, 0.28, canvasTexture(256, 256, (ctx, W, H) => { ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, 0, W, H); drawIcon(ctx, 'germ', W / 2, H * 0.42, 0.9, '#7cb342'); ctx.fillStyle = '#1d2b36'; ctx.font = '700 40px Arial'; ctx.textAlign = 'center'; ctx.fillText('CAUTION', W / 2, H * 0.92); }).tex, 0, 0.36, 0.12);
      lab.rotation.x = -0.28; sign.add(lab); g.add(sign);
    }
    if (has('balls')) { const bb = sph(0.12, '#ff7043', -3.6, 1.07, -2.15, 18); g.add(bb); const sb = sph(0.11, '#ffffff', -3.25, 1.06, -2.2, 18); g.add(sb); }
    if (has('rocker')) {
      const ch = new THREE.Group(); ch.position.set(2.65, 0, -1.95); ch.rotation.y = -0.6;
      ch.add(box(0.5, 0.06, 0.45, '#8d6e63', 0, 0.45, 0)); ch.add(box(0.5, 0.6, 0.06, '#8d6e63', 0, 0.78, -0.2));
      for (const sx of [-1, 1]) { ch.add(box(0.05, 0.42, 0.05, '#6d4c41', sx * 0.22, 0.24, 0.17)); ch.add(box(0.05, 0.42, 0.05, '#6d4c41', sx * 0.22, 0.24, -0.17)); const run = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.02, 6, 24, 0.9), toon('#6d4c41')); run.rotation.set(0, Math.PI / 2, -Math.PI / 2 - 0.45); run.position.set(sx * 0.22, 0.62, 0); ch.add(run); }
      ch.add(box(0.46, 0.05, 0.42, '#c5e1a5', 0, 0.49, 0));
      g.add(ch); R.tickers.add((dt, t) => { ch.rotation.x = Math.sin(t * 1.1) * 0.05; });
    }
    if (has('planets')) for (const [x, z, r, c, h] of [[-1.35, -1.9, 0.15, '#ffb74d', 2.45], [0.95, -2.1, 0.1, '#4fc3f7', 2.6], [2.35, -1.7, 0.19, '#ab47bc', 2.3]]) {
      const pl = sph(r, c, x, h, z, 20); g.add(pl); g.add(line(new THREE.Vector3(x, h + r, z), new THREE.Vector3(x, 3.6, z), '#cfd8dc'));
      if (r > 0.15) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.6, r * 0.12, 6, 30), toon('#ffe0b2')); ring.position.copy(pl.position); ring.rotation.x = 1.2; g.add(ring); }
      R.tickers.add((dt, t) => { pl.rotation.y = t * 0.4; pl.position.y = h + Math.sin(t * 0.8 + x) * 0.02; });
    }
    if (has('helmet')) { const hm = sph(0.16, '#eceff1', -2.05, 1.12, -2.3, 22); g.add(hm); const visor = new THREE.Mesh(new THREE.SphereGeometry(0.163, 22, 14, -0.9, 1.8, 0.7, 1.2), new THREE.MeshStandardMaterial({ color: '#263238', metalness: 0.6, roughness: 0.15 })); visor.position.copy(hm.position); g.add(visor); }
    if (has('bubbles')) {
      const n = 26, geo = new THREE.SphereGeometry(0.03, 10, 8);
      const mat = new THREE.MeshStandardMaterial({ color: '#e1f5fe', transparent: true, opacity: 0.55, roughness: 0.1 });
      const im = new THREE.InstancedMesh(geo, mat, n); g.add(im);
      const bs = Array.from({ length: n }, (_, i) => ({ x: rand(-4.2, 4.2), z: rand(-2.5, -1.0), y: rand(0, 3.4), v: rand(0.18, 0.4), s: rand(0.5, 1.5), w: rand(0, 6) }));
      const m4 = new THREE.Matrix4();
      R.tickers.add((dt, t) => { bs.forEach((b, i) => { b.y += b.v * dt; if (b.y > 3.5) b.y = 0; m4.makeScale(b.s, b.s, b.s); m4.setPosition(b.x + Math.sin(t * 1.5 + b.w) * 0.05, b.y, b.z); im.setMatrixAt(i, m4); }); im.instanceMatrix.needsUpdate = true; });
    }
    if (has('seaweed')) for (let i = 0; i < 7; i++) {
      const x = -4.3 + i * 0.22 + (i > 3 ? 6.6 : 0), hgt = rand(0.8, 1.5);
      const wd = new THREE.Mesh(new THREE.PlaneGeometry(0.12, hgt, 1, 8), toon(i % 2 ? '#2e7d32' : '#43a047', { side: THREE.DoubleSide }));
      wd.position.set(x, hgt / 2, -2.5); g.add(wd);
      const pos = wd.geometry.attributes.position, base = Float32Array.from(pos.array);
      R.tickers.add((dt, t) => { for (let k = 0; k < pos.count; k++) { const yy = base[k * 3 + 1] + hgt / 2; pos.array[k * 3] = base[k * 3] + Math.sin(t * 1.6 + yy * 3 + i) * 0.05 * yy; } pos.needsUpdate = true; });
    }
    if (has('egg')) {
      const nest = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.08, 8, 20), toon('#a1887f')); nest.rotation.x = Math.PI / 2; nest.position.set(2.6, 0.07, -1.9); g.add(nest);
      const egg = sph(0.2, new THREE.MeshStandardMaterial({ map: canvasTexture(128, 128, (ctx, W, H) => { ctx.fillStyle = '#f1f8e9'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#7cb342'; for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, 3 + Math.random() * 5, 0, 7); ctx.fill(); } }).tex, roughness: 0.7 }), 2.6, 0.26, -1.9, 22);
      egg.scale.set(1, 1.3, 1); g.add(egg);
      R.tickers.add((dt, t) => { egg.rotation.z = Math.sin(t * 9) * 0.06 * Math.max(0, Math.sin(t * 0.7)); });
    }
    if (has('footprints')) for (let i = 0; i < 5; i++) {
      const fp = new THREE.Mesh(new THREE.CircleGeometry(0.11, 3), new THREE.MeshBasicMaterial({ color: '#8d6e63', transparent: true, opacity: 0.5 }));
      fp.rotation.x = -Math.PI / 2; fp.rotation.z = Math.PI / 2 + 0.3; fp.position.set(3.2 - i * 0.45, 0.006, -1.4 + (i % 2) * 0.28 + i * 0.25); g.add(fp);
    }
    if (has('capes')) for (const [x, c] of [[3.0, '#d32f2f'], [3.55, '#1e88e5']]) {
      const hook = sph(0.025, '#90a4ae', x, 1.95, -2.47, 8); g.add(hook);
      const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.8, 4, 6), toon(c, { side: THREE.DoubleSide }));
      const pos = cape.geometry.attributes.position; for (let k = 0; k < pos.count; k++) { const yy = pos.getY(k); pos.setX(k, pos.getX(k) * (0.55 + (0.4 - yy) * 0.6)); pos.setZ(k, Math.sin(pos.getX(k) * 12) * 0.02); }
      cape.geometry.computeVertexNormals(); cape.position.set(x, 1.55, -2.42); g.add(cape);
      const star = new THREE.Mesh(new THREE.CircleGeometry(0.07, 5), toon('#ffd23f')); star.position.set(x, 1.6, -2.4); g.add(star);
    }
    return g;
  }
  R.setFood = on => {
    if (on && !food) { food = buildFood(); scene.add(food); }
    if (food) food.visible = !!on;
    exitSign.visible = !on && !themeSign;
    for (const o of [themePoster, themeSign, themeProps]) if (o) o.visible = !on;
  };
  return R;
}
