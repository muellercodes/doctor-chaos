// Fast food mini-games (after promotion 100 the hospital becomes a burger place).
// Grill, fryer, soda fountain, soft serve, and stacking the burger. All drawn on the 2D canvas.
import { clamp, rand, pick } from '../engine.js';
import { openArcade, roundRect, banner, pops } from './arcade.js';
import { icon } from '../icons.js';

const INK = '#1d2b36';
function panelBox(ctx, x, y, w, h, fill = '#fffaf0') { ctx.fillStyle = fill; ctx.strokeStyle = INK; ctx.lineWidth = 4; roundRect(ctx, x, y, w, h, 16); ctx.fill(); ctx.stroke(); }
function meter(ctx, x, y, w, h, v, zone, label, colors = ['#f7a8a8', '#7be495', '#4a4a4a']) {
  ctx.fillStyle = '#e8edf1'; ctx.strokeStyle = INK; ctx.lineWidth = 3; roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
  ctx.save(); roundRect(ctx, x, y, w, h, h / 2); ctx.clip();
  ctx.fillStyle = colors[0]; ctx.fillRect(x, y, w * zone[0], h);
  ctx.fillStyle = colors[1]; ctx.fillRect(x + w * zone[0], y, w * (zone[1] - zone[0]), h);
  ctx.fillStyle = colors[2]; ctx.fillRect(x + w * zone[1], y, w * (1 - zone[1]), h);
  ctx.restore();
  ctx.stroke();
  const mx = x + w * clamp(v, 0, 1);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(mx, y - 4); ctx.lineTo(mx - 9, y - 18); ctx.lineTo(mx + 9, y - 18); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (label) { ctx.fillStyle = INK; ctx.font = '700 16px Fredoka, Arial'; ctx.textAlign = 'left'; ctx.fillText(label, x, y - 24); }
}
function ticket(ctx, VW, lines) {
  const w = 230, x = VW - w - 18, y = 70;
  ctx.save(); ctx.translate(x, y); ctx.rotate(0.02);
  ctx.fillStyle = '#fffef6'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, 30 + lines.length * 24);
  for (let i = 0; i <= 10; i++) ctx.lineTo(w - (i * w) / 10, 30 + lines.length * 24 + (i % 2 ? 8 : 0));
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c21d3b'; ctx.font = '700 15px Fredoka, Arial'; ctx.textAlign = 'left'; ctx.fillText('ORDER', 12, 22);
  ctx.fillStyle = INK; ctx.font = '600 17px Fredoka, Arial';
  lines.forEach((l, i) => ctx.fillText(l, 12, 46 + i * 24));
  ctx.restore();
}
const hint = (ctx, VW, text) => { ctx.save(); ctx.font = '700 19px Fredoka, Arial'; const w = Math.min(VW - 40, ctx.measureText(text).width + 36); ctx.fillStyle = 'rgba(29,43,54,0.88)'; roundRect(ctx, VW / 2 - w / 2, 14, w, 38, 19); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(text, VW / 2, 40); ctx.restore(); };
function kitchenBg(ctx, VW, VH) {
  ctx.fillStyle = '#f3e6cf'; ctx.fillRect(0, 0, VW, VH);
  // tiles
  ctx.strokeStyle = 'rgba(160,130,90,0.25)'; ctx.lineWidth = 2;
  for (let x = 0; x < VW; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VH * 0.62); ctx.stroke(); }
  for (let y = 0; y < VH * 0.62; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke(); }
  // counter
  const cy = VH * 0.62;
  const g = ctx.createLinearGradient(0, cy, 0, VH); g.addColorStop(0, '#b0bec5'); g.addColorStop(1, '#78909c');
  ctx.fillStyle = g; ctx.fillRect(0, cy, VW, VH - cy);
  ctx.fillStyle = '#cfd8dc'; ctx.fillRect(0, cy, VW, 10);
}
function setup(G, title, lines, iconName) {
  return G.howTo(title.id, title.name, lines, icon(iconName));
}
let tapReq = false;
function listen(G) { tapReq = false; const f = () => { tapReq = true; }; G.E.input.listeners.down.add(f); return () => G.E.input.listeners.down.delete(f); }
const takeTap = () => { const t = tapReq; tapReq = false; return t; };

