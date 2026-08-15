# EGO.XD v3.0.0 — Roadmap + 10 originales

## Install
Écrase / fusionne ce dossier `kingai-v2` sur ton projet existant.
Aucune nouvelle dépendance npm obligatoire.
Redémarre le bot : les commandes se chargent automatiquement.

## Version
- `config.js` → version **3.0.0**
- `.cdm26` **non inclus** (exclu comme demandé)

## Foot (roadmap)
| Cmd | Effet |
|---|---|
| `.h2h <e1> <e2>` | Historique confrontations (TheSportsDB) |
| `.cotes <match>` | Cotes indicatives (démo uniquement) |
| `.pronostic <match>` | Pronostic IA (+ fallback local) |
| `.compo <équipe>` | Effectif connu |
| `.blessures <équipe>` | Sources / placeholder |
| `.arena <nom>` | Infos stade |
| `.ballondor` | Vainqueurs récents Ballon d'Or |
| `.cdmqualif` | Zones qualifications CDM |

## Jeux / gamification
`.duel` `.donjon` `.streak` `.pendu` `.motmystere` `.combat` `.roulette` `.puzzle` `.riddle`

## Anime / Solo Leveling
`.anime` `.character` `.solobook` `.evolution` `.gate` `.skillup` `.blaze` `.cosplay`

## Outils
`.remind` `.meteo7` `.qrscan` `.currency` `.screenshot` `.pdf` `.background`
`.password` `.timer` `.note` `.base64` `.color`

## Social
`.confession` `.top` `.horoscope`

## CI / Afrique
`.nouchi` `.proverbe` `.taximetre` `.momo` `.radio` `.afrique`

## Fun
`.commit` `.bugfix` `.startup`

## 10 commandes originales (carte blanche)
| Cmd | Effet |
|---|---|
| `.arise` | Fenêtre système Solo Leveling |
| `.shadow` | Extraction d'ombre |
| `.hunter` | Profil chasseur (XP / rang) |
| `.password` | Générateur de mot de passe |
| `.timer` | Compte à rebours |
| `.note` | Notes personnelles |
| `.riddle` | Énigmes |
| `.afrique` | Fait aléatoire Afrique |
| `.base64` | Encode / decode Base64 |
| `.color` | Info couleur HEX |

## Fichiers lib ajoutés
- `lib/gameSessions.js`
- `lib/streakDB.js`
- `lib/hunterDB.js`
- `lib/notesDB.js`
- `lib/reminders.js` (+ poller au connect dans `index.js`)

## Données persistantes
`data/hunters.json` · `streaks.json` · `notes.json` · `reminders.json` · `confessionLog.json`

## Limites assumées
- `.qrscan` / `.background` : placeholders (deps image non ajoutées)
- `.cotes` : purement indicatif, pas un bookmaker
- `.screenshot` : via thum.io (peut être rate-limité)

## Patch — Private mode + play3 / lyrics3 + images + apk2

### Mode privé
- `.private on|off|status` (owner only) — quand ON, seuls owner, staff (`config.staffNumbers`) et VIP peuvent lancer des commandes.
- `.privatevip list|add <num>|del <num>` — numéros autorisés malgré le mode privé (format international sans +).

### Musique / paroles
- `.play` / `.play2` : envoient maintenant la **miniature** YouTube avant l'audio.
- `.play3 <titre>` : clip **vidéo** (pas audio).
- `.lyrics` / `.lyrics2` : image de couverture si l'API la fournit.
- `.lyrics3 <titre>` : télécharge une **vidéo de paroles** (lyrics video).

### Foot
- `.joueur` : photo du joueur (cutout/thumb TheSportsDB).
- `.equipe` : badge du club.

### APK
- `.apk2 <package|nom>` : envoie le **fichier APK** (F-Droid uniquement, apps open source). Pour les apps propriétaires, reste sur `.apk` (liens).
