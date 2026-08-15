const { downloadContentFromMessage } = require('baron-baileys-v2');
const { getStatuses, listAuthors } = require('../../lib/statusCache');
const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'savestatus',
  category: 'general',
  aliases: ['statut', 'dlstatus'],
  description: 'Voir/télécharger les statuts WhatsApp vus par le bot — .savestatus [numéro] [all]',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!args[0]) {
      const authors = listAuthors();
      if (!authors.length) {
        return replyText(sock, jid, "📭 Aucun statut en mémoire pour l'instant. Le bot ne voit que les statuts des contacts qui le partagent avec lui.", msg);
      }
      let text = `📸 *Statuts disponibles* (24h)\n\n`;
      authors.forEach(a => {
        text += `• ${a.jid.split('@')[0]} — ${a.count} statut(s)\n`;
      });
      text += `\n\`.savestatus <numéro>\` pour voir le dernier\n\`.savestatus <numéro> all\` pour tout récupérer`;
      return replyText(sock, jid, text, msg);
    }

    const number = args[0].replace(/[^0-9]/g, '');
    if (!number) {
      return replyText(sock, jid, 'Numéro invalide.', msg);
    }
    const authorJid = `${number}@s.whatsapp.net`;
    const all = args[1]?.toLowerCase() === 'all';

    const statuses = getStatuses(authorJid);
    if (!statuses.length) {
      return replyText(sock, jid, `Aucun statut récent trouvé pour ${number}.`, msg);
    }

    const toSend = all ? statuses : [statuses[0]];

    for (const s of toSend) {
      try {
        if (s.type === 'text') {
          await sock.sendMessage(jid, { text: `📝 Statut de ${number} :\n\n${s.text}` }, { quoted: msg });
          continue;
        }
        if (s.type === 'image' || s.type === 'video') {
          const stream = await downloadContentFromMessage(s.mediaMsg, s.type);
          let buffer = Buffer.from([]);
          for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
          await sock.sendMessage(jid, {
            [s.type]: buffer,
            caption: s.text || `📸 Statut de ${number}`
          });
        }
      } catch (err) {
        console.error('[savestatus] erreur:', err.message);
      }
    }
  }
};
