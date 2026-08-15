const { getUser, updateUser } = require('../../lib/database');
const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');

module.exports = {
  name: "transfer",
  category: "economy",
  description: "Envoie des pièces (répondre au message de la personne) — .transfer <montant>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const targetJid = msg.message?.extendedTextMessage?.contextInfo?.participant;

    if (!targetJid) {
      return replyText(sock, jid, "Réponds au message de la personne à qui envoyer, avec .transfer <montant>", msg);
    }

    const amount = parseInt(args[0], 10);
    if (!amount || amount <= 0) {
      return replyText(sock, jid, "Montant invalide. Exemple : .transfer 200", msg);
    }

    const sender = getUser(senderJid);
    if (sender.balance < amount) {
      return replyText(sock, jid, `Solde insuffisant. Tu as ${sender.balance} pièces.`, msg);
    }

    const target = getUser(targetJid);
    updateUser(senderJid, { balance: sender.balance - amount });
    updateUser(targetJid, { balance: target.balance + amount });

    return replyText(sock, jid, `✅ Transfert de *${amount}* pièces effectué.`, msg);
  }
};
