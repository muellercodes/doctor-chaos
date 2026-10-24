// Lights Out: the prankster patient killed the power. Find them in the dark hospital wing with a flashlight.
import { clamp, rand, pick, shuffle } from '../engine.js';
import { openArcade, roundRect, banner, bubble, pops as makePops } from './arcade.js';

const T = 56; // tile size
const SPOOKY = ['Wooooooo...', 'Hehehe...', 'Over heeere...', 'Are you scaaared?', 'BOO! ...no wait, not yet.', 'I can see youuu...'];

function makeMaze(cw, ch) {
  const W = cw * 2 + 1, H = ch * 2 + 1;
  const g = Array.from({ length: H }, () => new Array(W).fill(1));
  const seen = Array.from({ length: ch }, () => new Array(cw).fill(false));
  const stack = [[0, 0]]; seen[0][0] = true; g[1][1] = 0;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const nb = shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]).map(([dx, dy]) => [x + dx, y + dy, dx, dy]).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < cw && ny < ch && !seen[ny][nx]);
    if (!nb.length) { stack.pop(); continue; }
    const [nx, ny, dx, dy] = nb[0];
    seen[ny][nx] = true;
    g[y * 2 + 1 + dy][x * 2 + 1 + dx] = 0;
    g[ny * 2 + 1][nx * 2 + 1] = 0;
    stack.push([nx, ny]);
  }
  // knock out some extra walls so there are loops (less frustrating)
  for (let i = 0; i < cw * ch * 0.35; i++) {
    const x = 1 + Math.floor(Math.random() * (W - 2)), y = 1 + Math.floor(Math.random() * (H - 2));
    if (g[y][x] === 1 && ((x % 2 === 1 && y % 2 === 0) || (x % 2 === 0 && y % 2 === 1))) g[y][x] = 0;
  }
  return { g, W, H };
}

