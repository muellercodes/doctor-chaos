// Germ Blaster: shrink down in the Micro-Sub and blast the patient's cold germs.
import { clamp, rand, pick } from '../engine.js';
import { openArcade, roundRect, banner, bubble, pops as makePops } from './arcade.js';

const SHOUTS = ['Noooo!', "We'll be back!", 'I just got here!', 'Not the medicine!', 'Tell my mom I tried!', 'Ow, my everything!', 'This is MY nose now!'];
const BOSS_TAUNTS = ['I am the KING of this nose!', 'You call that medicine?!', 'I will make them sneeze FOREVER!', 'Kevin! Get him!'];

export async function play(G, P) {
  const c = P.c;
  await G.howTo('germs', 'GERM BLASTER!', [
    `${c.first}'s germs are too strong. Hop in the <b>Micro-Sub</b>, shrink down, and blast them!`,
    'Move with the <b>mouse</b> (or <b>arrow keys / WASD</b>). Your sub fires medicine bubbles by itself.',
    'Dodge the flying <b>snot balls</b>. Beat the <b>King Germ</b> at the end!',
  ], '🦠');
  const A = openArcade(G, { VH: 540, song: 'chase' });
  const { ctx, sfx } = A;
  const diff = G.diff;
  const ship = { x: 0, y: 440, stun: 0, hits: 0, fireT: 0, inv: 0 };
  let started = false;
  const shots = [], germs = [], snot = [], cells = [];
  const pp = makePops();
  for (let i = 0; i < 26; i++) cells.push({ x: rand(0, 1), y: rand(0, 540), r: rand(10, 40), s: rand(30, 90), a: rand(0.08, 0.2) });
  let state = 'intro', stT = 0, t = 0, spawnT = 0, spawned = 0, killed = 0, splat = 0;
  const TOTAL = 34 + Math.round(diff * 10);
  let boss = null, bossDone = false, bossSay = null, bossSayT = 0;
  G.dbg = { kind: 'germs', ship, germs, snot, get boss() { return boss; }, get state() { return state; } };

  const result = await A.run((dt, view) => {
    const { VW, VH } = view;
    if (!started) { ship.x = VW / 2; started = true; }
    stT += dt;
    if (state === 'intro' && stT > 1.5) { state = 'play'; stT = 0; }
    if (state === 'play') {
      t += dt;
      // movement
      const ptr = A.pointer();
      let mx = 0, my = 0;
      if (A.key('ArrowLeft', 'KeyA')) mx -= 1; if (A.key('ArrowRight', 'KeyD')) mx += 1;
      if (A.key('ArrowUp', 'KeyW')) my -= 1; if (A.key('ArrowDown', 'KeyS')) my += 1;
      if (mx || my) { ship.x += mx * 380 * dt; ship.y += my * 380 * dt; }
      else if (ptr.has) { ship.x += clamp(ptr.x - ship.x, -520 * dt, 520 * dt); ship.y += clamp(ptr.y - ship.y, -520 * dt, 520 * dt); }
      ship.x = clamp(ship.x, 30, VW - 30); ship.y = clamp(ship.y, VH * 0.5, VH - 40);
      ship.stun -= dt; ship.inv -= dt; splat -= dt;
      // fire
      ship.fireT -= dt;
      if (ship.fireT <= 0 && ship.stun <= 0) { ship.fireT = 0.15; shots.push({ x: ship.x - 9, y: ship.y - 30 }, { x: ship.x + 9, y: ship.y - 30 }); if (Math.random() < 0.3) sfx.blip(1.6); }
      // spawn
      spawnT -= dt;
      if (spawned < TOTAL && spawnT <= 0) {
        spawnT = rand(0.45, 0.85) - diff * 0.15;
        const kind = Math.random() < 0.18 + diff * 0.1 ? 'sneezer' : Math.random() < 0.35 ? 'spiky' : 'blob';
        germs.push({ kind, x: rand(40, VW - 40), y: -30, hp: kind === 'sneezer' ? 3 : kind === 'spiky' ? 2 : 1, vy: kind === 'spiky' ? rand(95, 130) : rand(60, 90), ph: rand(0, 6), amp: rand(30, 90), x0: 0, shootT: rand(1, 2.5), r: kind === 'sneezer' ? 26 : 20, hitT: 0 });
        germs[germs.length - 1].x0 = germs[germs.length - 1].x;
        spawned++;
      }
      if (spawned >= TOTAL && !germs.length && !boss && !bossDone) {
        boss = { x: VW / 2, y: -80, hp: 30 + Math.round(diff * 10), max: 30 + Math.round(diff * 10), dir: 1, shootT: 1.2, hitT: 0 };
        bossSay = pick(BOSS_TAUNTS); bossSayT = 2; sfx.boing();
      }
      // shots
      for (const s of shots) s.y -= 620 * dt;
      // germs
      for (const g of germs) {
        g.ph += dt * 2; g.y += g.vy * dt; g.x = g.x0 + Math.sin(g.ph) * g.amp; g.hitT -= dt;
        if (g.kind === 'sneezer') { g.shootT -= dt; if (g.shootT <= 0 && g.y > 20 && g.y < VH * 0.6) { g.shootT = rand(1.6, 2.6) - diff * 0.5; const a = Math.atan2(ship.y - g.y, ship.x - g.x); snot.push({ x: g.x, y: g.y + 10, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190 }); sfx.splat(); } }
      }
      if (boss) {
        boss.hitT -= dt;
        if (boss.y < 110) boss.y += 70 * dt;
        else { boss.x += boss.dir * (110 + diff * 50) * dt; if (boss.x < 110 || boss.x > VW - 110) boss.dir *= -1; }
        boss.shootT -= dt;
        if (boss.shootT <= 0 && boss.y >= 100) { boss.shootT = rand(1.0, 1.6) - diff * 0.3; for (const a of [-0.35, 0, 0.35]) snot.push({ x: boss.x, y: boss.y + 50, vx: Math.sin(a) * 220, vy: Math.cos(a) * 220 }); sfx.splat(); }
        bossSayT -= dt;
        if (bossSayT < -4) { bossSay = pick(BOSS_TAUNTS); bossSayT = 2; }
      }
      // snot
      for (const s of snot) { s.x += s.vx * dt; s.y += s.vy * dt; }
      // collisions: shots vs germs/boss
      for (const s of shots) {
        if (s.dead) continue;
        for (const g of germs) {
          if (g.dead) continue;
          if (Math.hypot(s.x - g.x, s.y - g.y) < g.r + 6) {
            s.dead = true; g.hp--; g.hitT = 0.1; sfx.pop();
            if (g.hp <= 0) { g.dead = true; killed++; pp.add(Math.random() < 0.35 ? pick(SHOUTS) : '+10', g.x, g.y, '#2a9d8f', 18); }
            break;
          }
        }
        if (!s.dead && boss && Math.abs(s.x - boss.x) < 70 && Math.abs(s.y - boss.y) < 55) {
          s.dead = true; boss.hp--; boss.hitT = 0.08; sfx.pop();
          if (boss.hp <= 0) { bossDone = true; pp.add('KING GERM DEFEATED!', boss.x, boss.y, '#ff8a2a', 30); boss = null; state = 'win'; stT = 0; sfx.great(); }
        }
      }
      // collisions: ship vs snot/germs
      const hitShip = () => { if (ship.inv > 0) return; ship.hits++; ship.stun = 0.8; ship.inv = 1.4; splat = 1.2; sfx.splat(); pp.add('GROSS!', ship.x, ship.y - 40, '#4caf50', 28); };
      for (const s of snot) if (!s.dead && Math.hypot(s.x - ship.x, s.y - ship.y) < 22) { s.dead = true; hitShip(); }
      for (const g of germs) if (!g.dead && Math.hypot(g.x - ship.x, g.y - ship.y) < g.r + 16) { g.dead = true; hitShip(); }
      // cleanup
      for (let i = shots.length - 1; i >= 0; i--) if (shots[i].dead || shots[i].y < -20) shots.splice(i, 1);
      for (let i = germs.length - 1; i >= 0; i--) if (germs[i].dead || germs[i].y > VH + 40) germs.splice(i, 1);
      for (let i = snot.length - 1; i >= 0; i--) if (snot[i].dead || snot[i].y > VH + 20 || snot[i].y < -20 || snot[i].x < -20 || snot[i].x > VW + 20) snot.splice(i, 1);
      if (t > 60) { state = 'timeout'; stT = 0; sfx.bad(); }
    }
    if ((state === 'win' || state === 'timeout') && stT > 2) {
      const ratio = killed / Math.max(1, spawned);
      return { score: clamp(30 + 50 * ratio + (bossDone ? 25 : 0) - ship.hits * 4, 20, 100), boss: bossDone };
    }

    // ---------- draw ----------
    const g0 = ctx.createLinearGradient(0, 0, 0, VH); g0.addColorStop(0, '#ffb3c1'); g0.addColorStop(1, '#ff8fab');
    ctx.fillStyle = g0; ctx.fillRect(0, 0, VW, VH);
    for (const cl of cells) {
      cl.y += cl.s * dt; if (cl.y > VH + 50) { cl.y = -50; cl.x = rand(0, 1); }
      ctx.fillStyle = `rgba(255,255,255,${cl.a})`; ctx.beginPath(); ctx.arc(cl.x * VW, cl.y, cl.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(214,51,108,0.25)'; ctx.fillRect(0, 0, 26, VH); ctx.fillRect(VW - 26, 0, 26, VH);
    for (const s of shots) { ctx.fillStyle = '#7fdbff'; ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    for (const s of snot) { ctx.fillStyle = '#8ac926'; ctx.strokeStyle = '#3c6e14'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    for (const g of germs) drawGerm(ctx, g, t);
    if (boss) drawBoss(ctx, boss, t);
    if (boss && bossSayT > 0) bubble(ctx, bossSay, boss.x, boss.y - 70);
    drawSub(ctx, ship, t);
    pp.draw(ctx, dt);
    if (splat > 0) { ctx.globalAlpha = Math.min(0.6, splat * 0.5); ctx.fillStyle = '#8ac926'; for (const [x, y, r] of [[0.3, 0.4, 120], [0.65, 0.3, 90], [0.5, 0.65, 140]]) { ctx.beginPath(); ctx.arc(x * VW, y * VH, r, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
    // HUD
    ctx.fillStyle = 'rgba(29,43,54,0.85)'; roundRect(ctx, 16, 14, 230, 40, 20); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 18px Fredoka, Arial'; ctx.textAlign = 'left';
    ctx.fillText(`🦠 Germs zapped: ${killed}`, 30, 40);
    if (boss) {
      const bw = Math.min(400, VW - 300), bx = (VW - bw) / 2;
      ctx.fillStyle = 'rgba(29,43,54,0.85)'; roundRect(ctx, bx - 10, 16, bw + 20, 30, 15); ctx.fill();
      ctx.fillStyle = '#8ac926'; roundRect(ctx, bx, 24, bw * (boss.hp / boss.max), 14, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 14px Fredoka, Arial'; ctx.textAlign = 'center'; ctx.fillText('KING GERM', VW / 2, 60);
    }
    if (state === 'intro') banner(ctx, VW, VH, stT < 0.9 ? 'SHRINKING DOWN...' : 'BLAST THOSE GERMS!', '#7fdbff', VH / 2 - 40, 52);
    if (state === 'win') banner(ctx, VW, VH, 'GERMS DEFEATED!', '#2ec4b6');
    if (state === 'timeout') banner(ctx, VW, VH, 'THE GERMS RETREAT!', '#ff8a2a', VH / 2 - 40, 52);
    return null;
  });
  A.close();
  return result;
}

function face(ctx, x, y, r, angry, hit) {
  ctx.fillStyle = '#fff';
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(x + sx * r * 0.35, y - r * 0.15, r * 0.24, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#1d2b36';
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(x + sx * r * 0.32, y - r * 0.1, r * 0.11, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = Math.max(2, r * 0.1);
  if (angry) for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sx * r * 0.6, y - r * 0.5); ctx.lineTo(x + sx * r * 0.15, y - r * 0.35); ctx.stroke(); }
  ctx.beginPath();
  if (hit) ctx.arc(x, y + r * 0.35, r * 0.18, 0, Math.PI * 2);
  else { ctx.moveTo(x - r * 0.3, y + r * 0.35); ctx.lineTo(x - r * 0.1, y + r * 0.25); ctx.lineTo(x + r * 0.1, y + r * 0.38); ctx.lineTo(x + r * 0.3, y + r * 0.28); }
  ctx.stroke();
}

function drawGerm(ctx, g, t) {
  const col = g.kind === 'sneezer' ? '#ff9f1c' : g.kind === 'spiky' ? '#9b5de5' : '#80b918';
  ctx.save();
  ctx.fillStyle = g.hitT > 0 ? '#ffffff' : col; ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 3;
  ctx.beginPath();
  const n = g.kind === 'spiky' ? 10 : 8;
  for (let i = 0; i <= n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + t;
    const rr = g.r * (i % 2 ? (g.kind === 'spiky' ? 1.35 : 1.1) : 0.95) + Math.sin(t * 6 + i) * 1.5;
    const x = g.x + Math.cos(a) * rr, y = g.y + Math.sin(a) * rr;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  face(ctx, g.x, g.y, g.r, true, g.hitT > 0);
  ctx.restore();
}

function drawBoss(ctx, b, t) {
  ctx.save();
  const r = 62;
  ctx.fillStyle = b.hitT > 0 ? '#ffffff' : '#55a630'; ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2; const rr = r * (i % 2 ? 1.1 : 0.96) + Math.sin(t * 4 + i) * 3; const x = b.x + Math.cos(a) * rr, y = b.y + Math.sin(a) * rr * 0.85; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  face(ctx, b.x, b.y, r, true, b.hitT > 0);
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath(); ctx.moveTo(b.x - 34, b.y - 52); ctx.lineTo(b.x - 34, b.y - 84); ctx.lineTo(b.x - 17, b.y - 66); ctx.lineTo(b.x, b.y - 90); ctx.lineTo(b.x + 17, b.y - 66); ctx.lineTo(b.x + 34, b.y - 84); ctx.lineTo(b.x + 34, b.y - 52); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawSub(ctx, s, t) {
  ctx.save();
  if (s.inv > 0 && Math.floor(t * 14) % 2 === 0) ctx.globalAlpha = 0.5;
  ctx.translate(s.x, s.y);
  ctx.lineWidth = 3; ctx.strokeStyle = '#1d2b36';
  ctx.fillStyle = '#ffd23f'; roundRect(ctx, -20, -30, 40, 62, 20); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(-14, 26); ctx.lineTo(0, 44 + Math.sin(t * 30) * 4); ctx.lineTo(14, 26); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#bde0fe'; ctx.beginPath(); ctx.arc(0, -6, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f1c27d'; ctx.beginPath(); ctx.arc(0, -5, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e63946'; ctx.fillRect(-3, 10, 6, 14); ctx.fillRect(-7, 14, 14, 6);
  for (const sx of [-1, 1]) { ctx.fillStyle = '#90a4ae'; roundRect(ctx, sx * 20 - (sx > 0 ? 0 : 8), -14, 8, 22, 3); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