// ---------------- GRILL ----------------
export async function grill(G, P, prm = {}) {
  await setup(G, { id: 'grill', name: 'The Grill' }, [
    'The patty cooks on the bottom. Watch the <b>cook meter</b>.',
    '<b>Tap</b> to flip it when the meter is in the <b>green</b>.',
    'Then <b>tap</b> again to serve it when the second side is green. Raw or burnt gets sent back!',
  ], 'burger');
  const A = openArcade(G, { song: 'focus' });
  const off = listen(G);
  const { ctx, sfx } = A;
  const diff = Math.min(1.4, G.diff), tol = G.tol;
  const want = prm.done || pick(['medium', 'medium', 'well']);
  const z = want === 'well' ? [0.72, 0.9] : [0.55, 0.76];
  const zone = [z[0] - 0.03 * (tol - 1), z[1] + 0.03 * (tol - 1)];
  const sides = [0, 0];
  let side = 0, t = 0, phase = 'cook', flipT = 0, rate = 0.3 + diff * 0.12, flare = 0, result = null, endT = 0, smoke = [];
  const pp = pops();
  G.dbg = { kind: 'grill', get phase() { return phase; }, cook: () => sides[side], zone, side: () => side };
  const res = await A.run((dt, v) => {
    const { VW, VH } = v;
    t += dt;
    if (phase === 'cook') {
      if (Math.random() < dt * (0.15 + diff * 0.2)) flare = rand(0.5, 1.2);
      flare = Math.max(0, flare - dt);
      sides[side] += dt * rate * (1 + flare * 0.9);
      if (takeTap()) {
        if (side === 0) { side = 1; flipT = 0.45; sfx.whoosh(); pp.add(sides[0] < zone[0] ? 'A bit pink...' : sides[0] > zone[1] ? 'Crispy!' : 'Nice flip!', VW / 2, VH * 0.36, sides[0] >= zone[0] && sides[0] <= zone[1] ? '#2ecc71' : '#e67e22'); }
        else { phase = 'done'; endT = 0; sfx.ding(); }
      }
      if (sides[side] > 1.18) { phase = 'done'; endT = 0; sfx.bad(); }
    } else {
      endT += dt;
      if (endT > 1.4) {
        const raw = sides.some(s => s < zone[0] - 0.22), burnt = sides.some(s => s > 1.05);
        const err = sides.reduce((a, s) => a + (s < zone[0] ? zone[0] - s : s > zone[1] ? s - zone[1] : 0), 0);
        result = raw ? { score: 5, fail: true, severity: 1, reason: 'raw' } : burnt ? { score: 5, fail: true, severity: 1, reason: 'burnt' } : { score: clamp(100 - err * 160, 25, 100), fail: false };
        return result;
      }
    }
    // draw
    kitchenBg(ctx, VW, VH);
    hint(ctx, VW, phase === 'cook' ? (side === 0 ? 'Tap to FLIP when it is green!' : 'Tap to SERVE when it is green!') : 'Order up!');
    ticket(ctx, VW, [`1 burger, ${want === 'well' ? 'well done' : 'medium'}`]);
    // grill plate
    const gx = VW / 2 - 220, gy = VH * 0.34;
    ctx.fillStyle = '#37474f'; ctx.strokeStyle = INK; ctx.lineWidth = 4; roundRect(ctx, gx, gy, 440, 230, 18); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#263238'; ctx.lineWidth = 8;
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(gx + 30 + i * 48, gy + 18); ctx.lineTo(gx + 30 + i * 48, gy + 212); ctx.stroke(); }
    // fire glow
    const glow = ctx.createRadialGradient(VW / 2, gy + 200, 10, VW / 2, gy + 200, 260); glow.addColorStop(0, `rgba(255,120,40,${0.25 + flare * 0.3})`); glow.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = glow; ctx.fillRect(gx, gy, 440, 230);
    // patty: top shows the side facing up (the other side's doneness)
    const up = side === 0 ? 0 : sides[0];
    // raw pink, then brown, then charcoal
    const shade = s => {
      const k = clamp(s, 0, 1.3);
      const stops = [[0, [222, 118, 132]], [0.45, [190, 108, 98]], [0.7, [128, 74, 44]], [1.0, [84, 48, 28]], [1.3, [28, 22, 20]]];
      let i = 0; while (i < stops.length - 2 && k > stops[i + 1][0]) i++;
      const [a, ca] = stops[i], [b, cb] = stops[i + 1], f = clamp((k - a) / (b - a), 0, 1);
      return `rgb(${ca.map((v, j) => Math.round(v + (cb[j] - v) * f)).join(',')})`;
    };
    const fl = flipT > 0 ? Math.abs(Math.cos((1 - flipT / 0.45) * Math.PI)) : 1; flipT = Math.max(0, flipT - dt);
    ctx.save(); ctx.translate(VW / 2, gy + 115 - (flipT > 0 ? Math.sin((1 - flipT / 0.45) * Math.PI) * 80 : 0)); ctx.scale(1, 0.55 * fl);
    ctx.fillStyle = shade(up); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (up > 0.5) { ctx.strokeStyle = 'rgba(30,15,10,0.6)'; ctx.lineWidth = 10; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-90, i * 34); ctx.lineTo(90, i * 34); ctx.stroke(); } }
    ctx.restore();
    // sizzle and smoke
    if (phase === 'cook' && Math.random() < dt * (6 + sides[side] * 10)) smoke.push({ x: VW / 2 + rand(-100, 100), y: gy + 100, t: 0, dark: sides[side] > 0.95 });
    for (const sm of smoke) { sm.t += dt; ctx.fillStyle = sm.dark ? `rgba(60,60,60,${0.5 - sm.t * 0.3})` : `rgba(255,255,255,${0.5 - sm.t * 0.3})`; ctx.beginPath(); ctx.arc(sm.x + Math.sin(sm.t * 3) * 10, sm.y - sm.t * 90, 10 + sm.t * 18, 0, 7); ctx.fill(); }
    smoke = smoke.filter(sm => sm.t < 1.6);
    if (phase === 'cook' && Math.random() < dt * 4) sfx.rattle && sfx.rattle();
    meter(ctx, VW / 2 - 200, VH - 70, 400, 26, sides[side] / 1.18, [zone[0] / 1.18, zone[1] / 1.18], side === 0 ? 'Bottom side' : 'Second side', ['#f7a8a8', '#7be495', '#5d4037']);
    if (phase === 'done') banner(ctx, VW, VH, sides.some(s => s > 1.05) ? 'BURNT!' : sides.some(s => s < zone[0] - 0.22) ? 'STILL RAW!' : 'Order up!', sides.some(s => s > 1.05 || s < zone[0] - 0.22) ? '#ff8b8b' : '#7be495', VH * 0.3, 56);
    pp.draw(ctx, dt);
    return null;
  });
  off(); A.close();
  return res;
}

