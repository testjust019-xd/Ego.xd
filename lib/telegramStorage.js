/**
 * telegramStorage.js — utilise un chat Telegram comme "disque dur" gratuit.
 *
 * Principe : on envoie le fichier à un chat privé (channel/groupe) via le
 * Bot API. Telegram nous renvoie un file_id. On garde juste ce file_id
 * (dans data/files.json via fileStore.js) — les octets restent sur les
 * serveurs Telegram, jamais sur notre disque.
 *
 * Deux modes, contrôlés par TG_API_BASE dans .env :
 *  - API standard (https://api.telegram.org)      → upload 50MB / download 20MB max
 *  - Local Bot API Server auto-hébergé (Docker)    → jusqu'à ~2GB dans les deux sens
 *    (voir https://github.com/tdlib/telegram-bot-api — image docker prête à
 *    l'emploi, ex. dhanushreddy29/telegram-bot-api)
 *
 * IMPORTANT : ne jamais renvoyer au client l'URL
 * "<apiBase>/file/bot<TOKEN>/<path>" directement — elle contient le token
 * du bot en clair. On stream toujours le fichier via notre propre serveur
 * (voir web/fileHost.js).
 */
const config = require('../config');

function cfg() {
  const c = config.telegramStorage || {};
  return {
    botToken: process.env.TG_STORAGE_BOT_TOKEN || c.botToken || '',
    chatId: process.env.TG_STORAGE_CHAT_ID || c.chatId || '',
    apiBase: (process.env.TG_API_BASE || c.apiBase || 'https://api.telegram.org').replace(/\/+$/, ''),
    maxUploadMB: parseInt(process.env.TG_MAX_UPLOAD_MB || c.maxUploadMB || '45', 10)
  };
}

function isConfigured() {
  const { botToken, chatId } = cfg();
  return !!(botToken && chatId);
}

function apiUrl(method) {
  const { apiBase, botToken } = cfg();
  return `${apiBase}/bot${botToken}/${method}`;
}

function fileUrl(filePath) {
  const { apiBase, botToken } = cfg();
  return `${apiBase}/file/bot${botToken}/${filePath}`;
}

/**
 * Envoie un Buffer au chat de stockage.
 * @returns {{ file_id, file_unique_id, file_name, file_size, message_id }}
 */
async function uploadBuffer(buffer, filename, mimetype) {
  const { chatId, maxUploadMB } = cfg();
  if (!isConfigured()) {
    throw new Error('Stockage Telegram non configuré (TG_STORAGE_BOT_TOKEN / TG_STORAGE_CHAT_ID manquants).');
  }
  const maxBytes = maxUploadMB * 1024 * 1024;
  if (buffer.length > maxBytes) {
    throw new Error(`Fichier trop volumineux (max ${maxUploadMB}MB avec la config actuelle).`);
  }

  const form = new FormData();
  form.append('chat_id', chatId);
  // disable_content_type_detection évite que Telegram compresse/transforme le fichier
  form.append('document', new Blob([buffer], { type: mimetype || 'application/octet-stream' }), filename);

  const res = await fetch(apiUrl('sendDocument'), { method: 'POST', body: form });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.description || `Échec upload Telegram (HTTP ${res.status})`);
  }

  const doc = data.result.document || data.result.video || data.result.audio;
  if (!doc) throw new Error('Réponse Telegram inattendue (pas de document).');

  return {
    file_id: doc.file_id,
    file_unique_id: doc.file_unique_id,
    file_name: doc.file_name || filename,
    file_size: doc.file_size || buffer.length,
    message_id: data.result.message_id
  };
}

/** Résout un file_id en chemin distant (nécessaire avant de pouvoir le télécharger). */
async function resolveFilePath(fileId) {
  const res = await fetch(`${apiUrl('getFile')}?file_id=${encodeURIComponent(fileId)}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || 'Impossible de résoudre le fichier (getFile).');
  return data.result.file_path;
}

/**
 * Retourne un stream (Response.body) + les en-têtes utiles pour relayer
 * le fichier au client sans jamais exposer l'URL Telegram/le token.
 */
async function openDownloadStream(fileId) {
  const filePath = await resolveFilePath(fileId);
  const res = await fetch(fileUrl(filePath));
  if (!res.ok || !res.body) throw new Error(`Téléchargement Telegram impossible (HTTP ${res.status})`);
  return res;
}

/** Supprime le message de stockage (donc invalide le file_id) — pour un vrai "delete". */
async function deleteStoredMessage(messageId) {
  const { chatId } = cfg();
  const res = await fetch(apiUrl('deleteMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId })
  });
  const data = await res.json();
  return !!data.ok;
}

module.exports = {
  cfg,
  isConfigured,
  uploadBuffer,
  resolveFilePath,
  openDownloadStream,
  deleteStoredMessage
};
