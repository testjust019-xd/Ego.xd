/**
 * Système de logs centralisé EGO.XD
 * - Niveaux : fatal, error, warn, info, debug
 * - Sortie console (colorée en dev) + fichier logs/bot-YYYY-MM-DD.log
 * - Catégories : bot, cmd, web, game, security, system
 */
const fs = require('fs');
const path = require('path');
const util = require('util');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LEVELS = { fatal: 0, error: 1, warn: 2, info: 3, debug: 4, trace: 5 };
const LEVEL_NAME = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const MIN_LEVEL = LEVELS[LEVEL_NAME] ?? LEVELS.info;

const COLORS = {
  fatal: '\x1b[35m', // magenta
  error: '\x1b[31m', // red
  warn:  '\x1b[33m', // yellow
  info:  '\x1b[36m', // cyan
  debug: '\x1b[90m', // gray
  trace: '\x1b[90m',
  reset: '\x1b[0m',
  cat:   '\x1b[32m',
};

try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch (_) {}

function todayFile() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return path.join(LOG_DIR, `bot-${y}-${m}-${day}.log`);
}

function ts() {
  return new Date().toISOString();
}

function formatArg(a) {
  if (a instanceof Error) return a.stack || a.message;
  if (typeof a === 'object') {
    try { return JSON.stringify(a); } catch { return util.inspect(a, { depth: 3 }); }
  }
  return String(a);
}

function writeLine(level, category, args) {
  if ((LEVELS[level] ?? 99) > MIN_LEVEL) return;

  const msg = args.map(formatArg).join(' ');
  const line = `${ts()} [${level.toUpperCase()}] [${category}] ${msg}`;

  // Console
  const c = COLORS[level] || '';
  const r = COLORS.reset;
  const cat = COLORS.cat;
  console.log(`${c}${ts()} ${level.toUpperCase().padEnd(5)}${r} ${cat}${category}${r} ${msg}`);

  // Fichier
  try {
    fs.appendFileSync(todayFile(), line + '\n', 'utf8');
  } catch (e) {
    console.error('[logger] write failed:', e.message);
  }
}

function makeLogger(category) {
  return {
    fatal: (...a) => writeLine('fatal', category, a),
    error: (...a) => writeLine('error', category, a),
    warn:  (...a) => writeLine('warn',  category, a),
    info:  (...a) => writeLine('info',  category, a),
    debug: (...a) => writeLine('debug', category, a),
    trace: (...a) => writeLine('trace', category, a),
    child: (sub) => makeLogger(`${category}:${sub}`),
  };
}

/** Loggers prêts à l'emploi */
const logger = makeLogger('bot');
const log = {
  bot:      makeLogger('bot'),
  cmd:      makeLogger('cmd'),
  web:      makeLogger('web'),
  game:     makeLogger('game'),
  security: makeLogger('security'),
  system:   makeLogger('system'),
  /** crée un logger custom */
  cat: makeLogger,
};

/**
 * Lit les dernières lignes de log (pour commande .logs)
 * @param {number} lines
 * @param {string} [levelFilter] - error|warn|info|...
 * @param {string} [categoryFilter]
 */
function readRecentLogs(lines = 30, levelFilter = null, categoryFilter = null) {
  const file = todayFile();
  if (!fs.existsSync(file)) return [];
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  let rows = content.trim().split('\n').filter(Boolean);
  if (levelFilter) {
    const u = levelFilter.toUpperCase();
    rows = rows.filter((l) => l.includes(`[${u}]`));
  }
  if (categoryFilter) {
    rows = rows.filter((l) => l.includes(`[${categoryFilter}]`) || l.includes(`[${categoryFilter}:`));
  }
  return rows.slice(-lines);
}

/**
 * Liste les fichiers de log disponibles
 */
function listLogFiles() {
  try {
    return fs.readdirSync(LOG_DIR)
      .filter((f) => f.startsWith('bot-') && f.endsWith('.log'))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

/** Nettoie les logs plus vieux que N jours */
function purgeOldLogs(keepDays = 7) {
  const files = listLogFiles();
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const f of files) {
    const full = path.join(LOG_DIR, f);
    try {
      const st = fs.statSync(full);
      if (st.mtimeMs < cutoff) {
        fs.unlinkSync(full);
        removed++;
      }
    } catch (_) {}
  }
  return removed;
}

module.exports = {
  logger,
  log,
  makeLogger,
  readRecentLogs,
  listLogFiles,
  purgeOldLogs,
  LOG_DIR,
};
