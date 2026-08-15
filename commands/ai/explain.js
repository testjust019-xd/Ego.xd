const config = require('../../config');
const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "explain",
  category: "ai",
  description: "Explique un texte ou du code (nécessite .groq configuré) — .explain <texte>",

  minRank: 'D',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const text = args.join(' ');

    if (!text) {
      return replyText(sock, jid, "Écris ce que tu veux comprendre, ex: .explain que fait ce code : for(let i=0...)", msg);
    }

    if (!config.groq.apiKey || config.groq.apiKey === "TA_CLE_GROQ_ICI") {
      return replyText(sock, jid, "⚠️ .explain a besoin de Groq configuré (config.js -> groq.apiKey).", msg);
    }

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.groq.apiKey}` },
        body: JSON.stringify({
          model: config.groq.model,
          messages: [
            { role: "system", content: "Explique simplement et clairement, comme à quelqu'un qui découvre le sujet." },
            { role: "user", content: text }
          ]
        })
      });

      const data = await res.json();
      if (data.error) return replyText(sock, jid, `Erreur Groq : ${data.error.message}`, msg);

      const answer = data.choices?.[0]?.message?.content || "Pas de réponse.";
      return replyText(sock, jid, answer, msg);
    } catch (err) {
      console.error('[explain] erreur:', err);
      return replyText(sock, jid, "Erreur en contactant Groq.", msg);
    }
  }
};
