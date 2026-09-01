# QuizArena

Plateforme de quiz compétitif à argent réel (FCFA, Cameroun) : duels 1v1 temps réel, matchs contre l'ordinateur, tournois à élimination directe, spectateurs, guerres de clans, classement et VIP.

Voir [`ARCHITECTURE.md`](./ARCHITECTURE.md) pour une description complète et à jour de l'architecture, des modules, du modèle de données et du déploiement.

## Structure

- `backend/` : API Fastify, WebSocket, Prisma/PostgreSQL et moteur serveur-autoritaire. Partagé entre les deux éditions ci-dessous (même code, bases de données et secrets séparés).
- `frontend/` : interface React (CRA) **réellement utilisée en production** — c'est elle qui sert `quizarenaworld.com` (édition Classic, port 3010) via `frontend/server.js`.
- `frontend-v2/` : refonte visuelle (React/Vite) commencée en août 2026, **abandonnée depuis le 22/08** au profit de la poursuite de l'itération sur `frontend/`. Conservée pour référence de design uniquement, pas déployée.

## Éditions

Le même code backend sert deux éditions isolées, chacune avec sa propre base PostgreSQL, son propre secret JWT et son propre Redis :

- **Classic** (`APP_EDITION=classic`, port interne 4010) : `quizarenaworld.com`, sans clans ni guerres de clans.
- **Main** (`APP_EDITION=main`, port interne 4000) : édition complète avec clans/guerres de clans, également servie sous `campus-connect-ngoa.cm/jeu` dans le cadre du projet Campus Connect.

## Développement

```bash
cd backend
npm install
npm run prisma:generate
npm run build
npm test

cd ../frontend
npm install
npm run build
```

Copier les fichiers `.env.example` vers des fichiers `.env` locaux et renseigner les valeurs nécessaires. Les fichiers `.env`, clés, identifiants et builds de production sont exclus de Git.

## Sécurité du jeu

Les scores, chronomètres, réponses, mises et paiements sont validés par le serveur. Les mises de guerre de clans sont séquestrées dans une transaction PostgreSQL atomique et le pot est réparti automatiquement entre les combattants gagnants.
