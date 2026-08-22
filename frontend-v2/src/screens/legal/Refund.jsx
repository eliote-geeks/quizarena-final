import LegalLayout from "./LegalLayout";

export default function Refund() {
  return (
    <LegalLayout
      title="Politique de remboursement"
      updated="août 2026"
      sections={[
        {
          title: "1. Nature des coins et des achats",
          body: <p>Un dépôt crédite des coins (1 coin = 1 FCFA), utilisables uniquement sur QuizArena. Le dépôt lui-même n'est pas remboursable une fois les coins crédités.</p>,
        },
        {
          title: "2. Coins gagnés ou perdus en jeu",
          body: <p>L'issue d'un duel, d'un solo challenge ou d'un tournoi est définitive. Une défaite régulière n'ouvre droit à aucun remboursement.</p>,
        },
        {
          title: "3. Incidents techniques — remboursement automatique",
          body: (
            <p>
              Si une partie est interrompue par une panne du service (perte de
              connexion serveur, plantage confirmé), la mise est automatiquement
              recréditée sous 24 h, sans démarche de votre part.
            </p>
          ),
        },
        {
          title: "4. Achats en monnaie réelle",
          body: <p>Les dépôts par Mobile Money non crédités après 30 minutes doivent être signalés au support avec la référence de transaction de l'opérateur.</p>,
        },
        {
          title: "5. Tournois — politique spécifique",
          body: <p>Un tournoi annulé faute de participants suffisants rembourse intégralement les frais d'inscription à tous les joueurs inscrits.</p>,
        },
        {
          title: "6. Procédure de réclamation",
          body: <p>Depuis votre profil, section « Support », avec la date, l'heure et si possible une capture d'écran. Traitement sous 48 h ouvrées.</p>,
        },
      ]}
    />
  );
}
