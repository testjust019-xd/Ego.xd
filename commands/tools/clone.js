/**
 * .clone — cloner une voix (sample) puis parler avec
 *
 * Usage :
 *   Répondre à un vocal → .clone
 *   .clone say <texte>     — parle avec ta voix clonée
 *   .clone status
 *   .clone del
 *
 * Requiert ELEVENLABS_API_KEY pour le vrai clone + TTS.
 * Sans clé : le sample est stocké localement uniquement.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);

const config = require('../../config');
const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const {
  getClone,
  setClone,
  deleteClone,
  saveSampleBuffer,
  hasApiKey,
  createElevenLabsVoice,
  elevenLabsSpeak
} = require('../../lib/voiceClone');

const downloadMedia =
  global.__baronDownloadMediaMessage ||
  (() => {
    try { return require('baron-baileys-v2').downloadMediaMessage; }
    catch { return null; }
  })();

function getQuoted(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
    null
  );
}

function getQuotedKey(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.stanzaId) return null;
  return {
    remoteJid: msg.key.remoteJid,
    id: ctx.stanzaId,
    fromMe: ctx.participant ? false : undefined,
    participant: ctx.participant
  };
}

async function downloadQuotedAudio(sock, msg) {
  const quoted = getQuoted(msg);
  if (!quoted) return null;
  const audio =
    quoted.audioMessage ||
    quoted.pttMessage ||
    (quoted.documentMessage?.mimetype || '').startsWith('audio/')
      ? quoted.documentMessage
      : null;
  // ptt is audioMessage with ptt flag usually
  const node = quoted.audioMessage || null;
  if (!node) return null;
  if (!downloadMedia) throw new Error('downloadMediaMessage indisponible');

  // Baileys expects full message shape
  const full = {
    key: getQuotedKey(msg) || msg.key,
    message: { audioMessage: node }
  };
  const buffer = await downloadMedia(full, 'buffer');
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

async function toOggIfNeeded(inputBuf, extHint) {
  // ElevenLabs accepte mp3/wav/ogg/m4a — on garde brut si possible
  return { buffer: inputBuf, ext: extHint || 'ogg' };
}

module.exports = {
  name: 'clone',
  aliases: ['voiceclone', 'voix'],
  category: 'tools',
  description:
    'Clone une voix (réponds à un vocal) puis parle — .clone | .clone say <texte> | .clone status | .clone del',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const sub = (args[0] || '').toLowerCase();

    // ── status ──
    if (sub === 'status' || sub === 'info') {
      const c = getClone(sender);
      if (!c?.hasSample && !c?.voiceId) {
        return replyText(
          sock, jid,
          `🎙 *Voice Clone*\n\nAucune voix enregistrée.\n` +
            `Réponds à un *vocal* avec \`.clone\` pour capturer la voix.\n\n` +
            `API ElevenLabs : ${hasApiKey() ? '✅ configurée' : '❌ absente (sample local only)'}`,
          msg
        );
      }
      return replyText(
        sock, jid,
        `🎙 *Voice Clone — status*\n\n` +
          `Sample local : ${c.hasSample ? '✅' : '❌'}\n` +
          `Voix ElevenLabs : ${c.voiceId ? '✅ ' + c.voiceId.slice(0, 8) + '…' : '❌'}\n` +
          `API : ${hasApiKey() ? '✅' : '❌'}\n\n` +
          `➤ \`.clone say Bonjour\` pour parler`,
        msg
      );
    }

    // ── delete ──
    if (sub === 'del' || sub === 'delete' || sub === 'remove' || sub === 'rm') {
      const ok = deleteClone(sender);
      // best effort delete remote voice
      if (ok && hasApiKey()) {
        const c = getClone(sender);
        // already deleted locally; remote cleanup optional skipped
      }
      return replyText(
        sock, jid,
        ok ? '🗑 Voix clonée supprimée.' : 'Rien à supprimer.',
        msg
      );
    }

    // ── say / speak / tts ──
    if (sub === 'say' || sub === 'speak' || sub === 'tts' || sub === 'parle') {
      const text = args.slice(1).join(' ').trim();
      if (!text) {
        return replyText(sock, jid, 'Usage : `.clone say <texte>`\nEx : `.clone say Salut la team`', msg);
      }
      const c = getClone(sender);
      if (!c?.voiceId) {
        return replyText(
          sock, jid,
          `❌ Pas de voix ElevenLabs active.\n` +
            (c?.hasSample
              ? `Tu as un sample local. Relance \`.clone\` après avoir mis *ELEVENLABS_API_KEY* dans config / env.\n`
              : `Réponds d’abord à un vocal avec \`.clone\`.\n`) +
            `_Sans API ElevenLabs, le vrai clone vocal n’est pas possible._`,
          msg
        );
      }
      await replyText(sock, jid, '🔊 Génération du vocal…', msg);
      const r = await elevenLabsSpeak(c.voiceId, text);
      if (!r.ok) {
        return replyText(sock, jid, `❌ TTS échoué : ${r.error}`, msg);
      }
      await sock.sendMessage(
        jid,
        { audio: r.buffer, mimetype: r.mimetype || 'audio/mpeg', ptt: true },
        { quoted: msg }
      );
      return;
    }

    // ── capture sample (reply to audio) ──
    if (sub && !['clone'].includes(sub)) {
      // maybe user did .clone <text> without say
      if (args.length >= 1 && !getQuoted(msg)?.audioMessage) {
        // treat as say if they have voice
        const c = getClone(sender);
        if (c?.voiceId) {
          const text = args.join(' ').trim();
          await replyText(sock, jid, '🔊 Génération…', msg);
          const r = await elevenLabsSpeak(c.voiceId, text);
          if (!r.ok) return replyText(sock, jid, `❌ ${r.error}`, msg);
          await sock.sendMessage(
            jid,
            { audio: r.buffer, mimetype: 'audio/mpeg', ptt: true },
            { quoted: msg }
          );
          return;
        }
      }
    }

    let buffer;
    try {
      buffer = await downloadQuotedAudio(sock, msg);
    } catch (err) {
      console.error('[clone] download:', err.message);
      return replyText(sock, jid, `❌ Téléchargement audio impossible : ${err.message}`, msg);
    }

    if (!buffer || buffer.length < 1000) {
      return replyText(
        sock, jid,
        `🎙 *Voice Clone*\n\n` +
          `1. Quelqu’un envoie un *vocal* (idéalement 10–30 s, voix claire)\n` +
          `2. *Réponds* à ce message avec \`.clone\`\n` +
          `3. Puis \`.clone say Ton texte\`\n\n` +
          `⚠️ Clone uniquement avec *accord* de la personne.\n` +
          `API : ${hasApiKey() ? 'ElevenLabs ✅' : 'ElevenLabs ❌ — ajoute ELEVENLABS_API_KEY'}`,
        msg
      );
    }

    // Limite taille ~ 3 Mo
    if (buffer.length > 3_500_000) {
      return replyText(sock, jid, '❌ Audio trop lourd (max ~3 Mo). Prends un vocal plus court.', msg);
    }

    const samplePath = saveSampleBuffer(sender, buffer, 'ogg');
    let msgOut =
      `✅ *Sample vocal enregistré* (${Math.round(buffer.length / 1024)} Ko)\n`;

    if (!hasApiKey()) {
      msgOut +=
        `\n⚠️ Pas de clé *ElevenLabs* → clone cloud impossible pour l’instant.\n` +
        `Ajoute dans \`config.js\` ou env :\n` +
        `\`ELEVENLABS_API_KEY=sk_...\`\n` +
        `Puis refais \`.clone\` sur le même vocal (ou \`.clone\` sans reply si sample déjà là).\n`;
      return replyText(sock, jid, msgOut, msg);
    }

    await replyText(sock, jid, msgOut + `\n☁️ Envoi vers ElevenLabs (Instant Voice Clone)…`, msg);

    try {
      const name = `ego_${String(sender).replace(/[^0-9]/g, '').slice(-8)}_${Date.now().toString(36)}`;
      const created = await createElevenLabsVoice(name, samplePath);
      if (!created.ok) {
        return replyText(
          sock, jid,
          `❌ Clone ElevenLabs échoué : ${created.error}\n` +
            `_Le plan gratuit ElevenLabs ne permet souvent pas l’Instant Voice Clone._`,
          msg
        );
      }
      setClone(sender, { voiceId: created.voiceId, hasSample: true, samplePath });
      return replyText(
        sock, jid,
        `🎭 *Voix clonée prête !*\n\n` +
          `ID : \`${created.voiceId.slice(0, 12)}…\`\n` +
          `➤ \`.clone say Bonjour les chasseurs\`\n` +
          `➤ \`.clone status\` · \`.clone del\``,
        msg
      );
    } catch (err) {
      console.error('[clone] elevenlabs:', err);
      return replyText(sock, jid, `❌ Erreur clone : ${err.message}`, msg);
    }
  }
};
