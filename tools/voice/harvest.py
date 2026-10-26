"""Collect every sentence the game can say, keyed exactly the way the game looks them up.
Runs the game's own modules in a browser page, so keys match speech.js."""
ROOT = __import__('pathlib').Path(__file__).resolve().parents[2]

import asyncio
import json
from playwright.async_api import async_playwright

STATIC = json.load(open(ROOT / 'tools/voice/static_lines.json'))

JS = r"""
async (STATIC) => {
  const SP = await import('/js/speech.js');
  const D = await import('/js/data.js');
  const X = await import('/js/excuses.js');
  const ST = await import('/js/step-talk.js');
  const F = await import('/js/food-data.js');
  const PR = await import('/js/props.js');
  const PAT = ['kid', 'teenm', 'teenf', 'adultm', 'adultf', 'elderm', 'elderf'];
  const ageCats = a => a === 'kid' ? ['kid'] : a === 'teen' ? ['teenm', 'teenf'] : a === 'adult' ? ['adultm', 'adultf'] : a === 'elder' ? ['elderm', 'elderf'] : PAT;
  const catOf = (age, g) => age === 'kid' ? 'kid' : age === 'baby' ? null : (['teen', 'adult', 'elder'].includes(age) ? age : 'adult') + (g === 'f' ? 'f' : 'm');
  const map = new Map();   // key -> { say, cats:Set, src:Set }
  const missedVars = new Set();
  const add = (text, cats, src) => {
    if (typeof text !== 'string' || !text) return;
    if (/\{\w+\}/.test(text)) { missedVars.add(text); return; }
    for (const p of SP.pieces(text)) {
      if (p.say.includes('\u0000')) continue;
      let e = map.get(p.key);
      if (!e) { e = { say: p.say, cats: new Set(), src: new Set() }; map.set(p.key, e); }
      for (const c of cats) if (c) e.cats.add(c);
      e.src.add(src);
    }
  };
  const walk = (o, cats, src) => {
    if (typeof o === 'string') add(o, cats, src);
    else if (Array.isArray(o)) o.forEach(x => walk(x, cats, src));
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, ['kid', 'teen', 'adult', 'elder'].includes(k) ? ageCats(k) : cats, src);
  };
  const errs = new Map();
  const N = (n, f) => { for (let i = 0; i < n; i++) { try { f(i); } catch (e) { const k = String(e && e.stack || e).split('\n').slice(0, 3).join(' | '); errs.set(k, (errs.get(k) || 0) + 1); } } };

  // fixed pools
  walk(D.REMARKS, PAT, 'REMARKS'); walk(D.SUCCESS, PAT, 'SUCCESS'); walk(D.FAIL, PAT, 'FAIL');
  walk(D.WRONG_TOOL, PAT, 'WRONG_TOOL'); walk(D.IMPATIENT, PAT, 'IMPATIENT'); walk(D.PICKLES_LINES, PAT, 'PICKLES');
  walk(D.NURSE_QUIPS, ['nurse'], 'NURSE_QUIPS');
  walk(ST.STEP_TALK, PAT, 'STEP_TALK');
  for (const k of ['FOOD_REMARKS', 'FOOD_WRONG', 'FOOD_IMPATIENT', 'FOOD_SUCCESS', 'FOOD_FAIL', 'FOOD_REFUND', 'FOOD_ANGRY', 'FOOD_PICKY', 'FOOD_REMAKE_OK', 'FOOD_REMAKE_SORRY', 'FOOD_REMAKE_BAD', 'FOOD_COUPON']) if (F[k]) walk(F[k], PAT, k);
  walk(F.FOOD_QUIPS, ['nurse'], 'FOOD_QUIPS');
  if (F.MANAGER_REMAKE) walk(F.MANAGER_REMAKE, ['nurse'], 'MANAGER_REMAKE');

  // every excuse, with every fill-in word
  const OBJS = [...new Set(Object.values(PR.OBJECT_NAMES))];
  // the objects each step really uses (copied from data.js SMALL_OBJ / BIG_OBJ)
  const SMALL = ['lego', 'marble', 'dice', 'crayon', 'dino', 'airpod', 'coin', 'button', 'jellybean'];
  const BIG = ['duck', 'remote', 'harmonica', 'chicken', 'toycar', 'spoon', 'sock'];
  const also = t => t.replace(/^I /, 'Also, I ').replace(/^My /, 'Also, my ');
  const EXTRA = new Set(['removal', 'shot', 'reflex', 'steth', 'cast', 'thermo', 'bp', 'otoscope', 'drops', 'bandage', 'xray']);
  const LET = { k: ['kid'], t: ['teenm', 'teenf'], a: ['adultm', 'adultf'], e: ['elderm', 'elderf'] };
  for (const [kind, list] of Object.entries(X.EXCUSES)) for (const line of list) {
    const i = line.indexOf('|'); const ages = line.slice(0, i); let text = line.slice(i + 1);
    const cats = kind === 'baby' ? ['adultm', 'adultf'] : [...ages].flatMap(l => LET[l] || []);
    let variants = [text];
    const expand = (re, vals) => { variants = variants.flatMap(t => re.test(t) ? vals.map(v => t.replace(re, v)) : [t]); };
    if (kind === 'baby') variants = [['He', 'he', 'his'], ['She', 'she', 'her']].map(([P, p, h]) => text.replace(/\{Pr\}/g, P).replace(/\{pr\}/g, p).replace(/\{his\}/g, h));
    const NAMES = ids => ids.map(id => PR.OBJECT_NAMES[id]);
    expand(/\{obj\}/g, kind === 'removal' ? NAMES(SMALL) : kind === 'swallowed' ? NAMES(BIG) : OBJS); expand(/\{where\}/g, ['ear', 'nose']);
    for (const v of variants) {
      add(v, cats, 'EXCUSES.' + kind);
      // a second problem is told as "Also, I ..." (see generateDay in data.js)
      if (EXTRA.has(kind)) add(also(v), cats, 'EXCUSES.also');
    }
  }
  // the endings tacked on when a patient runs out of new excuses
  { const used = new Set(); N(60, () => add(X.uniqueLine('zz', ['Okay.'], used), PAT, 'TAILS')); }

  // generated patients: lots of days, every kind of patient
  const FIELDS = ['complaint', 'success', 'fail', 'afterLine'];
  const takePatient = (c, src) => {
    const cats = [catOf(c.ageGroup, c.gender || (c.look && c.look.gender))];
    for (const f of FIELDS) add(c[f], cats, src + '.' + f);
    for (const r of c.remarks || []) add(r, cats, src + '.remarks');
    if (c.parent || c.parentRemarks) {
      const pc = [catOf('adult', c.parent && c.parent.look && c.parent.look.gender)];
      for (const r of c.parentRemarks || []) add(r, pc, src + '.parent');
      if (c.special === 'baby') add(c.complaint, pc, src + '.parentComplaint');
    }
  };
  N(400, d => { for (const c of D.generateDay(d + 1, { n: 6 })) takePatient(c, 'day'); });
  for (const name of D.PERSONA_NAMES) N(60, () => takePatient(D.personaPatient(name, new Set()), 'persona.' + name));
  for (const t of D.SPECIAL_TYPES) N(80, () => takePatient(D.testSpecialPatient(t, new Set()), 'special.' + t));
  takePatient(D.tutorialPatient(), 'tutorial');
  for (const age of ['kid', 'teen', 'adult', 'elder']) for (const g of ['m', 'f']) for (const step of Object.keys(D.STEP_TOOL)) N(25, () => {
    const c = D.normalPatient(age, g, step, new Set());
    takePatient(c, 'normal');
    if (step === 'blood') add(also(c.complaint), [catOf(age, g)], 'normal.also');   // blood lines told second
  });

  // goodbyes are built from pieces; sample them a lot
  for (const age of ['kid', 'teen', 'adult', 'elder']) for (const mood of ['great', 'good', 'meh', 'sad']) for (const step of Object.keys(D.STEP_TOOL)) N(120, () => add(D.goodbye({ ageGroup: age, steps: [step] }, mood), ageCats(age), 'goodbye'));

  // fast food customers and goodbyes
  N(3000, d => { for (const c of F.generateOrderDay(d % 60 + 1, { n: 6, tier: d % 10 })) takePatient(c, 'food'); });
  for (const mood of ['great', 'good', 'meh', 'sad']) N(200, () => add(F.foodGoodbye(mood), PAT, 'foodGoodbye'));

  // lines written inline in main.js and the mini-games
  for (const s of STATIC) add(s.t, s.who === 'nurse' ? ['nurse'] : PAT, 'static.' + s.src);

  const out = [];
  for (const [key, e] of map) out.push({ key, say: e.say, cats: [...e.cats].sort(), src: [...e.src].slice(0, 4) });
  return { lines: out, missedVars: [...missedVars].slice(0, 40), errs: [...errs] };
}
"""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html?lineup')
        await pg.wait_for_timeout(2500)
        res = await pg.evaluate(JS, STATIC)
        await b.close()
    json.dump(res['lines'], open(ROOT / 'tools/voice/lines.json', 'w'))
    print('sentences:', len(res['lines']), 'errors:', errs[:3])
    print('call errors:', res['errs'])
    print('unfilled templates:', len(res['missedVars']), res['missedVars'][:5])


asyncio.run(main())
