# Audit terrain — QuizArena port 3010

Date : 22 août 2026  
Frontend local : `/home/paul/quizarena/frontend`  
Frontend serveur : `/home/ubuntu/quizarena/build`  
Service : `quizarena-frontend.service` (`0.0.0.0:3010`)  
Backend Classic : `/home/ubuntu/quizarena-classic-backend` / port interne `4010`

Base Classic : PostgreSQL `quizarena_classic` (rôle dédié `quizarena_classic`)

## Conclusion

Le frontend 3010 est une interface complète visuellement, mais son état
métier est entièrement simulé. Il n'existe actuellement aucun client HTTP ou
WebSocket dans `frontend/src`. L'identité, le solde, l'ELO, les résultats et la
progression sont modifiables dans `localStorage`; toutes les listes viennent de
`data/mockData.js`; les duels et paiements utilisent des temporisations.

Cette situation rend le produit impropre à une utilisation réelle avec mises :
un utilisateur peut modifier son solde et ses gains depuis les outils du
navigateur, se connecter avec n'importe quel mot de passe et obtenir des
résultats sans validation serveur.

## Modules réellement exposés par ce frontend

| Module visible | État avant audit | Backend retenu |
| --- | --- | --- |
| Inscription, connexion, session | localStorage + temporisation | `/api/auth/*` |
| Mot de passe oublié/réinitialisé | animation factice | module à compléter |
| Catégories et salles | banque JavaScript locale | `/api/categories` |
| Solo libre et challenge | score et argent calculés client | `/api/quiz/*` |
| Duel aléatoire et invitation | adversaire fictif | `/ws/duel` + `/api/duel/*` |
| Spectateurs/live | animation sur faux match | flux spectateur WebSocket |
| Tournois/bracket | tableaux statiques | `/api/tournaments/*` |
| Classement | faux joueurs | `/api/leaderboard` |
| Portefeuille | solde local et faux historique | `/api/wallet/*` |
| Profils joueurs | profils générés depuis le pseudo | `/api/players/*` |
| Historique/replays | faux replays | historique serveur à étendre |
| VIP mensuel | victoires localStorage | statistiques serveur à étendre |
| Thème, langue, devise | local, acceptable | conservation locale |

Le produit 3010 n'expose pas de clans, guerres de clans ou gestion collective.
Ces modules ne doivent donc pas apparaître dans son interface ni dans son
dashboard dédié.

## Isolation avec l'autre QuizArena

Le code métier est mutualisé dans le dépôt afin de maintenir les mêmes
garanties anti-triche, mais les deux produits ne partagent aucune donnée à
l'exécution :

- l'application principale utilise l'API `4000`, la base `quizarena` et Redis
  sans namespace Classic ;
- l'édition Classic utilise l'API interne `4010`, la base
  `quizarena_classic`, un rôle PostgreSQL distinct, Redis DB `1`, un secret JWT
  distinct et des clés `localStorage` distinctes ;
- le serveur public `3010` reverse-proxy uniquement ses chemins `/api`, `/ws`
  et son dashboard vers `4010` ;
- les catégories/questions ont été copiées une fois comme contenu initial :
  elles sont désormais physiquement indépendantes et peuvent diverger ;
- aucun joueur, solde, historique, transaction, tournoi ou clan n'a été
  importé. Seul le compte d'administration de démarrage est dupliqué pour
  permettre l'exploitation du nouveau backoffice.

## Dashboard nécessaire

Le backoffice du produit 3010 doit couvrir : vue générale, utilisateurs,
comptes et sanctions, transactions, dépôts/retraits, quarantaine, questions,
catégories, duels, spectateurs, tournois, signalements, musique, maintenance et
paramètres. L'accès doit réutiliser le rôle `isAdmin` et les JWT du backend,
sans compte administrateur codé dans le HTML.

## Ordre de remise en service

1. Authentification et hydratation serveur du compte/solde.
2. Quiz solo serveur-autoritaire.
3. Duels WebSocket, invitations et spectateurs.
4. Tournois, classement, profils et historique.
5. Portefeuille et opérations Mobile Money.
6. VIP/replays, dashboard dédié, tests de sécurité et déploiement.

## État de réalisation — première mise en service

Déployé le 22 août 2026 : authentification/session réelle, portefeuille et
historique paginé, catégories de l'édition Classic, challenge solo
serveur-autoritaire, duels aléatoires/ouverts/privés, phase de confirmation,
changement du dernier choix jusqu'à l'échéance, spectateurs et compteur,
classement par gains, profils publics/signalements, historique vérifiable des
duels, création/inscription/bracket de tournoi et dashboard Classic dédié.

La base Classic contient 6 400 questions actives dans les 14 catégories
présentes dans son identité produit. Elle ne récupère plus automatiquement les
ajouts ou modifications de l'édition principale.

Dashboard Classic :
`http://79.137.32.27:3010/ops-classic-3010-b92f2835255d`

Les paiements Classic sont volontairement bloqués (`503`) tant que des
identifiants SharePay propres à ce produit et leur webhook ne sont pas
configurés. En production, l'absence de clé ne bascule jamais sur le fournisseur
simulé.

Reste à traiter dans une itération dédiée : envoi réel des e-mails de
réinitialisation (aucun SMTP n'est configuré sur le serveur), modèle VIP et
parrainage. Les anciennes « rediffusions » détaillées étaient impossibles à
conserver honnêtement : le moteur historique ne persiste pas encore la
permutation exacte des quatre propositions. L'écran affiche donc actuellement
un historique officiel, sans simuler une rediffusion.
