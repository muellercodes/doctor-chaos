import * as THREE from 'three';
import { clipboard } from '../props.js';
import { clamp, rand, pick, toon } from '../engine.js';
import { h } from '../ui.js';

export async function play(G, P) {
  const { E, ui, sfx } = G;
  const person = P.person;
  await G.howTo('sneeze', 'INCOMING SNEEZE!', [
    'This patient is about to sneeze. A LOT.',
    'A target shows where each sneeze will go. <b>Move your clipboard</b> to cover it before the <b>ACHOO!</b>',
    'Block them all to stay clean. Miss one and... ew.',
  ], '🤧');
  const S = E.scope();
  person.setPose('sit');
  await E.wait(0.2);
  person.snap();
  const s = person.s;
  const head = person.headCenter();
  const mouth = head.clone().add(new THREE.Vector3(0, -0.06 * s * person.hs, 0.15 * s * person.hs));
  const planeZ = head.z + 0.5;
  const center = new THREE.Vector3(head.x, head.y - 0.1, planeZ);
  await E.frame(new THREE.Vector3(head.x, head.y - 0.1, head.z), 1.7, 1.05, new THREE.Vector3(0, 0.1, 1), 0.8);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -planeZ);
  const CBS = 0.95;
  const cb = clipboard(); cb.scale.setScalar(CBS); S.add(cb);
  const cbW = 0.26 * CBS, cbH = 0.34 * CBS;
  const reticleMat = new THREE.MeshBasicMaterial({ color: '#ff4d6d', transparent: true, opacity: 0.85, depthTest: false }); reticleMat.userData.dispose = true;
  const reticle = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.065, 32), reticleMat); reticle.renderOrder = 10; reticle.visible = false; S.add(reticle);
  const cross = new THREE.Mesh(new THREE.CircleGeometry(0.014, 16), reticleMat); cross.renderOrder = 10; cross.visible = false; S.add(cross);
  S.update(() => {
    const p = E.pointerOnPlane(plane);
    if (p) cb.position.set(clamp(p.x, center.x - 0.6, center.x + 0.6), clamp(p.y, center.y - 0.4, center.y + 0.4), planeZ);
  });
  ui.hint('Move the <b>clipboard</b> over the red target before the sneeze!');
  G.dbg = { kind: 'sneeze', tgt: null };
  const blobs = [];
  const puffMat = toon('#e8fff0');
  const N = 6;
  let blocked = 0;
  for (let i = 0; i < N; i++) {
    const mega = i === N - 1;
    const tgt = new THREE.Vector3(center.x + rand(-0.42, 0.42), center.y + rand(-0.25, 0.25), planeZ + 0.03);
    reticle.position.copy(tgt); cross.position.copy(tgt); G.dbg.tgt = tgt;
    reticle.visible = true; cross.visible = true;
    const wind = (mega ? 1.6 : 1.15) - G.diff * 0.3 - i * 0.04;
    const yaw = clamp((tgt.x - head.x) * 1.4, -0.6, 0.6), pitch = clamp(-(tgt.y - head.y) * 1.2, -0.4, 0.4);
    person.expr('scared');
    G.say(mega ? 'Ah... AAAH... AAAAAAAAAH...' : pick(['Ah... ah...', 'Ahh... AHH...', 'Hah... HAHH...']), { key: 'c', hold: wind, fast: true, silent: true });
    sfx.ahh(P.c.voice || 1);
    let tt = 0;
    await new Promise(res => {
      const off = S.update(dt => {
        tt += dt;
        const k = tt / wind;
        reticle.scale.setScalar((mega ? 2.2 : 1.3) * (1.6 - 0.6 * k) * (1 + Math.sin(tt * 20) * 0.05));
        person.lookYaw = yaw * k; person.lookPitch = pitch * k - 0.25 * k;
        if (tt >= wind) { off(); res(); }
      });
    });
    // ACHOO
    person.lookPitch = pitch + 0.15; person.expr('yell');
    sfx.sneeze(); if (mega) { sfx.sneeze(); E.shake(0.03); }
    G.say(mega ? 'AAAA-CHOOOOOOO!!!' : 'CHOO!', { key: 'c', hold: 0.5, silent: true });
    const r = (mega ? 0.12 : 0.06);
    const inside = Math.abs(tgt.x - cb.position.x) < cbW / 2 + r * 0.4 && Math.abs(tgt.y - cb.position.y) < cbH / 2 + r * 0.4;
    // spray
    const puffs = [];
    for (let k = 0; k < (mega ? 16 : 9); k++) {
      const pf = new THREE.Mesh(new THREE.SphereGeometry(rand(0.012, 0.028) * (mega ? 1.5 : 1), 8, 6), puffMat);
      pf.position.copy(mouth); S.add(pf);
      const end = tgt.clone().add(new THREE.Vector3(rand(-r, r), rand(-r, r), 0));
      puffs.push({ pf, end });
    }
    await E.tween(0.18, k => puffs.forEach(p => p.pf.position.lerpVectors(mouth, p.end, k)), t => t);
    if (inside) {
      blocked++;
      sfx.splat();
      ui.popAt(tgt, mega ? 'MEGA BLOCK!' : 'BLOCKED!', 'good');
      puffs.forEach(p => { cb.worldToLocal(p.pf.position); cb.add(p.pf); p.pf.position.z = 0.012; p.pf.scale.z = 0.3; blobs.push(p.pf); });
      E.shake(0.004);
    } else {
      sfx.splat();
      puffs.forEach(p => (p.pf.visible = false));
      const cloud = S.dom(h('div', 'sneeze-cloud' + (mega ? ' mega' : '')));
      ui.root.appendChild(cloud);
      setTimeout(() => cloud.remove(), 1600);
      ui.popCenter(mega ? 'EWWWWWWW!!!' : 'EWW!', 'bad');
      E.shake(mega ? 0.04 : 0.015);
    }
    reticle.visible = false; cross.visible = false;
    person.lookYaw = 0; person.lookPitch = 0;
    person.expr(inside ? 'sad' : 'laugh');
    if (i === 2 && Math.random() < 0.7) G.remark();
    await E.wait(mega ? 1.0 : 0.6);
  }
  ui.hint(null);
  person.expr('smile');
  await G.say(blocked >= N - 1 ? 'Wow, you blocked almost all of them! You must play a lot of dodgeball.' : pick(["Sorry! SO sorry. It's the pollen.", 'Bless me. Nobody else is going to.']), { key: 'c', hold: 0.6 });
  S.end();
  return { score: clamp(blocked / N * 100, 20, 100), fail: false, blocked };
}
