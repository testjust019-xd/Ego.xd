const fs = require('fs');
const path = require('path');

/**
 * Parcourt le dossier /commands (et ses sous-dossiers de catégories)
 * et charge chaque fichier .js comme une commande.
 * Supporte `aliases: ['shop', ...]` en plus de `name`.
 */
function loadCommands(commandsDir) {
  const commands = new Map();
  const categories = fs.readdirSync(commandsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory());

  for (const category of categories) {
    const categoryPath = path.join(commandsDir, category.name);
    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
      try {
        const commandModule = require(path.join(categoryPath, file));
        if (commandModule && commandModule.name) {
          commands.set(commandModule.name.toLowerCase(), commandModule);
          const aliases = commandModule.aliases || commandModule.alias || [];
          for (const a of aliases) {
            if (a && !commands.has(String(a).toLowerCase())) {
              commands.set(String(a).toLowerCase(), commandModule);
            }
          }
        }
      } catch (err) {
        console.error(`[commandLoader] échec chargement ${category.name}/${file}:`, err.message);
      }
    }
  }

  return commands;
}

module.exports = { loadCommands };
