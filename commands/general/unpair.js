const { replyText } = require('../../helpers/reply');
const { isOwner } = require('../../lib/groupHelpers');
const { destroySession, listSessions } = require('../../lib/sessionManager');

module.exports = {
  name: "unpair",
  category: "general",
  description: "Retire une session privée liée avec .pair (owner) — .unpair <nomSession>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!isOwner(msg)) {
      return replyText(sock, jid, "Cette commande est réservée au owner.", msg);
    }

    const sessionName = args[0];
    if (!sessionName) {
      return replyText(sock, jid, `Utilise : .unpair <nomSession>\nSessions actives : ${listSessions().join(', ') || 'aucune'}`, msg);
    }

    if (!listSessions().includes(sessionName)) {
      return replyText(sock, jid, `Aucune session "${sessionName}" trouvée.`, msg);
    }

    await destroySession(sessionName);
    return replyText(sock, jid, `✅ Session "${sessionName}" déconnectée et supprimée (sessions/${sessionName}/ effacé).`, msg);
  }
};
