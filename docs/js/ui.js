import { sfx } from './audio.js';

export function h(tag, cls = '', html = '') {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html;
  return el;
}

export const ICONS = {
  tweezers: '<svg viewBox="0 0 48 48"><path d="M14 6 L22 40 L24 40 L19 6Z" fill="#cfd8dc" stroke="#1d2b36" stroke-width="2.5" stroke-linejoin="round"/><path d="M34 6 L26 40 L24 40 L29 6Z" fill="#cfd8dc" stroke="#1d2b36" stroke-width="2.5" stroke-linejoin="round"/><rect x="13" y="10" width="7" height="12" rx="2" fill="#ff8a2a" stroke="#1d2b36" stroke-width="2" transform="rotate(-12 16 16)"/><rect x="28" y="10" width="7" height="12" rx="2" fill="#ff8a2a" stroke="#1d2b36" stroke-width="2" transform="rotate(12 31 16)"/></svg>',
  shot: '<svg viewBox="0 0 48 48"><g transform="rotate(-45 24 24)"><rect x="19" y="10" width="10" height="22" rx="2" fill="#bdeaff" stroke="#1d2b36" stroke-width="2.5"/><rect x="21" y="18" width="6" height="12" fill="#3ec1d3"/><rect x="22.5" y="2" width="3" height="8" fill="#eceff1" stroke="#1d2b36" stroke-width="2"/><rect x="17" y="1" width="14" height="3" rx="1" fill="#eceff1" stroke="#1d2b36" stroke-width="2"/><line x1="24" y1="32" x2="24" y2="45" stroke="#1d2b36" stroke-width="2.5"/></g></svg>',
  blood: '<svg viewBox="0 0 48 48"><rect x="17" y="8" width="14" height="34" rx="7" fill="#e3f6ff" stroke="#1d2b36" stroke-width="2.5"/><path d="M19 24 h10 v11 a5 5 0 0 1 -10 0z" fill="#e63946"/><rect x="15" y="4" width="18" height="8" rx="3" fill="#9b5de5" stroke="#1d2b36" stroke-width="2.5"/></svg>',
  surgery: '<svg viewBox="0 0 48 48"><g transform="rotate(-40 24 24)"><path d="M21 4 L27 4 L27 16 Q24 24 21 16Z" fill="#eceff1" stroke="#1d2b36" stroke-width="2.5" stroke-linejoin="round"/><rect x="20.5" y="18" width="7" height="26" rx="2" fill="#90a4ae" stroke="#1d2b36" stroke-width="2.5"/><rect x="20.5" y="28" width="7" height="10" fill="#ff8a2a"/></g></svg>',
  reflex: '<svg viewBox="0 0 48 48"><rect x="22" y="16" width="4" height="30" rx="2" fill="#cfd8dc" stroke="#1d2b36" stroke-width="2.5"/><path d="M8 8 L40 8 L24 20 Z" fill="#e63946" stroke="#1d2b36" stroke-width="2.5" stroke-linejoin="round"/></svg>',
  steth: '<svg viewBox="0 0 48 48"><path d="M12 4 v12 a10 10 0 0 0 20 0 v-12" fill="none" stroke="#26a69a" stroke-width="4"/><path d="M22 26 v6 q0 10 10 10" fill="none" stroke="#26a69a" stroke-width="4"/><circle cx="36" cy="38" r="7" fill="#cfd8dc" stroke="#1d2b36" stroke-width="2.5"/><circle cx="12" cy="4" r="3" fill="#1d2b36"/><circle cx="32" cy="4" r="3" fill="#1d2b36"/></svg>',
  cast: '<svg viewBox="0 0 48 48"><ellipse cx="18" cy="24" rx="12" ry="14" fill="#fffaf0" stroke="#1d2b36" stroke-width="2.5"/><ellipse cx="18" cy="24" rx="5" ry="6" fill="#ffd6a5" stroke="#1d2b36" stroke-width="2"/><path d="M18 38 L44 38 L44 30" fill="#fffaf0" stroke="#1d2b36" stroke-width="2.5" stroke-linejoin="round"/></svg>',
};

export const TOOLS = [
  { id: 'tweezers', label: 'Tweezers' },
  { id: 'shot', label: 'Syringe' },
  { id: 'blood', label: 'Blood Kit' },
  { id: 'surgery', label: 'Scalpel' },
  { id: 'reflex', label: 'Reflex Hammer' },
  { id: 'steth', label: 'Stethoscope' },
  { id: 'cast', label: 'Cast' },
];

