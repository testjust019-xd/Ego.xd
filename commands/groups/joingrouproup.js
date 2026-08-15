const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const groupsDB = require('../../lib/groupsDB');
const peopleDB = require('../../lib/peopleDB');
const { getSock } = require('../../lib/groupFactory');
const { getUserRank, meetsRank } = require('../../lib/rankGate');

module.exports = {
  name: 'joingrouproup',
  aliases: ['joingroupe'],
  category: 'groups',
  description: 'Rejoindre un groupe premium via code — .joingrouproup EGO-XXXX',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const code = (args[0] || '').toUpperCase();
    if (!code) {
      return replyText(sock, jid, 'Usage : `.joingrouproup EGO-XXXX`', msg);
    }
    const rec = groupsDB.getByCode(code);
    if (!rec) return replyText(sock, jid, 'Code invalide.', msg);
    if (rec.status === 'building') {
      return replyText(
        sock,
        jid,
        `⏳ *${rec.name}* est encore en construction.\nRéessaie quand le status sera *open* (\`.groupinfo ${code}\`).`,
        msg
      );
    }
    const minRank = rec.filters?.minRank;
    if (minRank) {
      try {
        if (!meetsRank(getUserRank(sender), minRank)) {
          return replyText(sock, jid, `Rang *${minRank}+* requis.`, msg);
        }
      } catch (_) {}
    }
    const main = getSock() || sock;
    try {
      await main.groupParticipantsUpdate(rec.waJid, [sender], 'add');
      peopleDB.addGroup(sender, rec.id);
      const members = [...new Set([...(rec.members || []), sender])];
      groupsDB.updateGroup(rec.id, { members });
      return replyText(sock, jid, `✅ Ajout demandé pour *${rec.name}*.\nSi WA bloque l'ajout, utilise le lien d'invite du groupe.`, msg);
    } catch (err) {
      return replyText(sock, jid, `Impossible d'ajouter : ${err.message}\nDemande le lien WA à un admin.`, msg);
    }
  }
};
