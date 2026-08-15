const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { getCookieArgs } = require('./ytDlpCookies');

const execFileAsync = util.promisify(execFile);

/** Télécharge une vidéo via yt-dlp, retourne un Buffer ou null si échec */
async function downloadVideo(url, maxSizeMB = 50) {
  const tempBase = path.join(os.tmpdir(), `dl_${Date.now()}_${Math.floor(Math.random() * 10000)}`);

  await execFileAsync('yt-dlp', [
    ...getCookieArgs(),
    '-f', 'mp4/best',
    '--max-filesize', `${maxSizeMB}M`,
    '-o', `${tempBase}.%(ext)s`,
    url
  ]);

  const filePath = `${tempBase}.mp4`;
  if (!fs.existsSync(filePath)) return null;

  const buffer = fs.readFileSync(filePath);
  fs.unlinkSync(filePath);
  return buffer;
}

module.exports = { downloadVideo };
