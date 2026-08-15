const { downloadContentFromMessage } = require('baron-baileys-v2');
const { extractContent } = require('../../lib/msgContent');

module.exports = {
  name: "vv2",
  category: "general",
  description: "Révèle un vocal en vue unique (réponds à ce message avec .vv2)",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMsg = contextInfo?.quotedMessage;

    if (!quotedMsg) {
      return sock.sendMessage(
        jid,
        { text: "Réponds (reply) à un vocal en vue unique avec .vv2" },
        { quoted: msg }
      );
    }

    // On reconstruit un faux "msg" pour réutiliser extractContent, qui gère déjà
    // tous les emballages (viewOnceMessage / V2 / V2Extension / ephemeral).
    const content = extractContent({ message: quotedMsg });

    if (!content || content.type !== 'audio') {
      return sock.sendMessage(
        jid,
        { text: "Ce message n'est pas un vocal (ou n'est pas en vue unique)." },
        { quoted: msg }
      );
    }

    try {
      const stream = await downloadContentFromMessage(content.mediaMsg, 'audio');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      await sock.sendMessage(jid, {
        audio: buffer,
        mimetype: content.mimetype || 'audio/ogg; codecs=opus',
        ptt: true
      });
    } catch (err) {
      console.error('[vv2] erreur:', err);
      await sock.sendMessage(jid, { text: "Erreur en récupérant le vocal." }, { quoted: msg });
    }
  }
};
