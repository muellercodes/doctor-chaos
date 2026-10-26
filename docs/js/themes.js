// What each hospital department looks like, so a promotion to a new department feels like a new job:
// wall color, the sign over the door, a poster, what you see out the window, the lighting, a few
// props, and what the patients wear. Index matches DEPTS in career.js.

const T = (name, o) => ({ name, sky: 'day', light: null, props: [], wear: null, ...o });

export const THEMES = [
  T('Family Medicine', { wall: '#dff3ee', trim: '#7fb8ad', sign: 'FAMILY MEDICINE', poster: { icon: 'house', lines: ['WE TREAT', 'THE WHOLE', 'FAMILY'], bg: '#fff', color: '#2bb3a3' } }),
  T('Pediatrics', { wall: '#fff1c9', trim: '#ffb84d', sign: 'PEDIATRICS', poster: { icon: 'balloon', lines: ['BRAVE KIDS', 'CLUB'], bg: '#fff', color: '#ff5d8f' }, props: ['balloons', 'blocks'] }),
  T('Emergency Room', { wall: '#ffe3e0', trim: '#e53935', sign: 'EMERGENCY', poster: { icon: 'siren', lines: ['NO RUNNING', '(unless chasing', 'a patient)'], bg: '#fff', color: '#e53935' }, props: ['redlight'] }),
  T('Orthopedics', { wall: '#eef1f6', trim: '#90a4ae', sign: 'ORTHOPEDICS', poster: { icon: 'bone', lines: ['BONES', 'ARE COOL'], bg: '#fff', color: '#5c6bc0' }, props: ['crutches'] }),
  T('Cardiology', { wall: '#ffe6ee', trim: '#e0457b', sign: 'CARDIOLOGY', poster: { icon: 'heart', lines: ['LOVE YOUR', 'HEART'], bg: '#fff', color: '#e0457b' } }),
  T('Ear, Nose and Throat', { wall: '#e8f5e9', trim: '#66bb6a', sign: 'EAR NOSE THROAT', poster: { icon: 'ear', lines: ['PICK FRIENDS', 'NOT NOSES'], bg: '#fff', color: '#43a047' } }),
  T('Eye Clinic', { wall: '#e3f2fd', trim: '#42a5f5', sign: 'EYE CLINIC', poster: { icon: 'eye', lines: ['EYE SEE', 'YOU'], bg: '#fff', color: '#1e88e5' } }),
  T('Radiology', { wall: '#e8eaf6', trim: '#3949ab', sign: 'RADIOLOGY', poster: { icon: 'skull', lines: ['SAY', 'CHEESE'], bg: '#1d2b36', color: '#e3f2fd', fg: '#e3f2fd' }, light: { color: '#c5cae9', k: 0.92 }, props: ['lightbox'] }),
  T('Dermatology', { wall: '#fff3e0', trim: '#ffa726', sign: 'DERMATOLOGY', poster: { icon: 'sun', lines: ['WEAR', 'SUNSCREEN'], bg: '#fff', color: '#fb8c00' } }),
  T('Neurology', { wall: '#f3e5f5', trim: '#ab47bc', sign: 'NEUROLOGY', poster: { icon: 'brain', lines: ['USE YOUR', 'BRAIN'], bg: '#fff', color: '#8e24aa' } }),
  T('Germ Ward', { wall: '#f1f8e9', trim: '#c0ca33', sign: 'GERM WARD', poster: { icon: 'germ', lines: ['WASH.', 'YOUR.', 'HANDS.'], bg: '#fffde7', color: '#7cb342' }, light: { color: '#e6ffcc', k: 1 }, props: ['hazard'] }),
  T('Blood Bank', { wall: '#fdecea', trim: '#c62828', sign: 'BLOOD BANK', poster: { icon: 'drop', lines: ['DONATE', '(please)'], bg: '#fff', color: '#c62828' } }),
  T('Sports Medicine', { wall: '#e0f7fa', trim: '#00acc1', sign: 'SPORTS MEDICINE', poster: { icon: 'trophy', lines: ['NO PAIN,', 'NO... OW'], bg: '#fff', color: '#00838f' }, props: ['balls'], wear: 'sweatband' }),
  T('Surgery', { wall: '#e0f2f1', trim: '#26a69a', sign: 'SURGERY', poster: { icon: 'scalpel', lines: ['COUNT YOUR', 'SPONGES'], bg: '#fff', color: '#00897b' }, light: { color: '#e0fff8', k: 1.08 } }),
  T('Geriatrics', { wall: '#efebe9', trim: '#8d6e63', sign: 'GERIATRICS', poster: { icon: 'bingo', lines: ['BINGO', 'TUESDAYS'], bg: '#fff8e1', color: '#6d4c41' }, props: ['rocker'] }),
  T('Sleep Clinic', { wall: '#d9def7', trim: '#5c6bc0', sign: 'SLEEP CLINIC', poster: { icon: 'moon', lines: ['SHHH.', 'PEOPLE ARE', 'SLEEPING'], bg: '#1a237e', color: '#fff59d', fg: '#e8eaf6' }, sky: 'night', light: { color: '#aab4ff', k: 0.7 }, wear: 'nightcap' }),
  T('Space Medicine', { wall: '#d6dbe8', trim: '#37474f', sign: 'SPACE MEDICINE', poster: { icon: 'rocket', lines: ['ZERO', 'GRAVITY', 'ZONE'], bg: '#0d1b2a', color: '#ffd23f', fg: '#e0e7ff' }, sky: 'space', light: { color: '#c9d2ff', k: 0.88 }, props: ['planets', 'helmet'], wear: 'antenna' }),
  T('Underwater Hospital', { wall: '#cdeef2', trim: '#0277bd', sign: 'UNDERWATER HOSPITAL', poster: { icon: 'fish', lines: ['NO SWIMMING', 'IN THE HALLS'], bg: '#e1f5fe', color: '#0277bd' }, sky: 'sea', light: { color: '#8fe3ff', k: 0.9 }, props: ['bubbles', 'seaweed'], wear: 'snorkel' }),
  T('Dinosaur Clinic', { wall: '#e6efd2', trim: '#689f38', sign: 'DINOSAUR CLINIC', poster: { icon: 'dino', lines: ['PLEASE', 'NO BITING'], bg: '#fff', color: '#558b2f' }, sky: 'dino', light: { color: '#fff1d6', k: 1 }, props: ['egg', 'footprints'], wear: 'dino' }),
  T('Superhero Hospital', { wall: '#e3e8ff', trim: '#d32f2f', sign: 'SUPERHERO HOSPITAL', poster: { icon: 'bolt', lines: ['CAPES MUST', 'BE TUCKED IN'], bg: '#fff', color: '#d32f2f' }, sky: 'city', props: ['capes'], wear: 'cape' }),
];
export const themeFor = deptIndex => (deptIndex >= 0 ? THEMES[deptIndex] || THEMES[0] : null);

