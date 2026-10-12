// 2D side-scrolling hospital chase. Rendered on its own canvas.
import { clamp, rand, pick } from '../engine.js';
import { sfx, music } from '../audio.js';
import { h } from '../ui.js';

const VH = 470;
const GROUND = 412;
const TAUNTS = {
  kid: ["Can't catch me!", 'Nyeh nyeh nyeh!', 'I am SPEED!', 'Needles are for grown-ups!'],
  teen: ['Literally no.', 'You run like my dad!', 'This is so not happening!', "I'm faster on a scooter but whatever!"],
  adult: ["You'll never catch me!", 'Is this cardio? I HATE cardio!', 'This gown has NO BACK!', 'Tell my cat I love her!', "I'm faster than I look!"],
  elder: ["I've still got it!", "Catch me if you can, sonny!", 'My hip! Worth it!'],
};

export async function play(G, P) {
  const { E, ui } = G;
  const c = P.c;
  await G.howTo('chase', 'RUNAWAY PATIENT!', [
    `${c.first} ran off! <b>Chase them down the hallway</b> before they reach the EXIT.`,
    'Move: <b>← →</b> or <b>A D</b>. Jump: <b>↑</b>, <b>W</b> or <b>Space</b>. (Touch: use the buttons.)',
    'Jump over wet floor signs, carts and wheelchairs. Land ON things to bounce off them!',
    'Grab <b>☕ coffee</b> for a speed boost.',
  ], '🏃');
  const canvas = document.getElementById('c2d');
  const ctx = canvas.getContext('2d');
  canvas.classList.remove('hidden');
  E.paused3D = true;
  music.play('chase');
  ui.showHUD(false);

  // touch controls
  const touch = { left: false, right: false, jump: false };
  const tc = ui.touch;
  tc.innerHTML = '';
  const mk = (cls, label, key) => {
    const b = h('button', 'tbtn ' + cls + ' interactive', label);
    const on = e => { e.preventDefault(); touch[key] = true; };
    const offf = e => { e.preventDefault(); touch[key] = false; };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', offf); b.addEventListener('pointerleave', offf); b.addEventListener('pointercancel', offf);
    tc.appendChild(b);
  };
  mk('left', '◀', 'left'); mk('right', '▶', 'right'); mk('jump', '⤒', 'jump');
  tc.classList.remove('hidden');

  const diff = G.diff;
  const L = Math.round(5400 + diff * 1400);
  const obs = [];
  const pickups = [];
  let x = 760;
  const types = ['sign', 'cart', 'boxes', 'wheelchair', 'puddle', 'banana', 'nurse', 'gurney', 'sign', 'banana'];
  while (x < L - 500) {
    const t = pick(types);
    const o = { type: t, x, alive: true };
    switch (t) {
      case 'sign': Object.assign(o, { w: 34, h: 58, hazard: true }); break;
      case 'banana': Object.assign(o, { w: 34, h: 14, hazard: true, slip: true }); break;
      case 'cart': Object.assign(o, { w: 140, h: 72, solid: true }); break;
      case 'gurney': Object.assign(o, { w: 190, h: 84, solid: true }); break;
      case 'boxes': Object.assign(o, { w: 82, h: 112, solid: true }); break;
      case 'wheelchair': Object.assign(o, { w: 62, h: 64, hazard: true, vx: 0, mover: true }); break;
      case 'puddle': Object.assign(o, { w: 130, h: 6, slow: true }); break;
      case 'nurse': Object.assign(o, { w: 42, h: 116, hazard: true, x0: x, walk: rand(0, 6) }); break;
    }
    obs.push(o);
    if (Math.random() < 0.35) pickups.push({ type: Math.random() < 0.5 ? 'coffee' : 'lolli', x: x + rand(150, 230), y: GROUND - rand(90, 150), alive: true });
    x += rand(330, 560) - diff * 70;
  }
  const shoes = G.upg('shoes');
  const pl = { x: 140, y: GROUND, vx: 0, vy: 0, w: 34, h: 82, onGround: true, stun: 0, inv: 0, boost: 0, phase: 0, slow: false, spin: 0 };
  const pa = { x: 520, y: GROUND, vx: 0, vy: 0, w: 34, h: 78, onGround: true, pause: 0, phase: 0, tauntT: rand(2.5, 4), say: null, sayT: 0 };
  const paSpeed = 296 + diff * 26 - (G.tutorial ? 40 : 0);
  let time = 0, stumbles = 0, state = 'intro', stateT = 0, prevJump = false;
  const pops = [];
  const pop = (text, x, y, color = '#1d2b36') => pops.push({ text, x, y, t: 0, color });
  const skin = c.look.skin, hair = c.look.hair?.color || '#3b2a20';
  const coat = G.coatColor || '#ffffff';

  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y - a.h < b.y && a.y > b.y - b.h;

  function solidsAt() { return obs.filter(o => o.solid); }
  function physics(e, dt, isPlayer) {
    const prevBottom = e.y;
    e.vy += 2400 * dt;
    // horizontal
    e.x += e.vx * dt;
    if (isPlayer) {
      for (const s of solidsAt()) {
        const box = { x: s.x, y: GROUND, w: s.w, h: s.h };
        if (overlap({ x: e.x, y: e.y, w: e.w, h: e.h - 2 }, box) && e.y > GROUND - s.h + 2) {
          if (e.vx > 0) e.x = s.x - e.w; else if (e.vx < 0) e.x = s.x + s.w;
          e.vx = 0;
        }
      }
    }
    e.y += e.vy * dt;
    e.onGround = false;
    if (e.y >= GROUND) { e.y = GROUND; e.vy = 0; e.onGround = true; }
    for (const s of solidsAt()) {
      const top = GROUND - s.h;
      if (e.x + e.w > s.x + 4 && e.x < s.x + s.w - 4 && e.vy >= 0 && prevBottom <= top + 6 && e.y >= top) { e.y = top; e.vy = 0; e.onGround = true; }
    }
  }

  G.dbg = { kind: 'chase', pl, pa, obs, get state() { return state; } };
  let resolveDone;
  const done = new Promise(r => (resolveDone = r));
  let result = null;
  let last = performance.now();
  let raf;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    let dt = Math.min(0.033, (now - last) / 1000); last = now;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.round(window.innerWidth * dpr), chh = Math.round(window.innerHeight * dpr);
    if (canvas.width !== cw || canvas.height !== chh) { canvas.width = cw; canvas.height = chh; }
    const scale = canvas.height / VH;
    const VW = canvas.width / scale;
    stateT += dt;
    const K = E.input.keys;
    const right = K.has('ArrowRight') || K.has('KeyD') || touch.right;
    const left = K.has('ArrowLeft') || K.has('KeyA') || touch.left;
    const jumpHeld = K.has('ArrowUp') || K.has('KeyW') || K.has('Space') || touch.jump;
    const jumpPressed = jumpHeld && !prevJump; prevJump = jumpHeld;

    if (state === 'intro' && stateT > 1.4) { state = 'run'; stateT = 0; }
    if (state === 'run') {
      time += dt;
      // player
      pl.boost -= dt; pl.inv -= dt;
      const maxV = (330 + shoes * 22) * (pl.boost > 0 ? 1.35 : 1) * (pl.slow ? 0.6 : 1);
      if (pl.stun > 0) { pl.stun -= dt; pl.vx *= 1 - Math.min(1, 4 * dt); pl.spin += dt * 14; }
      else {
        pl.spin = 0;
        if (right) pl.vx = Math.min(maxV, pl.vx + 2100 * dt);
        else if (left) pl.vx = Math.max(-220, pl.vx - 2100 * dt);
        else pl.vx *= 1 - Math.min(1, 5 * dt);
        if (pl.vx > maxV) pl.vx = maxV;
        if (jumpPressed && pl.onGround) { pl.vy = -900; pl.onGround = false; sfx.jump(); }
      }
      if (!jumpHeld && pl.vy < -380) pl.vy = -380;
      physics(pl, dt, true);
      pl.x = Math.max(0, pl.x);
      pl.phase += dt * Math.abs(pl.vx) / 26;
      // moving obstacles
      for (const o of obs) {
        if (o.mover && o.alive && o.x - pl.x < 650) o.x -= 140 * dt;
        if (o.type === 'nurse') { o.walk += dt; o.x = o.x0 + Math.sin(o.walk * 1.2) * 70; }
      }
      // hazards
      pl.slow = false;
      for (const o of obs) {
        if (!o.alive) continue;
        const box = { x: o.x, y: GROUND, w: o.w, h: o.h };
        const pbox = { x: pl.x + 4, y: pl.y, w: pl.w - 8, h: pl.h - 6 };
        if (o.slow) { if (pl.onGround && pl.x + pl.w > o.x && pl.x < o.x + o.w && pl.y >= GROUND - 1) { pl.slow = true; if (Math.random() < dt * 8) pop('splish', pl.x, GROUND - 10, '#3a86ff'); } continue; }
        if (!o.hazard || !overlap(pbox, box)) continue;
        if (pl.vy > 0 && pl.y - pl.vy * dt <= GROUND - o.h + 12 && o.type !== 'banana') {
          pl.vy = -680; o.alive = false; sfx.boing(); pop('BOING!', o.x, GROUND - o.h - 20, '#2ec4b6');
        } else if (pl.inv <= 0) {
          stumbles++; pl.inv = 1.2; pl.stun = o.slip ? 0.9 : 0.55; pl.vx = -170;
          sfx.thud(); if (o.slip) sfx.slip();
          pop(o.slip ? 'WHOOPS!' : 'OOF!', pl.x, pl.y - 100, '#e63946');
          if (o.type === 'nurse') pop('Watch it, Doctor!', o.x - 40, GROUND - o.h - 30, '#7b2cbf');
        }
      }
      for (const pu of pickups) {
        if (!pu.alive) continue;
        if (Math.abs(pl.x + pl.w / 2 - pu.x) < 30 && pl.y - pl.h < pu.y + 15 && pl.y > pu.y - 15) {
          pu.alive = false;
          if (pu.type === 'coffee') { pl.boost = 3.5; sfx.coin(); pop('☕ SPEED!', pu.x, pu.y - 20, '#ff8a2a'); }
          else { G.addMoney(5); sfx.coin(); pop('+$5', pu.x, pu.y - 20, '#2a9d8f'); }
        }
      }
      // patient AI
      if (pa.pause > 0) { pa.pause -= dt; pa.vx = 0; }
      else {
        pa.vx = paSpeed;
        pa.tauntT -= dt;
        if (pa.tauntT <= 0 && pa.x - pl.x > 140) { pa.pause = 0.75; pa.tauntT = rand(3.5, 6); pa.say = pick(TAUNTS[c.ageGroup] || TAUNTS.adult); pa.sayT = 1.6; sfx.babble(pa.say, c.voice || 1); }
        const ahead = obs.find(o => o.alive && !o.slow && o.x > pa.x + pa.w - 4 && o.x - (pa.x + pa.w) < 55);
        if (ahead && pa.onGround) { pa.vy = -880; pa.onGround = false; }
      }
      physics(pa, dt, false);
      pa.phase += dt * Math.abs(pa.vx) / 26;
      pa.sayT -= dt;
      // catch / escape
      if (Math.abs((pl.x + pl.w / 2) - (pa.x + pa.w / 2)) < 42 && Math.abs(pl.y - pa.y) < 70) { state = 'caught'; stateT = 0; sfx.great(); E.shake(0); }
      else if (pa.x > L + 60) { state = 'escaped'; stateT = 0; sfx.bad(); }
    }
    if ((state === 'caught' || state === 'escaped') && stateT > 1.8 && !result) {
      result = state === 'caught' ? { caught: true, score: clamp(105 - time * 1.4 - stumbles * 7, 40, 100) } : { caught: false, score: 0 };
      resolveDone();
    }

    // ---------------- draw ----------------
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const cam = clamp(pl.x - VW * 0.32, 0, Math.max(0, L + 320 - VW));
    ctx.fillStyle = '#e3f4f0'; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.translate(-cam, 0);
    // ceiling lights
    for (let lx = Math.floor(cam / 300) * 300; lx < cam + VW + 300; lx += 300) {
      ctx.fillStyle = '#fffbe6'; ctx.fillRect(lx + 60, 0, 140, 14);
      const g = ctx.createRadialGradient(lx + 130, 10, 5, lx + 130, 10, 160); g.addColorStop(0, 'rgba(255,250,220,0.6)'); g.addColorStop(1, 'rgba(255,250,220,0)');
      ctx.fillStyle = g; ctx.fillRect(lx - 40, 0, 340, 180);
    }
    // wainscot
    ctx.fillStyle = '#a8dccf'; ctx.fillRect(cam, GROUND - 150, VW, 150);
    ctx.fillStyle = '#ff8a2a'; ctx.fillRect(cam, GROUND - 156, VW, 8);
    // doors & posters
    for (let dx = Math.floor((cam - 600) / 560) * 560 + 260; dx < cam + VW + 200; dx += 560) {
      if (dx > L - 200) break;
      const n = Math.round(dx / 560);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(dx - 6, GROUND - 236, 132, 236);
      ctx.fillStyle = ['#ffb703', '#8ecae6', '#ffafcc', '#b8e0d2'][n % 4]; ctx.fillRect(dx, GROUND - 230, 120, 230);
      ctx.fillStyle = '#bde0fe'; ctx.fillRect(dx + 30, GROUND - 205, 60, 50);
      ctx.fillStyle = '#90a4ae'; ctx.beginPath(); ctx.arc(dx + 105, GROUND - 115, 6, 0, 7); ctx.fill();
      ctx.fillStyle = '#1d2b36'; ctx.font = '700 18px Fredoka, Arial'; ctx.textAlign = 'center'; ctx.fillText(String(100 + n * 2), dx + 60, GROUND - 244);
      const px = dx + 280;
      const posters = [['WASH', 'HANDS'], ['NO', 'RUNNING'], ['DR. CHAOS', 'EMPLOYEE?'], ['QUIET', 'PLEASE'], ['FLU', 'SHOTS!']];
      const pt = posters[Math.abs(n) % posters.length];
      ctx.fillStyle = '#fff'; ctx.fillRect(px, GROUND - 270, 110, 80); ctx.strokeStyle = '#2bb3a3'; ctx.lineWidth = 5; ctx.strokeRect(px, GROUND - 270, 110, 80);
      ctx.fillStyle = '#1d2b36'; ctx.font = '700 17px Fredoka, Arial'; ctx.fillText(pt[0], px + 55, GROUND - 238); ctx.fillText(pt[1], px + 55, GROUND - 214);
    }
    // exit door
    ctx.fillStyle = '#ffffff'; ctx.fillRect(L + 90, GROUND - 250, 150, 250);
    ctx.fillStyle = '#2ec4b6'; ctx.fillRect(L + 98, GROUND - 242, 134, 242);
    ctx.fillStyle = '#e63946'; ctx.fillRect(L + 110, GROUND - 300, 110, 40);
    ctx.fillStyle = '#fff'; ctx.font = '700 28px Fredoka, Arial'; ctx.textAlign = 'center'; ctx.fillText('EXIT', L + 165, GROUND - 270);
    // floor
    ctx.fillStyle = '#e9e4da'; ctx.fillRect(cam, GROUND, VW, VH - GROUND);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 2;
    for (let fx = Math.floor(cam / 60) * 60; fx < cam + VW; fx += 60) { ctx.beginPath(); ctx.moveTo(fx, GROUND); ctx.lineTo(fx - 30, VH); ctx.stroke(); }
    ctx.fillStyle = '#c9c1b2'; ctx.fillRect(cam, GROUND, VW, 5);
    // obstacles
    for (const o of obs) {
      if (o.x + o.w < cam - 50 || o.x > cam + VW + 50) continue;
      drawObstacle(ctx, o);
    }
    for (const pu of pickups) {
      if (!pu.alive) continue;
      const by = pu.y + Math.sin(time * 4 + pu.x) * 5;
      if (pu.type === 'coffee') {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(pu.x - 13, by - 18); ctx.lineTo(pu.x + 13, by - 18); ctx.lineTo(pu.x + 10, by + 14); ctx.lineTo(pu.x - 10, by + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#8d5524'; ctx.fillRect(pu.x - 11, by - 8, 22, 9);
        ctx.strokeStyle = 'rgba(120,120,120,0.6)'; ctx.beginPath(); ctx.moveTo(pu.x - 4, by - 24); ctx.quadraticCurveTo(pu.x + 4, by - 32, pu.x - 2, by - 40); ctx.stroke();
      } else {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(pu.x, by); ctx.lineTo(pu.x, by + 26); ctx.stroke();
        ctx.fillStyle = '#ff5d8f'; ctx.beginPath(); ctx.arc(pu.x, by, 12, 0, 7); ctx.fill(); ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(pu.x, by, 6, 0, 4); ctx.stroke();
      }
    }
    // characters
    if (!(state === 'escaped' && stateT > 0.3)) drawPatient(ctx, pa, skin, hair, time, c.look);
    if (!(pl.inv > 0 && Math.floor(time * 12) % 2 === 0 && state === 'run')) drawDoctor(ctx, pl, coat, time, pl.boost > 0);
    if (pa.sayT > 0) bubble(ctx, pa.say, pa.x + pa.w / 2, pa.y - pa.h - 30);
    for (const p of pops) {
      p.t += dt;
      ctx.globalAlpha = Math.max(0, 1 - p.t / 1.2);
      ctx.fillStyle = p.color; ctx.font = '700 24px Fredoka, Arial'; ctx.textAlign = 'center';
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeText(p.text, p.x, p.y - p.t * 50); ctx.fillText(p.text, p.x, p.y - p.t * 50);
      ctx.globalAlpha = 1;
    }
    for (let i = pops.length - 1; i >= 0; i--) if (pops[i].t > 1.2) pops.splice(i, 1);
    ctx.restore();
    // HUD
    const bw = Math.min(520, VW - 160), bx = (VW - bw) / 2, by = 22;
    ctx.fillStyle = 'rgba(29,43,54,0.85)'; roundRect(ctx, bx - 14, by - 12, bw + 28, 46, 23); ctx.fill();
    ctx.fillStyle = '#56707f'; roundRect(ctx, bx, by + 6, bw, 10, 5); ctx.fill();
    const mx = v => bx + clamp(v / (L + 60), 0, 1) * bw;
    ctx.font = '22px Arial'; ctx.textAlign = 'center';
    ctx.fillText('🚪', bx + bw + 2, by + 18);
    ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.arc(mx(pa.x), by + 11, 9, 0, 7); ctx.fill();
    ctx.fillStyle = coat; ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mx(pl.x), by + 11, 9, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '700 16px Fredoka, Arial'; ctx.textAlign = 'left';
    ctx.fillText(`Catch ${c.first}!`, bx - 4, by + 54);
    if (pl.boost > 0) { ctx.fillStyle = '#ff8a2a'; ctx.textAlign = 'right'; ctx.fillText(`☕ ${pl.boost.toFixed(1)}s`, bx + bw, by + 54); }
    if (state === 'intro') banner(ctx, VW, stateT < 0.9 ? `CATCH ${c.first.toUpperCase()}!` : 'GO!', '#ff8a2a');
    if (state === 'caught') banner(ctx, VW, 'GOTCHA!', '#2ec4b6');
    if (state === 'escaped') banner(ctx, VW, `${c.first.toUpperCase()} ESCAPED!`, '#e63946');
  }
  raf = requestAnimationFrame(frame);
  await done;
  cancelAnimationFrame(raf);
  canvas.classList.add('hidden');
  tc.classList.add('hidden'); tc.innerHTML = '';
  E.paused3D = false;
  ui.showHUD(true);
  music.play('clinic');
  return result;
}

