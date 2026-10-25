// Hand-drawn style SVG icons used everywhere instead of emoji.
// 48x48 boxes, thick ink outlines, flat colors from the game palette.
import { ICONS as TOOL_ICONS } from './ui.js';

const INK = '#1d2b36';
const C = { o: '#ff8a2a', t: '#2bb3a3', y: '#ffd23f', r: '#e63946', b: '#3a86ff', p: '#ff5d8f', u: '#9b5de5', g: '#2ecc71', w: '#ffffff', c: '#fffaf0', s: '#cfd8dc', k: INK, n: '#8d5524', l: '#bde0fe', d: '#90a4ae', m: '#f1c27d', e: '#6d4c2f' };
const col = f => (f in C ? C[f] : f);
const P = (d, f = 'none', sw) => `<path d="${d}" fill="${col(f)}"${sw ? ` stroke-width="${sw}"` : ''}/>`;
const O = (cx, cy, r, f = 'none', sw) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col(f)}"${sw ? ` stroke-width="${sw}"` : ''}/>`;
const E = (cx, cy, rx, ry, f = 'none') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${col(f)}"/>`;
const R = (x, y, w, h, rx = 0, f = 'none', sw) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${col(f)}"${sw ? ` stroke-width="${sw}"` : ''}/>`;
const L = (x1, y1, x2, y2, sw) => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none"${sw ? ` stroke-width="${sw}"` : ''}/>`;
const T = (x, y, txt, size = 14, f = 'k') => `<text x="${x}" y="${y}" font-family="Fredoka, Arial, sans-serif" font-weight="700" font-size="${size}" text-anchor="middle" fill="${col(f)}" stroke="none">${txt}</text>`;
const dot = (x, y, r = 1.8) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}" stroke="none"/>`;
const svg = body => `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><g stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;

function starPath(cx, cy, ro, ri, n = 5, rot = -Math.PI / 2) {
  let d = '';
  for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n, r = i % 2 ? ri : ro; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1); }
  return d + 'Z';
}
function gearPath(cx, cy, ro, ri, teeth = 8) {
  let d = '';
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * Math.PI * 2, r = (i % 4 < 2) ? ro : ri;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1);
  }
  return d + 'Z';
}
const face = (cx, cy, r, fill, mouth = 'smile') => {
  let m = '';
  if (mouth === 'smile') m = P(`M${cx - r * 0.45} ${cy + r * 0.2}Q${cx} ${cy + r * 0.7} ${cx + r * 0.45} ${cy + r * 0.2}`);
  if (mouth === 'frown') m = P(`M${cx - r * 0.4} ${cy + r * 0.5}Q${cx} ${cy + r * 0.1} ${cx + r * 0.4} ${cy + r * 0.5}`);
  if (mouth === 'o') m = O(cx, cy + r * 0.35, r * 0.15, 'k');
  if (mouth === 'flat') m = L(cx - r * 0.35, cy + r * 0.35, cx + r * 0.35, cy + r * 0.35);
  return O(cx, cy, r, fill) + dot(cx - r * 0.35, cy - r * 0.15) + dot(cx + r * 0.35, cy - r * 0.15) + m;
};

const I = {
  // ---------- interface ----------
  gear: () => P(gearPath(24, 24, 18, 13.5, 8), 's') + O(24, 24, 6, 'w'),
  pause: () => R(13, 11, 8, 26, 3, 'o') + R(27, 11, 8, 26, 3, 'o'),
  trophy: () => P('M16 8H32V20Q32 30 24 30Q16 30 16 20Z', 'y') + P('M16 12H9Q8 22 17 23') + P('M32 12H39Q40 22 31 23') + R(21, 30, 6, 6, 0, 'y') + R(14, 36, 20, 6, 2, 'o'),
  chart: () => R(8, 24, 8, 16, 2, 't') + R(20, 12, 8, 28, 2, 'o') + R(32, 18, 8, 22, 2, 'u') + L(5, 41, 43, 41),
  user: () => O(24, 17, 8, 'm') + P('M9 41Q9 27 24 27Q39 27 39 41Z', 'b'),
  fullscreen: () => P('M8 18V8H18') + P('M30 8H40V18') + P('M40 30V40H30') + P('M18 40H8V30'),
  soundOn: () => P('M8 19H15L25 10V38L15 29H8Z', 's') + P('M31 18Q35 24 31 30') + P('M36 13Q43 24 36 35'),
  soundOff: () => P('M8 19H15L25 10V38L15 29H8Z', 's') + L(31, 18, 41, 30) + L(41, 18, 31, 30),
  door: () => R(12, 6, 24, 36, 2, 't') + R(16, 10, 16, 12, 1, 'l') + O(31, 26, 2, 'y') + L(8, 42, 40, 42),
  hospital: () => R(8, 14, 32, 28, 2, 'c') + R(18, 6, 12, 12, 1, 'w') + P('M24 8V16M20 12H28', 'none') + R(13, 22, 6, 6, 1, 'l') + R(29, 22, 6, 6, 1, 'l') + R(20, 31, 8, 11, 1, 'o'),
  moon: () => P('M30 7A17 17 0 1 0 41 30A13 13 0 1 1 30 7Z', 'y') + P(starPath(14, 12, 4, 1.8), 'w', 2),
  cart: () => P('M5 9H11L16 31H37L41 16H13', 'none') + P('M14 16H41L37 31H17Z', 'o') + O(19, 38, 3, 'w') + O(34, 38, 3, 'w'),
  scales: () => L(24, 8, 24, 38) + L(10, 13, 38, 13) + R(15, 38, 18, 4, 2, 'n') + P('M10 13L5 27H15Z', 'y') + P('M38 13L33 27H43Z', 'y') + O(24, 8, 2.5, 'y'),
  can: () => R(13, 8, 22, 32, 4, 's') + R(13, 16, 22, 15, 0, 'r') + E(24, 9, 11, 3, 'd'),
  cloud: () => P('M14 36Q5 36 6 28Q7 21 15 22Q16 12 26 12Q35 12 36 21Q43 21 43 29Q43 36 35 36Z', 'l'),
  trash: () => R(12, 14, 24, 28, 3, 's') + L(8, 12, 40, 12) + R(19, 7, 10, 5, 2, 'none') + L(19, 20, 19, 36, 2.5) + L(29, 20, 29, 36, 2.5),
  warning: () => P('M24 6L44 40H4Z', 'y') + L(24, 18, 24, 29) + dot(24, 34, 2.2),
  phone: () => R(14, 4, 20, 40, 4, 's') + R(17, 9, 14, 26, 1, 'l') + O(24, 39, 1.8, 'none', 2),
  share: () => P('M17 18H12V42H36V18H31', 'none') + L(24, 6, 24, 28) + P('M17 13L24 6L31 13'),
  close: () => L(13, 13, 35, 35, 4) + L(35, 13, 13, 35, 4),
  check: () => P('M10 25L20 35L38 13', 'none', 5),
  timer: () => O(24, 27, 15, 'w') + R(20, 5, 8, 5, 1, 'o') + L(24, 27, 24, 18) + L(24, 27, 30, 30),
  heart: () => P('M24 40Q6 28 6 17Q6 8 15 8Q21 8 24 14Q27 8 33 8Q42 8 42 17Q42 28 24 40Z', 'p'),
  pencil: () => P('M10 38L13 29L33 9L39 15L19 35Z', 'y') + P('M10 38L13 29L19 35Z', 'm') + L(29, 13, 35, 19),
  star: () => P(starPath(24, 25, 19, 8.5), 'y'),
  starOff: () => P(starPath(24, 25, 19, 8.5), 's'),
  chevron: () => P('M18 10L32 24L18 38', 'none', 5),
  left: () => P('M30 8L12 24L30 40Z', 'k'),
  right: () => P('M18 8L36 24L18 40Z', 'k'),
  up: () => P('M24 8L40 30H8Z', 'w') + R(18, 30, 12, 10, 1, 'w'),
  rotate: () => P('M36 15A14 14 0 1 0 38 28', 'none', 4) + P('M38 6V16H28', 'none', 4),
  lock: () => P('M16 22V15Q16 7 24 7Q32 7 32 15V22', 'none') + R(11, 21, 26, 20, 4, 'y') + O(24, 30, 3, 'k') + L(24, 31, 24, 36),
  key: () => O(15, 24, 8, 'y') + O(15, 24, 2.5, 'w') + P('M23 24H42V30M36 24V29', 'none'),
  sparkle: () => P(starPath(24, 24, 18, 5, 4), 'y') + P(starPath(38, 10, 6, 2, 4), 'w', 2),
  magnifier: () => O(20, 20, 12, 'l') + L(29, 29, 41, 41, 5),
  book: () => P('M24 12Q16 7 6 9V38Q16 36 24 41Q32 36 42 38V9Q32 7 24 12Z', 'c') + L(24, 12, 24, 41) + T(15, 30, '?', 15, 'u') + T(33, 30, '!', 15, 'o'),
  speech: () => P('M8 10H40V32H22L13 40V32H8Z', 'w') + dot(17, 21) + dot(24, 21) + dot(31, 21),
  palette: () => P('M24 6Q42 6 42 22Q42 32 32 30Q26 29 28 36Q30 42 22 42Q6 42 6 24Q6 6 24 6Z', 'c') + O(16, 18, 3, 'r') + O(25, 13, 3, 'y') + O(33, 19, 3, 'b') + O(15, 29, 3, 'g'),
  // ---------- shop ----------
  hand: () => P('M14 26V14Q14 11 17 11Q20 11 20 14V24M20 22V9Q20 6 23 6Q26 6 26 9V22M26 22V10Q26 7 29 7Q32 7 32 10V24M32 23V15Q32 12 35 12Q38 12 38 15V29Q38 42 26 42Q17 42 13 35L8 27Q7 24 10 23Q12 22 14 25', 'm'),
  briefcase: () => R(6, 15, 36, 24, 4, 'n') + P('M18 15V10Q18 8 20 8H28Q30 8 30 10V15', 'none') + L(6, 25, 42, 25) + R(21, 22, 6, 6, 1, 'y'),
  shoe: () => P('M6 33V21Q6 18 9 18H16L22 26L36 28Q42 29 42 34V37H6Z', 'r') + R(6, 34, 36, 5, 2, 'w') + L(18, 23, 22, 21, 2) + L(21, 27, 25, 25, 2),
  lollipop: () => L(24, 26, 24, 44, 3) + O(24, 17, 12, 'p') + P('M24 17Q24 11 29 12Q33 14 31 19Q29 24 23 23Q16 22 16 16Q17 9 25 8', 'none', 2.5),
  coat: () => P('M16 8L24 14L32 8L41 14L38 40H10L7 14Z', 'w') + P('M24 14V40') + P('M16 8L20 22L24 14L28 22L32 8') + R(28, 28, 6, 5, 1, 'l'),
  // ---------- tools and mini-games ----------
  bone: () => P('M13 18Q6 18 7 12Q9 7 14 10Q16 5 21 8Q24 11 21 15L33 27Q37 24 40 27Q43 32 38 34Q40 41 34 41Q29 40 30 34L18 22Q15 25 13 18Z', 'c'),
  runner: () => O(29, 8, 4.5, 'm') + P('M27 14L22 27L30 32L28 42', 'none', 4) + P('M22 27L14 34', 'none', 4) + P('M25 17L34 22L40 18', 'none', 4) + P('M25 17L16 18L12 24', 'none', 4),
  germ: () => P(starPath(24, 25, 18, 14, 10), 'g') + dot(19, 22, 2.5) + dot(29, 22, 2.5) + P('M18 30Q24 26 30 30', 'none') + L(16, 17, 21, 19, 2.5) + L(32, 17, 27, 19, 2.5),
  peek: () => R(6, 24, 36, 18, 3, 'n') + E(18, 20, 6, 7, 'w') + E(30, 20, 6, 7, 'w') + dot(19, 21, 2.5) + dot(31, 21, 2.5) + P('M6 30H42', 'none', 2),
  flashlight: () => P('M8 30L22 16L32 26L18 40Z', 's') + P('M22 16L28 6L42 20L32 26Z', 'y') + L(13, 35, 17, 31, 2),
  wheelchair: () => O(20, 31, 11, 'none') + O(20, 31, 3, 'k') + O(37, 39, 3, 'w') + P('M14 8V22H30L37 36', 'none') + O(14, 6, 3.5, 'm') + L(14, 22, 28, 22),
  tissue: () => R(8, 22, 32, 18, 3, 'l') + P('M17 22Q19 8 24 10Q28 12 24 16Q34 8 31 22', 'w') + E(24, 28, 6, 2, 'k'),
  twins: () => face(12, 27, 8, 'm') + face(24, 21, 8, 'm') + face(36, 27, 8, 'm'),
  baby: () => face(24, 26, 15, 'm') + P('M10 22Q12 6 24 7Q36 6 38 22Q30 14 24 15Q18 14 10 22Z', 'l') + O(24, 37, 3, 'b'),
  rattle: () => L(26, 26, 40, 40, 5) + O(19, 19, 12, 'y') + O(19, 19, 5, 'p'),
  silly: () => face(24, 24, 18, 'y', 'none') + P('M16 30Q24 36 32 30', 'none') + P('M21 32Q21 40 26 40Q30 40 29 33', 'p') + L(13, 15, 19, 17, 2.5),
  tongue: () => O(24, 24, 18, 'y') + dot(17, 19, 2.5) + dot(31, 19, 2.5) + P('M15 29Q24 33 33 29', 'none') + P('M20 31Q19 41 25 41Q30 41 29 31', 'p'),
  puffy: () => O(24, 24, 18, 'y') + O(10, 28, 7, 'p') + O(38, 28, 7, 'p') + dot(18, 18, 2.5) + dot(30, 18, 2.5) + O(24, 31, 3, 'k'),
  googly: () => O(24, 26, 17, 'y') + O(16, 18, 7, 'w') + O(33, 17, 8, 'w') + dot(18, 20, 3) + dot(30, 14, 3.4) + P('M15 33Q24 40 33 31', 'none'),
  cryFace: () => face(24, 22, 17, 'l', 'frown') + P('M14 22Q12 30 15 32Q18 30 16 22', 'b', 2) + P('M32 22Q30 30 33 32Q36 30 34 22', 'b', 2),
  happyFace: () => face(24, 24, 18, 'y', 'smile') + O(14, 28, 3, 'p', 0) + O(34, 28, 3, 'p', 0),
  sleepFace: () => face(20, 28, 14, 'm', 'o') + T(36, 15, 'z', 12, 'u') + T(42, 8, 'z', 9, 'u'),
  taco: () => P('M6 34Q6 12 24 12Q42 12 42 34Z', 'y') + P('M10 30Q12 18 18 20Q20 16 24 19Q28 15 31 20Q36 18 38 30', 'g') + O(18, 25, 2.5, 'r') + O(28, 23, 2.5, 'r') + L(6, 34, 42, 34),
  roach: () => E(26, 25, 13, 8, 'n') + O(12, 25, 5, 'e') + L(9, 21, 3, 13, 2) + L(9, 29, 3, 37, 2) + L(22, 32, 18, 40, 2) + L(28, 32, 30, 41, 2) + L(22, 18, 18, 10, 2) + L(28, 18, 30, 9, 2) + L(26, 17, 26, 33, 2),
  coffee: () => P('M10 18H34V33Q34 40 27 40H17Q10 40 10 33Z', 'w') + P('M34 22Q41 22 40 28Q39 33 34 32') + P('M17 13Q15 9 18 6M24 13Q22 9 25 6', 'none', 2.5) + R(10, 18, 24, 6, 0, 'n'),
  // ---------- achievements ----------
  stethoscope: () => P('M12 8V20Q12 30 21 30Q30 30 30 20V8', 'none') + P('M21 30V34Q21 41 29 41Q37 41 37 34V29', 'none') + O(37, 25, 5, 's') + dot(12, 8, 2.8) + dot(30, 8, 2.8),
  gradcap: () => P('M24 9L44 18L24 27L4 18Z', 'k') + P('M12 22V32Q24 40 36 32V22', 'u') + L(40, 20, 40, 32, 2) + O(40, 34, 2.5, 'y'),
  bigstar: () => P(starPath(24, 26, 17, 7.5), 'y') + P(starPath(9, 9, 5, 2, 4), 'w', 2) + P(starPath(40, 10, 5, 2, 4), 'w', 2) + P(starPath(41, 38, 4, 1.6, 4), 'w', 2),
  calendar: (n = '') => R(7, 10, 34, 32, 4, 'w') + R(7, 10, 34, 9, 4, 'r') + L(15, 6, 15, 13) + L(33, 6, 33, 13) + T(24, 36, n, n.length > 1 ? 15 : 17),
  medal: (n = '') => P('M16 4L24 18L32 4', 'none') + P('M14 4L22 18M34 4L26 18', 'b') + O(24, 30, 12, n === '2' ? '#d6dde3' : n === '3' ? '#e0a066' : 'y') + T(24, 35.5, n, 14),
  elder: () => face(24, 26, 16, 'm', 'smile') + P('M9 22Q10 8 24 9Q38 8 39 22', 's') + O(17, 24, 4.5) + O(31, 24, 4.5) + L(21, 24, 27, 24, 2),
  cash: () => R(5, 13, 38, 22, 3, 'g') + O(24, 24, 6, 'w') + T(24, 28, '$', 11, 'g') + O(11, 18, 1.5, 'k') + O(37, 30, 1.5, 'k'),
  moneybag: () => P('M17 12Q14 6 19 5H29Q34 6 31 12Z', 'n') + P('M17 12Q6 20 6 31Q6 42 24 42Q42 42 42 31Q42 20 31 12Z', 'y') + T(24, 34, '$', 15, 'n'),
  bank: () => P('M4 18L24 6L44 18Z', 's') + R(8, 18, 32, 3, 0, 's') + R(10, 22, 5, 14, 0, 'w') + R(21.5, 22, 5, 14, 0, 'w') + R(33, 22, 5, 14, 0, 'w') + R(6, 36, 36, 5, 1, 's'),
  people: () => O(16, 17, 6, 'm') + P('M5 38Q5 26 16 26Q27 26 27 38Z', 'o') + O(32, 15, 6, 'n') + P('M21 36Q21 24 32 24Q43 24 43 36Z', 't'),
  jar: () => R(14, 8, 20, 6, 2, 's') + P('M14 14Q8 18 8 26V36Q8 42 15 42H33Q40 42 40 36V26Q40 18 34 14Z', 'l') + O(19, 32, 4, 'y') + O(28, 34, 4, 'y') + O(24, 26, 4, 'y'),
  scroll: () => R(12, 8, 24, 32, 2, 'c') + P('M8 8Q8 4 12 4H36Q40 4 40 8Q40 12 36 12', 'c') + P('M12 40Q8 40 8 44H36Q40 44 40 40', 'c') + L(17, 18, 31, 18, 2) + L(17, 24, 31, 24, 2) + L(17, 30, 27, 30, 2),
  boom: () => P(starPath(24, 24, 20, 10, 9), 'o') + P(starPath(24, 24, 11, 6, 9), 'y'),
  crown: () => P('M6 36L9 14L18 24L24 10L30 24L39 14L42 36Z', 'y') + O(24, 30, 3, 'r') + R(6, 36, 36, 6, 2, 'o'),
  tent: () => P('M24 6L42 38H6Z', 'r') + P('M24 6L30 38H18Z', 'w') + P('M20 38L24 28L28 38', 'k') + L(24, 6, 24, 2) + P('M24 2L31 4L24 6', 'y'),
  wrench: () => P('M30 6Q40 6 42 14L35 18L32 15L36 11Q33 8 30 9Q25 11 26 17L8 35Q6 39 9 41Q12 43 15 40L33 22Q38 24 42 20', 's'),
  foot: () => P('M14 42Q8 40 9 30Q10 20 17 14Q22 10 26 14Q28 20 25 26Q24 34 28 37Q32 42 24 43Z', 'm') + O(33, 12, 3.5, 'm') + O(37, 18, 3, 'm') + O(39, 24, 2.7, 'm') + O(28, 8, 3.8, 'm'),
  screwdriver: () => R(8, 26, 18, 14, 4, 'r') + P('M26 30L40 16L43 19L29 33Z', 's') + L(12, 31, 22, 31, 2),
  melt: () => P('M8 28Q8 8 24 8Q40 8 40 28Q40 38 34 38Q32 44 26 40Q22 44 18 40Q12 42 10 36Q8 34 8 28Z', 'y') + dot(18, 22, 2.5) + dot(30, 22, 2.5) + P('M18 30Q24 34 30 30', 'none'),
  chartDown: () => R(5, 6, 38, 34, 3, 'w') + P('M10 14L19 22L26 18L38 32', 'none', 3.5) + P('M31 32H38V25', 'none', 3.5),
  vampire: () => P('M8 18Q8 6 24 6Q40 6 40 18L36 16L32 22L24 14L16 22L12 16Z', 'k') + face(24, 26, 13, '#eee6f5', 'flat') + P('M20 32L21 36L22 32M26 32L27 36L28 32', 'w', 2) + P('M4 44Q8 30 12 34L16 40L24 38L32 40L36 34Q40 30 44 44Z', 'r'),
  wind: () => P('M6 16H30Q36 16 36 11Q36 6 31 7', 'none') + P('M6 26H38Q44 26 44 32Q44 37 38 36', 'none') + P('M6 35H24Q29 35 29 40', 'none'),
  detective: () => P('M8 20Q8 8 24 8Q40 8 40 20Z', 'n') + R(4, 19, 40, 5, 2, 'n') + O(20, 34, 8, 'l') + L(26, 40, 33, 46, 4),
  owl: () => P('M10 40V18Q10 6 24 6Q38 6 38 18V40Q24 46 10 40Z', 'n') + O(18, 19, 6, 'w') + O(30, 19, 6, 'w') + dot(18, 19, 2.5) + dot(30, 19, 2.5) + P('M22 26L24 30L26 26Z', 'y') + P('M10 10L14 15M38 10L34 15', 'none'),
  joystick: () => R(8, 30, 32, 12, 4, 's') + L(24, 30, 24, 16, 4) + O(24, 12, 6, 'r') + O(34, 36, 2.5, 'y'),
  bulb: () => P('M24 5Q37 5 37 18Q37 25 31 30V34H17V30Q11 25 11 18Q11 5 24 5Z', 'y') + R(17, 34, 14, 7, 2, 's') + P('M20 20L24 25L28 20', 'none', 2.5),
  note: () => P('M18 34V10L38 6V30', 'none', 3.5) + E(14, 35, 6, 5, 'u') + E(34, 31, 6, 5, 'u'),
  point: () => P('M6 22H26Q30 22 30 26V26Q30 30 26 30H24Q28 30 28 34Q28 38 24 38H16Q8 38 7 31L6 22', 'm') + P('M14 22V16Q14 12 18 12H42Q45 12 45 15Q45 18 42 18H26', 'm'),
  laptop: () => R(9, 9, 30, 21, 3, 'k') + R(12, 12, 24, 15, 1, 't') + P('M4 34H44L40 40H8Z', 's') + P('M16 17L19 20L16 23M23 23H28', 'none', 2),
  alarm: () => O(24, 26, 15, 'w') + L(24, 26, 24, 18) + L(24, 26, 31, 26) + P('M8 13Q8 6 15 7Z', 'r') + P('M40 13Q40 6 33 7Z', 'r') + L(13, 40, 10, 44) + L(35, 40, 38, 44),
  plant: () => P('M14 30H34L31 43H17Z', 'o') + P('M24 30Q22 18 12 14Q14 26 24 30Z', 'g') + P('M24 30Q26 16 36 10Q36 24 24 30Z', 'g') + P('M24 30V20', 'none'),
  sprout: () => P('M6 40H42', 'none') + P('M24 40V24', 'none') + P('M24 26Q14 26 10 16Q20 14 24 24Z', 'g') + P('M24 22Q28 10 40 10Q38 22 24 22Z', 'g') + O(14, 40, 2, 'n', 0) + O(34, 40, 2, 'n', 0),
  burger: () => P('M8 22Q24 4 40 22Z', '#e8b064') + P('M7 26H41', 'none', 5).replace('stroke-width="5"', 'stroke-width="5" stroke="#6ab04c"') + R(7, 28, 34, 7, 3, '#6d4321') + P('M8 37H40L37 43H11Z', '#e0a458'),
  fries: () => P('M10 20H38L34 44H14Z', 'r') + P('M15 20L13 7M20 20L20 5M26 20L27 6M32 20L35 8', 'none', 5).replace('stroke-width="5"', 'stroke-width="5" stroke="#ffd23f"'),
  soda: () => P('M13 14H35L32 44H16Z', 'r') + R(11, 10, 26, 5, 2, 'w') + L(27, 10, 31, 2),
  icecream: () => P('M15 24H33L24 46Z', '#e0a458') + E(24, 22, 11, 6, '#fff6e0') + E(24, 15, 8, 5, '#fff6e0'),
  gift: () => R(8, 20, 32, 22, 3, 'p') + R(6, 14, 36, 8, 3, 'r') + R(21, 14, 6, 28, 0, 'y') + P('M24 14Q14 2 10 9Q10 14 24 14Z', 'y') + P('M24 14Q34 2 38 9Q38 14 24 14Z', 'y'),
  shield: () => P('M24 4L40 10V22Q40 36 24 44Q8 36 8 22V10Z', 'b') + P('M17 24L22 29L32 18', 'none', 4),
  siren: () => P('M12 36V24Q12 12 24 12Q36 12 36 24V36Z', 'r') + R(8, 36, 32, 6, 2, 'd') + L(24, 4, 24, 7) + L(8, 10, 11, 13) + L(40, 10, 37, 13) + P('M19 26Q19 18 24 18', 'none'),
  cat: () => P('M10 42Q8 24 12 12L18 20Q24 18 30 20L36 12Q40 24 38 42Z', 'k') + E(19, 29, 2.5, 3.5, 'y') + E(29, 29, 2.5, 3.5, 'y') + P('M22 35L24 37L26 35', 'none', 2),
  music: () => P('M18 36V10L38 6V32', 'none') + E(14, 36, 5, 4, 'u') + E(34, 32, 5, 4, 'u') + L(18, 16, 38, 12),
  voice: () => face(20, 24, 14, 'm', 'o') + P('M37 16Q42 24 37 32', 'none') + P('M42 12Q49 24 42 36', 'none'),
  tray: () => R(6, 26, 36, 14, 4, 't') + P('M16 18L24 10L32 18', 'none', 4),
  ghost: () => P('M10 42V22Q10 6 24 6Q38 6 38 22V42L33 38L28 42L24 38L20 42L15 38Z', 'w') + E(19, 21, 3, 4, 'k') + E(29, 21, 3, 4, 'k') + O(24, 30, 3, 'k'),
};
// reuse the tool tray icons
const TOOL_KEYS = ['tweezers', 'shot', 'blood', 'surgery', 'reflex', 'steth', 'cast', 'thermo', 'bp', 'otoscope', 'drops', 'bandage'];

export function icon(name, cls = '') {
  if (TOOL_ICONS[name] && !I[name]) return TOOL_ICONS[name].replace('<svg ', `<svg class="ic ${cls}" `);
  let [key, arg] = String(name).split(':');
  const fn = I[key] || I.star;
  return svg(fn(arg)).replace('<svg ', `<svg class="ic ${cls}" `);
}
export const hasIcon = n => !!(I[String(n).split(':')[0]] || TOOL_ICONS[n]);
export const iconNames = () => Object.keys(I).concat(TOOL_KEYS.filter(k => TOOL_ICONS[k]));

// Images for drawing icons on a 2D canvas.
const imgCache = new Map();
export function iconImage(name) {
  if (imgCache.has(name)) return imgCache.get(name);
  const img = new Image();
  const raw = icon(name).replace('<svg ', '<svg width="96" height="96" ');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(raw);
  imgCache.set(name, img);
  return img;
}
export function drawIcon(ctx, name, x, y, size) {
  const img = iconImage(name);
  if (img.complete && img.naturalWidth) ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
}
