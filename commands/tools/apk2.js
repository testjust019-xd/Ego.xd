const { replyText } = require('../../helpers/reply');

/**
 * .apk2 — envoie le fichier APK (quand possible) plutôt qu'un simple lien.
 *
 * Sources autorisées uniquement :
 *  - F-Droid (open source, liens directs stables)
 * Pas de téléchargement pirate / APKMirror scraping (légal + malware).
 *
 * Usage :
 *   .apk2 com.termux
 *   .apk2 termux
 */

const POPULAR = [
  { name: 'Telegram', pkg: 'org.telegram.messenger' },
  { name: 'Signal', pkg: 'org.thoughtcrime.securesms' },
  { name: 'Firefox', pkg: 'org.mozilla.firefox' },
  { name: 'VLC', pkg: 'org.videolan.vlc' },
  { name: 'NewPipe', pkg: 'org.schabi.newpipe' },
  { name: 'Termux', pkg: 'com.termux' },
  { name: 'OsmAnd', pkg: 'net.osmand.plus' },
  { name: 'K-9 Mail', pkg: 'com.fsck.k9' },
  { name: 'Organic Maps', pkg: 'app.organicmaps' },
  { name: 'AntennaPod', pkg: 'de.danoeh.antennapod' },
  { name: 'Simple Gallery', pkg: 'com.simplemobiletools.gallery.pro' }
];

function resolvePkg(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return null;
  if (/^[a-zA-Z][\w.]*\.[a-zA-Z][\w.]*$/.test(query.trim())) return query.trim();
  const hit = POPULAR.find(
    (p) => p.name.toLowerCase() === q || p.pkg.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
  );
  return hit ? hit.pkg : null;
}

async function fdroidPackageIndex(pkg) {
  try {
    const res = await fetch(`https://f-droid.org/api/v1/packages/${encodeURIComponent(pkg)}`, {
      headers: { 'User-Agent': 'ARISE-XD-Bot' }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

module.exports = {
  name: 'apk2',
  category: 'tools',
  description: 'Envoie le fichier APK (F-Droid) — .apk2 <package|nom>',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const query = args.join(' ').trim();

    if (!query) {
      const list = POPULAR.map((p) => `• ${p.name} (\`${p.pkg}\`)`).join('\n');
      return replyText(
        sock,
        jid,
        `📦 *.apk2* envoie le *fichier APK* (F-Droid uniquement).\n\nExemples :\n\`.apk2 termux\`\n\`.apk2 com.termux\`\n\nApps connues :\n${list}\n\n⚠️ Apps Play Store propriétaires non supportées (pas de lien direct légal).`,
        msg
      );
    }

    const pkg = resolvePkg(query);
    if (!pkg) {
      return replyText(
        sock,
        jid,
        'Package inconnu. Utilise un id style `com.termux` ou un nom de la liste (`.apk2` sans argument).',
        msg
      );
    }

    await replyText(sock, jid, `📦 Recherche APK F-Droid pour \`${pkg}\`...`, msg);

    const info = await fdroidPackageIndex(pkg);
    if (!info || !info.packageName) {
      return replyText(
        sock,
        jid,
        `❌ \`${pkg}\` introuvable sur F-Droid.\nEssaie \`.apk ${pkg}\` pour les liens Play / APKMirror.`,
        msg
      );
    }

    // Choisir la dernière version
    const packages = info.packages || [];
    if (!packages.length) {
      return replyText(sock, jid, 'Aucune version APK listée sur F-Droid pour ce package.', msg);
    }

    // packages triés du plus récent au plus ancien en général
    const latest = packages[0];
    const versionCode = latest.versionCode;
    const versionName = latest.versionName || String(versionCode);

    // URL directe F-Droid repo
    const apkUrl = `https://f-droid.org/repo/${pkg}_${versionCode}.apk`;

    try {
      const res = await fetch(apkUrl, {
        headers: { 'User-Agent': 'ARISE-XD-Bot' },
        redirect: 'follow'
      });

      if (!res.ok) {
        // Fallback : parfois le nom de fichier utilise versionName
        const altUrl = `https://f-droid.org/repo/${pkg}_${versionName}.apk`;
        const res2 = await fetch(altUrl, {
          headers: { 'User-Agent': 'ARISE-XD-Bot' },
          redirect: 'follow'
        });
        if (!res2.ok) {
          return replyText(
            sock,
            jid,
            `❌ Téléchargement échoué (${res.status}).\nLien manuel : ${apkUrl}\nOu page : https://f-droid.org/packages/${pkg}/`,
            msg
          );
        }
        const buf = Buffer.from(await res2.arrayBuffer());
        if (buf.length < 1000) {
          return replyText(sock, jid, 'Fichier trop petit / invalide.', msg);
        }
        // Limite WhatsApp ~100 Mo pratique
        if (buf.length > 95 * 1024 * 1024) {
          return replyText(
            sock,
            jid,
            `⚠️ APK trop lourd (${(buf.length / 1024 / 1024).toFixed(1)} Mo) pour WhatsApp.\nTélécharge ici : ${altUrl}`,
            msg
          );
        }
        await sock.sendMessage(
          jid,
          {
            document: buf,
            mimetype: 'application/vnd.android.package-archive',
            fileName: `${pkg}_${versionName}.apk`,
            caption: `📦 *${pkg}*\nv${versionName} (F-Droid)`
          },
          { quoted: msg }
        );
        return;
      }

      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000) {
        return replyText(sock, jid, 'Fichier trop petit / invalide.', msg);
      }
      if (buf.length > 95 * 1024 * 1024) {
        return replyText(
          sock,
          jid,
          `⚠️ APK trop lourd (${(buf.length / 1024 / 1024).toFixed(1)} Mo) pour WhatsApp.\nTélécharge ici : ${apkUrl}`,
          msg
        );
      }

      await sock.sendMessage(
        jid,
        {
          document: buf,
          mimetype: 'application/vnd.android.package-archive',
          fileName: `${pkg}_${versionName}.apk`,
          caption: `📦 *${pkg}*\nv${versionName} (F-Droid)\nTaille : ${(buf.length / 1024 / 1024).toFixed(1)} Mo`
        },
        { quoted: msg }
      );
    } catch (err) {
      console.error('[apk2]', err.message);
      return replyText(
        sock,
        jid,
        `Erreur téléchargement.\nPage F-Droid : https://f-droid.org/packages/${pkg}/`,
        msg
      );
    }
  }
};
