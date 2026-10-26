// Ear scope: look around inside the ear with a little circle of light and tap every hidden thing.
import * as THREE from 'three';
import { clamp, rand, pick, shuffle } from '../engine.js';
import { h } from '../ui.js';
import { icon } from '../icons.js';

const THINGS = {
  wax: 'A glob of earwax. Gross!',
  bug: 'A tiny ladybug!',
  lego: 'A LEGO brick!',
  bead: 'A purple bead!',
  popcorn: 'A popcorn kernel!',
  pea: 'A green pea?!',
  note: 'A tiny note that says HI!',
  crayon: 'A crayon tip!',
};
const POKE = ['Ow! That is my eardrum!', 'Careful in there!', 'That tickles. Badly.', 'Hey! Gentle!'];

function drawCanal(ctx, W, H, seed) {
  // a soft pink tunnel with folds and tiny hairs (not gross, promise)
  const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.65);
  g.addColorStop(0, '#5a1f2c'); g.addColorStop(0.18, '#a8445a'); g.addColorStop(0.45, '#e8909c'); g.addColorStop(1, '#f6c3b7');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(170,70,90,0.35)'; ctx.lineWidth = 6;
  for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(W / 2, H / 2, 60 + i * 55, 40 + i * 40, 0.2 * Math.sin(i + seed), 0.3 + i * 0.4, 0.3 + i * 0.4 + 2.2); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(120,60,50,0.45)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 140; i++) {
    const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * Math.max(W, H) * 0.5;
    const x = W / 2 + Math.cos(a) * r, y = H / 2 + Math.sin(a) * r * 0.75;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(a) * 9, y - Math.sin(a) * 9); ctx.stroke();
  }
}

