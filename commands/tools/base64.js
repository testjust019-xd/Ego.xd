const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'base64',
  category: 'tools',
  description: 'Encode/decode Base64 — .base64 <enc|dec> <texte>',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const mode = (args[0] || '').toLowerCase();
    const text = args.slice(1).join(' ');
    if (!['enc', 'encode', 'dec', 'decode'].includes(mode) || !text) {
      return replyText(sock, jid, 'Ex: `.base64 enc hello` · `.base64 dec aGVsbG8=`', msg);
    }
    try {
      if (mode.startsWith('enc')) {
        const out = Buffer.from(text, 'utf8').toString('base64');
        return replyText(sock, jid, `🔐 \`${out}\``, msg);
      }
      const out = Buffer.from(text, 'base64').toString('utf8');
      return replyText(sock, jid, `🔓 ${out}`, msg);
    } catch {
      return replyText(sock, jid, 'Décodage impossible.', msg);
    }
  }
};
