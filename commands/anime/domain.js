const { replyTextDecor, playSfx } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');

const DOMAINS = [
  { name: 'Unlimited Void', user: 'Gojo Satoru', effect: 'Information overload. Target stunned.' },
  { name: 'Malevolent Shrine', user: 'Sukuna', effect: 'Dismantle & Cleave — sure-hit.' },
  { name: 'Shadow Domain', user: 'Sung Jin-Woo', effect: 'Army of shadows fills the field.' },
  { name: 'Egoist Zone', user: 'Isagi Yoichi', effect: 'Vision locked. Goal formula active.' },
  { name: 'Lazy Trap', user: 'Nagi Seishiro', effect: 'Zero effort. Maximum control.' },
  { name: 'Triple Ego Domain', user: 'EGO.XD', effect: 'Three egos collide. Reality bends.' }
];

module.exports = {
  name: 'domain',
  aliases: ['domaine', 'expansion'],
  category: 'anime',
  description: 'Déploie un Domain Expansion — .domain',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const d = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
    const tag = '@' + String(sender).split('@')[0].split(':')[0];
    await playSfx(sock, jid, 'arise', msg, 0.6);
    return replyTextDecor(
      sock, jid,
      `🌀 *DOMAIN EXPANSION*\n\n` +
        `「 *${d.name}* 」\n` +
        `👤 ${d.user}\n` +
        `⚡ ${d.effect}\n\n` +
        `Hunter ${tag} entre dans le domaine…`,
      msg, [sender], 0.8, d.user.includes('Gojo') ? 'gojo' : d.user.includes('Nagi') || d.user.includes('Isagi') ? 'nagi' : 'jinwoo', 0.5
    );
  }
};
