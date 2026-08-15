const config = require('../../config');
const { replyText, replyImage } = require('../../helpers/reply');
const { setActiveTheme, getActiveTheme, listThemes } = require('../../lib/themeManager');

function isOwner(msg) {
  if (msg.key && msg.key.fromMe) return true;
  const candidates = [
    msg.key?.participantPn,
    msg.key?.participantAlt,
    msg.key?.participant,
    msg.key?.remoteJidAlt,
    msg.key?.remoteJid
  ];
  for (const c of candidates) {
    const d = String(c || '').split(':')[0].replace(/@.*$/, '').replace(/[^0-9]/g, '');
    if (d && config.ownerNumbers.includes(d)) return true;
  }
  return false;
}

module.exports = {
  name: "settheme",
  category: "general",
  description: "Change le thème (tripleego/gojo/jinwoo/nagi/…) — owner — .settheme <nom>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!isOwner(msg)) {
      return replyText(sock, jid, "Seul le owner peut changer le thème.", msg);
    }

    const requested = args[0]?.toLowerCase();

    if (!requested) {
      const available = listThemes().join(', ');
      return replyText(sock, jid, `Thèmes disponibles : ${available}\nUtilise : .settheme <nom>`, msg);
    }

    const success = setActiveTheme(requested);

    if (!success) {
      const available = listThemes().join(', ');
      return replyText(sock, jid, `Thème inconnu. Thèmes disponibles : ${available}`, msg);
    }

    const theme = getActiveTheme();
    return replyImage(sock, jid, theme.banner, `✅ Thème changé : *${theme.displayName}*\n${theme.quote}`, msg);
  }
};
