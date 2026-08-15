const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../../config');
const { replyText, replySticker } = require('../../helpers/reply');

const execFileAsync = util.promisify(execFile);

/** Max stickers dans un pack (clients WA ~30–60). */
const MAX_PACK = 30;

async function convertWebmToAnimatedWebp(webmUrl) {
  const tempIn = path.join(os.tmpdir(), `tgvid2_${Date.now()}_${Math.floor(Math.random() * 1e6)}.webm`);
  const tempOut = tempIn.replace(/\.webm$/, '.webp');
  try {
    const res = await fetch(webmUrl);
    if (!res.ok) throw new Error(`fetch webm ${res.status}`);
    fs.writeFileSync(tempIn, Buffer.from(await res.arrayBuffer()));

    await execFileAsync(
      'ffmpeg',
      [
        '-y', '-i', tempIn,
        '-vcodec', 'libwebp',
        '-filter:v', 'fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        '-loop', '0',
        '-preset', 'default',
        '-an',
        '-vsync', '0',
        tempOut
      ],
      { timeout: 60000 }
    );

    if (!fs.existsSync(tempOut) || fs.statSync(tempOut).size < 100) {
      throw new Error('ffmpeg webp vide');
    }
    return fs.readFileSync(tempOut);
  } finally {
    try { fs.unlinkSync(tempIn); } catch {}
    try { fs.unlinkSync(tempOut); } catch {}
  }
}

async function downloadStickerBuffer(sticker) {
  const token = config.telegram?.botToken;
  const fileRes = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(sticker.file_id)}`
  );
  const fileData = await fileRes.json();
  if (!fileData.ok || !fileData.result?.file_path) {
    throw new Error(fileData.description || 'getFile failed');
  }

  const fileUrl = `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`;

  if (sticker.is_video) {
    return { buffer: await convertWebmToAnimatedWebp(fileUrl), isAnimated: true };
  }

  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  // Telegram static stickers = déjà webp
  return { buffer, isAnimated: false };
}

function emojiList(s) {
  if (Array.isArray(s.emoji)) return s.emoji.filter(Boolean);
  if (typeof s.emoji === 'string' && s.emoji.trim()) return [s.emoji];
  return ['✨'];
}

/**
 * Tente le message stickerPack natif (plusieurs formats selon fork Baileys).
 * Retourne true si l'envoi a semblé OK.
 */
async function trySendStickerPack(sock, jid, { packTitle, packName, cover, stickersPayload }, quoted) {
  const publisher = `via Telegram · ${config.botName || 'EGO.XD'}`;
  const description = `Pack Telegram : ${packName}`;

  // Format A — nested stickerPack (baron README)
  try {
    await sock.sendMessage(
      jid,
      {
        stickerPack: {
          name: packTitle,
          publisher,
          description,
          cover,
          stickers: stickersPayload.map((s) => ({
            data: s.data,
            emojis: s.emojis,
            accessibilityLabel: s.accessibilityLabel || ''
          }))
        }
      },
      { quoted }
    );
    return 'nested';
  } catch (err) {
    console.error('[teleget2] stickerPack nested:', err.message);
  }

  // Format B — flat (autres forks)
  try {
    await sock.sendMessage(
      jid,
      {
        name: packTitle,
        publisher,
        description,
        cover,
        stickers: stickersPayload.map((s) => ({
          data: s.data,
          emojis: s.emojis,
          accessibilityLabel: s.accessibilityLabel || ''
        }))
      },
      { quoted }
    );
    return 'flat';
  } catch (err) {
    console.error('[teleget2] stickerPack flat:', err.message);
  }

  return null;
}

/** Fallback : envoi un par un (fiable partout) */
async function sendAsIndividualStickers(sock, jid, stickersPayload, packTitle, quoted) {
  let ok = 0;
  for (let i = 0; i < stickersPayload.length; i++) {
    try {
      await replySticker(sock, jid, stickersPayload[i].data, quoted, {
        pack: packTitle,
        author: config.botName || 'EGO.XD'
      });
      ok++;
      // délai anti-flood / warm-up
      if (i < stickersPayload.length - 1) {
        await new Promise((r) => setTimeout(r, 600));
      }
    } catch (err) {
      console.error(`[teleget2] individual #${i + 1}:`, err.message);
      // si antiban bloque, on arrête
      if (/warm-up|blocked|limit/i.test(err.message || '')) {
        throw err;
      }
    }
  }
  return ok;
}

