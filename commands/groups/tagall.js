const { isSenderAdmin } = require('../../lib/groupHelpers');
const { simulatePresence } = require('../../helpers/presence');
const { trackMessage } = require('../../lib/messageTracker');

module.exports = {
  name: "tagall",
  category: "groups",
  description: "Mentionne tous les membres du groupe (admin) — .tagall <message optionnel>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: "Cette commande ne marche que dans un groupe." }, { quoted: msg });
    }

    if (!(await isSenderAdmin(sock, jid, msg))) {
      return sock.sendMessage(jid, { text: "Seuls les admins peuvent utiliser .tagall" }, { quoted: msg });
    }

    const meta = await sock.groupMetadata(jid);
    const mentions = meta.participants.map(p => p.id);
    const customText = args.join(' ');
    const text = customText || "📢 Attention à tous !";

    await simulatePresence(sock, jid);
    const sent = await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
    trackMessage(jid, sent.key);
  }
};
