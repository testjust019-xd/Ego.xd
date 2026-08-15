const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { replyMedia } = require('../../helpers/reply');
const { getActiveTheme } = require('../../lib/themeManager');
const { getSenderJid } = require('../../lib/senderUtils');
const {
  systemHeader,
  formatUptime,
  formatRam,
  formatPlatform,
  themeQuote
} = require('../../lib/soloStyle');

module.exports = {
  name: 'stats',
  category: 'general',
  description: 'Stats System — .stats',

  async execute(sock, msg, args, commands) {
    const jid = msg.key.remoteJid;
    const theme = getActiveTheme();
    const senderJid = getSenderJid(sock, msg);
    const mentionTag = '@' + senderJid.replace(/@.*$/, '').split(':')[0];

    let userCount = 0;
    try {
      const db = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'users.json'), 'utf-8')
      );
      userCount = Object.keys(db).length;
    } catch { /* empty */ }

    let clubCount = 0;
    try {
      const mdb = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'manager.json'), 'utf-8')
      );
      clubCount = Object.keys(mdb.clubs || {}).length;
    } catch { /* empty */ }

    const mem = process.memoryUsage();

    let text = systemHeader({
      title: config.botName || 'EGO.XD',
      subtitle: 'STATUS',
      mentionTag,
      theme,
      cmdCount: commands?.size || 0
    });

    text += `\n「 *HUNTER STATS* 」\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `  📜 Skills ........ *${commands?.size || 0}*\n`;
    text += `  👥 Hunters ....... *${userCount}*\n`;
    text += `  🏟️ Clubs ......... *${clubCount}*\n`;
    text += `  ⏱ Uptime ........ *${formatUptime(process.uptime())}*\n`;
    text += `  🧠 Mana (RSS) .... *${formatRam()}*\n`;
    text += `  📦 Heap .......... *${(mem.heapUsed / 1024 / 1024).toFixed(1)} Mo*\n`;
    text += `  🖥 Host .......... *${formatPlatform()}*\n`;
    text += `  🟢 Node .......... *${process.version}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_「 I alone level up. 」_`;
    text += themeQuote(theme);

    return replyMedia(sock, jid, 'stats', text, msg, {
      mentions: [senderJid]
    });
  }
};
