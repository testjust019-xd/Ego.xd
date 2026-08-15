/**
 * Anti-sleep Render (plan Free)
 * Ping interne de /health toutes les N minutes.
 */
const config = require('../config');

const INTERVAL_MS = Math.max(
  2 * 60 * 1000,
  parseInt(process.env.KEEPALIVE_MS || String(5 * 60 * 1000), 10) || 5 * 60 * 1000
);

function publicBase() {
  return (process.env.PUBLIC_URL || config.publicUrl || '').replace(/\/$/, '');
}

async function pingOnce(base) {
  const url = `${base}/health`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'EGO.XD-KeepAlive/1' } });
    clearTimeout(t);
    if (!res.ok) console.warn(`[keepalive] ${res.status} ${url}`);
    else console.log(`[keepalive] ok · ${url}`);
  } catch (err) {
    console.warn(`[keepalive] fail: ${err.message}`);
  }
}

function startKeepAlive() {
  const base = publicBase();
  if (!base) {
    console.log('[keepalive] PUBLIC_URL non défini → ping interne désactivé');
    console.log('[keepalive] Mets PUBLIC_URL=https://ton-service.onrender.com');
    console.log('[keepalive] + UptimeRobot gratuit sur /health toutes les 5 min');
    return;
  }
  if (process.env.KEEPALIVE === '0' || process.env.KEEPALIVE === 'false') {
    console.log('[keepalive] désactivé (KEEPALIVE=0)');
    return;
  }
  console.log(`[keepalive] actif · ping ${base}/health toutes les ${Math.round(INTERVAL_MS / 60000)} min`);
  console.log('[keepalive] Complément : https://uptimerobot.com → ' + base + '/health → 5 min');
  setTimeout(() => pingOnce(base), 60_000);
  setInterval(() => pingOnce(base), INTERVAL_MS);
}

module.exports = { startKeepAlive, pingOnce };
