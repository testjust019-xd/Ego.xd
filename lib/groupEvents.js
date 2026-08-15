const fs = require('fs');
const { getGroupSettings } = require('./groupSettings');
const { detectCommandMedia, audioMimetype } = require('../helpers/commandMedia');
const { trackMessage } = require('./messageTracker');
const { simulatePresence } = require('../helpers/presence');

function formatTemplate(tpl, { userTag, group, count }) {
  return String(tpl || '')
    .replace(/@user/gi, userTag)
    .replace(/\{user\}/gi, userTag)
    .replace(/\{group\}/gi, group || 'ce groupe')
    .replace(/\{count\}/gi, String(count ?? '?'));
}

async function getPpUrl(sock, userJid) {
  try {
    return await sock.profilePictureUrl(userJid, 'image');
  } catch {
    return null;
  }
}

async function sendWelcomeOrGoodbye(sock, groupJid, userJid, kind) {
  const settings = getGroupSettings(groupJid);
  if (kind === 'welcome' && !settings.welcome) return;
  if (kind === 'goodbye' && !settings.goodbye) return;

  let groupName = 'ce groupe';
  let count = '?';
  try {
    const meta = await sock.groupMetadata(groupJid);
    groupName = meta.subject || groupName;
    count = meta.participants?.length ?? '?';
  } catch { /* ignore */ }

  const number = userJid.replace(/@.*$/, '').split(':')[0];
  const userTag = `@${number}`;
  const tpl = kind === 'welcome' ? settings.welcomeText : settings.goodbyeText;
  const caption = formatTemplate(tpl, { userTag, group: groupName, count });

  await simulatePresence(sock, groupJid).catch(() => {});

  // 1) Photo de profil
  const ppUrl = await getPpUrl(sock, userJid);

  // 2) Fallback media assets/media/welcome.* ou goodbye.*
  const media = detectCommandMedia(kind === 'welcome' ? 'welcome' : 'goodbye');

  try {
    if (ppUrl) {
      const sent = await sock.sendMessage(groupJid, {
        image: { url: ppUrl },
        caption,
        mentions: [userJid]
      });
      trackMessage(groupJid, sent.key);
      // audio d'ambiance optionnel
      if (media.audio) {
        try {
          const audioBuf = fs.readFileSync(media.audio);
          const a = await sock.sendMessage(groupJid, {
            audio: audioBuf,
            mimetype: audioMimetype(media.audio),
            ptt: false
          });
          trackMessage(groupJid, a.key);
        } catch { /* ignore */ }
      }
      return;
    }

    // Pas de PP → média custom welcome/goodbye
    if (media.audio) {
      try {
        const audioBuf = fs.readFileSync(media.audio);
        const a = await sock.sendMessage(groupJid, {
          audio: audioBuf,
          mimetype: audioMimetype(media.audio),
          ptt: false
        });
        trackMessage(groupJid, a.key);
      } catch { /* ignore */ }
    }

    if (media.video) {
      const sent = await sock.sendMessage(groupJid, {
        video: fs.readFileSync(media.video),
        caption,
        mentions: [userJid]
      });
      trackMessage(groupJid, sent.key);
      return;
    }

    if (media.image) {
      const sent = await sock.sendMessage(groupJid, {
        image: fs.readFileSync(media.image),
        caption,
        mentions: [userJid]
      });
      trackMessage(groupJid, sent.key);
      return;
    }

    // Texte seul
    const sent = await sock.sendMessage(groupJid, {
      text: caption,
      mentions: [userJid]
    });
    trackMessage(groupJid, sent.key);
  } catch (err) {
    console.error(`[${kind}]`, err.message);
    try {
      await sock.sendMessage(groupJid, { text: caption, mentions: [userJid] });
    } catch { /* ignore */ }
  }
}

/**
 * Branche l'écouteur group-participants.update sur un sock.
 */
function attachGroupEvents(sock) {
  sock.ev.on('group-participants.update', async (update) => {
    try {
      const groupJid = update.id;
      if (!groupJid?.endsWith('@g.us')) return;
      const participants = update.participants || [];
      const action = update.action; // 'add' | 'remove' | 'promote' | 'demote'

      if (action === 'add') {
        for (const userJid of participants) {
          await sendWelcomeOrGoodbye(sock, groupJid, userJid, 'welcome');
        }
      } else if (action === 'remove') {
        for (const userJid of participants) {
          await sendWelcomeOrGoodbye(sock, groupJid, userJid, 'goodbye');
        }
      }
    } catch (err) {
      console.error('[group-participants]', err.message);
    }
  });
}

module.exports = { attachGroupEvents, sendWelcomeOrGoodbye, formatTemplate };
