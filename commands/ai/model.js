const config = require('../../config');
const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { isOwner } = require('../../lib/groupHelpers');
const { getModel, setModel, listPrefs } = require('../../lib/modelPrefs');

const PROVIDERS = {
  ias: 'openRouter',
  openrouter: 'openRouter',
  or: 'openRouter',
  groq: 'groq',
  hf: 'huggingFace',
  huggingface: 'huggingFace',
  genimg2: 'huggingFace',
  gemini: 'gemini'
};

module.exports = {
  name: 'model',
  category: 'ai',
  description: 'Change le modèle IA sans redémarrer — .model <ias|groq|hf> <id-modele>',

  minRank: 'D',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);

    if (!args.length) {
      const prefs = listPrefs(senderJid);
      let text = `🧩 *Modèles actifs*\n\n`;
      text += `*OpenRouter (.ias)*\n→ ${getModel('openRouter', senderJid)}\n\n`;
      text += `*Groq (.groq)*\n→ ${getModel('groq', senderJid)}\n\n`;
      text += `*HuggingFace (.genimg2)*\n→ ${getModel('huggingFace', senderJid)}\n\n`;
      text += `*Utilisation*\n`;
      text += `• \`.model ias <modele>\` — pour toi seulement\n`;
      text += `• \`.model groq <modele>\`\n`;
      text += `• \`.model hf <modele>\`\n`;
      text += `• \`.model ias <modele> global\` — owner, pour tout le bot\n\n`;
      text += `Exemples modèles OpenRouter :\n`;
      text += `\`meta-llama/llama-3.3-70b-instruct:free\`\n`;
      text += `\`google/gemini-2.0-flash-exp:free\`\n`;
      text += `\`deepseek/deepseek-r1:free\`\n`;
      text += `Ou : \`.ias --model <id> <question>\` (one-shot)`;
      return replyText(sock, jid, text, msg);
    }

    const provKey = (args[0] || '').toLowerCase();
    const provider = PROVIDERS[provKey];
    if (!provider) {
      return replyText(sock, jid, 'Provider inconnu. Utilise : ias | groq | hf | gemini', msg);
    }

    // detect global flag
    const globalFlag = args.includes('global');
    const modelParts = args.slice(1).filter(a => a.toLowerCase() !== 'global');
    const model = modelParts.join(' ').trim();

    if (!model) {
      return replyText(sock, jid,
        `Modèle actuel *${provKey}* : \`${getModel(provider, senderJid)}\`\n` +
        `Change : \`.model ${provKey} <id-modele>\``,
        msg
      );
    }

    if (globalFlag) {
      if (!isOwner(msg)) {
        return replyText(sock, jid, 'Seul le owner peut fixer un modèle global.', msg);
      }
      setModel(provider, model, null);
      return replyText(sock, jid, `✅ Modèle *global* ${provKey} → \`${model}\`\n(sans redémarrage)`, msg);
    }

    setModel(provider, model, senderJid);
    return replyText(sock, jid, `✅ Ton modèle *${provKey}* → \`${model}\`\n(persistant, sans redémarrage)`, msg);
  }
};