// ---------------- FRYER ----------------
export async function fryer(G, P, prm = {}) {
  await setup(G, { id: 'fryer', name: 'The Fryer' }, [
    '<b>Tap</b> to drop the basket into the oil.',
    'Watch the fries turn golden. <b>Tap</b> again to lift them out when the meter is <b>green</b>.',
    'Then <b>tap the salt</b> a few times. Not too much!',
  ], 'fries');
  const A = openArcade(G, { song: 'focus' });
  const off = listen(G);
  const { ctx, sfx } = A;
  const diff = Math.min(1.4, G.diff), tol = G.tol;
  const zone = [0.6 - 0.03 * (tol - 1), 0.82 + 0.03 * (tol - 1)];
  let phase = 'drop', c = 0, t = 0, basket = 0, salt = 0, endT = 0, bubbles = [], lifted = 0;
  const wantSalt = prm.salt || pick([2, 3, 3, 4]);
  const pp = pops();
  G.dbg = { kind: 'fryer', get phase() { return phase; }, color: () => c, zone, salt: () => salt, wantSalt };
  const res = await A.run((dt, v) => {
    const { VW, VH } = v;
    t += dt;
    if (phase === 'drop') { if (takeTap()) { phase = 'fry'; sfx.splat(); } }
    else if (phase === 'fry') {
      basket = Math.min(1, basket + dt * 4);
      c += dt * (0.22 + diff * 0.1) * (basket >= 1 ? 1 : 0.3);
      if (takeTap()) { phase = 'salt'; lifted = c; sfx.pop(); pp.add(c < zone[0] ? 'Pale and floppy...' : c > zone[1] ? 'Extra crispy...' : 'Golden!', VW / 2, VH * 0.35, c >= zone[0] && c <= zone[1] ? '#2ecc71' : '#e67e22'); }
      if (c > 1.2) { phase = 'end'; lifted = c; sfx.bad(); }
    } else if (phase === 'salt') {
      basket = Math.max(0, basket - dt * 4);
      if (takeTap()) { salt++; endT = 0; sfx.rattle(); }
      // once there is enough salt, a short pause means you are done
      if (salt >= wantSalt) { endT += dt; if (endT > 1.1 || salt >= wantSalt + 2) { phase = 'end'; endT = 1.1; } }
    }
    if (phase === 'end') {
      endT += dt;
      if (endT > 2.4) {
        if (lifted < zone[0] - 0.25) return { score: 5, fail: true, severity: 1, reason: 'soggy' };
        if (lifted > 1.05) return { score: 5, fail: true, severity: 1, reason: 'burnt_fries' };
        const err = lifted < zone[0] ? zone[0] - lifted : lifted > zone[1] ? lifted - zone[1] : 0;
        return { score: clamp(100 - err * 170 - Math.abs(salt - wantSalt) * 10, 25, 100), fail: false };
      }
    }
    kitchenBg(ctx, VW, VH);
    hint(ctx, VW, phase === 'drop' ? 'Tap to DROP the basket!' : phase === 'fry' ? 'Tap to LIFT when they are golden!' : phase === 'salt' ? `Tap to salt them (${wantSalt} shakes)` : 'Fries up!');
    ticket(ctx, VW, [`1 fries, ${wantSalt >= 4 ? 'extra salty' : wantSalt <= 2 ? 'light salt' : 'salted'}`]);
    // fryer vat
    const fx = VW / 2 - 200, fy = VH * 0.36;
    ctx.fillStyle = '#90a4ae'; ctx.strokeStyle = INK; ctx.lineWidth = 4; roundRect(ctx, fx - 20, fy - 20, 440, 240, 16); ctx.fill(); ctx.stroke();
    const oil = ctx.createLinearGradient(0, fy, 0, fy + 200); oil.addColorStop(0, '#f9c74f'); oil.addColorStop(1, '#c88a12');
    ctx.fillStyle = oil; roundRect(ctx, fx, fy, 400, 200, 10); ctx.fill(); ctx.stroke();
    if (phase === 'fry' && Math.random() < dt * 40) bubbles.push({ x: fx + rand(20, 380), y: fy + rand(60, 190), t: 0 });
    for (const b of bubbles) { b.t += dt; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y - b.t * 60, 3 + b.t * 6, 0, 7); ctx.stroke(); }
    bubbles = bubbles.filter(b => b.t < 0.8);
    // basket with fries
    const by = fy - 120 + basket * 150;
    ctx.save(); ctx.translate(VW / 2, by);
    ctx.strokeStyle = '#607d8b'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(130, -10); ctx.lineTo(260, -90); ctx.stroke();
    ctx.fillStyle = '#263238'; roundRect(ctx, 250, -104, 70, 26, 10); ctx.fill();
    const col = (k => { k = clamp(k, 0, 1.3); const r = 250 - k * 40 - Math.max(0, k - 0.85) * 300, g2 = 230 - k * 90 - Math.max(0, k - 0.85) * 250, b2 = 160 - k * 120; return `rgb(${Math.max(40, r) | 0},${Math.max(30, g2) | 0},${Math.max(10, b2) | 0})`; })(phase === 'salt' || phase === 'end' ? lifted : c);
    for (let i = 0; i < 22; i++) { ctx.save(); ctx.translate(-110 + (i % 11) * 22, -18 + Math.floor(i / 11) * 14); ctx.rotate(((i * 37) % 10 - 5) * 0.06); ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillRect(-5, -38, 10, 52); ctx.strokeRect(-5, -38, 10, 52); ctx.restore(); }
    ctx.strokeStyle = '#78909c'; ctx.lineWidth = 4; roundRect(ctx, -140, -10, 280, 40, 8); ctx.stroke();
    for (let i = -120; i <= 120; i += 20) { ctx.beginPath(); ctx.moveTo(i, -10); ctx.lineTo(i, 30); ctx.stroke(); }
    ctx.restore();
    // salt shaker
    if (phase === 'salt' || phase === 'end') {
      ctx.save(); ctx.translate(VW / 2 + 220, VH * 0.3); ctx.rotate(Math.sin(t * 20) * (phase === 'salt' ? 0.2 : 0));
      ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 4; roundRect(ctx, -26, -50, 52, 90, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#cfd8dc'; roundRect(ctx, -26, -64, 52, 22, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; ctx.font = '700 20px Fredoka, Arial'; ctx.textAlign = 'center'; ctx.fillText('SALT', 0, 4);
      ctx.restore();
      ctx.fillStyle = INK; ctx.font = '700 20px Fredoka, Arial'; ctx.textAlign = 'center'; ctx.fillText(`${salt} / ${wantSalt}`, VW / 2 + 220, VH * 0.3 + 70);
    }
    meter(ctx, VW / 2 - 200, VH - 40, 400, 22, (phase === 'salt' || phase === 'end' ? lifted : c) / 1.2, [zone[0] / 1.2, zone[1] / 1.2], 'Golden meter', ['#fff3b0', '#7be495', '#6d4c2f']);
    if (phase === 'end' && endT > 0.2) banner(ctx, VW, VH, lifted > 1.05 ? 'BURNT FRIES!' : lifted < zone[0] - 0.25 ? 'SOGGY!' : 'Fries up!', lifted > 1.05 || lifted < zone[0] - 0.25 ? '#ff8b8b' : '#7be495', VH * 0.3, 52);
    pp.draw(ctx, dt);
    return null;
  });
  off(); A.close();
  return res;
}

