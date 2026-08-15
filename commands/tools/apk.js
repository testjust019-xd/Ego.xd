const { replyText, replyImage } = require('../../helpers/reply');

/**
 * .apk  recherche d'apps Android (infos + liens officiels)
 *
 * Pas de téléchargement d'APK pirates (risque malware + légal).
 * On privilégie : Google Play, F-Droid (open source), APKMirror (vérifié).
 */

const POPULAR = [
  { name: 'WhatsApp', pkg: 'com.whatsapp', fdroid: false },
  { name: 'Telegram', pkg: 'org.telegram.messenger', fdroid: true },
  { name: 'Signal', pkg: 'org.thoughtcrime.securesms', fdroid: true },
  { name: 'Firefox', pkg: 'org.mozilla.firefox', fdroid: true },
  { name: 'VLC', pkg: 'org.videolan.vlc', fdroid: true },
  { name: 'NewPipe', pkg: 'org.schabi.newpipe', fdroid: true },
  { name: 'Termux', pkg: 'com.termux', fdroid: true },
  { name: 'OsmAnd', pkg: 'net.osmand.plus', fdroid: true },
  { name: 'K-9 Mail', pkg: 'com.fsck.k9', fdroid: true },
  { name: 'Organic Maps', pkg: 'app.organicmaps', fdroid: true },
  { name: 'AntennaPod', pkg: 'de.danoeh.antennapod', fdroid: true },
  { name: 'Simple Gallery', pkg: 'com.simplemobiletools.gallery.pro', fdroid: true },
  { name: 'YouTube', pkg: 'com.google.android.youtube', fdroid: false },
  { name: 'Spotify', pkg: 'com.spotify.music', fdroid: false },
  { name: 'Instagram', pkg: 'com.instagram.android', fdroid: false },
  { name: 'TikTok', pkg: 'com.zhiliaoapp.musically', fdroid: false },
  { name: 'CapCut', pkg: 'com.lemon.lvoverseas', fdroid: false },
  { name: 'Grok', pkg: 'ai.x.grok', fdroid: false }
];

function playUrl(queryOrPkg, isPkg = false) {
  if (isPkg) return `https://play.google.com/store/apps/details?id=${encodeURIComponent(queryOrPkg)}`;
  return `https://play.google.com/store/search?q=${encodeURIComponent(queryOrPkg)}&c=apps`;
}

function fdroidSearch(q) {
  return `https://search.f-droid.org/?q=${encodeURIComponent(q)}`;
}

function fdroidPkg(pkg) {
  return `https://f-droid.org/packages/${pkg}/`;
}

function apkMirrorSearch(q) {
  return `https://www.apkmirror.com/?post_type=app_release&searchtype=apk&s=${encodeURIComponent(q)}`;
}

function iconUrl(pkg) {
  return `https://www.google.com/s2/favicons?domain=${pkg.split('.').slice(-2).join('.')}&sz=128`;
}

async function tryFetchBuffer(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 ARISE-XD-Bot' },
      redirect: 'follow'
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) return null;
    return buf;
  } catch {
    return null;
  }
}

/** Interroge l'API F-Droid pour un package exact */
async function fdroidInfo(pkg) {
  try {
    const res = await fetch(`https://f-droid.org/api/v1/packages/${encodeURIComponent(pkg)}`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.packageName) return null;
    const versions = data.packages || [];
    const latest = versions[0];
    return {
      packageName: data.packageName,
      versionCode: data.suggestedVersionCode,
      versionName: latest?.versionName || null,
      size: latest?.size || null
    };
  } catch {
    return null;
  }
}

