const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const sessions = require('../../lib/gameSessions');
const { createGameLink, updateGame } = require('../../helpers/gameWeb');

const MOVES = [
  { name: 'Ombre tranchante', dmg: [15, 30], emoji: '🌑' },
  { name: 'Frappe du Monarque', dmg: [25, 45], emoji: '⚔️' },
  { name: 'Barrière de mana', dmg: [5, 15], emoji: '🛡' },
  { name: 'Appel des ombres', dmg: [20, 35], emoji: '👻' },
  { name: 'Éclair arcanique', dmg: [18, 40], emoji: '⚡' },
];

function doAttack(s, attacker) {
  const foe = attacker === 'p1' ? 'p2' : 'p1';
  const move = MOVES[Math.floor(Math.random() * MOVES.length)];
  const dmg = move.dmg[0] + Math.floor(Math.random() * (move.dmg[1] - move.dmg[0] + 1));
  s[foe + 'Hp'] = Math.max(0, s[foe + 'Hp'] - dmg);
  s.turn = foe;
  const line = `${move.emoji} ${move.name} inflige ${dmg} dégâts (${attacker === 'p1' ? 'J1' : 'J2'} → ${foe === 'p1' ? 'J1' : 'J2'})`;
  s.log = [...(s.log || []), line];
  const finished = s.p1Hp <= 0 || s.p2Hp <= 0;
  if (finished) s.winner = s.p1Hp > 0 ? 'p1' : 'p2';
  return { line, finished };
}

function pushWebState(s, names) {
  updateGame(s.gameId, {
    finished: !!s.winner,
    winnerName: s.winner ? names[s.winner] : null,
    turnRole: s.turn,
    p1: { name: names.p1, hp: s.p1Hp },
    p2: { name: names.p2, hp: s.p2Hp },
    log: s.log || []
  });
}

module.exports = {
  name: 'duel',
  category: 'games',
  description: 'Combat 1v1 Solo Leveling — .duel @user ou .duel attack',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      || msg.message?.extendedTextMessage?.contextInfo?.participant;
    const k = sessions.key(jid, 'duel');

    if (args[0] === 'attack' || args[0] === 'attaquer') {
      const s = sessions.get(k);
      if (!s) return replyText(sock, jid, 'Aucun duel en cours. Lance `.duel @user`.', msg);
      if (sender !== s.p1 && sender !== s.p2) return replyText(sock, jid, 'Tu n\'es pas dans ce duel.', msg);
      const me = sender === s.p1 ? 'p1' : 'p2';
      if (s.turn && s.turn !== me) return replyText(sock, jid, 'Pas ton tour — attends que ton adversaire joue (sur WhatsApp ou sur la page web).', msg);

      const { line, finished } = doAttack(s, me);
      sessions.set(k, s, 5 * 60 * 1000);

      const names = { p1: String(s.p1).split('@')[0], p2: String(s.p2).split('@')[0] };
      pushWebState(s, names);

      let text = `${line}\n\n❤️ J1 : ${s.p1Hp}/100\n❤️ J2 : ${s.p2Hp}/100`;
      if (finished) {
        const winner = s.winner === 'p1' ? s.p1 : s.p2;
        text += `\n\n🏆 Victoire de @${String(winner).split('@')[0]} !`;
        sessions.del(k);
        return replyText(sock, jid, text, msg);
      }
      return replyText(sock, jid, text + `\n\nTour suivant : \`.duel attack\` (ou sur la page web)`, msg);
    }

    if (!mention) {
      return replyText(sock, jid, 'Utilisation : `.duel @user` pour défier, puis `.duel attack` pour frapper.', msg);
    }

    const state = { p1: sender, p2: mention, p1Hp: 100, p2Hp: 100, turn: 'p1', log: [] };
    const names = { p1: String(sender).split('@')[0], p2: String(mention).split('@')[0] };

    const { gameId, links } = createGameLink({
      chatJid: jid,
      type: 'battle',
      minRank: 'E',
      players: [{ jid: sender, role: 'p1' }, { jid: mention, role: 'p2' }],
      state: {
        title: `Duel — ${names.p1} vs ${names.p2}`,
        finished: false,
        turnRole: 'p1',
        p1: { name: names.p1, hp: 100 },
        p2: { name: names.p2, hp: 100 },
        log: []
      },
      onAction: async ({ role, action }) => {
        const s = sessions.get(k);
        if (!s) return { error: 'Duel terminé.' };
        if (action !== 'attack') return { error: 'Action inconnue.' };
        if (s.turn !== role) return { error: "Pas ton tour." };
        doAttack(s, role);
        sessions.set(k, s, 5 * 60 * 1000);
        pushWebState(s, names);
        if (s.winner) sessions.del(k);
        return { ok: true };
      }
    });

    state.gameId = gameId;
    sessions.set(k, state, 5 * 60 * 1000);

    return replyText(sock, jid,
      `⚔️ *DUEL — System Window*\n` +
      `@${names.p1} vs @${names.p2}\n` +
      `❤️ 100 / 100\n\n` +
      `Tape \`.duel attack\` pour attaquer, ou joue en direct sur le navigateur :\n` +
      `🔗 J1 : ${links.p1}\n🔗 J2 : ${links.p2}\n👀 Spectateurs : ${links.spectator}`,
      msg
    );
  }
};
