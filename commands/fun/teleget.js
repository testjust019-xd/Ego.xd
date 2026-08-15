const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../../config');
const { replySticker, replyText } = require('../../helpers/reply');

const execFileAsync = util.promisify(execFile);
const MAX_ALL = 100;
const MAX_RANGE = 40; // plafond pour un intervalle (anti-spam)

async function convertWebmToAnimatedWebp(webmUrl) {
  const tempIn = path.join(os.tmpdir(), `tgvid_${Date.now()}_${Math.floor(Math.random() * 10000)}.webm`);
  const tempOut = tempIn.replace('.webm', '.webp');

  const res = await fetch(webmUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(tempIn, buffer);

  await execFileAsync('ffmpeg', [
    '-i', tempIn,
    '-vcodec', 'libwebp',
    '-filter:v', 'fps=15,scale=512:512:force_original_aspect_ratio=decrease',
    '-loop', '0',
    '-preset', 'default',
    '-an',
    '-vsync', '0',
    '-y', tempOut
  ]);

  const webpBuffer = fs.readFileSync(tempOut);
  try { fs.unlinkSync(tempIn); } catch {}
  try { fs.unlinkSync(tempOut); } catch {}
  return webpBuffer;
}

/**
 * Parse l'argument d'index :
 *  - "all" / "*"
 *  - "7"          → un seul
 *  - "1-10"       → intervalle inclusif (1-based)
 *  - "5.." / "5-" → de 5 jusqu'à la fin (plafonné)
 * Retourne { mode: 'all'|'single'|'range', from?, to?, index? }  (0-based pour from/to/index)
 */
function parseIndexArg(arg, total) {
  const raw = String(arg || '').trim().toLowerCase();

  if (raw === 'all' || raw === '*') {
    return { mode: 'all' };
  }

  // Intervalle 1-10, 3..8, 5-
  const rangeMatch = raw.match(/^(\d+)\s*[-–—.]{1,2}\s*(\d+)?$/);
  if (rangeMatch) {
    let from = parseInt(rangeMatch[1], 10);
    let to = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : total;
    if (isNaN(from) || from < 1) from = 1;
    if (isNaN(to) || to < 1) to = total;
    if (from > to) [from, to] = [to, from];
    from = Math.min(from, total);
    to = Math.min(to, total);
    return { mode: 'range', from: from - 1, to: to - 1 };
  }

  const n = parseInt(raw, 10);
  if (!isNaN(n)) {
    return { mode: 'single', index: n - 1 };
  }

  return null;
}

async function sendOneSticker(sock, jid, sticker, packTitle, msg) {
  if (sticker.is_animated) {
    return { ok: false, reason: 'lottie' };
  }

  const fileRes = await fetch(
    `https://api.telegram.org/bot${config.telegram.botToken}/getFile?file_id=${sticker.file_id}`
  );
  const fileData = await fileRes.json();
  if (!fileData.ok || !fileData.result?.file_path) {
    return { ok: false, reason: 'file' };
  }

  const fileUrl = `https://api.telegram.org/file/bot${config.telegram.botToken}/${fileData.result.file_path}`;
  const meta = { pack: packTitle, author: `via Telegram · ${config.botName}` };

  if (sticker.is_video) {
    const webpBuffer = await convertWebmToAnimatedWebp(fileUrl);
    await replySticker(sock, jid, webpBuffer, msg, meta);
  } else {
    await replySticker(sock, jid, { url: fileUrl }, msg, meta);
  }
  return { ok: true };
}

async function sendBatch(sock, jid, stickers, packTitle, msg, label) {
  await replyText(
    sock, jid,
    `⬇️ ${label}\nDélai anti-spam entre chaque sticker…`,
    msg
  );

  let sent = 0;
  let skippedLottie = 0;
  for (let i = 0; i < stickers.length; i++) {
    const sticker = stickers[i];
    try {
      if (sticker.is_animated) {
        skippedLottie++;
        continue;
      }
      const res = await sendOneSticker(sock, jid, sticker, packTitle, msg);
      if (res.ok) sent++;
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`[teleget] batch #${i + 1}:`, err.message);
    }
  }

  let done = `✅ Terminé : ${sent}/${stickers.length} stickers envoyés.`;
  if (skippedLottie) done += `\n⚠️ ${skippedLottie} Lottie (.tgs) ignoré(s).`;
  return replyText(sock, jid, done, msg);
}

