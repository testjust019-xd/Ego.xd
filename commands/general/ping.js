const config = require('../../config');
const { replyTextDecor, playSfx } = require('../../helpers/reply');
const { getActiveTheme } = require('../../lib/themeManager');
const { getSenderJid } = require('../../lib/senderUtils');
const { systemHeader, themeQuote } = require('../../lib/soloStyle');

module.exports = {
  name: 'ping',
  category: 'general',
  description: 'Latence System — .ping',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const theme = getActiveTheme();
    const senderJid = getSenderJid(sock, msg);
    const mentionTag = '@' + senderJid.replace(/@.*$/, '').split(':')[0];

    const start = Date.now();
    let n = 0;
    for (let i = 0; i < 5000; i++) n += i;
    const elapsed = Date.now() - start;

    let rank = 'E-Class';
    if (elapsed < 50) rank = 'S-Class';
    else if (elapsed < 120) rank = 'A-Class';
    else if (elapsed < 250) rank = 'B-Class';
    else if (elapsed < 400) rank = 'C-Class';
    else if (elapsed < 600) rank = 'D-Class';

    let text = systemHeader({
      title: config.botName || 'EGO.XD',
      subtitle: 'PING',
      mentionTag,
      theme,
      compact: true
    });
    text += `\n「 *CONNECTION* 」\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `  ⚡ Latency .... *${elapsed}ms*\n`;
    text += `  🏅 Rank ....... *${rank}*\n`;
    text += `  🟢 Status ..... *Online*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_「 System response confirmed. 」_`;
    text += themeQuote(theme);

    // Image ~70% + sticker animé ~45%
    await playSfx(sock, jid, 'ping', msg, 0.85);
    return replyTextDecor(
      sock, jid, text, msg, [senderJid],
      0.7,
      theme.displayName || null,
      0.45
    );
  }
};
