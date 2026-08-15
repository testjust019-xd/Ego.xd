/**
 * .asama — Recherche + téléchargement d'épisodes depuis Anime-Sama
 *
 * Flux interactif (comme .play2) :
 *   .asama <nom>          → liste des animes
 *   .asama <n>            → choisit l'anime → liste des saisons
 *   .asama <n>            → choisit la saison → liste des épisodes
 *   .asama <n>            → choisit l'épisode → télécharge (qualité adaptée + split si > ~95 Mo)
 *
 * Dépendances système (déjà utilisées ailleurs dans le bot) :
 *   - yt-dlp
 *   - ffmpeg
 */

const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { replyText, replyImage, replyTextDecor, playSfx } = require('../../helpers/reply');
const { progressBar, createProgress } = require('../../lib/progressBar');
const { getActiveTheme } = require('../../lib/themeManager');
const { searchViaPython } = require('../../lib/asamaPythonBridge');
const { setSession, getSession, clearSession } = require('../../lib/asamaSessions');
const { getCookieArgs } = require('../../lib/ytDlpCookies');
const {
  findSiteUrl,
  searchAnime,
  getSeasons,
  getEpisodes,
} = require('../../lib/asamaScraper');

const execFileAsync = util.promisify(execFile);

const MAX_PART_MB = 90;          // taille max par message WhatsApp
const YTDLP_MAX_MB = 95;         // limite yt-dlp avant split
const SESSION_TTL = 150000;      // 2 min 30

function tmpBase(prefix = 'asama') {
  return path.join(os.tmpdir(), `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`);
}

/** Télécharge avec yt-dlp en forçant une taille / qualité raisonnable */
async function downloadWithYtDlp(url, outBase) {
  // 1er essai : meilleure qualité sous la limite
  const argsCommon = [
    '--no-playlist',
    '--max-filesize', `${YTDLP_MAX_MB}M`,
    '-o', `${outBase}.%(ext)s`,
    '--no-warnings',
    '--no-progress',
  ];

  // Préfère mp4 ≤ 720p puis 480p
  const formatTries = [
    'bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/b[height<=720]',
    'bv*[height<=480][ext=mp4]+ba[ext=m4a]/b[height<=480][ext=mp4]/b[height<=480]',
    'best[height<=720]/best[height<=480]/best',
  ];

  for (const format of formatTries) {
    try {
      await execFileAsync('yt-dlp', [
        ...getCookieArgs(),
        ...argsCommon,
        '-f', format,
        '--merge-output-format', 'mp4',
        url,
      ], { timeout: 180000 });

      // Cherche le fichier produit
      const candidates = [
        `${outBase}.mp4`,
        `${outBase}.mkv`,
        `${outBase}.webm`,
      ];
      for (const f of candidates) {
        if (fs.existsSync(f) && fs.statSync(f).size > 10000) {
          return f;
        }
      }
    } catch (e) {
      // on essaie le format suivant
    }
  }

  // Dernier recours : laisser yt-dlp choisir (peut échouer sur la taille)
  try {
    await execFileAsync('yt-dlp', [
        ...getCookieArgs(),
      ...argsCommon,
      '-f', 'best',
      '--merge-output-format', 'mp4',
      url,
    ], { timeout: 180000 });
    for (const ext of ['mp4', 'mkv', 'webm']) {
      const f = `${outBase}.${ext}`;
      if (fs.existsSync(f) && fs.statSync(f).size > 10000) return f;
    }
  } catch (_) {}

  return null;
}

