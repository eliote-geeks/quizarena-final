import LegalLayout from "./LegalLayout";

export default function Rules() {
  return (
    <LegalLayout
      title="Règles du jeu"
      sections={[
        {
          title: "Principe général",
          body: (
            <p>
              Chaque partie oppose votre culture générale à celle d'un adversaire ou
              du chrono. Le classement ELO reflète votre niveau réel : il monte sur
              une victoire, descend sur une défaite, pondéré par le niveau adverse.
            </p>
          ),
        },
        {
          title: "Solo libre — sans risque",
          body: <p>Enchaînez les questions d'une catégorie sans mise. Sert à s'entraîner et à débloquer des badges.</p>,
        },
        {
          title: "Solo challenge — mise & gain",
          body: (
            <p>
              Une mise fixe, un score cible. Vous récupérez la mise multipliée si le
              score cible est atteint, rien sinon. Le multiplicateur est affiché
              avant chaque partie.
            </p>
          ),
        },
        {
          title: "Duel 1v1 — mise symétrique",
          body: (
            <p>
              Deux joueurs, sept questions, dix secondes chacune. Le gagnant emporte
              les deux mises moins la commission de plateforme. Égalité : les deux
              mises sont rendues.
            </p>
          ),
        },
        {
          title: "Tournoi — élimination directe",
          body: (
            <p>
              Entrée payante, cagnotte commune. Élimination directe par manches ; les
              gains se répartissent entre les premières places selon le barème
              affiché à l'inscription.
            </p>
          ),
        },
        {
          title: "Système ELO & classement",
          body: (
            <p>
              K = 32. Un gain contre un adversaire mieux classé rapporte plus de
              points qu'un gain contre un adversaire moins bien classé. Le
              classement se met à jour immédiatement après chaque partie.
            </p>
          ),
        },
        {
          title: "Fair-play & conduite",
          body: (
            <p>
              Un seul compte par personne. Toute collusion, usage de bot ou
              d'assistance externe entraîne la suspension du compte et l'annulation
              des gains concernés — voir les{" "}
              <a href="/terms" className="text-flare hover:text-flare-hot">CGU</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
