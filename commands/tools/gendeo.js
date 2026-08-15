const config = require('../../config');
const { replyText, replyVideo } = require('../../helpers/reply');
const { downloadContentFromMessage } = require('baron-baileys-v2');

const API_BASE = 'https://apihub.agnes-ai.com';

/**
 * .gendeo — Génère une vidéo via Agnes AI (agnes-video-v2.0)
 *
 * Usage :
 *   .gendeo <prompt>                 → text-to-video
 *   .gendeo 3s|5s|10s <prompt>       → durée ciblée
 *   (répondre à une image) .gendeo <prompt>  → image-to-video
 */

function parseDuration(args) {
  if (!args.length) return { frames: null, rest: args };
  const first = args[0].toLowerCase();
  const map = {
    '3s': 81,
    '5s': 121,
    '10s': 241,
    '15s': 361,
    '18s': 441,
  };
  if (map[first]) {
    return { frames: map[first], rest: args.slice(1) };
  }
  const n = parseInt(first, 10);
  if (!isNaN(n) && n >= 3 && n <= 18 && String(n) === first) {
    const approx = Math.min(441, Math.max(81, Math.round((n * 24 - 1) / 8) * 8 + 1));
    return { frames: approx, rest: args.slice(1) };
  }
  return { frames: null, rest: args };
}

/** Télécharge l'image citée ou jointe */
async function getImageBuffer(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const node =
    quoted?.imageMessage ||
    quoted?.stickerMessage ||
    msg.message?.imageMessage ||
    msg.message?.stickerMessage ||
    null;

  if (!node) return null;

  try {
    const type = (quoted?.stickerMessage || msg.message?.stickerMessage) ? 'sticker' : 'image';
    const stream = await downloadContentFromMessage(node, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    if (buffer.length < 500) return null;
    return buffer;
  } catch (e) {
    console.error('[gendeo] image download', e.message);
    return null;
  }
}

/**
 * Upload temporaire vers un host public gratuit pour obtenir une URL
 * utilisable par Agnes (image-to-video).
 */
async function uploadImagePublic(buffer) {
  const hosts = [
    async () => {
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('fileToUpload', new Blob([buffer], { type: 'image/jpeg' }), 'img.jpg');
      const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form });
      const text = (await res.text()).trim();
      if (res.ok && text.startsWith('https://')) return text;
      throw new Error('catbox: ' + text.slice(0, 80));
    },
    async () => {
      const form = new FormData();
      form.append('file', new Blob([buffer], { type: 'image/jpeg' }), 'img.jpg');
      const res = await fetch('https://0x0.st', { method: 'POST', body: form });
      const text = (await res.text()).trim();
      if (res.ok && text.startsWith('https://')) return text;
      throw new Error('0x0: ' + text.slice(0, 80));
    },
    async () => {
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('time', '1h');
      form.append('fileToUpload', new Blob([buffer], { type: 'image/jpeg' }), 'img.jpg');
      const res = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
        method: 'POST',
        body: form,
      });
      const text = (await res.text()).trim();
      if (res.ok && text.startsWith('https://')) return text;
      throw new Error('litterbox: ' + text.slice(0, 80));
    },
  ];

  const errors = [];
  for (const upload of hosts) {
    try {
      const url = await upload();
      if (url) return url;
    } catch (e) {
      errors.push(e.message);
    }
  }
  throw new Error('Upload image échoué: ' + errors.join(' | '));
}

