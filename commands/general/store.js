const config = require('../../config');
const { replyText } = require('../../helpers/reply');
const { STORE_URL, YT_DEVIL, YT_SOCCER } = require('../../lib/localAI');

module.exports = {
  name: 'store',
  aliases: ['shop', 'boutique', 'magasin'],
  category: 'general',
  description: "Lien du magasin d'objets digitaux + chaînes YouTube",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const store = config.storeUrl || STORE_URL;
    const yt1 = config.youtube?.devilskills || YT_DEVIL;
    const yt2 = config.youtube?.soccervibe || YT_SOCCER;

    const text =
      `🛒 *Magasin digital*\n${store}\n\n` +
      `📺 *Chaînes YouTube*\n` +
      `• Devil Skills : ${yt1}\n` +
      `• Soccer Vibe : ${yt2}\n\n` +
      `💳 Paiement / soutien :\n${config.donateInfo || 'voir .donate'}\n\n` +
      `_Après paiement pour un rang/XP, le owner génère un code avec .paycode_`;

    return replyText(sock, jid, text, msg);
  }
};
