# EGO.XD — Addons fusionnés (+)

Base historique + **addons de cette session** (Group Factory, Hub web, login OTP, staff, live Socket.IO).

---

## Addons d’origine

| Addon | Contenu |
|-------|---------|
| **Interface web jeux** | webViews, Socket.IO, liens `/g/<token>` |
| **Menu status** | Mode PUBLIC / PRIVATE |
| **Stabilité** | logger Baileys silencieux, filtre decrypt |
| **QR lien image** | api.qrserver.com dans les logs |
| **Anti-sleep** | `lib/keepAlive.js` → `/health` |
| **Jeux web v2** | course, slots, roulette, etc. |

---

## Addons (+) session actuelle

### A. Pairing & sessions
| Addon | Fichiers | Détail |
|-------|----------|--------|
| **SESSION_DIR** | `config.js`, `sessionManager`, `index.js` | Dossier sessions configurable (VPS / disk Render) |
| **Pairing env** | `config.js` | `PAIRING_ENABLED` + `PAIRING_PHONE` |
| **Force pair** | `start.js` `/api/pair` | Body `{ force: true }` pour regénérer |
| **Jeux web fix** | `start.js`, `game-client.js`, `gameWeb.js` | Rôle joueur envoyé au navigateur + `PUBLIC_URL` |

### B. Group Factory
| Addon | Fichiers | Détail |
|-------|----------|--------|
| **peopleDB** | `lib/peopleDB.js` | Annuaire inter-session, opt-in, tags |
| **groupsDB** | `lib/groupsDB.js` | Groupes premium, jobs, timeline |
| **groupFactory** | `lib/groupFactory.js` | Création, pin, file 24 h, créateur admin **à la fin** |
| **factoryLimit** | `lib/factoryLimit.js` | **4 créations / semaine**, rang **S+** |
| **Commandes** | `commands/groups/*` | `.optin` `.optout` `.settag` `.people` `.pool` `.getgroup` `.creategroup` `.groupinfo` `.joingrouproup` |

**Règles Factory**
- Rang mini **S+** (ou staff / owner)
- Max **4** créations / semaine (`.getgroup` + `.creategroup`)
- Ajouts étalés ~24 h
- Créateur **pas** dans le groupe pendant la construction → admin **à la fin**
- Message épinglé « en construction »
- Code interne `EGO-XXXX`

### C. Hub web connecté
| Addon | Route / fichier | Détail |
|-------|-----------------|--------|
| **Hub UI** | `/hub` · `hub.html` `hub.css` `hub.js` | Command center |
| **Overview / pool / groups / top** | `/api/hub/*` | Stats live |
| **Fiche groupe** | `/group/EGO-XXXX` | Roster + timeline + progression |
| **Login OTP WA** | `lib/webLogin.js` | Code 6 chiffres sur WhatsApp → profil + mes groupes |
| **Staff** | `/api/hub/staff/*` | Force / pause / resume job (`ADMIN_TOKEN`) |
| **Socket.IO factory** | `factory:progress` | Progression live sans reload |

---

## Variables d’environnement recommandées

```env
PORT=3000
PUBLIC_URL=https://ton-domaine-ou-ip:3000
PAIRING_ENABLED=false
PAIRING_PHONE=2250xxxxxxxxx
SESSION_DIR=sessions
ADMIN_TOKEN=change-moi
WEB_TOKEN_SECRET=autre-secret-long
KEEPALIVE=1
BAILEYS_LOG_LEVEL=error
```

---

## Commandes WhatsApp (rappel Factory)

```text
.optin / .optout
.settag foot,ci
.people [@user]
.pool                    (staff)
.getgroup 50 --tag foot --minrank B --name "Match Night"
.creategroup "Nom" @a @b
.groupinfo EGO-XXXX
.joingrouproup EGO-XXXX
```

---

## Pages web

| URL | Rôle |
|-----|------|
| `/` | Pairing + lien Hub |
| `/hub` | Dashboard connecté |
| `/group/EGO-XXXX` | Fiche factory |
| `/g/<token>` | Jeux live |
| `/top` | Classement |
| `/admin?token=` | Admin jeux |
| `/health` | Healthcheck |

---

## Déploiement

1. `npm install` (Node ≥ 20)
2. Copier `.env.example` → `.env`
3. `node start.js` ou `pm2 start start.js --name ego-xd`
4. VPS : voir `DEPLOY_VPS_GRATUIT.md`
5. Render : `PUBLIC_URL` + UptimeRobot sur `/health`

---

## Idées addons futurs (non codés)

1. `.raidgate` — lobby raid 24 h + boss web  
2. `.draft` — draft Blue Lock depuis le pool  
3. `.tournament` — bracket + duels  
4. Login hub → actions perso (optin depuis le site)  
5. Page groupe : lien invite WA si staff  
