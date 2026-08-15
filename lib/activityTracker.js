// Tracker d'activité de groupe — sert à .gmomentum
// Compte les messages reçus dans chaque groupe, agrégés par heure / jour / mois,
// pour pouvoir tracer un mini-graphique de l'intensité du groupe.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'activity.json');

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveDB(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db));
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function hourKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}`;
}
function dayKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function monthKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function pruneOld(g, now) {
  const cutoffHour = now.getTime() - 3 * 24 * 60 * 60 * 1000; // 3 jours d'historique horaire
  for (const k of Object.keys(g.hourly)) {
    const [y, m, d, h] = k.split('-').map(Number);
    if (new Date(y, m - 1, d, h).getTime() < cutoffHour) delete g.hourly[k];
  }
  const cutoffDay = now.getTime() - 400 * 24 * 60 * 60 * 1000; // ~13 mois
  for (const k of Object.keys(g.daily)) {
    const [y, m, d] = k.split('-').map(Number);
    if (new Date(y, m - 1, d).getTime() < cutoffDay) delete g.daily[k];
  }
  const cutoffMonth = now.getTime() - 25 * 30 * 24 * 60 * 60 * 1000; // ~25 mois
  for (const k of Object.keys(g.monthly)) {
    const [y, m] = k.split('-').map(Number);
    if (new Date(y, m - 1, 1).getTime() < cutoffMonth) delete g.monthly[k];
  }
}

/** À appeler pour CHAQUE message reçu dans un groupe (texte ou média). */
function recordActivity(jid) {
  const db = loadDB();
  if (!db[jid]) db[jid] = { hourly: {}, daily: {}, monthly: {} };
  const g = db[jid];
  const now = new Date();

  const hk = hourKey(now);
  const dk = dayKey(now);
  const mk = monthKey(now);

  g.hourly[hk] = (g.hourly[hk] || 0) + 1;
  g.daily[dk] = (g.daily[dk] || 0) + 1;
  g.monthly[mk] = (g.monthly[mk] || 0) + 1;

  // Nettoyage léger occasionnel pour ne pas faire grossir le fichier indéfiniment
  if (Math.random() < 0.02) pruneOld(g, now);

  saveDB(db);
}

function getGroupActivity(jid) {
  const db = loadDB();
  return db[jid] || { hourly: {}, daily: {}, monthly: {} };
}

module.exports = { recordActivity, getGroupActivity, hourKey, dayKey, monthKey };
