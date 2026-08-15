/**
 * Métadonnées des groupes premium créés par le bot
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'data', 'premiumGroups.json');
const JOBS_PATH = path.join(__dirname, '..', 'data', 'groupJobs.json');

function loadGroups() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveGroups(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function loadJobs() {
  try {
    return JSON.parse(fs.readFileSync(JOBS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveJobs(db) {
  fs.mkdirSync(path.dirname(JOBS_PATH), { recursive: true });
  fs.writeFileSync(JOBS_PATH, JSON.stringify(db, null, 2));
}

function makeCode() {
  const part = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `EGO-${part}`;
}

function createGroupRecord({
  waJid,
  name,
  ownerJid,
  source = 'creategroup',
  filters = {},
  members = [],
  pending = [],
  pinMsgKey = null
}) {
  const db = loadGroups();
  let code = makeCode();
  while (Object.values(db).some((g) => g.inviteCode === code)) code = makeCode();
  const id = `g_${crypto.randomBytes(4).toString('hex')}`;
  const rec = {
    id,
    waJid,
    name,
    ownerJid,
    source,
    inviteCode: code,
    filters,
    members: [...members],
    pending: [...pending],
    status: pending.length ? 'building' : 'open',
    pinMsgKey,
    createdAt: Date.now(),
    openedAt: pending.length ? null : Date.now()
  };
  db[id] = rec;
  saveGroups(db);
  return rec;
}

function getById(id) {
  return loadGroups()[id] || null;
}

function getByCode(code) {
  const c = String(code || '').toUpperCase().trim();
  return Object.values(loadGroups()).find((g) => g.inviteCode === c) || null;
}

function getByWaJid(waJid) {
  return Object.values(loadGroups()).find((g) => g.waJid === waJid) || null;
}

function updateGroup(id, patch) {
  const db = loadGroups();
  if (!db[id]) return null;
  db[id] = { ...db[id], ...patch };
  saveGroups(db);
  return db[id];
}

function createJob(groupId, { creatorJid, queue, intervalMs, batchSize }) {
  const jobs = loadJobs();
  const job = {
    groupId,
    creatorJid,
    queue: [...queue],
    done: [],
    failed: [],
    batchSize: batchSize || 2,
    intervalMs: intervalMs || 30 * 60 * 1000,
    nextAt: Date.now() + 60 * 1000,
    status: 'running',
    createdAt: Date.now(),
    lastProgressAt: 0
  };
  jobs[groupId] = job;
  saveJobs(jobs);
  return job;
}

function getJob(groupId) {
  return loadJobs()[groupId] || null;
}

function updateJob(groupId, patch) {
  const jobs = loadJobs();
  if (!jobs[groupId]) return null;
  jobs[groupId] = { ...jobs[groupId], ...patch };
  saveJobs(jobs);
  return jobs[groupId];
}

function listRunningJobs() {
  return Object.values(loadJobs()).filter((j) => j.status === 'running');
}

function pushEvent(id, event) {
  const db = loadGroups();
  if (!db[id]) return null;
  if (!Array.isArray(db[id].timeline)) db[id].timeline = [];
  db[id].timeline.push({ ...event, at: Date.now() });
  // garde les 200 derniers
  if (db[id].timeline.length > 200) db[id].timeline = db[id].timeline.slice(-200);
  saveGroups(db);
  return db[id];
}

module.exports = {
  loadGroups,
  createGroupRecord,
  getById,
  getByCode,
  getByWaJid,
  updateGroup,
  createJob,
  getJob,
  updateJob,
  listRunningJobs,
  loadJobs,
  saveJobs,
  pushEvent
};
