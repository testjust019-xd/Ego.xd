const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getUser, updateUser } = require('../../lib/database');
const { createGameLink } = require('../../helpers/gameWeb');

const TICKET_COST = 50;
const COOLDOWN_MS = 30 * 1000; // 30s entre deux tirages
const lastPlay = new Map();

// Multiplicateurs possibles (poids)
const PRIZES = [
  { mult: 0, weight: 45, label: 'Perdu' },
  { mult: 1, weight: 25, label: 'Remboursé' },
  { mult: 2, weight: 15, label: 'x2' },
  { mult: 3, weight: 8, label: 'x3' },
  { mult: 5, weight: 4, label: 'x5' },
  { mult: 10, weight: 2, label: 'x10' },
  { mult: 25, weight: 0.8, label: 'x25 🔥' },
  { mult: 100, weight: 0.2, label: 'JACKPOT x100 💎' }
];

function rollPrize() {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of PRIZES) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return PRIZES[0];
}

module.exports = {
  name: 'loterie',
  category: 'games',
  description: 'Loterie avec tes points — .loterie [mise]',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const user = getUser(senderJid);

    const now = Date.now();
    if (now - (lastPlay.get(senderJid) || 0) < COOLDOWN_MS) {
      const sec = Math.ceil((COOLDOWN_MS - (now - lastPlay.get(senderJid))) / 1000);
      return replyText(sock, jid, `⏳ Attends ${sec}s avant un nouveau ticket.`, msg);
    }

    let stake = parseInt(args[0], 10);
    if (isNaN(stake) || stake <= 0) stake = TICKET_COST;
    stake = Math.min(stake, 5000); // plafond anti-abus

    if ((user.balance || 0) < stake) {
      return replyText(sock, jid,
        `💸 Pas assez de points. Ticket min ${TICKET_COST}, tu as ${user.balance || 0}.\n` +
        `Gagne des points avec .daily / .work.`,
        msg
      );
    }

    const prize = rollPrize();
    const win = Math.floor(stake * prize.mult);
    const net = win - stake;
    const newBal = (user.balance || 0) - stake + win;

    updateUser(senderJid, { balance: newBal });
    lastPlay.set(senderJid, now);

    // animation textuelle
    const balls = Array.from({ length: 5 }, () => Math.floor(Math.random() * 49) + 1);
    let text = `🎟️ *LOTERIE*\n`;
    text += `Mise : ${stake} pts\n`;
    text += `Tirage : ${balls.map(n => `〔${String(n).padStart(2, '0')}〕`).join(' ')}\n\n`;

    if (prize.mult === 0) {
      text += `😢 *Perdu...* -${stake} pts\n`;
    } else if (prize.mult === 1) {
      text += `😐 *Remboursé* (±0)\n`;
    } else {
      text += `🎉 *${prize.label}* → +${win} pts (net ${net >= 0 ? '+' : ''}${net})\n`;
    }
    text += `💰 Solde : ${newBal} pts`;

    const { links } = createGameLink({
      chatJid: jid,
      type: 'loot',
      minRank: 'E',
      players: [{ jid: senderJid, role: 'p1' }],
      state: {
        title: 'Loterie',
        items: balls.map(n => `〔${String(n).padStart(2, '0')}〕`),
        resultText: prize.mult === 0 ? `Perdu — -${stake} pts` : `${prize.label} — net ${net >= 0 ? '+' : ''}${net} pts`
      }
    });
    text += `\n🔗 Voir le tirage : ${links.p1}`;

    return replyText(sock, jid, text, msg);
  }
};
