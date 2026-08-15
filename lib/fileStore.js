/**
 * fileStore.js — métadonnées des fichiers hébergés via Telegram.
 * Les octets sont sur Telegram (file_id) ; ici on ne garde que les
 * infos nécessaires pour générer les liens publics /f/:id.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'data', 'files.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function save(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

/** Identifiant public court et non-devinable (base64url, ~11 caractères). */
function genId() {
  return crypto.randomBytes(8).toString('base64url');
}

/**
 * Enregistre un fichier hébergé.
 * @param {object} meta { filename, mimetype, size, file_id, message_id, uploaderIp?, expiresAt? }
 */
function create(meta) {
  const db = load();
  let id = genId();
  while (db[id]) id = genId(); // évite (improbable) collision
  db[id] = {
    id,
    filename: meta.filename,
    mimetype: meta.mimetype || 'application/octet-stream',
    size: meta.size || 0,
    file_id: meta.file_id,
    message_id: meta.message_id || null,
    downloads: 0,
    createdAt: Date.now(),
    expiresAt: meta.expiresAt || null // null = pas d'expiration
  };
  save(db);
  return db[id];
}

function get(id) {
  const db = load();
  const entry = db[id];
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) return null;
  return entry;
}

function registerDownload(id) {
  const db = load();
  if (!db[id]) return;
  db[id].downloads = (db[id].downloads || 0) + 1;
  db[id].lastDownloadAt = Date.now();
  save(db);
}

function remove(id) {
  const db = load();
  if (!db[id]) return false;
  delete db[id];
  save(db);
  return true;
}

function list() {
  return Object.values(load()).sort((a, b) => b.createdAt - a.createdAt);
}

module.exports = { create, get, registerDownload, remove, list };
