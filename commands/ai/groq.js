const config = require('../../config');
const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getModel } = require('../../lib/modelPrefs');

module.exports = {
  name: 'groq',
  category: 'ai',
  description: 'Chat Groq — .groq <question> | .groq --model <id> <q>',

  minRank: 'B',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);

    let oneShotModel = null;
    let argList = [...args];
    if (argList[0] === '--model' || argList[0] === '-m') {
      oneShotModel = argList[1];
      argList = argList.slice(2);
    }

    const question = argList.join(' ');
    if (!question) {
      return replyText(sock, jid,
        `Écris une question, ex: .groq explique la photosynthèse\n` +
        `Modèle : \`${oneShotModel || getModel('groq', senderJid)}\`\n` +
        `Change : \`.model groq <id>\` ou \`.groq --model <id> <q>\``,
        msg
      );
    }

    if (!config.groq.apiKey || config.groq.apiKey === 'TA_CLE_GROQ_ICI') {
      return replyText(
        sock, jid,
        '⚠️ Ajoute ta clé Groq gratuite dans config.js (groq.apiKey).\nhttps://console.groq.com',
        msg
      );
    }

    const model = oneShotModel || getModel('groq', senderJid) || config.groq.model;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.groq.apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: question }]
        })
      });

      const data = await res.json();
      if (data.error) {
        console.error('[groq] erreur API:', data.error);
        return replyText(sock, jid, `Erreur Groq : ${data.error.message || 'vérifie clé/modèle'}`, msg);
      }

      const answer = data.choices?.[0]?.message?.content || 'Pas de réponse reçue.';
      return replyText(sock, jid, answer, msg);
    } catch (err) {
      console.error('[groq]', err);
      return replyText(sock, jid, 'Erreur réseau Groq.', msg);
    }
  }
};
