const { replyText } = require('../../helpers/reply');
const { isSenderAdmin } = require('../../lib/groupHelpers');
const { getLastMessages, removeMessages } = require('../../lib/messageTracker');

// ⚠️ NOTE HONNÊTE : WhatsApp ne permet de supprimer "pour tout le monde" QUE
// les messages envoyés par le compte lui-même (ici, le bot). Il n'est pas
// possible via l'API de supprimer les messages écrits par d'autres membres,
// même si le bot est admin. .purge nettoie donc les messages DU BOT, utile
// pour effacer du menu, des résultats de commandes, etc.

module.exports = {
  name: "purge",
  category: "moderation",
  description: "Supprime les X derniers messages envoyés par le bot dans ce chat — .purge <nombre>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (jid.endsWith('@g.us') && !(await isSenderAdmin(sock, jid, msg))) {
      return replyText(sock, jid, "Seuls les admins peuvent utiliser .purge", msg);
    }

    const count = parseInt(args[0], 10);
    if (!count || count <= 0) {
      return replyText(sock, jid, "Donne un nombre, ex: .purge 10", msg);
    }

    const keys = getLastMessages(jid, count);
    if (!keys.length) {
      return replyText(sock, jid, "Aucun message du bot à supprimer pour l'instant.", msg);
    }

    for (const key of keys) {
      try {
        await sock.sendMessage(jid, { delete: key });
      } catch (err) {
        console.error('[purge] erreur suppression:', err.message);
      }
    }

    removeMessages(jid, keys);
    // Pas de message de confirmation ici : ça re-remplirait le chat juste après la purge
  }
};
