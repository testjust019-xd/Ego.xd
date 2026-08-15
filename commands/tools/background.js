const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'background',
  category: 'tools',
  description: 'Enlève le fond d\'une photo — .background',

  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    return replyText(sock, jid,
      `🖼 *Remove background*\n\n` +
      `_Aucune API gratuite fiable intégrée (remove.bg est payant)._\\n` +
      `Astuce : utilise remove.bg / PhotoRoom sur mobile, ou demande une clé API pour un prochain lot.`.replace(/\\\\n/g, '\n'),
      msg
    );
  }
};
