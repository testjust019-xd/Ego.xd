const { replyText } = require('../../helpers/reply');
const { createGameLink, updateGame } = require('../../helpers/gameWeb');

const QUESTIONS = [
  "Avoir la télépathie ou pouvoir voler ?",
  "Vivre sans musique ou vivre sans films ?",
  "Toujours être en retard ou toujours être trop en avance ?",
  "Pouvoir parler toutes les langues ou jouer de tous les instruments ?",
  "Gagner 1M FCFA maintenant ou 10M dans 5 ans ?"
];

module.exports = {
  name: "wyr",
  category: "games",
  description: "Tu préfères... (Would You Rather)",

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];

    const parts = question.replace('?', '').split(/ ou /i).map(s => s.trim()).filter(Boolean);
    const options = parts.length >= 2 ? parts : ['Option A', 'Option B'];

    const { gameId, links } = createGameLink({
      chatJid: jid,
      type: 'poll',
      open: true,
      spectator: false,
      state: { question: `Tu préfères : ${question}`, options: options.map(label => ({ label, votes: 0 })) },
      onAction: async ({ action, data }) => {
        if (action !== 'vote') return { error: 'Action inconnue.' };
        const idx = parseInt(data?.value, 10);
        const view = require('../../lib/webViews').get(gameId);
        if (!view || !view.state.options[idx]) return { error: 'Option invalide.' };
        const opts = view.state.options.map((o, i) => i === idx ? { ...o, votes: (o.votes || 0) + 1 } : o);
        updateGame(gameId, { options: opts });
        return { ok: true };
      }
    });

    return replyText(sock, jid, `🤔 Tu préfères : ${question}\n🔗 Vote en direct : ${links.open}`, msg);
  }
};
