const { replyText } = require('../../helpers/reply');

// Sécurité : on autorise UNIQUEMENT chiffres, espaces, + - * / % ( ) et le
// point décimal avant d'évaluer — empêche d'exécuter du code arbitraire
// (jamais d'eval() direct sur une entrée utilisateur non filtrée).
const SAFE_PATTERN = /^[0-9+\-*/%.() \s]+$/;

module.exports = {
  name: "calc",
  category: "general",
  description: "Calculatrice — .calc <expression>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const expression = args.join(' ');

    if (!expression) {
      return replyText(sock, jid, "Écris un calcul, ex: .calc (12 + 8) * 3", msg);
    }

    if (!SAFE_PATTERN.test(expression)) {
      return replyText(sock, jid, "Caractères non autorisés — utilise juste des chiffres et + - * / % ( )", msg);
    }

    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expression})`)();
      if (typeof result !== 'number' || !isFinite(result)) {
        return replyText(sock, jid, "Résultat invalide.", msg);
      }
      return replyText(sock, jid, `🧮 ${expression} = ${result}`, msg);
    } catch (err) {
      return replyText(sock, jid, "Expression invalide.", msg);
    }
  }
};
