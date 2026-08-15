const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'data', 'redeemCodes.json');

function load() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); } catch { return {}; }
}

function save(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

/** Génère un code aléatoire du style EGO-XXXX-XXXX */
function generateCodeString() {
  const part = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `EGO-${part()}-${part()}`;
}

/**
 * Parse une durée style "24h", "2j", "30m" en millisecondes.
 * Unités : m = minutes, h = heures, j (ou d) = jours.
 * Retourne null si le format est invalide.
 */
function parseDuration(str) {
  if (!str) return null;
  const match = String(str).trim().match(/^(\d+)\s*(m|h|j|d)$/i);
  if (!match) return null;
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers = { m: 60 * 1000, h: 60 * 60 * 1000, j: 24 * 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return amount * multipliers[unit];
}

/**
 * Crée un nouveau code de rachat.
 * reward = { xp?: number, rank?: string }  — au moins un des deux
 * options = {
 *   maxUses?: number,
 *   expiresAt?: number (timestamp ms),
 *   durationMs?: number (raccourci pour expiresAt = now + durationMs),
 *   restrictToJid?: string (si défini, seul ce jid peut racheter le code),
 *   price?: string (ex: "1000 FCFA"),
 *   note?: string
 * }
 */
function createCode(reward, createdBy, options = {}) {
  const db = load();
  let code = generateCodeString();
  while (db[code]) code = generateCodeString(); // évite les collisions

  const expiresAt = options.expiresAt || (options.durationMs ? Date.now() + options.durationMs : null);

  db[code] = {
    reward,
    createdBy,
    createdAt: Date.now(),
    expiresAt,
    maxUses: options.maxUses || 1,
    restrictToJid: options.restrictToJid || null,
    price: options.price || null,
    note: options.note || null,
    usedBy: []
  };
  save(db);
  return code;
}

function getCode(code) {
  const db = load();
  return db[code.toUpperCase()] || null;
}

function getCodeStatus(entry) {
  if (entry.expiresAt && Date.now() > entry.expiresAt) return 'expired';
  if (entry.usedBy.length >= entry.maxUses) return 'exhausted';
  return 'active';
}

/**
 * Tente de racheter un code pour un jid donné.
 * Retourne { ok: true, reward } ou { ok: false, reason }
 */
function redeemCode(code, jid) {
  const db = load();
  const entry = db[code.toUpperCase()];

  if (!entry) return { ok: false, reason: 'invalid' };
  if (entry.restrictToJid && entry.restrictToJid !== jid) return { ok: false, reason: 'not_allowed' };
  if (entry.expiresAt && Date.now() > entry.expiresAt) return { ok: false, reason: 'expired' };
  if (entry.usedBy.includes(jid)) return { ok: false, reason: 'already_used' };
  if (entry.usedBy.length >= entry.maxUses) return { ok: false, reason: 'exhausted' };

  entry.usedBy.push(jid);
  save(db);
  return { ok: true, reward: entry.reward };
}

/** Liste tous les codes, avec leur statut calculé (active / expired / exhausted) */
function listCodes() {
  const db = load();
  return Object.entries(db).map(([code, entry]) => ({
    code,
    ...entry,
    status: getCodeStatus(entry)
  }));
}

function deleteCode(code) {
  const db = load();
  const key = code.toUpperCase();
  if (!db[key]) return false;
  delete db[key];
  save(db);
  return true;
}

/** Purge les codes expirés ou épuisés depuis plus de X jours (nettoyage optionnel) */
function purgeOldCodes(olderThanDays = 30) {
  const db = load();
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const [code, entry] of Object.entries(db)) {
    const status = getCodeStatus(entry);
    if (status !== 'active' && entry.createdAt < cutoff) {
      delete db[code];
      removed++;
    }
  }
  save(db);
  return removed;
}

module.exports = {
  createCode,
  getCode,
  redeemCode,
  listCodes,
  deleteCode,
  purgeOldCodes,
  parseDuration,
  getCodeStatus
};