function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

function banner(ctx, VW, text, color) {
  ctx.save();
  ctx.font = '700 64px Fredoka, Arial'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  ctx.lineWidth = 12; ctx.strokeStyle = '#1d2b36'; ctx.strokeText(text, VW / 2, VH / 2 - 40);
  ctx.fillStyle = color; ctx.fillText(text, VW / 2, VH / 2 - 40);
  ctx.restore();
}

function bubble(ctx, text, x, y) {
  ctx.save();
  ctx.font = '600 18px Fredoka, Arial';
  const w = ctx.measureText(text).width + 24;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 3;
  roundRect(ctx, x - w / 2, y - 34, w, 34, 14); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x, y + 12); ctx.lineTo(x + 8, y); ctx.fill();
  ctx.fillStyle = '#1d2b36'; ctx.textAlign = 'center'; ctx.fillText(text, x, y - 11);
  ctx.restore();
}

function drawObstacle(ctx, o) {
  const x = o.x, top = GROUND - o.h;
  ctx.save();
  ctx.lineWidth = 3; ctx.strokeStyle = '#1d2b36';
  if (!o.alive && o.hazard) { ctx.globalAlpha = 0.5; ctx.translate(x + o.w / 2, GROUND); ctx.scale(1.3, 0.25); ctx.translate(-(x + o.w / 2), -GROUND); }
  switch (o.type) {
    case 'sign':
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + o.w / 2, top); ctx.lineTo(x + o.w, GROUND); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1d2b36'; ctx.font = '700 22px Arial'; ctx.textAlign = 'center'; ctx.fillText('!', x + o.w / 2, GROUND - 14);
      break;
    case 'banana':
      ctx.fillStyle = '#ffe066';
      ctx.beginPath(); ctx.ellipse(x + o.w / 2, GROUND - 6, o.w / 2, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 4, GROUND - 6); ctx.lineTo(x - 6, GROUND - 14); ctx.moveTo(x + o.w - 4, GROUND - 6); ctx.lineTo(x + o.w + 6, GROUND - 13); ctx.stroke();
      break;
    case 'cart':
      ctx.fillStyle = '#b0bec5'; ctx.fillRect(x, top + 10, o.w, o.h - 26); ctx.strokeRect(x, top + 10, o.w, o.h - 26);
      ctx.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + 20 + i * 33, top + 10, 16, Math.PI, 0); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#1d2b36'; for (const wx of [x + 14, x + o.w - 14]) { ctx.beginPath(); ctx.arc(wx, GROUND - 8, 8, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#546e7a'; ctx.font = '700 14px Fredoka, Arial'; ctx.textAlign = 'center'; ctx.fillText('LAUNDRY', x + o.w / 2, top + 40);
      break;
    case 'gurney':
      ctx.fillStyle = '#cfd8dc'; ctx.fillRect(x, top, o.w, 18); ctx.strokeRect(x, top, o.w, 18);
      ctx.fillStyle = '#4fc3f7'; ctx.fillRect(x + 6, top - 8, o.w - 12, 10); ctx.strokeRect(x + 6, top - 8, o.w - 12, 10);
      ctx.fillStyle = '#90a4ae'; ctx.fillRect(x + 16, top + 18, 8, o.h - 34); ctx.fillRect(x + o.w - 24, top + 18, 8, o.h - 34);
      ctx.fillStyle = '#1d2b36'; for (const wx of [x + 20, x + o.w - 20]) { ctx.beginPath(); ctx.arc(wx, GROUND - 8, 8, 0, 7); ctx.fill(); }
      break;
    case 'boxes':
      ctx.fillStyle = '#d7a86e';
      ctx.fillRect(x, GROUND - 56, o.w, 56); ctx.strokeRect(x, GROUND - 56, o.w, 56);
      ctx.fillRect(x + 8, top, o.w - 16, 56); ctx.strokeRect(x + 8, top, o.w - 16, 56);
      ctx.fillStyle = '#8d6e48'; ctx.font = '700 12px Fredoka, Arial'; ctx.textAlign = 'center'; ctx.fillText('GLOVES', x + o.w / 2, GROUND - 24); ctx.fillText('GAUZE', x + o.w / 2, top + 32);
      break;
    case 'wheelchair':
      ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x + o.w / 2 + 6, GROUND - 24, 24, 0, 7); ctx.stroke();
      ctx.fillStyle = '#3a86ff'; ctx.fillRect(x + 8, top + 8, 30, 30); ctx.lineWidth = 3; ctx.strokeRect(x + 8, top + 8, 30, 30);
      ctx.fillRect(x + 4, top - 6, 8, 40);
      ctx.beginPath(); ctx.arc(x + 10, GROUND - 6, 6, 0, 7); ctx.fillStyle = '#1d2b36'; ctx.fill();
      break;
    case 'puddle':
      ctx.fillStyle = 'rgba(80,170,255,0.55)'; ctx.beginPath(); ctx.ellipse(x + o.w / 2, GROUND + 3, o.w / 2, 7, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'nurse': {
      const cx = x + o.w / 2;
      ctx.fillStyle = '#b8a1e3'; ctx.fillRect(x + 4, top + 34, o.w - 8, 50); ctx.strokeRect(x + 4, top + 34, o.w - 8, 50);
      ctx.fillRect(x + 6, top + 84, 12, 32); ctx.fillRect(x + o.w - 18, top + 84, 12, 32);
      ctx.fillStyle = '#c68642'; ctx.beginPath(); ctx.arc(cx, top + 18, 16, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2b1d14'; ctx.beginPath(); ctx.arc(cx, top + 12, 16, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 10, top + 44, 30, 6); ctx.strokeRect(x - 10, top + 44, 30, 6);
      ctx.fillStyle = '#ff5d8f'; ctx.beginPath(); ctx.arc(x - 2, top + 40, 5, 0, 7); ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function limb(ctx, x, y, len, ang, w, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = color; ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 2.5;
  roundRect(ctx, -w / 2, 0, w, len, w / 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawDoctor(ctx, e, coat, t, boost) {
  const x = e.x + e.w / 2, y = e.y;
  const run = Math.abs(e.vx) > 30 && e.onGround;
  const ph = e.phase;
  ctx.save();
  if (e.spin) { ctx.translate(x, y - 40); ctx.rotate(Math.sin(e.spin) * 0.6); ctx.translate(-x, -(y - 40)); }
  const legA = run ? Math.sin(ph) * 0.8 : (e.onGround ? 0 : 0.5);
  limb(ctx, x - 5, y - 34, 32, legA, 11, '#3d5a80');
  limb(ctx, x + 5, y - 34, 32, -legA, 11, '#3d5a80');
  // coat body
  ctx.fillStyle = coat; ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 3;
  roundRect(ctx, x - 17, y - 78, 34, 50, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff8a2a'; ctx.fillRect(x - 4, y - 76, 8, 22);
  ctx.strokeStyle = '#26a69a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 74, 12, 0.2, Math.PI - 0.2); ctx.stroke();
  const armA = run ? Math.sin(ph) * 0.9 : -0.3;
  limb(ctx, x - 12, y - 72, 28, armA + 0.3, 9, coat);
  limb(ctx, x + 12, y - 72, 28, -armA - 0.3, 9, coat);
  // head
  ctx.fillStyle = '#f1c27d'; ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x + 2, y - 92, 15, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3b2a20'; ctx.beginPath(); ctx.arc(x + 2, y - 96, 15, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  ctx.fillStyle = '#cfd8dc'; ctx.beginPath(); ctx.arc(x - 6, y - 104, 6, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1d2b36'; ctx.beginPath(); ctx.arc(x + 9, y - 93, 2.5, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 9, y - 86, 4, 0, Math.PI); ctx.stroke();
  if (boost) { ctx.strokeStyle = 'rgba(255,138,42,0.7)'; ctx.lineWidth = 4; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - 26 - i * 8, y - 70 + i * 16); ctx.lineTo(x - 46 - i * 8, y - 70 + i * 16); ctx.stroke(); } }
  ctx.restore();
}

function drawPatient(ctx, e, skin, hair, t, look) {
  const x = e.x + e.w / 2, y = e.y;
  const run = e.vx > 30;
  const ph = e.phase;
  const legA = run ? Math.sin(ph) * 0.9 : 0;
  limb(ctx, x - 5, y - 32, 30, legA, 10, skin);
  limb(ctx, x + 5, y - 32, 30, -legA, 10, skin);
  ctx.fillStyle = '#bde0fe'; ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 16, y - 74); ctx.lineTo(x + 16, y - 74); ctx.lineTo(x + 20, y - 28); ctx.lineTo(x - 20, y - 28); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3a86ff'; for (const [dx, dy] of [[-8, -60], [6, -50], [-4, -40], [10, -64]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, 2.5, 0, 7); ctx.fill(); }
  const flail = Math.sin(t * 16) * 0.5;
  limb(ctx, x - 12, y - 70, 26, Math.PI - 0.6 + flail, 8, skin);
  limb(ctx, x + 12, y - 70, 26, Math.PI + 0.6 - flail, 8, skin);
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x, y - 88, 15, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(x, y - 92, 15, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  if (look && look.hair && ['long', 'ponytail', 'pigtails', 'bob'].includes(look.hair.style)) { ctx.fillRect(x - 15, y - 92, 7, 20); }
  ctx.fillStyle = '#1d2b36';
  ctx.beginPath(); ctx.arc(x + 5, y - 90, 2.5, 0, 7); ctx.arc(x - 3, y - 90, 2.5, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 2, y - 81, 4, 5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 14, y - 3, 12, 4); ctx.fillRect(x + 2, y - 3, 12, 4);
}
