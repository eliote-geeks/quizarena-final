# QuizArena — Plateforme de Pari sur Quiz Vidéoludiques

## Problem Statement (Original)
"j'ai envie de creer une plateforme de pari mais au lieu que ce soit des évènements sportifs ce seront des QCM de quizs sur les connaissances générales dans le monde mais sous forme de jeux videos d'animations. tu dois creer des animations de jeux videos dans lesquel on va inserer les problèmes à résoudre c'est le but de l'application web et on doit pouvoir gagner de l'argent en trouvant un problème il doit aussi avoir des duels entre joueurs où ils mettront des paris le gagnant ou les gagnants remportent tout — je veux juste le frontend avec des données mocks."

## User Choices
- Catégories : Histoire, Géographie, Sciences, Cinéma, Sport, Musique
- Style d'animation : Mix dynamique (rétro arcade + cyberpunk néon + fantasy synthwave)
- Modes : Solo, Duel 1v1, Tournois
- Langue : Bilingue FR / EN
- Monnaie : Jetons / coins virtuels

## Architecture
- Frontend-only (React, react-router-dom, framer-motion, lucide-react, shadcn ui, sonner)
- Mock data dans `/app/frontend/src/data/mockData.js`
- i18n in-memory dans `/app/frontend/src/i18n/translations.js`
- Contexte global via `AppContext` (langue + solde de jetons)
- Pas de backend modifié (server.py inchangé)

## Pages livrées
1. `/` — Landing (hero arcade cabinet, stats, marquee, features, how-it-works, catégories)
2. `/lobby` — Control room (3 modes, live matches, duels actifs, tournois à venir)
3. `/categories` — Sélection (6 cartes thématiques)
4. `/play/:categoryId` — Quiz Play (HUD, timer arcade, lives, score, feedback, écran final)
5. `/duel` — Bet slip, recherche d'adversaire, splash VS
6. `/tournaments` — Liste + bracket multi-tours
7. `/leaderboard` — Podium top 3 + tableau complet
8. `/wallet` — Solde, dépôt/retrait simulés, historique transactions
9. `/profile` — Stats, XP, badges, performance par catégorie, matchs récents

## What's been implemented (2026-02-13)
- Routing complet, navbar sticky avec balance + toggle FR/EN
- Mock data réaliste : 6 catégories x 5 questions, 10 top players, tournois, transactions, bracket
- Animations framer-motion + CSS (scanlines, blink, marquee, shake, pulse, scanline-bar)
- Quiz gameplay : countdown 3-2-1, timer 15s/question, 3 vies, calcul de récompense, jingles visuels
- 6 micro-esthétiques par catégorie (couleurs + gradients + grilles colorées)
- data-testid sur tous les éléments interactifs majeurs
- Toaster sonner pour notifications de gain/dépôt

## Update 2026-02-14 — User feedback v1
- **Palette sobrisée** : retrait du rainbow (pink/green/purple/cyan). Toute l'UI utilise désormais AMBRE (#E5A800) + blanc + noir + gris. Le vert/rouge n'est conservé que pour les indicateurs sémantiques gain/perte.
- **Animations vidéo-ludiques intégrées** dans chaque quiz via le nouveau composant `PixelScene` (SVG pixel-art + framer-motion). 6 scènes uniques :
  - Histoire → chevalier pixel chargeant un château, épée animée
  - Géographie → globe filaire avec radar sweep et continents pixelisés
  - Sciences → atome avec électrons orbitant + bécher bouillonnant
  - Cinéma → pellicule défilante + 2 bobines qui tournent + projecteur
  - Sport → boxeur frappant un sac de frappe (impact stars)
  - Musique → équaliseur + vinyle qui tourne + waveform
- **Banque de questions étoffée** : 50 questions par catégorie (300 au total) dans `/app/frontend/src/data/questions.js`. Chaque session pioche 10 au hasard.
- Question affichée dans une **dialogue box** style RPG avec triangle en bas, sous la scène animée.

## Update 2026-02-14 — Major gameplay change v2 (no more QCM)
- **QCM supprimé** : remplacé par un **typing arcade**. Le joueur **tape la réponse** avec un clavier pixel AZERTY (à l'écran ou physique).
- Helper `extractKey()` dans `/app/frontend/src/lib/answerKey.js` : extrait un mot-clé court depuis la bonne réponse (mot le plus distinctif, sans accents, max 12 chars).
- Composant `PixelKeyboard` : clavier on-screen pixel-art AZERTY (10 colonnes, 4 lignes + back).
- Composant `CoinShower` : pluie de **28 pièces pixel-art ambre** qui tombent + tournent + s'estompent à chaque bonne réponse, avec flash radial central.
- **Boss mid-round** : à partir de la question 5/10, un **boss pixel-art** (crâne couronné, yeux qui clignotent, aura pulsante) apparaît dans chaque scène. HUD affiche "BOSS.STAGE ⚠".
- Mécanique de pénalité : mauvaise lettre = -2s + shake (pas de vie perdue). Timeout = -1 vie. Vies = 3.
- Slot blink : le slot courant clignote pour indiquer où taper.
- Hit flash : chaque bonne lettre déclenche un flash ambre sur la scène (renforce la connexion question ↔ jeu).

## Next Action Items
- P1: Brancher un vrai backend (FastAPI + MongoDB) avec auth + matchmaking
- P1: Vrai engine duel temps réel (WebSocket)
- P2: Plus de questions par catégorie (50+ par cat)
- P2: Pixel sprites animés dans l'arène pendant les questions
- P2: Système d'amis et chat in-game
- P3: Intégration Stripe pour conversion jetons ↔ euros réels
