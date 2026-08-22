import LegalLayout from "./LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout
      title="Politique de confidentialité"
      updated="août 2026"
      sections={[
        {
          title: "1. Responsable du traitement",
          body: <p>QuizArena, opérant au Cameroun, est responsable du traitement des données décrites ci-dessous.</p>,
        },
        {
          title: "2. Données collectées",
          body: (
            <p>
              Identité (pseudo, téléphone, e-mail), données de jeu (historique de
              duels, ELO, gains), et données de transaction Mobile Money (montant,
              opérateur, statut — jamais le code secret).
            </p>
          ),
        },
        {
          title: "3. Finalités du traitement",
          body: (
            <p>
              Fournir le service de jeu, traiter les dépôts et retraits, détecter la
              fraude, et vous contacter en cas d'anomalie sur votre compte.
            </p>
          ),
        },
        {
          title: "4. Base légale du traitement",
          body: <p>Exécution du contrat (CGU) et intérêt légitime pour la prévention de la fraude.</p>,
        },
        {
          title: "5. Durée de conservation",
          body: <p>Les données sont conservées 5 ans après la clôture du compte, conformément aux obligations comptables.</p>,
        },
        {
          title: "6. Partage des données",
          body: (
            <p>
              Partagées uniquement avec les opérateurs Mobile Money pour le
              traitement des transactions, et les autorités compétentes sur
              réquisition légale.
            </p>
          ),
        },
        {
          title: "7. Vos droits (RGPD)",
          body: <p>Accès, rectification, suppression et portabilité — via une demande depuis votre profil ou par e-mail au support.</p>,
        },
        {
          title: "8. Cookies",
          body: <p>Un cookie de session strictement nécessaire au fonctionnement du compte. Aucun traqueur publicitaire tiers.</p>,
        },
        {
          title: "9. Sécurité",
          body: <p>Mots de passe hachés, connexions chiffrées (HTTPS), accès aux données de production restreint et journalisé.</p>,
        },
        {
          title: "10. Modifications",
          body: <p>Cette politique peut évoluer ; toute modification substantielle est notifiée dans l'application.</p>,
        },
      ]}
    />
  );
}
