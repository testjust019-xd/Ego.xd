/**
 * Détecte les erreurs typiques YouTube / yt-dlp (surtout sur hébergeurs cloud).
 * Retourne un message utilisateur clair.
 */
function formatYtError(err, cmdLabel = 'téléchargement') {
  const raw = String(err?.message || err || '');
  const lower = raw.toLowerCase();

  if (
    /sign in to confirm|not a bot|confirm you.?re not a bot|login required|cookies? are? (needed|required)/i.test(
      raw
    ) ||
    /http error 403|http error 429|too many requests/i.test(raw)
  ) {
    return (
      `⛔ YouTube bloque le ${cmdLabel} depuis ce serveur (IP cloud / anti-bot).\n\n` +
      `Ce n'est *pas* un bug du bot : les IP Render / Railway / Heroku sont souvent refusées, ` +
      `même avec des cookies valides.\n\n` +
      `*Pistes :*\n` +
      `• Mettre à jour \`data/cookies.txt\` (export navigateur) ou la variable \`YTDLP_COOKIES\`\n` +
      `• Héberger le bot sur un VPS / machine perso (IP résidentielle)\n` +
      `• Réessayer plus tard ou un autre titre / lien`
    );
  }

  if (/video unavailable|private video|is not available/i.test(raw)) {
    return '❌ Vidéo indisponible (privée, supprimée ou restreinte par région).';
  }

  if (/ffmpeg|ffprobe/i.test(raw)) {
    return '❌ Erreur ffmpeg/ffprobe — vérifie que le binaire est installé (Dockerfile).';
  }

  if (/max.?filesize|file is larger/i.test(raw)) {
    return '❌ Fichier trop volumineux pour WhatsApp / limite yt-dlp.';
  }

  // Message court par défaut
  const short = raw.replace(/\n+/g, ' ').slice(0, 180);
  return `❌ Erreur ${cmdLabel} : ${short || 'inconnu'}`;
}

module.exports = { formatYtError };
