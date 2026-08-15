const { getUser, updateUser } = require('../../lib/database');
const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');

const SUCCESS_RATE = 0.4; // 40% de chances de réussir
const MIN_TARGET_BALANCE = 100; // la cible doit avoir au moins ça pour être "volable"

module.exports = {
  name: "rob",
  category: "economy",
  description: "Tente de voler des pièces (réponds au message de la cible) — .rob",

  minRank: 'C',
  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const targetJid = msg.message?.extendedTextMessage?.contextInfo?.participant;

    if (!targetJid) {
      return replyText(sock, jid, "Réponds au message de la personne à voler avec .rob", msg);
    }

    if (targetJid === senderJid) {
      return replyText(sock, jid, "Tu ne peux pas te voler toi-même 😅", msg);
    }

    const target = getUser(targetJid);
    if (target.balance < MIN_TARGET_BALANCE) {
      return replyText(sock, jid, "Cette personne n'a pas assez de pièces à voler.", msg);
    }

    const sender = getUser(senderJid);
    const success = Math.random() < SUCCESS_RATE;

    if (success) {
      const stolen = Math.floor(target.balance * 0.15); // vole 15% du solde de la cible
      updateUser(targetJid, { balance: target.balance - stolen });
      updateUser(senderJid, { balance: sender.balance + stolen });
      return replyText(sock, jid, `💰 Vol réussi ! Tu as volé *${stolen}* pièces.`, msg);
    }

    const fine = Math.min(sender.balance, 100);
    updateUser(senderJid, { balance: sender.balance - fine });
    return replyText(sock, jid, `🚔 Vol raté ! Tu payes *${fine}* pièces d'amende.`, msg);
  }
};
