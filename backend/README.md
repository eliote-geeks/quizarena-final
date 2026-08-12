# QuizArena — backend

Node.js + TypeScript + Fastify + PostgreSQL (Prisma) + Redis.

## Pourquoi ce stack, pas celui du dossier `_legacy-emergent-stub/`

Le projet a été initialisé via emergent.sh, qui scaffold systématiquement
FastAPI + React + MongoDB — générique, jamais réellement utilisé ici (le
`server.py` d'origine ne contenait qu'un health-check de démo, 0 route
métier). `ANTICHEAT_SPEC.md`, écrit indépendamment dans ce même repo,
recommande de son côté Node + PostgreSQL + Redis (§9.1) — les deux mêmes
personnes/sessions n'étaient donc déjà pas d'accord avec le scaffold par
défaut. Ce backend suit la recommandation du spec, pour deux raisons
concrètes en plus de la cohérence :

- **PostgreSQL, pas MongoDB, pour l'argent.** Le portefeuille est un ledger
  append-only (voir `src/modules/wallet/ledger.ts`) : chaque variation de
  solde est une ligne, jamais un `UPDATE`. Ça a besoin de vraies
  transactions ACID avec isolation sérialisable pour empêcher un double
  retrait concurrent — naturel en Postgres, plus fragile à garantir en Mongo.
- **Un seul runtime avec le front** (Node/TS), pour partager types et
  outillage plus tard si besoin.

## Démarrer en local

```bash
cp .env.example .env
docker compose up -d          # postgres + redis
npm install
npm run prisma:migrate        # crée le schéma
npm run seed                  # importe les 445 questions de frontend/src/data/questions.js
npm run dev                   # http://localhost:4000
```

`npm run build && npm start` pour la version compilée.

## Ce qui est fait — Phase 1 (validé par tests bout-en-bout, pas juste écrit)

**Le principe qui traverse tout le backend : le client ne décide jamais du
score ni de l'argent.** Concrètement :

- **Auth** — `POST /api/auth/{register,login}`, JWT, bcrypt.
- **Portefeuille** — ledger append-only, `POST /api/wallet/{deposit,withdraw}`
  derrière un `PaymentProvider` simulé (voir plus bas), `debit()` en
  transaction Postgres `SERIALIZABLE` avec retry sur conflit.
- **Moteur de quiz anti-triche** (`ANTICHEAT_SPEC.md` Phase 1 du roadmap,
  §10) :
  - `POST /api/quiz/start` — le serveur choisit les questions, mélange les
    options, **ne renvoie jamais l'index de la bonne réponse**. La mise est
    débitée à l'ouverture de la session, pas à la soumission (sinon un
    joueur peut ouvrir N sessions Challenge en parallèle sur un solde qui
    n'en couvre qu'une).
  - `POST /api/quiz/submit` — recalcule le score à partir des
    `questionId`/`chosenIndex` reçus, jamais du score envoyé par le client.
    Calcule un `suspicion_score` par partie (§4.1 du spec : vitesse de
    réponse, régularité du timing, score parfait, changements d'onglet) +
    R01/R02/R03 sur l'historique du joueur (§6.1). 0-49 → crédité tout de
    suite, 50-89 → gain mis en `QUARANTINED` (exclu du solde) + `Flag`
    créé, jamais révélé au joueur (§10 du spec : ne pas dire ce qui flague,
    ça donne la méthode pour contourner).
  - Testé avec un vrai scénario de triche (bot qui lit la réponse en base
    et répond en ~200 ms sur les 7 questions) : `suspicionScore` à 100,
    5 règles déclenchées, gain de 1000 F mis en quarantaine, `balanceCoins`
    inchangé. Et avec un joueur honnête (5/7, timings 2,5-9 s) : crédité
    immédiatement, aucun flag. Les deux scénarios sont dans l'historique de
    session si besoin de les rejouer.
- **Banque de questions** — les 445 questions réelles de
  `frontend/src/data/questions.js` importées telles quelles (`prisma/seed.ts`),
  pas de contenu inventé.
- **ELO** — `src/lib/elo.ts`, port exact de `eloEngine.js` (même formule
  des deux côtés).

## Ce qui est volontairement un stub

**Mobile Money (Orange Money / MTN MoMo).** Aucun accès marchand n'est
disponible pour l'instant. `src/modules/wallet/payment-provider.ts` définit
l'interface (`requestDeposit`/`requestWithdrawal`) et une implémentation
simulée qui confirme immédiatement — le reste du système (débit/crédit,
statuts `PENDING`/`COMPLETED`, webhook de confirmation) est déjà câblé pour
un vrai provider : le jour où les clés arrivent, il n'y a qu'à écrire
`OrangeMoneyProvider`/`MtnMomoProvider` derrière la même interface.

## Prochaines phases (pas construites ici, pour rester honnête sur le périmètre)

1. **Duel temps réel.** `DuelMatch` existe en base mais rien n'écrit dedans
   — il manque le moteur WebSocket qui synchronise deux joueurs réels
   (matchmaking par ELO, horodatage serveur autoritaire pour que les
   animations CSS des deux clients se déclenchent au même instant malgré
   la latence réseau — c'est le seul endroit où le backend touche à
   l'animation : il ne l'anime pas, il donne l'heure).
2. **Règles R04-R08 du spec** (multi-compte/IP, dérive ELO rapide,
   collusion, abandon sélectif) — demandent respectivement un fingerprint
   device, l'historique ELO réel (dépend du moteur de duel), et une
   fenêtre de comparaison par paire de joueurs.
3. **Job asynchrone** (BullMQ, déjà dans le stack recommandé par le spec)
   pour sortir `updatePlayerStats` du chemin critique de `submit()` une
   fois le volume de parties/seconde suffisant pour que ça compte.
4. **Dashboard admin** (§8 du spec) — vue des flags, fiche joueur, actions
   de sanction manuelles.
5. **Brancher le front v1** (`frontend/src/`) sur ces endpoints — pour
   l'instant `AppContext.jsx` et `QuizPlay.jsx`/`DuelPlay.jsx` tournent
   entièrement sur données locales, aucun `fetch`/`axios` vers ce backend.

## Déploiement

Pas encore fait. Suivre le même schéma que le front (`quizarena-frontend`,
`quizarena-v2` : systemd + rsync sur 79.137.32.27) : un service
`quizarena-backend` sur un port dédié (ex. 4000), Postgres/Redis soit en
conteneurs sur le VPS soit managés séparément selon le volume attendu.
