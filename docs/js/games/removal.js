import * as THREE from 'three';
import { object as makeObject, tweezers, OBJECT_NAMES } from '../props.js';
import { TABLE_TOP, clamp, rand, canvasTexture } from '../engine.js';

const CW = 1024, CH = 640;

function genPath(diff) {
  const n = 4 + Math.round(diff * 2);
  const sx = rand(170, 290), sy = rand(220, 420);
  const pts = [[sx, sy]];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const x = sx + (1120 - sx) * t;
    const prevY = pts[pts.length - 1][1];
    let y = i === n ? rand(170, 470) : rand(95, 545);
    if (Math.abs(y - prevY) < 90) y = prevY + (y < prevY ? -1 : 1) * rand(110, 200);
    y = clamp(y, Math.max(95, prevY - 280), Math.min(545, prevY + 280));
    pts.push([x, y]);
  }
  const flip = Math.random() < 0.5;
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(flip ? CW - p[0] : p[0], p[1], 0)), false, 'centripetal');
  return { pts: curve.getSpacedPoints(300).map(v => ({ x: v.x, y: v.y })), flip };
}

function nearest(path, x, y) {
  let best = 1e9, bi = 0;
  for (let i = 0; i < path.length; i++) {
    const dx = path[i].x - x, dy = path[i].y - y, d = dx * dx + dy * dy;
    if (d < best) { best = d; bi = i; }
  }
  // refine with segment distance
  let dist = Math.sqrt(best);
  for (const j of [bi - 1, bi]) {
    if (j < 0 || j + 1 >= path.length) continue;
    const a = path[j], b = path[j + 1];
    const vx = b.x - a.x, vy = b.y - a.y, wx = x - a.x, wy = y - a.y;
    const t = clamp((vx * wx + vy * wy) / (vx * vx + vy * vy || 1), 0, 1);
    const d = Math.hypot(a.x + vx * t - x, a.y + vy * t - y);
    if (d < dist) dist = d;
  }
  return { i: bi, d: dist };
}

const OUCH = ['OW!', 'YEOWCH!', 'BZZT! That tickled... NOT.', 'OUCH! I felt that in my TEETH!', "AAH! That's my brain!", 'Hey! Watch the walls!'];

