const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { replyText } = require('../../helpers/reply');

function isOwner(msg) {
  if (msg.key?.fromMe) return true;
  const candidates = [
    msg.key?.participantPn, msg.key?.participantAlt, msg.key?.participant,
    msg.key?.remoteJidAlt, msg.key?.remoteJid
  ];
  for (const c of candidates) {
    const d = String(c || '').split(':')[0].replace(/@.*$/, '').replace(/[^0-9]/g, '');
    if (d && (config.ownerNumbers || []).includes(d)) return true;
  }
  return false;
}

function persistPrefix(prefix) {
  // runtime
  config.prefix = prefix;
  // data/settings.json
  const settingsPath = path.join(__dirname, '..', '..', 'data', 'settings.json');
  let s = {};
  try { s = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')); } catch {}
  s.prefix = prefix;
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2));
}

module.exports = {
  name: 'setprefix',
  aliases: ['prefix'],
  category: 'general',
  description: 'Change le préfixe des commandes — owner — .setprefix <symbole>',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!isOwner(msg)) {
      return replyText(sock, jid, '🔒 Owner only.', msg);
    }
    const p = (args[0] || '').trim();
    if (!p || p.length > 3) {
      return replyText(
        sock, jid,
        `Préfixe actuel : \`${config.prefix}\`\nUsage : \`.setprefix !\` ou \`.setprefix ?\``,
        msg
      );
    }
    if (/\s/.test(p)) {
      return replyText(sock, jid, '❌ Pas d\'espace dans le préfixe.', msg);
    }
    persistPrefix(p);
    return replyText(sock, jid, `✅ Préfixe changé : \`${p}\`\nEx: \`${p}menu\` \`${p}ping\``, msg);
  }
};
