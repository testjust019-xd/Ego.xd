const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const gameHistory = require('../../lib/gameHistory');

module.exports = {
  name: 'historique',
  aliases: ['history', 'hist'],
  category: 'utility',
  description: 'Historique des parties — .historique [n]',
  minRank: 'E',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const n = Math.min(30, parseInt(args[0], 10) || 10);
    const rows = gameHistory.recent(n, { jid: sender });
    const global = !rows.length ? gameHistory.recent(n) : rows;
    if (!global.length) return replyText(sock, jid, 'Aucune partie enregistrée.', msg);
    let text = `📜 *Historique* (${global.length})\n\n`;
    for (const e of global) {
      const t = new Date(e.ts).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
      text += `• ${t} *${e.type}* — ${e.summary}\n`;
    }
    const st = gameHistory.stats();
    text += `\n_Total bot : ${st.total} parties_`;
    return replyText(sock, jid, text, msg);
  }
};
