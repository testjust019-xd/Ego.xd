const config = require('../../config');
const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { isOwner } = require('../../lib/groupHelpers');
const { resetLimits, getTodaySummary, todayKey } = require('../../lib/dailyLimit');

function isStaffOrOwner(msg, sock) {
  if (isOwner(msg)) return true;
  const sender = getSenderJid(sock, msg).replace(/[^0-9]/g, '');
  return (config.staffNumbers || []).includes(sender);
}

function resolveTargetJid(sock, msg, args) {
  const sender = getSenderJid(sock, msg);
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (ctx?.mentionedJid?.length) return ctx.mentionedJid[0];
  if (ctx?.participant) return ctx.participant;

  const first = (args[0] || '').toLowerCase();
  if (!first || first === 'me' || first === 'moi') return sender;
  if (first === 'all' || first === 'global' || first === 'tout') return null;

  const digits = first.replace(/[^0-9]/g, '');
  if (digits.length >= 8) return `${digits}@s.whatsapp.net`;
  return sender;
}

module.exports = {
  name: 'resetlimit',
  aliases: ['resetlimits', 'clearlimit', 'resetdaily'],
  category: 'general',
  description: 'Réinitialise les limites journalières — .resetlimit [@user|all] [commande] (owner/staff)',
  minRank: null,
  dailyLimit: false,
  cooldown: 3,

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);

    if (!isStaffOrOwner(msg, sock)) {
      return replyText(sock, jid, '🔒 Commande réservée au *owner* et au *staff*.', msg);
    }

    let commandName = null;
    let targetArgs = [...args];
    const knownGlobal = new Set(['all', 'global', 'tout', 'me', 'moi']);

    if (args.length >= 2) {
      const last = args[args.length - 1].toLowerCase();
      if (!knownGlobal.has(last) && !last.startsWith('@') && !/^\d{8,}$/.test(last.replace(/[^0-9]/g, ''))) {
        commandName = last;
        targetArgs = args.slice(0, -1);
      }
    } else if (args.length === 1) {
      const a = args[0].toLowerCase();
      if (!knownGlobal.has(a) && !a.startsWith('@') && !/^\d{8,}$/.test(a.replace(/[^0-9]/g, ''))) {
        commandName = a;
        targetArgs = ['me'];
      }
    }

    const targetJid = resolveTargetJid(sock, msg, targetArgs);
    const isGlobal = targetJid === null;

    if (isGlobal && !isOwner(msg)) {
      return replyText(sock, jid, '🔒 Le reset *global* (all) est réservé au *owner*.', msg);
    }

    const result = resetLimits(targetJid, commandName);

    if (isGlobal) {
      return replyText(
        sock, jid,
        `✅ *Reset global* effectué.\n📅 Jour : *${todayKey()}*\n🗑 Entrées effacées : *${result.cleared}*\n\n_Toutes les limites journalières ont été remises à zéro._`,
        msg
      );
    }

    const num = String(targetJid).replace(/@.*$/, '').split(':')[0];
    const who = targetJid === sender ? 'tes' : `celles de @${num}`;
    const cmdPart = commandName ? ` pour la commande *${commandName}*` : '';

    let extra = '';
    const summary = getTodaySummary(targetJid);
    const remaining = Object.keys(summary).length;
    if (remaining > 0 && !commandName) {
      extra = `\n⚠️ Compteurs restants : ${Object.entries(summary).map(([k, v]) => `${k}=${v}`).join(', ')}`;
    } else if (remaining === 0) {
      extra = `\n✨ Aucun compteur restant pour aujourd'hui.`;
    }

    return replyText(
      sock, jid,
      `✅ Limites réinitialisées (${who})${cmdPart}.\n📅 Jour : *${todayKey()}*\n🗑 Entrées effacées : *${result.cleared}*` + extra,
      msg
    );
  }
};
