const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const sessions = require('../../lib/gameSessions');
const { createGameLink, updateGame } = require('../../helpers/gameWeb');

const RIDDLES = [
  { q: 'Plus je sèche, plus je deviens mouillée. Qui suis-je ?', a: 'serviette' },
  { q: 'Je suis grand quand je suis jeune, petit quand je suis vieux. Qui suis-je ?', a: 'bougie' },
  { q: 'J\'ai des villes mais pas de maisons, des forêts mais pas d\'arbres, de l\'eau mais pas de poisson.', a: 'carte' },
  { q: 'Qu\'est-ce qui a un lit mais ne dort jamais ?', a: 'riviere' },
  { q: 'On me jette quand on en a besoin, on me récupère quand on n\'en a plus besoin.', a: 'ancre' },
];

module.exports = {
  name: 'riddle',
  category: 'games',
  description: 'Énigme — .riddle [reponse]',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const k = sessions.key(jid, 'riddle');
    let s = sessions.get(k);
    const guess = args.join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (!s || args[0] === 'new') {
      const r = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
      const { gameId, links } = createGameLink({
      chatJid: jid,
        type: 'answer',
        minRank: 'E',
        players: [{ jid: sender, role: 'p1' }],
        state: { title: 'Énigme', question: r.q, finished: false },
        onAction: async ({ action, data }) => {
          if (action !== 'answer') return { error: 'Action inconnue.' };
          const cur = sessions.get(k);
          if (!cur) return { error: 'Partie terminée.' };
          const g = String(data?.value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const ans = cur.a.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const correct = g.includes(ans) || ans.includes(g);
          if (correct) {
            updateGame(cur.gameId, { finished: true, correct: true });
            sessions.del(k);
          }
          return correct ? { ok: true } : { error: 'Mauvaise réponse, réessaie.' };
        }
      });
      r.gameId = gameId;
      sessions.set(k, r, 10 * 60 * 1000);
      return replyText(sock, jid, `❓ *Énigme*\n\n${r.q}\n\n\`.riddle <reponse>\`\n🔗 Réponds aussi sur le navigateur : ${links.p1}`, msg);
    }
    if (!guess) return replyText(sock, jid, `❓ ${s.q}`, msg);
    const ans = s.a.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (guess.includes(ans) || ans.includes(guess)) {
      updateGame(s.gameId, { finished: true, correct: true });
      sessions.del(k);
      return replyText(sock, jid, `✅ Bravo ! Réponse : *${s.a}*`, msg);
    }
    return replyText(sock, jid, `❌ Non… Réessaie ou \`.riddle new\``, msg);
  }
};
