/**
 * Helpers édition média (ffmpeg) pour commandes .imgfirst / .cut / etc.
 */
const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

const execFileAsync = util.promisify(execFile);

let downloadContentFromMessage;
try {
  ({ downloadContentFromMessage } = require('baron-baileys-v2'));
} catch {
  downloadContentFromMessage = null;
}

function tmp(ext) {
  return path.join(os.tmpdir(), `ego_edit_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`);
}

function cleanup(...files) {
  for (const f of files) {
    try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch {}
  }
}

/** Récupère image/vidéo/audio du message (ou quoted) */
async function getQuotedMedia(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const target = quoted || msg.message;
  if (!target) return null;

  let type = null;
  let node = null;
  if (target.videoMessage) { type = 'video'; node = target.videoMessage; }
  else if (target.imageMessage) { type = 'image'; node = target.imageMessage; }
  else if (target.audioMessage) { type = 'audio'; node = target.audioMessage; }
  else if (target.documentMessage) {
    const mt = target.documentMessage.mimetype || '';
    if (mt.startsWith('video/')) { type = 'video'; node = target.documentMessage; }
    else if (mt.startsWith('image/')) { type = 'image'; node = target.documentMessage; }
    else if (mt.startsWith('audio/')) { type = 'audio'; node = target.documentMessage; }
  }

  if (!type || !node) return null;
  if (!downloadContentFromMessage) throw new Error('downloadContentFromMessage indisponible');

  const stream = await downloadContentFromMessage(node, type === 'document' ? 'document' : type);
  let buffer = Buffer.from([]);
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
  return { type, buffer, mimetype: node.mimetype || '' };
}

async function writeTemp(buffer, ext) {
  const file = tmp(ext);
  fs.writeFileSync(file, buffer);
  return file;
}

async function runFfmpeg(args, timeout = 120000) {
  await execFileAsync('ffmpeg', ['-y', ...args], { timeout, maxBuffer: 10 * 1024 * 1024 });
}

async function probeDuration(file) {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file],
      { timeout: 15000 }
    );
    const d = parseFloat(String(stdout).trim());
    return Number.isFinite(d) ? d : null;
  } catch {
    return null;
  }
}

/** Première frame → JPEG buffer */
async function extractFirstFrame(videoBuf) {
  const inn = await writeTemp(videoBuf, 'mp4');
  const out = tmp('jpg');
  try {
    await runFfmpeg(['-i', inn, '-vf', 'select=eq(n\\,0)', '-vframes', '1', '-q:v', '2', out]);
    return fs.readFileSync(out);
  } finally {
    cleanup(inn, out);
  }
}

/** Dernière frame → JPEG */
async function extractLastFrame(videoBuf) {
  const inn = await writeTemp(videoBuf, 'mp4');
  const out = tmp('jpg');
  try {
    const dur = await probeDuration(inn);
    if (dur && dur > 0.15) {
      const seek = Math.max(0, dur - 0.1);
      await runFfmpeg(['-ss', String(seek), '-i', inn, '-vframes', '1', '-q:v', '2', out]);
    } else {
      // fallback: reverse + first frame (plus lourd)
      await runFfmpeg(['-i', inn, '-vf', 'reverse', '-vframes', '1', '-q:v', '2', out]);
    }
    if (!fs.existsSync(out) || fs.statSync(out).size < 100) {
      throw new Error('frame vide');
    }
    return fs.readFileSync(out);
  } finally {
    cleanup(inn, out);
  }
}

/**
 * Coupe une vidéo
 * @param {string} start  "0" | "00:00:05" | "5"
 * @param {string|null} endOrDur  fin absolue ou durée si mode duration
 * @param {'end'|'duration'} mode
 */
