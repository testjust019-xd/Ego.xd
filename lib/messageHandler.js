const config = require('../config');
const { replyText } = require('../helpers/reply');
const { getGroupSettings } = require('./groupSettings');
const { isOwnEcho, trackMessage } = require('./messageTracker');
const { recordActivity } = require('./activityTracker');
const { put: storePut, get: storeGet } = require('./messageStore');
const { extractContent, isRevoke, getRevokeKey } = require('./msgContent');
const { attachGroupEvents } = require('./groupEvents');
const { downloadMediaMessage } = require('baron-baileys-v2');
const { canUseBot } = require('./privateMode');
const { getSenderJid, isOwnerMessage, isStaffMessage, digitsOnly } = require('./senderUtils');
const { meetsRank, getUserRank } = require('./rankGate');
const { checkCooldown, markUsed } = require('./cooldown');
const { checkAndUse: checkDailyLimit } = require('./dailyLimit');
const { isActivated, getActivationMessage } = require('./activation');
const { getAccessRules } = require('./commandAccess');
const { applyAutowarn, DEFAULT_MAX } = require('./warnings');
const { parseInteractiveResponse } = require('../helpers/interactive');
const { getAfk, clearAfk, formatDuration } = require('./afkDB');

const LINK_REGEX = /(https?:\/\/|www\.|chat\.whatsapp\.com)/i;

async function downloadBuffer(sock, msg) {
  try {
    const buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {},
      { reuploadRequest: sock.updateMediaMessage }
    );
    return buffer;
  } catch (err) {
    console.error('[antidelete download]', err.message);
    return null;
  }
}

async function handleAntiDelete(sock, msg) {
  const jid = msg.key.remoteJid;
  if (!jid?.endsWith('@g.us')) return false;
  if (!isRevoke(msg)) return false;

  const settings = getGroupSettings(jid);
  if (!settings.antidelete) return false;

  const revoked = getRevokeKey(msg);
  if (!revoked?.id) return false;

  // Ne pas restaurer les suppressions du bot lui-même si fromMe echo
  const cached = storeGet(jid, revoked.id);
  if (!cached) return true; // handled (rien en cache)

  const who = cached.sender || revoked.participant || 'inconnu';
  const number = String(who).replace(/@.*$/, '').split(':')[0];
  const header = `🛡️ *Antidelete*\n👤 @${number} a supprimé :\n`;

  try {
    if (cached.type === 'text') {
      const sent = await sock.sendMessage(jid, {
        text: header + (cached.text || '(vide)'),
        mentions: [who]
      });
      trackMessage(jid, sent.key);
    } else if (cached.type === 'image' && cached.buffer) {
      const sent = await sock.sendMessage(jid, {
        image: cached.buffer,
        caption: header + (cached.text || ''),
        mentions: [who]
      });
      trackMessage(jid, sent.key);
    } else if (cached.type === 'video' && cached.buffer) {
      const sent = await sock.sendMessage(jid, {
        video: cached.buffer,
        caption: header + (cached.text || ''),
        mentions: [who],
        gifPlayback: !!cached.gif
      });
      trackMessage(jid, sent.key);
    } else if (cached.type === 'audio' && cached.buffer) {
      await sock.sendMessage(jid, {
        text: header + '🎵 audio',
        mentions: [who]
      });
      const sent = await sock.sendMessage(jid, {
        audio: cached.buffer,
        mimetype: cached.mimetype || 'audio/ogg; codecs=opus',
        ptt: !!cached.ptt
      });
      trackMessage(jid, sent.key);
    } else if (cached.type === 'sticker' && cached.buffer) {
      await sock.sendMessage(jid, {
        text: header + '🎫 sticker',
        mentions: [who]
      });
      const sent = await sock.sendMessage(jid, { sticker: cached.buffer });
      trackMessage(jid, sent.key);
    } else if (cached.type === 'document' && cached.buffer) {
      const sent = await sock.sendMessage(jid, {
        document: cached.buffer,
        mimetype: cached.mimetype || 'application/octet-stream',
        fileName: cached.fileName || 'fichier',
        caption: header + (cached.text || ''),
        mentions: [who]
      });
      trackMessage(jid, sent.key);
    } else {
      // fallback texte si buffer manquant
      const sent = await sock.sendMessage(jid, {
        text: header + (cached.text || `[${cached.type || 'média'} non récupérable]`),
        mentions: [who]
      });
      trackMessage(jid, sent.key);
    }
  } catch (err) {
    console.error('[antidelete restore]', err.message);
  }
  return true;
}

