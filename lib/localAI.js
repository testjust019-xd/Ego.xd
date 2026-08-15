// ─── IA locale ───
// Pas d'appel réseau, pas de clé API. Reconnaissance de mots-clés + réponses
// variées. Enrichis facilement en ajoutant des catégories ci-dessous.

const config = require('../config');

const STORE_URL = 'https://jolly-taiyaki-27b8c9.netlify.app/';
const YT_DEVIL = 'https://www.youtube.com/@devilskills-e7c';
const YT_SOCCER = 'https://www.youtube.com/@SoccerVibe19';

const knowledgeBase = {
  greeting: {
    keywords: ['salut', 'bonjour', 'yo', 'cc', 'coucou', 'bjr', 'bonsoir', 'hey', 'hi', 'hello'],
    replies: [
      'Salut ! Comment je peux t\'aider aujourd\'hui ?',
      'Yo ! Dis-moi ce qu\'il te faut.',
      'Bonjour ! Je t\'écoute 👋',
      'Hey chasseur. Tape .menu pour voir les domaines.'
    ]
  },
  thanks: {
    keywords: ['merci', 'thanks', 'thx', 'merci beaucoup', 'thanks a lot'],
    replies: ['Avec plaisir !', 'De rien, je suis là pour ça 😊', 'Toujours dispo !', 'Ego satisfait.']
  },
  identity: {
    keywords: ['qui es tu', 'qui es-tu', 'ton createur', 'qui ta cree', "c'est qui", 'tu es qui', 'cest qui le bot'],
    replies: [
      `Je suis *${config.botName}*, créé par ${config.creator || 'Dylan'}. Bot WhatsApp thématique Ego / Blue Lock / Solo Leveling.`,
      `*${config.botName}* — assistant multi-domaines. Créateur : ${config.creator || 'Dylan'}.`
    ]
  },
  mood: {
    keywords: ['ca va', 'comment tu vas', 'tu vas bien', 'cv', 'ça va'],
    replies: ['Je vais bien, merci ! Et toi ?', 'Toujours opérationnel 💪', 'Systèmes au vert.']
  },
  goodbye: {
    keywords: ['au revoir', 'bye', 'a plus', 'a+', 'ciao', 'a demain'],
    replies: ['À bientôt !', 'Bye bye 👋', 'Reviens quand tu veux.']
  },
  menu: {
    keywords: ['menu', 'commandes', 'aide', 'help', 'que peux tu faire', 'liste commandes'],
    replies: [
      'Tape *.menu* pour la liste complète des domaines et commandes.',
      'Utilise *.menu* — tout est classé par catégorie (IA, anime, tools, modération…).'
    ]
  },
  rank: {
    keywords: ['rang', 'rank', 'hunter', 'monarch', 'xp', 'niveau', 'level'],
    replies: [
      'Les rangs vont de *E → D → C → B → A → S → National → Monarch*.\nGagne de l\'XP avec les activités solo, ou utilise un code avec *.redeem*.',
      'Monte en rang pour débloquer des commandes (minRank) et réduire les cooldowns.'
    ]
  },
  codes: {
    keywords: ['code', 'redeem', 'gencode', 'code rang', 'code xp'],
    replies: [
      'Pour utiliser un code : *.redeem EGO-XXXX-XXXX*\nLes codes sont générés par le owner (.gencode / .paycode).',
      'Codes à usage unique (ou limité) : XP ou rang direct. Demande au owner si tu as payé.'
    ]
  },
  store: {
    keywords: [
      'magasin', 'boutique', 'store', 'shop', 'acheter', 'vente', 'objet digital',
      'produit', 'digital product', 'taiyaki', 'netlify'
    ],
    replies: [
      `🛒 Magasin d'objets digitaux :\n${STORE_URL}\n\nPaiement : ${config.donateInfo || 'voir .donate'}`,
      `Tu peux voir / acheter des objets digitaux ici :\n${STORE_URL}`
    ]
  },
  youtube: {
    keywords: [
      'youtube', 'chaine', 'chaîne', 'yt', 'video', 'vidéo', 'devilskills',
      'soccervibe', 'soccer vibe', 'devil skills', 'ta chaine'
    ],
    replies: [
      `📺 Chaînes YouTube du créateur :\n• Devil Skills : ${YT_DEVIL}\n• Soccer Vibe : ${YT_SOCCER}`,
      `Abonne-toi :\n${YT_DEVIL}\n${YT_SOCCER}`
    ]
  },
  support: {
    keywords: ['support', 'aide admin', 'groupe support', 'channel', 'canal'],
    replies: [
      `Support / channel : ${config.supportGroupLink || 'voir .support'}`,
      `Pour le support : tape *.support* ou *.donate*.`
    ]
  },
  donate: {
    keywords: ['donate', 'don', 'payer', 'soutenir', 'wave', 'momo', 'orange money'],
    replies: [
      `❤️ Soutenir : ${config.donateInfo || 'voir .donate'}\nAprès paiement, le owner peut générer un code avec .paycode.`,
      `Paiement manuel (Wave / OM / MoMo) : tape *.donate* pour les infos.`
    ]
  },
  pair: {
    keywords: ['pair', 'pairing', 'connecter', 'session', 'qr', 'appairage', 'lier', 'pairlink', 'lien pair'],
    replies: [
      'Pour lier un appareil : ouvre le lien web (commande *.pairlink*) ou *.pair* (owner).',
      'Page web de pairing = même moteur que .pair. Entre ton numéro → code → WhatsApp > Appareils liés.'
    ]
  },
  genimg: {
    keywords: ['genimg', 'image', 'generer image', 'générer image', 'dessin', 'ia image'],
    replies: [
      'Génère une image avec *.genimg <prompt>* ou *.genimg2 <prompt>*.',
      '*.genimg* (Pollinations) et *.genimg2* (HF / autres) — décris ce que tu veux.'
    ]
  },
  tts: {
    keywords: ['tts', 'vocal', 'parle', 'lire texte', 'text to speech'],
    replies: [
      'Transforme du texte en vocal : *.tts <texte>*',
      '*.tts bonjour* → le bot envoie un message vocal.'
    ]
  }
};

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Retourne une réponse locale si un mot-clé correspond, sinon null.
 */
function getLocalAIResponse(text) {
  if (!text) return null;
  const normalized = normalize(text);
  // Mots isolés pour éviter que "yo" matche dans "youtube"
  const tokens = new Set(normalized.split(/[^a-z0-9]+/).filter(Boolean));

  for (const category in knowledgeBase) {
    const { keywords, replies } = knowledgeBase[category];
    const hit = keywords.some(k => {
      const nk = normalize(k);
      if (!nk) return false;
      // Expression multi-mots → recherche sous-chaîne
      if (nk.includes(' ')) return normalized.includes(nk);
      // Mot unique → token exact (évite faux positifs)
      return tokens.has(nk);
    });
    if (hit) {
      return replies[Math.floor(Math.random() * replies.length)];
    }
  }

  return null;
}

module.exports = { getLocalAIResponse, knowledgeBase, STORE_URL, YT_DEVIL, YT_SOCCER };
