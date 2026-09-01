# Architecture QuizArena

Document de référence — état au 1er septembre 2026.

## 1. Vue d'ensemble

QuizArena est une plateforme de quiz compétitif à argent réel (FCFA, marché camerounais). Un seul code source backend et un seul code source frontend servent **deux éditions** déployées indépendamment, avec des bases de données, secrets et process complètement isolés :

| Édition | Domaine | Frontend (port) | Backend (port interne) | Base | Particularités |
|---|---|---|---|---|---|
| **Classic** | `quizarenaworld.com` | 3010 | 4010 | `quizarena_classic` | Sans clans ni guerres de clans |
| **Main** | `campus-connect-ngoa.cm/jeu` | 3011 (`quizarena-v2`) | 4000 | `quizarena` | Édition complète (clans, guerres de clans), intégrée dans le projet Campus Connect (app Symfony séparée) |

Aucune donnée n'est partagée entre les deux au runtime — même code, exécutions indépendantes.

## 2. Frontend

**`frontend/`** (React 18, Create React App/craco) est la seule interface du dépôt — c'est elle qui sert Classic en production.

### Structure

- `src/pages/` : une page par route. Les pages volumineuses sont découpées en dossiers (`Profile/`, `Wallet/`, `DuelSetup/`, `DuelPlay/`) plutôt qu'un seul fichier géant — convention à poursuivre pour toute nouvelle page substantielle.
- `src/components/` : composants partagés entre plusieurs pages.
- `src/lib/` : couche réseau unique (`api.js` pour REST, `duelSocket.js` pour le WebSocket temps réel), utilitaires (devise, dates, sons, musique).
- `src/context/AppContext.jsx` : session utilisateur, solde, thème.
- `src/data/mockData.js` / `questions.js` : **plus utilisées comme source de jeu** (tout vient du backend) — seulement la table icône/couleur/nom des catégories affichées côté client.

### Points clés

- Aucune donnée mock présentée comme réelle : toutes les listes (joueurs, classement, historique, wallet) viennent d'appels API réels, paginés côté serveur.
- Thème clair/sombre : tokens CSS dans `index.css` (`:root` = sombre par défaut, `html.light` = clair). Tout texte qui flotte sur un fond volontairement toujours sombre (`AmbientBackground`, écrans de duel) doit être épinglé en clair, jamais en `var(--text)`.
- `server.js` (déployé, pas buildé) : petit serveur Node qui sert le build statique et fait office de reverse proxy vers le backend pour `/api/`, `/ws/`, `/webhook/` et le dashboard admin.

## 3. Backend

Fastify + TypeScript + Prisma/PostgreSQL + Redis, WebSocket natif (`@fastify/websocket`) pour le temps réel.

### Modules (`src/modules/`)

| Module | Rôle |
|---|---|
| `auth` | Inscription/connexion, vérification e-mail, mot de passe oublié, sessions multi-appareils |
| `quiz` | Solo : sélection de questions, soumission, anti-triche, statistiques |
| `duel` | Moteur temps réel (voir §4) : matchmaking, invitations, bot, tournoi, guerre de clans, WebSocket |
| `tournament` | Brackets à élimination directe, invitations nominatives, couvertures uploadées |
| `clans` / `clan-wars` | Clans, guerres de clans (édition Main uniquement) |
| `wallet` | Dépôts/retraits SharePay, ledger append-only, réconciliation |
| `players` | Profils publics, classement, annuaire paginé, joueurs en ligne |
| `admin` | Backoffice (modération, paramètres, contenu) |
| `push` | Notifications Web Push (VAPID) |
| `campaigns` | E-mails/push marketing automatiques, contexte réel par joueur |
| `uploads` / `avatar` | Fichiers utilisateurs (avatars, couvertures de tournoi) |
| `vip` | Statut VIP (30 victoires de duel/mois glissant) |
| `public` | Endpoints publics (stats, maintenance) |

### Modèle de données (Prisma, extraits par domaine)

- **Identité** : `User`, `LoginSession`, `PushSubscription`
- **Argent** : `Transaction` (ledger append-only : dépôt, retrait, mise, gain, remboursement, bonus)
- **Contenu** : `Category`, `Question`, `QuestionExposure`
- **Solo** : `QuizSession`, `QuizAnswer`
- **Duel** : `DuelMatch`, `DuelAnswer`
- **Tournoi** : `Tournament`, `TournamentEntry`, `TournamentInvite`, `TournamentMatch`
- **Clans** (Main) : `Clan`, `ClanMember`, `ClanJoinRequest`, `ClanInvite`, `ClanWar`, `ClanWarSearch`, `ClanWarMember`, `ClanWarMatch`
- **Modération** : `Flag`, `UserReport`
- **Stats** : `PlayerStats`

