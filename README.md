# EGO.XD — Bot WhatsApp (Baron / Baileys)

**Version :** 3.5 BARON  
**Créateur :** Dylan  
**Préfixe par défaut :** `.`  
**Thème :** Solo Leveling × Blue Lock × Jujutsu Kaisen

Bot WhatsApp multi-fonctions avec système de **rangs Hunter**, **limites journalières**, **cooldowns progressifs**, **activation YouTube** et **économie**.

---

## Table des matières

1. [Installation](#1-installation)
2. [Démarrage & appairage](#2-démarrage--appairage)
3. [Configuration (`config.js`)](#3-configuration-configjs)
4. [Structure du projet](#4-structure-du-projet)
5. [Système de rangs Hunter](#5-système-de-rangs-hunter)
6. [XP : seuils et gains](#6-xp--seuils-et-gains)
7. [Limites journalières & cooldowns](#7-limites-journalières--cooldowns)
8. [Activation YouTube (1 seule fois)](#8-activation-youtube-1-seule-fois)
9. [Fichier central des accès](#9-fichier-central-des-accès-libcommandaccessjs)
10. [Commande `.resetlimit`](#10-commande-resetlimit)
11. [Ajouter une commande](#11-ajouter-une-commande)
12. [Catégories de commandes](#12-catégories-de-commandes)
13. [Économie](#13-économie)
14. [Thèmes](#14-thèmes)
15. [Mode privé](#15-mode-privé)
16. [Déploiement (Render / VPS)](#16-déploiement-render--vps)
17. [Fichiers data](#17-fichiers-data)
18. [Dépannage](#18-dépannage)

---

## 1. Installation

### Prérequis
- **Node.js ≥ 20**
- Connexion Internet stable

### Termux / Linux / VPS

```bash
# 1. Dézippe le projet
unzip EGO-XD-Baron-*.zip
cd ego-bot

# 2. Installe les dépendances
npm install

# 3. Lance le bot
npm start
# ou
node index.js
```

Au premier lancement, un **QR code** s’affiche dans le terminal (ou un code d’appairage).  
Scanne-le avec WhatsApp → Appareils connectés.

---

## 2. Démarrage & appairage

| Méthode | Description |
|---------|-------------|
| QR code | Affiché dans le terminal au démarrage |
| Code pair | `.pair` / page web de pairing (`publicUrl` dans config) |
| `.pairlink` | Envoie le lien de la page de pairing |

Une fois connecté, la session est sauvée (pas besoin de rescanner à chaque redémarrage, sauf logout).

---

## 3. Configuration (`config.js`)

Fichier principal de réglages :

```js
module.exports = {
  botName: "EGO.XD",
  version: "3.5 BARON",
  creator: "Dylan",
  prefix: ".",

  // Numéros SANS le +
  ownerNumbers: ["126002361581569"],
  staffNumbers: ["2250508549577"],

  supportGroupLink: "https://whatsapp.com/channel/...",
  donateInfo: "Wave/Orange Money/MTN MoMo : +225...",

  storeUrl: "https://...",
  youtube: {
    devilskills: "https://www.youtube.com/@devilskills-e7c",
    soccervibe: "https://www.youtube.com/@SoccerVibe19",
    falpy: "https://youtube.com/@falpy-pro"
  },

  defaultTheme: "tripleego",

  cooldown: {
    defaultSeconds: 5   // appliqué si la commande n’a pas son propre cooldown
  },

  publicUrl: process.env.PUBLIC_URL || "",
  // ...
};
```

### Points importants
- **`ownerNumbers`** : numéros owner (format international, sans `+`)
- **`staffNumbers`** : modérateurs (peuvent utiliser `.resetlimit`, etc.)
- **`youtube`** : chaînes affichées à l’activation
- **`prefix`** : préfixe des commandes (`.` par défaut)

---

## 4. Structure du projet

```
ego-bot/
├── config.js                 # Configuration globale
├── index.js / start.js       # Point d’entrée
├── package.json
├── ACCESS_RANKS.md           # Doc rapide accès / rangs
├── README.md                 # Ce fichier
│
├── commands/                 # Une commande = un fichier .js
│   ├── ai/
│   ├── anime/
│   ├── ci/
│   ├── economy/
│   ├── foot/
│   ├── fun/
│   ├── games/
│   ├── general/
│   ├── groups/
│   ├── manager/
│   ├── moderation/
│   ├── reactions/
│   ├── search/
│   ├── social/
│   ├── solo/
│   ├── textmaker/
│   └── tools/
│
├── lib/                      # Cœur du bot
│   ├── commandAccess.js      # ⭐ Rangs, limites, cooldowns (CENTRAL)
│   ├── hunterDB.js           # XP + rangs Hunter
│   ├── dailyLimit.js         # Compteurs journaliers
│   ├── cooldown.js           # Anti-spam
│   ├── activation.js         # Activation YouTube
│   ├── rankGate.js           # Comparaison de rangs
│   ├── messageHandler.js     # Routage + contrôles d’accès
│   ├── database.js           # Économie (coins, XP éco)
│   ├── commandLoader.js      # Charge auto toutes les commandes
│   └── ...
│
├── helpers/                  # reply, presence, interactive…
├── assets/                   # Bannières, thèmes, media
├── data/                     # JSON persistants (créés auto)
│   ├── hunters.json
│   ├── users.json
│   ├── activated.json
│   ├── dailyLimits.json
│   ├── settings.json
│   └── ...
└── web/                      # Page de pairing (optionnel)
```

---

## 5. Système de rangs Hunter

Hiérarchie (du plus faible au plus fort) :

```
E → D → C → B → A → S → National → Monarch
```

- Le rang est stocké dans `data/hunters.json`
- Il se met à jour **automatiquement** selon l’XP
- Beaucoup de commandes sont **verrouillées** par `minRank`
- Owner / staff = **jamais limités**

Voir son rang : `.profile` · `.arise` · `.hunter`

---

## 6. XP : seuils et gains

### Seuils (`lib/hunterDB.js`)

```js
const RANKS   = ['E', 'D', 'C', 'B', 'A', 'S', 'National', 'Monarch'];
const RANK_XP = [ 0, 300, 1000, 3000, 8000, 20000, 50000, 150000 ];
```

| Rang | XP minimum |
|------|------------|
| E | 0 |
| D | 300 |
| C | 1 000 |
| B | 3 000 |
| A | 8 000 |
| S | 20 000 |
| National | 50 000 |
| Monarch | 150 000 |

**Pour changer la difficulté** : modifie uniquement le tableau `RANK_XP`, puis redémarre.

### Comment gagner de l’XP Hunter

| Commande | XP | Contrainte |
|----------|-----|------------|
| `.arise` | +1 | Quasi libre |
| `.gate` | ~15–145 | 1 gate / 2 h |
| `.donjon` | 10–200 selon le donjon | Cooldown 4 h + limite jour |

**Donjons (`.donjon`)** — `commands/games/donjon.js` :
- E : 10–25 XP  
- D : 25–50  
- C : 40–80  
- B : 70–120  
- A : 100–200  

Pour modifier les gains : édite `xp: [min, max]` dans `GATES`, ou la formule dans `gate.js` / `arise.js`.

> **Note :** l’XP *économie* (`.work`, `.daily`) est séparée (`lib/database.js`) et ne change **pas** le rang Hunter.

---

## 7. Limites journalières & cooldowns

### Limites journalières par défaut

| Rang | Utilisations / jour |
|------|---------------------|
| E | 1 |
| D | 2 |
| C | 3 |
| B | 5 |
| A | 8 |
| S | 15 |
| National | 30 |
| Monarch | **Illimité** |

Reset automatique à **minuit UTC**.

### Cooldowns

Le cooldown de base est **réduit** selon le rang :

| Rang | Multiplicateur |
|------|----------------|
| E | ×1.0 |
| D | ×0.9 |
| C | ×0.75 |
| B | ×0.6 |
| A | ×0.45 |
| S | ×0.3 |
| National | ×0.15 |
| Monarch | ×0.05 |

Exemple : cooldown de base 10 s → Monarch ≈ 0,5 s.

---

## 8. Activation YouTube (1 seule fois)

Au **premier usage** d’une commande (sauf menu / help / ping / activate…), le bot envoie les liens des chaînes YouTube configurées dans `config.js`.

1. L’utilisateur suit **au moins une** chaîne  
2. Il tape **`.activate`**  
3. L’activation est **permanente** (`data/activated.json`)

### Chaînes actuelles
- [Devil Skills](https://www.youtube.com/@devilskills-e7c)
- [Soccer Vibe](https://www.youtube.com/@SoccerVibe19)
- [Falpy Pro](https://youtube.com/@falpy-pro)

### Vérification d’abonnement ?
Le bot **ne vérifie pas** techniquement l’abonnement (YouTube n’offre pas d’API simple sans OAuth Google).  
C’est un système **sur la confiance** (standard pour les bots gratuits).

---

## 9. Fichier central des accès (`lib/commandAccess.js`)

**Tout se configure ici** — pas besoin de modifier chaque fichier de commande.

### Format d’une règle

```js
lyrics: {
  minRank: 'C',           // rang minimum (null = dès E)
  dailyLimit: {           // quotas EXACTS par rang
    C: 5,
    B: 8,
    A: 12,
    S: 20,
    National: 40,
    Monarch: -1           // -1 = illimité
  },
  cooldown: 6             // secondes de base
},
```

### 3 façons de définir `dailyLimit`

| Valeur | Effet |
|--------|--------|
| `true` | Tableau global (E=1 … Monarch=∞) |
| `5` | 5 pour E, puis scale auto selon le rang |
| `{ C: 5, B: 8, Monarch: -1 }` | **Quota exact** par rang (recommandé) |
| `false` / omit | Pas de limite journalière |

### Défauts par catégorie
Si une commande n’est pas listée dans `COMMAND_RULES`, les `CATEGORY_DEFAULTS` s’appliquent (ai, tools, foot, games…).

### Ordre de contrôle (dans `messageHandler.js`)

1. Mode privé  
2. Activation YouTube  
3. Rang minimum (`minRank`)  
4. Limite journalière  
5. Cooldown  
6. Exécution de la commande  

Owner / staff = toujours exemptés des points 2–5.

---

## 10. Commande `.resetlimit`

Réservée **owner / staff**.

```
.resetlimit                 → reset TES limites du jour
.resetlimit @user           → reset les limites de @user
.resetlimit all             → reset GLOBAL (owner only)
.resetlimit @user play      → reset uniquement "play" pour @user
.resetlimit me ai           → reset uniquement "ai" pour toi
```

Alias : `.resetlimits` · `.clearlimit` · `.resetdaily`

---

## 11. Ajouter une commande

Crée un fichier dans le bon dossier, par ex. `commands/games/exemple.js` :

```js
const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'exemple',
  aliases: ['ex'],
  category: 'games',
  description: 'Description courte — .exemple',

  // Optionnel : ces props sont prioritaires sur commandAccess.js
  // minRank: 'C',
  // dailyLimit: true,
  // cooldown: 10,

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    return replyText(sock, jid, 'Réponse ici', msg);
  }
};
```

Puis :
1. (Recommandé) Ajoute la règle dans `lib/commandAccess.js` → `COMMAND_RULES`
2. Redémarre le bot  

Le `commandLoader` charge **automatiquement** tous les `.js` de `commands/`.

---

## 12. Catégories de commandes

| Dossier | Contenu typique |
|---------|-----------------|
| `general` | menu, profile, ping, activate, resetlimit, owner… |
| `ai` | ai, chat, code, gemini, groq, roleplay… |
| `tools` | play, ytmp3/4, sticker, tiktok, lyrics, qr… |
| `economy` | balance, daily, work, rob, transfer, leaderboard |
| `games` | donjon, duel, trivia, pendu, slot… |
| `solo` | arise, hunter, shadow, arsenal, monarque |
| `anime` | waifu, neko, gate, character… |
| `foot` | live, score, match, joueur, mercato… |
| `search` | wiki, weather, img… |
| `fun` / `social` / `textmaker` / `ci` | fun, ship, ascii, nouchi… |
| `groups` / `moderation` | tagall, kick, antilink, warn… |

Menu interactif : **`.menu`** ou **`.bmenu`**

---

## 13. Économie

- **Coins** + XP éco → `data/users.json` (`lib/database.js`)
- Commandes : `.balance` · `.daily` · `.work` · `.transfer` · `.rob` · `.leaderboard`
- Séparé du rang Hunter (qui dépend de `hunters.json`)

---

## 14. Thèmes

Change le thème avec **`.settheme <nom>`**

Thèmes disponibles (exemples) : `tripleego`, `gojo`, `jinwoo`, etc.  
Définis dans `config.js` → `themes` + images dans `assets/themes/`.

Le thème actif est sauvegardé dans `data/settings.json`.

---

## 15. Mode privé

Quand le mode privé est activé, seuls owner / staff / VIP peuvent utiliser le bot.

Géré via `lib/privateMode.js` et les settings.

---

## 16. Déploiement (Render / VPS)

Voir aussi :
- `RENDER_DEPLOY.md`
- `DEPLOY_FREE.md`
- `Dockerfile`

### Render (résumé)
1. Repo Git ou upload du zip  
2. Build : `npm install`  
3. Start : `npm start`  
4. Variable d’env optionnelle : `PUBLIC_URL=https://ton-app.onrender.com`  

Garde le process vivant (ping / keep-alive) si le plan s’endort.

### VPS
```bash
npm install
# pm2 recommandé
pm2 start index.js --name ego-xd
pm2 save
```

---

## 17. Fichiers data

Créés automatiquement au besoin :

| Fichier | Rôle |
|---------|------|
| `data/hunters.json` | XP + rang Hunter |
| `data/users.json` | Coins, XP éco, cartes |
| `data/activated.json` | Users ayant fait `.activate` |
| `data/dailyLimits.json` | Compteurs d’usage du jour |
| `data/settings.json` | Thème, mode privé, VIP… |
| `data/groupSettings.json` | Antilink, antidelete par groupe |

Tu peux les éditer à la main si besoin (JSON valide).

---

## 18. Dépannage

| Problème | Solution |
|----------|----------|
| QR / session perdue | Supprime le dossier de session Baileys et relance |
| « Activation requise » en boucle | Vérifie `data/activated.json` ou refais `.activate` |
| Limite journalière bloquée | `.resetlimit` (owner) ou attendre minuit UTC |
| Commande « rang insuffisant » | Monte en XP via `.donjon` / `.gate` / `.arise` |
| Cooldown trop long | Monte de rang (réduit auto) ou baisse `cooldown` dans `commandAccess.js` |
| Commande introuvable | Vérifie le nom du fichier + `name:` exporté, puis redémarre |
| Owner non reconnu | Numéro dans `ownerNumbers` **sans** `+` ni espaces |

---

## Liens utiles

- Support / channel : voir `config.supportGroupLink`
- YouTube : Devil Skills · Soccer Vibe · Falpy Pro  
- Doc accès rapide : `ACCESS_RANKS.md`

---

## Licence & crédits

Bot basé sur **baron-baileys-v2**.  
Thème inspiré de *Solo Leveling*, *Blue Lock*, *Jujutsu Kaisen*.

**EGO.XD** — Awaken or be forgotten.
