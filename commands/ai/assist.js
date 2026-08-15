const config = require('../../config');
const { replyText } = require('../../helpers/reply');

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Score simple par mots-clés sur name + description + category */
function rankCommands(query, commands) {
  const q = normalize(query);
  const words = q.split(/\s+/).filter(w => w.length > 1);
  const scored = [];

  for (const cmd of commands.values()) {
    const hay = normalize(`${cmd.name} ${cmd.description || ''} ${cmd.category || ''}`);
    let score = 0;
    if (hay.includes(q)) score += 10;
    for (const w of words) {
      if (hay.includes(w)) score += 3;
      if (cmd.name.includes(w)) score += 5;
    }
    // synonymes courants
    const syn = {
      argent: ['balance', 'daily', 'work', 'recette', 'budget'],
      image: ['genimg', 'genimg2', 'sticker', 'logo', 'affiche', 'wallpaper'],
      musique: ['play', 'lyrics', 'shazam', 'ytmp3'],
      foot: ['club', 'effectif', 'amical', 'ligue', 'coupe', 'ucl', 'mercato', 'score'],
      groupe: ['tagall', 'kick', 'mute', 'antilink', 'promote'],
      ia: ['ai', 'groq', 'assist', 'iatransfert', 'chat'],
      logo: ['logo', 'logo2'],
      texte: ['fancy', 'fancy2', 'fancy3', 'fancy4', 'fancy5', 'ascii']
    };
    for (const [key, cmds] of Object.entries(syn)) {
      if (q.includes(key) && cmds.includes(cmd.name)) score += 8;
    }
    if (score > 0) scored.push({ cmd, score });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, 8);
}

async function groqAssist(query, commands) {
  const catalog = [...commands.values()]
    .map(c => `.${c.name} [${c.category}] ${c.description || ''}`)
    .join('\n');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.groq.apiKey}`
    },
    body: JSON.stringify({
      model: config.groq.model,
      messages: [
        {
          role: 'system',
          content:
            'Tu aides les utilisateurs d\'un bot WhatsApp. On te donne le catalogue de commandes. ' +
            'Réponds en français, max 15 lignes, propose 3 à 6 commandes concrètes avec un exemple d\'usage.'
        },
        {
          role: 'user',
          content: `Besoin: ${query}\n\nCatalogue:\n${catalog.slice(0, 12000)}`
        }
      ],
      temperature: 0.4,
      max_tokens: 500
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Groq error');
  return data.choices?.[0]?.message?.content || '';
}

module.exports = {
  name: 'assist',
  category: 'ai',
  description: 'Assistant de commandes — .assist <ce que tu veux faire>',

  minRank: 'D',
  dailyLimit: true,
  async execute(sock, msg, args, commands) {
    const jid = msg.key.remoteJid;
    const query = args.join(' ').trim();
    if (!query) {
      return replyText(sock, jid,
        'Utilisation : `.assist <besoin>`\n' +
        'Ex: `.assist télécharger une musique`\n' +
        'Ex: `.assist gérer mon club de foot`\n' +
        'Ex: `.assist générer une image`',
        msg
      );
    }

    const hasGroq = config.groq?.apiKey && config.groq.apiKey !== 'TA_CLE_GROQ_ICI';
    if (hasGroq) {
      try {
        await replyText(sock, jid, '🧭 Recherche des commandes…', msg);
        const answer = await groqAssist(query, commands);
        return replyText(sock, jid, `🧭 *Assistant*\n\n${answer}`, msg);
      } catch (err) {
        console.error('[assist]', err.message);
      }
    }

    const ranked = rankCommands(query, commands);
    if (!ranked.length) {
      return replyText(sock, jid,
        'Rien de précis trouvé. Tape `.menu` pour tout voir, ou reformule (ex: "musique", "foot", "image").',
        msg
      );
    }

    let text = `🧭 *Commandes suggérées pour :* _${query}_\n\n`;
    ranked.forEach(({ cmd }, i) => {
      text += `${i + 1}. *${config.prefix}${cmd.name}* (${cmd.category})\n   ${cmd.description || ''}\n`;
    });
    text += '\n_Ajoute une clé Groq dans config.js pour des conseils plus naturels._';
    return replyText(sock, jid, text, msg);
  }
};
