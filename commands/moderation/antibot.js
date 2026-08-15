const { replyText } = require('../../helpers/reply');
const { isSenderAdmin } = require('../../lib/groupHelpers');
const { getGroupSettings, setGroupSetting } = require('../../lib/groupSettings');

// NOTE HONNÊTE : WhatsApp ne permet pas de détecter automatiquement et de
// façon fiable qu'un numéro est "un bot" — il n'y a pas de marqueur officiel.
// Cette commande fonctionne donc avec une liste noire de numéros que TOI tu
// ajoutes manuellement (numéros de bots connus). Quand antibot est ON,
// tout message venant d'un numéro de la liste noire fait expulser son auteur.

module.exports = {
  name: "antibot",
  category: "moderation",
  description: "Bloque des numéros connus comme bots — .antibot on/off/add <numero>/list",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, "Cette commande ne marche que dans un groupe.", msg);
    }

    if (!(await isSenderAdmin(sock, jid, msg))) {
      return replyText(sock, jid, "Seuls les admins peuvent utiliser .antibot", msg);
    }

    const sub = args[0]?.toLowerCase();
    const settings = getGroupSettings(jid);

    if (sub === 'on' || sub === 'off') {
      setGroupSetting(jid, 'antibot', sub === 'on');
      return replyText(sock, jid, `✅ Antibot ${sub === 'on' ? 'activé' : 'désactivé'}.`, msg);
    }

    if (sub === 'add') {
      const number = args[1]?.replace(/[^0-9]/g, '');
      if (!number) return replyText(sock, jid, "Donne un numéro, ex: .antibot add 2250000000000", msg);
      const updated = [...new Set([...settings.blockedNumbers, number])];
      setGroupSetting(jid, 'blockedNumbers', updated);
      return replyText(sock, jid, `✅ Numéro ${number} ajouté à la liste bloquée.`, msg);
    }

    if (sub === 'list') {
      const list = settings.blockedNumbers.length ? settings.blockedNumbers.join('\n') : "Aucun numéro bloqué.";
      return replyText(sock, jid, `📋 Numéros bloqués :\n${list}`, msg);
    }

    return replyText(
      sock, jid,
      "Utilise :\n.antibot on / off\n.antibot add <numero>\n.antibot list\n\n⚠️ Note : il n'existe pas de détection automatique fiable des bots sur WhatsApp, cette commande bloque une liste de numéros que tu gères toi-même.",
      msg
    );
  }
};
