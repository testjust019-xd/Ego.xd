const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { createGameLink, updateGame } = require('../../helpers/gameWeb');

// Stocke la partie en cours par groupe/chat (en mémoire, se réinitialise au redémarrage)
const activeGames = new Map();

module.exports = {
  name: "guess",
  category: "games",
  description: "Devine le nombre (1-100) — .guess start pour commencer, puis .guess <nombre>",

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const input = args[0]?.toLowerCase();

    if (input === "start") {
      const secret = Math.floor(Math.random() * 100) + 1;
      const { gameId, links } = createGameLink({
      chatJid: jid,
        type: 'numberguess',
        minRank: 'E',
        players: [{ jid: sender, role: 'p1' }],
        state: { tries: 0, hint: null, finished: false },
        onAction: async ({ action, data }) => {
          if (action !== 'guess') return { error: 'Action inconnue.' };
          const g = activeGames.get(jid);
          if (!g) return { error: 'Partie terminée.' };
          const n = parseInt(data?.value, 10);
          if (isNaN(n)) return { error: 'Nombre invalide.' };
          g.tries++;
          if (n === g.secret) {
            updateGame(g.gameId, { finished: true, target: n, tries: g.tries });
            activeGames.delete(jid);
          } else {
            updateGame(g.gameId, { tries: g.tries, hint: n < g.secret ? 'Plus grand 📈' : 'Plus petit 📉' });
          }
          return { ok: true };
        }
      });
      activeGames.set(jid, { secret, gameId, tries: 0 });
      return replyText(sock, jid, `🎯 J'ai choisi un nombre entre 1 et 100. Devine avec .guess <nombre>\n🔗 Joue sur le navigateur : ${links.p1}`, msg);
    }

    const g = activeGames.get(jid);
    if (!g) {
      return replyText(sock, jid, "Aucune partie en cours. Lance .guess start", msg);
    }

    const guess = parseInt(input, 10);
    if (isNaN(guess)) {
      return replyText(sock, jid, "Envoie un nombre valide, ex: .guess 42", msg);
    }

    g.tries++;
    if (guess === g.secret) {
      updateGame(g.gameId, { finished: true, target: guess, tries: g.tries });
      activeGames.delete(jid);
      return replyText(sock, jid, `🎉 Bravo ! C'était bien *${g.secret}*.`, msg);
    }

    const hint = guess < g.secret ? "plus grand 📈" : "plus petit 📉";
    updateGame(g.gameId, { tries: g.tries, hint: guess < g.secret ? 'Plus grand 📈' : 'Plus petit 📉' });
    return replyText(sock, jid, `Raté ! Le nombre est ${hint}.`, msg);
  }
};