Migrations Prisma écrites à la main (pas d'accès direct à la base de dev locale) puis appliquées via `prisma migrate deploy` sur le serveur — toujours vérifier que le schéma local correspond avant d'écrire une migration.

## 4. Moteur de duel temps réel (`duel/engine.ts`)

Le composant le plus critique du backend — état en mémoire d'un seul process Node (pas de cluster ; migrerait vers Redis si besoin de scaler horizontalement).

Principes anti-triche (voir `ANTICHEAT_SPEC.md`) :
- Le serveur choisit les questions, mesure le temps de réponse lui-même, ne révèle la bonne réponse qu'une fois les deux joueurs répondus ou le temps écoulé.
- Abandonner en cours de partie = défaite (pas une annulation) — seule une déconnexion **avant** la première question annule et rembourse.
- Chrono partagé armé seulement quand les deux joueurs ont confirmé le chargement de la question (média compris) — sinon celui avec une connexion plus lente perd du temps de réponse.
- **Chrono** : 13 secondes par question en duel, 8 secondes en solo (constantes séparées, volontairement différentes).
- Égalité de score = remboursement (draw réel) en duel normal ; en tournoi/guerre de clans, un départage par rapidité de réponse force un vainqueur (contrainte structurelle du bracket).

Sous-domaines du fichier : file d'attente, invitations (lien privé/duel ouvert/défi direct), bot (3 niveaux), création de match, intégration tournoi/guerre de clans, déroulé question par question, fin de partie et paiement, reconnexion/pause, anti-triche changement d'onglet.

## 5. Paiements (SharePay)

Agrégateur Mobile Money (MTN MoMo, Orange Money) — `wallet/payment-provider.ts`.

- **Dépôt/retrait** : `POST /pay-in/charge` (push USSD direct, pas de page hébergée) et `POST /pay-out/transfer`.
- **Confirmation** : webhook signé HMAC-SHA256 (`X-Sharepay-Signature`) sur `/webhook/sharepay` — chemin **sans** préfixe `/api`, celui enregistré côté dashboard SharePay (le proxy frontend le reconnaît explicitement, voir `server.js` `isBackendPath`).
- **Filet de sécurité** : le webhook n'est pas garanti fiable à 100 % (cas réel constaté où SharePay n'a jamais notifié) — un balayage périodique (`wallet/reconcile.ts`, toutes les 20s) interroge directement le statut des transactions `PENDING` en retard.
- Toggles admin `blockDeposits`/`blockWithdrawals`/`maintenance` dans `settings.json` (racine du dossier backend sur le serveur), lus via `lib/settings.ts`.

## 6. Déploiement

Serveur VPS partagé (k3s + Traefik + de nombreux autres projets), plus des process systemd hors cluster pour QuizArena :

- `quizarena-frontend.service` → `frontend/server.js`, port 3010 (Classic)
- `quizarena-classic-backend.service` → backend compilé, port 4010
- `quizarena-v2.service` → frontend Main, port 3011
- `quizarena-backend.service` → backend Main, port 4000
- Traefik route `quizarenaworld.com`/`www.` vers 3010 via un `Service`/`Endpoints` headless pointant sur le process hôte (pattern documenté, plusieurs projets du serveur l'utilisent).
- Postgres + Redis de l'édition Main tournent en conteneurs Docker sur le même hôte (`quizarena-backend-postgres-1`, `quizarena-backend-redis-1`).
- Déploiement backend : `rsync` séparé de `src/` et `prisma/` (jamais combinés dans un seul appel — un mélange a déjà corrompu un déploiement en aplatissant les dossiers), puis `prisma generate && prisma migrate deploy && tsc` sur le serveur, puis restart du service.
- Déploiement frontend : `npm run build` en local, puis `rsync --delete` du dossier `build/` vers le serveur.

## 7. Banque de questions (`backend/scripts/questionbank/`)

Pipeline de contenu versionné et vérifiable :

- `data/*.mjs` : lots numérotés séquentiellement (« vagues »), chacun un tableau de questions `{ categoryId, subcategory, textFr, options[4], answerIndex, sourceUrl }`.
- `validate.mjs` : porte de qualité obligatoire — rejette les énoncés vagues/d'opinion, les options ambiguës ou dupliquées (une fois normalisées), l'absence de `sourceUrl` (traçabilité en cas de contestation sur une plateforme à argent réel), les questions d'actualité non datées.
- `import.mjs` : charge **tous** les fichiers de `data/`, mélange `answerIndex` avant validation (écrire `answerIndex: 0` partout est la convention — le mélange est automatique), puis `--dry` (aperçu), `--append` (ajoute) ou `--replace` (remplace tout en une transaction). Pour importer un seul nouveau lot sans re-signaler tous les anciens comme doublons, isoler temporairement le nouveau fichier dans `data/` le temps de l'import.
- 15 catégories actives (dont **Logique**, ajoutée le 01/09/2026 : suites, probabilités, paradoxes, déduction).

## 8. Décisions notables / dette technique connue

- Ancien service `_legacy-emergent-stub` côté Main : mort, à ne pas toucher sans raison explicite.
- Plusieurs dossiers `*.bak-*` traînent sur le serveur (déploiements précédents) — laissés en l'état, pas de suppression sans confirmation.
- Le dépôt local accumule fréquemment un retard important entre le code réellement déployé et les derniers commits — toujours vérifier `git status`/diffs avant de supposer que `main` reflète la prod.
