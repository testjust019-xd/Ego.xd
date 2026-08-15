const { replyText } = require('../../helpers/reply');
const { simulatePresence } = require('../../helpers/presence');
const { trackMessage } = require('../../lib/messageTracker');
const { getTargetJid } = require('../../lib/groupHelpers');
const { getSenderJid } = require('../../lib/senderUtils');
const config = require('../../config');

/**
 * Construit un "faux message" pour le mécanisme de citation Baileys.
 * WhatsApp affichera une bulle de réponse attribuée à targetJid.
 */
function buildFakeQuoted(targetJid, fakeBody, chatJid) {
  return {
    key: {
      remoteJid: chatJid,
      fromMe: false,
      id: 'FAKE' + Date.now().toString(36).toUpperCase(),
      participant: targetJid
    },
    message: {
      conversation: fakeBody
    }
  };
}

function parseArgs(args, msg) {
  // .fake @user texte...
  // .fake texte...  (en reply)
  // .fake nom | texte   (sans mention, nom libre)
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const mentioned = ctx?.mentionedJid || [];

  let targetJid = getTargetJid(msg);
  let textParts = [...args];

  // Retire les @numéros bruts des args si déjà en mention
  if (mentioned.length) {
    targetJid = targetJid || mentioned[0];
    textParts = args.filter(a => !a.startsWith('@') && !/^\d{8,15}$/.test(a.replace(/\D/g, '')));
  } else if (args[0] && /^\d{8,15}$/.test(args[0].replace(/\D/g, ''))) {
    const num = args[0].replace(/\D/g, '');
    targetJid = `${num}@s.whatsapp.net`;
    textParts = args.slice(1);
  }

  // Syntaxe "Nom | message" si pas de cible JID
  const joined = textParts.join(' ');
  if (!targetJid && joined.includes('|')) {
    const [name, ...rest] = joined.split('|');
    return {
      targetJid: null,
      displayName: name.trim() || 'Inconnu',
      fakeText: rest.join('|').trim()
    };
  }

  return {
    targetJid,
    displayName: null,
    fakeText: textParts.join(' ').trim()
  };
}

module.exports = {
  name: 'fake',
  category: 'fun',
  description: 'Faux message cité — .fake @user texte (ou reply)',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const parsed = parseArgs(args, msg);

    if (!parsed.fakeText) {
      return replyText(
        sock, jid,
        '🎭 *Fake chat*\n\n' +
        '• `.fake @user je paie la tournée`\n' +
        '• Réponds à quelqu\'un : `.fake j\'avoue tout`\n' +
        '• Sans mention : `.fake Papa | rentre à la maison`\n\n' +
        '_Pour le fun uniquement — ne sème pas la zizanie._',
        msg
      );
    }

    // ─── Mode nom libre (pas de vrai JID) → rendu texte stylé ───
    if (!parsed.targetJid) {
      const name = parsed.displayName || 'Inconnu';
      const card =
        `╭─── 💬 *Fake chat* ───╮\n` +
        `│ 👤 *${name}*\n` +
        `│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
        `│ ${parsed.fakeText}\n` +
        `╰──────────────────╯\n` +
        `_Généré par ${config.botName}_`;
      return replyText(sock, jid, card, msg);
    }

    // ─── Mode mention / reply → vraie bulle de citation WhatsApp ───
    const fakeQuoted = buildFakeQuoted(parsed.targetJid, parsed.fakeText, jid);
    const number = parsed.targetJid.replace(/@.*$/, '').split(':')[0];

    await simulatePresence(sock, jid);

    // Message principal qui "répond" au faux message de la cible
    const sent = await sock.sendMessage(
      jid,
      {
        text: `🎭 *Fake* — @${number} aurait dit…`,
        mentions: [parsed.targetJid]
      },
      { quoted: fakeQuoted }
    );
    trackMessage(jid, sent.key);

    // Option : aussi renvoyer uniquement la citation pure (double effet)
    // On reste sur un seul message pour ne pas spammer.
    return sent;
  }
};
