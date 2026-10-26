// Doctor Chaos API: username/password accounts, cloud saves and leaderboards.
// Runs as a Cloudflare Pages Function with a D1 database bound as DB.
// No email or personal info is collected: just a username and a password.
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';
import { GUIDE } from '../../lib/guide.js';

const GUIDE_USER = 'Creater'; // exact spelling and capitals (the guide and the admin panel)
const UPGRADE_IDS = ['steady', 'lawyer', 'shoes', 'lolli', 'coats'];
const MAX_RANK = 110;
const CODE_WORDS = (GUIDE.find(sec => /secret codes/i.test(sec.title)) || { items: [] }).items.map(i => i[0]).filter(w => /^[A-Z]+$/.test(w));
// pending admin changes for a user; while any are waiting, the player's own syncs do not overwrite the boards
const pendingFor = (env, id) => env.DB.prepare('SELECT COUNT(*) AS n FROM gifts WHERE user_id = ? AND claimed_at IS NULL').bind(id).first().then(r => (r ? r.n : 0));
// fun events the creator can turn on for everyone (each has an end time)
const EVENTS = ['party', 'bighead', 'cats', 'specials'];
async function getConfig(env) {
  const { results } = await env.DB.prepare('SELECT key, value FROM config').all();
  const c = {}; for (const r of results || []) { try { c[r.key] = JSON.parse(r.value); } catch (e) { /* ignore */ } }
  const boost = c.payBoost && c.payBoost.until > now() ? c.payBoost : null;
  const events = {};
  for (const k of EVENTS) { const until = c.events && c.events[k]; if (until > now()) events[k] = until; }
  return { payBoost: boost ? boost.x : 1, boostUntil: boost ? boost.until : 0, events };
}
// preset cheers the creator can send (no free typing: nobody can use this to message kids)
const CHEERS = ['Great job, doctor!', 'You are on fire! (Not literally. Nurse Pat checked.)', 'Keep it up!', 'Happy birthday!', 'Nurse Pat says hi.', 'You are a legend.', 'Nice work today!', 'Time for a snack break!', 'Welcome to Doctor Chaos!', 'You are the best!'];
const VISITORS = ['runner', 'baby', 'sneezy', 'hider', 'scooter', 'germs', 'triplets', 'lightsout', 'vampire', 'pirate', 'trench', 'mime', 'influencer', 'grandma', 'ticklish', 'conspiracy'];
const CHEATS = ['bighead', 'party', 'squeaky', 'zoomies', 'spooky', 'cats', 'robot'];
const PAUSED = 9e15; // locked_until for an account the creator paused

const ALLOWED_ORIGINS = ['https://muellercodes.github.io', 'https://doctor-chaos.pages.dev'];
const ITER = 20000; // PBKDF2 rounds (kept modest so it fits the free plan's CPU limit)
const SESSION_DAYS = 120;
const RESERVED = ['admin', 'administrator', 'moderator', 'mod', 'nursepat', 'nurse_pat', 'doctorchaos', 'drchaos', 'system', 'support', 'official'];
const matcher = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers });

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const randHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const now = () => Date.now();

function cors(req) {
  const o = req.headers.get('Origin');
  const h = { 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
  if (o && (ALLOWED_ORIGINS.includes(o) || /^https:\/\/[a-z0-9-]+\.doctor-chaos\.pages\.dev$/.test(o) || /^http:\/\/localhost(:\d+)?$/.test(o))) h['Access-Control-Allow-Origin'] = o;
  return h;
}
const json = (req, data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors(req) } });
const fail = (req, error, status = 400) => json(req, { error }, status);

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: ITER }, key, 256);
  return hex(bits);
}
async function sha256(s) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(s))); }
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function nameProblem(u) {
  if (typeof u !== 'string' || !/^[A-Za-z0-9_]{3,16}$/.test(u)) return 'Usernames are 3 to 16 letters, numbers or _ (no spaces).';
  const lc = u.toLowerCase();
  if (RESERVED.includes(lc) || RESERVED.includes(lc.replace(/_/g, ''))) return 'That name is taken by the hospital. Pick another one.';
  if (matcher.hasMatch(u) || matcher.hasMatch(u.replace(/_/g, '')) || matcher.hasMatch(u.replace(/_/g, ' '))) return "Nurse Pat says that name isn't allowed. Try a different one.";
  return null;
}

