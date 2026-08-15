const { isSenderAdmin } = require('../../lib/groupHelpers');
const { simulatePresence } = require('../../helpers/presence');
const { trackMessage } = require('../../lib/messageTracker');

module.exports = {
  name: "hidetag",
  category: "groups",
  description: "Comme .tagall mais le texte n'affiche pas la liste des numéros (admin)",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: "Cette commande ne marche que dans un groupe." }, { quoted: msg });
    }

    if (!(await isSenderAdmin(sock, jid, msg))) {
      return sock.sendMessage(jid, { text: "Seuls les admins peuvent utiliser .hidetag" }, { quoted: msg });
    }

    const meta = await sock.groupMetadata(jid);
    const mentions = meta.participants.map(p => p.id);
    const text = args.join(' ') || "📢";

    await simulatePresence(sock, jid);
    // Les mentions sont attachées mais ne sont pas écrites en clair dans "text"
    const sent = await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
    trackMessage(jid, sent.key);
  }
};
