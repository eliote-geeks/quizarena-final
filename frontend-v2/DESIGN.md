# QuizArena — Direction artistique (v2)

**Arène de tournoi, pas dashboard SaaS.** Référence mentale : le bracket d'un
tournoi esport, un ticket de match, une carte de joueur. Fond charbon chaud,
un seul geste doré qui dit « ici, l'action / ici, l'argent ».

Ce fichier est un **contrat**. Toute proposition qui viole une règle ci-dessous
est rejetée, même si elle est jolie.

---

## Pourquoi cette révision (19/08)

La v1 de cette v2 (poster éditorial vermillon, zéro rayon, Archivo) a été
abandonnée au profit de la direction validée sur Figma après une exploration
avec un vrai kit de référence (tournoi esport mobile). Elle reste un exemple
valable de méthode — **décision tranchée, pas moyenne de références** — donc
on garde cette méthode et une partie de ses garde-fous ; on change la peau.

| Signal | Diagnostic v1 (toujours vrai, on ne le refait pas) |
|---|---|
| Police Inter | bannie, on reste sur une police unique auto-hébergée |
| Indigo `#6366F1` | banni, mais **or** n'est pas indigo — voir §2 |
| Contenu fictif | banni définitivement — voir §9, inchangé |

---

## Les règles

### 1. Rayon en trois tailles, jamais uniforme au hasard
`--radius-tag: 8px` (pastilles, tags de statut) · `--radius-card: 16px`
(cartes, tuiles catégorie) · `--radius-panel: 20px` (grands panneaux —
sidebar, modales). Jamais une quatrième valeur improvisée. Les avatars restent
carrés (§9) : le rond est réservé aux vrais éléments circulaires (photo de
catégorie en médaillon, jamais un avatar joueur).

### 2. Deux couleurs d'accent, jamais plus, jamais au hasard
- **Or** `#F2A93B` (`--color-flare`) — action primaire, argent, mise en avant.
  C'est LE signal « ici l'important ».
- **Émeraude** `#3DDC97` (`--color-live`) — victoire, score qui monte, statut
  positif. Jamais utilisé pour une action cliquable, seulement un état.

Toute troisième couleur d'accent (violet, bleu, rose…) est refusée sur un
élément d'interface. Exception unique et cadrée : la grille Catégories peut
teinter légèrement chaque pastille d'icône dans une palette de 6 tons chauds
fixes (§6) — jamais sur un bouton, jamais sur un statut.

### 3. Séparation par fond avant bordure
Dans cet ordre : (1) du vide, (2) un écart de luminosité de 3–6% sur le fond,
(3) un filet plein de 1–2px dans `ink-4`. Jamais de `border: 1px solid
rgba(255,255,255,.06)` gris-timide générique.

### 4. Juste/faux : la couleur ne suffit jamais seule
`--color-live` (émeraude) pour juste, un rouge chaud dédié `--color-danger`
pour faux — **mais toujours accompagné d'un mouvement ou d'un symbole**
(icône ✓/✗, secousse, extinction), jamais la couleur seule. Rappel : 8% des
hommes sont daltoniens rouge-vert, c'est une règle d'accessibilité, pas
esthétique.

### 5. Une seule famille typographique
**Figtree variable**, auto-hébergée, axe `wght 300..900`. Contraste par le
poids et la taille, pas par une deuxième police.

| Rôle | Réglage |
|---|---|
| Display | `wght 700–800` · `line-height .95` · `tracking -.01em` |
| Titre | `wght 600` |
| Courant | `wght 400–500` |
| Étiquette | `wght 500` · MAJUSCULES · `tracking .08em` · 11–12px |
| Chiffres | `font-variant-numeric: tabular-nums` — toujours, argent comme chrono |

Interdit : Inter, Roboto, Open Sans, Poppins, Montserrat, Archivo (v1).

### 6. Photos autorisées, mais cadrées — jamais de stock générique
Les tuiles de catégorie peuvent porter une vraie photo (source vérifiable et
libre de droits — Wikimedia Commons typiquement, jamais une image générée par
IA présentée comme réelle) **quand le sujet est spécifique et réel** (ex. les
catégories Cameroun : stade, palais de Foumban, marché, plat). Interdits :
photo « forêt brumeuse / bureau moderne » sans rapport direct au contenu,
double emploi d'une même image sur deux catégories, photo comme simple
remplissage décoratif d'un héros ou d'un bouton.
Traitement obligatoire : dégradé de fondu vers `ink-2` en bas de l'image pour
la lisibilité du texte qui suit — jamais un dégradé décoratif ailleurs.
Les 6 tons de pastille d'icône (§2 exception) : or, émeraude, terracotta
`#E2725B`, ambre `#C9852F`, sarcelle `#4FB8A6`, rose chaud `#D97A9C` — à 22%
d'opacité en fond de pastille uniquement, jamais en aplat plein sur un
élément d'interface.

### 7. Le mouvement informe, il ne décore
Inchangé de v1 : chaque animation répond à « qu'est-ce que l'utilisateur
apprend ? ». `prefers-reduced-motion` coupe tout sauf les changements d'état.

### 8. Nav du haut sur desktop, barre du bas sur mobile
Desktop (≥ 640px) : barre horizontale fixe en haut — logo, liens, solde +
profil à droite. Mobile : barre de navigation fixe en bas (zone du pouce),
5–6 icônes maximum. Pas de sidebar verticale (abandon du v1) : le Figma de
référence est pensé nav du haut, pas colonne latérale.

### 9. Aucun contenu fictif, avatars toujours des initiales
Inchangé de v1, ne se négocie pas : pas de faux joueurs en ligne, pas de faux
classement, pas de solde inventé. Tout vient de l'API réelle ou l'écran dit
explicitement qu'il n'y a rien. Les avatars joueurs restent des initiales sur
fond plein (`Avatar`, ui/index.jsx) — aucune photo de profil pour l'instant,
ce n'est pas un stock : c'est l'absence de fonctionnalité d'upload.

---

## Budget performance — non négociable, inchangé dans l'esprit

Cible marché : Cameroun, 3G, forfaits data au Mo, téléphones d'entrée de
gamme. Référence : betPawa, 2,5 Mo, décision de design revendiquée.

| Poste | Plafond |
|---|---|
| JS initial (gzip) | 130 kB |
| CSS (gzip) | 18 kB |
| Polices | 35 kB (Figtree variable, 2 fichiers latin/latin-ext) |
| Images catégorie (WebP, lazy-load hors-viewport initial) | 80 kB/image max |
| Premier rendu utile, 3G rapide | < 2 s |

Les photos de catégorie (§6) ne sont **jamais** sur le chemin critique du
premier rendu (Lobby, Duel) — uniquement chargées quand l'écran Catégories
est visité, et en `loading="lazy"` dès qu'elles sortent du premier écran.

---

## Test avant de livrer un écran

1. Une capture en niveaux de gris reste-t-elle lisible et hiérarchisée ?
2. Le rayon utilisé est-il un des 3 (§1) ? Y a-t-il une bordure grise
   générique ? Un dégradé décoratif hors §6 ?
3. Y a-t-il une 3e couleur d'accent qui ne soit pas l'exception cadrée du §2 ?
4. Peut-on retirer un élément sans rien perdre ? (alors on le retire)
5. Le plus gros élément de l'écran est-il bien la chose la plus importante ?
6. Cet écran pourrait-il être celui de n'importe quelle autre app ? → recommencer
