const { replyText } = require('../../helpers/reply');
const { getLeaderboard } = require('../../lib/database');
const { getHunter, RANKS } = require('../../lib/hunterDB');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'top',
  category: 'social',
  description: 'Mini classement fun — .top <argent|xp|hunter>',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const cat = (args[0] || 'argent').toLowerCase();

    if (cat === 'argent' || cat === 'money' || cat === 'balance') {
      const top = getLeaderboard(10);
      let text = `🏆 *Top argent*\n\n`;
      top.forEach((u, i) => {
        text += `${i + 1}. @${String(u.jid).split('@')[0]} — ${u.balance || 0}\n`;
      });
      return replyText(sock, jid, text || 'Vide.', msg);
    }

    if (cat === 'hunter' || cat === 'xp') {
      let db = {};
      try { db = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/hunters.json'), 'utf-8')); } catch {}
      const list = Object.entries(db)
        .map(([jid, d]) => ({ jid, ...d }))
        .sort((a, b) => (b.xp || 0) - (a.xp || 0))
        .slice(0, 10);
      let text = `🌑 *Top chasseurs*\n\n`;
      list.forEach((u, i) => {
        text += `${i + 1}. @${String(u.jid).split('@')[0]} — ${u.rank || 'E'} (${u.xp || 0} XP)\n`;
      });
      return replyText(sock, jid, text || 'Aucun chasseur encore.', msg);
    }

    return replyText(sock, jid, 'Catégories : `.top argent` · `.top hunter`', msg);
  }
};
