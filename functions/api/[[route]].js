// Doctor Chaos API: username/password accounts, cloud saves and leaderboards.
// Runs as a Cloudflare Pages Function with a D1 database bound as DB.
// No email or personal info is collected: just a username and a password.
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';
import { GUIDE } from '../../lib/guide.js';

const GUIDE_USER = 'Creater'; // exact spelling and capitals

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
  const u = await env.DB.prepare('SELECT id, username, money, days, earned, save, updated_at FROM users WHERE id = ?').bind(s.user_id).first();
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
      const by = q === 'days' ? 'days' : q === 'money' ? 'money' : 'earned';
      const { results } = await env.DB.prepare(`SELECT username, ${by} AS value FROM users WHERE updated_at IS NOT NULL ORDER BY ${by} DESC, updated_at ASC LIMIT 50`).all();
      let me = null;
      const user = await currentUser(req, env);
      if (user && user.updated_at) {
        const v = user[by];
        const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM users WHERE updated_at IS NOT NULL AND (${by} > ? OR (${by} = ? AND updated_at < ?))`).bind(v, v, user.updated_at).first();
        me = { rank: r.n + 1, value: v };
      }
      return json(req, { by, top: results, me });
    }
    // ---- everything below needs a login ----
    const user = await currentUser(req, env);
    if (!user) return fail(req, 'Please log in again.', 401);
    if (route === 'me' && req.method === 'GET') {
      let save = null;
      try { save = user.save ? JSON.parse(user.save) : null; } catch (e) { save = null; }
      return json(req, { username: user.username, money: user.money, days: user.days, earned: user.earned, save, guide: user.username === GUIDE_USER });
    }
    if (route === 'me' && req.method === 'DELETE') {
      await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id), env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id)]);
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
      // days played only goes up; money is sanity-capped so the board stays believable
      const days = Math.max(user.days, clampInt(b.days, 0, 100000));
      const money = clampInt(b.money, -1000000, 60000 + days * 15000);
      // total earned only goes up, with a generous cap per day played
      const earned = Math.max(user.earned || 0, clampInt(b.earned, 0, 100000 + days * 20000));
      const save = b.save ? JSON.stringify(b.save) : null;
      if (save && save.length > 150000) return fail(req, 'Save is too big.');
      await env.DB.prepare('UPDATE users SET money = ?, days = ?, earned = ?, save = COALESCE(?, save), updated_at = ? WHERE id = ?').bind(money, days, earned, save, now(), user.id).run();
      return json(req, { ok: true, money, days, earned });
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
