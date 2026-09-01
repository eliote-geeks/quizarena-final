# Export de la banque de contenu — édition Classic

Export réel de la base de production Classic (`quizarena_classic`), au 01/09/2026 :

- `quizarena_categories.json` — 15 catégories
- `quizarena_questions.json` — 10 806 questions actives

## Ce que ce dossier contient volontairement, et pas plus

Uniquement les tables `Category` et `Question` : du contenu de jeu, sans aucune donnée personnelle. Les tables utilisateurs (`User`, `Transaction`, `LoginSession`, `PushSubscription`, historiques de duels/tournois, etc.) ne sont **pas** incluses ici — elles contiennent des données réelles de joueurs (emails, numéros Mobile Money, hash de mots de passe, historique financier) qui n'ont pas leur place dans un dépôt public, même temporaire : une fois visible, un dépôt peut être cloné/forké/indexé avant même d'être supprimé.

Pour restaurer ce contenu dans une base fraîche (après `prisma migrate deploy`) :

```js
// exemple minimal avec le client Prisma déjà généré du backend
const categories = JSON.parse(await readFile("database/quizarena_categories.json", "utf8"));
const questions = JSON.parse(await readFile("database/quizarena_questions.json", "utf8"));
await prisma.category.createMany({ data: categories, skipDuplicates: true });
await prisma.question.createMany({ data: questions, skipDuplicates: true });
```
