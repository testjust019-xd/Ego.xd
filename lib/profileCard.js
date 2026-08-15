/**
 * Profile Card — données + SVG + PNG (jimp si dispo)
 */
const peopleDB = require('./peopleDB');
const groupsDB = require('./groupsDB');

/**
 * Palette rang — noir / blanc / or / rouge / argent / bronze / vert / orange
 */
const RANK_COLORS = {
  E: '#c0c0c0',       // argent clair (débutant)
  D: '#cd7f32',       // bronze
  C: '#22c55e',       // vert
  B: '#f97316',       // orange
  A: '#ef4444',       // rouge
  S: '#ffd700',       // or
  National: '#f8fafc', // blanc
  Monarch: '#ffd700'  // or royal (accent or sur fond noir)
};

const RANK_THEME = {
  E:        { accent: '#c0c0c0', bg1: '#0a0a0a', bg2: '#1a1a1a', text: '#e8e8e8', label: 'ARGENT' },
  D:        { accent: '#cd7f32', bg1: '#0c0906', bg2: '#1c140c', text: '#f5e6d3', label: 'BRONZE' },
  C:        { accent: '#22c55e', bg1: '#050a06', bg2: '#0c1a10', text: '#e8f5ec', label: 'VERT' },
  B:        { accent: '#f97316', bg1: '#0a0604', bg2: '#1a1008', text: '#fff0e6', label: 'ORANGE' },
  A:        { accent: '#ef4444', bg1: '#0a0404', bg2: '#1a0808', text: '#ffe8e8', label: 'ROUGE' },
  S:        { accent: '#ffd700', bg1: '#0a0900', bg2: '#1a1600', text: '#fff8e0', label: 'OR' },
  National: { accent: '#f8fafc', bg1: '#050505', bg2: '#141414', text: '#ffffff', label: 'BLANC' },
  Monarch:  { accent: '#ffd700', bg1: '#000000', bg2: '#0d0d0d', text: '#ffd700', label: 'OR NOIR' }
};

function getRank(jid) {
  try {
    return require('./rankGate').getUserRank(jid) || 'E';
  } catch {
    return 'E';
  }
}

function collectProfile(jid) {
  const id = peopleDB.normalizeJid(jid);
  const person = peopleDB.get(id) || peopleDB.ensure(id) || {};
  const rank = getRank(id);
  const display = person.pseudo || String(id).split('@')[0];
  const tags = person.tags || [];
  const groupIds = person.groups || [];
  const groups = groupIds
    .map((gid) => {
      const g = groupsDB.getById?.(gid) || Object.values(groupsDB.loadGroups()).find((x) => x.id === gid || x.waJid === gid);
      return g ? g.name : null;
    })
    .filter(Boolean)
    .slice(0, 4);

  let badges = [];
  try {
    const qb = require('./questBoard');
    badges = qb.getUserProgress(id).badges || [];
  } catch (_) {}

  let xp = 0;
  try {
    xp = require('./hunterDB').getHunter(id).xp || 0;
  } catch (_) {}

  const title =
    rank === 'Monarch'
      ? 'SHADOW MONARCH'
      : rank === 'S' || rank === 'National'
        ? 'ELITE HUNTER'
        : rank === 'A' || rank === 'B'
          ? 'RISING EGOIST'
          : 'AWAKENING';

  const theme = RANK_THEME[rank] || RANK_THEME.E;
  return {
    jid: id,
    display,
    rank,
    color: theme.accent,
    theme,
    metal: theme.label,
    tags,
    groups,
    badges,
    xp,
    title,
    optIn: !!person.optIn
  };
}

