const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getHunter, updateHunter } = require('../../lib/hunterDB');

const SKILLS = [
  'Ombre de base', 'Détection de mana', 'Pas fantôme', 'Lame d\'ombre',
  'Invocation mineure', 'Regard du monarque', 'Barrière faible', 'Extraction d\'ombre'
];

module.exports = {
  name: 'skillup',
  category: 'anime',
  description: 'Débloque une compétence cosmétique — .skillup',

  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const h = getHunter(sender);
    const owned = new Set(h.skills || []);
    const available = SKILLS.filter(s => !owned.has(s));
    if (!available.length) {
      return replyText(sock, jid, '✨ Toutes les compétences cosmétiques sont débloquées !', msg);
    }
    if ((h.xp || 0) < 50) {
      return replyText(sock, jid, 'Il te faut au moins 50 XP chasseur (`.donjon` / `.gate`).', msg);
    }
    const skill = available[Math.floor(Math.random() * available.length)];
    const skills = [...(h.skills || []), skill];
    updateHunter(sender, { skills });
    return replyText(sock, jid,
      `✨ *Skill débloqué !*\n\n「 ${skill} 」\n\nCompétences : ${skills.join(', ')}`,
      msg
    );
  }
};
