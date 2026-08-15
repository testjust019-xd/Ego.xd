/**
 * .purges — expulse TOUS les non-admins du groupe
 * Sécurité : admin groupe + confirmation obligatoire
 */
const { replyText } = require('../../helpers/reply');
const { isSenderAdmin, isOwner } = require('../../lib/groupHelpers');
const { isOwnerMessage } = require('../../lib/senderUtils');
const config = require('../../config');

const CONFIRM = new Map(); // jid+sender -> expiresAt
const CONFIRM_TTL = 30_000;

module.exports = {
  name: 'purges',
  aliases: ['purgeall', 'kickall'],
  category: 'moderation',
  description: 'Expulse tous les non-admins du groupe — .purges puis .purges confirm',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, '❌ Cette commande marche uniquement *en groupe*.', msg);
    }

    const admin = await isSenderAdmin(sock, jid, msg);
    if (!admin) {
      return replyText(sock, jid, '🔒 Réservé aux *admins* du groupe (ou owner bot).', msg);
    }

    const sub = (args[0] || '').toLowerCase();

    // Étape 1 : demande de confirmation
    if (sub !== 'confirm' && sub !== 'oui' && sub !== 'yes') {
      const key = `${jid}|${sender}`;
      CONFIRM.set(key, Date.now() + CONFIRM_TTL);
      return replyText(
        sock, jid,
        `⚠️ *PURGE GROUPE*\n\n` +
          `Cette action va *expulser tous les membres non-admins*.\n` +
          `Les admins + le bot sont conservés.\n\n` +
          `Pour confirmer (30 s) :\n` +
          `➤ \`${config.prefix || '.'}purges confirm\`\n\n` +
          `_Irréversible. À utiliser avec précaution._`,
        msg
      );
    }

    // Étape 2 : confirm
    const key = `${jid}|${sender}`;
    const exp = CONFIRM.get(key);
    CONFIRM.delete(key);
    if (!exp || Date.now() > exp) {
      return replyText(
        sock, jid,
        `⌛ Confirmation expirée ou absente.\nRelance \`${config.prefix || '.'}purges\` puis \`${config.prefix || '.'}purges confirm\` dans les 30 s.`,
        msg
      );
    }

    let meta;
    try {
      meta = await sock.groupMetadata(jid);
    } catch (err) {
      return replyText(sock, jid, `❌ Impossible de lire le groupe : ${err.message}`, msg);
    }

    const botId = (sock.user?.id || '').split(':')[0] + '@s.whatsapp.net';
    const botDigits = (sock.user?.id || '').split(':')[0].replace(/[^0-9]/g, '');

    const toRemove = [];
    for (const p of meta.participants || []) {
      const isAdm = p.admin === 'admin' || p.admin === 'superadmin';
      if (isAdm) continue;
      const id = p.id || '';
      const digits = String(id).split(':')[0].replace(/@.*$/, '').replace(/[^0-9]/g, '');
      // ne pas se kick soi-même (bot)
      if (id === botId || digits === botDigits) continue;
      if (id.endsWith('@lid') && sock.user?.lid) {
        const lidDigits = String(sock.user.lid).split(':')[0].replace(/[^0-9]/g, '');
        if (digits === lidDigits) continue;
      }
      toRemove.push(id);
    }

    if (!toRemove.length) {
      return replyText(sock, jid, '✅ Aucun non-admin à expulser.', msg);
    }

    await replyText(
      sock, jid,
      `🧹 Purge en cours… *${toRemove.length}* membre(s) non-admin.`,
      msg
    );

    let ok = 0;
    let fail = 0;
    // WhatsApp rate-limit : petits lots
    const chunk = 5;
    for (let i = 0; i < toRemove.length; i += chunk) {
      const batch = toRemove.slice(i, i + chunk);
      try {
        await sock.groupParticipantsUpdate(jid, batch, 'remove');
        ok += batch.length;
      } catch (err) {
        console.error('[purges] batch error:', err.message);
        // retry one by one
        for (const id of batch) {
          try {
            await sock.groupParticipantsUpdate(jid, [id], 'remove');
            ok++;
          } catch (e2) {
            fail++;
            console.error('[purges] fail', id, e2.message);
          }
        }
      }
      await new Promise((r) => setTimeout(r, 1200));
    }

    return replyText(
      sock, jid,
      `✅ *Purge terminée*\n` +
        `Expulsés : *${ok}*\n` +
        (fail ? `Échecs : *${fail}*\n` : '') +
        `_Admins conservés._`,
      msg
    );
  }
};