module.exports = {
  name: 'teleget2',
  aliases: ['tgpack', 'telepack2'],
  category: 'fun',
  description: 'Pack Telegram → WhatsApp (pack natif ou stickers un par un) — .teleget2 <pack> [max]',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const packName = args[0] ? args[0].split('/').pop().replace(/^addstickers/i, '') : null;
    const maxArg = args[1] ? parseInt(args[1], 10) : MAX_PACK;

    if (!packName) {
      return replyText(
        sock,
        jid,
        '📦 *teleget2* — pack Telegram → WhatsApp\n\n' +
          '• `.teleget2 <pack>` — pack (max ' + MAX_PACK + ')\n' +
          '• `.teleget2 <pack> 15` — limite à 15\n\n' +
          'Ex: `.teleget2 AnimatedEmojies`\n' +
          'Ex: `.teleget2 t.me/addstickers/MonPack`\n\n' +
          '_Lottie (.tgs) ignorés. Vidéo → webp animé (ffmpeg)._\n' +
          '_Si le pack natif échoue → envoi sticker par sticker._',
        msg
      );
    }

    if (!config.telegram?.botToken || config.telegram.botToken === 'TON_TOKEN_BOTFATHER') {
      return replyText(
        sock,
        jid,
        '⚠️ Token Telegram manquant.\nDans `config.js` → `telegram.botToken` (BotFather).',
        msg
      );
    }

    const limit = Math.min(Math.max(1, isNaN(maxArg) ? MAX_PACK : maxArg), MAX_PACK);

    try {
      await replyText(sock, jid, `⏳ Pack *${packName}*…`, msg);

      const setRes = await fetch(
        `https://api.telegram.org/bot${config.telegram.botToken}/getStickerSet?name=${encodeURIComponent(packName)}`
      );
      const setData = await setRes.json();

      if (!setData.ok) {
        return replyText(
          sock,
          jid,
          `❌ Pack introuvable : ${setData.description || 'erreur'}\n` +
            `_Nom exact (sensible à la casse), ex. celui de t.me/addstickers/NomPack_`,
          msg
        );
      }

      const packTitle = setData.result.title || packName;
      const allStickers = setData.result.stickers || [];
      // is_animated = Lottie .tgs (non supporté)
      const supported = allStickers.filter((s) => !s.is_animated);

      if (!supported.length) {
        return replyText(
          sock,
          jid,
          `❌ Aucun sticker compatible (tous Lottie).\nPack : ${packTitle} (${allStickers.length})`,
          msg
        );
      }

      const toFetch = supported.slice(0, limit);
      const skippedLottie = allStickers.length - supported.length;
      const capped = supported.length > limit;

      await replyText(
        sock,
        jid,
        `📥 ${toFetch.length} sticker(s)…` +
          (skippedLottie ? `\n⚠️ ${skippedLottie} Lottie ignoré(s)` : '') +
          (capped ? `\n📌 max ${limit}` : ''),
        msg
      );

      const stickersPayload = [];
      let failed = 0;

      for (let i = 0; i < toFetch.length; i++) {
        const s = toFetch[i];
        try {
          const { buffer } = await downloadStickerBuffer(s);
          if (!buffer || buffer.length < 50) throw new Error('buffer vide');
          stickersPayload.push({
            data: buffer,
            emojis: emojiList(s),
            accessibilityLabel: (emojiList(s)[0] || '') + ''
          });
        } catch (err) {
          failed++;
          console.error(`[teleget2] dl #${i + 1}:`, err.message);
        }
        if (i < toFetch.length - 1) {
          await new Promise((r) => setTimeout(r, 250));
        }
      }

      if (!stickersPayload.length) {
        return replyText(sock, jid, '❌ Téléchargement échoué (token / réseau / ffmpeg).', msg);
      }

      const cover = stickersPayload[0].data;

      // 1) Pack natif
      const mode = await trySendStickerPack(
        sock,
        jid,
        { packTitle, packName, cover, stickersPayload },
        msg
      );

      if (mode) {
        let done = `✅ Pack natif envoyé (*${mode}*)\n📦 *${packTitle}* — ${stickersPayload.length} sticker(s)`;
        if (failed) done += `\n⚠️ ${failed} échec(s) DL`;
        if (skippedLottie) done += `\n🚫 ${skippedLottie} Lottie`;
        return replyText(sock, jid, done, msg);
      }

      // 2) Fallback individuel
      await replyText(
        sock,
        jid,
        `⚠️ Pack natif indisponible sur ce client/fork.\n📤 Envoi *un par un* (${stickersPayload.length})…`,
        msg
      );

      const ok = await sendAsIndividualStickers(sock, jid, stickersPayload, packTitle, msg);
      let done =
        `✅ Envoi terminé : *${ok}/${stickersPayload.length}*\n📦 ${packTitle}`;
      if (failed) done += `\n⚠️ ${failed} échec(s) DL`;
      if (ok < stickersPayload.length) {
        done += `\n_Si warm-up antiban actif, réessaie plus tard._`;
      }
      return replyText(sock, jid, done, msg);
    } catch (err) {
      console.error('[teleget2] erreur:', err);
      const warm = /warm-up|blocked|limit/i.test(err.message || '');
      return replyText(
        sock,
        jid,
        warm
          ? '⏳ Bloqué par le *warm-up antiban* (limite messages/jour).\nRéessaie demain ou réduis les envois.'
          : '❌ Erreur teleget2.\nVérifie : nom du pack, `telegram.botToken`, ffmpeg (vidéo), connexion.',
        msg
      );
    }
  }
};