// ---------------- SODA ----------------
export async function soda(G, P, prm = {}) {
  await setup(G, { id: 'soda', name: 'Soda Fountain' }, [
    '<b>Hold</b> to pour. Let go when the drink reaches the <b>line</b>.',
    'Fizz makes it look fuller than it is, and it settles after you stop.',
    'Overflow and it goes everywhere!',
  ], 'soda');
  const A = openArcade(G, { song: 'focus' });
  const { ctx, sfx } = A;
  const diff = Math.min(1.4, G.diff), tol = G.tol;
  const size = prm.size || pick(['small', 'medium', 'large']);
  const target = { small: 0.55, medium: 0.7, large: 0.85 }[size];
  const flavor = prm.flavor || pick([['Cola', '#5d3a1a'], ['Orange', '#ff8a2a'], ['Lemon-Lime', '#c5e86c'], ['Grape', '#7b3fa0'], ['Root Beer', '#4a2511']]);
  let liquid = 0, foam = 0, phase = 'pour', poured = false, endT = 0, t = 0, spill = 0;
  const pp = pops();
  G.dbg = { kind: 'soda', get phase() { return phase; }, level: () => liquid + foam, liquid: () => liquid, foam: () => foam, target };
  const res = await A.run((dt, v) => {
    const { VW, VH } = v;
    t += dt;
    const holding = G.E.input.down;
    if (phase === 'pour') {
      if (holding) { poured = true; liquid += dt * (0.2 + diff * 0.08); foam = Math.min(0.16, foam + dt * (0.12 + diff * 0.04)); if (Math.random() < dt * 8) sfx.blip(0.4); }
      else { foam = Math.max(0, foam - dt * 0.18); if (poured && !holding) { phase = 'settle'; endT = 0; } }
      if (liquid + foam > 1.0) { spill += dt; if (spill > 0.25) { phase = 'settle'; sfx.splat(); } }
    } else if (phase === 'settle') {
      foam = Math.max(0, foam - dt * 0.25);
      endT += dt;
      if (endT > 1.6) {
        if (spill > 0.25) return { score: 5, fail: true, severity: 1, reason: 'overflow' };
        const err = Math.abs(liquid - target);
        if (err > 0.25) return { score: 10, fail: true, severity: 1, reason: 'short_pour' };
        return { score: clamp(100 - Math.max(0, err - 0.03 * tol) * 380, 25, 100), fail: false };
      }
    }
    kitchenBg(ctx, VW, VH);
    hint(ctx, VW, phase === 'pour' ? 'HOLD to pour. Let go at the line!' : 'Letting the fizz settle...');
    ticket(ctx, VW, [`1 ${size} ${flavor[0]}`]);
    // fountain
    const cx = VW / 2, top = VH * 0.12;
    ctx.fillStyle = '#e63946'; ctx.strokeStyle = INK; ctx.lineWidth = 4; roundRect(ctx, cx - 150, top, 300, 120, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '700 26px Fredoka, Arial'; ctx.textAlign = 'center'; ctx.fillText('DR. FIZZ', cx, top + 70);
    ctx.fillStyle = '#90a4ae'; roundRect(ctx, cx - 16, top + 118, 32, 34, 6); ctx.fill(); ctx.stroke();
    // cup
    const ch = { small: 150, medium: 190, large: 230 }[size], cw = 130, cyb = VH * 0.88, cyt = cyb - ch;
    if (holding && phase === 'pour') { ctx.fillStyle = flavor[1]; ctx.fillRect(cx - 5, top + 152, 10, cyb - (top + 152) - ch * liquid); }
    ctx.save(); ctx.beginPath(); ctx.moveTo(cx - cw / 2, cyt); ctx.lineTo(cx + cw / 2, cyt); ctx.lineTo(cx + cw / 2 - 18, cyb); ctx.lineTo(cx - cw / 2 + 18, cyb); ctx.closePath(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(cx - cw, cyt, cw * 2, ch);
    ctx.fillStyle = flavor[1]; ctx.fillRect(cx - cw, cyb - ch * Math.min(1.05, liquid), cw * 2, ch * Math.min(1.05, liquid));
    ctx.fillStyle = 'rgba(255,248,230,0.95)'; ctx.fillRect(cx - cw, cyb - ch * Math.min(1.1, liquid + foam), cw * 2, ch * foam);
    for (let i = 0; i < 8; i++) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(cx - 40 + ((i * 29 + t * 30) % 80), cyb - ((t * 60 + i * 37) % (ch * Math.max(0.05, liquid))), 3, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - cw / 2, cyt); ctx.lineTo(cx + cw / 2, cyt); ctx.lineTo(cx + cw / 2 - 18, cyb); ctx.lineTo(cx - cw / 2 + 18, cyb); ctx.closePath(); ctx.stroke();
    // fill line
    const ly = cyb - ch * target;
    ctx.setLineDash([10, 6]); ctx.strokeStyle = '#c21d3b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - cw / 2 - 30, ly); ctx.lineTo(cx + cw / 2 + 30, ly); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#c21d3b'; ctx.font = '700 16px Fredoka, Arial'; ctx.textAlign = 'left'; ctx.fillText('FILL LINE', cx + cw / 2 + 36, ly + 5);
    if (spill > 0.25) { ctx.fillStyle = flavor[1]; ctx.beginPath(); ctx.ellipse(cx, cyb + 6, 150, 14, 0, 0, 7); ctx.fill(); banner(ctx, VW, VH, 'OVERFLOW!', '#ff8b8b', VH * 0.42, 54); }
    pp.draw(ctx, dt);
    return null;
  });
  A.close();
  return res;
}

// ---------------- SOFT SERVE ----------------
export async function sundae(G, P, prm = {}) {
  await setup(G, { id: 'sundae', name: 'Soft Serve' }, [
    'The cone slides back and forth under the machine.',
    '<b>Hold</b> to pour ice cream only when the cone is <b>right under the nozzle</b>.',
    'Fill the cone up. Ice cream on the floor makes customers sad.',
  ], 'icecream');
  const A = openArcade(G, { song: 'focus' });
  const { ctx, sfx } = A;
  const diff = Math.min(1.4, G.diff), tol = G.tol;
  const flavor = prm.flavor || pick([['Vanilla', '#fff6e0'], ['Chocolate', '#7b4a2a'], ['Strawberry', '#ffb3c7'], ['Swirl', '#e8d1b0']]);
  let fill = 0, mess = 0, t = 0, endT = 0, phase = 'pour', coneX = 0, drops = [];
  const speed = 1.1 + diff * 0.7;
  const pp = pops();
  G.dbg = { kind: 'sundae', get phase() { return phase; }, coneX: () => coneX, nozzleX: () => 0, fill: () => fill, win: () => 34 * tol };
  const res = await A.run((dt, v) => {
    const { VW, VH } = v;
    t += dt;
    coneX = Math.sin(t * speed) * 210 + Math.sin(t * speed * 2.3) * 30 * diff;
    const under = Math.abs(coneX) < 34 * tol;
    if (phase === 'pour') {
      if (G.E.input.down) {
        if (under) { fill += dt * 0.42; if (Math.random() < dt * 10) sfx.squeak && sfx.squeak(); }
        else { drops.push({ x: 0, y: VH * 0.3, v: 0 }); mess += dt; }
      }
      if (fill >= 1) { phase = 'done'; endT = 0; sfx.ding(); }
      if (mess > 1.4) { phase = 'done'; endT = 0; sfx.splat(); }
    } else {
      endT += dt;
      if (endT > 1.4) {
        if (mess > 1.4) return { score: 5, fail: true, severity: 1, reason: 'ice_mess' };
        return { score: clamp(100 - mess * 50, 25, 100), fail: false };
      }
    }
    kitchenBg(ctx, VW, VH);
    hint(ctx, VW, phase === 'pour' ? 'HOLD when the cone is under the nozzle!' : 'One cone, coming up!');
    ticket(ctx, VW, [`1 ${flavor[0]} cone`]);
    const cx = VW / 2, top = VH * 0.08;
    ctx.fillStyle = '#cfd8dc'; ctx.strokeStyle = INK; ctx.lineWidth = 4; roundRect(ctx, cx - 120, top, 240, 140, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5d8f'; roundRect(ctx, cx - 100, top + 20, 200, 40, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '700 22px Fredoka, Arial'; ctx.textAlign = 'center'; ctx.fillText('SOFT SERVE', cx, top + 48);
    ctx.fillStyle = '#90a4ae'; ctx.beginPath(); ctx.moveTo(cx - 22, top + 140); ctx.lineTo(cx + 22, top + 140); ctx.lineTo(cx + 10, top + 175); ctx.lineTo(cx - 10, top + 175); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (G.E.input.down && phase === 'pour') { ctx.fillStyle = flavor[1]; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillRect(cx - 8, top + 175, 16, VH * 0.6 - top - 175 - fill * 90); }
    // falling mess
    for (const d of drops) { d.v += dt * 900; d.y += d.v * dt; }
    drops = drops.filter(d => d.y < VH);
    ctx.fillStyle = flavor[1]; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    for (const d of drops) { ctx.beginPath(); ctx.arc(cx + d.x, d.y, 8, 0, 7); ctx.fill(); ctx.stroke(); }
    if (mess > 0) { ctx.beginPath(); ctx.ellipse(cx, VH * 0.96, 40 + mess * 80, 12, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    // cone
    const x = cx + coneX, y = VH * 0.62;
    ctx.fillStyle = '#e0a458'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x - 44, y); ctx.lineTo(x + 44, y); ctx.lineTo(x, y + 150); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,70,20,0.6)'; ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * 14 - 10, y); ctx.lineTo(x + i * 6, y + 150 - Math.abs(i) * 20); ctx.stroke(); }
    // swirls
    ctx.fillStyle = flavor[1]; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    const layers = Math.floor(fill * 4 + 0.001);
    for (let i = 0; i < layers; i++) { const w = 48 - i * 10; ctx.beginPath(); ctx.ellipse(x, y - 10 - i * 24, w, 18, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    if (fill >= 1) { ctx.beginPath(); ctx.moveTo(x - 8, y - 100); ctx.quadraticCurveTo(x, y - 128, x + 6, y - 104); ctx.fill(); ctx.stroke(); }
    // fill meter
    ctx.fillStyle = INK; ctx.font = '700 16px Fredoka, Arial'; ctx.textAlign = 'left'; ctx.fillText('Cone full', 24, VH - 64);
    ctx.fillStyle = '#e8edf1'; roundRect(ctx, 24, VH - 54, 220, 22, 11); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7be495'; roundRect(ctx, 24, VH - 54, 220 * Math.min(1, fill), 22, 11); ctx.fill();
    if (phase === 'done') banner(ctx, VW, VH, mess > 1.4 ? 'WHAT A MESS!' : 'Perfect cone!', mess > 1.4 ? '#ff8b8b' : '#7be495', VH * 0.42, 52);
    pp.draw(ctx, dt);
    return null;
  });
  A.close();
  return res;
}

// ---------------- STACK THE BURGER ----------------
const PARTS = {
  bunB: { label: 'Bottom bun', color: '#e0a458' }, patty: { label: 'Patty', color: '#6d4321' }, cheese: { label: 'Cheese', color: '#ffd23f' },
  lettuce: { label: 'Lettuce', color: '#6ab04c' }, tomato: { label: 'Tomato', color: '#e63946' }, pickles: { label: 'Pickles', color: '#8ab84c' },
  onion: { label: 'Onion', color: '#f5f0ff' }, bunT: { label: 'Top bun', color: '#e8b064' },
};
export function burgerOrder(n = 5) {
  const mid = ['patty', ...['cheese', 'lettuce', 'tomato', 'pickles', 'onion'].sort(() => Math.random() - 0.5).slice(0, Math.max(1, n - 3))];
  if (n >= 7) mid.splice(2, 0, 'patty');
  return ['bunB', ...mid, 'bunT'];
}
export async function assemble(G, P, prm = {}) {
  await setup(G, { id: 'assemble', name: 'Build the Burger' }, [
    'The order ticket shows how the burger stacks, from the <b>bottom up</b>.',
    '<b>Tap the ingredients</b> in that order.',
    'Three wrong ones and the customer sends it back.',
  ], 'burger');
  const A = openArcade(G, { song: 'focus' });
  const off = listen(G);
  const { ctx, sfx } = A;
  const diff = Math.min(1.4, G.diff);
  const order = prm.order || burgerOrder(5 + (diff > 0.8 ? 1 : 0) + (diff > 1.2 ? 1 : 0));
  const keys = Object.keys(PARTS);
  let idx = 0, wrong = 0, t = 0, endT = 0, phase = 'build', drop = null;
  const stack = [];
  const pp = pops();
  let btns = [];
  const view = { VW: 960, VH: 540 };
  G.dbg = { kind: 'assemble', get phase() { return phase; }, next: () => order[idx], btn: k => { const b = btns.find(x => x.k === k); return b ? { x: (b.x + b.w / 2), y: (b.y + b.h / 2) } : null; }, toScreen: (x, y) => ({ x: x * A.view.scale / A.view.dpr, y: y * A.view.scale / A.view.dpr }) };
  const res = await A.run((dt, v) => {
    const { VW, VH } = v; Object.assign(view, { VW, VH });
    t += dt;
    // buttons along the bottom
    const bw = Math.min(110, (VW - 40) / keys.length - 8), bh = 70, by = VH - bh - 14;
    btns = keys.map((k, i) => ({ k, x: (VW - keys.length * (bw + 8)) / 2 + i * (bw + 8), y: by, w: bw, h: bh }));
    if (phase === 'build' && takeTap()) {
      const p = A.pointer();
      const b = btns.find(b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h);
      if (b) {
        if (b.k === order[idx]) { stack.push(b.k); drop = { k: b.k, y: -120 }; idx++; sfx.pop(); if (idx >= order.length) { phase = 'done'; endT = 0; sfx.ding(); } }
        else { wrong++; sfx.bad(); pp.add(pick(['Not that one!', 'Check the ticket!', 'Wrong order!']), b.x + b.w / 2, by - 20, '#e63946'); if (wrong >= 3) { phase = 'done'; endT = 0; } }
      }
    }
    if (phase === 'done') { endT += dt; if (endT > 1.5) { off(); return wrong >= 3 ? { score: 5, fail: true, severity: 1, reason: 'wrong_burger' } : { score: clamp(100 - wrong * 22, 25, 100), fail: false }; } }
    kitchenBg(ctx, VW, VH);
    hint(ctx, VW, phase === 'build' ? `Next: ${PARTS[order[Math.min(idx, order.length - 1)]].label}?` : wrong >= 3 ? 'Sent back!' : 'Order up!');
    // ticket shows the stack from the bottom up
    ticket(ctx, VW, order.map((k, i) => `${i < idx ? '✓ ' : '   '}${i + 1}. ${PARTS[k].label}`).slice(0, 9));
    // plate and stack
    const px = VW * 0.36, py = VH * 0.66;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(px, py, 150, 30, 0, 0, 7); ctx.fill(); ctx.stroke();
    let y = py - 8;
    const drawPart = (k, yy) => {
      const c = PARTS[k].color; ctx.fillStyle = c; ctx.strokeStyle = INK; ctx.lineWidth = 3;
      if (k === 'bunT') { ctx.beginPath(); ctx.ellipse(px, yy - 10, 100, 44, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff6d6'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(px - 50 + i * 20, yy - 34 + (i % 2) * 8, 4, 2, 0.3, 0, 7); ctx.fill(); } return 46; }
      if (k === 'bunB') { roundRect(ctx, px - 100, yy - 22, 200, 24, 10); ctx.fill(); ctx.stroke(); return 24; }
      if (k === 'patty') { roundRect(ctx, px - 104, yy - 24, 208, 24, 12); ctx.fill(); ctx.stroke(); return 24; }
      if (k === 'cheese') { ctx.beginPath(); ctx.moveTo(px - 106, yy - 8); ctx.lineTo(px + 106, yy - 8); ctx.lineTo(px + 80, yy + 8); ctx.lineTo(px + 60, yy - 2); ctx.lineTo(px - 70, yy + 6); ctx.closePath(); ctx.fill(); ctx.stroke(); return 10; }
      if (k === 'lettuce') { ctx.beginPath(); for (let i = 0; i <= 12; i++) ctx.lineTo(px - 110 + i * 18.3, yy - 8 + (i % 2 ? 8 : -2)); ctx.lineTo(px + 110, yy - 16); ctx.lineTo(px - 110, yy - 16); ctx.closePath(); ctx.fill(); ctx.stroke(); return 14; }
      if (k === 'tomato') { for (const dx of [-55, 0, 55]) { ctx.beginPath(); ctx.ellipse(px + dx, yy - 8, 32, 9, 0, 0, 7); ctx.fill(); ctx.stroke(); } return 16; }
      if (k === 'pickles') { for (const dx of [-60, -20, 20, 60]) { ctx.beginPath(); ctx.ellipse(px + dx, yy - 5, 18, 6, 0, 0, 7); ctx.fill(); ctx.stroke(); } return 10; }
      if (k === 'onion') { ctx.lineWidth = 4; for (const dx of [-50, 0, 50]) { ctx.beginPath(); ctx.ellipse(px + dx, yy - 5, 26, 7, 0, 0, 7); ctx.stroke(); } return 10; }
      return 14;
    };
    for (let i = 0; i < stack.length; i++) {
      const k = stack[i];
      const isDrop = drop && i === stack.length - 1;
      if (isDrop) { drop.y = Math.min(0, drop.y + dt * 900); }
      const hgt = drawPart(k, y + (isDrop ? drop.y : 0));
      y -= hgt;
    }
    // ingredient buttons
    for (const b of btns) {
      panelBox(ctx, b.x, b.y, b.w, b.h, '#fff');
      ctx.save(); ctx.beginPath(); roundRect(ctx, b.x, b.y, b.w, b.h, 16); ctx.clip();
      ctx.fillStyle = PARTS[b.k].color; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(b.x + b.w / 2, b.y + 26, b.w * 0.32, 12, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = INK; ctx.font = `700 ${b.w < 90 ? 12 : 14}px Fredoka, Arial`; ctx.textAlign = 'center'; ctx.fillText(PARTS[b.k].label, b.x + b.w / 2, b.y + 58);
    }
    ctx.fillStyle = '#c21d3b'; ctx.font = '700 16px Fredoka, Arial'; ctx.textAlign = 'left'; ctx.fillText('Mistakes: ' + wrong + ' / 3', 20, 80);
    if (phase === 'done') banner(ctx, VW, VH, wrong >= 3 ? 'SENT BACK!' : 'Burger up!', wrong >= 3 ? '#ff8b8b' : '#7be495', VH * 0.3, 52);
    pp.draw(ctx, dt);
    return null;
  });
  off(); A.close();
  return res;
}