function formatSize(bytes) {
  if (!bytes || bytes < 1) return null;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function findPopular(query) {
  const q = query.toLowerCase().replace(/\s+/g, '');
  return POPULAR.filter(p =>
    p.name.toLowerCase().replace(/\s+/g, '').includes(q) ||
    p.pkg.toLowerCase().includes(q) ||
    q.includes(p.name.toLowerCase().replace(/\s+/g, ''))
  ).slice(0, 6);
}

module.exports = {
  name: 'apk',
  category: 'tools',
  description: 'Recherche apps Android  .apk <nom> | random | pkg <id>',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sub = (args[0] || '').toLowerCase();

    if (!args.length) {
      return replyText(
        sock, jid,
        '=ñ *APK / Apps Android*\n\n' +
        '" `.apk <nom>`  chercher une app\n' +
        '" `.apk pkg <package>`  fiche package (ex: `com.termux`)\n' +
        '" `.apk random`  une app open source au hasard\n' +
        '" `.apk top`  suggestions populaires\n\n' +
        '_Liens officiels uniquement (Play · F-Droid · APKMirror)._\n' +
        '_Pas de téléchargement d\'APK non vérifiés._',
        msg
      );
    }

    if (sub === 'random' || sub === 'rand') {
      const opensource = POPULAR.filter(p => p.fdroid);
      const pick = opensource[Math.floor(Math.random() * opensource.length)];
      const info = await fdroidInfo(pick.pkg);
      let text = `<² *App random (open source)*\n\n`;
      text += `=æ *${pick.name}*\n`;
      text += `<” \`${pick.pkg}\`\n`;
      if (info?.versionName) text += `<÷ Version F-Droid : ${info.versionName}\n`;
      if (info?.size) text += `=¾ Taille : ~${formatSize(info.size)}\n`;
      text += `\n= F-Droid : ${fdroidPkg(pick.pkg)}\n`;
      text += `¶ Play : ${playUrl(pick.pkg, true)}`;
      return replyText(sock, jid, text, msg);
    }

    if (sub === 'top' || sub === 'list') {
      let text = `P *Suggestions*\n\n`;
      POPULAR.forEach((p, i) => {
        const tag = p.fdroid ? '=â FOSS' : '¶ Play';
        text += `${i + 1}. *${p.name}* ${tag}\n   \`${p.pkg}\`\n`;
      });
      text += `\n’ \`.apk <nom>\` ou \`.apk pkg <id>\``;
      return replyText(sock, jid, text, msg);
    }

    if (sub === 'pkg' || sub === 'package' || sub === 'id') {
      const pkg = (args[1] || '').trim();
      if (!pkg || !/^[a-zA-Z][\w.]*\.[a-zA-Z][\w.]*$/.test(pkg)) {
        return replyText(sock, jid, 'Utilisation : `.apk pkg com.termux`', msg);
      }

      await replyText(sock, jid, `= Fiche *${pkg}*&`, msg);
      const info = await fdroidInfo(pkg);
      const known = POPULAR.find(p => p.pkg === pkg);

      let text = `=ñ *Package*\n<” \`${pkg}\`\n`;
      if (known) text += `=Û ${known.name}\n`;
      if (info) {
        text += ` Présent sur F-Droid\n`;
        if (info.versionName) text += `<÷ v${info.versionName}\n`;
        if (info.size) text += `=¾ ~${formatSize(info.size)}\n`;
        text += `\n= ${fdroidPkg(pkg)}\n`;
      } else {
        text += `9 Pas trouvé sur l'API F-Droid (app proprio ou package inconnu).\n\n`;
      }
      text += `¶ Play Store : ${playUrl(pkg, true)}\n`;
      text += `>ž APKMirror : ${apkMirrorSearch(pkg)}`;

      const icon = await tryFetchBuffer(iconUrl(pkg));
      if (icon) {
        return replyImage(sock, jid, icon, text, msg);
      }
      return replyText(sock, jid, text, msg);
    }

    const query = args.join(' ').trim();
    const hits = findPopular(query);

    let text = `=ñ *Recherche* : _${query}_\n\n`;

    if (hits.length) {
      text += `*Correspondances connues*\n`;
      for (const h of hits) {
        text += `" *${h.name}*  \`${h.pkg}\`\n`;
        text += `  ¶ ${playUrl(h.pkg, true)}\n`;
        if (h.fdroid) text += `  =â ${fdroidPkg(h.pkg)}\n`;
      }
      text += '\n';
    }

    text += `*Liens de recherche*\n`;
    text += `¶ Play Store\n${playUrl(query)}\n\n`;
    text += `=â F-Droid (open source)\n${fdroidSearch(query)}\n\n`;
    text += `>ž APKMirror (APK signés / vérifiés)\n${apkMirrorSearch(query)}\n\n`;
    text += `_Astuce : \`.apk pkg com.xxx.yyy\` pour une fiche précise._`;

    if (hits.length === 1) {
      const icon = await tryFetchBuffer(iconUrl(hits[0].pkg));
      if (icon) return replyImage(sock, jid, icon, text, msg);
    }

    return replyText(sock, jid, text, msg);
  }
};
