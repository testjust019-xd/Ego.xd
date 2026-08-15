# Héberger EGO.XD gratuitement (sans carte bancaire)

## ⚠️ Pas Vercel / Netlify pour le bot WhatsApp

Vercel et Netlify sont **serverless** : le process s’arrête entre les requêtes.
Un bot WhatsApp (Baileys) a besoin d’une **connexion WebSocket ouverte en permanence**.

→ Sur Vercel le bot **ne restera pas connecté**.

## Options gratuites adaptées

| Plateforme | CB requise ? | Adapté bot WA ? | Notes |
|---|---|---|---|
| **Render** (Web Service Free) | Non pour free | Oui | S’endort après ~15 min → utilise UptimeRobot |
| **Railway** | Souvent trial | Oui | Crédits gratuits limités |
| **Glitch** | Non | Moyen | Peut dormir |
| **VPS gratuit** (Oracle Cloud free tier) | CB parfois | Oui (meilleur) | Plus technique |
| **Termux** (ton téléphone) | Non | Oui | Bot sur ton Android |

## Render (recommandé, simple, sans CB)

1. Compte sur https://dashboard.render.com (GitHub)
2. **New → Web Service** → ton repo
3. **Build** : `npm install`
4. **Start** : `node start.js`
5. Health Check Path : `/health`
6. Déploie

Ton lien de pairing :
```text
https://NOM-DU-SERVICE.onrender.com/
```

Dans `config.js` :
```js
publicUrl: "https://NOM-DU-SERVICE.onrender.com"
```

Anti-sleep gratuit : https://uptimerobot.com  
→ monitor HTTP toutes les 5 min sur `https://...onrender.com/health`

## La page web Triple Ego

Une fois déployé, ouvre l’URL Render :
- Entre ton numéro (sans +)
- **AWAKEN EGO** → code
- WhatsApp → Appareils liés → Lier avec un numéro → code

Même moteur que `.pair`.
