/**
 * Login web one-time code (envoyé sur WhatsApp)
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const peopleDB = require('./peopleDB');

const DB_PATH = path.join(__dirname, '..', 'data', 'webLogins.json');
const CODE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SECRET =
  process.env.WEB_TOKEN_SECRET ||
  process.env.ADMIN_TOKEN ||
  'ego-xd-web-login-change-me';

function load() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return { codes: {}, sessions: {} };
  }
}

function save(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function phoneToJid(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d || d.length < 8) return null;
  return peopleDB.normalizeJid(d);
}

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function genSessionId() {
  return crypto.randomBytes(24).toString('hex');
}

function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifySession(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expect = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  // comparaison à temps constant (évite les attaques par timing)
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Crée un code OTP pour ce numéro */
function createLoginCode(phone) {
  const jid = phoneToJid(phone);
  if (!jid) throw new Error('Numéro invalide');
  const db = load();
  const now = Date.now();
  // purge
  for (const [k, v] of Object.entries(db.codes || {})) {
    if (v.exp < now) delete db.codes[k];
  }
  const code = genCode();
  db.codes[jid] = { code, exp: now + CODE_TTL_MS, attempts: 0 };
  save(db);
  return { jid, code, expiresInSec: Math.floor(CODE_TTL_MS / 1000) };
}

function verifyLoginCode(phone, code) {
  const jid = phoneToJid(phone);
  if (!jid) throw new Error('Numéro invalide');
  const db = load();
  const entry = db.codes[jid];
  if (!entry || entry.exp < Date.now()) {
    throw new Error('Code expiré ou inexistant. Redemande un code.');
  }
  entry.attempts = (entry.attempts || 0) + 1;
  if (entry.attempts > 5) {
    delete db.codes[jid];
    save(db);
    throw new Error('Trop de tentatives. Redemande un code.');
  }
  if (String(entry.code) !== String(code).trim()) {
    save(db);
    throw new Error('Code incorrect.');
  }
  delete db.codes[jid];
  const sid = genSessionId();
  const exp = Date.now() + SESSION_TTL_MS;
  db.sessions[sid] = { jid, exp };
  save(db);
  const token = signSession({ sid, jid, exp });
  peopleDB.ensure(jid, { session: 'web' });
  return { token, jid, exp };
}

function sessionFromAuthHeader(req) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  const q = req.query?.token;
  const token = (m && m[1]) || q || req.headers['x-hub-token'];
  return verifySession(token);
}

module.exports = {
  createLoginCode,
  verifyLoginCode,
  verifySession,
  sessionFromAuthHeader,
  phoneToJid
};
