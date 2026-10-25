// X-ray: put the frame over the hurt spot and snap the picture while the patient is holding still.
import { clamp, rand, pick } from '../engine.js';
import { openArcade, roundRect, banner } from './arcade.js';
import { icon } from '../icons.js';

const SPOTS = {
  wrist: { label: 'wrist', bone: 'right wrist' },
  forearm: { label: 'arm', bone: 'left forearm' },
  shin: { label: 'shin', bone: 'right shin' },
  ankle: { label: 'ankle', bone: 'left ankle' },
  finger: { label: 'finger', bone: 'pinky finger' },
  collar: { label: 'collarbone', bone: 'collarbone' },
};

// skeleton points in a 300 x 480 box (centered later)
function skeleton() {
  return {
    skull: [150, 46], jaw: [150, 82], neck: [150, 100], pelvis: [150, 262],
    shL: [104, 124], shR: [196, 124], elL: [86, 192], elR: [214, 192], wrL: [76, 256], wrR: [224, 256], haL: [72, 286], haR: [228, 286],
    hipL: [126, 272], hipR: [174, 272], knL: [122, 360], knR: [178, 360], anL: [120, 446], anR: [180, 446], ftL: [108, 466], ftR: [192, 466],
  };
}

export async function play(G, P) {
  const { E } = G;
  const c = P.c;
  await G.howTo('xray', 'X-ray: Picture Day', [
    'Move the <b>frame</b> over the hurt spot (it glows red).',
    'Patients wiggle. Wait until the <b>Hold Still</b> bar is <b>green</b>.',
    '<b>Click</b> to snap the picture. Blurry ones do not count. Three tries!',
  ], icon('xray'));
  const A = openArcade(G, { VH: 540, song: 'surgery' });
  const { ctx, sfx } = A;
  const diff = G.tutorial ? 0 : Math.min(1.4, G.diff);
  const kinds = Object.keys(SPOTS);
  const spotKey = pick(kinds);
  const sk = skeleton();
  const hurtLocal = { wrist: sk.wrR, forearm: [(sk.elL[0] + sk.wrL[0]) / 2, (sk.elL[1] + sk.wrL[1]) / 2], shin: [(sk.knR[0] + sk.anR[0]) / 2, (sk.knR[1] + sk.anR[1]) / 2], ankle: sk.anL, finger: [sk.haR[0] + 6, sk.haR[1] + 12], collar: [128, 118] }[spotKey];
  const tol = G.tol * (G.tutorial ? 1.4 : 1);
  const FW = 150, FH = 112;
  let t = 0, amp = 1, state = 'calm', stT = rand(0.6, 1.0), tries = 0, phase = 'aim', resultT = 0, result = null, perfect = false;
  let ox = 0, oy = 0, flash = 0, blurShot = null;
  const view = { scale: 1, dpr: 1, VW: 960 };
  const SC = 0.88;
  const origin = () => ({ x: view.VW / 2 - 150 * SC, y: 74 });
  const hurtNow = () => { const o = origin(); return { x: o.x + hurtLocal[0] * SC + ox, y: o.y + hurtLocal[1] * SC + oy }; };
  G.dbg = { kind: 'xray', hurt: hurtNow, amp: () => amp, toScreen: (x, y) => ({ x: x * view.scale / view.dpr, y: y * view.scale / view.dpr }), get phase() { return phase; } };
  let clickReq = false, funny = 0, funnyMsg = 0;
  // secret: the left elbow has a tiny smile. Tap it three times (it does not use up a try).
  const elbowNow = () => { const o = origin(); return { x: o.x + sk.elL[0] * SC + ox, y: o.y + sk.elL[1] * SC + oy }; };
  const onDown = () => {
    const p = A.pointer(), e = elbowNow();
    if (phase === 'aim' && p.has && Math.hypot(p.x - e.x, p.y - e.y) < 15) {
      funny++; sfx.giggle(0, 1.2 + funny * 0.15);
      if (funny === 3) { funnyMsg = 3.5; if (G.ach) G.ach('funny_bone'); }
      return;
    }
    clickReq = true;
  };
  E.input.listeners.down.add(onDown);

  const res = await A.run((dt, v) => {
    Object.assign(view, { scale: v.scale, dpr: v.dpr, VW: v.VW });
    const { VW, VH } = v;
    t += dt;
    // wiggle: calm moments and squirmy moments
    stT -= dt;
    if (stT <= 0) {
      if (state === 'calm') { state = 'wiggle'; stT = rand(0.8, 1.6); }
      else { state = 'calm'; stT = Math.max(0.35, rand(0.7, 1.4) - diff * 0.35); }
    }
    const want = state === 'calm' ? 0.04 : 1;
    amp += (want - amp) * Math.min(1, dt * 5);
    ox = Math.sin(t * 7.3) * amp * 10 + Math.sin(t * 13.1) * amp * 4;
    oy = Math.cos(t * 6.1) * amp * 7;
    const ptr = A.pointer();
    const fx = ptr.has ? ptr.x : VW / 2, fy = ptr.has ? ptr.y : VH / 2;
    if (phase === 'aim' && clickReq) {
      clickReq = false;
      tries++; flash = 1; sfx.zip();
      const hp = hurtNow();
      const dx = Math.abs(fx - hp.x), dy = Math.abs(fy - hp.y);
      const inFrame = dx < FW * 0.38 * tol && dy < FH * 0.38 * tol;
      const still = amp < 0.3;
      blurShot = { fx, fy, amp, ox, oy };
      if (inFrame && still) {
        phase = 'result'; resultT = 0; result = 'good'; sfx.great();
        perfect = tries === 1 && amp < 0.15 && dx < FW * 0.18 && dy < FH * 0.18;
      } else {
        phase = 'result'; resultT = 0; result = !inFrame ? 'miss' : 'blur'; sfx.bad();
      }
    }
    clickReq = false;
    if (phase === 'result') {
      resultT += dt;
      if (resultT > 1.8) {
        if (result === 'good') return { ok: true };
        if (tries >= 3) return { ok: false };
        phase = 'aim'; blurShot = null;
      }
    }
    // ---------- draw ----------
    const bg = ctx.createRadialGradient(VW / 2, VH / 2, 40, VW / 2, VH / 2, VW * 0.7);
    bg.addColorStop(0, '#16324f'); bg.addColorStop(1, '#060d18');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, VW, VH);
    const o = origin();
    const drawSkel = (dx, dy, alpha) => {
      ctx.save(); ctx.translate(o.x + dx, o.y + dy); ctx.scale(SC, SC); ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#dbeafe'; ctx.fillStyle = '#dbeafe'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = '#9cc8ff'; ctx.shadowBlur = 10;
      const bone = (a, b, w = 9) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.beginPath(); ctx.arc(a[0], a[1], w * 0.75, 0, 7); ctx.arc(b[0], b[1], w * 0.75, 0, 7); ctx.fill(); };
      ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(sk.skull[0], sk.skull[1], 30, 34, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = '#060d18'; ctx.beginPath(); ctx.ellipse(139, 44, 7, 9, 0, 0, 7); ctx.ellipse(161, 44, 7, 9, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#dbeafe';
      ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(150, 66, 16, 0.2, Math.PI - 0.2); ctx.stroke();
      for (let y = 100; y < 262; y += 13) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(143, y, 14, 9, 3) : ctx.rect(143, y, 14, 9); ctx.fill(); }
      ctx.lineWidth = 5;
      for (let i = 0; i < 6; i++) { const y = 136 + i * 17; ctx.beginPath(); ctx.ellipse(150, y, 48 - i * 3, 14, 0, Math.PI * 1.08, Math.PI * 1.92, true); ctx.stroke(); }
      bone([104, 118], [196, 118], 6);
      ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(150, 268, 40, 18, 0, 0, 7); ctx.stroke();
      bone(sk.shL, sk.elL); bone(sk.elL, sk.wrL, 7); bone(sk.shR, sk.elR); bone(sk.elR, sk.wrR, 7);
      for (const [w, hnd] of [[sk.wrL, sk.haL], [sk.wrR, sk.haR]]) for (let k = -2; k <= 2; k++) bone(w, [hnd[0] + k * 5, hnd[1] + 6], 3);
      bone(sk.hipL, sk.knL, 11); bone(sk.knL, sk.anL, 8); bone(sk.hipR, sk.knR, 11); bone(sk.knR, sk.anR, 8);
      bone(sk.anL, sk.ftL, 6); bone(sk.anR, sk.ftR, 6);
      // the funny bone is smiling (very small)
      ctx.shadowBlur = 0; ctx.fillStyle = '#16324f'; ctx.strokeStyle = '#16324f'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(sk.elL[0] - 2, sk.elL[1] - 1.5, 0.9, 0, 7); ctx.arc(sk.elL[0] + 2, sk.elL[1] - 1.5, 0.9, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(sk.elL[0], sk.elL[1], 2.6, 0.3, Math.PI - 0.3); ctx.stroke();
      ctx.restore();
    };
    if (phase === 'result' && result !== 'good' && blurShot) {
      for (let k = -3; k <= 3; k++) drawSkel(blurShot.ox + k * 6 * (blurShot.amp + 0.3), blurShot.oy + k * 3, 0.22);
    } else drawSkel(ox, oy, 1);
    // hurt spot glow
    const hp = hurtNow();
    if (!(phase === 'result' && result === 'good')) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 6);
      const g = ctx.createRadialGradient(hp.x, hp.y, 2, hp.x, hp.y, 30);
      g.addColorStop(0, `rgba(255,70,90,${0.55 + pulse * 0.35})`); g.addColorStop(1, 'rgba(255,70,90,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hp.x, hp.y, 30, 0, 7); ctx.fill();
    } else {
      // the crack shows up on a good picture
      ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(hp.x - 10, hp.y - 8); ctx.lineTo(hp.x - 2, hp.y - 2); ctx.lineTo(hp.x - 6, hp.y + 3); ctx.lineTo(hp.x + 4, hp.y + 9); ctx.stroke();
    }
    // frame
    const fxx = phase === 'result' && blurShot ? blurShot.fx : fx, fyy = phase === 'result' && blurShot ? blurShot.fy : fy;
    ctx.strokeStyle = phase === 'result' ? (result === 'good' ? '#7be495' : '#ff8b8b') : '#ffd23f';
    ctx.lineWidth = 4; ctx.setLineDash([14, 8]);
    ctx.strokeRect(fxx - FW / 2, fyy - FH / 2, FW, FH); ctx.setLineDash([]);
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fxx - 10, fyy); ctx.lineTo(fxx + 10, fyy); ctx.moveTo(fxx, fyy - 10); ctx.lineTo(fxx, fyy + 10); ctx.stroke();
    // hold-still bar
    const bw = Math.min(360, VW - 140), bx = (VW - bw) / 2, by = 44;
    ctx.fillStyle = 'rgba(29,43,54,0.9)'; roundRect(ctx, bx - 12, by - 26, bw + 24, 52, 18); ctx.fill();
    const still = clamp(1 - amp, 0, 1);
    ctx.fillStyle = '#3a4a57'; roundRect(ctx, bx, by + 2, bw, 14, 7); ctx.fill();
    ctx.fillStyle = still > 0.7 ? '#7be495' : still > 0.4 ? '#ffd23f' : '#ff8b8b'; roundRect(ctx, bx, by + 2, bw * still, 14, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 15px Fredoka, Arial'; ctx.textAlign = 'center';
    ctx.fillText(state === 'calm' ? 'HOLD STILL... now!' : `${c.first} is wiggling...`, VW / 2, by - 6);
    ctx.textAlign = 'right'; ctx.fillText(`Tries left: ${Math.max(0, 3 - tries)}`, VW - 24, VH - 20);
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, VW, VH); flash -= dt * 3; }
    if (funnyMsg > 0) { funnyMsg -= dt; banner(ctx, VW, VH, 'HEHEHE! You found my FUNNYBONE!', '#ffd23f', VH / 2 - 120, 28); }
    if (phase === 'result') {
      if (result === 'good') banner(ctx, VW, VH, `Got it! A crack in the ${SPOTS[spotKey].bone}.`, '#7be495', VH / 2 + 150, 32);
      else banner(ctx, VW, VH, result === 'blur' ? 'Too blurry! They moved.' : 'Missed the hurt spot!', '#ff8b8b', VH / 2 + 150, 34);
    }
    return null;
  });
  E.input.listeners.down.delete(onDown);
  A.close();
  if (!res.ok) return { score: 5, fail: true, severity: 1, reason: 'xray' };
  const score = clamp(100 - (tries - 1) * 22 - (perfect ? 0 : 6), 20, 100);
  const out = { score, fail: false, perfect };
  if (perfect) {
    if (G.ach) G.ach('xray_perfect');
    out.afterLine = c.ageGroup === 'kid'
      ? 'Whoa, my skeleton looks so cool! The nurse says brave kids can type BRAVE in the secret code box.'
      : pick(['Is that my good side? It is ALL my good side.', 'Can I get a copy for my fridge?', 'My skeleton looks younger than me.']);
  }
  return out;
}
