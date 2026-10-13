// Triplet Shuffle: three identical kids, only one is sick. Watch them swap places and pick the right one.
import * as THREE from 'three';
import { TABLE_TOP, clamp, pick, rand, toon } from '../engine.js';
import { route, SPOTS } from '../nav.js';

const WRONG = ["I'M NOT SICK! I just came for the lollipops!", 'Nope! Healthy as a horse! A small horse!', 'Wrong one! Ha! I feel GREAT!'];
const RIGHT = ['Aww! How did you KNOW?!', 'No fair, you were watching too close!', "Okay, it's me. *cough* It's definitely me."];

function thermometer() {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.11, 8), toon('#ffffff')); stick.rotation.z = Math.PI / 2; stick.position.x = 0.05; g.add(stick);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), toon('#e63946')); g.add(bulb);
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.07, 6), toon('#e63946')); line.rotation.z = Math.PI / 2; line.position.x = 0.04; g.add(line);
  return g;
}

export async function play(G, P) {
  const { E, ui, sfx } = G;
  const c = P.c;
  await G.howTo('triplets', 'TRIPLET SHUFFLE!', [
    'Triplets! They look exactly the same, and only <b>one</b> of them is sick.',
    "Watch the one with the thermometer. Then they'll <b>switch places</b> really fast.",
    '<b>Click the sick triplet</b> when they stop. Pick wrong twice and their mom will be... upset.',
  ], '👯');
  const actors = [P.extras[0], P.person, P.extras[1]];
  const names = c.triplets || ['A', 'B', 'C'];
  actors.forEach((a, i) => { a.tripName = names[i]; });
  const slotsX = [-0.62, 0, 0.62];
  const order = actors.slice(); // order[i] sits at slotsX[i]
  const sick = pick(actors);
  G.dbg = { kind: 'triplets', phase: 'watch', sick, actors };
  const say = (a, text, o = {}) => { a.talk(Math.min(2, text.length * 0.04)); return ui.say(() => a.headTop(), text, { name: a.tripName, pitch: c.voice || 1.5, key: 'trip' + actors.indexOf(a), ...o }); };
  await E.frame(new THREE.Vector3(0, TABLE_TOP + 0.32, 0.3), 2.1, 1.0, new THREE.Vector3(0, 0.22, 1), 0.8);
  // show the sick one
  const th = thermometer();
  th.position.set(0.02, 0.09, 0.15); th.rotation.y = -0.4;
  sick.j.head.add(th);
  sick.expr('sad'); sick.shiver = 3;
  actors.filter(a => a !== sick).forEach(a => a.expr('happy'));
  ui.hint('Watch the <b>sick</b> triplet (the one with the thermometer)!');
  ui.popAt(sick.headTop(), '🤒 This one!', 'bad');
  sfx.blip(0.8);
  await say(sick, '*cough* ...I feel fine. *cough*', { hold: 0.8 });
  await E.wait(0.6);
  sick.j.head.remove(th);
  sick.shiver = 0;
  actors.forEach(a => a.expr('smug'));
  sfx.pop();
  ui.hint('Now they\'re switching places! <b>Keep your eye on the sick one!</b>');
  await say(actors[1], 'Triplet SHUFFLE!', { hold: 0.4 });
  // swaps
  const diff = G.diff;
  const n = 6 + Math.round(diff * 4);
  for (let i = 0; i < n; i++) {
    const a = Math.floor(Math.random() * 3);
    let b = Math.floor(Math.random() * 2); if (b >= a) b++;
    const A = order[a], B = order[b];
    const xa = slotsX[a], xb = slotsX[b];
    const dur = Math.max(0.3, 0.55 - diff * 0.12 - i * 0.012);
    sfx.whoosh();
    await E.tween(dur, k => {
      A.root.position.x = xa + (xb - xa) * k; A.root.position.y = A.sitY + Math.sin(k * Math.PI) * 0.32; A.root.position.z = 0.24 + Math.sin(k * Math.PI) * 0.12;
      B.root.position.x = xb + (xa - xb) * k; B.root.position.y = B.sitY + Math.sin(k * Math.PI) * 0.05; B.root.position.z = 0.24 - Math.sin(k * Math.PI) * 0.12;
    });
    order[a] = B; order[b] = A;
    await E.wait(0.05);
  }
  actors.forEach(a => { a.root.position.y = a.sitY; a.root.position.z = 0.24; });
  // pick
  G.dbg.phase = 'pick';
  ui.hint('Which one is sick? <b>Click the sick triplet!</b>');
  let tries = 0, done = false, fail = false;
  let hover = null;
  const roots = actors.map(a => a.root);
  const offHover = E.onUpdate(() => {
    const hit = E.pickObjects(roots);
    const p = hit && hit.object.userData.person;
    hover = actors.includes(p) ? p : null;
    actors.forEach(a => { const want = a === hover && !done ? 0.03 : 0; a.root.position.y += (a.sitY + want - a.root.position.y) * 0.3; });
    document.body.style.cursor = hover && !done ? 'pointer' : '';
  });
  await new Promise(res => {
    const onDown = async () => {
      if (done) return;
      const hit = E.pickObjects(roots);
      const p = hit && actors.includes(hit.object.userData.person) ? hit.object.userData.person : null;
      if (!p) return;
      if (p === sick) {
        done = true; sfx.great();
        p.expr('surprised'); ui.popAt(p.headTop(), 'FOUND THE SICK ONE!', 'good');
        await say(p, pick(RIGHT), { hold: 0.6 });
        res();
      } else {
        tries++; sfx.bad(); G.mood(-10);
        p.expr('laugh'); p.wiggle = 0.6;
        ui.popAt(p.headTop(), 'WRONG TRIPLET!', 'bad');
        say(p, pick(WRONG), { hold: 0.8 });
        if (tries >= 2) { done = true; fail = true; await E.wait(1.2); sick.expr('sad'); await say(sick, "It was me the whole time. *cough*", { hold: 0.6 }); res(); }
      }
    };
    E.input.listeners.down.add(onDown);
    const offWait = E.onUpdate(() => { if (done) { E.input.listeners.down.delete(onDown); offWait(); } });
  });
  offHover();
  document.body.style.cursor = '';
  ui.hint(null);
  // the healthy two leave, the sick one scoots to the middle
  const others = actors.filter(a => a !== sick);
  await E.home(0.6);
  others.forEach(a => a.expr('happy'));
  say(others[0], 'Bye! Good luck with the shot!', { hold: 0.6 });
  const leave = async a => {
    await a.hopOff(E, a.root.position.x * 0.6, SPOTS.front.z + 0.15);
    const p0 = a.root.position;
    await a.walkPath(E, route({ x: p0.x, z: p0.z }, SPOTS.doorIn), 2.2);
    await a.walkPath(E, [SPOTS.door], 2.2);
    a.root.visible = false;
  };
  G.room.openDoor(E, true); sfx.door();
  const leaving = Promise.all([leave(others[0]), E.wait(0.4).then(() => leave(others[1]))]);
  const x0 = sick.root.position.x;
  await E.tween(0.5, k => { sick.root.position.x = x0 * (1 - k); sick.root.position.y = sick.sitY + Math.sin(k * Math.PI) * 0.12; });
  await leaving;
  G.room.openDoor(E, false); sfx.door();
  P.person = sick;
  sick.expr('smile');
  if (fail) return { score: 0, fail: true, severity: 1, reason: 'triplets' };
  return { score: tries ? 55 : 100, fail: false };
}
