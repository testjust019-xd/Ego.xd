const { replyTextDecor, playSfx } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getHunter, addXp } = require('../../lib/hunterDB');

module.exports = {
  name: 'arise',
  category: 'solo',
  description: 'Activation System Window — .arise',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const h = getHunter(sender);
    addXp(sender, 1);
    const text =
      `╔══════════════════════════╗\n` +
      `║  ⚙️  *[ SYSTEM ]*         ║\n` +
      `║  🌑 *ARISE*               ║\n` +
      `╠══════════════════════════╣\n` +
      `║  Hunter : @${String(sender).split('@')[0]}\n` +
      `║  Rank   : ${h.rank}\n` +
      `║  XP     : ${h.xp}\n` +
      `║  Gates  : ${h.gates || 0}\n` +
      `║  Skills : ${(h.skills || []).length}\n` +
      `╚══════════════════════════╝\n` +
      `_「 I alone level up. 」_`;
    await playSfx(sock, jid, 'arise', msg, 0.9);
    return replyTextDecor(sock, jid, text, msg, null, 0.85, 'jinwoo', 0.4);
  }
};