async function cutVideo(videoBuf, start, endOrDur, mode = 'end') {
  const inn = await writeTemp(videoBuf, 'mp4');
  const out = tmp('mp4');
  try {
    const args = ['-ss', String(start), '-i', inn];
    if (mode === 'duration' && endOrDur != null) {
      args.push('-t', String(endOrDur));
    } else if (endOrDur != null) {
      args.push('-to', String(endOrDur));
    }
    args.push('-c', 'copy', '-avoid_negative_ts', 'make_zero', out);
    try {
      await runFfmpeg(args);
    } catch {
      // re-encode si copy échoue
      const args2 = ['-ss', String(start), '-i', inn];
      if (mode === 'duration' && endOrDur != null) args2.push('-t', String(endOrDur));
      else if (endOrDur != null) args2.push('-to', String(endOrDur));
      args2.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', out);
      await runFfmpeg(args2);
    }
    if (!fs.existsSync(out) || fs.statSync(out).size < 500) throw new Error('cut vide');
    return fs.readFileSync(out);
  } finally {
    cleanup(inn, out);
  }
}

async function speedVideo(videoBuf, factor) {
  const f = Math.min(4, Math.max(0.25, Number(factor) || 1));
  const inn = await writeTemp(videoBuf, 'mp4');
  const out = tmp('mp4');
  try {
    // setpts pour vidéo, atempo pour audio (atempo 0.5–2.0 chaîné)
    let atempo = [];
    let a = f;
    // atempo only 0.5-2.0
    while (a > 2.0) { atempo.push('atempo=2.0'); a /= 2; }
    while (a < 0.5) { atempo.push('atempo=0.5'); a /= 0.5; }
    atempo.push(`atempo=${a.toFixed(3)}`);
    const vf = `setpts=${(1 / f).toFixed(4)}*PTS`;
    const af = atempo.join(',');
    await runFfmpeg([
      '-i', inn,
      '-filter_complex', `[0:v]${vf}[v];[0:a]${af}[a]`,
      '-map', '[v]', '-map', '[a]',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
      '-c:a', 'aac', '-movflags', '+faststart', out
    ]);
    return fs.readFileSync(out);
  } finally {
    cleanup(inn, out);
  }
}

async function reverseVideo(videoBuf) {
  const inn = await writeTemp(videoBuf, 'mp4');
  const out = tmp('mp4');
  try {
    await runFfmpeg([
      '-i', inn,
      '-vf', 'reverse', '-af', 'areverse',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
      '-c:a', 'aac', '-movflags', '+faststart', out
    ]);
    return fs.readFileSync(out);
  } finally {
    cleanup(inn, out);
  }
}

async function extractAudio(videoBuf) {
  const inn = await writeTemp(videoBuf, 'mp4');
  const out = tmp('mp3');
  try {
    await runFfmpeg(['-i', inn, '-vn', '-c:a', 'libmp3lame', '-q:a', '4', out]);
    return fs.readFileSync(out);
  } finally {
    cleanup(inn, out);
  }
}

async function videoToGif(videoBuf, maxSec = 6) {
  const inn = await writeTemp(videoBuf, 'mp4');
  const out = tmp('gif');
  try {
    await runFfmpeg([
      '-i', inn, '-t', String(maxSec),
      '-vf', 'fps=12,scale=320:-1:flags=lanczos',
      '-loop', '0', out
    ]);
    return fs.readFileSync(out);
  } finally {
    cleanup(inn, out);
  }
}

/** Parse "1:30" | "90" | "1:30:00" → seconds string for ffmpeg */
function parseTime(str) {
  if (str == null || str === '') return null;
  const s = String(str).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return s;
  const parts = s.split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 2) return String(parts[0] * 60 + parts[1]);
  if (parts.length === 3) return String(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  return null;
}

module.exports = {
  getQuotedMedia,
  extractFirstFrame,
  extractLastFrame,
  cutVideo,
  speedVideo,
  reverseVideo,
  extractAudio,
  videoToGif,
  parseTime,
  probeDuration,
  cleanup
};