/** Découpe une vidéo en parties ≤ maxMb avec ffmpeg */
async function splitVideo(filePath, maxMb = MAX_PART_MB) {
  const stat = fs.statSync(filePath);
  const sizeMb = stat.size / (1024 * 1024);
  if (sizeMb <= maxMb) return [filePath];

  // Estimation durée pour calculer le segment time
  let duration = 0;
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    duration = parseFloat(stdout) || 0;
  } catch (_) {}

  if (!duration || duration < 10) {
    // Fallback : on renvoie le fichier tel quel (WhatsApp troncera peut-être)
    return [filePath];
  }

  const partsNeeded = Math.ceil(sizeMb / maxMb);
  const segmentTime = Math.max(30, Math.floor(duration / partsNeeded));

  const outPattern = filePath.replace(/\.[^.]+$/, '') + '_part%03d.mp4';
  try {
    await execFileAsync('ffmpeg', [
      '-y', '-i', filePath,
      '-c', 'copy',
      '-map', '0',
      '-segment_time', String(segmentTime),
      '-f', 'segment',
      '-reset_timestamps', '1',
      outPattern,
    ], { timeout: 120000 });
  } catch (e) {
    console.error('[asama] split ffmpeg error:', e.message);
    return [filePath];
  }

  const dir = path.dirname(filePath);
  const base = path.basename(filePath).replace(/\.[^.]+$/, '');
  const parts = fs.readdirSync(dir)
    .filter(f => f.startsWith(base + '_part') && f.endsWith('.mp4'))
    .map(f => path.join(dir, f))
    .sort();

  if (parts.length === 0) return [filePath];
  return parts;
}