export async function play(G, P, prm = {}) {
  const { E, ui, sfx } = G;
  const person = P.person;
  const objKey = prm.object || 'lego';
  const objName = prm.name || OBJECT_NAMES[objKey] || 'thing';
  const where = prm.where || 'ear';

  await G.howTo('removal', 'Tweezers: Get It Out!', [
    `Press and hold on the <b>${objName}</b> to grab it with your tweezers.`,
    'Drag it along the glowing tunnel to the <b>EXIT</b>.',
    "Don't touch the walls! <b>BZZT!</b> Every zap hurts the patient.",
    'Too many zaps, or running out of time, and you might get <b>sued</b>.',
  ], '🔍');

  const S = E.scope();
  await person.lieDown(E);
  const head = person.headCenter();
  const W = 1.25, H = W * CH / CW;
  const dir = new THREE.Vector3(0, 1, 0.3).normalize();
  const center = new THREE.Vector3(head.x + 0.22, TABLE_TOP + 0.5, 0.02);
  await E.frame(center, W * 1.06, H * 1.22, dir, 0.9);

  // ---- board ----
  const diff = G.tutorial ? 0 : G.diff;
  const hw = (G.tutorial ? 56 : 48 - diff * 13) * G.tol;
  const objR = hw * 0.5;
  const allowed = hw - objR * 0.9;
  const { pts: path, flip } = genPath(diff);
  const exitIdx = path.findIndex(p => (flip ? p.x < 28 : p.x > CW - 28));
  const exitI = exitIdx > 0 ? exitIdx : path.length - 4;

  const tex = canvasTexture(CW, CH, () => {});
  const ctx = tex.ctx;
  let flashT = 0;
  function draw(zap = 0) {
    ctx.fillStyle = zap ? '#3a0d1a' : '#0a1830'; ctx.fillRect(0, 0, CW, CH);
    ctx.strokeStyle = 'rgba(120,200,255,0.08)'; ctx.lineWidth = 2;
    for (let x = 0; x < CW; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke(); }
    for (let y = 0; y < CH; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }
    // faint skull
    ctx.strokeStyle = 'rgba(190,230,255,0.22)'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.ellipse(CW / 2, CH / 2 - 10, 300, 250, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(CW / 2 - 110, CH / 2 - 40, 60, 50, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(CW / 2 + 110, CH / 2 - 40, 60, 50, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CW / 2 - 170, CH / 2 + 140); ctx.quadraticCurveTo(CW / 2, CH / 2 + 300, CW / 2 + 170, CH / 2 + 140); ctx.stroke();
    // tunnel
    const stroke = (w, c, blur = 0) => {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.shadowColor = c; ctx.shadowBlur = blur;
      ctx.beginPath(); path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.restore();
    };
    stroke(hw * 2 + 14, zap ? '#ff4d6d' : '#62e6ff', 24);
    stroke(hw * 2, '#173a66');
    stroke(hw * 2 - 18, '#1f4f87');
    ctx.save(); ctx.setLineDash([14, 18]); stroke(3, 'rgba(160,230,255,0.35)'); ctx.restore();
    // exit label
    const e = path[Math.min(path.length - 1, exitI)];
    ctx.save();
    ctx.fillStyle = '#5dffb0'; ctx.font = '700 46px Fredoka, Arial, sans-serif'; ctx.textAlign = flip ? 'left' : 'right';
    ctx.shadowColor = '#5dffb0'; ctx.shadowBlur = 16;
    const ly = e.y < 110 ? e.y + hw + 52 : e.y - hw - 16;
    ctx.fillText(flip ? '◀ EXIT' : 'EXIT ▶', flip ? 18 : CW - 18, ly);
    ctx.restore();
    ctx.fillStyle = 'rgba(200,240,255,0.75)'; ctx.font = '600 30px Fredoka, Arial, sans-serif'; ctx.textAlign = flip ? 'right' : 'left';
    ctx.fillText(`X-RAY SCANNER · ${where.toUpperCase()}`, flip ? CW - 24 : 24, 44);
    tex.tex.needsUpdate = true;
  }
  draw();

  const board = new THREE.Group();
  board.position.copy(center);
  board.lookAt(center.clone().add(dir));
  const planeMat = new THREE.MeshBasicMaterial({ map: tex.tex, transparent: true, opacity: 0.93 });
  planeMat.userData.dispose = true;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(W, H), planeMat);
  board.add(plane);
  const frameMat = new THREE.MeshBasicMaterial({ color: '#62e6ff' }); frameMat.userData.dispose = true;
  for (const [w, h, x, y] of [[W + 0.04, 0.02, 0, H / 2 + 0.01], [W + 0.04, 0.02, 0, -H / 2 - 0.01], [0.02, H + 0.04, W / 2 + 0.01, 0], [0.02, H + 0.04, -W / 2 - 0.01, 0]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.01), frameMat); b.position.set(x, y, 0); board.add(b);
  }
  S.add(board);
  board.scale.setScalar(0.01);
  await E.tween(0.35, k => board.scale.setScalar(Math.max(0.01, k)));

  const pxToLocal = (px, py) => new THREE.Vector3((px / CW - 0.5) * W, (0.5 - py / CH) * H, 0);
  G.dbg = { kind: 'removal', path, exitI, pos: () => pos, grabbed: () => grabbed, scr: (x, y) => E.toScreen(board.localToWorld(pxToLocal(x, y))) };
  const worldPerPx = W / CW;
  const obj = makeObject(objKey);
  const bb = new THREE.Box3().setFromObject(obj); const sz = new THREE.Vector3(); bb.getSize(sz);
  obj.scale.setScalar((objR * 2.1 * worldPerPx) / Math.max(sz.x, sz.y, sz.z));
  const objHolder = new THREE.Group(); objHolder.add(obj); board.add(objHolder);
  const tw = tweezers(); tw.scale.setScalar(1.4); tw.rotation.set(1.05, 0, -0.35); board.add(tw);

  let pos = { x: path[0].x, y: path[0].y };
  let lastSafe = { ...pos };
  let grabbed = false, cooldown = 0, mistakes = 0, t = 0, done = false, failed = false;
  let best = 0, remarked = false;
  const limit = G.tutorial ? 75 : 46 - diff * 12;
  const maxMistakes = G.tutorial ? 99 : 4 + G.upg('steady');
  ui.timer.show(limit);
  ui.hint(`Grab the <b>${objName}</b> and drag it to the <b>EXIT</b>. Don't touch the walls!`);
  const zapsMeter = G.tutorial ? null : ui.meter({ label: 'Zaps', value: 0, fill: '#ff4d6d', cls: 'small' });

  const pointerPx = () => {
    const local = new THREE.Plane();
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(board.quaternion);
    local.setFromNormalAndCoplanarPoint(n, board.position);
    const hit = E.pointerOnPlane(local);
    if (!hit) return null;
    const l = board.worldToLocal(hit.clone());
    return { x: (l.x / W + 0.5) * CW, y: (0.5 - l.y / H) * CH };
  };

  S.on('down', () => {
    if (done || cooldown > 0) return;
    const p = pointerPx(); if (!p) return;
    if (Math.hypot(p.x - pos.x, p.y - pos.y) < objR * 2.6 + 18) { grabbed = true; sfx.pop(); }
  });
  S.on('up', () => { grabbed = false; });

  const zap = () => {
    mistakes++; grabbed = false; cooldown = 0.55;
    sfx.buzz(); ui.flash(); E.shake(0.012); draw(1); flashT = 0.25;
    person.expr('ouch'); person.wiggle = 0.5;
    G.say(OUCH[Math.floor(Math.random() * OUCH.length)], { key: 'ouch', hold: 0.8, fast: true });
    setTimeout(() => !done && person.expr('scared'), 700);
    const back = path[Math.max(0, nearest(path, lastSafe.x, lastSafe.y).i - 6)];
    pos = { x: back.x, y: back.y }; lastSafe = { ...pos };
    if (zapsMeter) zapsMeter.set(mistakes / (maxMistakes + 1));
    G.mood(-12);
    if (mistakes > maxMistakes) { failed = true; done = true; }
  };

  person.expr('scared');
  await new Promise(res => {
    S.update(dt => {
      if (done) { res(); return; }
      t += dt; cooldown -= dt;
      ui.timer.set(limit - t);
      if (flashT > 0) { flashT -= dt; if (flashT <= 0) draw(0); }
      if (t > limit) { failed = true; done = true; res(); return; }
      const p = pointerPx();
      if (grabbed && p) {
        const dx = p.x - pos.x, dy = p.y - pos.y;
        const dist = Math.hypot(dx, dy);
        const maxMove = 620 * dt;
        const move = Math.min(dist, maxMove);
        const steps = Math.max(1, Math.ceil(move / 4));
        for (let s = 0; s < steps && grabbed; s++) {
          pos.x += (dx / (dist || 1)) * (move / steps);
          pos.y += (dy / (dist || 1)) * (move / steps);
          const n = nearest(path, pos.x, pos.y);
          if (n.d > allowed) { zap(); break; }
          lastSafe = { ...pos };
          if (n.i > best) best = n.i;
          if (n.i >= exitI) { done = true; break; }
        }
        if (!remarked && t > 4 && Math.random() < dt * 0.4) { remarked = true; G.remark(); }
      }
      const lp = pxToLocal(pos.x, pos.y);
      objHolder.position.set(lp.x, lp.y, 0.035);
      obj.rotation.y += dt * 0.8;
      if (grabbed) { tw.position.set(lp.x, lp.y, 0.03); tw.userData.open(0.1); }
      else if (p) { const pl = pxToLocal(p.x, p.y); tw.position.set(pl.x, pl.y, 0.06); tw.userData.open(1); }
    });
  });
  ui.timer.hide();
  if (zapsMeter) zapsMeter.remove();
  ui.hint(null);
  const progress = best / exitI;
  let result;
  if (!failed) {
    sfx.ding();
    ui.popAt(board.localToWorld(objHolder.position.clone()), 'GOT IT!', 'good');
    const p0 = objHolder.position.clone();
    await E.tween(0.6, k => { objHolder.position.set(p0.x + (flip ? -0.25 : 0.25) * k, p0.y + 0.1 * k, 0.035 + 0.25 * Math.sin(k * Math.PI)); });
    const score = clamp(100 - mistakes * 15 - Math.max(0, t - 14) * 1.2, 25, 100);
    result = { score, fail: false };
  } else {
    sfx.bad();
    ui.popCenter(t > limit ? "TIME'S UP!" : 'TOO MANY ZAPS!', 'bad');
    const severity = mistakes > maxMistakes ? 2 : progress > 0.6 ? 1 : 2;
    result = { score: 5, fail: true, severity, reason: mistakes > maxMistakes ? 'removal_hurt' : 'removal' };
    await E.wait(0.8);
  }
  await E.tween(0.3, k => board.scale.setScalar(Math.max(0.01, 1 - k)));
  S.end();
  await person.sitUp(E);
  return result;
}
