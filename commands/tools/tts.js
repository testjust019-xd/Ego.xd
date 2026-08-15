const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { replyText } = require('../../helpers/reply');

const execFileAsync = util.promisify(execFile);

const MAX_CHARS = 500;

function cleanup(...files) {
  for (const f of files) {
    try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
  }
}

/**
 * Génère le WAV avec le premier binaire eSpeak disponible.
 * Debian/Docker (bookworm) fournit `espeak-ng` ; certains environnements
 * Termux n'ont que `espeak` (classique). On essaie les deux, dans cet ordre.
 */
async function synthesize(text, wavPath) {
  const candidates = ['espeak-ng', 'espeak'];
  let lastErr = null;

  for (const bin of candidates) {
    try {
      // -v fr = voix française, -w = écrit dans un fichier au lieu de jouer le son
      await execFileAsync(bin, ['-v', 'fr', '-w', wavPath, text]);
      return { ok: true, bin };
    } catch (err) {
      lastErr = err;
      // ENOENT = binaire absent, on tente le suivant. Autre erreur = on arrête.
      if (err.code !== 'ENOENT') break;
    }
  }
  return { ok: false, error: lastErr };
}

module.exports = {
  name: "tts",
  category: "tools",
  description: "Texte → vocal WhatsApp (espeak local) — .tts <texte>",

  dailyLimit: true,
  // ⚠️ REQUIERT : espeak-ng (ou espeak) installé, + ffmpeg pour la conversion
  // en vocal WhatsApp (OGG/Opus). Le Dockerfile du projet installe déjà les
  // deux. Pour un environnement Termux : pkg install espeak-ng ffmpeg
  // (ou pkg install espeak si espeak-ng n'est pas dispo sur ton mirror).
  // Volontairement PAS basé sur l'API interne non-officielle de Google
  // Translate (souvent utilisée par d'autres bots) — ce genre de service
  // scrapé peut casser sans prévenir. espeak tourne en local : voix plus
  // robotique, mais ça marche TOUJOURS, sans clé, sans quota, sans réseau.
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const text = args.join(' ');

    if (!text) {
      return replyText(sock, jid, "Écris un texte, ex: .tts Bonjour tout le monde", msg);
    }

    if (text.length > MAX_CHARS) {
      return replyText(sock, jid, `Texte trop long (max ${MAX_CHARS} caractères).`, msg);
    }

    const stamp = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const wavFile = path.join(os.tmpdir(), `tts_${stamp}.wav`);
    const oggFile = path.join(os.tmpdir(), `tts_${stamp}.ogg`);

    try {
      const synth = await synthesize(text, wavFile);

      if (!synth.ok || !fs.existsSync(wavFile)) {
        const missingBinary = synth.error?.code === 'ENOENT';
        return replyText(
          sock, jid,
          missingBinary
            ? "❌ La génération audio a échoué : espeak-ng/espeak n'est pas installé sur le serveur.\n" +
              "_Le Dockerfile du bot a été corrigé pour l'installer — redéploie l'image pour appliquer le correctif._"
            : "❌ La génération audio a échoué.",
          msg
        );
      }

      // Conversion WAV → OGG/Opus : format attendu par WhatsApp pour un
      // vrai vocal (ptt) avec forme d'onde. Envoyer du WAV brut en ptt
      // fonctionne parfois mal ou pas du tout selon le client WhatsApp.
      try {
        await execFileAsync('ffmpeg', [
          '-y', '-i', wavFile,
          '-c:a', 'libopus', '-b:a', '32k', '-ar', '48000', '-ac', '1',
          oggFile
        ]);
      } catch (ffmpegErr) {
        console.error('[tts] ffmpeg conversion échouée, envoi du WAV brut en secours:', ffmpegErr.message);
        // Secours : on envoie quand même le WAV si ffmpeg est absent/échoue,
        // plutôt que de faire échouer toute la commande.
        const buffer = fs.readFileSync(wavFile);
        await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/wav', ptt: true }, { quoted: msg });
        return;
      }

      const buffer = fs.readFileSync(oggFile);
      await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: msg });
    } catch (err) {
      console.error('[tts] erreur:', err.message);
      return replyText(sock, jid, "Erreur lors de la génération/l'envoi de l'audio.", msg);
    } finally {
      cleanup(wavFile, oggFile);
    }
  }
};