async function createVideoTask(apiKey, body) {
  const res = await fetch(`${API_BASE}/v1/videos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error?.message || data.message || JSON.stringify(data).slice(0, 200);
    throw new Error(`Création tâche échouée (${res.status}): ${msg}`);
  }
  const videoId = data.video_id || data.id || data.task_id;
  if (!videoId) throw new Error('Pas de video_id: ' + JSON.stringify(data).slice(0, 300));
  return { videoId, raw: data };
}

async function pollVideo(apiKey, videoId, opts) {
  const { pollIntervalMs = 8000, maxWaitMs = 360000 } = opts;
  const start = Date.now();
  let lastStatus = '';

  while (Date.now() - start < maxWaitMs) {
    const url = `${API_BASE}/agnesapi?video_id=${encodeURIComponent(videoId)}&model_name=agnes-video-v2.0`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json().catch(() => ({}));

    const status = (data.status || data.state || '').toLowerCase();
    if (status !== lastStatus) {
      lastStatus = status;
      console.log(`[gendeo] status=${status} progress=${data.progress ?? '?'}`);
    }

    if (status === 'completed' || status === 'success' || status === 'succeeded') {
      const videoUrl =
        data.metadata?.url ||
        data.url ||
        data.video_url ||
        data.output?.url ||
        data.data?.url;
      if (!videoUrl) {
        throw new Error('Vidéo terminée mais URL absente: ' + JSON.stringify(data).slice(0, 400));
      }
      return { url: videoUrl, data };
    }

    if (status === 'failed' || status === 'error') {
      const errMsg = data.error?.message || data.message || data.error || 'échec inconnu';
      throw new Error(`Génération échouée: ${errMsg}`);
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error(`Timeout après ${Math.round(maxWaitMs / 1000)}s (status: ${lastStatus || 'inconnu'})`);
}

async function downloadVideoBuffer(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Téléchargement vidéo HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 5000) throw new Error('Fichier vidéo trop petit / invalide');
  return buf;
}

module.exports = {
  name: 'gendeo',
  category: 'tools',
  description: 'Génère une vidéo Agnes AI (texte ou image→vidéo) — .gendeo [3s|5s|10s] <prompt>',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const apiKey = config.agnes?.apiKey;

    if (!apiKey || apiKey === 'TA_CLE_AGNES_ICI' || apiKey.includes('TA_CLE')) {
      return replyText(
        sock,
        jid,
        '⚠️ *.gendeo* nécessite une clé API Agnès.\n\n' +
          '1. Compte : https://platform.agnes-ai.com\n' +
          '2. Colle la clé dans `config.js` → `agnes.apiKey`\n\n' +
          'Docs : https://wiki.agnes-ai.com/en/docs/agnes-video-v20',
        msg
      );
    }

    const { frames, rest } = parseDuration(args);
    const prompt = rest.join(' ').trim();

    if (!prompt) {
      return replyText(
        sock,
        jid,
        '🎬 *Agnes Video* (.gendeo)\n\n' +
          '*Texte → vidéo :*\n' +
          '`.gendeo <description>`\n' +
          '`.gendeo 5s un chat sur la plage au soleil`\n\n' +
          '*Image → vidéo :*\n' +
          'Réponds à une *image* puis :\n' +
          '`.gendeo la personne se retourne lentement, caméra cinématique`\n\n' +
          'Durées : `3s` `5s`(défaut) `10s` `15s` `18s`',
        msg
      );
    }

    const cfg = config.agnes;
    const num_frames = frames || cfg.num_frames || 121;
    const frame_rate = cfg.frame_rate || 24;
    const estimatedSec = Math.round((num_frames / frame_rate) * 10) / 10;

    const imageBuffer = await getImageBuffer(msg);
    let imageUrl = null;
    let modeLabel = 'texte → vidéo';

    if (imageBuffer) {
      try {
        await replyText(sock, jid, '🖼️ Image détectée — upload pour image→vidéo…', msg);
        imageUrl = await uploadImagePublic(imageBuffer);
        modeLabel = 'image → vidéo';
        console.log('[gendeo] image url=', imageUrl);
      } catch (e) {
        console.error('[gendeo] upload', e.message);
        await replyText(
          sock,
          jid,
          `⚠️ Impossible d'uploader l'image (${e.message}).\nJe continue en *texte → vidéo* uniquement.`,
          msg
        );
      }
    }

    await replyText(
      sock,
      jid,
      `🎬 Génération Agnes (${modeLabel}, ~${estimatedSec}s)…\n` +
        `Prompt : ${prompt.slice(0, 100)}${prompt.length > 100 ? '…' : ''}\n` +
        `⏳ 30s à 3 min selon la file — patiente.`,
      msg
    );

    const body = {
      model: cfg.model || 'agnes-video-v2.0',
      prompt: prompt.slice(0, 3000),
      width: cfg.width || 1152,
      height: cfg.height || 768,
      num_frames,
      frame_rate,
    };

    if (imageUrl) {
      body.image = imageUrl;
    }

    try {
      const { videoId } = await createVideoTask(apiKey, body);
      console.log('[gendeo] video_id=', videoId);

      const { url } = await pollVideo(apiKey, videoId, {
        pollIntervalMs: cfg.pollIntervalMs || 8000,
        maxWaitMs: cfg.maxWaitMs || 360000,
      });

      await replyText(sock, jid, '✅ Vidéo prête, envoi…', msg);
      const buffer = await downloadVideoBuffer(url);

      return replyVideo(
        sock,
        jid,
        buffer,
        `🎬 ${prompt.slice(0, 80)}${prompt.length > 80 ? '…' : ''}\n_Agnes • ${modeLabel} • ~${estimatedSec}s_`,
        msg
      );
    } catch (err) {
      console.error('[gendeo]', err);
      return replyText(
        sock,
        jid,
        `❌ Erreur .gendeo : ${err.message || err}\n\nVérifie la clé API et les quotas Agnès.`,
        msg
      );
    }
  },
};