// ---------------- drawings (no emoji: everything is drawn) ----------------
const P = (ctx, f) => { ctx.beginPath(); f(); };
export function drawIcon(ctx, k, x, y, s, color) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.lineWidth = 6; ctx.strokeStyle = '#1d2b36'; ctx.fillStyle = color; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const fs = () => { ctx.fill(); ctx.stroke(); };
  const circ = (cx, cy, r, f = color) => { ctx.fillStyle = f; P(ctx, () => ctx.arc(cx, cy, r, 0, 7)); fs(); ctx.fillStyle = color; };
  switch (k) {
    case 'house': P(ctx, () => { ctx.moveTo(-50, 0); ctx.lineTo(0, -45); ctx.lineTo(50, 0); ctx.lineTo(38, 0); ctx.lineTo(38, 45); ctx.lineTo(-38, 45); ctx.lineTo(-38, 0); ctx.closePath(); }); fs(); ctx.fillStyle = '#fff'; P(ctx, () => ctx.rect(-12, 12, 24, 33)); fs(); break;
    case 'balloon': P(ctx, () => ctx.ellipse(0, -12, 34, 42, 0, 0, 7)); fs(); P(ctx, () => { ctx.moveTo(0, 30); ctx.quadraticCurveTo(-14, 50, 6, 62); }); ctx.stroke(); break;
    case 'siren': P(ctx, () => { ctx.moveTo(-34, 30); ctx.lineTo(-30, -12); ctx.quadraticCurveTo(0, -46, 30, -12); ctx.lineTo(34, 30); ctx.closePath(); }); fs(); ctx.fillStyle = '#1d2b36'; ctx.fillRect(-46, 30, 92, 14); for (const a of [-1, 1]) P(ctx, () => { ctx.moveTo(a * 46, -30); ctx.lineTo(a * 60, -42); }), ctx.stroke(); break;
    case 'bone': for (const sx of [-1, 1]) { circ(sx * 38, -10, 13, '#fff'); circ(sx * 38, 10, 13, '#fff'); } ctx.fillStyle = '#fff'; P(ctx, () => ctx.rect(-38, -9, 76, 18)); fs(); break;
    case 'heart': P(ctx, () => { ctx.moveTo(0, 40); ctx.bezierCurveTo(-70, -8, -30, -58, 0, -24); ctx.bezierCurveTo(30, -58, 70, -8, 0, 40); }); fs(); break;
    case 'ear': P(ctx, () => { ctx.moveTo(10, 45); ctx.bezierCurveTo(-40, 45, -40, -50, 10, -50); ctx.bezierCurveTo(50, -50, 45, 0, 15, 8); ctx.quadraticCurveTo(0, 15, 10, 45); }); fs(); P(ctx, () => { ctx.moveTo(5, -25); ctx.quadraticCurveTo(25, -25, 18, -5); }); ctx.stroke(); break;
    case 'eye': ctx.fillStyle = '#fff'; P(ctx, () => { ctx.moveTo(-55, 0); ctx.quadraticCurveTo(0, -50, 55, 0); ctx.quadraticCurveTo(0, 50, -55, 0); }); fs(); circ(0, 0, 20, color); circ(0, 0, 9, '#1d2b36'); break;
    case 'skull': ctx.fillStyle = '#e3f2fd'; ctx.strokeStyle = '#e3f2fd'; P(ctx, () => { ctx.arc(0, -8, 38, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(18, 40); ctx.lineTo(-18, 40); ctx.closePath(); }); ctx.fill(); ctx.fillStyle = '#1d2b36'; for (const sx of [-1, 1]) P(ctx, () => ctx.arc(sx * 15, -6, 9, 0, 7)), ctx.fill(); break;
    case 'sun': for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; P(ctx, () => { ctx.moveTo(Math.cos(a) * 36, Math.sin(a) * 36); ctx.lineTo(Math.cos(a) * 54, Math.sin(a) * 54); }); ctx.stroke(); } circ(0, 0, 28, color); break;
    case 'brain': ctx.fillStyle = '#f8bbd0'; P(ctx, () => { ctx.ellipse(0, 0, 54, 38, 0, 0, 7); }); fs(); for (const [a, b, c] of [[-30, -20, 18], [0, -24, 16], [28, -14, 18], [-20, 10, 14], [16, 12, 16]]) P(ctx, () => ctx.arc(a, b, c, 0.4, 2.6)), ctx.stroke(); break;
    case 'germ': for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; P(ctx, () => { ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); ctx.lineTo(Math.cos(a) * 50, Math.sin(a) * 50); }); ctx.stroke(); circ(Math.cos(a) * 52, Math.sin(a) * 52, 6, color); } circ(0, 0, 32, color); circ(-11, -6, 7, '#fff'); circ(11, -6, 7, '#fff'); P(ctx, () => ctx.arc(0, 8, 12, 3.4, 6.0)); ctx.stroke(); break;
    case 'drop': P(ctx, () => { ctx.moveTo(0, -52); ctx.quadraticCurveTo(44, 10, 30, 30); ctx.arc(0, 22, 32, 0.25, Math.PI - 0.25); ctx.quadraticCurveTo(-44, 10, 0, -52); }); fs(); break;
    case 'trophy': ctx.fillStyle = '#ffd23f'; P(ctx, () => { ctx.moveTo(-34, -40); ctx.lineTo(34, -40); ctx.quadraticCurveTo(34, 10, 0, 14); ctx.quadraticCurveTo(-34, 10, -34, -40); }); fs(); P(ctx, () => ctx.rect(-8, 14, 16, 18)); fs(); P(ctx, () => ctx.rect(-26, 32, 52, 12)); fs(); for (const sx of [-1, 1]) P(ctx, () => ctx.arc(sx * 40, -22, 14, sx > 0 ? -1.6 : 1.6, sx > 0 ? 1.6 : 4.7)), ctx.stroke(); break;
    case 'scalpel': ctx.fillStyle = '#cfd8dc'; P(ctx, () => { ctx.moveTo(-55, 20); ctx.lineTo(10, -10); ctx.lineTo(55, -30); ctx.quadraticCurveTo(40, 0, 10, 8); ctx.closePath(); }); fs(); ctx.fillStyle = color; P(ctx, () => ctx.rect(-58, 12, 40, 16)); fs(); break;
    case 'bingo': ctx.fillStyle = '#fff'; P(ctx, () => ctx.rect(-46, -46, 92, 92)); fs(); ctx.lineWidth = 3; for (let i = 1; i < 4; i++) { P(ctx, () => { ctx.moveTo(-46 + i * 23, -46); ctx.lineTo(-46 + i * 23, 46); ctx.moveTo(-46, -46 + i * 23); ctx.lineTo(46, -46 + i * 23); }); ctx.stroke(); } for (const [a, b] of [[0, 0], [1, 1], [2, 2], [3, 3]]) circ(-34 + a * 23, -34 + b * 23, 8, color); break;
    case 'moon': P(ctx, () => { ctx.arc(0, 0, 40, 0.6, Math.PI * 2 - 0.6, false); ctx.arc(22, 0, 30, Math.PI * 2 - 1.0, 1.0, true); ctx.closePath(); }); ctx.fill(); for (const [a, b] of [[44, -36], [56, 10], [36, 34]]) { ctx.fillStyle = '#fff59d'; P(ctx, () => ctx.arc(a, b, 4, 0, 7)); ctx.fill(); } break;
    case 'rocket': ctx.fillStyle = '#eceff1'; P(ctx, () => { ctx.moveTo(0, -56); ctx.quadraticCurveTo(26, -30, 22, 26); ctx.lineTo(-22, 26); ctx.quadraticCurveTo(-26, -30, 0, -56); }); fs(); circ(0, -16, 10, '#4fc3f7'); ctx.fillStyle = color; for (const sx of [-1, 1]) { P(ctx, () => { ctx.moveTo(sx * 20, 0); ctx.lineTo(sx * 38, 34); ctx.lineTo(sx * 20, 26); ctx.closePath(); }); fs(); } ctx.fillStyle = '#ff8a2a'; P(ctx, () => { ctx.moveTo(-12, 28); ctx.quadraticCurveTo(0, 62, 12, 28); }); fs(); break;
    case 'fish': P(ctx, () => { ctx.ellipse(-6, 0, 40, 26, 0, 0, 7); }); fs(); P(ctx, () => { ctx.moveTo(30, 0); ctx.lineTo(56, -24); ctx.lineTo(56, 24); ctx.closePath(); }); fs(); circ(-26, -6, 6, '#fff'); break;
    case 'dino': P(ctx, () => { ctx.moveTo(-55, 30); ctx.quadraticCurveTo(-40, -10, 0, -4); ctx.quadraticCurveTo(14, -40, 40, -44); ctx.quadraticCurveTo(58, -40, 54, -26); ctx.lineTo(30, -24); ctx.quadraticCurveTo(30, 10, 20, 30); ctx.lineTo(12, 30); ctx.lineTo(8, 14); ctx.lineTo(-10, 14); ctx.lineTo(-14, 30); ctx.lineTo(-22, 30); ctx.quadraticCurveTo(-26, 16, -40, 20); ctx.closePath(); }); fs(); circ(40, -36, 4, '#fff'); break;
    case 'bolt': ctx.fillStyle = '#ffd23f'; P(ctx, () => { ctx.moveTo(10, -56); ctx.lineTo(-30, 6); ctx.lineTo(-2, 6); ctx.lineTo(-14, 56); ctx.lineTo(30, -8); ctx.lineTo(2, -8); ctx.closePath(); }); fs(); break;
    default: circ(0, 0, 40, color);
  }
  ctx.restore();
}

