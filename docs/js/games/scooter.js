// Top-down scooter escape: the patient zooms off on a mobility scooter, you chase in a wheelchair.
import { clamp, rand, pick } from '../engine.js';
import { openArcade, roundRect, banner, bubble, pops as makePops } from './arcade.js';

const HW = 420; // hallway width
const TAUNTS = ['Beep beep, slowpoke!', 'Eight miles an hour of FREEDOM!', 'You will never take me alive! ...Or with a needle!', 'My scooter has turbo! It does not. But still!', 'Out of my way, I have a bingo game!', 'Wheee! I have not felt this young in years!'];
const BATTERY = ['Come on, battery!', 'No no no, not now!', 'Why is the light blinking?!', 'Who unplugged me last night?!'];

export async function play(G, P) {
  const c = P.c;
  await G.howTo('scooter', 'SCOOTER ESCAPE!', [
    `${c.first} stole a mobility scooter and is zooming away! Hop in a wheelchair and <b>catch them</b> before the EXIT.`,
    'Steer with <b>← →</b> or <b>A D</b> (or move the mouse left and right).',
    'Dodge signs, carts, beds and nurses. <b>Puddles make you slide.</b> Grab <b>☕ coffee</b> for a boost.',
  ], '🛵');
  const A = openArcade(G, { VH: 540, song: 'chase', buttons: [{ cls: 'left', label: '◀', key: 'left' }, { cls: 'right', label: '▶', key: 'right' }] });
  const { ctx, sfx } = A;
  const diff = G.diff;
  const L = Math.round(6000 + diff * 1000);
  const obs = [], pickups = [];
  for (let d = 700; d < L - 300; d += rand(270, 440) - diff * 40) {
    const t = pick(['sign', 'sign', 'cart', 'gurney', 'puddle', 'nurse', 'bed', 'cart']);
    const size = { sign: [44, 40], cart: [70, 90], gurney: [160, 70], puddle: [120, 70], nurse: [44, 44], bed: [110, 150] }[t];
    const x = rand(size[0] / 2 + 6, HW - size[0] / 2 - 6);
    obs.push({ t, x, d, w: size[0], h: size[1], vx: t === 'nurse' ? (Math.random() < 0.5 ? -1 : 1) * rand(70, 110) : 0, alive: true });
    if (Math.random() < 0.33) pickups.push({ x: rand(40, HW - 40), d: d + rand(120, 200), alive: true });
  }
  const pl = { x: HW / 2, d: 0, v: 0, stun: 0, inv: 0, slide: 0, slideV: 0, boost: 0, wob: 0 };
  const pa = { x: HW / 2 + rand(-60, 60), d: 360, v: 0, pause: 0, nextPause: rand(3.5, 6), say: null, sayT: 0, tauntT: rand(2, 4), tx: HW / 2 };
  const paSpeed = 300 + diff * 22;
  const target = 330 + G.upg('shoes') * 16;
  const pp = makePops();
  let state = 'intro', stT = 0, time = 0, bumps = 0, lastPX = null, pointerT = 0;
  const overlap = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.d - b.d) < (a.h + b.h) / 2;
  G.dbg = { kind: 'scooter', pl, pa, obs, get state() { return state; } };

  const result = await A.run((dt, view) => {
    const { VW, VH } = view;
    stT += dt;
    const hx0 = (VW - HW) / 2;
    if (state === 'intro' && stT > 1.4) { state = 'run'; stT = 0; }
    if (state === 'run') {
      time += dt;
      // steering
      const ptr = A.pointer();
      if (lastPX !== null && Math.abs(ptr.x - lastPX) > 0.5) pointerT = 0.8;
      lastPX = ptr.x; pointerT -= dt;
      let steer = 0;
      if (A.key('ArrowLeft', 'KeyA') || A.touch.left) steer = -1;
      else if (A.key('ArrowRight', 'KeyD') || A.touch.right) steer = 1;
      if (steer) pl.x += steer * 340 * dt;
      else if (pointerT > 0 || ptr.down) { const tx = clamp(ptr.x - hx0, 0, HW); pl.x += clamp(tx - pl.x, -340 * dt, 340 * dt); }
      if (pl.slide > 0) { pl.slide -= dt; pl.x += pl.slideV * dt; }
      pl.x = clamp(pl.x, 26, HW - 26);
      // speed
      pl.boost -= dt; pl.inv -= dt;
      const want = pl.stun > 0 ? 90 : target * (pl.boost > 0 ? 1.35 : 1) * (pl.slide > 0 ? 0.85 : 1);
      pl.stun -= dt;
      pl.v += clamp(want - pl.v, -600 * dt, 420 * dt);
      pl.d += pl.v * dt;
      pl.wob += dt * pl.v / 30;
      // obstacles
      for (const o of obs) {
        if (o.vx) { o.x += o.vx * dt; if (o.x < 24 || o.x > HW - 24) o.vx *= -1; }
        if (!o.alive) continue;
        if (overlap({ x: pl.x, d: pl.d, w: 46, h: 56 }, o)) {
          if (o.t === 'puddle') { if (pl.slide <= 0) { pl.slide = 0.8; pl.slideV = (Math.random() < 0.5 ? -1 : 1) * 160; sfx.slip(); pp.add('WHEEE!', hx0 + pl.x, VH * 0.86 - 60, '#3a86ff'); } continue; }
          if (pl.inv > 0) continue;
          bumps++; pl.stun = 0.5; pl.inv = 1.1; pl.v = 110; sfx.thud();
          pp.add(o.t === 'nurse' ? 'Watch it, Doctor!' : 'OOF!', hx0 + pl.x, VH * 0.86 - 70, '#e63946');
        }
      }
      for (const pu of pickups) {
        if (pu.alive && Math.abs(pu.x - pl.x) < 34 && Math.abs(pu.d - pl.d) < 40) { pu.alive = false; pl.boost = 2.6; sfx.coin(); pp.add('☕ BOOST!', hx0 + pl.x, VH * 0.86 - 60, '#ff8a2a'); }
      }
      // patient AI
      pa.nextPause -= dt; pa.tauntT -= dt; pa.sayT -= dt;
      if (pa.pause > 0) { pa.pause -= dt; pa.v += (120 - pa.v) * Math.min(1, dt * 6); }
      else {
        pa.v += (paSpeed - pa.v) * Math.min(1, dt * 3);
        if (pa.nextPause <= 0 && pa.d - pl.d > 120) { pa.pause = 0.7; pa.nextPause = rand(4, 6.5); pa.say = pick(BATTERY); pa.sayT = 1.4; sfx.beep(); }
      }
      if (pa.tauntT <= 0) { pa.tauntT = rand(3.5, 6); if (pa.sayT <= 0) { pa.say = pick(TAUNTS); pa.sayT = 1.6; sfx.babble(pa.say, c.voice || 0.9); } }
      // dodge: look ahead for something in our way and pick a clear spot
      const ahead = obs.filter(o => o.alive && o.t !== 'puddle' && o.d > pa.d && o.d - pa.d < 260);
      const blocked = x => ahead.some(o => Math.abs(o.x - x) < o.w / 2 + 34);
      if (blocked(pa.tx)) {
        let best = pa.tx, bd = 1e9;
        for (let x = 40; x <= HW - 40; x += 20) if (!blocked(x) && Math.abs(x - pa.x) < bd) { bd = Math.abs(x - pa.x); best = x; }
        pa.tx = best;
      }
      pa.x += clamp(pa.tx - pa.x, -280 * dt, 280 * dt);
      pa.d += pa.v * dt;
      if (Math.abs(pa.x - pl.x) < 52 && Math.abs(pa.d - pl.d) < 58) { state = 'caught'; stT = 0; sfx.great(); }
      else if (pa.d > L + 80) { state = 'escaped'; stT = 0; sfx.bad(); }
    }
    if ((state === 'caught' || state === 'escaped') && stT > 1.8) return state === 'caught' ? { caught: true, score: clamp(105 - time * 1.2 - bumps * 8, 40, 100) } : { caught: false, score: 0 };

    // ---------- draw ----------
    const py = VH * 0.86;
    const sy = d => py - (d - pl.d);
    ctx.fillStyle = '#2f6f68'; ctx.fillRect(0, 0, VW, VH);
    // rooms on both sides
    const off = (pl.d % 300 + 300) % 300;
    for (let yy = -300 + off; yy < VH + 300; yy += 300) {
      for (const side of [-1, 1]) {
        const x = side < 0 ? hx0 - 150 : hx0 + HW + 20;
        ctx.fillStyle = '#d6efe9'; ctx.fillRect(x, yy - 110, 130, 220);
        ctx.fillStyle = '#9fd8cc'; ctx.fillRect(x + 10, yy - 100, 110, 200);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 25, yy - 70, 80, 40);
        ctx.fillStyle = '#4fc3f7'; ctx.fillRect(x + 25, yy - 70, 80, 14);
      }
    }
    // hallway floor
    ctx.fillStyle = '#eef6f3'; ctx.fillRect(hx0, 0, HW, VH);
    ctx.fillStyle = '#dcebe7';
    const tOff = (pl.d % 60 + 60) % 60;
    for (let yy = -60 + tOff; yy < VH + 60; yy += 60) for (let xx = 0; xx < HW; xx += 60) if (((xx / 60) + Math.floor((yy - tOff) / 60)) % 2 === 0) ctx.fillRect(hx0 + xx, yy, 60, 60);
    ctx.fillStyle = '#ff8a2a'; ctx.fillRect(hx0 - 8, 0, 8, VH); ctx.fillRect(hx0 + HW, 0, 8, VH);
    // exit
    const ey = sy(L + 140);
    if (ey > -200) {
      ctx.fillStyle = '#2ec4b6'; ctx.fillRect(hx0, ey - 40, HW, 40);
      ctx.fillStyle = '#e63946'; roundRect(ctx, hx0 + HW / 2 - 70, ey - 80, 140, 40, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 28px Fredoka, Arial'; ctx.textAlign = 'center'; ctx.fillText('EXIT', hx0 + HW / 2, ey - 50);
    }
    // obstacles
    for (const o of obs) {
      const y = sy(o.d);
      if (y < -120 || y > VH + 120) continue;
      drawObstacle(ctx, o, hx0 + o.x, y, time);
    }
    for (const pu of pickups) {
      if (!pu.alive) continue;
      const x = hx0 + pu.x, y = sy(pu.d);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8d5524'; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
    }
    if (!(state === 'escaped' && stT > 0.4)) drawScooter(ctx, hx0 + pa.x, sy(pa.d), c, time, pa.pause > 0);
    if (!(pl.inv > 0 && Math.floor(time * 12) % 2 === 0 && state === 'run')) drawChair(ctx, hx0 + pl.x, py, G.coatColor || '#ffffff', pl.wob, pl.boost > 0);
    if (pa.sayT > 0 && pa.say) bubble(ctx, pa.say, hx0 + pa.x, Math.max(110, sy(pa.d) - 55));
    if (sy(pa.d) < 60 && state === 'run') { ctx.fillStyle = '#e63946'; ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 3; const ax = hx0 + pa.x; ctx.beginPath(); ctx.moveTo(ax, 70); ctx.lineTo(ax - 14, 92); ctx.lineTo(ax + 14, 92); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    pp.draw(ctx, dt);
    // HUD
    const bw = Math.min(460, VW - 160), bx = (VW - bw) / 2, by = 22;
    ctx.fillStyle = 'rgba(29,43,54,0.85)'; roundRect(ctx, bx - 14, by - 12, bw + 28, 46, 23); ctx.fill();
    ctx.fillStyle = '#56707f'; roundRect(ctx, bx, by + 6, bw, 10, 5); ctx.fill();
    const mx = v => bx + clamp(v / (L + 80), 0, 1) * bw;
    ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.arc(mx(pa.d), by + 11, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mx(pl.d), by + 11, 9, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '700 16px Fredoka, Arial'; ctx.textAlign = 'left'; ctx.fillText(`Catch ${c.first}!`, bx - 4, by + 54);
    if (state === 'intro') banner(ctx, VW, VH, stT < 0.9 ? `${c.first.toUpperCase()} STOLE A SCOOTER!` : 'GO!', '#ff8a2a', VH / 2 - 40, stT < 0.9 ? 44 : 64);
    if (state === 'caught') banner(ctx, VW, VH, 'GOTCHA!', '#2ec4b6');
    if (state === 'escaped') banner(ctx, VW, VH, `${c.first.toUpperCase()} GOT AWAY!`, '#e63946');
    return null;
  });
  A.close();
  return result;
}

function drawObstacle(ctx, o, x, y, t) {
  ctx.save();
  ctx.lineWidth = 3; ctx.strokeStyle = '#1d2b36';
  switch (o.t) {
    case 'sign':
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x + 22, y + 18); ctx.lineTo(x - 22, y + 18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1d2b36'; ctx.font = '700 20px Arial'; ctx.textAlign = 'center'; ctx.fillText('!', x, y + 13);
      break;
    case 'cart':
      ctx.fillStyle = '#90caf9'; roundRect(ctx, x - 35, y - 45, 70, 90, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x - 18 + i * 18, y - 10 + (i % 2) * 18, 12, 0, 7); ctx.fill(); ctx.stroke(); }
      break;
    case 'gurney':
      ctx.fillStyle = '#cfd8dc'; roundRect(ctx, x - 80, y - 35, 160, 70, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4fc3f7'; roundRect(ctx, x - 70, y - 28, 110, 56, 8); ctx.fill();
      ctx.fillStyle = '#fff'; roundRect(ctx, x + 45, y - 25, 28, 50, 8); ctx.fill(); ctx.stroke();
      break;
    case 'bed':
      ctx.fillStyle = '#eceff1'; roundRect(ctx, x - 55, y - 75, 110, 150, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffafcc'; roundRect(ctx, x - 48, y - 30, 96, 98, 8); ctx.fill();
      ctx.fillStyle = '#fff'; roundRect(ctx, x - 40, y - 66, 80, 28, 8); ctx.fill(); ctx.stroke();
      break;
    case 'puddle':
      ctx.fillStyle = 'rgba(80,170,255,0.55)'; ctx.beginPath(); ctx.ellipse(x, y, 60, 34, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(x - 12, y - 6, 24, 10, 0, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'nurse':
      ctx.fillStyle = '#b8a1e3'; ctx.beginPath(); ctx.ellipse(x, y, 24, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2b1d14'; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(x + (o.vx > 0 ? 18 : -38), y - 8, 20, 16); ctx.strokeRect(x + (o.vx > 0 ? 18 : -38), y - 8, 20, 16);
      break;
  }
  ctx.restore();
}

function drawChair(ctx, x, y, coat, wob, boost) {
  ctx.save();
  ctx.lineWidth = 3; ctx.strokeStyle = '#1d2b36';
  ctx.fillStyle = '#37474f';
  roundRect(ctx, x - 30, y - 22, 12, 46, 5); ctx.fill(); ctx.stroke();
  roundRect(ctx, x + 18, y - 22, 12, 46, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3a86ff'; roundRect(ctx, x - 20, y - 10, 40, 34, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = coat; ctx.beginPath(); ctx.ellipse(x, y + 2, 20, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const arm = Math.sin(wob) * 4;
  ctx.beginPath(); ctx.moveTo(x - 16, y - 2); ctx.lineTo(x - 24, y - 14 + arm); ctx.moveTo(x + 16, y - 2); ctx.lineTo(x + 24, y - 14 - arm); ctx.stroke();
  ctx.fillStyle = '#3b2a20'; ctx.beginPath(); ctx.arc(x, y - 4, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#cfd8dc'; ctx.beginPath(); ctx.arc(x, y - 10, 4, 0, 7); ctx.fill();
  if (boost) { ctx.strokeStyle = 'rgba(255,138,42,0.8)'; ctx.lineWidth = 4; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * 12, y + 30); ctx.lineTo(x + i * 12, y + 52); ctx.stroke(); } }
  ctx.restore();
}

function drawScooter(ctx, x, y, c, t, stalled) {
  ctx.save();
  ctx.lineWidth = 3; ctx.strokeStyle = '#1d2b36';
  const sh = stalled ? Math.sin(t * 40) * 2 : 0;
  ctx.translate(sh, 0);
  ctx.fillStyle = '#e63946'; roundRect(ctx, x - 24, y - 36, 48, 76, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c9a66b'; roundRect(ctx, x - 18, y - 52, 36, 20, 4); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 22, y - 30); ctx.lineTo(x + 22, y - 30); ctx.stroke();
  ctx.fillStyle = '#bde0fe'; ctx.beginPath(); ctx.ellipse(x, y + 4, 18, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = (c.look && c.look.hair && c.look.hair.color) || '#bdbdbd'; ctx.beginPath(); ctx.arc(x, y + 2, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#1d2b36'; ctx.beginPath(); ctx.moveTo(x + 18, y + 30); ctx.lineTo(x + 18, y + 62); ctx.stroke();
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(x + 18, y + 62); ctx.lineTo(x + 34, y + 56); ctx.lineTo(x + 18, y + 50); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (stalled) { ctx.fillStyle = 'rgba(120,120,120,0.6)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x - 10 + i * 10, y + 50 + Math.sin(t * 8 + i) * 4, 6, 0, 7); ctx.fill(); } }
  ctx.restore();
}
