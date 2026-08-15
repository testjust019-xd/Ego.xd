const { replyText } = require('../../helpers/reply');
const { createGameLink, updateGame } = require('../../helpers/gameWeb');

module.exports = {
  name: 'sondage',
  category: 'games',
  description: 'Crée un sondage texte — .sondage Question | opt1 | opt2 | …',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const raw = args.join(' ').trim();
    if (!raw || !raw.includes('|')) {
      return replyText(sock, jid,
        '📊 *Sondage*\n\n' +
        '`.sondage Qui gagne ? | ASEC | Africa | Match nul`\n\n' +
        '_Les membres réagissent avec 1️⃣ 2️⃣ 3️⃣…_',
        msg
      );
    }

    const parts = raw.split('|').map(s => s.trim()).filter(Boolean);
    if (parts.length < 3) {
      return replyText(sock, jid, 'Il faut une question + au moins 2 options (séparées par |).', msg);
    }

    const question = parts[0];
    const options = parts.slice(1).slice(0, 9);
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

    let text = `📊 *SONDAGE*\n\n*${question}*\n\n`;
    options.forEach((opt, i) => {
      text += `${emojis[i]} ${opt}\n`;
    });
    text += `\n_Réagis avec le numéro de ton choix !_`;

    const { gameId, links } = createGameLink({
      chatJid: jid,
      type: 'poll',
      open: true,
      spectator: false,
      state: { question, options: options.map(label => ({ label, votes: 0 })) },
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
    text += `\n🔗 Voter en direct sur le navigateur : ${links.open}`;

    return replyText(sock, jid, text, msg);
  }
};
