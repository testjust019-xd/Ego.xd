/**
 * Triple Ego UI — Gojo × Sung Jin-Woo × Nagi
 * Style sombre / monarque, WhatsApp-safe
 */
const config = require('../config');
let isPrivateOn = () => false;
try {
  isPrivateOn = require('./privateMode').isPrivateOn;
} catch (_) {}

function formatUptime(seconds) {
  const s = Math.floor(seconds || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function formatRam() {
  const mb = process.memoryUsage().rss / (1024 * 1024);
  return mb >= 100 ? `${Math.round(mb)} Mo` : `${mb.toFixed(1)} Mo`;
}

function formatPlatform() {
  const p = process.platform;
  if (p === 'android') return 'Termux';
  if (p === 'linux') return 'Linux';
  if (p === 'win32') return 'Windows';
  if (p === 'darwin') return 'macOS';
  return p;
}

function row(label, value) {
  return `│  ${label.padEnd(10)} ▸ *${value}*`;
}

/**
 * En-tête cinématique Triple Ego
 */
function systemHeader(o = {}) {
  const name = config.botName || 'EGO.XD';
  const version = config.version || '3.6';
  const creator = config.creator || '—';
  const themeName = o.theme?.displayName || 'Triple Ego';
  const title = o.title || name;
  const sub = o.subtitle ? ` · ${o.subtitle}` : '';

  let t = '';
  t += `╔══════════════════════════╗\n`;
  t += `║   ⚔️  *T R I P L E  E G O*  ║\n`;
  t += `║      ᴅ ᴏ ᴍ ᴀ ɪ ɴ   ᴏ ɴ ʟ ɪ ɴ ᴇ   ║\n`;
  t += `╠══════════════════════════╣\n`;
  t += `║  🌑 *${title}*${sub}\n`;
  t += `║  v${version}  ·  ${creator}\n`;
  t += `╠──────────────────────────╣\n`;
  if (o.mentionTag) t += row('Hunter', o.mentionTag) + '\n';
  t += row('Rank', 'MONARCH') + '\n';
  t += row('Focus', themeName) + '\n';
  t += row('Prefix', config.prefix || '.') + '\n';
  const priv = typeof o.privateMode === 'boolean' ? o.privateMode : isPrivateOn();
  t += row('Mode', priv ? 'PRIVATE 🔒' : 'PUBLIC 🌐') + '\n';
  if (o.cmdCount != null) t += row('Skills', String(o.cmdCount)) + '\n';
  if (!o.compact) {
    t += row('Shadow', formatRam()) + '\n';
    t += row('Uptime', formatUptime(process.uptime())) + '\n';
    t += row('Core', process.version.replace('v', '')) + '\n';
    t += row('Field', formatPlatform()) + '\n';
  }
  t += `╚══════════════════════════╝\n`;
  return t;
}

function sectionTitle(label) {
  return (
    `\n┏━┫ *${label}* ┣━━━━━━┓\n`
  );
}

function sectionEnd() {
  return `┗━━━━━━━━━━━━━━━━━━━━┛\n`;
}

function catLine(emoji, label, key, count) {
  const n = String(count).padStart(2, '0');
  return `┃ ${emoji}  *${label}*\n┃     └ \`${key}\`  ·  *${n}* skills\n`;
}

function themeQuote(theme) {
  if (!theme?.quote) {
    return `\n_「 Arise. The domain is yours. 」_\n`;
  }
  return `\n_${theme.quote}_\n`;
}

function domainBanner(title, body) {
  return (
    `╔═ *${title}* ═══════════╗\n` +
    `${body}\n` +
    `╚══════════════════════╝`
  );
}

/** Ligne skill pour menu catégorie */
function skillLine(prefix, name, desc) {
  let line = `┃  ⚡ \`${prefix}${name}\``;
  if (desc) line += `\n┃     ${desc}`;
  return line + '\n';
}

module.exports = {
  formatUptime,
  formatRam,
  formatPlatform,
  row,
  systemHeader,
  sectionTitle,
  sectionEnd,
  catLine,
  themeQuote,
  domainBanner,
  skillLine
};
