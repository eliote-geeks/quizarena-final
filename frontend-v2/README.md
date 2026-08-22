# QuizArena v2 — front

Refonte du front, en projet séparé. La v1 (`/home/paul/quizarena/frontend`)
reste intacte et déployée sur `http://79.137.32.27:3010` le temps de la bascule.

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # -> dist/
npm run preview
```

## Lire ceci avant de toucher au style

**[DESIGN.md](./DESIGN.md)** — direction artistique et 8 règles dures.
Ce n'est pas de la documentation, c'est un contrat : la v1 a échoué au test
« ça fait IA » et le fichier explique précisément pourquoi, avec les mesures.

## Stack

| | |
|---|---|
| Vite 8 (Rolldown) + React 19 | build en ~1 s |
| Tailwind v4 | config CSS-first dans `src/styles/app.css`, pas de `tailwind.config.js` |
| Archivo variable, auto-hébergée | une seule famille, axes `wdth` + `wght` |
| Animations en CSS | aucune librairie d'animation — voir plus bas |
| react-router 7 | |

Pas de librairie de composants. Les six primitives de `src/ui/index.jsx`
couvrent les trois écrans. On ajoutera Base UI le jour où il faudra une
vraie boîte de dialogue accessible, pas avant.

## Poids

| | v1 | v2 | budget |
|---|---|---|---|
| JS (gzip) | 222 kB | **89,4 kB** (24 écrans) | 120 kB |
| CSS (gzip) | 14,6 kB | **6,1 kB** | 15 kB |
| Polices | Google Fonts (2 familles, réseau) | **88 kB auto-hébergé** | 90 kB |
| Images critiques | photos Unsplash 1600 px en boucle | **0** | 0 |

Deux décisions expliquent l'essentiel de l'écart :

1. **Aucune librairie d'animation.** Elle pesait 41 kB gzip, soit 35 % du
   bundle, pour quatre animations que le CSS fait nativement. Bénéfice
   secondaire découvert au test : une animation JS qui ne démarre pas laisse
   le contenu **invisible** (la question du duel avait disparu en capture),
   alors qu'une keyframe CSS en `fill-mode: both` atteint toujours son état
   final.
2. **Polices auto-hébergées et préchargées.** Zéro résolution DNS et zéro
   aller-retour vers Google avant le premier texte lisible.

Cible : Cameroun, 3G, forfaits au Mo. Référence assumée — betPawa pèse 2,5 Mo.

## Périmètre actuel

Le template est complet — 24 écrans, tous sur données simulées (`src/lib/mock.js`) :

| Groupe | Écrans | Chrome |
|---|---|---|
| Jeu | `/`, `/duel` (mise en place), `/duel/play`, `/play/:categoryId`, `/result` | `/duel/play`, `/play/:id` et `/result` sont plein écran, sans nav (§ Duel.jsx) |
| Compte | `/profile`, `/wallet`, `/vip`, `/replays` | nav (`Shell`) |
| Compétition | `/leaderboard`, `/tournaments` | nav (`Shell`) |
| Découverte | `/categories`, `/category/:id`, `/room/:id`, `/player/:username` | nav (`Shell`) |
| Public | `/landing`, `/login`, `/register`, `/forgot-password`, `/reset-password` | plein écran, sans nav |
| Légal | `/rules`, `/terms`, `/privacy`, `/refund` | plein écran, sans nav |

`src/ui/Shell.jsx` porte le seul chrome d'app : une barre en haut (desktop)
et une barre de nav en bas (mobile, zone du pouce). Jamais de sidebar.

Repris tel quel de la v1, logique métier uniquement : `src/lib/eloEngine.js`,
`currency.js`, `answerKey.js`, `questions.js`. Aucun composant visuel de la v1
n'a été repris.

Vérifié sans dépassement horizontal sur les 24 routes, à 390×844 (mobile) et
1440×900 (desktop), via CDP `Emulation.setDeviceMetricsOverride`.

## Reste à faire

- Mode clair (les tokens sont prêts, les surcharges ne sont pas écrites)
- Branchement API à la place de `mock.js` — c'est la seule chose qui sépare
  ce template d'une app fonctionnelle
- Vrai flux d'auth (les formulaires naviguent sans appeler de service)
