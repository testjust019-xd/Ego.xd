/**
 * Menu interactif
 * - PV  : liste / boutons (si le client WA les accepte)
 * - Groupe : menu texte (WA bloque souvent listes + boutons en groupe)
 *
 * .bmenu | .bmenu list | .bmenu buttons | .bmenu text
 */
const config = require('../../config');
const { replyButtons, replyList, replyNativeButtons } = require('../../helpers/interactive');
const { replyText, replyTextDecor, playSfx } = require('../../helpers/reply');
const { getActiveTheme } = require('../../lib/themeManager');
const { isPrivateOn } = require('../../lib/privateMode');

const CATEGORIES = [
  { id: 'cat_general',    emoji: '⛩',  title: 'Général',        desc: 'menu, ping, profile, help…', key: 'general' },
  { id: 'cat_ai',         emoji: '🧠', title: 'IA',             desc: 'ai, groq, gemini, code…', key: 'ai' },
  { id: 'cat_economy',    emoji: '💰', title: 'Économie',       desc: 'balance, daily, work, rob…', key: 'economy' },
  { id: 'cat_fun',        emoji: '🎉', title: 'Fun',            desc: 'joke, meme, dice, roast…', key: 'fun' },
  { id: 'cat_games',      emoji: '🎮', title: 'Jeux',           desc: 'pendu, trivia, duel, spy…', key: 'games' },
  { id: 'cat_anime',      emoji: '🎌', title: 'Anime',          desc: 'waifu, op, character…', key: 'anime' },
  { id: 'cat_solo',       emoji: '🌑', title: 'Solo Leveling',  desc: 'arise, hunter, gate…', key: 'solo' },
  { id: 'cat_foot',       emoji: '⚽', title: 'Foot',           desc: 'score, live, joueur…', key: 'foot' },
  { id: 'cat_manager',    emoji: '🏟️', title: 'Manager',        desc: 'club, mercato, ligue…', key: 'manager' },
  { id: 'cat_reactions',  emoji: '💫', title: 'Réactions',      desc: 'hug, kiss, slap, pat', key: 'reactions' },
  { id: 'cat_textmaker',  emoji: '✨', title: 'TextMaker',      desc: 'ascii, fancy, ttp…', key: 'textmaker' },
  { id: 'cat_social',     emoji: '💬', title: 'Social',         desc: 'ship, rate, confession…', key: 'social' },
  { id: 'cat_search',     emoji: '🔎', title: 'Recherche',      desc: 'wiki, weather, img…', key: 'search' },
  { id: 'cat_groups',     emoji: '👥', title: 'Groupes',        desc: 'tagall, kick, mute…', key: 'groups' },
  { id: 'cat_tools',      emoji: '🛠', title: 'Outils',         desc: 'sticker, play, ytmp3…', key: 'tools' },
  { id: 'cat_moderation', emoji: '🛡', title: 'Modération',     desc: 'warn, antilink, ban…', key: 'moderation' },
  { id: 'cat_ci',         emoji: '🇨🇮', title: 'CI / Afrique',   desc: 'nouchi, momo, proverbe…', key: 'ci' }
];

function buildTextMenu(bot, prefix, theme, inGroup) {
  let text = `⚽ *${bot}* — Menu\n`;
  text += `Préfixe : \`${prefix}\`\n`;
  text += `Mode : ${isPrivateOn() ? '🔒 PRIVATE' : '🌐 PUBLIC'}\n`;
  if (inGroup) {
    text += `_Groupe : listes/boutons WA souvent bloqués → menu texte_\n`;
  }
  text += `\n`;
  for (const c of CATEGORIES) {
    text += `${c.emoji} *${c.title}* — \`${prefix}menu ${c.key}\`\n`;
  }
  text += `\n⚡ Rapide :\n`;
  text += `• \`${prefix}menu all\` — tout\n`;
  text += `• \`${prefix}profile\` — profil\n`;
  text += `• \`${prefix}ping\` — latence\n`;
  text += `• \`${prefix}hunter\` — rang XP\n`;
  text += `\n_${theme.displayName || 'Triple Ego'}_`;
  return text;
}