// simple fixed-window rate limit stored in D1
async function limited(env, key, max, windowMs) {
  const t = now();
  const row = await env.DB.prepare('SELECT count, reset_at FROM ratelimit WHERE key = ?').bind(key).first();
  if (!row || row.reset_at < t) {
    await env.DB.prepare('INSERT INTO ratelimit (key, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = excluded.reset_at').bind(key, t + windowMs).run();
    return false;
  }
  if (row.count >= max) return true;
  await env.DB.prepare('UPDATE ratelimit SET count = count + 1 WHERE key = ?').bind(key).run();
  return false;
}

async function newSession(env, userId) {
  const token = randHex(32);
  const t = now();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created_at, last_seen) VALUES (?, ?, ?, ?)').bind(await sha256(token), userId, t, t).run();
  return token;
}
async function currentUser(req, env) {
  const m = (req.headers.get('Authorization') || '').match(/^Bearer ([a-f0-9]{64})$/);
  if (!m) return null;
  const th = await sha256(m[1]);
  const s = await env.DB.prepare('SELECT user_id, last_seen FROM sessions WHERE token_hash = ?').bind(th).first();
  if (!s) return null;
  if (s.last_seen < now() - SESSION_DAYS * 864e5) { await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(th).run(); return null; }
  if (s.last_seen < now() - 36e5) await env.DB.prepare('UPDATE sessions SET last_seen = ? WHERE token_hash = ?').bind(now(), th).run();
  const u = await env.DB.prepare('SELECT id, username, money, days, earned, gifted, rank, hidden, save, updated_at FROM users WHERE id = ?').bind(s.user_id).first();
  return u ? { ...u, tokenHash: th } : null;
}

async function readBody(req) {
  const len = Number(req.headers.get('Content-Length') || 0);
  if (len > 200000) return null;
  const text = await req.text();
  if (text.length > 200000) return null;
  try { return JSON.parse(text); } catch (e) { return null; }
}

const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));

