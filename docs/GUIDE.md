# Guide complet — EGO.XD Baron (sévère++)

Bot WhatsApp thématique **Triple Ego** (Gojo × Sung Jin-Woo × Nagi), fork **baron-baileys-v2**.

---

## 1. Installation & démarrage

```bash
cd ego-bot
npm install
npm install sharp          # images / stickers (fortement recommandé)
# optionnel
npm install jimp link-preview-js wa-sticker-formatter

# TTS local
# Debian/Ubuntu : sudo apt install espeak-ng ffmpeg
# Termux :        pkg install espeak-ng ffmpeg

nano config.js
npm start
```

**Connexion WhatsApp**
1. QR code ou pairing (`config.pairing`)
2. WhatsApp → Appareils liés
3. Après déconnexion manuelle (401 `device_removed`) :
   ```bash
   rm -rf sessions/main
   npm start
   ```

---

## 2. Config essentielle

```js
// config.js
ownerNumbers: ["243993435287", "126002361581569"], // téléphone + LID
staffNumbers: ["2250..."],
prefix: ".",

elevenlabs: {
  apiKey: process.env.ELEVENLABS_API_KEY || "",
  modelId: "eleven_multilingual_v2"
}
```

**Owner en groupe** : toujours mettre le **numéro téléphone ET le LID**.  
Sinon le bot te reconnaît en PV mais pas en groupe.

Autres clés utiles : `groq`, `gemini`, `openrouter`, etc.

---

## 3. Rangs Hunter & XP

### Paliers (sévère++)

| Rang | XP total |
|------|----------|
| E | 0 |
| D | 300 |
| C | 1 000 |
| B | 3 000 |
| A | 8 000 |
| S | 20 000 |
| National | 50 000 |
| Monarch | 150 000 |

### Gagner de l’XP

| Commande | XP approx. | Fréquence |
|----------|------------|-----------|
| `.gate` | 15–145 | cooldown 2 h |
| `.donjon` | 10–200 | ~4 h |
| `.streak` | 5 + jours série | 1× / jour |
| `.arise` | +1 | libre |
| `.redeem CODE` | selon code | — |

### Profil
```text
.hunter · .evolution · .profile · .arise
```

Owner & staff = **exemptés** rangs min, quotas, cooldowns.

---

## 4. Quotas / jour & cooldowns

- **Quota/jour** = max d’utilisations sur 24 h selon le rang
- **Cooldown** = délai entre deux uses (plus bas si rang élevé)

Les commandes coûteuses (IA, téléchargements, `.teleget2`, `.clone`) ont des rangs min + limites strictes.

---

## 5. Menus

| Commande | Effet |
|----------|--------|
| `.menu` | Menu stylé + image/sticker parfois |
| `.menu ai` | Détail d’une catégorie |
| `.menu all` | Toutes les skills |
| `.bmenu` | Liste interactive (surtout **PV**) |
| `.bmenu text` | Menu texte (fiable en **groupe**) |
| `.bmenu buttons` | 3 boutons (souvent grisés hors Business) |

---

## 6. Déco : images, stickers, sons

Sur `.ping`, `.menu`, `.arise`, `.hunter`, `.gate`, `.profile`… :

- image carrée aléatoire (Jin-Woo / Gojo / Nagi)
- sticker animé parfois
- SFX (note vocale courte)

```text
.sfx list
.sfx ping | arise | gate | menu | success | fail | levelup | click
```

Dossiers : `assets/random/` · `assets/stickers/` · `assets/sfx/`

---

## 7. Stickers Telegram

| Commande | Rôle |
|----------|------|
| `.teleget <pack>` | Stickers un par un |
| `.teleget2 <pack>` | Pack entier natif WhatsApp |
| `.telepack` | Aide |

`.teleget2` → rang **A+**, quotas stricts.

---

## 8. TTS simple (sans clone)

```text
.tts Bonjour les chasseurs
```

- 100 % local (`espeak-ng` + `ffmpeg`)
- Voix robotique
- Aucune clé API

---

## 9. Voice clone — guide détaillé

### Principe

1. Tu captures un **sample vocal** (quelqu’un parle dans un vocal WhatsApp)
2. Le bot l’envoie à **ElevenLabs** (Instant Voice Clone) si une clé API est configurée
3. ElevenLabs crée une **voice_id**
4. Tu génères des messages vocaux qui **imitent** cette voix via TTS ElevenLabs

Sans clé API : le sample est **stocké en local**, mais aucune synthèse « voix clonée » n’est possible.

### Prérequis

