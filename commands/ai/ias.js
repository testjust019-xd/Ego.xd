const config = require('../../config');
const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getModel } = require('../../lib/modelPrefs');

module.exports = {
  name: 'ias',
  category: 'ai',
  description: 'IA via OpenRouter — .ias <message> | .ias --model <id> <msg>',

  minRank: 'D',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);

    // Parse one-shot model: .ias --model xxx question...
    let oneShotModel = null;
    let argList = [...args];
    if (argList[0] === '--model' || argList[0] === '-m') {
      oneShotModel = argList[1];
      argList = argList.slice(2);
    }

    const prompt = argList.join(' ').trim();

    if (!prompt) {
      return replyText(sock, jid,
        'Utilisation :\n' +
        '• `.ias <message>`\n' +
        '• `.ias --model <id> <message>` (modèle one-shot)\n' +
        '• `.model ias <id>` (change ton modèle sans redémarrer)\n\n' +
        `Modèle actuel : \`${oneShotModel || getModel('openRouter', senderJid)}\`\n` +
        'Clé : config.js → openRouter.apiKey · https://openrouter.ai/keys',
        msg
      );
    }

    const apiKey = config.openRouter?.apiKey;
    if (!apiKey || apiKey === 'TA_CLE_OPENROUTER_ICI') {
      return replyText(sock, jid,
        '⚠️ Ajoute ta clé OpenRouter dans `config.js` → `openRouter.apiKey`\n' +
        'https://openrouter.ai/keys',
        msg
      );
    }

    const model = oneShotModel || getModel('openRouter', senderJid) || config.openRouter?.model;

    try {
      await replyText(sock, jid, `🌐 ${model.split('/').pop()}…`, msg);

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': config.openRouter?.siteUrl || 'https://arise-xd.local',
          'X-Title': config.openRouter?.siteName || config.botName || 'EGO.XD'
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: `Tu es l'assistant IA de ${config.botName || 'EGO.XD'}. Réponds en français, clairement et utilement.`
            },
            { role: 'user', content: prompt.slice(0, 4000) }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        const errMsg = data.error?.message || data.message || `HTTP ${res.status}`;
        console.error('[ias]', errMsg);
        return replyText(sock, jid, `Erreur OpenRouter : ${errMsg}`, msg);
      }

      const answer = data.choices?.[0]?.message?.content;
      if (!answer) {
        return replyText(sock, jid, 'Pas de réponse. Vérifie modèle / crédits OpenRouter.', msg);
      }

      const text = answer.length > 3500 ? answer.slice(0, 3500) + '\n…' : answer;
      return replyText(sock, jid, text, msg);
    } catch (err) {
      console.error('[ias]', err);
      return replyText(sock, jid, 'Erreur réseau OpenRouter.', msg);
    }
  }
};
