const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'data', 'reminders.json');

function load() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); } catch { return []; }
}
function save(list) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(list, null, 2));
}

function parseDuration(str) {
  const m = String(str).trim().match(/^(\d+)\s*(s|sec|secs|m|min|mins|h|hr|hrs|d|day|days)?$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const u = (m[2] || 'm').toLowerCase();
  if (u.startsWith('s')) return n * 1000;
  if (u.startsWith('h')) return n * 3600 * 1000;
  if (u.startsWith('d')) return n * 86400 * 1000;
  return n * 60 * 1000; // minutes default
}

function addReminder(jid, senderJid, message, ms) {
  const list = load();
  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    jid, senderJid, message,
    fireAt: Date.now() + ms
  };
  list.push(item);
  save(list);
  return item;
}

function dueReminders() {
  const list = load();
  const now = Date.now();
  const due = list.filter(r => r.fireAt <= now);
  const rest = list.filter(r => r.fireAt > now);
  save(rest);
  return due;
}

/** Démarre le poller (à appeler une fois depuis index si possible) */
function startReminderPoller(sendFn) {
  setInterval(async () => {
    const due = dueReminders();
    for (const r of due) {
      try {
        await sendFn(r.jid, `⏰ *Rappel*\n${r.message}`);
      } catch (e) {
        console.error('[remind]', e.message);
      }
    }
  }, 15000);
}

module.exports = { parseDuration, addReminder, dueReminders, startReminderPoller };
