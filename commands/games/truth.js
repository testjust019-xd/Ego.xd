const { replyText } = require('../../helpers/reply');
const { createGameLink, updateGame } = require('../../helpers/gameWeb');

const QUESTIONS = [
  "Quelle est la chose la plus gênante qui te soit arrivée ?",
  "Quel est ton plus grand rêve ?",
  "As-tu déjà menti à un ami proche ? Pourquoi ?",
  "Quelle est ta plus grande peur ?",
  "Quel est le compliment qui t'a le plus touché ?"
];

module.exports = {
  name: "truth",
  category: "games",
  description: "Vérité aléatoire (Action ou Vérité)",

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    const { gameId, links } = createGameLink({
      chatJid: jid,
      type: 'truthdare',
      open: true,
      spectator: false,
      state: { mode: 'truth', text: question },
      onAction: async ({ action }) => {
        if (action !== 'reroll') return { error: 'Action inconnue.' };
        updateGame(gameId, { text: QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)] });
        return { ok: true };
      }
    });
    return replyText(sock, jid, `🤫 Vérité : ${question}\n🔗 ${links.open}`, msg);
  }
};
