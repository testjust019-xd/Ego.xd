/**
 * Stockage local des samples + IDs voix ElevenLabs
 */
const fs = require('fs');
const path = require('path');
const config = require('../config');

const DATA = path.join(__dirname, '..', 'data', 'voiceClones.json');
const SAMPLES = path.join(__dirname, '..', 'data', 'voiceSamples');

function load() {
  try { return JSON.parse(fs.readFileSync(DATA, 'utf-8')); } catch { return {}; }
}
function save(db) {
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  fs.writeFileSync(DATA, JSON.stringify(db, null, 2));
}
function ensureSamplesDir() {
  fs.mkdirSync(SAMPLES, { recursive: true });
}

function digits(jid) {
  return String(jid || '').split(':')[0].replace(/@.*$/, '').replace(/[^0-9]/g, '');
}

function getClone(ownerJid) {
  const db = load();
  return db[digits(ownerJid)] || null;
}

function setClone(ownerJid, data) {
  const db = load();
  const id = digits(ownerJid);
  db[id] = { ...(db[id] || {}), ...data, updatedAt: Date.now() };
  save(db);
  return db[id];
}

function deleteClone(ownerJid) {
  const db = load();
  const id = digits(ownerJid);
  if (!db[id]) return false;
  if (db[id].samplePath) {
    try { fs.unlinkSync(db[id].samplePath); } catch (_) {}
  }
  delete db[id];
  save(db);
  return true;
}

function saveSampleBuffer(ownerJid, buffer, ext = 'ogg') {
  ensureSamplesDir();
  const id = digits(ownerJid);
  const samplePath = path.join(SAMPLES, `${id}.${ext}`);
  fs.writeFileSync(samplePath, buffer);
  setClone(ownerJid, { samplePath, hasSample: true });
  return samplePath;
}

function hasApiKey() {
  const k = config.elevenlabs?.apiKey;
  return !!(k && k.length > 10);
}

/**
 * Upload sample → Instant Voice Clone ElevenLabs
 * @returns {{ ok, voiceId?, error? }}
 */
async function createElevenLabsVoice(name, samplePath) {
  if (!hasApiKey()) return { ok: false, error: 'NO_API_KEY' };
  const apiKey = config.elevenlabs.apiKey;

  const form = new FormData();
  form.append('name', name.slice(0, 100));
  form.append('description', 'EGO.XD WhatsApp voice clone');
  const blob = new Blob([fs.readFileSync(samplePath)]);
  form.append('files', blob, path.basename(samplePath));

  const res = await fetch('https://api.elevenlabs.io/v1/voices/add', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: data?.detail?.message || data?.detail || data?.message || `HTTP ${res.status}`
    };
  }
  return { ok: true, voiceId: data.voice_id };
}

/**
 * TTS avec une voice_id ElevenLabs → Buffer audio mpeg
 */
async function elevenLabsSpeak(voiceId, text) {
  if (!hasApiKey()) return { ok: false, error: 'NO_API_KEY' };
  const apiKey = config.elevenlabs.apiKey;
  const modelId = config.elevenlabs.modelId || 'eleven_multilingual_v2';

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg'
      },
      body: JSON.stringify({
        text: text.slice(0, 1000),
        model_id: modelId,
        voice_settings: { stability: 0.4, similarity_boost: 0.8 }
      })
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return { ok: false, error: err || `HTTP ${res.status}` };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return { ok: true, buffer: buf, mimetype: 'audio/mpeg' };
}

module.exports = {
  getClone,
  setClone,
  deleteClone,
  saveSampleBuffer,
  hasApiKey,
  createElevenLabsVoice,
  elevenLabsSpeak,
  digits
};
