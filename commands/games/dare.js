const { replyText } = require('../../helpers/reply');
const { createGameLink, updateGame } = require('../../helpers/gameWeb');

const DARES = [
  "Envoie un emoji au hasard sans explication.",
  "Fais 10 pompes avant de répondre au prochain message.",
  "Écris ton message suivant seulement en majuscules.",
  "Complimente la 3e personne qui a parlé dans ce chat.",
  "Raconte une blague, peu importe si elle est nulle."
];

module.exports = {
  name: "dare",
  category: "games",
  description: "Action aléatoire (Action ou Vérité)",

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const dare = DARES[Math.floor(Math.random() * DARES.length)];
    const { gameId, links } = createGameLink({
      chatJid: jid,
      type: 'truthdare',
      open: true,
      spectator: false,
      state: { mode: 'dare', text: dare },
      onAction: async ({ action }) => {
        if (action !== 'reroll') return { error: 'Action inconnue.' };
        updateGame(gameId, { text: DARES[Math.floor(Math.random() * DARES.length)] });
        return { ok: true };
      }
    });
    return replyText(sock, jid, `🎯 Action : ${dare}\n🔗 ${links.open}`, msg);
  }
};
