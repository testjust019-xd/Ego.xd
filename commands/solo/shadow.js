const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getHunter, updateHunter } = require('../../lib/hunterDB');

const NAMES = ['Igris', 'Beru', 'Tank', 'Iron', 'Tusk', 'Kaisel', 'Greed', 'Bellion'];

module.exports = {
  name: 'shadow',
  category: 'solo',
  description: 'Invoque une ombre aléatoire — .shadow',

  minRank: 'C',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const h = getHunter(sender);
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const power = 40 + Math.floor(Math.random() * 60);
    updateHunter(sender, { shadows: (h.shadows || 0) + 1 });
    return replyText(sock, jid,
      `👻 *Shadow Extracted*\n\n` +
      `「 ${name} 」\n` +
      `⚔️ Power : ${power}\n` +
      `📊 Ombres totales : ${(h.shadows || 0) + 1}`,
      msg
    );
  }
};
