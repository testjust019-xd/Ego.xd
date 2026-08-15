const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getUser, updateUser } = require('../../lib/database');
const { createGameLink } = require('../../helpers/gameWeb');

const CARS = [
  { name: 'Ferrari F8', emoji: '🏎️', speed: 92 },
  { name: 'Lamborghini Huracán', emoji: '🏎️', speed: 90 },
  { name: 'Porsche 911 GT3', emoji: '🏎️', speed: 88 },
  { name: 'McLaren 720S', emoji: '🏎️', speed: 91 },
  { name: 'Bugatti Chiron', emoji: '🏎️', speed: 95 },
  { name: 'Nissan GTR', emoji: '🚗', speed: 85 },
  { name: 'BMW M4', emoji: '🚗', speed: 83 },
  { name: 'Toyota GR86', emoji: '🚗', speed: 78 }
];

const COOLDOWN_MS = 45 * 1000;
const lastRace = new Map();

module.exports = {
  name: 'course',
  category: 'games',
  description: 'Course de voitures — .course [mise]',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const user = getUser(senderJid);

    const now = Date.now();
    if (now - (lastRace.get(senderJid) || 0) < COOLDOWN_MS) {
      const sec = Math.ceil((COOLDOWN_MS - (now - lastRace.get(senderJid))) / 1000);
      return replyText(sock, jid, `⏳ Prochaine course dans ${sec}s.`, msg);
    }

    let stake = parseInt(args[0], 10);
    if (isNaN(stake) || stake <= 0) stake = 30;
    stake = Math.min(stake, 3000);

    if ((user.balance || 0) < stake) {
      return replyText(sock, jid, `💸 Il te faut ${stake} pts (tu as ${user.balance || 0}).`, msg);
    }

    // 4 voitures en course, le joueur est assigné à une au hasard
    const field = [];
    const used = new Set();
    while (field.length < 4) {
      const c = CARS[Math.floor(Math.random() * CARS.length)];
      if (used.has(c.name)) continue;
      used.add(c.name);
      const noise = (Math.random() - 0.5) * 20;
      field.push({ ...c, score: c.speed + noise, progress: 0 });
    }
    const playerIdx = Math.floor(Math.random() * 4);
    field[playerIdx].player = true;

    // simuler 5 segments
    for (let step = 0; step < 5; step++) {
      for (const car of field) {
        car.progress += car.speed * (0.7 + Math.random() * 0.6);
      }
    }
    field.sort((a, b) => b.progress - a.progress);
    const rank = field.findIndex(c => c.player) + 1;

    const payouts = { 1: 3.2, 2: 1.6, 3: 0.7, 4: 0 };
    const mult = payouts[rank];
    const win = Math.floor(stake * mult);
    const newBal = (user.balance || 0) - stake + win;
    updateUser(senderJid, { balance: newBal });
    lastRace.set(senderJid, now);

    let text = `🏁 *COURSE DE VOITURES*\nMise : ${stake} pts\n\n`;
    field.forEach((c, i) => {
      const medal = ['🥇', '🥈', '🥉', '4️⃣'][i];
      const tag = c.player ? ' ← TOI' : '';
      text += `${medal} ${c.emoji} ${c.name}${tag}\n`;
    });
    text += `\nPosition : *${rank}e*`;
    let resultText;
    if (rank === 1) { text += ` 🏆 +${win} pts`; resultText = `1er — +${win} pts`; }
    else if (mult > 0) { text += ` → +${win} pts`; resultText = `${rank}e — +${win} pts`; }
    else { text += ` → -${stake} pts`; resultText = `${rank}e — -${stake} pts`; }
    text += `\n💰 Solde : ${newBal} pts`;

    const maxProgress = Math.max(...field.map(c => c.progress));
    const { links } = createGameLink({
      chatJid: jid,
      type: 'race',
      minRank: 'E',
      players: [{ jid: senderJid, role: 'p1' }],
      state: {
        title: 'Course de voitures',
        stake,
        win,
        resultText,
        participants: field.map(c => ({
          name: c.name, emoji: c.emoji, player: !!c.player,
          progressPct: Math.round((c.progress / maxProgress) * 100)
        }))
      }
    });
    text += `\n🔗 Voir la course animée : ${links.p1}`;

    return replyText(sock, jid, text, msg);
  }
};
