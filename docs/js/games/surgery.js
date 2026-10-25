import * as THREE from 'three';
import { organ, object as makeObject, mask as makeMask, scalpel, OBJECT_NAMES } from '../props.js';
import { clamp, rand, pick, toon } from '../engine.js';
import { h } from '../ui.js';
import { music } from '../audio.js';
import { icon } from '../icons.js';

const COUNTDOWN = {
  kid: ["Ten... nine... I'm not even sleepy... eight... I'm not... zzz"],
  teen: ['Ten... nine... is the ceiling supposed to wiggle?... zzz'],
  adult: ['Ten... nine... I can taste colors... eight... zzz', 'Ten... nine... tell my goldfish I— zzz'],
  elder: ["Ten... nine... I've had better naps in church... zzz"],
};
const BUMP = ['HEY!', 'Watch it!', 'Excuse YOU!', "I'm WORKING here!", 'Rude!', 'OOF!'];
const WAKE_OK = {
  kid: ['Is it over? Did I get a robot part? Please say yes.'],
  teen: ['Wait... did you take a selfie with my insides? ...Can I see it?'],
  adult: ['Did you take out the thing? Did you put back the other things?'],
  elder: ['Am I younger now? I feel younger. No, I feel the same.'],
};

export async function play(G, P, prm = {}) {
  const { E, ui, sfx } = G;
  const person = P.person;
  const c = P.c;
  const variant = prm.variant || 'appendix';
  const objName = variant === 'appendix' ? 'angry appendix' : (prm.name || OBJECT_NAMES[prm.object] || 'thing');
  await G.howTo('surgery', 'Scalpel: Surgery!', [
    'Tap the <b>sleepy-gas mask</b> to put the patient to sleep.',
    '<b>Press the green circle</b> and trace the dotted line to make the cut. Stay on the line!',
    `Drag the <b>${objName}</b> out of the belly. <b>Don't bump the organs</b>. They're grumpy.`,
    'Stitch it up: <b>click each stitch when the shrinking ring reaches it</b>.',
    'Watch the <b>heart rate</b>. If it gets too high, the patient WAKES UP!',
  ], icon('surgery'));
  const S = E.scope();
  music.play('surgery');
  S.defer(() => music.play('clinic'));
  await person.lieDown(E);
  person.root.updateMatrixWorld(true);
  const u = person.s;
  const diff = G.tutorial ? 0 : G.diff;
  const belly = person.bellyFront();
  const patchY = belly.y + 0.006;
  const head = person.headCenter();

  // ---- drapes & patch ----
  const skinMat = toon(c.look.skin);
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * u, 0.34 * u), skinMat);
  patch.rotation.x = -Math.PI / 2; patch.position.set(belly.x, patchY, belly.z); patch.receiveShadow = true; S.add(patch);
  const drapeC = '#4fc3f7';
  const chestLen = (belly.x - 0.25 * u) - (head.x + 0.2 * u);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.05, chestLen), 0.008, 0.56 * u), toon(drapeC));
  chest.position.set(head.x + 0.2 * u + chestLen / 2, patchY + 0.002, belly.z); chest.receiveShadow = true; S.add(chest);
  const legLen = 1.15 * u;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(legLen, 0.008, 0.6 * u), toon(drapeC));
  legs.position.set(belly.x + 0.25 * u + legLen / 2, patchY + 0.03 * u, belly.z); legs.receiveShadow = true; S.add(legs);
  const tent = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.03 * u, 0.6 * u), toon('#3fb5ea'));
  tent.position.set(belly.x + 0.25 * u, patchY + 0.015 * u, belly.z); S.add(tent);
  for (const sz of [-1, 1]) { const side = new THREE.Mesh(new THREE.BoxGeometry(0.5 * u, 0.008, 0.12 * u), toon(drapeC)); side.position.set(belly.x, patchY + 0.001, belly.z + sz * (0.17 * u + 0.06 * u)); S.add(side); }

  // ---- vitals ----
  let bpm = 82, woke = false, asleep = false;
  const vit = S.dom(h('div', 'vitals', `<span class="heart">${icon('heart')}</span><b>82</b><small>BPM</small>`));
  ui.root.appendChild(vit);
  const bpmEl = vit.querySelector('b'), heartEl = vit.querySelector('.heart');
  let beatAcc = 0;
  S.update(dt => {
    bpm += (80 - bpm) * 0.12 * dt;
    beatAcc += dt * bpm / 60;
    if (beatAcc >= 1) { beatAcc -= 1; sfx.beep(); heartEl.classList.remove('beat'); void heartEl.offsetWidth; heartEl.classList.add('beat'); }
    bpmEl.textContent = Math.round(bpm);
    vit.classList.toggle('danger', bpm > 135);
    G.room.monitor.setBPM(bpm);
    if (asleep && bpm >= 165 && !woke) woke = true;
  });
  const addBpm = n => { bpm += n; };

  // ---- 1. anesthesia ----
  const mid = head.clone().lerp(belly, 0.3);
  await E.frame(mid, 1.0 * u, 0.62 * u, new THREE.Vector3(0, 1, 0.45), 0.8);
  const msk = makeMask(); msk.scale.setScalar(u * 1.5); msk.rotation.x = Math.PI / 2;
  const mStart = new THREE.Vector3(head.x + 0.05 * u, patchY + 0.05, belly.z + 0.24 * u);
  msk.position.copy(mStart); S.add(msk);
  const mRing = new THREE.Mesh(new THREE.RingGeometry(0.1 * u, 0.12 * u, 32), new THREE.MeshBasicMaterial({ color: '#ffd23f' }));
  mRing.material.userData.dispose = true; mRing.rotation.x = -Math.PI / 2; mRing.position.copy(mStart); mRing.position.y -= 0.02; S.add(mRing);
  S.update((dt, t) => { if (mRing.visible) mRing.scale.setScalar(1 + Math.sin(t * 6) * 0.1); });
  G.dbg = { kind: 'surgery', stage: 'mask', mask: mStart, bpm: () => bpm };
  ui.hint('Tap the <b>sleepy-gas mask</b> to put the patient to sleep.');
  person.expr('scared');
  await new Promise(res => {
    S.on('down', () => {
      if (asleep || !mRing.visible) return;
      const hit = E.pickObjects([msk, mRing]);
      const p = E.pointerOnPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -mStart.y));
      if (hit || (p && p.distanceTo(mStart) < 0.16 * u)) { mRing.visible = false; res(); }
    });
  });
  const face = head.clone().add(new THREE.Vector3(0.06 * u * person.hs, 0.16 * u * person.hs, 0));
  sfx.whoosh();
  await E.tween(0.5, k => msk.position.lerpVectors(mStart, face, k));
  ui.hint(null);
  await G.say(pick(COUNTDOWN[c.ageGroup] || COUNTDOWN.adult), { key: 'c', hold: 0.6 });
  person.expr('sleep');
  asleep = true;
  sfx.snore();
  let zt = 0;
  S.update(dt => { zt += dt; if (asleep && !woke && zt > 2.6) { zt = 0; ui.popAt(person.headTop(), 'Zzz', 'zzz'); } });

  // ---- 2. incision ----
  await E.frame(belly, 0.82 * u, 0.56 * u, new THREE.Vector3(0, 1, 0.3), 0.8);
  const N = 61;
  const bend = rand(-1, 1) * 0.035 * u;
  const pts = [];
  for (let i = 0; i < N; i++) { const t = i / (N - 1); pts.push(new THREE.Vector3(belly.x - 0.14 * u + t * 0.28 * u, patchY + 0.002, belly.z + Math.sin(t * Math.PI) * bend)); }
  const dotMat = toon('#5a189a');
  const dots = [];
  for (let i = 0; i < N; i += 3) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.0055 * u, 10), dotMat); d.rotation.x = -Math.PI / 2; d.position.copy(pts[i]); S.add(d); dots.push({ i, d }); }
  const startRing = new THREE.Mesh(new THREE.RingGeometry(0.016 * u, 0.022 * u, 28), new THREE.MeshBasicMaterial({ color: '#2ecc71' }));
  startRing.material.userData.dispose = true; startRing.rotation.x = -Math.PI / 2; startRing.position.copy(pts[0]); startRing.position.y += 0.001; S.add(startRing);
  const endFlag = new THREE.Mesh(new THREE.RingGeometry(0.012 * u, 0.017 * u, 28), new THREE.MeshBasicMaterial({ color: '#ff4d6d' }));
  endFlag.material.userData.dispose = true; endFlag.rotation.x = -Math.PI / 2; endFlag.position.copy(pts[N - 1]); endFlag.position.y += 0.001; S.add(endFlag);
  S.update((dt, t) => { startRing.scale.setScalar(1 + Math.sin(t * 7) * 0.12); });
  const scl = scalpel(); scl.scale.setScalar(u * 1.15); scl.rotation.set(0.9, 0, -0.5); S.add(scl);
  const cutPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(patchY + 0.002));
  const tol = 0.014 * u * G.tol * (G.tutorial ? 1.5 : 1);
  let prog = 0, cutting = false, slips = 0, dev = 0;
  Object.assign(G.dbg, { stage: 'cut', pts, prog: () => prog, cutting: () => cutting });
  const cutMat = toon('#c9184a');
  ui.hint('<b>Press the green circle</b> and trace the dotted line. Stay on the line!');
  S.on('down', () => { const p = E.pointerOnPlane(cutPlane); if (p && p.distanceTo(pts[prog]) < tol * 2.8) { cutting = true; sfx.click(); } });
  S.on('up', () => { cutting = false; });
  await new Promise(res => {
    const off = S.update(() => {
      if (woke) { off(); res(); return; }
      const p = E.pointerOnPlane(cutPlane);
      if (p) scl.position.set(p.x, patchY + 0.004, p.z);
      if (!cutting || !p) return;
      let bj = prog, bd = 1e9;
      for (let j = Math.max(0, prog - 2); j <= Math.min(N - 1, prog + 7); j++) { const d = Math.hypot(pts[j].x - p.x, pts[j].z - p.z); if (d < bd) { bd = d; bj = j; } }
      if (bd > tol * 2.3) {
        cutting = false; slips++; addBpm(14);
        sfx.bad(); ui.flash('rgba(255,80,80,0.25)'); E.shake(0.006);
        ui.popAt(p, 'SLIP!', 'bad'); person.wiggle = 0.3;
        if (Math.random() < 0.5) G.say(pick(['Mmmf...', 'zzz... ow... zzz', 'zzz... five more minutes...']), { key: 'z', hold: 0.8, pitch: 0.6 });
        startRing.position.copy(pts[prog]); startRing.position.y += 0.001;
        return;
      }
      if (bj > prog) {
        for (let k = prog + 1; k <= bj; k++) {
          const a = pts[k - 1], b = pts[k];
          const seg = new THREE.Mesh(new THREE.BoxGeometry(a.distanceTo(b) * 1.15, 0.002, 0.0045 * u), cutMat);
          seg.position.copy(a).lerp(b, 0.5); seg.position.y += 0.001;
          seg.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
          S.add(seg);
          dev += Math.max(0, bd / tol - 0.45) * 0.9;
        }
        prog = bj;
        for (const d of dots) if (d.i <= prog) d.d.visible = false;
        startRing.position.copy(pts[prog]); startRing.position.y += 0.001;
        if (Math.random() < 0.15) sfx.squeak();
      }
      if (prog >= N - 1) { off(); res(); }
    });
  });
  startRing.visible = false; endFlag.visible = false;

  // ---- 3. remove the problem ----
  let bumps = 0, timeOut = false;
  const A = 0.2, Bz = 0.13;
  const win = new THREE.Group(); win.position.set(belly.x, patchY + 0.003, belly.z); win.scale.setScalar(u); S.add(win);
  if (!woke) {
    ui.hint(null);
    sfx.zip();
    const inside = new THREE.Mesh(new THREE.CircleGeometry(1, 48), toon('#ffb3c6'));
    inside.rotation.x = -Math.PI / 2; inside.scale.set(A, Bz, 1); win.add(inside);
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.93, 1.0, 48), toon('#e75480'));
    rim.rotation.x = -Math.PI / 2; rim.scale.set(A, Bz, 1); rim.position.y = 0.0005; win.add(rim);
    const flip = Math.random() < 0.5 ? -1 : 1;
    const layout = variant === 'appendix'
      ? [['liver', -0.12, -0.04], ['stomach', -0.065, 0.055], ['intestines', 0.035, 0.005], ['kidney', 0.0, -0.08], ['spleen', -0.14, 0.07], ['kidney', 0.14, -0.05]]
      : [['liver', -0.125, -0.03], ['stomach', -0.085, 0.065], ['intestines', 0.105, 0.04], ['kidney', 0.085, -0.07], ['spleen', -0.02, -0.088]];
    const organs = [];
    for (const [k, x, z] of layout) {
      const o = organ(k); o.position.set(x + rand(-0.006, 0.006), 0.01, (z + rand(-0.006, 0.006)) * flip); win.add(o);
      organs.push({ o, r: o.userData.r * 0.8, cd: 0, base: o.position.clone(), face: o.userData.face, phase: rand(0, 6) });
    }
    let target, tr;
    if (variant === 'appendix') { target = organ('appendix'); target.position.set(0.135, 0.012, 0.055 * flip); tr = target.userData.r * 0.85; }
    else {
      target = new THREE.Group();
      const ob = makeObject(prm.object || 'duck');
      const bb = new THREE.Box3().setFromObject(ob); const sz = new THREE.Vector3(); bb.getSize(sz);
      ob.scale.setScalar(0.085 / Math.max(sz.x, sz.y, sz.z));
      target.add(ob); target.position.set(0.0, 0.015, 0.0); tr = 0.034;
    }
    win.add(target);
    const steam = [];
    if (variant === 'appendix') {
      for (let i = 0; i < 4; i++) { const st = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), toon('#ffffff')); st.userData.t = i / 4; target.add(st); steam.push(st); }
    }
    win.scale.set(u, u, 0.01);
    await E.tween(0.5, k => win.scale.set(u, u, Math.max(0.01, u * k)));
    G.say(variant === 'appendix' ? 'zzz... (the appendix looks FURIOUS)' : `zzz... (there's the ${objName}!)`, { key: 'z', hold: 1.2, pitch: 0.6, silent: true });
    ui.hint(`Drag the <b>${objName}</b> out of the belly. Don't bump the organs!`);
    const grabPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(patchY + 0.015));
    let grabbed = false, out = false, t3 = 0;
    Object.assign(G.dbg, { stage: 'drag', target: () => win.localToWorld(target.position.clone()), center: win.position.clone(), grabbed: () => grabbed, u });
    const limit = G.tutorial ? 999 : 40 - diff * 10;
    ui.timer.show(limit);
    const toLocal = p => new THREE.Vector3((p.x - win.position.x) / u, 0, (p.z - win.position.z) / u);
    S.on('down', () => { const p = E.pointerOnPlane(grabPlane); if (!p) return; const l = toLocal(p); if (Math.hypot(l.x - target.position.x, l.z - target.position.z) < tr * 2.4 + 0.015) { grabbed = true; sfx.pop(); } });
    S.on('up', () => { grabbed = false; });
    await new Promise(res => {
      const off = S.update((dt, t) => {
        if (woke) { off(); res(); return; }
        t3 += dt; ui.timer.set(limit - t3);
        if (t3 > limit) { timeOut = true; off(); res(); return; }
        for (const og of organs) {
          og.cd -= dt;
          og.o.position.y = 0.01 + Math.sin(t * 2 + og.phase) * 0.002;
          og.o.scale.setScalar(1 + Math.sin(t * 2.4 + og.phase) * 0.03);
        }
        steam.forEach(st => { st.userData.t = (st.userData.t + dt * 0.8) % 1; st.position.set(Math.sin(st.userData.t * 9) * 0.01, 0.02 + st.userData.t * 0.05, 0); st.scale.setScalar(1 - st.userData.t); });
        if (variant === 'appendix') target.rotation.y = Math.sin(t * 12) * 0.25;
        const p = E.pointerOnPlane(grabPlane);
        if (grabbed && p) {
          const l = toLocal(p);
          const dx = l.x - target.position.x, dz = l.z - target.position.z, d = Math.hypot(dx, dz);
          const mv = Math.min(d, 0.45 * dt);
          if (d > 0.0001) { target.position.x += dx / d * mv; target.position.z += dz / d * mv; }
          for (const og of organs) {
            const ox = target.position.x - og.o.position.x, oz = target.position.z - og.o.position.z, od = Math.hypot(ox, oz);
            const minD = tr + og.r;
            if (od < minD && od > 0.0001) {
              target.position.x = og.o.position.x + ox / od * minD; target.position.z = og.o.position.z + oz / od * minD;
              if (og.cd <= 0) {
                og.cd = 1.0; bumps++; addBpm(G.tutorial ? 6 : 11);
                sfx.squeak(); og.face && og.face.userData.set('angry');
                const wp = win.localToWorld(og.o.position.clone());
                ui.say(() => wp, pick(BUMP), { key: 'organ', hold: 0.7, pitch: 1.7, cls: 'small' });
                setTimeout(() => og.face && og.face.userData.set('happy'), 900);
                person.wiggle = 0.2;
              }
            }
          }
          const nr = (target.position.x / A) ** 2 + (target.position.z / Bz) ** 2;
          if (nr > 1.35) { out = true; off(); res(); }
        }
      });
    });
    ui.timer.hide(); ui.hint(null);
    if (out) {
      sfx.ding();
      ui.popAt(win.localToWorld(target.position.clone()), 'GOT IT!', 'good');
      organs.forEach(og => og.face && og.face.userData.set('happy'));
      const t0 = target.position.clone();
      await E.tween(0.5, k => target.position.set(t0.x * (1 + k), 0.015 + Math.sin(k * Math.PI) * 0.12, t0.z * (1 + k)));
      target.visible = false;
      const wp = win.localToWorld(new THREE.Vector3(0, 0, 0));
      ui.say(() => wp, variant === 'appendix' ? pick(['Bye, Gary!', 'Good riddance, Gary!', 'He was always so ANGRY.']) : pick(['Finally! It was SO crowded.', 'Was that a... why was that in here?', 'Thank you!! We have been yelling for weeks.']), { key: 'organ', hold: 1.3, pitch: 1.6, cls: 'small' });
      await E.wait(0.6);
    }
    await E.tween(0.4, k => win.scale.set(u, u, Math.max(0.01, u * (1 - k))));
    win.visible = false;
  }

  // ---- 4. stitches ----
  let stitchMiss = 0, perfects = 0;
  if (!woke && !timeOut) {
    sfx.zip();
    const K = G.tutorial ? 4 : 5 + Math.round(diff);
    const T = (G.tutorial ? 1.3 : 1.05 - diff * 0.25);
    const r0 = 0.014 * u;
    ui.hint('<b>Click each stitch</b> when the shrinking ring reaches it!');
    const thread = toon('#3c096c');
    const stitchPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(patchY + 0.004));
    let clickPos = null, clickTT = 0, curTT = 0;
    S.on('down', () => { clickPos = E.pointerOnPlane(stitchPlane); clickTT = curTT; });
    for (let si = 0; si < K && !woke; si++) {
      const pt = pts[Math.round((si + 0.5) / K * (N - 1))].clone(); pt.y = patchY + 0.004;
      const tgt = new THREE.Mesh(new THREE.CircleGeometry(r0, 24), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 }));
      tgt.material.userData.dispose = true; tgt.rotation.x = -Math.PI / 2; tgt.position.copy(pt); S.add(tgt);
      const ring = new THREE.Mesh(new THREE.RingGeometry(r0 * 0.85, r0 * 1.1, 32), new THREE.MeshBasicMaterial({ color: '#ffd23f' }));
      ring.material.userData.dispose = true; ring.rotation.x = -Math.PI / 2; ring.position.copy(pt); ring.position.y += 0.0005; S.add(ring);
      let tt = 0; clickPos = null;
      Object.assign(G.dbg, { stage: 'stitch', stitch: pt, tt: () => tt, T });
      const res = await new Promise(resolve => {
        const off = S.update(dt => {
          if (woke) { off(); resolve('woke'); return; }
          if (!clickPos) tt += dt;
          curTT = tt;
          ring.scale.setScalar(Math.max(0.4, 1 + 2.4 * (1 - tt / T)));
          const p = E.pointerOnPlane(stitchPlane); if (p) scl.position.set(p.x, patchY + 0.006, p.z);
          if (clickPos) {
            const cp = clickPos; clickPos = null;
            if (cp.distanceTo(pt) > 0.05 * u) return;
            off();
            const e = Math.abs(clickTT - T);
            resolve(e < 0.1 ? 'perfect' : e < 0.22 ? 'good' : 'miss');
          } else if (tt > T + 0.32) { off(); resolve('miss'); }
        });
      });
      tgt.visible = false; ring.visible = false;
      if (res === 'woke') break;
      const x = new THREE.Group(); x.position.copy(pt); x.position.y += 0.002;
      const len = res === 'miss' ? 0.035 * u : 0.026 * u;
      for (const a of [0.785, -0.785]) { const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.002, 0.0035 * u), thread); b.rotation.y = a + (res === 'miss' ? rand(-0.6, 0.6) : 0); x.add(b); }
      S.add(x);
      sfx.stitch();
      if (res === 'perfect') { perfects++; ui.popAt(pt, 'PERFECT!', 'good'); }
      else if (res === 'good') ui.popAt(pt, 'Good', '');
      else { stitchMiss++; addBpm(8); ui.popAt(pt, 'Wonky...', 'bad'); }
      await E.wait(0.15);
    }
    ui.hint(null);
  }

  // ---- 5. wake up ----
  asleep = false;
  ui.hint(null); ui.timer.hide();
  msk.visible = false;
  let result;
  if (woke) {
    sfx.bad(); ui.flash('rgba(255,255,255,0.6)'); E.shake(0.02);
    person.expr('scared'); person.wiggle = 1.2;
    await G.say(pick(['WHAT ARE YOU DOING IN MY BELLY?!', 'AAAH! Why is my stomach WAVING at me?!', "I'm AWAKE! Why am I AWAKE?!"]), { key: 'c', hold: 1.0 });
    result = { score: 0, fail: true, severity: 3, reason: 'surgery_woke' };
  } else if (timeOut) {
    sfx.bad();
    result = { score: 0, fail: true, severity: 3, reason: 'surgery_left' };
  } else {
    const score = clamp(100 - dev * 0.6 - slips * 12 - bumps * 8 - stitchMiss * 9 + perfects * 2, 0, 100);
    result = score < 30 && !G.tutorial ? { score, fail: true, severity: 1, reason: 'surgery_sloppy' } : { score, fail: false };
  }
  await E.wait(0.3);
  S.end();
  await person.sitUp(E);
  if (!result.fail) { person.expr('surprised'); await G.say(pick(WAKE_OK[c.ageGroup] || WAKE_OK.adult), { key: 'c', hold: 0.8 }); }
  G.room.monitor.setBPM(78);
  return result;
}
