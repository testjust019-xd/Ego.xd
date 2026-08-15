const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'gameHistory.json');
const MAX = 500;

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; }
}
function save(arr) {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(arr.slice(-MAX), null, 0));
  } catch (_) {}
}

function push(entry) {
  const arr = load();
  arr.push({
    ts: Date.now(),
    type: entry.type,
    jid: entry.jid || null,
    players: entry.players || [],
    summary: entry.summary || '',
    meta: entry.meta || {},
  });
  save(arr);
  return arr[arr.length - 1];
}

function recent(n = 20, filter = {}) {
  let arr = load().slice().reverse();
  if (filter.type) arr = arr.filter((e) => e.type === filter.type);
  if (filter.jid) arr = arr.filter((e) => e.jid === filter.jid || (e.players || []).includes(filter.jid));
  return arr.slice(0, n);
}

function stats() {
  const arr = load();
  const byType = {};
  for (const e of arr) byType[e.type] = (byType[e.type] || 0) + 1;
  return { total: arr.length, byType };
}

module.exports = { push, recent, stats, load };