module.exports = {
  name: 'teleget',
  category: 'fun',
  description: 'Stickers Telegram — .teleget <pack> <n|all|1-10>',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const packName = args[0];
    const indexArg = args[1];

    if (!packName || !indexArg) {
      return replyText(
        sock, jid,
        '📦 *teleget* — stickers Telegram\n\n' +
        '• `.teleget <pack> <n>` — un sticker\n' +
        '• `.teleget <pack> 1-10` — intervalle (inclusif)\n' +
        '• `.teleget <pack> 5-` — du 5 jusqu\'à la fin\n' +
        '• `.teleget <pack> all` — tout le pack (max ' + MAX_ALL + ')\n\n' +
        'Ex: `.teleget AnimatedEmojies 3` · `.teleget MonPack 1-8`',
        msg
      );
    }

    if (!config.telegram.botToken || config.telegram.botToken === 'TON_TOKEN_BOTFATHER') {
      return replyText(sock, jid, '⚠️ Ajoute ton token Telegram Bot dans config.js (telegram.botToken).', msg);
    }

    try {
      const setRes = await fetch(
        `https://api.telegram.org/bot${config.telegram.botToken}/getStickerSet?name=${encodeURIComponent(packName)}`
      );
      const setData = await setRes.json();

      if (!setData.ok) {
        return replyText(sock, jid, `❌ Pack introuvable : ${setData.description || 'erreur'}`, msg);
      }

      const packTitle = setData.result.title || packName;
      const allStickers = setData.result.stickers || [];
      const total = allStickers.length;

      if (!total) {
        return replyText(sock, jid, 'Pack vide.', msg);
      }

      const parsed = parseIndexArg(indexArg, total);
      if (!parsed) {
        return replyText(
          sock, jid,
          `Argument invalide. Utilise un numéro, un intervalle (ex: 1-10) ou all.\nPack : ${total} stickers.`,
          msg
        );
      }

      if (parsed.mode === 'all') {
        const supported = allStickers.filter(s => !s.is_animated);
        const toSend = supported.slice(0, MAX_ALL);
        const skipped = allStickers.length - supported.length;
        const capped = supported.length > MAX_ALL;
        let label = `Envoi de ${toSend.length} stickers`;
        if (skipped) label += ` (${skipped} Lottie ignorés)`;
        if (capped) label += `\n⚠️ Limité à ${MAX_ALL} par envoi`;
        return sendBatch(sock, jid, toSend, packTitle, msg, label);
      }

      if (parsed.mode === 'range') {
        let slice = allStickers.slice(parsed.from, parsed.to + 1);
        if (slice.length > MAX_RANGE) {
          slice = slice.slice(0, MAX_RANGE);
        }
        const from1 = parsed.from + 1;
        const to1 = parsed.from + slice.length;
        const label = `Intervalle *${from1}–${to1}* · ${slice.length} sticker(s) (${packTitle})`;
        return sendBatch(sock, jid, slice, packTitle, msg, label);
      }

      const sticker = allStickers[parsed.index];
      if (!sticker) {
        return replyText(
          sock, jid,
          `Numéro invalide (1 à ${total}).\nOu : \`.teleget ${packName} 1-5\` · \`.teleget ${packName} all\``,
          msg
        );
      }

      if (sticker.is_animated) {
        return replyText(
          sock, jid,
          '⚠️ Ce sticker est au format Lottie (.tgs) — non supporté (rendu trop lourd).',
          msg
        );
      }

      if (sticker.is_video) {
        await replyText(sock, jid, '🎬 Conversion du sticker animé…', msg);
      }

      const res = await sendOneSticker(sock, jid, sticker, packTitle, msg);
      if (!res.ok) {
        return replyText(sock, jid, '❌ Impossible de récupérer ce sticker.', msg);
      }
    } catch (err) {
      console.error('[teleget] erreur:', err);
      return replyText(
        sock, jid,
        '❌ Erreur en récupérant le(s) sticker(s). Vérifie ffmpeg si le pack contient des stickers vidéo.',
        msg
      );
    }
  }
};
