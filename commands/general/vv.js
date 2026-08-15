const { downloadContentFromMessage } = require('baron-baileys-v2');

module.exports = {
  name: "vv",
  category: "general",
  description: "Révèle un message vue unique (réponds à ce message avec .vv)",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = contextInfo?.quotedMessage;

    if (!quoted) {
      return sock.sendMessage(
        jid,
        { text: "Réponds (reply) à un message vue unique avec .vv" },
        { quoted: msg }
      );
    }

    // Un message vue unique peut être emballé dans viewOnceMessage ou viewOnceMessageV2
    const viewOnceMsg =
      quoted.viewOnceMessage?.message ||
      quoted.viewOnceMessageV2?.message ||
      quoted;

    const type = viewOnceMsg.imageMessage ? 'image'
      : viewOnceMsg.videoMessage ? 'video'
      : null;

    if (!type) {
      return sock.sendMessage(
        jid,
        { text: "Ce message n'est pas en vue unique (ou n'est pas une image/vidéo)." },
        { quoted: msg }
      );
    }

    const mediaMsg = viewOnceMsg[`${type}Message`];

    try {
      const stream = await downloadContentFromMessage(mediaMsg, type);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      await sock.sendMessage(jid, {
        [type]: buffer,
        caption: "🔓 Message vue unique révélé"
      });
    } catch (err) {
      console.error('[vv] erreur:', err);
      await sock.sendMessage(jid, { text: "Erreur en récupérant le média." }, { quoted: msg });
    }
  }
};