function drawThing(ctx, k, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#1d2b36';
  const circ = (cx, cy, r, f) => { ctx.fillStyle = f; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };
  if (k === 'wax') { ctx.fillStyle = '#d9a441'; ctx.beginPath(); ctx.moveTo(-14, 6); ctx.bezierCurveTo(-16, -10, 0, -14, 6, -8); ctx.bezierCurveTo(16, -10, 18, 6, 8, 10); ctx.bezierCurveTo(0, 14, -10, 12, -14, 6); ctx.fill(); ctx.stroke(); }
  if (k === 'bug') { circ(0, 0, 11, '#e63946'); circ(-12, 0, 6, '#1d2b36'); ctx.beginPath(); ctx.moveTo(-1, -11); ctx.lineTo(-1, 11); ctx.stroke(); ctx.fillStyle = '#1d2b36'; for (const [a, b] of [[4, -5], [5, 5], [-5, -4], [-4, 5]]) { ctx.beginPath(); ctx.arc(a, b, 2.2, 0, 7); ctx.fill(); } }
  if (k === 'lego') { ctx.fillStyle = '#3a86ff'; ctx.fillRect(-14, -6, 28, 14); ctx.strokeRect(-14, -6, 28, 14); for (const sx of [-7, 7]) { ctx.fillRect(sx - 4, -11, 8, 5); ctx.strokeRect(sx - 4, -11, 8, 5); } }
  if (k === 'bead') { circ(0, 0, 11, '#9b5de5'); circ(0, 0, 3.5, '#f6c3b7'); }
  if (k === 'popcorn') { for (const [a, b, r] of [[-6, 2, 7], [5, 3, 7], [0, -5, 7], [3, 7, 5]]) circ(a, b, r, '#fff8dc'); }
  if (k === 'pea') { circ(0, 0, 9, '#6ab04c'); }
  if (k === 'note') { ctx.fillStyle = '#ffffff'; ctx.save(); ctx.rotate(-0.2); ctx.fillRect(-12, -9, 24, 18); ctx.strokeRect(-12, -9, 24, 18); ctx.fillStyle = '#1d2b36'; ctx.font = '700 11px Fredoka, Arial'; ctx.textAlign = 'center'; ctx.fillText('HI', 0, 4); ctx.restore(); }
  if (k === 'secret') { ctx.save(); ctx.rotate(0.35); ctx.fillStyle = '#fff8dc'; ctx.fillRect(-15, -7, 30, 14); ctx.strokeRect(-15, -7, 30, 14); ctx.fillStyle = '#7b3fa0'; ctx.font = '700 7px Fredoka, Arial'; ctx.textAlign = 'center'; ctx.fillText('XAWRAE', 0, 3); ctx.restore(); }
  if (k === 'crayon') { ctx.save(); ctx.rotate(0.6); ctx.fillStyle = '#2ecc71'; ctx.fillRect(-12, -5, 20, 10); ctx.strokeRect(-12, -5, 20, 10); ctx.beginPath(); ctx.moveTo(8, -5); ctx.lineTo(16, 0); ctx.lineTo(8, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
  ctx.restore();
}

export async function play(G, P) {
  const { E, ui, sfx } = G;
  const person = P.person;
  await G.howTo('otoscope', 'Ear Scope: Look Inside', [
    'Move around to <b>look inside the ear</b>. You can only see what is in the light.',
    '<b>Tap</b> every hidden thing you spot. The chart says how many.',
    "Don't poke around randomly. And hurry, the patient gets wiggly!",
  ], icon('otoscope'));
  const S = E.scope();
  person.setPose('sit'); await E.wait(0.2);
  // turn the head so the ear faces you
  const yaw0 = person.lookYaw;
  await E.tween(0.5, k => { person.lookYaw = yaw0 + (1.25 - yaw0) * k; });
  S.defer(() => { person.lookYaw = 0; });
  const hc = person.headCenter();
  await E.frame(hc, 0.42 * person.s, 0.3 * person.s, new THREE.Vector3(-0.15, 0.1, 1), 0.7);
  const diff = G.tutorial ? 0 : Math.min(1.4, G.diff);
  const root = document.getElementById('ui');
  const wrap = S.dom(h('div', 'scope-view'));
  const cv = document.createElement('canvas'); wrap.appendChild(cv);
  root.appendChild(wrap);
  const ctx = cv.getContext('2d');
  const W = root.clientWidth, H = root.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const canal = document.createElement('canvas'); canal.width = W; canal.height = H;
  drawCanal(canal.getContext('2d'), W, H, Math.random() * 10);
  const n = G.tutorial ? 2 : 3 + (diff > 0.9 ? 1 : 0);
  const kinds = shuffle(Object.keys(THINGS)).slice(0, n);
  const rx = W * 0.36, ry = H * 0.32;
  const items = kinds.map((k, i) => {
    const a = (i / n) * Math.PI * 2 + rand(-0.4, 0.4), r = rand(0.35, 1);
    return { k, x: W / 2 + Math.cos(a) * rx * r, y: H / 2 + Math.sin(a) * ry * r, found: false, s: 0.95 + Math.random() * 0.3 };
  });
  // once in a while there is a secret note way off to the side (not needed to win)
  if (!G.tutorial && Math.random() < 0.12) { const a = rand(0, Math.PI * 2); items.push({ k: 'secret', x: W / 2 + Math.cos(a) * rx * 1.15, y: H / 2 + Math.sin(a) * ry * 1.1, found: false, s: 0.7, bonus: true }); }
  const lensR = Math.max(70, Math.min(W, H) * 0.17) * (G.tutorial ? 1.25 : 1) * Math.sqrt(G.tol);
  const lens = { x: W / 2, y: H / 2 };
  let t = 0, pokes = 0, found = 0, done = false;
  const limit = G.tutorial ? 60 : 32 - diff * 7;
  ui.timer.show(limit);
  ui.hint(E.coarse ? `Drag to look around. Find <b>${n}</b> hidden things and <b>tap</b> each one!` : `Find <b>${n}</b> hidden things in the ear. Click each one!`);
  const foundM = ui.meter({ label: `Found 0 of ${n}`, value: 0, fill: '#2bb3a3' });
  G.dbg = { kind: 'otoscope', items, lens, lensR };
  let endRes;
  const ended = new Promise(r => { endRes = r; });
  const jig = { x: 0, y: 0 };
  S.update(dt => {
    t += dt;
    const ptr = E.input.has ? { x: E.input.cx, y: E.input.cy } : { x: W / 2, y: H / 2 };
    lens.x += (ptr.x - lens.x) * Math.min(1, dt * 14); lens.y += (ptr.y - lens.y) * Math.min(1, dt * 14);
    const wig = 3 + diff * 5 + (t > limit * 0.6 ? 6 : 0);
    jig.x = Math.sin(t * 2.3) * wig + Math.sin(t * 5.1) * wig * 0.4; jig.y = Math.cos(t * 1.9) * wig * 0.8;
    // draw
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(8,10,18,0.94)'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath(); ctx.arc(lens.x, lens.y, lensR, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(canal, jig.x, jig.y);
    for (const it of items) if (!it.found) drawThing(ctx, it.k, it.x + jig.x, it.y + jig.y, it.s * 1.15);
    const vg = ctx.createRadialGradient(lens.x, lens.y, lensR * 0.55, lens.x, lens.y, lensR);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(lens.x - lensR, lens.y - lensR, lensR * 2, lensR * 2);
    ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = '#cfd8dc'; ctx.beginPath(); ctx.arc(lens.x, lens.y, lensR + 3, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#1d2b36'; ctx.beginPath(); ctx.arc(lens.x, lens.y, lensR + 7, 0, Math.PI * 2); ctx.stroke();
    ui.timer.set(limit - t);
    if (!done && t > limit) { done = true; endRes('time'); }
  });
  // dragging moves the light; a tap picks (so looking around never pokes the ear)
  S.pick(() => {
    if (done) return;
    const x = E.input.cx, y = E.input.cy;
    const hit = items.find(it => !it.found && Math.hypot(it.x + jig.x - x, it.y + jig.y - y) < 26 * it.s && Math.hypot(it.x + jig.x - lens.x, it.y + jig.y - lens.y) < lensR + 10);
    if (hit && hit.bonus) { hit.found = true; sfx.ding(); ui.pop('A secret note! It says XAWRAE. Backwards?', x, y - 30, 'good'); return; }
    if (hit) {
      hit.found = true; found++; sfx.great();
      ui.pop(THINGS[hit.k], x, y - 30, 'good');
      foundM.set(found / n); foundM.el.querySelector('.meter-label').textContent = `Found ${found} of ${n}`;
      if (found >= n) { done = true; endRes('all'); }
    } else {
      pokes++; sfx.ouch(P.c.voice || 1); person.wiggle = 0.3; G.mood(-3);
      ui.pop('Ow!', x, y - 20, 'bad');
      if (pokes % 2 === 1) G.say(pick(POKE), { key: 'c', hold: 0.6 });
    }
  }, 'explore');
  const how = await ended;
  ui.timer.hide(); foundM.remove(); ui.hint(null);
  await E.wait(0.4);
  S.end();
  await E.tween(0.35, k => { person.lookYaw = 1.25 * (1 - k); });
  if (found > 0) G.say(found >= n ? pick(['Wait, ALL of that was in my ear?!', 'I can hear SO much better. Too much, actually.', 'So THAT is where my LEGO went!']) : 'Is there still stuff in there? It still feels crunchy.', { key: 'c', hold: 0.8 });
  if (found === 0) return { score: 5, fail: true, severity: 1, reason: 'otoscope' };
  const timeUsed = Math.min(t, limit);
  return { score: clamp(100 - (n - found) * 28 - pokes * 5 - Math.max(0, timeUsed - limit * 0.55) * 1.2, 20, 100), fail: false };
}