export async function play(G, P) {
  const c = P.c;
  await G.howTo('lightsout', 'LIGHTS OUT!', [
    `${c.first} pulled a prank and <b>turned off the power</b>! They're hiding somewhere in the dark wing, dressed as a ghost.`,
    'Move with <b>arrow keys / WASD</b>, or <b>hold the mouse</b> where you want to walk. Your flashlight points where you go.',
    "<b>Listen</b> for giggles and watch for glowing eyes. The radar beeps faster when you're close.",
  ], '🔦');
  const A = openArcade(G, { VH: 540, song: 'surgery' });
  const { ctx, sfx } = A;
  const diff = G.diff;
  const cw = 8 + Math.round(diff * 2), ch = 6;
  const { g, W, H } = makeMaze(cw, ch);
  const solid = (tx, ty) => tx < 0 || ty < 0 || tx >= W || ty >= H || g[ty][tx] === 1;
  // player at top-left, ghost in a far cell
  const pl = { x: T * 1.5, y: T * 1.5, ang: 0, r: 14, step: 0 };
  const cells = [];
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) cells.push({ x: (x * 2 + 1.5) * T, y: (y * 2 + 1.5) * T, d: x + y });
  const far = cells.filter(cc => cc.d >= (cw + ch) * 0.6);
  const gh = { ...pick(far.length ? far : cells), bob: 0, found: false };
  const decor = [];
  for (let i = 0; i < 22; i++) { const cc = pick(cells); decor.push({ x: cc.x + rand(-16, 16), y: cc.y + rand(-16, 16), k: pick(['paper', 'duck', 'bucket', 'chair', 'skeleton']) }); }
  // a note scribbled on the floor somewhere, only readable in the flashlight
  const mid = cells.filter(cc => cc.d >= 3 && cc.x !== gh.x);
  const note = pick(mid.length ? mid : cells);
  const pp = makePops();
  const dark = document.createElement('canvas');
  const dctx = dark.getContext('2d');
  let state = 'intro', stT = 0, t = 0, beepT = 0, spookT = 2, say = null, sayT = 0, flick = 0;
  const limit = 55 - diff * 8;
  G.dbg = { kind: 'lightsout', pl, gh, g, T, get state() { return state; } };

  const move = (dx, dy) => {
    // axis-separated movement with circle-vs-tile collision
    const tryMove = (nx, ny) => {
      const r = pl.r;
      for (let ty = Math.floor((ny - r) / T); ty <= Math.floor((ny + r) / T); ty++) for (let tx = Math.floor((nx - r) / T); tx <= Math.floor((nx + r) / T); tx++) {
        if (!solid(tx, ty)) continue;
        const cx = clamp(nx, tx * T, tx * T + T), cy = clamp(ny, ty * T, ty * T + T);
        if ((nx - cx) ** 2 + (ny - cy) ** 2 < r * r) return false;
      }
      return true;
    };
    if (tryMove(pl.x + dx, pl.y)) pl.x += dx;
    if (tryMove(pl.x, pl.y + dy)) pl.y += dy;
  };

  const result = await A.run((dt, view) => {
    const { VW, VH } = view;
    stT += dt;
    if (state === 'intro' && stT > 1.6) { state = 'play'; stT = 0; }
    const camX = W * T <= VW ? (W * T - VW) / 2 : clamp(pl.x - VW / 2, 0, W * T - VW);
    const camY = H * T <= VH ? (H * T - VH) / 2 : clamp(pl.y - VH / 2, 0, H * T - VH);
    if (state === 'play') {
      t += dt;
      let mx = 0, my = 0;
      if (A.key('ArrowLeft', 'KeyA')) mx -= 1; if (A.key('ArrowRight', 'KeyD')) mx += 1;
      if (A.key('ArrowUp', 'KeyW')) my -= 1; if (A.key('ArrowDown', 'KeyS')) my += 1;
      const ptr = A.pointer();
      if (!mx && !my && ptr.down) { const wx = ptr.x + camX, wy = ptr.y + camY; const d = Math.hypot(wx - pl.x, wy - pl.y); if (d > 10) { mx = (wx - pl.x) / d; my = (wy - pl.y) / d; } }
      const len = Math.hypot(mx, my);
      if (len > 0) {
        mx /= len; my /= len;
        const sp = 190 * dt;
        move(mx * sp, my * sp);
        const want = Math.atan2(my, mx);
        let da = want - pl.ang; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        pl.ang += da * Math.min(1, dt * 10);
        pl.step += dt * 10;
        if (Math.floor(pl.step) % 4 === 0 && Math.random() < 0.15) sfx.step();
      }
      const dist = Math.hypot(gh.x - pl.x, gh.y - pl.y);
      // radar beep
      beepT -= dt;
      if (beepT <= 0) { beepT = clamp(dist / 500, 0.18, 1.4); sfx.beep(); }
      // spooky hints
      spookT -= dt; sayT -= dt;
      if (spookT <= 0) { spookT = rand(3, 5); say = pick(SPOOKY); sayT = 1.8; const pan = clamp((gh.x - pl.x) / 400, -1, 1); sfx.giggle(pan, c.voice || 1.2); }
      flick = Math.random() < 0.01 ? 0.15 : Math.max(0, flick - dt);
      if (dist < 40) { state = 'found'; stT = 0; gh.found = true; sfx.thud(); sfx.great(); }
      if (t > limit) { state = 'timeout'; stT = 0; sfx.bad(); }
    }
    if (state === 'found' && stT > 2.2) return { score: clamp(110 - t * 1.4, 40, 100), found: true };
    if (state === 'timeout' && stT > 2.2) return { score: 30, found: false };

    // ---------- draw world ----------
    ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.translate(-camX, -camY);
    for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
      const x = tx * T, y = ty * T;
      if (x - camX > VW || y - camY > VH || x - camX < -T || y - camY < -T) continue;
      if (g[ty][tx] === 1) { ctx.fillStyle = '#2f6f68'; ctx.fillRect(x, y, T, T); ctx.fillStyle = '#3e8a81'; ctx.fillRect(x, y, T, 8); }
      else { ctx.fillStyle = (tx + ty) % 2 ? '#dcebe7' : '#eef6f3'; ctx.fillRect(x, y, T, T); }
    }
    for (const d of decor) drawDecor(ctx, d);
    ctx.save(); ctx.translate(note.x, note.y); ctx.rotate(-0.15); ctx.fillStyle = 'rgba(120,60,160,0.75)'; ctx.font = '700 10px Fredoka, Arial'; ctx.textAlign = 'center'; ctx.fillText('psst... code:', 0, -4); ctx.font = '700 13px Fredoka, Arial'; ctx.fillText('GHOST', 0, 10); ctx.restore();
    drawGhost(ctx, gh, t, state === 'found');
    drawDoc(ctx, pl, G.coatColor || '#ffffff');
    ctx.restore();
    // ---------- darkness with flashlight ----------
    if (state !== 'found') {
      if (dark.width !== Math.ceil(VW) || dark.height !== VH) { dark.width = Math.ceil(VW); dark.height = VH; }
      dctx.globalCompositeOperation = 'source-over';
      dctx.fillStyle = `rgba(3,6,14,${0.97 - flick})`; dctx.fillRect(0, 0, dark.width, dark.height);
      dctx.globalCompositeOperation = 'destination-out';
      const px = pl.x - camX, py = pl.y - camY;
      let rg = dctx.createRadialGradient(px, py, 10, px, py, 80);
      rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = rg; dctx.beginPath(); dctx.arc(px, py, 80, 0, Math.PI * 2); dctx.fill();
      rg = dctx.createRadialGradient(px, py, 20, px, py, 290);
      rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(0.75, 'rgba(0,0,0,0.85)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = rg; dctx.beginPath(); dctx.moveTo(px, py); dctx.arc(px, py, 290, pl.ang - 0.5, pl.ang + 0.5); dctx.closePath(); dctx.fill();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(dark, 0, 0, dark.width, dark.height, 0, 0, dark.width * view.scale, dark.height * view.scale);
      ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
      // glowing eyes show through the dark when you're close-ish
      const dist = Math.hypot(gh.x - pl.x, gh.y - pl.y);
      if (dist < 330) {
        const a = clamp(1 - dist / 330, 0, 1) * (0.5 + 0.5 * Math.sin(t * 5));
        ctx.fillStyle = `rgba(255,255,200,${a})`;
        for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(gh.x - camX + sx * 8, gh.y - camY - 6 + Math.sin(gh.bob) * 4, 4, 6, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      if (sayT > 0 && say && dist < 400) bubble(ctx, say, clamp(gh.x - camX, 120, VW - 120), clamp(gh.y - camY - 40, 60, VH - 20));
    }
    pp.draw(ctx, dt);
    // HUD
    const left = Math.max(0, Math.ceil(limit - t));
    ctx.fillStyle = 'rgba(29,43,54,0.85)'; roundRect(ctx, VW / 2 - 130, VH - 54, 260, 40, 20); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 18px Fredoka, Arial'; ctx.textAlign = 'center';
    ctx.fillText(`🔦 Find ${c.first}!   ⏱ ${left}`, VW / 2, VH - 28);
    if (state === 'intro') banner(ctx, VW, VH, stT < 0.9 ? '*click* ...LIGHTS OUT!' : 'FIND THE GHOST!', '#ffd23f', VH / 2 - 40, 52);
    if (state === 'found') { banner(ctx, VW, VH, 'BOO!!!', '#ffffff', VH / 2 - 60, 96); banner(ctx, VW, VH, 'Found you!', '#2ec4b6', VH / 2 + 30, 40); }
    if (state === 'timeout') banner(ctx, VW, VH, 'The lights flicker back on...', '#ffd23f', VH / 2 - 40, 40);
    return null;
  });
  A.close();
  return result;
}

function drawDoc(ctx, p, coat) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.lineWidth = 3; ctx.strokeStyle = '#1d2b36';
  ctx.fillStyle = coat; ctx.beginPath(); ctx.ellipse(0, 0, 15, 11, p.ang + Math.PI / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3b2a20'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(Math.cos(p.ang) * 16, Math.sin(p.ang) * 16, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawGhost(ctx, gh, t, found) {
  gh.bob += 0.05;
  const x = gh.x, y = gh.y + Math.sin(gh.bob) * 4;
  const s = found ? 1.6 : 1;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, -8, 18, Math.PI, 0); ctx.lineTo(18, 16);
  for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(18 - i * 9 - 4.5, 22 + (i % 2 ? -4 : 4), 18 - (i + 1) * 9, 16);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1d2b36';
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 7, -8, 3.5, 5, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(0, 3, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff5d8f'; ctx.fillRect(-6, 18, 4, 6); ctx.fillRect(3, 18, 4, 6);
  ctx.restore();
}

function drawDecor(ctx, d) {
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(29,43,54,0.7)';
  switch (d.k) {
    case 'paper': ctx.fillStyle = '#ffffff'; ctx.rotate(0.4); ctx.fillRect(-7, -9, 14, 18); ctx.strokeRect(-7, -9, 14, 18); break;
    case 'duck': ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(6, -5, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); break;
    case 'bucket': ctx.fillStyle = '#90a4ae'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); break;
    case 'chair': ctx.fillStyle = '#ff8a2a'; ctx.fillRect(-9, -9, 18, 18); ctx.strokeRect(-9, -9, 18, 18); ctx.fillRect(-9, -13, 18, 5); break;
    case 'skeleton': ctx.fillStyle = '#f5f5f5'; ctx.beginPath(); ctx.arc(0, -8, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillRect(-1.5, -2, 3, 14); ctx.fillRect(-7, 2, 14, 2); ctx.fillRect(-6, 6, 12, 2); break;
  }
  ctx.restore();
}
