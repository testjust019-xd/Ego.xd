# ⚽ Mode Manager — Installation

## 1. Installation
Dézippe cette archive **à la racine de ton projet kingai-v2**, en acceptant
d'écraser/fusionner les dossiers `lib/` et `commands/`. Rien d'autre à
installer : aucune nouvelle dépendance npm, aucune modif de `index.js` ou de
`commandLoader.js` nécessaire — le loader charge automatiquement tout
nouveau dossier dans `commands/`.

Fichiers ajoutés :
```
lib/managerDB.js          ← persistance (data/manager.json, créé automatiquement)
lib/managerEngine.js       ← moteur de jeu (génération joueurs, simulation matchs, calendrier...)
commands/manager/club.js
commands/manager/effectif.js
commands/manager/marche.js
commands/manager/recruter.js
commands/manager/vendre.js
commands/manager/tactique.js
commands/manager/entrainement.js
commands/manager/amical.js
commands/manager/recette.js
commands/manager/stade.js
commands/manager/classement.js
commands/manager/defier.js
commands/manager/accepter.js
commands/manager/refuser.js
commands/manager/ligue.js
commands/manager/proposer.js
commands/manager/offres.js
commands/manager/accepteroffre.js
commands/manager/refuseroffre.js
```

## 2. Commandes

| Commande | Effet |
|---|---|
| `.club <nom>` | Crée ton club (une seule fois) avec 5 000 000 € et 11 joueurs |
| `.club` | Affiche la fiche de ton club (budget, réputation, tactique, bilan) |
| `.effectif` | Liste tes joueurs (note, potentiel, âge, valeur) |
| `.marche` | Marché des transferts (6 joueurs, renouvelé toutes les 6h) |
| `.recruter <n>` | Achète le joueur n° n du marché |
| `.vendre <n>` | Vend le joueur n° n de ton effectif (60% de sa valeur) |
| `.tactique` | Liste les formations disponibles |
| `.tactique <formation>` | Change de formation (ex: `.tactique 4-3-3`) |
| `.entrainement` | Entraîne 3 joueurs au hasard (coûte 8 000 €, cooldown 4h) |
| `.amical` | Joue un match contre un club adverse généré (cooldown 2h) |
| `.recette` | Encaisse la billetterie de ton stade (cooldown 3h) |
| `.stade` | Affiche ton stade et le coût du niveau suivant |
| `.stade upgrade` | Améliore ton stade (5 niveaux, jusqu'à 80 000 places) |
| `.classement` | Classement de tous les clubs par points |

## 3. Comment ça marche (résumé du moteur)
- **Force du club** = moyenne des 11 meilleurs joueurs, ajustée par la
  réputation et la tactique choisie (chaque formation a un profil
  attaque/défense différent).
- **Simulation des matchs** : les buts sont tirés selon une loi de Poisson
  pondérée par l'écart de force avec l'adversaire (généré aléatoirement à
  chaque `.amical`, avec un nom de club rival).
- **Progression des joueurs** : l'entraînement augmente la note d'1 à 3
  joueurs au hasard, plafonnée par leur potentiel (les jeunes joueurs ont un
  potentiel plus élevé).
- **Économie** : budget de départ, revenus de match, recette de stade
  passive, achat/vente sur le marché — tout est persistant dans
  `data/manager.json` (comme `data/users.json` pour l'économie classique).

Tout est indépendant du système `.balance`/`.daily` existant : c'est une
économie et une progression propres au club, pas liées aux pièces du bot.

## 4. Mode multijoueur

### Défis directs (PvP, dans un groupe ou en DM)
| Commande | Effet |
|---|---|
| `.defier` | Réponds au message d'un manager (ou mentionne-le) pour le défier. Défi valable 15 min. |
| `.accepter` | Accepte le défi en attente contre toi → simule un vrai match entre les deux effectifs et tactiques réels (pas de NPC). Les deux managers touchent une récompense selon le résultat. |
| `.refuser` | Refuse le défi en attente. |

Cooldown de 30 min par club entre deux défis PvP (indépendant du cooldown `.amical`).

### Championnat de groupe
| Commande | Effet |
|---|---|
| `.ligue creer <nom>` | Crée la ligue du groupe (une seule active à la fois). |
| `.ligue rejoindre` | Inscrit ton club tant que le calendrier n'est pas généré. |
| `.ligue calendrier` | Génère un calendrier aller simple (chacun affronte chacun une fois, méthode du cercle) — verrouille les inscriptions. Sans argument après génération : affiche les matchs restants. |
| `.ligue jouer` | Joue ton prochain match programmé (simulation immédiate avec les vrais effectifs/tactiques). |
| `.ligue classement` | Classement de la ligue du groupe (points, V/N/D, différence de buts) — distinct du `.classement` global. |
| `.ligue reset` | Réinitialise la ligue (admin du groupe ou créateur de la ligue uniquement) pour lancer une nouvelle saison. |

### Marché entre managers (transferts joueur-à-joueur)
| Commande | Effet |
|---|---|
| `.proposer <numéro effectif> <prix>` | Réponds/mentionne un manager pour lui proposer un de tes joueurs contre un prix. |
| `.offres` | Liste tes offres reçues et envoyées, avec leur référence. |
| `.accepteroffre <réf>` | Accepte une offre reçue : le joueur change de club, l'argent est transféré (si ton budget suffit). |
| `.refuseroffre <réf>` | Refuse une offre reçue. |

Le calendrier round-robin et la simulation PvP ont été testés (10 clubs
générés, calendrier vérifié sans doublon de paires, cohérence buts marqués
= buts encaissés sur l'ensemble d'une saison simulée).


## 5. Compétitions avancées (enrichissement)

### Coupe (élimination directe)
| Commande | Effet |
|---|---|
| `.coupe creer <nom>` | Crée la coupe du groupe |
| `.coupe rejoindre` | S'inscrire |
| `.coupe lancer` | Génère le tableau (min. 4 clubs, prolongations + TAB) |
| `.coupe jouer` | Joue ton match de coupe |
| `.coupe tableau` | Affiche le bracket |
| `.coupe reset` | Reset (admin/créateur) |

### Ligue des Champions
| Commande | Effet |
|---|---|
| `.ucl creer <nom>` | Crée l'UCL |
| `.ucl rejoindre` | S'inscrire |
| `.ucl groupes` | Tire les poules + calendrier (min. 4) |
| `.ucl jouer` | Match de poule ou de phase finale |
| `.ucl classement` | Classements des groupes |
| `.ucl phases` | Tableau des phases finales |
| `.ucl reset` | Reset |

### Matchs ultra-détaillés
Les matchs de ligue, coupe, UCL et PvP affichent désormais :
buteurs + minutes, possession, tirs cadrés, corners, cartons, prolongations/TAB.


## 6. Boutique & Mercato public

### Boutique (`.boutique`)
Articles : boost_moral, boost_train, scout_jeune, medecin, boost_rep, talisman, agent  
`.boutique acheter <id>`

### Mercato public (entre managers)
| Commande | Effet |
|---|---|
| `.mercato` | Liste les annonces |
| `.mercato lister <n°> <prix>` | Met un joueur en vente |
| `.mercato acheter <réf>` | Achète |
| `.mercato retirer <réf>` | Retire ton annonce |

Le marché NPC (`.marche` / `.recruter`) reste séparé.
