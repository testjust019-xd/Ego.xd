const config = require('../../config');
const { replyMedia } = require('../../helpers/reply');
const { getActiveTheme } = require('../../lib/themeManager');
const { getSenderJid } = require('../../lib/senderUtils');
const { systemHeader, themeQuote } = require('../../lib/soloStyle');

module.exports = {
  name: 'owner',
  category: 'general',
  description: 'Contact du Monarque — .owner',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const theme = getActiveTheme();
    const senderJid = getSenderJid(sock, msg);
    const mentionTag = '@' + senderJid.replace(/@.*$/, '').split(':')[0];
    const number = config.ownerNumbers?.[0] || '—';
    const staff = (config.staffNumbers || []).filter(Boolean);

    let text = systemHeader({
      title: config.botName || 'EGO.XD',
      subtitle: 'MONARCH',
      mentionTag,
      theme,
      compact: true
    });
    text += `\n「 *SHADOW MONARCH* 」\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `  👑 Creator .... *${config.creator || '—'}*\n`;
    text += `  📱 Contact .... wa.me/${number}\n`;
    text += `  🌑 Theme ...... ${theme.displayName || 'Sung Jin-Woo'}\n`;
    if (staff.length) {
      text += `  🛡 Staff ...... ${staff.length} member(s)\n`;
      staff.slice(0, 5).forEach((n, i) => {
        text += `     ${i + 1}. wa.me/${n}\n`;
      });
    }
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_「 The strongest hunter stands alone. 」_`;
    text += themeQuote(theme);

    return replyMedia(sock, jid, 'owner', text, msg, {
      mentions: [senderJid]
    });
  }
};
