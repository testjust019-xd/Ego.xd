# Accès, rangs, cooldowns & limites — EGO.XD

## Fichier central : `lib/commandAccess.js`

Tout se configure **ici** :
- `COMMAND_RULES` → règles précises par commande (`minRank`, `dailyLimit`, `cooldown`)
- `CATEGORY_DEFAULTS` → défauts si la commande n’est pas listée
- `RANK_DAILY_DEFAULT` → quotas journaliers par rang
- `RANK_COOLDOWN_MULTIPLIER` → réduction des cooldowns selon le rang

### Exemple de règle

```js
ai: { minRank: 'C', dailyLimit: true, cooldown: 8 },
```

- `minRank: 'C'` → inaccessible avant le rang C
- `dailyLimit: true` → utilise le tableau (E=1 … Monarch=illimité)
- `dailyLimit: 3` → 3 utilisations/jour pour le rang E, scale pour les rangs plus hauts
- `cooldown: 8` → 8 secondes de base (réduit selon le rang)

## Limites journalières (par défaut)

| Rang      | Utilisations / jour |
|-----------|---------------------|
| E         | 1                   |
| D         | 2                   |
| C         | 3                   |
| B         | 5                   |
| A         | 8                   |
| S         | 15                  |
| National  | 30                  |
| Monarch   | Illimité            |

Reset : minuit UTC.

## Cooldowns

Le cooldown de base est multiplié selon le rang (Monarch ≈ 5 % du temps d’attente).

Owner = jamais limité / jamais en cooldown.

## Activation YouTube (1 seule fois)

1. Au premier usage d’une commande (sauf menu/help/ping/activate…), le bot affiche les chaînes.
2. L’utilisateur suit **au moins une** chaîne puis tape `.activate`.
3. L’activation est **permanente** (stockée dans `data/activated.json`).

### Comment le bot sait s’ils se sont abonnés ?

**Il ne le vérifie pas techniquement.**  
YouTube ne fournit pas d’API simple pour vérifier un abonnement depuis un bot WhatsApp (il faudrait OAuth Google côté utilisateur, trop lourd).

La méthode utilisée est **sur la confiance** (honor system) :
- On montre les liens
- L’utilisateur tape `.activate` après s’être abonné
- C’est le standard pour la plupart des bots gratuits

Si plus tard tu veux une vérif stricte, il faudrait une API YouTube + un flux OAuth (complexe).

## Modifier les accès

1. Ouvre `lib/commandAccess.js`
2. Change `COMMAND_RULES` ou `RANK_DAILY_DEFAULT`
3. Redémarre le bot

Pas besoin de toucher chaque fichier de commande.

## Fichiers liés

- `lib/commandAccess.js` — config centrale
- `lib/dailyLimit.js` — compteur journalier
- `lib/cooldown.js` — anti-spam
- `lib/activation.js` — activation unique YouTube
- `lib/rankGate.js` — comparaison de rangs
- `lib/messageHandler.js` — applique tout dans l’ordre : privé → activate → rang → daily → cooldown → execute


## Exemple : `.lyrics` réservé au rang C (5×/jour)

Dans `lib/commandAccess.js` → `COMMAND_RULES` :

```js
lyrics: {
  minRank: 'C',
  dailyLimit: { C: 5, B: 8, A: 12, S: 20, National: 40, Monarch: -1 },
  cooldown: 6
},
```

| Rang      | Accès | Utilisations / jour |
|-----------|-------|---------------------|
| E / D     | ❌    | —                   |
| C         | ✅    | 5                   |
| B         | ✅    | 8                   |
| A         | ✅    | 12                  |
| S         | ✅    | 20                  |
| National  | ✅    | 40                  |
| Monarch   | ✅    | Illimité            |

### 3 façons de définir `dailyLimit`

1. `true` → tableau global (E=1, D=2, C=3, B=5…)
2. `5` → 5 pour E, puis scale (C≈15, S≈75…)
3. `{ C: 5, B: 8, Monarch: -1 }` → **quota exact** par rang (recommandé)
