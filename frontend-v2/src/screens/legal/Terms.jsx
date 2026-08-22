import LegalLayout from "./LegalLayout";

export default function Terms() {
  return (
    <LegalLayout
      title="Conditions Générales d'Utilisation"
      updated="août 2026"
      sections={[
        {
          title: "1. Présentation du service",
          body: (
            <p>
              QuizArena est une plateforme de quiz en argent réel opérant au Cameroun.
              En créant un compte, vous acceptez les présentes Conditions Générales
              d'Utilisation (CGU). Si vous n'acceptez pas ces conditions, vous devez
              cesser immédiatement d'utiliser le service.
            </p>
          ),
        },
        {
          title: "2. Inscription et compte utilisateur",
          body: (
            <>
              <p>
                Le service est réservé aux personnes majeures (18 ans et plus)
                résidant au Cameroun. Un seul compte est autorisé par personne.
              </p>
              <p>
                Vous êtes responsable de la confidentialité de vos identifiants de
                connexion et de toutes les actions effectuées depuis votre compte.
              </p>
            </>
          ),
        },
        {
          title: "3. Coins (monnaie virtuelle)",
          body: (
            <p>
              1 coin équivaut à 1 franc CFA. Les coins sont crédités par dépôt Mobile
              Money (Orange Money, MTN MoMo) et débités lors d'une mise. Ils n'ont
              aucune valeur en dehors de la plateforme et ne sont ni transférables
              ni cessibles entre comptes.
            </p>
          ),
        },
        {
          title: "4. Règles du jeu et frais",
          body: (
            <p>
              QuizArena prélève une commission sur les mises gagnantes en duel et sur
              les cagnottes de tournoi, détaillée à l'écran avant chaque engagement.
              Le détail complet des modes de jeu figure dans les{" "}
              <a href="/rules" className="text-flare hover:text-flare-hot">Règles du jeu</a>.
            </p>
          ),
        },
        {
          title: "5. Comportements interdits",
          body: (
            <p>
              QuizArena se réserve le droit de suspendre tout compte en cas d'activité
              frauduleuse, de triche (usage de bot, de second compte, collusion entre
              joueurs), ou de violation des présentes CGU, sans obligation de
              remboursement des coins non utilisés.
            </p>
          ),
        },
        {
          title: "6. Disponibilité du service",
          body: (
            <p>
              Le service peut être interrompu pour maintenance ou en cas d'incident
              technique. Les parties affectées par une interruption sont annulées et
              remboursées — voir la{" "}
              <a href="/refund" className="text-flare hover:text-flare-hot">politique de remboursement</a>.
            </p>
          ),
        },
        {
          title: "7. Propriété intellectuelle",
          body: (
            <>
              <p>
                La marque, l'interface et les contenus originaux sont la propriété de
                QuizArena ou de leurs titulaires respectifs.
              </p>
              <p>
                Une partie de la banque de questions provient d'{" "}
                <a href="https://www.openquizzdb.org" target="_blank" rel="noreferrer" className="text-flare hover:text-flare-hot">OpenQuizzDB</a>,
                sous licence{" "}
                <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noreferrer" className="text-flare hover:text-flare-hot">Creative Commons CC BY-SA 4.0</a>.
                Ces questions ont été adaptées au format de jeu QuizArena, notamment
                par classement thématique et mélange dynamique des propositions.
              </p>
            </>
          ),
        },
        {
          title: "8. Limitation de responsabilité",
          body: (
            <p>
              QuizArena ne saurait être tenu responsable de pertes indirectes liées à
              l'usage du service, ni des délais de traitement propres aux opérateurs
              Mobile Money.
            </p>
          ),
        },
        {
          title: "9. Modification des CGU",
          body: (
            <p>
              Ces CGU peuvent être modifiées à tout moment. Les utilisateurs sont
              informés des changements substantiels par notification dans
              l'application.
            </p>
          ),
        },
        {
          title: "10. Droit applicable",
          body: <p>Les présentes CGU sont soumises au droit camerounais.</p>,
        },
      ]}
    />
  );
}
