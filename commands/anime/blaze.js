const { replyText } = require('../../helpers/reply');

const ADJ = ['Shadow', 'Iron', 'Silent', 'Crimson', 'Void', 'Arcane', 'Storm', 'Night'];
const NOUN = ['Monarch', 'Hunter', 'Reaper', 'Blade', 'Warden', 'Specter', 'Knight', 'Fang'];

module.exports = {
  name: 'blaze',
  category: 'anime',
  description: 'Génère un pseudo Solo Leveling — .blaze',

  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const a = ADJ[Math.floor(Math.random() * ADJ.length)];
    const n = NOUN[Math.floor(Math.random() * NOUN.length)];
    const num = Math.floor(Math.random() * 900) + 100;
    return replyText(sock, jid, `🏷 *Blaze généré*\n\n\`${a}${n}${num}\`\n\`${a}_${n}\`\n\`x${a}${n}\``, msg);
  }
};
