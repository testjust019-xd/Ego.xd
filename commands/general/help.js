/**
 * .help [commande] — aide détaillée
 */
const config = require('../../config');
const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'help',
  aliases: ['aide', 'h'],
  category: 'general',
  description: 'Aide détaillée d\'une commande — .help <cmd> ou .help',

  async execute(sock, msg, args, commands) {
    const jid = msg.key.remoteJid;
    const prefix = config.prefix || '.';

    if (!args[0]) {
      return replyText(
        sock,
        jid,
        `❓ *Aide*\n\n` +
          `Usage : \`${prefix}help <commande>\`\n` +
          `Exemple : \`${prefix}help play\` · \`${prefix}help menu\`\n\n` +
          `Menus :\n` +
          `• \`${prefix}menu\` — menu compact par domain\n` +
          `• \`${prefix}menu <cat>\` — détail d'une catégorie\n` +
          `• \`${prefix}menu all\` — toutes les commandes\n` +
          `• \`${prefix}bmenu\` — menu interactif (boutons/liste)\n\n` +
          `_Astuce : \`${prefix}assist <ce que tu veux faire>\` te guide aussi._`,
        msg
      );
    }

    const name = args[0].toLowerCase().replace(/^\./, '');
    const cmd = commands.get(name);

    if (!cmd) {
      return replyText(
        sock,
        jid,
        `❌ Commande \`${prefix}${name}\` introuvable.\n` +
          `Essaie \`${prefix}menu\` ou \`${prefix}assist ${name}\`.`,
        msg
      );
    }

    const aliases = (cmd.aliases || cmd.alias || [])
      .map((a) => `\`${prefix}${a}\``)
      .join(', ');

    let text =
      `╔══ [ HELP · ${cmd.name.toUpperCase()} ] ══╗\n` +
      `║  \`${prefix}${cmd.name}\`\n` +
      `╚════════════════════════╝\n\n`;

    text += `📁 Catégorie : *${cmd.category || '—'}*\n`;
    if (aliases) text += `🔗 Alias : ${aliases}\n`;
    if (cmd.minRank) text += `🔒 Rang min : *${cmd.minRank}*\n`;
    if (cmd.dailyLimit) text += `📅 Limite journalière selon ton rang\n`;
    text += `\n📝 ${cmd.description || 'Pas de description.'}\n`;

    // Usage hint if description contains "—"
    if (cmd.description && cmd.description.includes('—')) {
      const usage = cmd.description.split('—').slice(1).join('—').trim();
      if (usage) text += `\n💡 Usage : ${usage}\n`;
    }

    text += `\n↩ \`${prefix}menu ${cmd.category || ''}\` · \`${prefix}bmenu\``;

    return replyText(sock, jid, text, msg);
  }
};