async function cacheIfNeeded(sock, msg) {
  const jid = msg.key.remoteJid;
  if (!jid?.endsWith('@g.us')) return;
  if (!msg.key?.id) return;
  if (msg.key.fromMe) return; // pas besoin de restaurer nos propres msgs via antidelete user

  const settings = getGroupSettings(jid);
  if (!settings.antidelete) return;

  const content = extractContent(msg);
  if (!content) return;

  const sender = msg.key.participant || msg.key.remoteJid;
  const base = {
    type: content.type,
    text: content.text || '',
    mimetype: content.mimetype,
    fileName: content.fileName,
    gif: content.gif,
    ptt: content.ptt,
    sender,
    pushName: msg.pushName || ''
  };

  // Médias : télécharger le buffer (peut échouer → on garde au moins le texte/caption)
  if (['image', 'video', 'audio', 'sticker', 'document'].includes(content.type)) {
    const buffer = await downloadBuffer(sock, msg);
    if (buffer) base.buffer = buffer;
  }

  storePut(jid, msg.key.id, base);
}

/**
 * Attache le routeur de commandes + modération + welcome + antidelete.
 */
function attachMessageHandler(sock, commands) {
  // Welcome / goodbye
  attachGroupEvents(sock);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    const msg = messages[0];
    if (!msg) return;

    // Antidelete : détecter REVOKE même sans "message utile"
    if (msg.message && isRevoke(msg)) {
      try {
        await handleAntiDelete(sock, msg);
      } catch (err) {
        console.error('[antidelete]', err.message);
      }
      return;
    }

    if (!msg.message) return;
    if (msg.key.fromMe && isOwnEcho(msg.key.id)) return;

    const jid = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;

    // Capture des statuts (stories) des contacts qui les partagent avec le bot
    // — utilisé par .savestatus / .statut. Ne bloque jamais le reste du flux.
    if (jid === 'status@broadcast') {
      try {
        const { cacheStatus } = require('./statusCache');
        cacheStatus(msg);
      } catch (err) {
        console.error('[statusCache]', err.message);
      }
      return;
    }

    // Momentum de groupe (.gmomentum) — compte tout message reçu dans un groupe
    if (jid?.endsWith('@g.us')) {
      try {
        recordActivity(jid);
      } catch (err) {
        console.error('[activity]', err.message);
      }
    }

    // Cache antidelete (texte + médias) — avant le filtre body
    try {
      await cacheIfNeeded(sock, msg);
    } catch (err) {
      console.error('[cache]', err.message);
    }

    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      '';

    // Modération groupe (antilink / antibot / autowarn / mots interdits)
    if (jid?.endsWith('@g.us') && body) {
      const groupSettings = getGroupSettings(jid);
      const isOwnerOrStaff = isOwnerMessage(msg, sock) || isStaffMessage(msg, sock);
      const senderNumber = digitsOnly(senderJid);

      if (groupSettings.antibot && groupSettings.blockedNumbers.includes(senderNumber)) {
        try {
          await sock.groupParticipantsUpdate(jid, [senderJid], 'remove');
          await replyText(sock, jid, '🚫 Numéro bloqué (antibot) expulsé.', msg);
        } catch (err) {
          console.error('[antibot] erreur:', err.message);
        }
        return;
      }

      // Admins / owner / staff exemptés des sanctions auto
      if (!isOwnerOrStaff && !msg.key.fromMe) {
        const maxWarn = groupSettings.warnLimit || DEFAULT_MAX;
        const autowarnOn = !!groupSettings.autowarn;

        // Antilink
        if (groupSettings.antilink && LINK_REGEX.test(body)) {
          try {
            await sock.sendMessage(jid, { delete: msg.key });
          } catch (err) {
            console.error('[antilink] delete:', err.message);
          }
          if (autowarnOn) {
            await applyAutowarn(sock, jid, senderJid, {
              reason: 'lien interdit (antilink)',
              maxWarnings: maxWarn,
              quotedMsg: msg
            });
          } else {
            try {
              await replyText(sock, jid, '🔗 Lien supprimé (antilink activé).', msg);
            } catch (_) {}
          }
          return;
        }

        // Mots interdits
        const banned = groupSettings.bannedWords || [];
        if (autowarnOn && banned.length) {
          const lower = body.toLowerCase();
          const hit = banned.find(w => w && lower.includes(String(w).toLowerCase()));
          if (hit) {
            try {
              await sock.sendMessage(jid, { delete: msg.key });
            } catch (err) {
              console.error('[bannedWords] delete:', err.message);
            }
            await applyAutowarn(sock, jid, senderJid, {
              reason: `mot interdit (« ${hit} »)`,
              maxWarnings: maxWarn,
              quotedMsg: msg
            });
            return;
          }
        }
      }
    }

    // ─── Réponses interactives (boutons / listes) ───
    const inter = parseInteractiveResponse(msg);
    if (inter.id) {
      // Actions directes (commande + args optionnels)
      const actionMap = {
        menu_full:    { cmd: 'menu', args: ['all'] },
        menu_ping:    { cmd: 'ping', args: [] },
        menu_owner:   { cmd: 'owner', args: [] },
        menu_profile: { cmd: 'profile', args: [] },
        menu_help:    { cmd: 'help', args: [] },
        // Catégories → .menu <cat>
        cat_general:    { cmd: 'menu', args: ['general'] },
        cat_ai:         { cmd: 'menu', args: ['ai'] },
        cat_economy:    { cmd: 'menu', args: ['economy'] },
        cat_fun:        { cmd: 'menu', args: ['fun'] },
        cat_games:      { cmd: 'menu', args: ['games'] },
        cat_anime:      { cmd: 'menu', args: ['anime'] },
        cat_solo:       { cmd: 'menu', args: ['solo'] },
        cat_foot:       { cmd: 'menu', args: ['foot'] },
        cat_manager:    { cmd: 'menu', args: ['manager'] },
        cat_reactions:  { cmd: 'menu', args: ['reactions'] },
        cat_textmaker:  { cmd: 'menu', args: ['textmaker'] },
        cat_social:     { cmd: 'menu', args: ['social'] },
        cat_search:     { cmd: 'menu', args: ['search'] },
        cat_groups:     { cmd: 'menu', args: ['groups'] },
        cat_tools:      { cmd: 'menu', args: ['tools'] },
        cat_moderation: { cmd: 'menu', args: ['moderation'] },
        cat_ci:         { cmd: 'menu', args: ['ci'] }
      };
      const action = actionMap[inter.id];
      if (action) {
        const command = commands.get(action.cmd);
        if (command) {
          try {
            await command.execute(sock, msg, action.args, commands);
          } catch (e) {
            console.error('[interactive]', e.message);
          }
        }
        return;
      }
      console.log('[interactive] id non mappé:', inter.id);
      return;
    }

    if (!body) return;

    // ─── AFK : auto-clear si l'utilisateur AFK écrit, + alerte si mention ───
    try {
      const senderJidAfk = getSenderJid(sock, msg);
      const myAfk = getAfk(senderJidAfk);
      // Si l'expéditeur est AFK et envoie un message (sauf .afk / .back), on le retire
      if (myAfk && !body.toLowerCase().startsWith(config.prefix + 'afk') && !body.toLowerCase().startsWith(config.prefix + 'back')) {
        clearAfk(senderJidAfk);
        const dur = formatDuration(Date.now() - myAfk.since);
        try {
          await replyText(
            sock,
            jid,
            `👋 Bienvenue de retour ! (AFK *${dur}*)` +
              (myAfk.reason ? `\n📝 _${myAfk.reason}_` : ''),
            msg
          );
        } catch (_) {}
      }

      // Mentions d'utilisateurs AFK
      const ctxAfk = msg.message?.extendedTextMessage?.contextInfo;
      const mentioned = ctxAfk?.mentionedJid || [];
      for (const mjid of mentioned) {
        if (mjid === senderJidAfk) continue;
        const afkData = getAfk(mjid);
        if (!afkData) continue;
        const num = String(mjid).replace(/@.*$/, '').split(':')[0];
        const dur = formatDuration(Date.now() - afkData.since);
        try {
          await replyText(
            sock,
            jid,
            `💤 *@${num}* est AFK depuis *${dur}*\n📝 ${afkData.reason || 'Absent'}`,
            msg
          );
        } catch (_) {}
      }
    } catch (e) {
      console.error('[afk]', e.message);
    }

    if (body.startsWith(config.prefix)) {
      const [cmdName, ...args] = body.slice(config.prefix.length).trim().split(/\s+/);
      const command = commands.get(cmdName.toLowerCase());

      if (command) {
        // Mode privé : seuls owner / staff / VIP passent
        if (!canUseBot(msg, sock)) {
          // Silencieux en groupe pour ne pas spammer ; en DM on peut prévenir
          if (!jid.endsWith('@g.us')) {
            try {
              await replyText(sock, jid, '🔒 Bot en *mode privé*. Tu n\'es pas autorisé.', msg);
            } catch (_) {}
          }
          return;
        }

        try {
          const sender = getSenderJid(sock, msg);
          const userRank = getUserRank(sender);
          const isOwnerSender = isOwnerMessage(msg, sock);
          const isStaff = isStaffMessage(msg, sock);

          // 🔓 Activation YouTube obligatoire UNE SEULE FOIS (sauf owner/staff + commandes libres)
          const freeCmds = new Set(['activate', 'activer', 'unlock', 'verify', 'menu', 'bmenu', 'help', 'owner', 'support', 'ping', 'uptime', 'id', 'resetlimit', 'resetlimits', 'clearlimit', 'resetdaily']);
          if (!isOwnerSender && !isStaff && !isActivated(sender) && !freeCmds.has(command.name) && !(command.aliases || []).some(a => freeCmds.has(a))) {
            await replyText(sock, jid, getActivationMessage(), msg);
            return;
          }

          // 📋 Règles centralisées (lib/commandAccess.js) — prioritaire sur les props du fichier commande
          const access = getAccessRules(command.name, command.category);
          // Compat : si le fichier commande définit encore minRank / dailyLimit / cooldown, on les respecte
          const minRank = command.minRank !== undefined ? command.minRank : access.minRank;
          const dailyLimitFlag = command.dailyLimit !== undefined ? command.dailyLimit : access.dailyLimit;
          const baseCooldown = command.cooldown !== undefined ? command.cooldown : access.cooldown;

          // 🔒 Verrouillage par rang Hunter
          if (minRank) {
            if (!meetsRank(userRank, minRank)) {
              await replyText(
                sock,
                jid,
                `🔒 Commande réservée aux chasseurs de rang *${minRank}* ou plus.\n` +
                `Ton rang actuel : *${userRank}*.\n\n` +
                `_Gagne de l'XP avec .donjon, .gate ou .arise pour monter en rang._`,
                msg
              );
              return;
            }
          }

          // 📅 Limite journalière selon le rang (config dans lib/commandAccess.js)
          if (!isOwnerSender && dailyLimitFlag !== undefined && dailyLimitFlag !== false) {
            const dl = checkDailyLimit(sender, command.name, userRank, dailyLimitFlag);
            if (!dl.ok) {
              await replyText(
                sock,
                jid,
                `📅 Limite journalière atteinte pour *${command.name}* (*${dl.used}/${dl.limit}*).\n` +
                `Ton rang *${userRank}* te donne *${dl.limit}* utilisation(s)/jour.\n\n` +
                `_Monte en rang pour augmenter ta limite (Monarch = illimité)._\n` +
                `_Réessai demain (reset minuit UTC)._`,
                msg
              );
              return;
            }
          }

          // ⏱️ Cooldown anti-spam (réduit selon le rang) — owner exempté
          if (!isOwnerSender) {
            const cd = checkCooldown(sender, command.name, baseCooldown, userRank);
            if (!cd.ok) {
              await replyText(
                sock,
                jid,
                `⏱️ Doucement, chasseur. Réessaie dans *${cd.remainingSeconds}s*.\n` +
                `_Monte en rang pour réduire les temps d'attente._`,
                msg
              );
              return;
            }
            markUsed(sender, command.name);
          }

          await command.execute(sock, msg, args, commands);
        } catch (err) {
          console.error(`[${cmdName}] erreur:`, err);
          await replyText(sock, jid, 'Une erreur est survenue en exécutant cette commande.', msg);
        }

        if (config.deleteCommandMessage) {
          try {
            await sock.sendMessage(jid, { delete: msg.key });
          } catch (err) {
            console.error('[auto-delete] impossible de supprimer le message:', err.message);
          }
        }
      }
      return;
    }
  });
}

module.exports = { attachMessageHandler };
