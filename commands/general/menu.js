const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { replyText, replyMedia, replySticker, playSfx } = require('../../helpers/reply');
const { maybeDecorSticker, maybeDecorImage } = require('../../lib/randomDecor');
const { getActiveTheme } = require('../../lib/themeManager');
const { getSenderJid } = require('../../lib/senderUtils');
const { isPrivateOn } = require('../../lib/privateMode');
const {
  systemHeader,
  sectionTitle,
  sectionEnd,
  catLine,
  themeQuote,
  skillLine
} = require('../../lib/soloStyle');

const CATEGORY_META = {
  general:    { emoji: '⛩',  label: 'Gate / Général' },
  ai:         { emoji: '🧠', label: 'IA' },
  economy:    { emoji: '💰', label: 'Économie' },
  fun:        { emoji: '🎉', label: 'Fun' },
  games:      { emoji: '🎮', label: 'Jeux' },
  anime:      { emoji: '🎌', label: 'Anime' },
  solo:       { emoji: '🌑', label: 'Solo Leveling' },
  foot:       { emoji: '⚽', label: 'Foot' },
  manager:    { emoji: '🏟️', label: 'Manager' },
  reactions:  { emoji: '💫', label: 'Réactions' },
  textmaker:  { emoji: '✨', label: 'TextMaker' },
  social:     { emoji: '💬', label: 'Social' },
  search:     { emoji: '🔎', label: 'Recherche' },
  groups:     { emoji: '👥', label: 'Groupes' },
  edit:        { emoji: '✂️', label: 'Édition média' },
  tools:      { emoji: '🛠', label: 'Outils' },
  utility:    { emoji: '🔧', label: 'Utility' },
  moderation: { emoji: '🛡', label: 'Modération' },
  ci:         { emoji: '🇨🇮', label: 'CI / Afrique' }
};

const CATEGORY_ORDER = [
  'general', 'ai', 'economy', 'fun', 'games', 'anime', 'solo',
  'foot', 'manager', 'reactions', 'textmaker', 'social', 'search',
  'groups', 'tools', 'edit', 'utility', 'moderation', 'ci'
];

function groupByCategory(commands) {
  const byCategory = {};
  for (const cmd of commands.values()) {
    const cat = (cmd.category || 'other').toLowerCase();
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(cmd);
  }
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].sort((a, b) => a.name.localeCompare(b.name));
  }
  return byCategory;
}

function orderedCategories(byCategory) {
  const keys = Object.keys(byCategory);
  const ordered = CATEGORY_ORDER.filter(c => keys.includes(c));
  for (const k of keys) {
    if (!ordered.includes(k)) ordered.push(k);
  }
  return ordered;
}

function metaFor(cat) {
  return CATEGORY_META[cat] || { emoji: '📁', label: cat };
}

function buildCompactMenu(commands, theme, mentionTag) {
  const byCategory = groupByCategory(commands);
  const cats = orderedCategories(byCategory);

  let text = systemHeader({
    mentionTag,
    theme,
    cmdCount: commands.size
  });

  text += sectionTitle('DOMAINS // TRIPLE EGO');
  for (const cat of cats) {
    const m = metaFor(cat);
    text += catLine(m.emoji, m.label, cat, byCategory[cat].length);
  }
  text += sectionEnd();
  const modeLabel = isPrivateOn() ? '🔒 *PRIVATE*' : '🌐 *PUBLIC*';
  text += `\n📡 *Status* · ${modeLabel}\n`;
  text += `\n🎮 *Navigation*\n`;
  text += `├ \`${config.prefix}menu <cat>\` — ouvrir un domain\n`;
  text += `├ \`${config.prefix}menu all\` — toutes les skills\n`;
  text += `├ \`${config.prefix}bmenu\` — menu interactif\n`;
  text += `├ \`${config.prefix}private\` — mode privé (owner)\n`;
  text += `└ \`${config.prefix}ping\` — latence system\n`;
  text += `\n📌 Ex: \`${config.prefix}menu ai\` · \`${config.prefix}menu tools\`\n`;
  text += themeQuote(theme);
  return text;
}

