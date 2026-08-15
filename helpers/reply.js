const fs = require('fs');
const { simulatePresence } = require('./presence');
const { trackMessage } = require('../lib/messageTracker');
const config = require('../config');
const { maybeDecorImage, maybeDecorSticker } = require('../lib/randomDecor');

// wa-sticker-formatter dépend de "sharp", qui ne compile pas sur beaucoup
// d'environnements Termux (nécessite l'Android NDK, absent par défaut).
// On le charge donc de façon OPTIONNELLE : s'il est installé et fonctionne,
// les stickers ont un nom de créateur/pack. Sinon, fallback silencieux —
// stickers envoyés normalement, sans métadonnées, mais le bot ne plante pas.
let StickerFormatter = null;
try {
  StickerFormatter = require('wa-sticker-formatter');
} catch {
  console.warn('[reply] wa-sticker-formatter non disponible — stickers sans nom de créateur (pack/auteur).');
}

function resolveSource(source) {
  if (Buffer.isBuffer(source)) return source;
  if (typeof source === 'string') return fs.readFileSync(source);
  return source; // déjà un objet { url: '...' }
}

async function replyText(sock, jid, text, quoted = null, mentions = null) {
  await simulatePresence(sock, jid);
  const content = { text };
  if (mentions && mentions.length) content.mentions = mentions;
  const sent = await sock.sendMessage(jid, content, { quoted });
  trackMessage(jid, sent.key);
  return sent;
}

async function replyImage(sock, jid, source, caption = '', quoted = null, mentions = null) {
  await simulatePresence(sock, jid);
  const image = resolveSource(source);
  const content = { image, caption };
  if (mentions && mentions.length) content.mentions = mentions;
  const sent = await sock.sendMessage(jid, content, { quoted });
  trackMessage(jid, sent.key);
  return sent;
}

async function replyVideo(sock, jid, source, caption = '', quoted = null, gif = false, mentions = null) {
  await simulatePresence(sock, jid);
  const video = resolveSource(source);
  const content = { video, caption, gifPlayback: gif };
  if (mentions && mentions.length) content.mentions = mentions;
  const sent = await sock.sendMessage(jid, content, { quoted });
  trackMessage(jid, sent.key);
  return sent;
}

// Note : WhatsApp n'affiche pas de légende sur les stickers, donc pas de
// paramètre "caption" ici (contrairement à replyImage/replyVideo).
//
// Le 4e paramètre "meta" est optionnel : { pack, author }. Sans lui, le
// sticker est envoyé tel quel (comme avant). Avec lui, la librairie
// wa-sticker-formatter injecte les métadonnées WebP nécessaires pour que
// WhatsApp affiche le nom du pack/créateur sur le sticker.
async function replySticker(sock, jid, source, quoted = null, meta = null) {
  await simulatePresence(sock, jid);

  let stickerBuffer;
  if (meta && StickerFormatter) {
    const { Sticker, StickerTypes } = StickerFormatter;
    const input = (source && typeof source === 'object' && source.url) ? source.url : source;
    const sticker = new Sticker(input, {
      pack: meta.pack || config.botName,
      author: meta.author || config.botName,
      type: StickerTypes.FULL,
      quality: 70
    });
    stickerBuffer = await sticker.toBuffer();
  } else {
    stickerBuffer = resolveSource(source);
  }

  const sent = await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted });
  trackMessage(jid, sent.key);
  return sent;
}

/**
 * Répond avec les médias auto de assets/media/<cmdName>.* s'ils existent.
 * Sinon tombe sur replyText (ou fallbackImage si fourni).
 *
 * @param {string} cmdName  nom de la commande (ex: "ping", "menu", "antilink")
 * @param {string} text     texte / légende
 * @param {object|null} quoted
 * @param {object} [opts]
 * @param {string|Buffer|object} [opts.fallbackImage]  bannière thème etc. si pas de media custom
 */
