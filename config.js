module.exports = {
  botName: "EGO.XD",
  version: "1.2 ",          // affiché dans .menu — change librement
  creator: "Dylan",          // affiché dans .menu
  prefix: ".",
  // URL publique de la page de pairing (Render / VPS / ton domaine).
  // Ex: "https://ego-xd.onrender.com" ou "http://IP_VPS:3000"
  // Utilisée par .pairlink, keepalive et affichée au démarrage.
  publicUrl: process.env.PUBLIC_URL || "",

  // Dossier des sessions Baileys (persistant sur VPS = disque local).
  // Défaut: "sessions". Sur Render avec disk: SESSION_DIR=/app/sessions
  sessionDir: process.env.SESSION_DIR || "sessions",

  // Mets le NUMÉRO téléphone ET le LID (WhatsApp multi-device).
  // En groupe WA envoie souvent le numéro ; en PV parfois le LID.
  // Ex log connexion : me.id = 243993435287 , me.lid = 126002361581569
  ownerNumbers: ["243993435287", "126002361581569"], // SANS le +
  staffNumbers: ["2250508549577"], // staff : numéro international SANS +

  // ─── Support & don (remplis avec tes vraies infos) ───
  supportGroupLink: "https://whatsapp.com/channel/0029Vb8ojbwLCoX2i7e9ky2u",
  donateInfo: "Wave/Orange Money/MTN MoMo : +2250508549577",

  // ─── Magasin & réseaux ───
  storeUrl: "https://jolly-taiyaki-27b8c9.netlify.app/",
  youtube: {
    devilskills: "https://www.youtube.com/@devilskills-e7c",
    soccervibe: "https://www.youtube.com/@SoccerVibe19",
    falpy: "https://youtube.com/@falpy-pro"
  },

  // ─── Thèmes (chaque thème a sa propre image, sa citation, sa couleur) ───
  // Le thème actif est stocké dans data/settings.json (persiste après redémarrage).
  // Change-le avec la commande .settheme <nom>, ou modifie defaultTheme ci-dessous.
  defaultTheme: "tripleego",
  themes: {
    tripleego: {
      displayName: "Triple Ego",
      banner: "./assets/themes/jinpachiego/banner.jpg",
      quote: "「 Triple ego collide — Gojo × Jin-Woo × Nagi. Awaken or be forgotten. 」",
      color: "#8B5CF6",
      asamaTag: "⚔️ DOMAIN"
    },
    gojo: {
      displayName: "Satoru Gojo",
      banner: "./assets/themes/gojo/banner.jpg",
      quote: "「 Throughout Heaven and Earth, I alone am the honored one. 」— Gojo",
      color: "#3B82F6",
      asamaTag: "👁️ LIMITLESS"
    },
    jinwoo: {
      displayName: "Sung Jin-Woo",
      banner: "./assets/themes/sungjinwoo/banner.webp",
      quote: "「 Arise. 」— Sung Jin-Woo",
      color: "#7C3AED",
      asamaTag: "🌑 SHADOW"
    },
    nagi: {
      displayName: "Nagi Seishiro",
      banner: "./assets/themes/nagi/banner.jpg",
      quote: "「 Too much effort… but I'll win. 」— Nagi",
      color: "#94A3B8",
      asamaTag: "⚽ EGOIST"
    },
    isagi: {
      displayName: "Isagi Yoichi",
      banner: "./assets/themes/nagi/alt.jpg",
      quote: "「 My ego is the formula to become the best. 」— Isagi",
      color: "#22C55E",
      asamaTag: "⚽ BLUE LOCK"
    },
    yuji: {
      displayName: "Itadori Yuji",
      banner: "./assets/themes/itadoriyuji/banner.png",
      quote: "「 I don't want to regret the way I lived. 」— Yuji",
      color: "#EF4444",
      asamaTag: "👊 JJK"
    },
    solo: {
      displayName: "Solo Leveling",
      banner: "./assets/themes/sungjinwoo/banner.webp",
      quote: "「 I alone level up. 」",
      color: "#A855F7",
      asamaTag: "📖 SYSTEM"
    },
    jinpachi: {
      displayName: "Ego Jinpachi",
      banner: "./assets/themes/jinpachiego/banner.jpg",
      quote: "「 Devour your ego — or be devoured. 」",
      color: "#F59E0B",
      asamaTag: "👑 EGO"
    }
  },

  // ─── Connexion (QR ou code d'appairage) ───
  // Sur VPS / Render sans terminal : mets PAIRING_ENABLED=true + PAIRING_PHONE dans les env
  // ou active ici. Sinon le QR s'affiche dans les logs (lien image).
  pairing: {
    enabled: process.env.PAIRING_ENABLED === 'true' || process.env.PAIRING_ENABLED === '1' || false,
    phoneNumber: (process.env.PAIRING_PHONE || "243993435287").replace(/\D/g, '') // SANS le +
  },

  // ─── Anti-ban Baron (baron-baileys-v2) ───
  // preset: 'aggressive' (défaut) | 'moderate' | 'conservative'
  // Mettre antiban: false pour désactiver complètement

  // ─── Voice clone (ElevenLabs) ───
  // Crée une clé sur https://elevenlabs.io → Profile → API Key
  // Instant Voice Clone nécessite un plan payant ElevenLabs (pas le free pure).
  // Sans clé : .clone enregistre quand même le sample localement.
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || "",
    // modèle TTS (eleven_multilingual_v2 gère le français)
    modelId: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
    // durée max sample (secondes) pour le clone
    maxSampleSec: 60
  },
  antiban: {
    preset: 'aggressive',
    // maxPerMinute: 20,   // override optionnel
    // maxPerHour: 800,
  },


  presence: {
    enabled: true,       // active/désactive la simulation
    random: true,        // true = choisit au hasard entre les types ci-dessous
    types: ["composing", "recording"], // "composing" = écrit..., "recording" = enregistre un vocal...
    fixedType: "composing", // utilisé uniquement si random = false
    delayMs: { min: 8000, max: 25000 } // délai aléatoire avant d'envoyer la vraie réponse
  },

  // ─── Suppression auto du message de commande ───
  // true = après chaque commande, le message qui l'a déclenchée est supprimé.
  // ⚠️ Ne marche à coup sûr QUE pour tes propres messages (fromMe). Pour
  // supprimer les commandes tapées par d'autres membres d'un groupe, le bot
  // doit être ADMIN de ce groupe (WhatsApp l'exige), sinon ça échoue en
  // silence (erreur juste loguée dans la console, pas de crash).
  deleteCommandMessage: false,

  // ─── Cooldown anti-spam (réduit selon le rang du chasseur) ───
  // defaultSeconds = cooldown appliqué à TOUTE commande qui n'a pas
  // sa propre propriété `cooldown` (en secondes) dans son fichier.
  // Mets 0 pour désactiver le cooldown par défaut.
  // Les rangs élevés attendent moins longtemps (voir lib/cooldown.js
  // pour les multiplicateurs par rang : Monarch ≈ quasi instantané).
  // Le owner (ownerNumbers) n'est jamais concerné par le cooldown.
  cooldown: {
    defaultSeconds: 5
  },

  // ─── Limites journalières (lib/dailyLimit.js) ───
  // Les commandes avec `dailyLimit: true` utilisent :
  // E=1, D=2, C=3, B=5, A=8, S=15, National=30, Monarch=illimité
  // Owner / staff ne sont pas limités.
  // Activation YouTube obligatoire au premier usage (sauf menu/help/activate).

  // ─── AudD (reconnaissance musicale pour .shazam) ───
  // Clé gratuite sur https://audd.io (inscription requise, pas de CB)
  audd: {
    apiKey: process.env.AUDD_API_KEY || ""
  },


  // Token gratuit : ouvre Telegram, cherche @BotFather, envoie /newbot
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || ""
  },


  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: "llama-3.3-70b-versatile" // vérifie sur console.groq.com/docs/models si ce nom a changé
  },


  ai: {
    useLocalAI: true,
    fallbackMessage: "Hmm, je n'ai pas compris 😅. Tape .menu pour voir les commandes."
  },

  // ─── Génération d'images ───
  // Pollinations (gratuit, souvent sans clé) — .genimg
  pollinations: {
    // optionnel : si tu as une clé pollinations, sinon laisse vide
    apiKey: process.env.POLLINATIONS_API_KEY || ""
  },

  // Hugging Face Inference API — fallback pour .genimg2
  // Token gratuit : https://huggingface.co/settings/tokens (Read access)
  huggingFace: {
    apiKey: process.env.HUGGINGFACE_API_KEY || "",
    // modèles gratuits / rapides (change si besoin sur huggingface.co)
    model: "stabilityai/stable-diffusion-xl-base-1.0"
  },

  // DeepAI Text2Img — optionnel (API devenue payante Pro)
  // .genimg2 utilise d'abord Pollinations (gratuit), puis Hugging Face, puis DeepAI si clé.
  deepai: {
    apiKey: process.env.DEEPAI_API_KEY || ""
  },

  // ─── OpenRouter (.ias) ───
  // Clé : https://openrouter.ai/keys (crédits gratuits selon offres)
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY || "",
    // modèles gratuits souvent dispo : meta-llama/llama-3.3-70b-instruct:free
    model: "meta-llama/llama-3.3-8b-instruct:free",
    siteUrl: "https://github.com/arise-xd",
    siteName: "EGO.XD"
  },

  // ─── Google Gemini (.gemini) ───
  // Clé gratuite : https://aistudio.google.com/apikey
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: "gemini-3.5-flash"
  },


  // ─── Agnes AI (.gendeo) — génération de vidéos ───
  // Clé : https://platform.agnes-ai.com/ (ou https://agnes-ai.com)
  // Docs : https://wiki.agnes-ai.com/en/docs/agnes-video-v20
  agnes: {
    apiKey: process.env.AGNES_API_KEY || "", // remplace par ta vraie clé API
    model: "agnes-video-v2.0",
    // paramètres par défaut (vidéos ~5s)
    width: 1152,
    height: 768,
    num_frames: 121,   // 8n+1, max 441 → ~5s à 24fps
    frame_rate: 24,
    pollIntervalMs: 8000,
    maxWaitMs: 360000  // 6 min max
  },

  // ─── Hébergement de fichiers via Telegram (.env recommandé, pas ici) ───
  // 1. Crée un bot avec @BotFather → récupère le token.
  // 2. Crée un channel/groupe PRIVÉ dédié au stockage, ajoute le bot comme admin,
  //    récupère son chat_id (ex: via @userinfobot ou en loggant les updates).
  // 3. Mets TG_STORAGE_BOT_TOKEN et TG_STORAGE_CHAT_ID dans .env.
  // Par défaut : API Telegram standard → 50MB max par fichier (upload).
  // Pour aller jusqu'à ~2GB : héberge le "Local Bot API Server" (Docker,
  // voir https://github.com/tdlib/telegram-bot-api) et mets TG_API_BASE
  // sur son URL (ex: http://localhost:8081), puis monte TG_MAX_UPLOAD_MB.
  telegramStorage: {
    botToken: process.env.TG_STORAGE_BOT_TOKEN || "",
    chatId: process.env.TG_STORAGE_CHAT_ID || "",
    apiBase: process.env.TG_API_BASE || "https://api.telegram.org",
    maxUploadMB: parseInt(process.env.TG_MAX_UPLOAD_MB || "45", 10)
  },

  // ─── Jeux web (.course, .duel, .pendu, ...) ───
  webGames: {
    sessionTtlMs: 30 * 60 * 1000,       // durée de vie d'une partie web
    linkAutoDeleteMs: 5 * 60 * 1000,    // auto-suppression du message lien WhatsApp
    actionMaxPerWindow: 30,             // rate-limit actions web
    actionWindowMs: 60 * 1000,
    adminToken: process.env.ADMIN_TOKEN || "",
    notifyChatOnWebAction: true,
  },

};
