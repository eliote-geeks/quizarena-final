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

## Banque de questions

La production combine des questions originales et une banque éditoriale issue d’[OpenQuizzDB](https://www.openquizzdb.org), sous licence [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr). Les contenus importés sont adaptés au classement thématique de QuizArena et les propositions sont mélangées par le serveur au moment de jouer.

- `backend/scripts/import-openquizzdb.mjs` : import idempotent, validation structurelle et dédoublonnage.
- `backend/scripts/generate-questions.mjs` : génération locale de brouillons inactifs, à relire avant publication.
- `backend/scripts/cleanup-test-data.mjs` : inventaire puis nettoyage explicite des données de préproduction avec `--execute`.

Le dashboard d’opérations permet de filtrer et modérer les questions, suivre les duels, clans, guerres et tournois, et gérer les pistes musicales diffusées par le site.
