// AmbientBackground pose toujours un voile sombre fixe derrière ces écrans
// (loading/ready/countdown, plus l'en-tête score au-dessus de la carte de
// question), quel que soit le thème clair/sombre de l'appli — voir le
// commentaire de AmbientBackground.jsx. Le texte qui flotte par-dessus doit
// donc rester clair en permanence : utiliser var(--text) y rendait le texte
// presque noir en mode clair, sur un fond volontairement toujours sombre
// (retour Paul du 31/08, captures "paul est trouvé" illisible).
export const AMBIENT_TEXT = "#F8FAFC";
export const AMBIENT_SUB = "rgba(248,250,252,.72)";
export const AMBIENT_FAINT = "rgba(248,250,252,.5)";