module.exports = {
  name: 'bmenu',
  aliases: ['buttonmenu', 'imenu'],
  category: 'general',
  description: 'Menu interactif — .bmenu | .bmenu list | .bmenu buttons | .bmenu text',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const inGroup = jid.endsWith('@g.us');
    const mode = (args[0] || (inGroup ? 'text' : 'list')).toLowerCase();
    const theme = getActiveTheme();
    const bot = config.botName || 'EGO.XD';
    const prefix = config.prefix || '.';
    const footer = `${theme.displayName || 'Triple Ego'} • ${bot}`;

    // SFX menu (non bloquant)
    playSfx(sock, jid, 'menu', msg, 0.75).catch(() => {});

    // ── Forcé texte (ou auto en groupe) ──
    if (mode === 'text' || mode === 'txt' || mode === 't') {
      return replyTextDecor(sock, jid, buildTextMenu(bot, prefix, theme, inGroup), msg, null, 0.65, theme.displayName || 'nagi', 0.5);
    }

    // ── En groupe : WhatsApp casse listes + boutons → texte par défaut ──
    if (inGroup && mode !== 'buttons' && mode !== 'btn' && mode !== 'b' && mode !== 'list' && mode !== 'l') {
      return replyTextDecor(sock, jid, buildTextMenu(bot, prefix, theme, true), msg, null, 0.65, theme.displayName || 'nagi', 0.5);
    }

    // ── Liste (surtout PV) ──
    if (mode === 'list' || mode === 'l' || (!args[0] && !inGroup)) {
      if (inGroup) {
        // Tentative liste en groupe, fallback texte si échec
        try {
          const mid = Math.ceil(CATEGORIES.length / 2);
          const sections = [
            {
              title: 'Domains I',
              rows: CATEGORIES.slice(0, mid).map((c) => ({
                title: `${c.emoji} ${c.title}`,
                rowId: c.id,
                description: c.desc
              }))
            },
            {
              title: 'Domains II',
              rows: CATEGORIES.slice(mid).map((c) => ({
                title: `${c.emoji} ${c.title}`,
                rowId: c.id,
                description: c.desc
              }))
            },
            {
              title: 'Actions',
              rows: [
                { title: '📋 Menu complet', rowId: 'menu_full', description: 'Toutes les commandes' },
                { title: '🏓 Ping', rowId: 'menu_ping', description: 'Latence' },
                { title: '👤 Profil', rowId: 'menu_profile', description: 'XP / rang' }
              ]
            }
          ];
          await replyList(sock, jid, {
            title: `${bot} — Menu`,
            description: `Choisis un domain\nPréfixe : ${prefix}`,
            buttonText: 'Ouvrir le menu',
            footer,
            sections
          }, msg);
          return;
        } catch (err) {
          console.error('[bmenu] list group failed:', err.message);
          return replyTextDecor(sock, jid, buildTextMenu(bot, prefix, theme, true), msg, null, 0.65, theme.displayName || 'nagi', 0.5);
        }
      }

      const mid = Math.ceil(CATEGORIES.length / 2);
      const sections = [
        {
          title: 'Domains I',
          rows: CATEGORIES.slice(0, mid).map((c) => ({
            title: `${c.emoji} ${c.title}`,
            rowId: c.id,
            description: c.desc
          }))
        },
        {
          title: 'Domains II',
          rows: CATEGORIES.slice(mid).map((c) => ({
            title: `${c.emoji} ${c.title}`,
            rowId: c.id,
            description: c.desc
          }))
        },
        {
          title: 'Actions rapides',
          rows: [
            { title: '📋 Menu complet', rowId: 'menu_full', description: 'Toutes les commandes' },
            { title: '🏓 Ping', rowId: 'menu_ping', description: 'Latence du bot' },
            { title: '👤 Mon profil', rowId: 'menu_profile', description: 'XP, coins, rang' },
            { title: '❓ Aide', rowId: 'menu_help', description: '.help <commande>' },
            { title: '👑 Owner', rowId: 'menu_owner', description: 'Infos créateur' }
          ]
        }
      ];

      try {
        return await replyList(sock, jid, {
          title: `${bot} — Menu interactif`,
          description: `Choisis un domain ou une action\nPréfixe : ${prefix}`,
          buttonText: 'Ouvrir le menu',
          footer,
          sections
        }, msg);
      } catch (err) {
        console.error('[bmenu] list failed:', err.message);
        return replyTextDecor(sock, jid, buildTextMenu(bot, prefix, theme, false), msg, null, 0.65, theme.displayName || 'nagi', 0.5);
      }
    }

    // ── Boutons (souvent grisés hors Business / hors PV) ──
    if (mode === 'buttons' || mode === 'btn' || mode === 'b') {
      const note = inGroup
        ? `\n\n⚠️ En *groupe*, WhatsApp grise souvent les boutons.\nUtilise \`${prefix}bmenu text\` ou \`${prefix}menu\`.`
        : `\n\n_Si les boutons sont grisés : compte non-Business ou client WA trop récent. Utilise \`${prefix}bmenu text\`._`;

      try {
        await replyNativeButtons(
          sock,
          jid,
          `⚽ *${bot}* — Menu rapide${note}`,
          [
            { id: 'menu_full', text: '📋 Menu complet' },
            { id: 'menu_profile', text: '👤 Profil' },
            { id: 'menu_ping', text: '🏓 Ping' }
          ],
          msg,
          footer
        );
        // Toujours envoyer aussi le menu texte en groupe (boutons grisés = inutilisables)
        if (inGroup) {
          await replyText(sock, jid, buildTextMenu(bot, prefix, theme, true), msg);
        }
        return;
      } catch (err) {
        console.error('[bmenu] buttons failed:', err.message);
        return replyTextDecor(sock, jid, buildTextMenu(bot, prefix, theme, inGroup), msg, null, 0.65, theme.displayName || 'nagi', 0.5);
      }
    }

    return replyText(
      sock,
      jid,
      `*${bot} — bmenu*\n\n` +
        `\`${prefix}bmenu\` — auto (liste en PV, texte en groupe)\n` +
        `\`${prefix}bmenu list\` — forcer la liste\n` +
        `\`${prefix}bmenu buttons\` — 3 boutons (souvent grisés hors PV/Business)\n` +
        `\`${prefix}bmenu text\` — menu texte fiable\n` +
        `\`${prefix}menu\` — menu Solo Leveling`,
      msg
    );
  }
};
