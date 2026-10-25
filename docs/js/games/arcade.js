// Shared helpers for the 2D arcade mini-games (they draw on the #c2d canvas over the 3D room).
import { sfx, music } from '../audio.js';
import { h } from '../ui.js';

export function openArcade(G, { VH = 540, song = 'chase', buttons = [] } = {}) {
  const { E, ui } = G;
  const canvas = document.getElementById('c2d');
  const ctx = canvas.getContext('2d');
  canvas.classList.remove('hidden');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  E.paused3D = true;
  music.play(song);
  ui.showHUD(false);
  const touch = {};
  ui.touch.innerHTML = '';
  for (const b of buttons) {
    const el = h('button', 'tbtn ' + b.cls + ' interactive', b.label);
    const on = e => { e.preventDefault(); touch[b.key] = true; };
    const off = e => { e.preventDefault(); touch[b.key] = false; };
    el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
    ui.touch.appendChild(el);
  }
  if (buttons.length) ui.touch.classList.remove('hidden');
  const view = { VH, VW: 960, scale: 1, dpr: 1 };
  const key = (...codes) => codes.some(c => E.input.keys.has(c));
  // pointer position in virtual (game) coordinates
  const pointer = () => ({ x: E.input.cx * view.dpr / view.scale, y: E.input.cy * view.dpr / view.scale, down: E.input.down, has: E.input.has });
  // how much of the screen edge the notch covers, in game units
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:env(safe-area-inset-left);top:0;width:0;height:0;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  function run(frame) {
    return new Promise(res => {
      let last = performance.now();
      let raf;
      const loop = now => {
        raf = requestAnimationFrame(loop);
        const dt = Math.min(0.033, (now - last) / 1000); last = now;
        if (G.E.paused) return;
        view.dpr = Math.min(2, window.devicePixelRatio || 1);
        const cw = Math.round((canvas.clientWidth || window.innerWidth) * view.dpr), ch = Math.round((canvas.clientHeight || window.innerHeight) * view.dpr);
        if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
        view.scale = canvas.height / VH;
        view.VW = canvas.width / view.scale;
        view.safeL = (probe.getBoundingClientRect().left || 0) * view.dpr / view.scale;
        ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
        let r;
        try { r = frame(dt, view); } catch (e) { console.error(e); r = { score: 50 }; }
        if (r) { cancelAnimationFrame(raf); res(r); }
      };
      raf = requestAnimationFrame(loop);
    });
  }
  function close() {
    probe.remove();
    canvas.classList.add('hidden');
    ui.touch.classList.add('hidden'); ui.touch.innerHTML = '';
    E.paused3D = false;
    ui.showHUD(true);
    music.play('clinic');
  }
  return { canvas, ctx, touch, key, pointer, run, close, view, sfx };
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function banner(ctx, VW, VH, text, color, y = VH / 2 - 40, size = 64) {
  ctx.save();
  ctx.font = `700 ${size}px Fredoka, Arial`; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  ctx.lineWidth = size / 5; ctx.strokeStyle = '#1d2b36'; ctx.strokeText(text, VW / 2, y);
  ctx.fillStyle = color; ctx.fillText(text, VW / 2, y);
  ctx.restore();
}

export function bubble(ctx, text, x, y) {
  ctx.save();
  ctx.font = '600 18px Fredoka, Arial';
  const w = ctx.measureText(text).width + 24;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 3;
  roundRect(ctx, x - w / 2, y - 34, w, 34, 14); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x, y + 12); ctx.lineTo(x + 8, y); ctx.fill();
  ctx.fillStyle = '#1d2b36'; ctx.textAlign = 'center'; ctx.fillText(text, x, y - 11);
  ctx.restore();
}

export function pops() {
  const list = [];
  return {
    add(text, x, y, color = '#1d2b36', size = 24) { list.push({ text, x, y, t: 0, color, size }); },
    draw(ctx, dt) {
      for (const p of list) {
        p.t += dt;
        ctx.globalAlpha = Math.max(0, 1 - p.t / 1.2);
        ctx.font = `700 ${p.size}px Fredoka, Arial`; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.strokeText(p.text, p.x, p.y - p.t * 50);
        ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y - p.t * 50);
        ctx.globalAlpha = 1;
      }
      for (let i = list.length - 1; i >= 0; i--) if (list[i].t > 1.2) list.splice(i, 1);
    },
  };
}
