# QuizArena

Plateforme de quiz compétitif : duels temps réel, matchs contre l’ordinateur, tournois, spectateurs et guerres de clans.

## Structure

- `backend/` : API Fastify, WebSocket, Prisma/PostgreSQL et moteur serveur-autoritaire.
- `frontend-v2/` : interface React/Vite actuellement utilisée en production.
- `frontend/` : ancienne interface conservée pour l’historique et la migration.

## Développement

```bash
cd backend
npm install
npm run prisma:generate
npm run build
npm test

cd ../frontend-v2
npm install
npm run build
```

Copier les fichiers `.env.example` vers des fichiers `.env` locaux et renseigner les valeurs nécessaires. Les fichiers `.env`, clés, identifiants et builds de production sont exclus de Git.

## Sécurité du jeu

Les scores, chronomètres, réponses, mises et paiements sont validés par le serveur. Les mises de guerre de clans sont séquestrées dans une transaction PostgreSQL atomique et le pot est réparti automatiquement entre les combattants gagnants.
