# QuizArena — Spécification Anti-Triche & Anti-Fraude

> **Statut** : Planifié — à implémenter avec le backend  
> **Priorité** : Haute (dès la mise en production avec argent réel)  
> **Date de rédaction** : Juin 2026

---

## Table des matières

1. [Contexte & vecteurs d'attaque](#1-contexte--vecteurs-dattaque)
2. [Mesures côté client (déjà partiellement en place)](#2-mesures-côté-client)
3. [Mesures côté serveur — Anti-triche en temps réel](#3-mesures-côté-serveur--anti-triche-en-temps-réel)
4. [Algorithme de scoring de suspicion par joueur](#4-algorithme-de-scoring-de-suspicion)
5. [Analyse comportementale — profil joueur](#5-analyse-comportementale--profil-joueur)
6. [Supervision des comptes — règles de détection](#6-supervision-des-comptes--règles-de-détection)
7. [Système de sanctions gradué](#7-système-de-sanctions-gradué)
8. [Dashboard admin — supervision temps réel](#8-dashboard-admin--supervision-temps-réel)
9. [Architecture technique recommandée](#9-architecture-technique-recommandée)
10. [Roadmap d'implémentation](#10-roadmap-dimplémentation)

---

## 1. Contexte & vecteurs d'attaque

### 1.1 Types de tricheurs

| Type | Description | Fréquence estimée |
|------|-------------|-------------------|
| **IA / ChatGPT** | Copie-colle la question, attend la réponse | Élevée |
| **Google / moteur** | Recherche rapide sur onglet parallèle | Très élevée |
| **Multi-comptes** | Crée plusieurs comptes pour farmer les bonus | Moyenne |
| **Collusion Duel** | Deux complices jouent ensemble pour que l'un gagne toujours | Faible mais coûteuse |
| **Bot automatisé** | Script qui joue à la place du joueur via API | Faible mais critique |
| **Account sharing** | Compte partagé entre plusieurs personnes expertes | Faible |
| **Timing attack** | Attend que le timer soit presque écoulé pour répondre | Très faible |

### 1.2 Pourquoi c'est critique

- Duel avec mise : un tricheur gagne ~+80% de la mise à chaque partie → pertes directes pour les autres joueurs et pour la house
- Solo Challenge : payout 3× à 10/10 → un bot parfait vide les caisses
- ELO manipulé : fausse les classements, nuit à l'expérience des joueurs honnêtes

---

## 2. Mesures côté client

> Ces mesures sont un frein, pas une solution absolue. La vraie protection est serveur.

### 2.1 Déjà implémenté

- [x] **Shuffle des réponses** : Fisher-Yates par question, l'index de la bonne réponse change à chaque rendu (`shuffleOptions()` dans QuizPlay.jsx)
- [x] **Timer visible** : 20 secondes par question (à descendre à 15s)
- [x] **Pas de stockage des réponses côté client** : le score est calculé localement mais doit être validé serveur

### 2.2 À implémenter côté client

#### Détection de changement d'onglet / focus
```js
// QuizPlay.jsx — dans le useEffect phase "playing"
const tabSwitchRef = useRef(0);
const answerTimingsRef = useRef([]); // ms depuis affichage question

useEffect(() => {
  if (phase !== "playing") return;
  const onBlur = () => { tabSwitchRef.current += 1; };
  const onVis  = () => { if (document.hidden) tabSwitchRef.current += 1; };
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVis);
  return () => {
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("visibilitychange", onVis);
  };
}, [phase]);

// À la fin de la partie : envoyer tabSwitchRef.current et answerTimingsRef.current au serveur
```

#### Désactiver copier-coller sur les questions
```js
// Sur le composant question
<div
  className="quiz-question"
  onCopy={(e) => e.preventDefault()}
  onCut={(e) => e.preventDefault()}
  onContextMenu={(e) => e.preventDefault()}
  style={{ userSelect: "none" }}
>
```

#### Enregistrement des timings de réponse
```js
// Au moment où la question s'affiche :
const questionShownAt = Date.now();

// Au moment où le joueur répond :
const responseTimeMs = Date.now() - questionShownAt;
answerTimingsRef.current.push(responseTimeMs);
```

### 2.3 Payload à envoyer au serveur en fin de partie
```json
{
  "sessionId": "uuid",
  "categoryId": "histoire",
  "isChallenge": true,
  "stake": 500,
  "answers": [
    { "questionId": "q_001", "chosen": 2, "correct": true,  "responseMs": 3200 },
    { "questionId": "q_002", "chosen": 0, "correct": false, "responseMs": 8100 },
    ...
  ],
  "tabSwitches": 2,
  "totalDurationMs": 187400
}
```

---

## 3. Mesures côté serveur — Anti-triche en temps réel

### 3.1 Validation du score

Le serveur **recalcule lui-même le score** à partir des `questionId` + `chosen` envoyés. Le score client n'est jamais accepté tel quel.

```
POST /api/quiz/submit
→ recalcule correct[] côté serveur
→ compare avec answers[].correct envoyées par le client
→ si divergence > 0 : fraude flagrée, score côté serveur utilisé
```

### 3.2 Validation temporelle

```
durée_attendue = nb_questions × timer_question (ex: 10 × 20s = 200s)
durée_réelle   = totalDurationMs / 1000

Si durée_réelle < durée_attendue × 0.4 → IMPOSSIBLE (bot ou manipulation)
Si durée_réelle > durée_attendue × 3.0 → Suspect (session laissée ouverte)
```

### 3.3 Validation des timings individuels

```
Pour chaque réponse :
  Si responseMs < 800ms  → réponse quasi-instantanée → suspect (bot)
  Si responseMs < 1500ms → très rapide → incrémenter score de suspicion
  Si responseMs > timer_ms - 500ms → a attendu la fin → flag potentiel

Calcul :
  fastAnswers = answers.filter(a => a.responseMs < 1500).length
  Si fastAnswers > 7/10 → flag "BOT_SPEED"
```

### 3.4 Vérification de session unique

- Un `sessionId` ne peut être soumis qu'une seule fois
- Une question ne peut pas être posée deux fois dans la même session (évite le refresh pour retenter)
- Le serveur génère les questions et les envoie chiffrées (les options shuffle se font côté serveur)

---

## 4. Algorithme de scoring de suspicion

Chaque partie soumise génère un **score de suspicion** entre 0 et 100.

### 4.1 Facteurs et poids

```
SUSPICION_SCORE = 0

// Changements d'onglet
+15 par tabSwitch (plafonné à +45)

// Vitesse de réponse anormalement haute
fastAnswerRate = fastAnswers / totalQuestions
+30 si fastAnswerRate > 0.8
+15 si fastAnswerRate > 0.6

// Score parfait ou quasi-parfait
+20 si score == 10/10
+10 si score == 9/10

// Variance de timing trop faible (bot : temps très réguliers)
timingStdDev = écart-type des responseMs
+25 si timingStdDev < 300ms (réponses trop uniformes)

// Combinaison : score parfait + vitesse anormale
+20 bonus si (score >= 9) && (fastAnswerRate > 0.7)

// Historique du joueur
+10 si win_rate_30j > 85%
+10 si score_moyen_30j > 8.5/10

SUSPICION_SCORE = min(100, total)
```

### 4.2 Seuils d'action

| Score | Niveau | Action |
|-------|--------|--------|
| 0–29  | ✅ Normal | Aucune |
| 30–49 | ⚠️ Attention | Log + surveillance passive |
| 50–69 | 🟠 Suspect | Flag compte + révision manuelle déclenchée |
| 70–89 | 🔴 Très suspect | Gains mis en quarantaine 24h, alerte admin |
| 90–100 | ❌ Fraude probable | Suspension préventive immédiate |

---

## 5. Analyse comportementale — profil joueur

### 5.1 Métriques à collecter par joueur

```sql
-- Table player_stats (agrégée, mise à jour après chaque partie)
CREATE TABLE player_stats (
  player_id        UUID PRIMARY KEY,
  
  -- Performance globale
  total_games      INTEGER,
  win_rate_global  FLOAT,      -- % de victoires
  avg_score        FLOAT,      -- score moyen /10
  avg_response_ms  FLOAT,      -- temps de réponse moyen
  
  -- Fenêtre glissante 7 jours
  games_7d         INTEGER,
  win_rate_7d      FLOAT,
  avg_score_7d     FLOAT,
  coins_won_7d     INTEGER,
  coins_lost_7d    INTEGER,
  
  -- Fenêtre glissante 30 jours
  games_30d        INTEGER,
  win_rate_30d     FLOAT,
  avg_score_30d    FLOAT,
  
  -- Indicateurs comportementaux
  avg_tab_switches FLOAT,      -- moyenne de sorties fenêtre par partie
  fast_answer_rate FLOAT,      -- % réponses < 1.5s
  timing_variance  FLOAT,      -- variance des temps de réponse
  
  -- ELO et progression
  elo_current      INTEGER,
  elo_delta_7d     INTEGER,    -- progression ELO sur 7j
  
  -- Anti-fraude
  suspicion_score  FLOAT,      -- score de suspicion moyen (30 dernières parties)
  flags_count      INTEGER,    -- nombre de flags levés
  last_flag_at     TIMESTAMP,
  account_status   ENUM('active', 'watched', 'suspended', 'banned')
);
```

### 5.2 Profil de joueur normal vs suspect

| Métrique | Joueur normal | Suspect IA/Google | Bot |
|----------|--------------|-------------------|-----|
| Score moyen | 5–7 /10 | 8–10 /10 | 10/10 |
| Win rate | 40–60% | 80–95% | 99%+ |
| Temps réponse moyen | 6–12s | 3–6s | 0.5–2s |
| Variance timing | >2s écart-type | 1–2s | <0.5s |
| Tab switches / partie | 0 | 1–3 | 0 |
| Sessions / jour | 1–5 | 3–10 | 20–100+ |

### 5.3 Détection de collusion (Duels)

```
Pour deux joueurs A et B :
  Calculer : nb_parties_ensemble, win_rate_A_vs_B, win_rate_B_vs_A
  
  COLLUSION si :
    nb_parties_ensemble > 10
    ET (win_rate_A_vs_B > 90% OU win_rate_B_vs_A > 90%)
    ET abs(elo_A - elo_B) < 200  (même niveau donc résultat anormal)
    
→ Flag les deux comptes pour révision
→ Geler les gains inter-parties en quarantaine
```

### 5.4 Détection de multi-comptes

```
Indicateurs de même personne derrière plusieurs comptes :
  - Même IP d'inscription ou de connexion fréquente
  - Même empreinte navigateur (User-Agent + résolution + timezone + plugins)
  - Pattern de jeu identique (mêmes heures, mêmes catégories, même timing)
  - Transactions coins entre comptes liés
  
Action : merger les flags des comptes liés
```

---

## 6. Supervision des comptes — règles de détection

### 6.1 Règles automatiques (déclenchent un flag)

```
RÈGLE R01 — Bot speed
  Si (avg_response_ms < 1500) ET (games_total > 5)
  → FLAG "RESPONSE_TOO_FAST"

RÈGLE R02 — Win rate anormal
  Si (win_rate_30d > 85%) ET (games_30d > 10)
  → FLAG "ABNORMAL_WIN_RATE"

RÈGLE R03 — Score parfait répété
  Si 3 parties consécutives avec score = 10/10 en mode Challenge
  → FLAG "REPEATED_PERFECT_SCORE"
  → Gains de la 3ème partie en quarantaine jusqu'à révision

RÈGLE R04 — Farming de coins
  Si (coins_won_7d > 50000) ET (win_rate_7d > 80%)
  → FLAG "COIN_FARMING"

RÈGLE R05 — Multi-compte probable
  Si même_ip.nb_comptes > 2
  → FLAG "MULTI_ACCOUNT_IP"

RÈGLE R06 — ELO anormal
  Si elo_delta_7d > 300
  → FLAG "RAPID_ELO_CLIMB"

RÈGLE R07 — Collusion détectée
  (voir algorithme section 5.3)
  → FLAG "COLLUSION"

RÈGLE R08 — Abandon sélectif (triche inverse)
  Si (abandon_rate > 40%) ET (abandoned_games corrèlent avec mauvais timing early)
  → Joueur abandonne quand il sait qu'il va perdre pour ne pas perdre de coins
  → FLAG "SELECTIVE_ABANDONMENT"
```

### 6.2 Scoring de risque global du compte

```
RISK_SCORE = 0
+ flags_count × 10
+ max(0, (win_rate_30d - 0.65) / 0.35 × 30)   // 0 si win_rate ≤ 65%, 30 si 100%
+ max(0, (avg_score_30d - 7.0) / 3.0 × 20)    // 0 si avg ≤ 7, 20 si 10/10
+ max(0, (1.0 - timing_variance / 3000) × 20) // timing trop régulier
+ (avg_tab_switches > 1.0 ? 10 : 0)
+ (fast_answer_rate > 0.6 ? 15 : 0)

RISK_SCORE = min(100, RISK_SCORE)
```

---

## 7. Système de sanctions gradué

### 7.1 Niveaux de sanction

```
NIVEAU 0 — Surveillance silencieuse
  Déclencheur : RISK_SCORE 30–49 ou 1 flag
  Action : Logging renforcé, aucune action visible
  Durée : 7 jours

NIVEAU 1 — Avertissement
  Déclencheur : RISK_SCORE 50–64 ou 2 flags
  Action : Notification in-app "Activité inhabituelle détectée sur ton compte"
           Gains mis en quarantaine 24h avant crédit
  Durée : 14 jours

NIVEAU 2 — Restriction
  Déclencheur : RISK_SCORE 65–79 ou 3 flags ou fraude avérée légère
  Action : Limite de mise réduite (max 250 coins au lieu de 2500)
           Impossible de jouer en Duel pendant 72h
           Email d'avertissement
  Durée : 30 jours

NIVEAU 3 — Suspension temporaire
  Déclencheur : RISK_SCORE 80–94 ou fraude avérée
  Action : Compte suspendu 7 jours
           Gains de la semaine précédente en quarantaine (révision manuelle)
           Email de suspension avec procédure de contestation

NIVEAU 4 — Ban permanent
  Déclencheur : RISK_SCORE 95+ ou fraude répétée ou bot avéré
  Action : Compte banni définitivement
           Solde de coins confisqué
           IP bannie (soft-ban, contournable)
           Email de ban avec possibilité de recours sous 30 jours
```

### 7.2 Procédure de contestation

Les joueurs peuvent contester via `support@quizarena.app`. Un humain révise :
- L'historique complet des parties
- Les flags et leur déclencheur
- Les preuves de timing anormal

Délai de réponse : 5 jours ouvrés.

---

## 8. Dashboard admin — supervision temps réel

### 8.1 Vue globale (temps réel)

```
Métriques affichées en temps réel :
  - Parties actives en ce moment
  - Parties en cours avec suspicion_score > 50
  - Flags levés dans la dernière heure
  - Joueurs en NIVEAU 1+ actuellement
  - Top 10 coins gagnés aujourd'hui (détecter anomalies)
  - Alertes actives (requiert action humaine)
```

### 8.2 Vue par joueur

```
Fiche joueur admin :
  - Identité + date d'inscription + dernière connexion
  - RISK_SCORE actuel + historique sur 30j (graphe)
  - Niveau de sanction actuel
  - Liste des flags avec détail (règle, date, partie concernée)
  - Historique des 50 dernières parties :
      score, mise, gain/perte, suspicion_score, tabSwitches, avgResponseMs
  - Graphe : score moyen par semaine (stabilisation suspecte = bot)
  - Graphe : timing moyen par semaine (baisse soudaine = IA adoptée)
  - Relations : comptes liés (même IP, device fingerprint)
  - Actions admin : warn / restrict / suspend / ban + motif
```

### 8.3 Alertes automatiques à traiter

```
Priorité CRITIQUE :
  - RISK_SCORE > 90 sur un compte avec coins_won_7d > 10000
  - Bot détecté (timing_variance < 200ms sur 10+ parties)
  - Collusion confirmée (R07) entre 2 comptes avec gros volumes

Priorité HAUTE :
  - 3 flags en moins de 24h sur un même compte
  - Win_rate_7d > 90% avec games_7d > 20
  - Nouveau compte (< 7 jours) avec coins_won > 5000

Priorité NORMALE :
  - RISK_SCORE passé au-dessus de 50
  - Multi-compte IP détecté
```

---

## 9. Architecture technique recommandée

### 9.1 Stack

```
Backend : Node.js (Express ou Fastify) + PostgreSQL
Cache/temps réel : Redis (sessions actives, suspicion scores en cours)
Queue : Bull/BullMQ (traitement asynchrone des analyses post-partie)
Analytics : ClickHouse ou PostgreSQL + TimescaleDB pour les séries temporelles
Admin UI : React + recharts (graphes comportementaux)
```

### 9.2 Flow d'une partie avec anti-triche

```
1. GET  /api/quiz/start
   → Serveur génère les questions, shuffle les options, retourne questions chiffrées
   → Crée une session Redis : { sessionId, playerId, questions, startedAt }

2. [Joueur joue côté client]
   → Client enregistre timings, tabSwitches localement

3. POST /api/quiz/submit  { sessionId, answers[], tabSwitches, totalDurationMs }
   → Valide sessionId (existe, pas déjà soumis, pas expiré)
   → Recalcule score serveur
   → Valide timing global
   → Calcule suspicion_score de la partie
   → Applique les règles R01–R08
   → Si suspicion < 50 : crédite immédiatement
   → Si suspicion 50–69 : crédite après délai de 1h (vérification async)
   → Si suspicion ≥ 70 : crédite en quarantaine, alerte admin

4. ASYNC : Job d'analyse comportementale
   → Met à jour player_stats
   → Recalcule RISK_SCORE global
   → Déclenche éventuellement changement de niveau de sanction
```

### 9.3 Endpoints API anti-fraude

```
POST   /api/quiz/start                   → Démarre session, retourne questions
POST   /api/quiz/submit                  → Soumet résultats, retourne gains
GET    /api/admin/players/flags          → Liste des flags actifs (admin)
GET    /api/admin/players/:id/analysis   → Analyse complète d'un joueur (admin)
POST   /api/admin/players/:id/sanction   → Applique une sanction (admin)
GET    /api/admin/alerts                 → Alertes temps réel (admin)
```

---

## 10. Roadmap d'implémentation

### Phase 1 — Backend de base + validation serveur
- [ ] Endpoint `POST /api/quiz/start` avec génération serveur des questions
- [ ] Endpoint `POST /api/quiz/submit` avec recalcul score + validation timing
- [ ] Table `quiz_sessions` + `quiz_answers` en base
- [ ] Calcul basique du `suspicion_score` par partie (R01, R02, R03)

### Phase 2 — Profiling joueur
- [ ] Table `player_stats` + mise à jour après chaque partie
- [ ] Calcul `RISK_SCORE` global
- [ ] Implémentation des règles R01 à R08
- [ ] Système de quarantaine des gains

### Phase 3 — Dashboard admin
- [ ] Interface admin : vue globale + alertes
- [ ] Fiche joueur avec historique et graphes
- [ ] Actions admin (sanction, déblocage)
- [ ] Notifications email automatiques

### Phase 4 — Détection avancée
- [ ] Device fingerprinting (multi-comptes)
- [ ] Détection de collusion (analyse des pairs de joueurs)
- [ ] Modèle ML simple sur les timings (anomaly detection)
- [ ] Rapport hebdomadaire automatique admin

---

## Notes importantes

- **Ne jamais** afficher à l'utilisateur le détail de ce qui l'a fait flaguer (évite le contournement)
- **Toujours** avoir une procédure de recours humaine — les faux positifs existent
- **Journaliser** toutes les décisions automatiques de sanction avec leur justification
- **Tester** les règles sur des données réelles avant de les activer en production (risque de faux positifs massifs)
- Les **timings côté client** sont indicatifs, pas de preuve absolue — ne jamais bannir sur ce seul critère

---

*Document interne QuizArena — Ne pas partager publiquement*
