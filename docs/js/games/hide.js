import * as THREE from 'three';
import { clamp, rand, pick } from '../engine.js';
import { h } from '../ui.js';
import { route, SPOTS } from '../nav.js';
import { icon } from '../icons.js';

export async function play(G, P) {
  const { E, ui, sfx, room } = G;
  const person = P.person;
  await G.howTo('hide', 'HIDE AND SEEK!', [
    `${P.c.first} saw the needle and <b>hid somewhere in the room</b>!`,
    '<b>Watch and listen</b> for wiggles and giggles (the giggle is louder on the side they are hiding).',
    '<b>Click</b> the hiding spot to find them. Fewer guesses = better score!',
  ], icon('peek'));
  const S = E.scope();
  // poof!
  sfx.whoosh();
  ui.popAt(person.headTop(), 'NOPE!', 'bad');
  await E.tween(0.25, k => person.root.scale.setScalar(Math.max(0.01, 1 - k)));
  person.root.visible = false;
  person.root.scale.setScalar(1);
  await E.moveCamera(new THREE.Vector3(0, 3.6, 5.9), new THREE.Vector3(0, 0.7, -0.4), 0.9);
  const ids = Object.keys(room.spots);
  const hideId = pick(ids);
  const spot = room.spots[hideId];
  G.dbg = { kind: 'hide', hideId, ids, spotPos: id => room.spots[id].group.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.4, 0)) };
  ui.hint(`Where did ${P.c.first} go? <b>Click the hiding spot!</b>`);
  const label = S.dom(h('div', 'spot-label hidden'));
  ui.root.appendChild(label);
  let hover = null;
  const groups = ids.map(id => room.spots[id].group);
  const spotOf = obj => { while (obj) { for (const id of ids) if (room.spots[id].group === obj) return room.spots[id]; obj = obj.parent; } return null; };
  S.update((dt, t) => {
    const hit = E.pickObjects(groups);
    const sp = hit ? spotOf(hit.object) : null;
    if (hover && hover !== sp) hover.group.scale.setScalar(1);
    hover = sp;
    if (sp) {
      sp.group.scale.setScalar(1 + Math.sin(t * 10) * 0.015 + 0.02);
      const pos = E.toScreen(sp.group.position.clone().add(new THREE.Vector3(0, 1.0, 0)));
      label.textContent = sp.label; label.classList.remove('hidden');
      label.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      document.body.style.cursor = 'pointer';
    } else { label.classList.add('hidden'); document.body.style.cursor = ''; }
  });
  S.defer(() => { document.body.style.cursor = ''; groups.forEach(g => g.scale.setScalar(1)); });
  // tells
  let tellT = 1.4, busy = false;
  S.update(dt => {
    tellT -= dt;
    if (tellT <= 0 && !busy) {
      tellT = rand(2.4, 3.8) + G.diff * 1.2;
      spot.tell(E);
      sfx.giggle(spot.pan, P.c.voice || 1.5);
    }
  });
  let tries = 0;
  let found = false;
  let clickQ = null;
  S.on('down', () => { const hit = E.pickObjects(groups); clickQ = hit ? spotOf(hit.object) : null; });
  while (!found) {
    clickQ = null;
    await E.until(() => clickQ !== null);
    const sp = clickQ;
    busy = true;
    sfx.click();
    await sp.open(E);
    if (sp === spot) {
      found = true;
      const a = sp.anchor;
      person.placeStanding(a.x, a.z, Math.atan2(-a.x, 0.9 - a.z));
      person.setPose('cheerStand', true);
      person.root.visible = true;
      person.expr('laugh');
      person.root.scale.setScalar(0.01);
      sfx.boing();
      await E.tween(0.35, k => person.root.scale.setScalar(Math.max(0.01, k)), t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2));
      ui.popAt(person.headTop(), 'FOUND YOU!', 'good');
      sfx.great();
      await G.say(pick(["AWW! How'd you know?!", 'No fair! I was being SO quiet!', 'You found me! Okay... I guess I can be brave.']), { key: 'c', hold: 0.6 });
    } else {
      tries++;
      sfx.blip(0.7);
      const wp = sp.group.position.clone().add(new THREE.Vector3(0, 1.1, 0));
      await ui.say(() => wp, sp.fake, { key: 'fake', hold: 1.2, pitch: 0, cls: 'narrate' });
      await sp.close(E);
      busy = false;
    }
  }
  ui.hint(null);
  label.remove();
  try { await spot.close(E); } catch (e) { /* ignore */ }
  S.end();
  // walk back to the table, around the furniture
  person.setPose('stand');
  await E.home(0.8);
  const p0 = person.root.position;
  await person.walkPath(E, route({ x: p0.x, z: p0.z }, SPOTS.front), 2.2);
  await person.hopOnTable(E);
  person.expr('smile');
  return { score: clamp(100 - tries * 20, 40, 100), fail: false };
}
