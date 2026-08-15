const { replyText } = require('../../helpers/reply');
const { isSenderAdmin } = require('../../lib/groupHelpers');
const { getGroupSettings, setGroupSetting } = require('../../lib/groupSettings');
const { DEFAULT_MAX } = require('../../lib/warnings');

module.exports = {
  name: 'autowarn',
  category: 'moderation',
  description: "Active l'autowarn + gère les mots interdits et le seuil — .autowarn",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, 'Cette commande ne marche que dans un groupe.', msg);
    }

    if (!(await isSenderAdmin(sock, jid, msg))) {
      return replyText(sock, jid, 'Seuls les admins peuvent utiliser .autowarn', msg);
    }

    const sub = (args[0] || '').toLowerCase();
    const settings = getGroupSettings(jid);

    // ── Status ──
    if (!sub || sub === 'status' || sub === 'info') {
      const words = settings.bannedWords || [];
      const on = settings.autowarn ? '🟢 ON' : '🔴 OFF';
      const antilinkOn = settings.antilink ? 'oui' : 'non';
      return replyText(
        sock, jid,
        `🛡 *Autowarn* — ${on}\n` +
        `• Seuil d'expulsion : *${settings.warnLimit || DEFAULT_MAX}*\n` +
        `• Antilink (avec warn) : ${antilinkOn}\n` +
        `• Mots interdits (${words.length}) : ${words.length ? words.join(', ') : '_aucun_'}\n\n` +
        `*Commandes :*\n` +
        `\.autowarn on|off\n` +
        `\.autowarn limit <n>\n` +
        `\.autowarn add <mot>\n` +
        `\.autowarn del <mot>\n` +
        `\.autowarn list\n` +
        `\.autowarn clearwords`,
        msg
      );
    }

    // ── On / Off ──
    if (sub === 'on' || sub === 'enable' || sub === '1') {
      setGroupSetting(jid, 'autowarn', true);
      return replyText(sock, jid, '🟢 Autowarn *activé*.\nLes liens (si antilink) et mots interdits donnent un avertissement automatique.', msg);
    }
    if (sub === 'off' || sub === 'disable' || sub === '0') {
      setGroupSetting(jid, 'autowarn', false);
      return replyText(sock, jid, '🔴 Autowarn *désactivé*.', msg);
    }

    // ── Limit ──
    if (sub === 'limit' || sub === 'seuil') {
      const n = parseInt(args[1], 10);
      if (!n || n < 1 || n > 20) {
        return replyText(sock, jid, 'Utilisation : `.autowarn limit <1-20>`\nEx: `.autowarn limit 3`', msg);
      }
      setGroupSetting(jid, 'warnLimit', n);
      return replyText(sock, jid, `✅ Seuil d'expulsion fixé à *${n}* avertissements.`, msg);
    }

    // ── Add word ──
    if (sub === 'add' || sub === 'banword') {
      const word = args.slice(1).join(' ').trim().toLowerCase();
      if (!word || word.length < 2) {
        return replyText(sock, jid, 'Utilisation : `.autowarn add <mot ou expression>`', msg);
      }
      const words = [...(settings.bannedWords || [])];
      if (words.includes(word)) {
        return replyText(sock, jid, `Ce mot est déjà dans la liste : *${word}*`, msg);
      }
      words.push(word);
      setGroupSetting(jid, 'bannedWords', words);
      if (!settings.autowarn) setGroupSetting(jid, 'autowarn', true);
      return replyText(sock, jid, `✅ Mot interdit ajouté : *${word}*\n(Autowarn activé si besoin)`, msg);
    }

    // ── Del word ──
    if (sub === 'del' || sub === 'remove' || sub === 'rm') {
      const word = args.slice(1).join(' ').trim().toLowerCase();
      if (!word) {
        return replyText(sock, jid, 'Utilisation : `.autowarn del <mot>`', msg);
      }
      const words = (settings.bannedWords || []).filter(w => w !== word);
      if (words.length === (settings.bannedWords || []).length) {
        return replyText(sock, jid, `Mot introuvable : *${word}*`, msg);
      }
      setGroupSetting(jid, 'bannedWords', words);
      return replyText(sock, jid, `✅ Mot retiré : *${word}*`, msg);
    }

    // ── List ──
    if (sub === 'list' || sub === 'words') {
      const words = settings.bannedWords || [];
      if (!words.length) {
        return replyText(sock, jid, 'Aucun mot interdit configuré.\nAjoute-en avec `.autowarn add <mot>`', msg);
      }
      return replyText(
        sock, jid,
        `🚫 *Mots interdits* (${words.length}) :\n` + words.map((w, i) => `${i + 1}. ${w}`).join('\n'),
        msg
      );
    }

    // ── Clear words ──
    if (sub === 'clearwords' || sub === 'clear') {
      setGroupSetting(jid, 'bannedWords', []);
      return replyText(sock, jid, '✅ Liste des mots interdits vidée.', msg);
    }

    return replyText(
      sock, jid,
      'Utilisation : `.autowarn [on|off|status|limit|add|del|list|clearwords]`',
      msg
    );
  }
};