function buildCategoryMenu(commands, theme, catKey, mentionTag) {
  const byCategory = groupByCategory(commands);
  const key = Object.keys(byCategory).find(k => k === catKey || k.startsWith(catKey));
  if (!key) {
    const available = orderedCategories(byCategory).map(c => `\`${c}\``).join(', ');
    return {
      error: true,
      text:
        `╔══ [ SYSTEM · ERROR ] ══╗\n` +
        `║  ❌ Domain inconnu : *${catKey}*\n` +
        `╚═══════════════════════╝\n\n` +
        `Dispo : ${available}\n` +
        `Ou \`${config.prefix}menu\``
    };
  }

  const m = metaFor(key);
  const list = byCategory[key];

  let text = systemHeader({
    mentionTag,
    theme,
    cmdCount: list.length,
    subtitle: m.label.toUpperCase(),
    compact: true
  });

  text += sectionTitle(`SKILLS · ${m.label.toUpperCase()}`);
  for (const cmd of list) {
    const desc = cmd.description
      ? cmd.description.split('—')[0].trim().slice(0, 42)
      : '';
    text += skillLine(config.prefix, cmd.name, desc);
  }
  text += sectionEnd();
  text += `↩ \`${config.prefix}menu\`  ·  🌑 ${theme.displayName || 'Triple Ego'}`;
  return { error: false, text };
}

function buildFullMenu(commands, theme, mentionTag) {
  const byCategory = groupByCategory(commands);
  const cats = orderedCategories(byCategory);

  let text = systemHeader({
    mentionTag,
    theme,
    cmdCount: commands.size,
    subtitle: 'ALL SKILLS // DOMAIN'
  });
  text += '\n';

  for (const cat of cats) {
    const m = metaFor(cat);
    text += `┌─ ${m.emoji} *${m.label}*\n`;
    text += `└─ ` + byCategory[cat].map(c => `\`${config.prefix}${c.name}\``).join(' · ');
    text += '\n\n';
  }

  text += themeQuote(theme);
  if (text.length > 3800) {
    text = text.slice(0, 3700) + `\n\n… _(tronqué — \`${config.prefix}menu <cat>\`)_`;
  }
  return text;
}

function themeBannerPath(theme) {
  if (!theme?.banner) return null;
  const resolved = path.resolve(__dirname, '..', '..', theme.banner.replace(/^\.\//, ''));
  return fs.existsSync(resolved) ? theme.banner : null;
}

module.exports = {
  name: 'menu',
  category: 'general',
  description: 'Menu Solo Leveling — .menu / .menu <cat> / .menu all',

  async execute(sock, msg, args, commands) {
    const jid = msg.key.remoteJid;
    const theme = getActiveTheme();
    const sub = (args[0] || '').toLowerCase().trim();
    const senderJid = getSenderJid(sock, msg);
    const mentionTag = '@' + senderJid.replace(/@.*$/, '').split(':')[0];

    let text;
    if (!sub) {
      text = buildCompactMenu(commands, theme, mentionTag);
    } else if (sub === 'all' || sub === 'tout' || sub === 'full') {
      text = buildFullMenu(commands, theme, mentionTag);
    } else {
      const detail = buildCategoryMenu(commands, theme, sub, mentionTag);
      if (detail.error) {
        return replyText(sock, jid, detail.text, msg);
      }
      text = detail.text;
    }

    // Parfois image déco aléatoire à la place du banner thème
    const decor = maybeDecorImage(0.55, theme.displayName || null);
    const fallback = decor || themeBannerPath(theme);

    await playSfx(sock, jid, 'menu', msg, 0.8);
    const sent = await replyMedia(sock, jid, 'menu', text, msg, {
      fallbackImage: fallback,
      mentions: [senderJid]
    });

    // Sticker animé ~50%
    const stk = maybeDecorSticker(0.5, theme.displayName || null);
    if (stk) {
      try {
        await replySticker(sock, jid, stk, msg, {
          pack: 'EGO.XD Menu',
          author: theme.displayName || 'Triple Ego'
        });
      } catch (err) {
        console.error('[menu] sticker:', err.message);
      }
    }
    return sent;
  }
};
