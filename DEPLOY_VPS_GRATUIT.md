# Déployer EGO.XD sur un VPS gratuit (Oracle Cloud Free Tier)

Le disque d’un vrai VPS est **persistant** : une fois le bot lié, tu n’as plus à rescanner le QR à chaque redémarrage.

## 1. Créer le compte Oracle Cloud (gratuit)

1. Va sur https://www.oracle.com/cloud/free/
2. Crée un compte (carte bancaire demandée pour vérification, **0 €** si tu restes dans le free tier)
3. Région recommandée : proche de toi (ex. France Central, ou la plus proche)

## 2. Créer une VM Always Free

1. Menu → **Compute** → **Instances** → **Create Instance**
2. Shape : **VM.Standard.A1.Flex** (Ampere ARM)  
   - 1–4 OCPU, 6–24 Go RAM (reste dans Always Free)
   - Ou **VM.Standard.E2.1.Micro** (AMD, plus limité)
3. Image : **Ubuntu 22.04** ou **24.04**
4. Clé SSH : génère ou colle ta clé publique
5. Create → note l’**IP publique**

Ouvre le port 22 (SSH) et 3000 (bot) dans le Security List / Network Security Group :
- Ingress TCP 22 from 0.0.0.0/0 (ou ton IP)
- Ingress TCP 3000 from 0.0.0.0/0

## 3. Installer Node + dépendances sur la VM

```bash
ssh ubuntu@IP_PUBLIQUE

sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ffmpeg python3 python3-pip ca-certificates build-essential

# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# yt-dlp (optionnel, pour téléchargements)
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

node -v   # doit être >= 20
```

## 4. Uploader et lancer le bot

```bash
# Sur ton PC : envoie le zip
scp ego-xd-vps-fixed.zip ubuntu@IP_PUBLIQUE:~/

# Sur le VPS
cd ~
unzip ego-xd-vps-fixed.zip
cd ego-xd-main   # ou le nom du dossier extrait

# Config
cp .env.example .env
nano .env
# → mets PUBLIC_URL=http://IP_PUBLIQUE:3000
# → mets PAIRING_ENABLED=true et PAIRING_PHONE=ton_numero SANS +
# → ou laisse pairing false et scanne le QR dans les logs

npm install
# (peut prendre 2–5 min à cause de baron-baileys-v2 git)

# Test
node start.js
```

Dans les logs tu verras soit un **lien QR**, soit le **code pairing**.  
Lie WhatsApp → une fois connecté, Ctrl+C.

## 5. Garder le bot allumé (pm2)

```bash
sudo npm install -g pm2
pm2 start start.js --name ego-xd
pm2 save
pm2 startup
# copie-colle la commande que pm2 affiche (sudo env ...)
```

Logs : `pm2 logs ego-xd`  
Redémarrer : `pm2 restart ego-xd`

## 6. Variables utiles (.env)

```env
PORT=3000
PUBLIC_URL=http://TON_IP:3000
PAIRING_ENABLED=true
PAIRING_PHONE=2250xxxxxxxxx
SESSION_DIR=sessions
# ADMIN_TOKEN=change-moi
# GROQ_API_KEY=...
```

Sur VPS, `SESSION_DIR=sessions` suffit (disque local persistant).

## 7. Pare-feu Ubuntu (si ufw)

```bash
sudo ufw allow 22
sudo ufw allow 3000
sudo ufw enable
```

## 8. (Optionnel) Domaine + HTTPS

- Pointe un domaine vers l’IP
- Installe Caddy ou Nginx + Let’s Encrypt
- Mets `PUBLIC_URL=https://ton-domaine.com`

## Dépannage pairing

| Problème | Solution |
|----------|----------|
| Timeout code | Réessaie ; IP cloud parfois lente la 1re fois |
| Session déjà enregistrée | `rm -rf sessions/web_NUMERO` ou body `force: true` |
| Bot principal pas lié | Active `PAIRING_ENABLED=true` ou scanne le QR des logs |
| Déconnecté après reboot | Sur VPS ça ne doit pas arriver ; vérifie que `sessions/` existe encore |

## Alternative encore plus simple

**Termux** sur ton Android (voir `INSTALL_TERMUX.md`) : zéro serveur, disque local du téléphone.