// the poster: a drawing with a slogan under it
export function drawPoster(ctx, W, H, p) {
  ctx.fillStyle = p.bg || '#fff'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = p.color; ctx.lineWidth = 18; ctx.strokeRect(9, 9, W - 18, H - 18);
  drawIcon(ctx, p.icon, W / 2, H * 0.32, Math.min(W, H) / 230, p.color);
  ctx.fillStyle = p.fg || '#1d2b36'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const n = p.lines.length, size = n > 2 ? 46 : 56;
  p.lines.forEach((l, i) => { ctx.font = `700 ${size}px Fredoka, "Arial Rounded MT Bold", Arial, sans-serif`; ctx.fillText(l, W / 2, H * 0.62 + i * size * 1.1); });
}

// what you see out the window
export function drawSky(ctx, W, H, kind) {
  const grad = (a, b) => { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
  const dots = (n, color, r) => { ctx.fillStyle = color; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc((i * 97) % W, (i * 53 + i * i * 7) % H, r * (0.5 + (i % 3) / 3), 0, 7); ctx.fill(); } };
  if (kind === 'night') {
    grad('#0b1440', '#2c3e8f'); dots(40, '#fffde7', 1.6);
    ctx.fillStyle = '#fff59d'; ctx.beginPath(); ctx.arc(W * 0.78, H * 0.28, 34, 0, 7); ctx.fill();
    ctx.fillStyle = '#0b1440'; ctx.beginPath(); ctx.arc(W * 0.78 + 14, H * 0.25, 30, 0, 7); ctx.fill();
    ctx.fillStyle = '#1b2a5c'; ctx.fillRect(0, H * 0.78, W, H * 0.22);
    return;
  }
  if (kind === 'space') {
    grad('#05070f', '#151a33'); dots(70, '#ffffff', 1.4);
    ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.arc(W * 0.3, H * 0.7, 80, 0, 7); ctx.fill();
    ctx.fillStyle = '#66bb6a'; ctx.beginPath(); ctx.ellipse(W * 0.27, H * 0.66, 34, 22, 0.4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(W * 0.36, H * 0.78, 22, 14, -0.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffb74d'; ctx.beginPath(); ctx.arc(W * 0.8, H * 0.25, 26, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ffe0b2'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(W * 0.8, H * 0.25, 46, 12, -0.3, 0, 7); ctx.stroke();
    return;
  }
  if (kind === 'sea') {
    grad('#4fc3f7', '#01579b');
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(60 + i * 100, 0); ctx.lineTo(120 + i * 100, 0); ctx.lineTo(30 + i * 110, H); ctx.lineTo(0 + i * 110, H); ctx.fill(); }
    for (const [x, y, c, s] of [[120, 120, '#ffb74d', 1], [360, 200, '#f06292', 0.8], [280, 90, '#fff176', 0.6]]) drawIcon(ctx, 'fish', x, y, 0.55 * s, c);
    ctx.fillStyle = '#2e7d32'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(40 + i * 85, H, 12, 70 + (i % 3) * 20, 0.1 * (i % 2 ? 1 : -1), 0, 7); ctx.fill(); }
    dots(16, 'rgba(255,255,255,0.6)', 4);
    ctx.fillStyle = '#e0c48a'; ctx.fillRect(0, H * 0.9, W, H * 0.1);
    return;
  }
  if (kind === 'dino') {
    grad('#ffb74d', '#ffe0b2');
    ctx.fillStyle = '#6d4c41'; ctx.beginPath(); ctx.moveTo(W * 0.55, H); ctx.lineTo(W * 0.72, H * 0.35); ctx.lineTo(W * 0.8, H * 0.35); ctx.lineTo(W * 0.98, H); ctx.fill();
    ctx.fillStyle = '#ff7043'; ctx.beginPath(); ctx.ellipse(W * 0.76, H * 0.33, 26, 10, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(120,110,100,0.6)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(W * 0.76 + i * 10, H * 0.24 - i * 24, 18 + i * 6, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#7cb342'; ctx.beginPath(); ctx.ellipse(W / 2, H + 50, W * 0.8, 120, 0, 0, 7); ctx.fill();
    drawIcon(ctx, 'dino', W * 0.26, H * 0.68, 1.1, '#558b2f');
    ctx.fillStyle = '#5d4037'; ctx.fillRect(W * 0.07, H * 0.45, 12, H * 0.5);
    ctx.fillStyle = '#388e3c'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(W * 0.08 + Math.cos(i * 1.3) * 30, H * 0.44 + Math.sin(i * 1.3) * 10, 40, 10, i * 1.3, 0, 7); ctx.fill(); }
    return;
  }
  if (kind === 'city') {
    grad('#64b5f6', '#e3f2fd');
    const b = [[0, 160, 70], [70, 110, 60], [130, 190, 80], [210, 130, 55], [265, 210, 70], [335, 150, 60], [395, 180, 75], [470, 120, 60]];
    for (const [x, hgt, w] of b) { ctx.fillStyle = '#546e7a'; ctx.fillRect(x, H - hgt, w, hgt); ctx.fillStyle = '#ffe082'; for (let yy = H - hgt + 12; yy < H - 10; yy += 22) for (let xx = x + 8; xx < x + w - 10; xx += 16) ctx.fillRect(xx, yy, 7, 10); }
    // a hero flying by
    ctx.save(); ctx.translate(W * 0.68, H * 0.22); ctx.rotate(-0.2);
    ctx.fillStyle = '#d32f2f'; ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-58, -14); ctx.lineTo(-50, 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1e88e5'; ctx.fillRect(-14, -8, 40, 14); ctx.fillStyle = '#ffcc80'; ctx.beginPath(); ctx.arc(32, -1, 8, 0, 7); ctx.fill(); ctx.fillRect(26, -14, 22, 5);
    ctx.restore();
    return;
  }
  // a normal sunny day
  grad('#6ec6ff', '#d6f0ff');
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  for (const [x, y, s] of [[110, 90, 1], [350, 60, 0.8], [420, 170, 1.1]]) { ctx.beginPath(); ctx.arc(x, y, 34 * s, 0, 7); ctx.arc(x + 40 * s, y - 14 * s, 40 * s, 0, 7); ctx.arc(x + 80 * s, y, 30 * s, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#7cb342'; ctx.beginPath(); ctx.ellipse(W / 2, H + 60, W * 0.8, 150, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#5d4037'; ctx.fillRect(90, 210, 18, 90);
  ctx.fillStyle = '#43a047'; ctx.beginPath(); ctx.arc(99, 200, 52, 0, 7); ctx.fill();
}
