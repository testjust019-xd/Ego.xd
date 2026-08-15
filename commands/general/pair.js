const { replyText } = require('../../helpers/reply');
const { isOwner } = require('../../lib/groupHelpers');
const { createSession, listSessions } = require('../../lib/sessionManager');

module.exports = {
  name: "pair",
  category: "general",
  description: "Lie une session WhatsApp privée supplémentaire (owner) — .pair <nomSession> <numero>",

  // Crée un DEUXIÈME (ou 3e, etc.) compte WhatsApp géré par le même bot,
  // séparé de la session principale. Utile si tu veux un numéro perso privé
  // en plus du numéro "public" du bot, ou tester sans toucher à la session
  // principale. La nouvelle session a ses propres fichiers dans sessions/<nom>/.
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!isOwner(msg)) {
      return replyText(sock, jid, "Cette commande est réservée au owner.", msg);
    }

    const [sessionName, rawNumber] = args;

    if (!sessionName || !rawNumber) {
      const existing = listSessions();
      return replyText(
        sock, jid,
        `Utilise : .pair <nomSession> <numero>\nEx: .pair perso 2250000000000\n\nSessions actives : ${existing.length ? existing.join(', ') : 'aucune (à part la session principale)'}`,
        msg
      );
    }

    if (listSessions().includes(sessionName)) {
      return replyText(sock, jid, `Une session "${sessionName}" existe déjà. Utilise .unpair pour la retirer d'abord.`, msg);
    }

    const phoneNumber = rawNumber.replace(/[^0-9]/g, '');
    if (!phoneNumber) {
      return replyText(sock, jid, "Numéro invalide. Format international sans le +, ex: 2250000000000", msg);
    }

    await replyText(sock, jid, `⏳ Création de la session privée "${sessionName}"...`, msg);

    await createSession(sessionName, phoneNumber, async (code, err) => {
      if (err) {
        console.error('[pair] erreur:', err.message);
        await replyText(sock, jid, `Erreur en générant le code d'appairage : ${err.message}`, msg);
        return;
      }

      await replyText(
        sock, jid,
        `📌 *Session "${sessionName}"*\nCode d'appairage : *${code}*\n\nSur le téléphone du numéro ${phoneNumber} : WhatsApp > Appareils liés > Lier avec un numéro de téléphone > entre ce code.`,
        msg
      );
    });
  }
};
