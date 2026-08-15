const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "speed",
  category: "general",
  description: "Mesure la latence du bot",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const start = Date.now();
    const sent = await replyText(sock, jid, "🏓 Mesure en cours...", msg);
    const elapsed = Date.now() - start;

    // On édite le message précédent avec le vrai résultat si possible
    await sock.sendMessage(jid, { text: `🏓 Latence : ${elapsed}ms`, edit: sent.key });
  }
};
