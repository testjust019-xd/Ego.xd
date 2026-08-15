# EGO.XD v2.2 — Foot + IA + Outils

## Foot (infos réelles)
| Commande | Description |
|---|---|
| `.live [ligue]` | Matchs du jour (ligue1, premier, liga, seriea, bundesliga, champions) |
| `.score <équipe>` | **Amélioré** — 5 derniers résultats |
| `.match <équipe>` | **Amélioré** — 5 prochains matchs |
| `.calendrier <équipe>` | Prochains matchs détaillés |
| `.equipe <nom>` | Fiche club (stade, coach, pays…) |
| `.joueur <nom>` | Fiche joueur |
| `.fclassement <ligue>` | Classement de ligue |
| `.buteurs [ligue]` | Derniers matchs / proxy buteurs |
| `.mercato` `.rumeurs` | Inchangés |

## IA
| Commande | Description |
|---|---|
| `.gemini <q>` | Google Gemini (clé gratuite AI Studio) |
| `.resume <texte>` | Résumé (ou reply) |
| `.corrige <texte>` | Orthographe / style |
| `.idee <sujet>` | Brainstorm |
| `.prompt <idée>` | Optimise un prompt |
| `.compare A vs B` | Comparaison structurée |
| `.histoire [thème]` | Courte histoire |
| `.roleplay perso \| msg` | Roleplay court |
| `.groq` `.ias` `.ai` `.assist`… | Inchangés |

Les commandes IA intelligentes utilisent un **fallback** : Groq → OpenRouter → Gemini (selon les clés présentes dans `config.js`).

## Outils
| Commande | Description |
|---|---|
| `.tempmail` | Email jetable + `.tempmail inbox` / `lire <n>` / `stop` |
| `.convert 100 usd en xof` | Devises (Frankfurter / open.er-api) |
| `.checknum 22507…` | Pays + opérateur (CI focus) |

## Bonus
| Commande | Description |
|---|---|
| `.sondage Q \| opt1 \| opt2` | Sondage texte avec numéros |

## Config à remplir
```js
gemini: {
  apiKey: "TA_CLE_GEMINI_ICI", // https://aistudio.google.com/apikey
  model: "gemini-2.0-flash"
}
```
(Groq / OpenRouter restent optionnels mais recommandés pour `.resume`, `.corrige`, etc.)

## Installation
Écrase / fusionne ce dossier `kingai-v2` sur ton projet existant.
Aucune nouvelle dépendance npm.
Redémarre le bot : les commandes se chargent automatiquement.

## Modération (v2.2.1)
| Commande | Effet |
|---|---|
| `.welcome on/off/set` | Message d'arrivée + **PP du membre** (sinon `assets/media/welcome.*`) |
| `.goodbye on/off/set` | Message de départ + PP / `assets/media/goodbye.*` |
| `.antidelete on/off` | Restaure messages supprimés : **texte + tous médias** |

Placeholders welcome/goodbye : `@user` · `{group}` · `{count}`
