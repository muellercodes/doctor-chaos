import * as THREE from 'three';

export const TABLE_TOP = 0.75;

export const ease = {
  linear: t => t,
  inOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- toon materials ----------
let gradTex = null;
function gradient() {
  if (gradTex) return gradTex;
  const data = new Uint8Array([110, 185, 255]);
  gradTex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  gradTex.minFilter = THREE.NearestFilter;
  gradTex.magFilter = THREE.NearestFilter;
  gradTex.generateMipmaps = false;
  gradTex.needsUpdate = true;
  return gradTex;
}
const matCache = new Map();
// Shiny grays read as metal (tools, poles, hinges). Everything else is a soft, slightly rough surface.
const METAL = new Set(['#cfd8dc', '#90a4ae', '#b0bec5', '#c0c8cc', '#78909c', '#607d8b', '#9e9e9e', '#bdbdbd']);
export function toon(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!opts.unique && matCache.has(key)) return matCache.get(key);
  const base = { color, roughness: 0.72, metalness: 0 };
  if (typeof color === 'string' && METAL.has(color.toLowerCase())) { base.metalness = 0.55; base.roughness = 0.32; }
  const m = new THREE.MeshStandardMaterial({ ...base, ...stripOpts(opts) });
  if (!opts.unique) matCache.set(key, m);
  return m;
}
function stripOpts(o) { const r = { ...o }; delete r.unique; return r; }

export function canvasTexture(w, h, draw, scale = 1) {
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const ctx = c.getContext('2d');
  if (scale !== 1) ctx.scale(scale, scale);
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, canvas: c, ctx };
}

