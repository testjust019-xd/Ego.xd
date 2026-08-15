# EGO.XD — Déploiement 24/7 sur Render

## 1. Préparer le repo

1. Crée un repo GitHub (public ou privé)
2. Upload tout le dossier `kingai-v2` (ou pousse avec git)
3. **Ne commit pas** le dossier `sessions/` (auth WhatsApp privée)

## 2. Créer le service sur Render

1. Va sur https://dashboard.render.com
2. **New +** → **Web Service**
3. Connecte ton repo GitHub
4. Réglages :
   - **Name** : `ego-xd`
   - **Runtime** : Node
   - **Build Command** : `npm install`
   - **Start Command** : `node start.js`
   - **Instance type** : Free (ou Starter pour vrai 24/7)
5. **Advanced** → Health Check Path : `/health`
6. Deploy

## 3. Première connexion WhatsApp

Sur Render free, les logs sont dans **Logs**.

Au démarrage, le bot affiche un **code d'appairage** (si `pairing.enabled: true` dans `config.js`).

1. Ouvre WhatsApp → **Appareils liés** → **Lier un appareil** → **Lier avec un numéro**
2. Entre le code affiché dans les logs Render
3. Une fois lié, la session est sauvée dans `sessions/` sur le disque éphémère

### ⚠️ Important (plan Free)

- Le **disque est éphémère** : à chaque redeploy, la session peut être perdue → il faut re-scanner.
- Pour garder la session : utilise un **persistent disk** (plan payant) monté sur `/opt/render/project/src/sessions`
  ou sauvegarde le dossier `sessions/` ailleurs.

Alternative : page web de pairing  
`https://TON-SERVICE.onrender.com/`

## 4. Vrai 24/7 sur le plan Free

Le plan **Free** s'endort après ~15 min sans requête HTTP.

**Solution gratuite** : ping toutes les 5–10 min

1. Crée un monitor sur https://uptimerobot.com (gratuit)
2. Type : HTTP(s)
3. URL : `https://TON-SERVICE.onrender.com/health`
4. Intervalle : 5 minutes

Ça empêche Render d'endormir le service.

## 5. Plan payant (recommandé bot WhatsApp)

- **Starter** (~7$/mois) : pas de sleep, disque persistant possible
- Monte un disk sur le chemin `sessions` pour ne plus re-lier WhatsApp après chaque deploy

## 6. Variables d'environnement (optionnel)

Tu peux déplacer les clés API hors de `config.js` plus tard. Pour l'instant elles sont dans le fichier.

## 7. Vérifier que ça tourne

```
GET https://TON-SERVICE.onrender.com/health
→ { "ok": true, "bot": "EGO.XD", "uptime": 123 }
```

WhatsApp : envoie `.menu` au bot.
