const fs = require('fs');
const path = require('path');
const { getDailyLimitForRank, RANK_DAILY_DEFAULT } = require('./commandAccess');

const DB_PATH = path.join(__dirname, '..', 'data', 'dailyLimits.json');

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

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function checkAndUse(jid, commandName, rank, baseLimit = true) {
  const limit = getDailyLimitForRank(rank, baseLimit);
  if (limit < 0) return { ok: true, unlimited: true };
  if (limit === 0) return { ok: false, used: 0, limit: 0, remaining: 0 };

  const db = load();
  const day = todayKey();
  if (!db[jid]) db[jid] = {};
  if (!db[jid][day]) db[jid][day] = {};

  const used = db[jid][day][commandName] || 0;
  if (used >= limit) {
    return { ok: false, used, limit, remaining: 0 };
  }

  db[jid][day][commandName] = used + 1;

  const days = Object.keys(db[jid]).filter((k) => k !== day).sort();
  if (days.length > 2) {
    days.slice(0, -2).forEach((k) => delete db[jid][k]);
  }
  save(db);

  return { ok: true, used: used + 1, limit, remaining: limit - used - 1 };
}

function getUsage(jid, commandName) {
  const db = load();
  const day = todayKey();
  return (db[jid] && db[jid][day] && db[jid][day][commandName]) || 0;
}

function resetLimits(jid = null, commandName = null) {
  const db = load();
  const day = todayKey();
  let cleared = 0;

  if (jid) {
    if (!db[jid]) return { ok: true, cleared: 0 };
    if (commandName) {
      if (db[jid][day] && db[jid][day][commandName] !== undefined) {
        delete db[jid][day][commandName];
        cleared = 1;
      }
    } else {
      if (db[jid][day]) {
        cleared = Object.keys(db[jid][day]).length;
        delete db[jid][day];
      }
      Object.keys(db[jid] || {}).forEach((k) => {
        if (k !== day) {
          cleared += Object.keys(db[jid][k] || {}).length;
          delete db[jid][k];
        }
      });
    }
    if (db[jid] && Object.keys(db[jid]).length === 0) delete db[jid];
  } else {
    for (const uid of Object.keys(db)) {
      if (db[uid][day]) {
        cleared += Object.keys(db[uid][day]).length;
        delete db[uid][day];
      }
      if (Object.keys(db[uid]).length === 0) delete db[uid];
    }
  }

  save(db);
  return { ok: true, cleared };
}

function getTodaySummary(jid = null) {
  const db = load();
  const day = todayKey();
  if (jid) return (db[jid] && db[jid][day]) || {};
  const summary = {};
  for (const uid of Object.keys(db)) {
    if (db[uid][day]) summary[uid] = db[uid][day];
  }
  return summary;
}

module.exports = {
  RANK_DAILY: RANK_DAILY_DEFAULT,
  getDailyLimitForRank,
  checkAndUse,
  getUsage,
  todayKey,
  resetLimits,
  getTodaySummary
};
