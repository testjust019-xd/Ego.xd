const { replyTextDecor, playSfx } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getHunter } = require('../../lib/hunterDB');

module.exports = {
  name: 'hunter',
  category: 'solo',
  description: 'Profil chasseur Solo Leveling — .hunter',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const h = getHunter(sender);
    let text = `🌑 *Hunter Profile*\n\n`;
    text += `Rang : *${h.rank}*\nXP : ${h.xp}\n`;
    text += `Gates clear : ${h.gates || 0}\n`;
    text += `Ombres : ${h.shadows || 0}\n`;
    text += `Skills : ${(h.skills || []).join(', ') || 'aucune'}\n`;
    text += `\n_.donjon · .gate · .skillup · .evolution_`;
    await playSfx(sock, jid, 'success', msg, 0.7);
    return replyTextDecor(sock, jid, text, msg, null, 0.7, 'jinwoo', 0.35);
  }
};