export async function onRequest(context) {
  const { request: req, env, params } = context;
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (!env.DB) return fail(req, 'The account server is not set up yet.', 503);
  const route = (params.route || []).join('/');
  const ip = req.headers.get('CF-Connecting-IP') || 'local';
  try {
    // ---- create an account ----
    if (route === 'register' && req.method === 'POST') {
      const b = await readBody(req);
      if (!b) return fail(req, 'Bad request.');
      const u = String(b.username || '').trim(), p = String(b.password || '');
      const prob = nameProblem(u);
      if (prob) return fail(req, prob);
      if (p.length < 6 || p.length > 64) return fail(req, 'Passwords need 6 to 64 characters.');
      if (await limited(env, 'reg:' + ip, 30, 36e5)) return fail(req, 'Too many new accounts from here. Try again in an hour.', 429);
      const exists = await env.DB.prepare('SELECT id FROM users WHERE uname_lc = ?').bind(u.toLowerCase()).first();
      if (exists) return fail(req, 'Somebody already has that name. Try another one.', 409);
      const salt = randHex(16);
      const ph = await hashPassword(p, salt);
      const r = await env.DB.prepare('INSERT INTO users (username, uname_lc, pass_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)').bind(u, u.toLowerCase(), ph, salt, now()).run();
      const id = r.meta.last_row_id;
      return json(req, { token: await newSession(env, id), username: u });
    }
    // ---- log in ----
    if (route === 'login' && req.method === 'POST') {
      const b = await readBody(req);
      if (!b) return fail(req, 'Bad request.');
      const u = String(b.username || '').trim(), p = String(b.password || '');
      if (await limited(env, 'login:' + ip, 30, 6e5)) return fail(req, 'Too many tries. Wait ten minutes.', 429);
      const row = await env.DB.prepare('SELECT id, username, pass_hash, salt, fails, locked_until FROM users WHERE uname_lc = ?').bind(u.toLowerCase()).first();
      if (!row) return fail(req, "That username and password don't match.", 401);
      if (row.locked_until >= PAUSED) return fail(req, 'This account is paused by the creator.', 403);
      if (row.locked_until > now()) return fail(req, 'Too many wrong passwords. This account is locked for a few minutes.', 429);
      const ph = await hashPassword(p, row.salt);
      if (!safeEqual(ph, row.pass_hash)) {
        const fails = row.fails + 1;
        await env.DB.prepare('UPDATE users SET fails = ?, locked_until = ? WHERE id = ?').bind(fails >= 8 ? 0 : fails, fails >= 8 ? now() + 5 * 6e4 : 0, row.id).run();
        return fail(req, "That username and password don't match.", 401);
      }
      await env.DB.prepare('UPDATE users SET fails = 0, locked_until = 0 WHERE id = ?').bind(row.id).run();
      return json(req, { token: await newSession(env, row.id), username: row.username });
    }
    // ---- leaderboards (public) ----
    if (route === 'leaderboard' && req.method === 'GET') {
      const q = new URL(req.url).searchParams.get('by');
      const by = q === 'days' ? 'days' : q === 'money' ? 'money' : q === 'rank' ? 'rank' : 'earned';
      const { results } = await env.DB.prepare(`SELECT username, ${by} AS value FROM users WHERE updated_at IS NOT NULL AND hidden = 0 ORDER BY ${by} DESC, updated_at ASC LIMIT 50`).all();
      let me = null;
      const user = await currentUser(req, env);
      if (user && user.updated_at) {
        const v = user[by];
        const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM users WHERE updated_at IS NOT NULL AND hidden = 0 AND (${by} > ? OR (${by} = ? AND updated_at < ?))`).bind(v, v, user.updated_at).first();
        me = { rank: r.n + 1, value: v };
      }
      return json(req, { by, top: results, me });
    }
    // ---- game-wide settings (public) ----
    if (route === 'config' && req.method === 'GET') return json(req, await getConfig(env));
    // ---- everything below needs a login ----
    const user = await currentUser(req, env);
    if (!user) return fail(req, 'Please log in again.', 401);
    if (route === 'me' && req.method === 'GET') {
      let save = null;
      try { save = user.save ? JSON.parse(user.save) : null; } catch (e) { save = null; }
      return json(req, { username: user.username, money: user.money, days: user.days, earned: user.earned, save, guide: user.username === GUIDE_USER });
    }
    if (route === 'me' && req.method === 'DELETE') {
      await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id), env.DB.prepare('DELETE FROM gifts WHERE user_id = ?').bind(user.id), env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id)]);
      return json(req, { ok: true });
    }
    if (route === 'logout' && req.method === 'POST') {
      await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(user.tokenHash).run();
      return json(req, { ok: true });
    }
    if (route === 'progress' && req.method === 'PUT') {
      const b = await readBody(req);
      if (!b) return fail(req, 'Save is too big or broken.');
      if (await limited(env, 'save:' + user.id, 240, 36e5)) return json(req, { ok: true, skipped: true });
      const save = b.save ? JSON.stringify(b.save) : null;
      if (save && save.length > 150000) return fail(req, 'Save is too big.');
      // admin changes are waiting for this player's game: keep the boards as the admin set them until it picks them up
      if (await pendingFor(env, user.id)) {
        await env.DB.prepare('UPDATE users SET updated_at = ? WHERE id = ?').bind(now(), user.id).run();
        return json(req, { ok: true, pending: true });
      }
      // days played only goes up; money and earned are sanity-capped (promotions raise pay a lot)
      const days = Math.max(user.days, clampInt(b.days, 0, 100000));
      const rank = clampInt(b.rank, 0, MAX_RANK);
      const boost = 1 + 0.35 * Math.max(rank, user.rank || 0);
      const money = clampInt(b.money, -1e9, 60000 + days * 15000 * boost + (user.gifted || 0));
      const earned = Math.max(user.earned || 0, clampInt(b.earned, 0, 100000 + days * 20000 * boost + (user.gifted || 0)));
      await env.DB.prepare('UPDATE users SET money = ?, days = ?, earned = ?, rank = ?, save = COALESCE(?, save), updated_at = ? WHERE id = ?').bind(money, days, earned, rank, save, now(), user.id).run();
      return json(req, { ok: true, money, days, earned });
    }
    // ---- gifts waiting for this player (sent from the admin panel); claiming them marks them used ----
    if (route === 'gifts' && req.method === 'POST') {
      const { results } = await env.DB.prepare('UPDATE gifts SET claimed_at = ? WHERE user_id = ? AND claimed_at IS NULL RETURNING id, money, upgrades, action, from_name, created_at').bind(now(), user.id).all();
      const parse = t => { try { return t ? JSON.parse(t) : null; } catch (e) { return null; } };
      const gifts = (results || []).sort((a, b) => a.id - b.id).map(g => ({ money: g.money, upgrades: parse(g.upgrades), action: parse(g.action), from: g.from_name, at: g.created_at }));
      return json(req, { gifts });
    }
    // ---- admin panel: only the account named exactly Creater ----
    if (route.startsWith('admin/')) {
      if (user.username !== GUIDE_USER) return fail(req, 'Only the creator can do that.', 403);
      if (route === 'admin/users' && req.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT username, days, money, earned, rank, hidden, created_at, updated_at, CASE WHEN locked_until >= ? THEN 1 ELSE 0 END AS paused FROM users ORDER BY uname_lc ASC LIMIT 1000').bind(PAUSED).all();
        return json(req, { users: results || [], config: await getConfig(env), cheers: CHEERS, visitors: VISITORS, cheats: CHEATS });
      }
      // one player's details: account info plus a summary of their saved game
      if (route === 'admin/user' && req.method === 'GET') {
        const name = String(new URL(req.url).searchParams.get('name') || '').toLowerCase();
        const u = await env.DB.prepare('SELECT id, username, days, money, earned, gifted, rank, hidden, created_at, updated_at, locked_until, save FROM users WHERE uname_lc = ?').bind(name).first();
        if (!u) return fail(req, 'No player has that name.', 404);
        const seen = await env.DB.prepare('SELECT MAX(last_seen) AS t, COUNT(*) AS n FROM sessions WHERE user_id = ?').bind(u.id).first();
        const pending = await pendingFor(env, u.id);
        let game = null;
        try {
          const sv = u.save ? JSON.parse(u.save) : null, st = sv && sv.state, pr = sv && sv.profile;
          if (st) game = { day: st.day, money: st.money, rank: st.rank, patients: st.stats && st.stats.patients, lawsuits: st.stats && st.stats.lawsuits, threeStars: st.stats && st.stats.threeStars, awards: pr && pr.ach ? Object.keys(pr.ach).length : 0, codes: pr && pr.codes ? Object.keys(pr.codes).length : 0 };
        } catch (e) { game = null; }
        return json(req, { user: { username: u.username, days: u.days, money: u.money, earned: u.earned, gifted: u.gifted, rank: u.rank, hidden: u.hidden, created_at: u.created_at, updated_at: u.updated_at, paused: u.locked_until >= PAUSED ? 1 : 0, last_seen: seen && seen.t, devices: seen ? seen.n : 0, pending }, game });
      }
      // give money to every player at once
      if (route === 'admin/everyone' && req.method === 'POST') {
        const b = await readBody(req);
        if (!b) return fail(req, 'Bad request.');
        const money = clampInt(b.money, 1, 1e9);
        if (await limited(env, 'everyone:' + user.id, 20, 36e5)) return fail(req, 'Slow down a little. Try again in a bit.', 429);
        const { results } = await env.DB.prepare('SELECT id FROM users WHERE hidden = 0 AND locked_until < ?').bind(PAUSED).all();
        const act = JSON.stringify({ type: 'gift', money });
        const stmts = [];
        for (const r of results || []) {
          stmts.push(env.DB.prepare('INSERT INTO gifts (user_id, money, upgrades, action, from_name, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(r.id, money, null, act, user.username, now()));
          stmts.push(env.DB.prepare('UPDATE users SET money = money + ?, earned = earned + ?, gifted = gifted + ? WHERE id = ?').bind(money, money, money, r.id));
        }
        for (let i = 0; i < stmts.length; i += 90) await env.DB.batch(stmts.slice(i, i + 90));
        return json(req, { ok: true, players: (results || []).length });
      }
      if ((route === 'admin/gift' || route === 'admin/action') && req.method === 'POST') {
        const b = await readBody(req);
        if (!b) return fail(req, 'Bad request.');
        if (await limited(env, 'gift:' + user.id, 600, 36e5)) return fail(req, 'Slow down a little. Try again in a bit.', 429);
        const to = await env.DB.prepare('SELECT id, username, money, days, earned, rank, hidden FROM users WHERE uname_lc = ?').bind(String(b.to || '').trim().toLowerCase()).first();
        if (!to) return fail(req, 'No player has that name.', 404);
        // old style gift: money and upgrades
        const a0 = b.action || { type: 'gift', money: b.money, upgrades: b.upgrades };
        const type = String(a0.type || '');
        const act = { type };
        const big = 1e12;
        const sets = []; // board changes that show up right away
        if (type === 'gift') {
          act.money = clampInt(a0.money, 0, big);
          if (a0.upgrades === 'max') act.upgrades = 'max';
          else if (a0.upgrades && typeof a0.upgrades === 'object') {
            const up = {};
            for (const id of UPGRADE_IDS.concat(['u0', 'u1', 'u2', 'u3'])) { const n = clampInt(a0.upgrades[id], 0, 10); if (n) up[id] = n; }
            if (Object.keys(up).length) act.upgrades = up;
          }
          if (!act.money && !act.upgrades) return fail(req, 'Pick some money or an upgrade to send.');
          if (act.money) sets.push(['money = money + ?', act.money], ['earned = earned + ?', act.money], ['gifted = gifted + ?', act.money]);
        } else if (type === 'setMoney') {
          act.value = clampInt(a0.value, -big, big);
          sets.push(['money = ?', act.value], ['gifted = gifted + ?', Math.max(0, act.value - (to.money || 0))]);
        } else if (type === 'setEarned') {
          act.value = clampInt(a0.value, 0, big);
          sets.push(['earned = ?', act.value], ['gifted = gifted + ?', Math.max(0, act.value - (to.earned || 0))]);
        } else if (type === 'setDaysPlayed') {
          act.value = clampInt(a0.value, 0, 100000);
          sets.push(['days = ?', act.value]);
        } else if (type === 'setDay') {
          act.value = clampInt(a0.value, 1, 100000);
        } else if (type === 'setRank') {
          act.value = clampInt(a0.value, 0, MAX_RANK);
          sets.push(['rank = ?', act.value]);
        } else if (type === 'upgrades') {
          act.mode = ['max', 'reset', 'add'].includes(a0.mode) ? a0.mode : 'max';
          if (act.mode === 'add') { act.slot = clampInt(a0.slot, 0, 4); act.n = clampInt(a0.n, 1, 10); }
        } else if (type === 'unlockAwards') {
          // nothing extra
        } else if (type === 'unlockCodes') {
          act.codes = CODE_WORDS;
        } else if (type === 'reset') {
          sets.push(['money = ?', 200], ['days = ?', 0], ['earned = ?', 0], ['rank = ?', 0]);
        } else if (type === 'hide') {
          const v = a0.value ? 1 : 0;
          await env.DB.prepare('UPDATE users SET hidden = ? WHERE id = ?').bind(v, to.id).run();
          return json(req, { ok: true, to: to.username, hidden: v });
        } else if (type === 'password') {
          // a player forgot their password: the creator sets a new one (all their devices log out)
          const p = String(a0.value || '');
          if (p.length < 6 || p.length > 64) return fail(req, 'Passwords need 6 to 64 characters.');
          const salt = randHex(16);
          const ph = await hashPassword(p, salt);
          await env.DB.batch([
            env.DB.prepare('UPDATE users SET pass_hash = ?, salt = ?, fails = 0, locked_until = CASE WHEN locked_until >= ? THEN locked_until ELSE 0 END WHERE id = ?').bind(ph, salt, PAUSED, to.id),
            env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').bind(to.id, user.tokenHash),
          ]);
          return json(req, { ok: true, to: to.username });
        } else if (type === 'logout') {
          await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').bind(to.id, user.tokenHash).run();
          return json(req, { ok: true, to: to.username });
        } else if (type === 'pause') {
          if (to.id === user.id) return fail(req, "You can't pause your own account.");
          const on = !!a0.value;
          const stmts = [env.DB.prepare('UPDATE users SET locked_until = ?, fails = 0 WHERE id = ?').bind(on ? PAUSED : 0, to.id)];
          if (on) stmts.push(env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(to.id));
          await env.DB.batch(stmts);
          return json(req, { ok: true, to: to.username, paused: on ? 1 : 0 });
        } else if (type === 'patient') {
          act.value = VISITORS.includes(a0.value) ? a0.value : null;
          if (!act.value) return fail(req, 'Pick a patient to send.');
        } else if (type === 'cheat') {
          act.mode = CHEATS.includes(a0.mode) ? a0.mode : null;
          if (!act.mode) return fail(req, 'Pick a silly mode.');
          act.on = !!a0.on;
        } else if (type === 'cheer') {
          act.id = clampInt(a0.id, 0, CHEERS.length - 1);
          act.text = CHEERS[act.id];
        } else return fail(req, 'Unknown admin action.');
        const stmts = [env.DB.prepare('INSERT INTO gifts (user_id, money, upgrades, action, from_name, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(to.id, act.money || 0, null, JSON.stringify(act), user.username, now())];
        for (const [frag, v] of sets) stmts.push(env.DB.prepare(`UPDATE users SET ${frag} WHERE id = ?`).bind(v, to.id));
        await env.DB.batch(stmts);
        return json(req, { ok: true, to: to.username, action: act });
      }
      if (route === 'admin/config' && req.method === 'POST') {
        const b = await readBody(req);
        if (!b) return fail(req, 'Bad request.');
        const hours = clampInt(b.hours, 1, 72);
        const put = (k, v) => env.DB.prepare('INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(k, JSON.stringify(v), now()).run();
        if (b.event !== undefined) {
          // fun events: party hats, big heads, cat ears, or a special patient every day
          if (!EVENTS.includes(b.event)) return fail(req, 'Unknown event.');
          const row = await env.DB.prepare("SELECT value FROM config WHERE key = 'events'").first();
          let ev = {}; try { ev = row ? JSON.parse(row.value) || {} : {}; } catch (e) { ev = {}; }
          ev[b.event] = b.off ? 0 : now() + hours * 36e5;
          await put('events', ev);
        } else {
          const x = [1, 2, 3, 5].includes(Number(b.payBoost)) ? Number(b.payBoost) : 1;
          await put('payBoost', x > 1 ? { x, until: now() + hours * 36e5 } : { x: 1, until: 0 });
        }
        return json(req, { ok: true, config: await getConfig(env) });
      }
      return fail(req, 'Not found.', 404);
    }
    if (route === 'guide' && req.method === 'GET') {
      if (user.username !== GUIDE_USER) return fail(req, 'Nice try. This is only for the creator.', 403);
      return json(req, { guide: GUIDE });
    }
    return fail(req, 'Not found.', 404);
  } catch (e) {
    return fail(req, 'The server tripped over something. Try again.', 500);
  }
}