const NURSE_SVG = '<svg viewBox="0 0 64 64"><circle cx="32" cy="36" r="20" fill="#c68642"/><path d="M12 34 q0 -22 20 -22 q20 0 20 22 q-4 -12 -20 -12 q-16 0 -20 12z" fill="#2b1d14"/><path d="M16 18 q16 -12 32 0 l-2 6 q-14 -8 -28 0z" fill="#fff" stroke="#1d2b36" stroke-width="2"/><rect x="29" y="12" width="6" height="10" fill="#ff4d5e"/><rect x="27" y="14" width="10" height="6" fill="#ff4d5e"/><circle cx="25" cy="37" r="2.6" fill="#1d2b36"/><circle cx="39" cy="37" r="2.6" fill="#1d2b36"/><path d="M26 45 q6 5 12 0" stroke="#1d2b36" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M21 32 l7 -1.5 M43 32 l-7 -1.5" stroke="#1d2b36" stroke-width="2" stroke-linecap="round"/></svg>';

export function createUI(root, E) {
  const ui = {};
  const layer = (cls) => { const el = h('div', cls); root.appendChild(el); return el; };

  // ---------- HUD ----------
  const hud = layer('hud hidden');
  const hudDay = h('div', 'pill', 'Day 1'); const hudPat = h('div', 'pill', ''); const hudMoney = h('div', 'pill money', '$0');
  const muteBtn = h('button', 'icon-btn interactive', '🔊');
  muteBtn.title = 'Sound on/off';
  muteBtn.onclick = () => { muteBtn.blur(); sfx.setMuted(!sfx.muted); muteBtn.textContent = sfx.muted ? '🔇' : '🔊'; ui.onMute && ui.onMute(sfx.muted); };
  const fsBtn = h('button', 'icon-btn interactive', '⛶');
  fsBtn.title = 'Fullscreen';
  fsBtn.onclick = () => { fsBtn.blur(); try { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); } catch (e) { /* ignore */ } };
  hud.append(hudDay, hudPat, hudMoney, h('div', 'spacer'), muteBtn, fsBtn);
  ui.syncMute = () => { muteBtn.textContent = sfx.muted ? '🔇' : '🔊'; };
  ui.showHUD = v => hud.classList.toggle('hidden', !v);
  let shownMoney = null;
  ui.setHUD = ({ day, patient, money, label }) => {
    if (day !== undefined) hudDay.textContent = label || `Day ${day}`;
    if (patient !== undefined) { hudPat.textContent = patient; hudPat.style.display = patient ? '' : 'none'; }
    if (money !== undefined) {
      if (shownMoney !== null && money !== shownMoney) { hudMoney.classList.remove('bump'); void hudMoney.offsetWidth; hudMoney.classList.add('bump'); }
      shownMoney = money;
      hudMoney.textContent = (money < 0 ? '-$' : '$') + Math.abs(Math.round(money)).toLocaleString();
      hudMoney.classList.toggle('neg', money < 0);
    }
  };

  // ---------- hint & timer ----------
  const hint = layer('hint hidden');
  ui.hint = text => { if (!text) { hint.classList.add('hidden'); return; } hint.innerHTML = text; hint.classList.remove('hidden'); };
  const timerEl = layer('timer hidden');
  ui.timer = {
    show(sec) { timerEl.classList.remove('hidden'); this.set(sec); },
    set(sec) { const s = Math.max(0, Math.ceil(sec)); timerEl.textContent = '⏱ ' + s; timerEl.classList.toggle('low', s <= 5); },
    hide() { timerEl.classList.add('hidden'); },
  };

  // ---------- bubbles ----------
  const bubbles = layer('bubbles');
  const live = new Set();
  E.onUpdate(() => {
    const W = root.clientWidth;
    for (const b of live) {
      if (!b.anchor) continue;
      const p = E.toScreen(b.anchor());
      const bw = b.el.offsetWidth;
      const x = Math.max(bw / 2 + 8, Math.min(W - bw / 2 - 8, p.x));
      const y = Math.max(b.el.offsetHeight + 60, p.y);
      b.el.style.transform = `translate(${x - bw / 2}px, ${y - b.el.offsetHeight}px)`;
      b.el.style.setProperty('--tail', `${Math.max(24, Math.min(bw - 24, p.x - (x - bw / 2)))}px`);
    }
  });
  ui.say = (anchor, text, o = {}) => {
    if (o.key) for (const b of [...live]) if (b.key === o.key) b.kill();
    const el = h('div', 'bubble' + (o.cls ? ' ' + o.cls : ''));
    if (o.name) el.appendChild(h('div', 'bubble-name', o.name));
    const tx = h('div', 'bubble-text'); el.appendChild(tx);
    bubbles.appendChild(el);
    const b = { el, anchor, key: o.key };
    let killed = false;
    b.kill = () => { if (killed) return; killed = true; live.delete(b); el.classList.add('out'); setTimeout(() => el.remove(), 250); };
    live.add(b);
    if (o.pitch !== 0 && !o.silent) sfx.babble(text, o.pitch || 1);
    let i = 0;
    const speed = o.fast ? 90 : 55;
    return new Promise(res => {
      const total = text.length;
      const iv = setInterval(() => {
        i = Math.min(total, i + Math.max(1, Math.round(speed / 30)));
        tx.textContent = text.slice(0, i);
        if (i >= total) {
          clearInterval(iv);
          const hold = o.hold !== undefined ? o.hold : 1.2 + total * 0.035;
          if (o.persist) { res(b); return; }
          setTimeout(() => { b.kill(); res(b); }, hold * 1000);
        }
      }, 33);
      b.finish = () => { clearInterval(iv); tx.textContent = text; };
    });
  };
  ui.clearBubbles = () => { for (const b of [...live]) b.kill(); };

  // ---------- nurse ----------
  const nurse = layer('nurse hidden interactive');
  const nAvatar = h('div', 'nurse-avatar', NURSE_SVG);
  const nBody = h('div', 'nurse-body');
  const nName = h('div', 'nurse-name', 'Nurse Pat');
  const nText = h('div', 'nurse-text');
  const nBtn = h('button', 'btn small', 'Next ▸');
  nBody.append(nName, nText);
  nurse.append(nAvatar, nBody, nBtn);
  let nurseResolve = null;
  const nurseNext = () => { if (nurseResolve) { sfx.click(); const r = nurseResolve; nurseResolve = null; r(); } };
  nBtn.onclick = nurseNext;
  window.addEventListener('keydown', e => { if ((e.code === 'Enter' || e.code === 'Space') && nurseResolve && !nurse.classList.contains('hidden') && !nBtn.classList.contains('hidden')) { e.preventDefault(); nurseNext(); } });
  ui.nurse = (text, o = {}) => {
    nurse.classList.remove('hidden');
    nText.innerHTML = text;
    sfx.babble(text.replace(/<[^>]+>/g, ''), 1.25);
    const wait = o.wait !== false;
    nBtn.classList.toggle('hidden', !wait);
    nBtn.textContent = o.button || 'Next ▸';
    if (!wait) { nurseResolve = null; return Promise.resolve(); }
    return new Promise(res => { nurseResolve = () => { if (o.hide !== false) nurse.classList.add('hidden'); res(); }; });
  };
  ui.nurseHide = () => { nurse.classList.add('hidden'); nurseResolve = null; };

  // ---------- chart ----------
  const chart = layer('chart hidden');
  ui.chart = (c, o = {}) => {
    chart.innerHTML = '';
    chart.append(
      h('div', 'chart-clip'),
      h('div', 'chart-title', 'PATIENT CHART'),
      h('div', 'chart-row', `<b>Name:</b> ${c.name}`),
      h('div', 'chart-row', `<b>Age:</b> ${c.ageLabel}`),
      h('div', 'chart-row complaint', `<b>Complaint:</b> “${c.complaint}”`),
    );
    if (o.note) chart.append(h('div', 'chart-note', `✎ <b>Nurse's note:</b> ${o.note}`));
    if (c.steps.length > 1) chart.append(h('div', 'chart-row small', `Needs ${c.steps.length} things today.`));
    chart.classList.remove('hidden');
  };
  ui.hideChart = () => chart.classList.add('hidden');

  // ---------- tool tray ----------
  const tray = layer('tray hidden');
  ui.pickTool = (o = {}) => new Promise(res => {
    tray.innerHTML = '';
    tray.appendChild(h('div', 'tray-title', o.title || 'Pick a tool'));
    const row = h('div', 'tray-row');
    for (const t of TOOLS) {
      const b = h('button', 'tool interactive' + (o.highlight === t.id ? ' glow' : ''), `${ICONS[t.id]}<span>${t.label}</span>`);
      b.onclick = () => { sfx.click(); res(t.id); };
      row.appendChild(b);
    }
    tray.appendChild(row);
    tray.classList.remove('hidden');
  });
  ui.hideTray = () => tray.classList.add('hidden');
  ui.shakeTray = () => { tray.classList.remove('shake'); void tray.offsetWidth; tray.classList.add('shake'); };

  // ---------- meters ----------
  const meters = layer('meters');
  ui.meter = (o = {}) => {
    const el = h('div', 'meter' + (o.vertical ? ' vertical' : '') + (o.cls ? ' ' + o.cls : ''));
    if (o.label) el.appendChild(h('div', 'meter-label', o.label));
    const track = h('div', 'meter-track');
    for (const z of o.zones || []) {
      const zz = h('div', 'meter-zone');
      zz.style.background = z.color;
      if (o.vertical) { zz.style.bottom = z.from * 100 + '%'; zz.style.height = (z.to - z.from) * 100 + '%'; } else { zz.style.left = z.from * 100 + '%'; zz.style.width = (z.to - z.from) * 100 + '%'; }
      track.appendChild(zz);
    }
    const fill = h('div', 'meter-fill'); if (o.fill) fill.style.background = o.fill;
    const mark = h('div', 'meter-mark');
    if (o.marker) track.appendChild(mark); else track.appendChild(fill);
    el.appendChild(track);
    if (o.ends) { const ends = h('div', 'meter-ends', `<span>${o.ends[0]}</span><span>${o.ends[1]}</span>`); el.appendChild(ends); }
    (o.parent || meters).appendChild(el);
    const api = {
      el,
      set(v) {
        v = Math.max(0, Math.min(1, v));
        if (o.marker) { if (o.vertical) mark.style.bottom = v * 100 + '%'; else mark.style.left = v * 100 + '%'; }
        else if (o.vertical) fill.style.height = v * 100 + '%'; else fill.style.width = v * 100 + '%';
      },
      color(c) { fill.style.background = c; },
      remove() { el.remove(); },
    };
    api.set(o.value || 0);
    return api;
  };

  // ---------- pops / flash ----------
  const pops = layer('pops');
  ui.pop = (text, x, y, cls = '') => {
    const el = h('div', 'pop ' + cls, text);
    el.style.left = x + 'px'; el.style.top = y + 'px';
    pops.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  };
  ui.popAt = (v, text, cls) => { const p = E.toScreen(v); ui.pop(text, p.x, p.y, cls); };
  ui.popCenter = (text, cls) => ui.pop(text, root.clientWidth / 2, root.clientHeight * 0.4, cls);
  const flash = layer('flash');
  ui.flash = (color = 'rgba(255,60,60,0.35)') => {
    flash.style.background = color; flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
  };

  // ---------- action buttons ----------
  const actions = layer('actions');
  ui.actions = (list, o = {}) => new Promise(res => {
    actions.innerHTML = '';
    if (o.title) actions.appendChild(h('div', 'actions-title', o.title));
    const row = h('div', 'actions-row');
    list.forEach(a => {
      const b = h('button', 'btn ' + (a.cls || '') + ' interactive', a.label);
      if (a.disabled) b.disabled = true;
      b.onclick = () => { sfx.click(); if (!o.keep) actions.innerHTML = ''; res(a.value); };
      row.appendChild(b);
    });
    actions.appendChild(row);
  });
  ui.clearActions = () => { actions.innerHTML = ''; };

  // ---------- modal cards ----------
  const modal = layer('modal hidden');
  ui.card = ({ title = '', html = '', buttons = [{ label: 'OK', value: true }], cls = '', icon = '' } = {}) => new Promise(res => {
    modal.innerHTML = '';
    const card = h('div', 'card ' + cls);
    if (icon) card.appendChild(h('div', 'card-icon', icon));
    if (title) card.appendChild(h('div', 'card-title', title));
    if (html) card.appendChild(h('div', 'card-body', html));
    const row = h('div', 'card-buttons');
    buttons.forEach((b, i) => {
      const btn = h('button', 'btn ' + (b.cls || (i === buttons.length - 1 ? 'primary' : '')), b.label);
      if (b.disabled) btn.disabled = true;
      btn.onclick = () => { sfx.click(); modal.classList.add('hidden'); modal.innerHTML = ''; res(b.value); };
      row.appendChild(btn);
    });
    card.appendChild(row);
    modal.appendChild(card);
    modal.classList.remove('hidden');
    const first = row.querySelector('.btn.primary') || row.querySelector('.btn');
    setTimeout(() => first && first.focus(), 50);
  });
  ui.modalEl = modal;

  const seen = new Set();
  ui.loadSeen = arr => { (arr || []).forEach(x => seen.add(x)); };
  ui.seenList = () => [...seen];
  ui.howTo = async (id, title, lines, icon = '') => {
    if (seen.has(id)) return false;
    seen.add(id);
    ui.onSeen && ui.onSeen();
    await ui.card({ title, icon, html: '<ul class="howto">' + lines.map(l => `<li>${l}</li>`).join('') + '</ul>', buttons: [{ label: "Got it!", value: true }], cls: 'howto-card' });
    return true;
  };
  ui.stars = n => '<span class="stars">' + [0, 1, 2].map(i => `<span class="star ${i < n ? 'on' : ''}" style="animation-delay:${0.15 + i * 0.18}s">★</span>`).join('') + '</span>';

  // ---------- touch controls (chase) ----------
  const touch = layer('touch hidden');
  ui.touch = touch;

  ui.root = root;
  return ui;
}