// ---------- engine ----------
export function createEngine(canvas) {
  const QS = new URLSearchParams(location.search);
  const MAXDT = QS.has('fast') ? 0.25 : 0.05;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !QS.has('lowq'), powerPreference: 'high-performance' });
  renderer.setPixelRatio(QS.has('lowq') ? 0.5 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = !QS.has('lowq');
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#9fd9d2');
  // soft light bouncing around a bright room, so surfaces pick up gentle reflections
  {
    const env = new THREE.Scene();
    const shell = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 12), new THREE.MeshBasicMaterial({ color: '#c9ded8', side: THREE.BackSide }));
    shell.position.y = 2; env.add(shell);
    const panel = (w, h, x, y, z, ry, rx, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m); };
    panel(5, 3, 0, 4.9, 0, 0, Math.PI / 2, 3.5);
    panel(3, 2, 5.9, 2.5, -1, -Math.PI / 2, 0, 2.2);
    panel(4, 2.2, -1, 2.6, -5.9, 0, 0, 1.6);
    panel(3, 2, -5.9, 2.2, 2, Math.PI / 2, 0, 1.2);
    const floorBounce = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ color: '#d7ece6' })); floorBounce.rotation.x = -Math.PI / 2; floorBounce.position.y = -0.9; env.add(floorBounce);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.04).texture;
    scene.environmentIntensity = 0.55;
    pm.dispose();
  }
  const camera = new THREE.PerspectiveCamera(50, 1, 0.03, 60);
  const basePos = new THREE.Vector3(0, 1.75, 3.7);
  const camTarget = new THREE.Vector3(0, 1.05, 0);
  const shakeOff = new THREE.Vector3();
  let shakeAmt = 0;
  let camTweenId = 0;
  let frameReq = null;
  let paused3D = false;
  let time = 0;

  const updates = new Set();
  const tweens = new Set();

  // ---------- input ----------
  // Drag-safe input: after a phase change (requireRelease), a finger that is still down from the
  // last phase does not count until it lifts, and a new press in the next moment is ignored too,
  // so the end of a scrub can never turn into an accidental click.
  const input = {
    x: 0, y: 0, cx: 0, cy: 0, has: false, _down: false, stale: false, blockUntil: 0,
    touch: typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches,
    get down() { return this._down && !this.stale; },
    set down(v) { this._down = v; },
    requireRelease(ms = 200) { if (this._down) this.stale = true; this.blockUntil = performance.now() + ms; },
    listeners: { down: new Set(), up: new Set(), move: new Set() },
    keys: new Set(), keyListeners: new Set(),
  };
  function setPointer(e) {
    const r = canvas.getBoundingClientRect();
    input.cx = e.clientX - r.left;
    input.cy = e.clientY - r.top;
    input.x = (input.cx / r.width) * 2 - 1;
    input.y = -(input.cy / r.height) * 2 + 1;
    input.has = true;
  }
  canvas.addEventListener('pointerdown', e => {
    setPointer(e); input._down = true; input.touch = e.pointerType === 'touch' || e.pointerType === 'pen';
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (performance.now() < input.blockUntil) { input.stale = true; return; }
    input.stale = false;
    for (const f of [...input.listeners.down]) f(e);
  });
  canvas.addEventListener('pointermove', e => { setPointer(e); for (const f of [...input.listeners.move]) f(e); });
  const up = e => {
    if (!input._down) return;
    setPointer(e); input._down = false;
    if (input.stale) { input.stale = false; return; }
    for (const f of [...input.listeners.up]) f(e);
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && !(e.target instanceof HTMLInputElement)) e.preventDefault();
    input.keys.add(e.code);
    for (const f of [...input.keyListeners]) f(e, true);
  });
  window.addEventListener('keyup', e => { input.keys.delete(e.code); for (const f of [...input.keyListeners]) f(e, false); });
  window.addEventListener('blur', () => { input.keys.clear(); });

  // ---------- resize ----------
  let lastW = 0, lastH = 0;
  function resize() {
    const w = canvas.clientWidth || document.documentElement.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || document.documentElement.clientHeight || window.innerHeight;
    if (!w || !h) return;
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.85 ? 64 : 50;
    camera.updateProjectionMatrix();
    if (frameReq) {
      const p = framePos(frameReq);
      basePos.copy(p);
      camTarget.copy(frameReq.center);
    }
  }
  // Phones (especially iPhone home-screen apps) report the new size late after rotating,
  // so measure again a few times and whenever the canvas box actually changes.
  const settle = () => { resize(); [60, 250, 600, 1200].forEach(ms => setTimeout(resize, ms)); };
  window.addEventListener('resize', settle);
  window.addEventListener('orientationchange', () => { window.scrollTo(0, 0); settle(); });
  document.addEventListener('fullscreenchange', settle);
  document.addEventListener('webkitfullscreenchange', settle);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', settle);
  if (window.ResizeObserver) new ResizeObserver(() => { if (canvas.clientWidth !== lastW || canvas.clientHeight !== lastH) resize(); }).observe(canvas);
  resize();

  // ---------- tweens & updates ----------
  function tween(dur, fn, easing = ease.inOut) {
    let tw;
    const p = new Promise(res => {
      tw = { t: 0, dur: Math.max(0.0001, dur), fn, easing, res, cancelled: false };
      tweens.add(tw);
    });
    p.cancel = () => { tw.cancelled = true; tweens.delete(tw); tw.res(); };
    return p;
  }
  function onUpdate(fn) { updates.add(fn); return () => updates.delete(fn); }
  function wait(sec) {
    return new Promise(res => {
      let t = 0;
      const off = onUpdate(dt => { t += dt; if (t >= sec) { off(); res(); } });
    });
  }
  function until(pred) {
    return new Promise(res => {
      if (pred()) { res(); return; }
      const off = onUpdate(() => { if (pred()) { off(); res(); } });
    });
  }

  // ---------- camera ----------
  function moveCamera(pos, target, dur = 0.9) {
    const id = ++camTweenId;
    frameReq = null;
    const p0 = basePos.clone(), t0 = camTarget.clone();
    if (dur <= 0) { basePos.copy(pos); camTarget.copy(target); return Promise.resolve(); }
    return tween(dur, k => {
      if (id !== camTweenId) return;
      basePos.lerpVectors(p0, pos, k);
      camTarget.lerpVectors(t0, target, k);
    });
  }
  function framePos(req) {
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dV = (req.h * req.margin / 2) / Math.tan(vfov / 2);
    const dH = (req.w * req.margin / 2) / Math.tan(hfov / 2);
    const d = Math.max(dV, dH);
    return req.center.clone().add(req.dir.clone().normalize().multiplyScalar(d));
  }
  // frame a world-space rectangle (w x h as seen from dir) centered at center
  function frame(center, w, h, dir = new THREE.Vector3(0, 0, 1), dur = 0.9, margin = 1.08) {
    const req = { center: center.clone(), w, h, dir: dir.clone(), margin };
    const p = moveCamera(framePos(req), req.center, dur);
    frameReq = req;
    return p;
  }
  const HOME_POS = new THREE.Vector3(0, 1.75, 3.7);
  const HOME_TARGET = new THREE.Vector3(0, 1.0, 0);
  function home(dur = 0.9) {
    return frame(new THREE.Vector3(0, 1.22, 0), 3.1, 2.3, HOME_POS.clone().sub(HOME_TARGET), dur, 1.0);
  }
  function shake(a) { if (noShake) return; shakeAmt = Math.max(shakeAmt, a); }

  // ---------- picking ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function ray() {
    ndc.set(input.x, input.y);
    camera.position.copy(basePos);
    camera.lookAt(camTarget);
    camera.updateMatrixWorld();
    raycaster.setFromCamera(ndc, camera);
    return raycaster;
  }
  function pointerOnPlane(plane) {
    const out = new THREE.Vector3();
    return ray().ray.intersectPlane(plane, out) ? out : null;
  }
  function pickObjects(objs, recursive = true) {
    return ray().intersectObjects(objs, recursive)[0] || null;
  }
  function toScreen(v) {
    const p = v.clone().project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: (p.x + 1) / 2 * r.width, y: (1 - p.y) / 2 * r.height, behind: p.z > 1 };
  }

  // ---------- scope ----------
  function disposeDeep(obj) {
    obj.traverse(o => {
      if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose();
      if (o.material && o.material.userData && o.material.userData.dispose) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
  }
  function scope() {
    const items = [];
    return {
      add(obj, parent = scene) { parent.add(obj); items.push(() => { if (obj.parent) obj.parent.remove(obj); disposeDeep(obj); }); return obj; },
      update(fn) { const off = onUpdate(fn); items.push(off); return off; },
      on(type, fn) { input.listeners[type].add(fn); items.push(() => input.listeners[type].delete(fn)); },
      // Aim-then-pick, made for fingers as well as mice. The pick happens when the press ends, at the
      // spot where it ends, so a finger can see what it is aiming at first.
      //   'explore': dragging only moves the light around; a tap (press without much movement) picks.
      //   'aim':     drag into place and let go to pick; a plain tap also picks.
      pick(fn, mode = 'aim') {
        let press = null;
        const slop = 14;
        const dn = () => { press = { x: input.cx, y: input.cy, far: 0 }; };
        const mv = () => { if (press) press.far = Math.max(press.far, Math.hypot(input.cx - press.x, input.cy - press.y)); };
        const upf = () => { const p = press; press = null; if (!p) return; if (mode === 'explore' && p.far > slop) return; fn(); };
        input.listeners.down.add(dn); input.listeners.move.add(mv); input.listeners.up.add(upf);
        items.push(() => { input.listeners.down.delete(dn); input.listeners.move.delete(mv); input.listeners.up.delete(upf); });
      },
      key(fn) { input.keyListeners.add(fn); items.push(() => input.keyListeners.delete(fn)); },
      dom(el) { items.push(() => el.remove()); return el; },
      defer(fn) { items.push(fn); },
      end() { while (items.length) { try { items.pop()(); } catch (e) { console.error(e); } } },
    };
  }

  // ---------- loop ----------
  let last = performance.now();
  let paused = false, noShake = false;
  let fpsAcc = 0, fpsN = 0, fps = 60;
  function loop(now) {
    requestAnimationFrame(loop);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > MAXDT) dt = MAXDT;
    if (dt <= 0) return;
    if (paused) { if (!paused3D) renderer.render(scene, camera); return; }
    time += dt;
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 1) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
    for (const tw of [...tweens]) {
      if (tw.cancelled) continue;
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      try { tw.fn(tw.easing(k), k); } catch (e) { console.error(e); }
      if (k >= 1) { tweens.delete(tw); tw.res(); }
    }
    for (const f of [...updates]) {
      try { f(dt, time); } catch (e) { console.error(e); updates.delete(f); }
    }
    if (shakeAmt > 0.0005) {
      shakeOff.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(shakeAmt);
      shakeAmt *= Math.pow(0.02, dt);
    } else { shakeOff.set(0, 0, 0); shakeAmt = 0; }
    camera.position.copy(basePos).add(shakeOff);
    camera.lookAt(camTarget);
    if (!paused3D) renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);

  return {
    THREE, renderer, scene, camera, input, basePos, camTarget,
    tween, onUpdate, wait, until, moveCamera, frame, home, shake,
    pointerOnPlane, pickObjects, toScreen, ray, scope,
    // true when the player is using a finger (decides wording like "tap" vs "click")
    get coarse() { return input.touch; },
    get time() { return time; },
    get fps() { return fps; },
    set paused3D(v) { paused3D = v; },
    setQuality(fast) {
      if (QS.has('lowq')) return;
      renderer.setPixelRatio(fast ? Math.min(window.devicePixelRatio || 1, 1) * 0.65 : Math.min(window.devicePixelRatio || 1, 2));
      if (renderer.shadowMap.enabled === fast) { renderer.shadowMap.enabled = !fast; scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); }); }
      resize();
    },
    get paused() { return paused; },
    set paused(v) { paused = v; },
    set noShake(v) { noShake = v; if (v) shakeAmt = 0; },
    get paused3D() { return paused3D; },
    resize,
  };
}