function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSvg(p) {
  const tags = (p.tags || []).slice(0, 6).map(escapeXml).join('  ·  ') || '—';
  const groups = (p.groups || []).slice(0, 3).map(escapeXml).join('  ·  ') || '—';
  const badges = (p.badges || []).slice(0, 4).map(escapeXml).join('  ') || '—';
  const th = p.theme || RANK_THEME[p.rank] || RANK_THEME.E;
  const accent = th.accent;
  const bg1 = th.bg1;
  const bg2 = th.bg2;
  const text = th.text;
  const metal = th.label || '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="480" viewBox="0 0 900 480">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bg1}"/>
      <stop offset="100%" style="stop-color:${bg2}"/>
    </linearGradient>
    <linearGradient id="acc" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${accent}"/>
      <stop offset="100%" style="stop-color:#ffffff" stop-opacity="0.35"/>
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${accent}" stop-opacity="0.35"/>
      <stop offset="100%" style="stop-color:${accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="900" height="480" rx="28" fill="url(#bg)"/>
  <rect width="900" height="480" rx="28" fill="url(#shine)"/>
  <rect x="0" y="0" width="14" height="480" fill="url(#acc)"/>
  <rect x="40" y="32" width="820" height="3" rx="2" fill="${accent}" opacity="0.9"/>
  <text x="48" y="78" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="18" fill="${accent}" letter-spacing="5" opacity="0.9">EGO.XD  ·  SYSTEM CARD  ·  ${escapeXml(metal)}</text>
  <text x="48" y="145" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="52" font-weight="700" fill="${text}">${escapeXml(p.display)}</text>
  <text x="48" y="190" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="24" font-weight="600" fill="${accent}">${escapeXml(p.title)}</text>
  <rect x="48" y="215" width="170" height="42" rx="12" fill="${accent}" opacity="0.18" stroke="${accent}" stroke-width="2"/>
  <text x="133" y="243" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="20" font-weight="700" fill="${accent}">RANK ${escapeXml(p.rank)}</text>
  <text x="240" y="243" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="17" fill="${text}" opacity="0.75">XP ${p.xp || 0}  ·  Pool ${p.optIn ? 'ON' : 'OFF'}</text>
  <text x="48" y="305" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="14" fill="${accent}" letter-spacing="3" opacity="0.85">TAGS</text>
  <text x="48" y="335" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="22" fill="${text}">${tags}</text>
  <text x="48" y="380" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="14" fill="${accent}" letter-spacing="3" opacity="0.85">GROUPS</text>
  <text x="48" y="410" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="20" fill="${text}" opacity="0.9">${groups}</text>
  <text x="48" y="450" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="14" fill="${text}" opacity="0.45">BADGES  ${badges}</text>
  <text x="852" y="450" text-anchor="end" font-family="ui-monospace, monospace" font-size="13" fill="${text}" opacity="0.35">${escapeXml(String(p.jid).split('@')[0])}</text>
</svg>`;
}

function textCard(p) {
  const metal = p.metal || (p.theme && p.theme.label) || '';
  return (
    `🃏 *EGO.XD SYSTEM CARD* · ${metal}\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `*${p.display}*\n` +
    `${p.title}\n` +
    `Rank *${p.rank}* · XP ${p.xp} · Pool ${p.optIn ? 'ON' : 'OFF'}\n` +
    `Tags : ${(p.tags || []).join(', ') || '—'}\n` +
    `Groups : ${(p.groups || []).join(', ') || '—'}\n` +
    `Badges : ${(p.badges || []).join(', ') || '—'}\n` +
    `━━━━━━━━━━━━━━━━`
  );
}

/**
 * Tente un PNG via jimp (fallback null)
 */
async function renderPng(p) {
  try {
    const jimpMod = require('jimp');
    const Jimp = jimpMod.Jimp || jimpMod;
    const w = 900;
    const h = 480;
    const hex = (p.color || '#8b5cf6').replace('#', '');
    const accent = parseInt(hex.length === 6 ? hex + 'FF' : hex, 16);
    const bg = 0x0b0b14ff;

    let image;
    if (typeof Jimp === 'function') {
      image = await new Jimp({ width: w, height: h, color: bg });
    } else if (Jimp.read) {
      image = await Jimp.read(Buffer.alloc(0)); // fallback path
    } else {
      return null;
    }

    // barre latérale + bandeau
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < 12; x++) image.setPixelColor(accent, x, y);
    }
    for (let x = 40; x < 860; x++) {
      for (let y = 36; y < 40; y++) image.setPixelColor(accent, x, y);
    }

    // jimp 1.x print is optional — si pas de font, on renvoie quand même le fond coloré
    try {
      const loadFont = jimpMod.loadFont || Jimp.loadFont;
      const FONT = jimpMod.FONT_SANS_32_WHITE || Jimp.FONT_SANS_32_WHITE;
      if (loadFont && FONT) {
        const font = await loadFont(FONT);
        if (image.print) {
          image.print({ font, x: 48, y: 120, text: String(p.display).slice(0, 24) });
          image.print({ font, x: 48, y: 200, text: `RANK ${p.rank}` });
        }
      }
    } catch (_) {}

    if (typeof image.getBuffer === 'function') {
      return await image.getBuffer('image/png');
    }
    if (typeof image.getBufferAsync === 'function') {
      return await image.getBufferAsync('image/png');
    }
    return null;
  } catch (e) {
    console.warn('[profileCard] png:', e.message);
    return null;
  }
}

async function buildCard(jid) {
  const profile = collectProfile(jid);
  const svg = buildSvg(profile);
  const text = textCard(profile);
  const png = await renderPng(profile);
  return { profile, svg, text, png };
}

module.exports = {
  collectProfile,
  buildSvg,
  textCard,
  renderPng,
  buildCard,
  RANK_COLORS,
  RANK_THEME
};
