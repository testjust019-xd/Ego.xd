/**
 * Annuaire inter-session des personnes (pool pour .getgroup / .creategroup)
 */
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'people.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function save(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function normalizeJid(jid) {
  if (!jid) return '';
  const s = String(jid);
  if (s.endsWith('@g.us')) return s;
  const digits = s.split(':')[0].replace(/@.*$/, '').replace(/\D/g, '');
  if (!digits) return s;
  return `${digits}@s.whatsapp.net`;
}

function ensure(jid, extras = {}) {
  const id = normalizeJid(jid);
  if (!id || id.endsWith('@g.us')) return null;
  const db = load();
  if (!db[id]) {
    db[id] = {
      jid: id,
      pseudo: extras.pseudo || id.split('@')[0],
      tags: [],
      optIn: false,
      lastSeen: Date.now(),
      sessions: [],
      groups: [],
      notes: '',
      createdAt: Date.now()
    };
  }
  if (extras.pseudo) db[id].pseudo = extras.pseudo;
  if (extras.session && !db[id].sessions.includes(extras.session)) {
    db[id].sessions.push(extras.session);
  }
  db[id].lastSeen = Date.now();
  save(db);
  return db[id];
}

function get(jid) {
  const id = normalizeJid(jid);
  const db = load();
  return db[id] || null;
}

function update(jid, patch) {
  const id = normalizeJid(jid);
  const db = load();
  if (!db[id]) ensure(id);
  const fresh = load();
  fresh[id] = { ...fresh[id], ...patch, jid: id };
  save(fresh);
  return fresh[id];
}

function setOptIn(jid, value) {
  return update(jid, { optIn: !!value });
}

function setTags(jid, tags) {
  const clean = [...new Set(
    (tags || [])
      .map((t) => String(t).toLowerCase().trim().replace(/[^a-z0-9_-]/g, ''))
      .filter(Boolean)
      .slice(0, 12)
  )];
  return update(jid, { tags: clean });
}

function addGroup(jid, groupId) {
  const p = ensure(jid);
  if (!p) return null;
  const groups = Array.isArray(p.groups) ? p.groups : [];
  if (!groups.includes(groupId)) groups.push(groupId);
  return update(jid, { groups });
}

/**
 * Pool dispo pour .getgroup
 * filters: { tag?, minRank?, excludeJids?: string[] }
 */
function queryPool(filters = {}) {
  const { getUserRank, meetsRank } = require('./rankGate');
  const db = load();
  const exclude = new Set((filters.excludeJids || []).map(normalizeJid));
  const tag = filters.tag ? String(filters.tag).toLowerCase() : null;
  const minRank = filters.minRank || null;

  const list = [];
  for (const p of Object.values(db)) {
    if (!p?.optIn) continue;
    if (!p.jid || exclude.has(p.jid)) continue;
    if (tag && !(p.tags || []).includes(tag)) continue;
    if (minRank) {
      try {
        const rank = getUserRank(p.jid);
        if (!meetsRank(rank, minRank)) continue;
      } catch {
        continue;
      }
    }
    list.push(p);
  }
  return list;
}

function poolStats() {
  const db = load();
  const all = Object.values(db);
  const optIn = all.filter((p) => p.optIn);
  const tags = {};
  for (const p of optIn) {
    for (const t of p.tags || []) tags[t] = (tags[t] || 0) + 1;
  }
  return { total: all.length, optIn: optIn.length, tags };
}

function touchFromMessage(jid, sessionName = 'main') {
  return ensure(jid, { session: sessionName });
}

module.exports = {
  load,
  ensure,
  get,
  update,
  setOptIn,
  setTags,
  addGroup,
  queryPool,
  poolStats,
  normalizeJid,
  touchFromMessage
};