async function replyMedia(sock, jid, cmdName, text = '', quoted = null, opts = {}) {
  const { detectCommandMedia, audioMimetype } = require('./commandMedia');
  const media = detectCommandMedia(cmdName);
  const mentions = opts.mentions || null;

  if (media.audio) {
    try {
      await simulatePresence(sock, jid);
      const audioBuf = fs.readFileSync(media.audio);
      const sent = await sock.sendMessage(jid, {
        audio: audioBuf,
        mimetype: audioMimetype(media.audio),
        ptt: false
      }, { quoted });
      trackMessage(jid, sent.key);
    } catch (err) {
      console.error(`[replyMedia/${cmdName}] audio:`, err.message);
    }
  }

  if (media.video) {
    try {
      return await replyVideo(sock, jid, media.video, text, quoted, false, mentions);
    } catch (err) {
      console.error(`[replyMedia/${cmdName}] video:`, err.message);
    }
  }

  if (media.image) {
    try {
      return await replyImage(sock, jid, media.image, text, quoted, mentions);
    } catch (err) {
      console.error(`[replyMedia/${cmdName}] image:`, err.message);
    }
  }

  if (opts.fallbackImage) {
    try {
      return await replyImage(sock, jid, opts.fallbackImage, text, quoted, mentions);
    } catch (err) {
      console.error(`[replyMedia/${cmdName}] fallbackImage:`, err.message);
    }
  }

  if (text) return replyText(sock, jid, text, quoted, mentions);
  return null;
}


/**
 * Texte + parfois image carrée + parfois sticker animé (Triple Ego).
 * @param {number} [chance=0.4]   proba image
 * @param {string} [themeName]
 * @param {number} [stickerChance=0.3]  proba sticker en plus (ou à la place si pas d'image)
 */
async function replyTextDecor(sock, jid, text, quoted = null, mentions = null, chance = 0.4, themeName = null, stickerChance = 0.3) {
  let sent = null;
  const img = maybeDecorImage(chance, themeName);
  if (img) {
    try {
      sent = await replyImage(sock, jid, img, text, quoted, mentions);
    } catch (err) {
      console.error('[replyTextDecor] image:', err.message);
    }
  }
  if (!sent) {
    sent = await replyText(sock, jid, text, quoted, mentions);
  }
  // Sticker animé en message suivant (WhatsApp n'accepte pas caption sur sticker)
  const stk = maybeDecorSticker(stickerChance, themeName);
  if (stk) {
    try {
      await replySticker(sock, jid, stk, quoted, {
        pack: 'EGO.XD Triple Ego',
        author: themeName || 'Baron'
      });
    } catch (err) {
      console.error('[replyTextDecor] sticker:', err.message);
    }
  }
  return sent;
}


/**
 * Envoie un court audio (SFX). ptt=true → bulle note vocale.
 */
async function replyAudio(sock, jid, source, quoted = null, ptt = true) {
  try { await sock.sendPresenceUpdate('recording', jid); } catch (_) {}
  const audio = resolveSource(source);
  const name = typeof source === 'string' ? source.toLowerCase() : '';
  let mimetype = 'audio/ogg; codecs=opus';
  if (name.endsWith('.mp3')) mimetype = 'audio/mpeg';
  else if (name.endsWith('.m4a')) mimetype = 'audio/mp4';
  const content = { audio, mimetype, ptt: !!ptt };
  const sent = await sock.sendMessage(jid, content, { quoted });
  if (sent?.key) trackMessage(jid, sent.key);
  return sent;
}

/**
 * Joue un SFX nommé (lib/sfx) sans planter si absent.
 */
async function playSfx(sock, jid, sfxName, quoted = null, chance = 1) {
  try {
    const { maybeSfx } = require('../lib/sfx');
    const file = chance >= 1 ? require('../lib/sfx').resolveSfx(sfxName) : maybeSfx(sfxName, chance);
    if (!file) return null;
    return await replyAudio(sock, jid, file, quoted, true);
  } catch (err) {
    console.error('[playSfx]', sfxName, err.message);
    return null;
  }
}

module.exports = { replyText, replyImage, replyVideo, replySticker, replyMedia, replyTextDecor, replyAudio, playSfx };