/** Envoie un fichier vidéo (ou plusieurs parties) */
async function sendVideoParts(sock, jid, parts, caption, quoted) {
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const buf = fs.readFileSync(part);
    const partCap = parts.length > 1
      ? `${caption}\n📦 Partie ${i + 1}/${parts.length}`
      : caption;

    await sock.sendMessage(jid, {
      video: buf,
      caption: partCap,
      mimetype: 'video/mp4',
    }, { quoted });

    // Petite pause entre les parties pour éviter le rate-limit
    if (i < parts.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

function cleanup(files) {
  for (const f of files) {
    try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
  }
}

module.exports = {
  name: 'asama',
  category: 'anime',
  description: 'Anime-Sama : recherche + téléchargement d\'épisodes — .asama <nom>',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const session = getSession(jid);
    const firstArg = args[0];
    const maybeIndex = parseInt(firstArg, 10);

    // ──────────────────────────────────────────────
    // Étape de sélection (numéro)
    // ──────────────────────────────────────────────
    if (session && args.length === 1 && !isNaN(maybeIndex)) {
      const choice = maybeIndex - 1;

      // --- Étape : choix de l'anime ---
      if (session.step === 'search') {
        const anime = session.results[choice];
        if (!anime) {
          return replyText(sock, jid, `Choisis un numéro entre 1 et ${session.results.length}.`, msg);
        }

        await replyText(sock, jid, `🔍 Chargement des saisons de *${anime.title}*...`, msg);
        try {
          const seasons = await getSeasons(anime.url);
          if (!seasons.length) {
            clearSession(jid);
            return replyText(sock, jid, 'Aucune saison trouvée.', msg);
          }

          let text = `📺 *${anime.title}*\n\nChoisis une saison :\n\n`;
          seasons.forEach((s, i) => {
            const lang = s.lang ? ` [${s.lang.toUpperCase()}]` : '';
            text += `${i + 1}. ${s.name}${lang}\n`;
          });
          text += `\n➡️ Réponds avec \`.asama <numéro>\``;

          setSession(jid, {
            step: 'season',
            anime,
            seasons,
            siteUrl: session.siteUrl,
          }, SESSION_TTL);

          return replyText(sock, jid, text, msg);
        } catch (e) {
          console.error('[asama] seasons', e);
          clearSession(jid);
          return replyText(sock, jid, 'Erreur en récupérant les saisons.', msg);
        }
      }

      // --- Étape : choix de la saison ---
      if (session.step === 'season') {
        const season = session.seasons[choice];
        if (!season) {
          return replyText(sock, jid, `Choisis un numéro entre 1 et ${session.seasons.length}.`, msg);
        }

        await replyText(sock, jid, `📺 Chargement des épisodes (${season.name})...`, msg);
        try {
          // Si la saison n'a pas de langue dans le path, on essaie vostfr puis vf
          let episodes = await getEpisodes(season.url);
          let usedUrl = season.url;

          if (episodes.length === 0 && !season.lang) {
            for (const lang of ['vostfr', 'vf']) {
              const tryUrl = season.url.replace(/\/?$/, '/') + lang + '/';
              episodes = await getEpisodes(tryUrl);
              if (episodes.length) {
                usedUrl = tryUrl;
                break;
              }
            }
          }

          if (!episodes.length) {
            // On donne au moins le lien de la page
            clearSession(jid);
            return replyText(
              sock, jid,
              `Aucun épisode extrait automatiquement.\n\nLien direct :\n${season.url}`,
              msg
            );
          }

          let text = `🎬 *${session.anime.title}* — ${season.name}\n`;
          text += `${episodes.length} épisode(s)\n\n`;
          episodes.slice(0, 40).forEach((ep, i) => {
            text += `${i + 1}. ${ep.title} (${ep.players.length} player${ep.players.length > 1 ? 's' : ''})\n`;
          });
          if (episodes.length > 40) text += `... et ${episodes.length - 40} de plus\n`;
          text += `\n➡️ \`.asama <numéro>\` pour télécharger`;

          setSession(jid, {
            step: 'episode',
            anime: session.anime,
            season,
            episodes,
            seasonUrl: usedUrl,
            siteUrl: session.siteUrl,
          }, SESSION_TTL);

          return replyText(sock, jid, text, msg);
        } catch (e) {
          console.error('[asama] episodes', e);
          clearSession(jid);
          return replyText(sock, jid, 'Erreur en récupérant les épisodes.', msg);
        }
      }

      // --- Étape : choix de l'épisode → DOWNLOAD ---
      if (session.step === 'episode') {
        const ep = session.episodes[choice];
        if (!ep) {
          return replyText(sock, jid, `Choisis un numéro entre 1 et ${session.episodes.length}.`, msg);
        }

        clearSession(jid);
        const progress = createProgress(sock, jid, msg);
        const title = session.anime.title;
        const epTitle = ep.title;

        await progress.update(
          `⬇️ *${title}*\n📺 ${epTitle}\n${progressBar(1, 4)}\n_Étape 1/4 — préparation_`
        );

        const players = ep.players || [];
        if (!players.length) {
          await progress.update('❌ Aucun player pour cet épisode.');
          return;
        }

        const preferred = ['sibnet', 'sendvid', 'vidmoly', 'voe', 'filemoon', 'uqload'];
        const sorted = [...players].sort((a, b) => {
          const ia = preferred.findIndex(p => a.name.toLowerCase().includes(p));
          const ib = preferred.findIndex(p => b.name.toLowerCase().includes(p));
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });

        let downloadedFile = null;
        const base = tmpBase('asama_ep');
        const tried = [];

        await progress.update(
          `⬇️ *${title}*\n📺 ${epTitle}\n${progressBar(2, 4)}\n_Étape 2/4 — téléchargement_`
        );

        for (let pi = 0; pi < sorted.length; pi++) {
          const p = sorted[pi];
          tried.push(p.name);
          await progress.update(
            `⬇️ *${title}*\n📺 ${epTitle}\n${progressBar(2, 4)}\n_Player ${p.name} (${pi + 1}/${sorted.length})_`
          );
          try {
            downloadedFile = await downloadWithYtDlp(p.url, base);
            if (downloadedFile) break;
          } catch (e) {
            console.error(`[asama] player ${p.name} fail:`, e.message);
          }
        }

if (!downloadedFile) {
          // Fallback : envoie les liens
          let links = `❌ Téléchargement auto échoué.\n\n*${session.anime.title}* — ${ep.title}\n\nLiens players :\n`;
          sorted.slice(0, 6).forEach((p, i) => {
            links += `${i + 1}. ${p.name}\n${p.url}\n\n`;
          });
          links += `Page saison :\n${session.seasonUrl}`;
          return replyText(sock, jid, links, msg);
        }

        // Split si nécessaire
        let parts = [downloadedFile];
        try {
          parts = await splitVideo(downloadedFile, MAX_PART_MB);
        } catch (e) {
          console.error('[asama] split error', e.message);
        }

        const caption = `🎬 *${session.anime.title}*\n${ep.title}`;
        try {
        await progress.update(`📦 *${title}*
📺 ${epTitle}
${progressBar(3, 4)}
_Étape 3/4 — préparation envoi_`);

          await sendVideoParts(sock, jid, parts, caption, msg);
        await progress.update(`✅ *${title}*\n📺 ${epTitle}\n${progressBar(4, 4)}\n_Étape 4/4 — envoyé_`);
        } catch (e) {
          console.error('[asama] send error', e.message);
          await replyText(sock, jid, 'Erreur lors de l\'envoi de la vidéo (fichier trop lourd ?).', msg);
        } finally {
          cleanup([downloadedFile, ...parts]);
        }
        return;
      }
    }

    // ──────────────────────────────────────────────

    // ──────────────────────────────────────────────
    // Nouvelle recherche
    // ──────────────────────────────────────────────
    const query = args.join(' ').trim();
    if (!query) {
      const theme = getActiveTheme();
      const tag = theme.asamaTag || '📺 ASAMA';
      const body =
        tag + ' *Anime Downloader*\n' +
        'Thème : *' + (theme.displayName || 'Triple Ego') + '*\n\n' +
        'Utilisation :\n`.asama <nom de l\'anime>`\n\n' +
        'Navigation : numéro (anime → saison → épisode)\n\n' +
        'Sources : Anime-Sama (JS) + fallback Python\n' +
        '_Épisodes lourds → qualité réduite / split auto._\n' +
        (theme.quote ? '\n_' + theme.quote + '_' : '');
      return replyTextDecor(sock, jid, body, msg, null, 0.7, theme.displayName || 'tripleego', 0.35);
    }

    const theme = getActiveTheme();
    const tag = theme.asamaTag || '📺 ASAMA';
    await replyText(sock, jid, tag + ' 🔎 Recherche de *' + query + '*…', msg);
    try { await playSfx(sock, jid, 'click', msg, 0.4); } catch (_) {}

    try {
      let siteUrl = null;
      let results = [];
      let source = 'anime-sama';

      try {
        siteUrl = await findSiteUrl();
        results = await searchAnime(query, siteUrl, 10);
      } catch (e1) {
        console.error('[asama] JS search fail:', e1.message);
      }

      if (!results.length) {
        const pyResults = await searchViaPython(query);
        if (pyResults.length) {
          results = pyResults;
          source = 'python-bridge';
          siteUrl = siteUrl || 'https://anime-sama.fr';
        }
      }

      if (!results.length) {
        return replyText(sock, jid, 'Aucun résultat trouvé (JS + Python).', msg);
      }

      let text = tag + ' Résultats *' + query + '*\n_source: ' + source + '_\n\n';
      results.forEach((r, i) => {
        text += '*' + (i + 1) + '.* ' + r.title + '\n';
      });
      text += '\n➡️ `.asama <numéro>`';
      if (theme.quote) text += '\n\n_' + theme.quote + '_';

      setSession(jid, {
        step: 'search',
        results,
        siteUrl,
        source,
      }, SESSION_TTL);

      return replyTextDecor(sock, jid, text, msg, null, 0.55, theme.displayName || null, 0.25);
    } catch (e) {
      console.error('[asama] search', e);
      return replyText(sock, jid, 'Erreur lors de la recherche (domaine inaccessible ?).', msg);
    }
  },
};
