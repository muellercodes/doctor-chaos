import * as THREE from 'three';
import { rattle as makeRattle, syringe } from '../props.js';
import { clamp, rand, pick, shuffle } from '../engine.js';
import { h } from '../ui.js';
import { icon } from '../icons.js';

const FACES = [{ id: 'tongue', label: 'Tongue' }, { id: 'puffy', label: 'Puffy Cheeks' }, { id: 'googly', label: 'Googly Eyes' }];
const ACTIONS = { rattle: icon('rattle', 'in') + ' Rattle', peekaboo: icon('peek', 'in') + ' Peekaboo', face: icon('silly', 'in') + ' Silly Face' };

export async function play(G, P) {
  const { E, ui, sfx } = G;
  const baby = P.person;
  const parent = P.parent;
  const c = P.c;
  const pr = c.babyGender === 'm' ? 'he' : 'she';
  await G.howTo('baby', 'Baby Shot: Calm the Baby!', [
    'The baby is crying. Fill the <b>Calm</b> meter to 100% before giving the shot.',
    'Try <b>Rattle</b>, <b>Peekaboo</b> and <b>Silly Face</b>. Every baby LOVES one, likes one, and HATES one. Watch how they react!',
    'When the baby is calm, <b>quick! Click in the green</b> to give the shot before they notice.',
  ], icon('baby'));
  const S = E.scope();
  const head = baby.headCenter();
  await E.frame(new THREE.Vector3(head.x + 0.42, head.y + 0.08, head.z), 1.55, 0.95, new THREE.Vector3(0, 0.22, 1), 0.8);
  let calm = 12, misses = 0, hates = 0, t = 0;
  const prefs = shuffle(['rattle', 'peekaboo', 'face']);
  const mult = { [prefs[0]]: 1.7, [prefs[1]]: 0.9, [prefs[2]]: -1 };
  const favFace = pick(FACES).id;
  const boost = 1 + 0.15 * G.upg('lolli');
  G.dbg = { kind: 'baby', phase: 'choose', mult, favFace, calm: () => calm, look: () => baby.lookYaw, head };
  const calmM = ui.meter({ label: 'Calm', value: calm / 100, fill: '#5dd6ff', ends: [icon('cryFace', 'in'), icon('happyFace', 'in')], cls: 'wide' });
  let crySound = 0;
  S.update(dt => {
    t += dt;
    if (calm < 100) calm = Math.max(0, calm - dt * 2.4);
    calmM.set(calm / 100);
    baby.crying = calm < 40;
    if (!baby._lock) baby.expr(calm < 40 ? 'cry' : calm < 75 ? 'sad' : 'smile');
    if (baby.crying) { crySound -= dt; if (crySound <= 0) { crySound = 1.3; sfx.wah(1.4); } }
  });
  const react = async (gain, how) => {
    calm = clamp(calm + gain * boost, 0, 100);
    if (gain > 0) {
      baby._lock = true; baby.expr('laugh'); sfx.giggle(0, 1.6);
      ui.popAt(baby.headTop(), gain > 20 ? 'Giggle!' : 'hehe', 'good');
      setTimeout(() => { baby._lock = false; }, 900);
    } else {
      baby._lock = true; baby.expr('cry'); baby.wiggle = 0.8; sfx.wah(1.7); sfx.wah(1.5);
      ui.popAt(baby.headTop(), 'WAAAAH!', 'bad');
      setTimeout(() => { baby._lock = false; }, 1000);
    }
    await E.wait(0.4);
  };
  let parentTalk = 0;
  const parentSay = text => ui.say(() => parent.headTop(), text, { key: 'parent', name: c.parent.title, pitch: c.parent.title === 'Mom' ? 1.15 : 0.9, hold: 1.4 });
  parent.talk(1.2);
  parentSay(c.complaint);
  await E.wait(0.6);
  while (true) {
    ui.hint('Calm the baby down! Pick something to try.');
    const act = await ui.actions(Object.entries(ACTIONS).map(([k, v]) => ({ label: v, value: k })), { title: 'Calm the baby' });
    ui.hint(null);
    if (act === 'rattle') {
      ui.hint('<b>Shake</b> the rattle! Move left and right fast.');
      const r = makeRattle(); r.scale.setScalar(1.3); S.add(r);
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(head.z + 0.3));
      let lastX = null, dir = 0, ext = 0, count = 0, tt = 0;
      G.dbg.phase = 'rattle';
      E.input.requireRelease();
      await new Promise(res => {
        const off = S.update(dt => {
          tt += dt;
          const p = E.pointerOnPlane(plane);
          if (p) {
            r.position.set(clamp(p.x, head.x - 0.35, head.x + 0.35), head.y - 0.08, head.z + 0.3);
            if (lastX !== null) {
              const d = p.x - lastX;
              if (Math.abs(d) > 0.002) {
                const nd = Math.sign(d);
                if (nd !== dir) { if (Math.abs(ext) > 0.03) { count++; sfx.rattle(); r.rotation.z = nd * 0.5; calm = clamp(calm + 3.2 * mult.rattle * boost * (mult.rattle < 0 ? 1.4 : 1), 0, 100); } dir = nd; ext = 0; }
                ext += d;
              }
            }
            lastX = p.x;
          }
          r.rotation.z *= 0.9;
          if (tt > 3.2) { off(); res(); }
        });
      });
      r.visible = false;
      ui.hint(null);
      await react(mult.rattle > 0 ? count * 0.6 : -10, 'rattle');
      if (mult.rattle < 0) hates++;
    } else if (act === 'peekaboo') {
      const hands = S.dom(h('div', 'peek-hands', `<div class="hand l">${icon('hand')}</div><div class="hand r">${icon('hand')}</div>`));
      ui.root.appendChild(hands);
      ui.hint('Wait until the baby <b>looks at you</b>, then click: <b>PEEKABOO!</b>');
      let gain = 0;
      G.dbg.phase = 'peek';
      E.input.requireRelease();
      for (let round = 0; round < 3; round++) {
        hands.classList.add('closed');
        let clicked = false, lookT = 0;
        await new Promise(res => {
          const offU = S.update(dt => {
            lookT -= dt;
            if (lookT <= 0) { const opts = [-0.9, 0.9, 0, -0.6, 0.6]; baby.lookTarget = pick(opts); lookT = baby.lookTarget === 0 ? rand(0.55, 0.85) - G.diff * 0.15 : rand(0.5, 1.2); }
            if (clicked) { offU(); res(); }
          });
          const fn = () => { clicked = true; };
          E.input.listeners.down.add(fn);
          S.defer(() => E.input.listeners.down.delete(fn));
          const offC = S.update(() => { if (clicked) { E.input.listeners.down.delete(fn); offC(); } });
        });
        hands.classList.remove('closed');
        const looking = Math.abs(baby.lookYaw) < 0.25;
        ui.popCenter(looking ? 'PEEKABOO!' : 'peekaboo...?', looking ? 'good' : '');
        if (mult.peekaboo < 0) { await react(-6, 'peek'); }
        else if (looking) { calm = clamp(calm + 13 * mult.peekaboo * boost, 0, 100); baby._lock = true; baby.expr('laugh'); sfx.giggle(0, 1.6); setTimeout(() => { baby._lock = false; }, 700); gain += 1; }
        else sfx.blip(0.8);
        await E.wait(0.6);
      }
      baby.lookTarget = 0;
      hands.remove();
      ui.hint(null);
      if (mult.peekaboo < 0) hates++;
    } else {
      const f = await ui.actions(FACES.map(x => ({ label: `${icon(x.id, 'in')} ${x.label}`, value: x.id })), { title: 'Make a face!' });
      const face = FACES.find(x => x.id === f);
      ui.popCenter(icon(face.id), 'huge');
      await E.wait(0.5);
      if (mult.face < 0) { hates++; await react(-10, 'face'); }
      else await react((f === favFace ? 30 : 13) * mult.face, 'face');
    }
    G.dbg.phase = 'choose';
    E.input.requireRelease();
    if (Math.random() < 0.35 && parentTalk < 2) { parentTalk++; parent.talk(1.2); parentSay(pick(c.parentRemarks)); }
    if (calm >= 100) {
      // ---- the shot ----
      calm = 100;
      ui.hint(`${pr === 'he' ? 'He' : 'She'}'s calm! <b>Quick, click in the green</b> before ${pr} notices!`);
      const win = 0.2 * G.tol;
      const pos0 = rand(0.25, 0.75 - win);
      const bar = ui.meter({ label: 'Sneaky shot!', marker: true, zones: [{ from: 0, to: 1, color: '#ffd1d1' }, { from: pos0, to: pos0 + win, color: '#7be495' }], cls: 'wide' });
      const syr = syringe(); syr.scale.setScalar(1.1); S.add(syr);
      const legPt = baby.root.localToWorld(new THREE.Vector3(-0.06, 0.06, 0.12));
      syr.position.copy(legPt).add(new THREE.Vector3(-0.08, 0.04, 0.06)); syr.rotation.set(0.4, 0, 1.0);
      let m = 0, dir = 1, clicked = false, mAt = 0;
      Object.assign(G.dbg, { phase: 'shot', m: () => m, pos0, win });
      const speed = 0.9 + G.diff * 0.6;
      await new Promise(res => {
        const fn = () => { if (!clicked) { clicked = true; mAt = m; } };
        E.input.listeners.down.add(fn);
        S.defer(() => E.input.listeners.down.delete(fn));
        const off = S.update(dt => {
          if (clicked) { E.input.listeners.down.delete(fn); off(); res(); return; }
          m += dir * dt * speed; if (m > 1) { m = 1; dir = -1; } if (m < 0) { m = 0; dir = 1; }
          bar.set(m);
          if (clicked) { E.input.listeners.down.delete(fn); off(); res(); }
        });
      });
      bar.remove(); ui.hint(null);
      const hit = mAt >= pos0 - 0.02 && mAt <= pos0 + win + 0.02;
      const sp = syr.position.clone();
      await E.tween(0.12, k => syr.position.lerpVectors(sp, legPt, k));
      sfx.pop();
      await E.wait(0.25);
      syr.visible = false;
      if (hit) {
        baby._lock = true; baby.expr('surprised');
        ui.popAt(baby.headTop(), '...?', '');
        await E.wait(0.8);
        baby.expr('laugh'); sfx.giggle(0, 1.7);
        ui.popAt(baby.headTop(), 'Didn\'t even notice!', 'good');
        sfx.great();
        await E.wait(0.6);
        break;
      }
      misses++;
      calm = 55;
      baby._lock = true; baby.expr('cry'); baby.wiggle = 1; sfx.wah(1.8); sfx.wah(1.6);
      ui.popAt(baby.headTop(), 'WAAAAAAH!!', 'bad');
      setTimeout(() => { baby._lock = false; }, 1200);
      if (misses >= 3 && !G.tutorial) break;
      await E.wait(0.6);
    }
  }
  calmM.remove();
  ui.hint(null); ui.clearActions();
  baby.crying = false;
  S.end();
  baby._lock = false;
  if (misses >= 3 && !G.tutorial) { baby.expr('cry'); return { score: 5, fail: true, severity: 1, reason: 'baby' }; }
  baby.expr('smile');
  parent.talk(1.5);
  await parentSay(c.success);
  const score = clamp(100 - Math.max(0, t - 22) * 1.1 - misses * 18 - hates * 8, 30, 100);
  return { score, fail: false };
}
