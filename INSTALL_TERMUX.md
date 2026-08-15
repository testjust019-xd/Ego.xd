# Installation Termux — EGO.XD

## Erreur `Permission denied (publickey)` / git SSH

npm essayait de cloner via `git@github.com` (SSH).  
La dépendance est maintenant en **HTTPS**.

### Installation

```bash
cd ~/downloads/ego-bot   # ou ton dossier

# Optionnel mais recommandé
pkg update -y
pkg install nodejs git -y

# Nettoie un éventuel install raté
rm -rf node_modules package-lock.json

# Installe
npm install
```

Si ça bloque encore sur git :

```bash
git config --global url."https://github.com/".insteadOf ssh://git@github.com/
git config --global url."https://github.com/".insteadOf git@github.com:
npm install
```

### Lancer

```bash
npm start
# ou
node index.js
```

Scanne le QR avec WhatsApp → Appareils connectés.

### Node.js

Il faut **Node ≥ 20**. Vérifie :

```bash
node -v
```

Si trop vieux :

```bash
pkg install nodejs-lts
# ou suis la doc Termux pour Node 20+
```
