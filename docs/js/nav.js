// Tiny path finder for walking around the exam room without going through furniture.
// Obstacles are axis-aligned boxes on the floor: [minX, maxX, minZ, maxZ].
export const OBSTACLES = [
  [-1.05, 1.05, -0.4, 0.4], // exam table
  [1.05, 1.55, 0.42, 0.78], // instrument tray stand
  [-1.55, -1.05, -1.0, -0.5], // heart monitor cart
  [-2.0, -1.6, 0.8, 1.2], // trash can
  [2.2, 2.9, 0.95, 1.55], // cardboard box
  [3.55, 4.15, 0.05, 0.65], // hamper
  [-2.55, -2.05, -1.45, -0.95], // nurse
  [-3.7, -1.4, -2.65, -1.9], // counter
  [1.25, 2.65, -2.2, -1.9], // curtain
  [-4.35, -3.75, -2.35, -1.75], // plant
  [-4.65, -3.95, -0.95, 0.05], // supply cabinet
];

export const SPOTS = {
  front: { x: 0, z: 1.0 }, // where patients stand before hopping onto the table
  doorIn: { x: 3.25, z: -1.55 },
  door: { x: 3.3, z: -2.95 },
  parent: { x: 0.72, z: 0.86 },
};

const NODES = [
  { x: 0, z: 1.0 }, { x: 1.85, z: 1.0 }, { x: 2.95, z: -0.6 }, { x: 3.25, z: -1.55 },
  { x: -1.1, z: 1.4 }, { x: -2.8, z: 0.4 }, { x: -0.2, z: -1.4 }, { x: 1.2, z: -1.25 },
  { x: 2.2, z: -1.25 }, { x: -3.3, z: -1.3 }, { x: 0.72, z: 0.86 }, { x: 2.1, z: 0.3 }, { x: -1.33, z: 0.63 },
];

const inside = (p, b, r) => p.x > b[0] - r && p.x < b[1] + r && p.z > b[2] - r && p.z < b[3] + r;

function clear(a, b, r, ignore) {
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  const n = Math.max(2, Math.ceil(d / 0.05));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    for (const ob of OBSTACLES) { if (ignore.has(ob)) continue; if (inside(p, ob, r)) return false; }
  }
  return true;
}

// Returns a list of points to walk through (not including `from`).
export function route(from, to, r = 0.18) {
  const ignore = new Set(OBSTACLES.filter(ob => inside(from, ob, r) || inside(to, ob, r)));
  const pts = [from, ...NODES.filter(nd => !OBSTACLES.some(ob => inside(nd, ob, r))), to];
  const N = pts.length, S = 0, T = N - 1;
  const dist = new Array(N).fill(Infinity), prev = new Array(N).fill(-1), done = new Array(N).fill(false);
  dist[S] = 0;
  for (let it = 0; it < N; it++) {
    let u = -1;
    for (let i = 0; i < N; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] === Infinity) break;
    done[u] = true;
    if (u === T) break;
    for (let v = 0; v < N; v++) {
      if (done[v] || v === u) continue;
      if (!clear(pts[u], pts[v], r, ignore)) continue;
      const nd = dist[u] + Math.hypot(pts[v].x - pts[u].x, pts[v].z - pts[u].z);
      if (nd < dist[v]) { dist[v] = nd; prev[v] = u; }
    }
  }
  if (dist[T] === Infinity) return [to];
  const path = [];
  for (let v = T; v !== S; v = prev[v]) path.unshift(pts[v]);
  return path;
}
