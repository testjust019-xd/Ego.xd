const { replyText, replyImage } = require('../../helpers/reply');

/** Devine un domaine à partir d'un nom de marque */
function guessDomain(brand) {
  const raw = brand.trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .replace(/\s+/g, '');
  if (raw.includes('.')) return raw;
  // marques courantes
  const known = {
    nike: 'nike.com', adidas: 'adidas.com', apple: 'apple.com', google: 'google.com',
    microsoft: 'microsoft.com', amazon: 'amazon.com', meta: 'meta.com', facebook: 'facebook.com',
    netflix: 'netflix.com', spotify: 'spotify.com', tesla: 'tesla.com', samsung: 'samsung.com',
    sony: 'sony.com', puma: 'puma.com', reebok: 'reebok.com', gucci: 'gucci.com',
    louisvuitton: 'louisvuitton.com', chanel: 'chanel.com', pepsi: 'pepsi.com',
    cocacola: 'coca-cola.com', mcdonalds: 'mcdonalds.com', starbucks: 'starbucks.com',
    twitter: 'x.com', x: 'x.com', instagram: 'instagram.com', youtube: 'youtube.com',
    whatsapp: 'whatsapp.com', telegram: 'telegram.org', discord: 'discord.com',
    openai: 'openai.com', nvidia: 'nvidia.com', intel: 'intel.com', amd: 'amd.com',
    orange: 'orange.com', mtn: 'mtn.com', wave: 'wave.com'
  };
  if (known[raw]) return known[raw];
  return `${raw}.com`;
}

async function tryFetchImage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 ARISE-XD-Bot' },
      redirect: 'follow'
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('image') && !ct.includes('octet-stream') && !ct.includes('svg')) {
      // parfois clearbit renvoie image sans bon content-type
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 500) return null;
      return buf;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) return null;
    return buf;
  } catch {
    return null;
  }
}

module.exports = {
  name: 'logo',
  category: 'tools',
  description: 'Télécharge le logo d\'une marque — .logo <marque ou domaine>',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const brand = args.join(' ').trim();
    if (!brand) {
      return replyText(sock, jid, 'Utilisation : `.logo <marque ou domaine>`\nEx: `.logo Nike` · `.logo adidas.com`', msg);
    }

    const domain = guessDomain(brand);
    await replyText(sock, jid, `🔍 Recherche du logo *${brand}* (${domain})…`, msg);

    const sources = [
      `https://logo.clearbit.com/${domain}`,
      `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=256`
    ];

    for (const url of sources) {
      const buf = await tryFetchImage(url);
      if (buf) {
        return replyImage(sock, jid, buf, `🏷️ Logo : ${brand}\n🌐 ${domain}`, msg);
      }
    }

    return replyText(sock, jid,
      `❌ Logo introuvable pour *${brand}*.\n` +
      `Essaie avec le domaine exact (ex: \`.logo nike.com\`) ou génère-en un avec \`.logo2\`.`,
      msg
    );
  }
};
