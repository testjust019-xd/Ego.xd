const { replyText } = require('../../helpers/reply');
const crypto = require('crypto');

module.exports = {
  name: 'password',
  category: 'tools',
  description: 'Génère un mot de passe sécurisé — .password [longueur]',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    let len = parseInt(args[0], 10) || 16;
    len = Math.min(64, Math.max(8, len));
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    const bytes = crypto.randomBytes(len);
    let pwd = '';
    for (let i = 0; i < len; i++) pwd += chars[bytes[i] % chars.length];
    return replyText(sock, jid, `🔐 *Password*\n\`${pwd}\`\n_${len} caractères_`, msg);
  }
};
