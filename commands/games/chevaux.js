const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getUser, updateUser } = require('../../lib/database');
const { createGameLink } = require('../../helpers/gameWeb');

const HORSES = [
  { name: 'Éclair Noir', odds: 2.1 },
  { name: 'Tempête d\'Or', odds: 3.4 },
  { name: 'Prince du Sahel', odds: 4.8 },
  { name: 'Vent du Sud', odds: 6.5 },
  { name: 'Comète Rouge', odds: 8.0 },
  { name: 'Roi de Bassam', odds: 12.0 }
];

const COOLDOWN_MS = 40 * 1000;
const lastBet = new Map();

module.exports = {
  name: 'chevaux',
  category: 'games',
  description: 'Course de chevaux — .chevaux pour voir, .chevaux <n°> <mise> pour parier',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);

    if (!args.length) {
      let text = '🐴 *HIPPODROME*\nChoisis ton cheval et mise :\n`.chevaux <n°> <mise>`\n\n';
      HORSES.forEach((h, i) => {
        text += `${i + 1}. *${h.name}* — cote ${h.odds.toFixed(1)}\n`;
      });
      return replyText(sock, jid, text, msg);
    }

    const now = Date.now();
    if (now - (lastBet.get(senderJid) || 0) < COOLDOWN_MS) {
      const sec = Math.ceil((COOLDOWN_MS - (now - lastBet.get(senderJid))) / 1000);
      return replyText(sock, jid, `⏳ Prochaine course dans ${sec}s.`, msg);
    }

    const idx = parseInt(args[0], 10) - 1;
    let stake = parseInt(args[1], 10);
    if (isNaN(idx) || idx < 0 || idx >= HORSES.length || isNaN(stake) || stake <= 0) {
      return replyText(sock, jid, 'Utilisation : .chevaux <n° cheval> <mise>\nEx: .chevaux 2 100', msg);
    }
    stake = Math.min(stake, 5000);

    const user = getUser(senderJid);
    if ((user.balance || 0) < stake) {
      return replyText(sock, jid, `💸 Solde insuffisant (${user.balance || 0} pts).`, msg);
    }

    // probabilité inversement proportionnelle à la cote, avec bruit
    const weights = HORSES.map(h => (1 / h.odds) * (0.7 + Math.random() * 0.6));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let winnerIdx = 0;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) { winnerIdx = i; break; }
    }

    const won = winnerIdx === idx;
    const winAmount = won ? Math.floor(stake * HORSES[idx].odds) : 0;
    const newBal = (user.balance || 0) - stake + winAmount;
    updateUser(senderJid, { balance: newBal });
    lastBet.set(senderJid, now);

    // ordre d'arrivée approximatif
    const order = HORSES.map((h, i) => ({ i, h, score: weights[i] + Math.random() * 0.3 }));
    order.sort((a, b) => b.score - a.score);

    let text = `🐴 *COURSE HIPPIQUE*\n`;
    text += `Ton cheval : *${HORSES[idx].name}* (mise ${stake})\n\n*Arrivée :*\n`;
    order.forEach((o, pos) => {
      const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣'][pos];
      const mark = o.i === idx ? ' ← ton pari' : '';
      text += `${medal} ${o.h.name}${mark}\n`;
    });

    if (won) {
      text += `\n🎉 *Gagné !* +${winAmount} pts (cote ${HORSES[idx].odds})`;
    } else {
      text += `\n😢 Perdu... -${stake} pts\nVainqueur : *${HORSES[winnerIdx].name}*`;
    }
    text += `\n💰 Solde : ${newBal} pts`;

    const maxScore = Math.max(...order.map(o => o.score));
    const { links } = createGameLink({
      chatJid: jid,
      type: 'race',
      minRank: 'E',
      players: [{ jid: senderJid, role: 'p1' }],
      state: {
        title: 'Course hippique',
        stake,
        win: winAmount,
        resultText: won ? `Gagné — +${winAmount} pts` : `Perdu — -${stake} pts`,
        participants: order.map(o => ({
          name: o.h.name, emoji: '🐴', player: o.i === idx,
          progressPct: Math.round((o.score / maxScore) * 100)
        }))
      }
    });
    text += `\n🔗 Voir la course animée : ${links.p1}`;

    return replyText(sock, jid, text, msg);
  }
};