1. Compte [ElevenLabs](https://elevenlabs.io)
2. Clé API (Profile → API Key)
3. Plan permettant **Instant Voice Cloning** (souvent **payant** ; le free est limité / bloqué)
4. Dans le bot :
   ```bash
   export ELEVENLABS_API_KEY=sk_xxxxxxxx
   ```
   ou dans `config.js` :
   ```js
   elevenlabs: {
     apiKey: "sk_xxxxxxxx",
     modelId: "eleven_multilingual_v2"  // bon pour le français
   }
   ```

### Commandes

| Commande | Action |
|----------|--------|
| Répondre à un **vocal** + `.clone` | Enregistre le sample (+ crée la voix cloud si API OK) |
| `.clone say <texte>` | Génère un vocal avec la voix clonée |
| `.clone <texte>` | Raccourci de `say` si la voix est déjà prête |
| `.clone status` | Sample local ? voice_id ? API ? |
| `.clone del` | Supprime le clone local |

### Tutoriel pas à pas

1. **Accord** de la personne (obligatoire).
2. Elle envoie un vocal **clair**, 10–30 secondes, peu de bruit, une seule voix.
3. Tu **réponds** à ce message avec :
   ```text
   .clone
   ```
4. Si l’API est OK, le bot répond : *Voix clonée prête*.
5. Tu génères un message :
   ```text
   .clone say Salut, c’est un test du système EGO
   ```
6. Le bot envoie une **note vocale** WhatsApp dans la voix clonée.

### Qualité du sample (très important)

| Bon sample | Mauvais sample |
|------------|----------------|
| 10–30 s | 1–2 s ou 2 min de bruit |
| Voix seule, proche du micro | Musique / plusieurs personnes |
| Débit naturel, phrases complètes | Chuchotement / saturation |
| Français clair si tu veux du FR | Gros accent + bruit de rue |

Un mauvais sample = voix robotique, accent bizarre, ou échec API.

### Accès bot (sévère++)

- Rang minimum : **B**
- Cooldown : ~20 s
- Quota / jour selon rang (Monarch souvent illimité)

### Limites techniques & coûts

- **Crédits ElevenLabs** : chaque `.clone say` consomme des caractères / crédits
- **Instant Voice Clone** : souvent réservé aux plans payants
- WhatsApp : l’audio part en `ptt` (bulle vocal)
- Fichiers locaux : `data/voiceSamples/` + `data/voiceClones.json`
- Taille sample max côté bot : ~3 Mo

### Éthique & règles

- Clone **uniquement avec consentement** explicite
- Ne pas utiliser pour usurpation, arnaques, harcèlement, deepfake malveillant
- Tu es responsable de l’usage de ta clé API et des contenus générés
- En cas d’abus, supprime la voix : `.clone del` (+ suppression côté ElevenLabs si besoin)

### Dépannage clone

| Problème | Solution |
|----------|----------|
| « Pas de clé ElevenLabs » | `ELEVENLABS_API_KEY` ou `config.elevenlabs.apiKey` |
| « Clone ElevenLabs échoué » | Plan free / quota / format audio — vérifier le compte EL |
| « Pas de voix active » | Refaire `.clone` en **reply** sur un vocal |
| Vocal non détecté | Répondre au message audio (pas copier le lien) |
| Qualité médiocre | Nouveau sample plus long et plus propre |
| Rang insuffisant | Monter en XP (`.gate` / `.donjon`) ou rank B+ |

### Différence `.tts` vs `.clone`

| | `.tts` | `.clone` |
|--|--------|----------|
| Voix | Robot espeak | Voix d’une personne (si clonée) |
| Réseau | Non | Oui (ElevenLabs) |
| Clé API | Non | Oui |
| Coût | Gratuit | Crédits EL |
| Qualité | Basse | Haute (selon plan/sample) |

---

## 10. Codes XP / rang (owner)

```text
.paycode xp 1000 NUMERO 2000FCFA 48h
.paycode rank B NUMERO 5000FCFA 7j
.gencode xp 500 10 24h
.redeem EGO-XXXX-XXXX
.codes
```

Owner only pour créer ; tout le monde peut `.redeem` (si le code le permet).

---

## 11. Modération

| Commande | Rôle |
|----------|------|
| `.purge 10` | Supprime N messages **du bot** |
| `.purges` → `.purges confirm` | Expulse **tous les non-admins** |
| `.kick @user` | Expulser un membre |

`.purges` = admin + confirmation 30 s.

---

## 12. Problèmes fréquents

| Symptôme | Fix |
|----------|-----|
| Owner OK en PV, pas en groupe | `ownerNumbers` = tel + LID |
| Boutons grisés / bmenu vide en groupe | `.menu` ou `.bmenu text` |
| `No image processing library` | `npm i sharp` |
| `.tts` échoue | `espeak-ng` + `ffmpeg` |
| 401 device_removed | `rm -rf sessions/main` |
| `.clone` sans synthèse | Clé + plan ElevenLabs Instant Clone |

---

## 13. Checklist owner

1. Numéro **et** LID dans `ownerNumbers`
2. `npm i sharp`
3. Clés IA / ElevenLabs si besoin
4. `espeak-ng` + `ffmpeg` pour `.tts`
5. Tester PV puis groupe
6. Respecter le warm-up antiban Baron

---

_EGO.XD Baron — Triple Ego Domain_

---

## 17. Nouvelles commandes (pack)

| Commande | Catégorie | Description |
|----------|-----------|-------------|
| `.quest` / `.quest claim` | solo | Quête journalière XP + pièces |
| `.raid` | solo | Raid risqué (CD 6h) |
| `.boss` | solo | Combat boss (CD 3h) |
| `.domain` | anime | Domain Expansion aléatoire |
| `.ego` | fun | Citation Triple Ego |
| `.rateego` | fun | Score d'ego 0–100 |
| `.slots [mise]` | games | Machine à sous (pièces) |
