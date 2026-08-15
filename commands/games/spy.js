const { replyText } = require('../../helpers/reply');
const { isSenderAdmin } = require('../../lib/groupHelpers');
const { activeGames, LOCATIONS } = require('../../lib/spyGame');
const { createGameLink, updateGame } = require('../../helpers/gameWeb');

module.exports = {
  name: "spy",
  category: "games",
  description: "Jeu Spyfall — .spy start pour lancer, .spy reveal pour révéler l'espion",

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sub = args[0]?.toLowerCase();

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, "Ce jeu ne marche que dans un groupe.", msg);
    }

    if (sub === 'start') {
      if (!(await isSenderAdmin(sock, jid, msg))) {
        return replyText(sock, jid, "Seuls les admins peuvent lancer .spy start", msg);
      }

      const meta = await sock.groupMetadata(jid);
      const players = meta.participants
        .map(p => p.id)
        .filter(id => !id.includes('status')); // sécurité basique

      if (players.length < 3) {
        return replyText(sock, jid, "Il faut au moins 3 membres dans le groupe pour jouer.", msg);
      }

      const spyJid = players[Math.floor(Math.random() * players.length)];
      const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];

      // Une seule partie web, mais chaque joueur voit un state différent
      // (filterState) : l'espion ne voit jamais le lieu tant que non révélé.
      const { gameId, links } = createGameLink({
      chatJid: jid,
        type: 'spy',
        minRank: 'E',
        players: players.map(p => ({ jid: p, role: p })), // 1 rôle = 1 jid ici
        spectator: false,
        state: { spyJid, location, revealed: false, spyName: spyJid.split('@')[0] },
        filterState: (state, { jid }) => ({
          isSpy: jid === state.spyJid,
          location: (jid === state.spyJid && !state.revealed) ? null : state.location,
          revealed: state.revealed,
          spyName: state.revealed ? state.spyName : null
        })
      });

      activeGames.set(jid, { spyJid, location, players, gameId });

      // Envoie le rôle en privé à chaque joueur, avec son lien perso
      for (const playerJid of players) {
        try {
          const link = links[playerJid];
          if (playerJid === spyJid) {
            await sock.sendMessage(playerJid, { text: `🕵️ Tu es *L'ESPION* ! Découvre le lieu en posant des questions sans te faire griller.\n🔗 Suis la partie en direct : ${link}` });
          } else {
            await sock.sendMessage(playerJid, { text: `📍 Le lieu est : *${location}*\nUn espion se cache parmi vous, démasque-le !\n🔗 Suis la partie en direct : ${link}` });
          }
        } catch (err) {
          console.error(`[spy] impossible de DM ${playerJid}:`, err.message);
        }
      }

      return replyText(sock, jid, "🎮 Partie de Spyfall lancée ! Chacun a reçu son rôle et un lien de suivi en privé.\nPosez des questions sur le lieu pour démasquer l'espion.\nQuand vous êtes prêts : .spy reveal", msg);
    }

    if (sub === 'reveal') {
      const game = activeGames.get(jid);
      if (!game) {
        return replyText(sock, jid, "Aucune partie en cours. Lance .spy start", msg);
      }

      const spyNumber = game.spyJid.split('@')[0];
      if (game.gameId) updateGame(game.gameId, { revealed: true });
      activeGames.delete(jid);

      return replyText(sock, jid, `🎭 L'espion était : *${spyNumber}*\n📍 Le lieu était : *${game.location}*`, msg);
    }

    return replyText(sock, jid, "Utilise : .spy start (admin) ou .spy reveal", msg);
  }
};
