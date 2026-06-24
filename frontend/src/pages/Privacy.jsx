import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

const AMBER = "#E5A800";
const UPDATED = "23 juin 2026";

function Block({ title, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
      <h2 className="text-sm font-bold text-white mb-3 pb-2 border-b border-white/[0.07]">{title}</h2>
      <div className="text-sm text-white/50 leading-relaxed space-y-2">{children}</div>
    </motion.div>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen" style={{ background: "#05050A" }}>
      <div className="max-w-2xl mx-auto px-5 py-10">

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${AMBER}15`, color: AMBER }}>
              <Lock className="w-4 h-4" />
            </div>
            <Link to="/" className="font-display font-black text-sm">Quiz<span style={{ color: AMBER }}>Arena</span></Link>
          </div>
          <h1 className="text-xl font-bold text-white mt-4">Politique de Confidentialité</h1>
          <p className="text-xs text-white/30 mt-1">Dernière mise à jour : {UPDATED} · Conforme RGPD</p>
        </motion.div>

        <Block title="1. Responsable du traitement">
          <p>
            Le responsable du traitement de vos données personnelles est QuizArena SAS, joignable à l'adresse
            <span className="text-white/70"> privacy@quizarena.app</span>.
          </p>
        </Block>

        <Block title="2. Données collectées">
          <p>Nous collectons uniquement les données strictement nécessaires au fonctionnement du service :</p>
          <ul className="list-disc list-inside space-y-1 text-white/40">
            <li><strong className="text-white/60">Données d'inscription :</strong> adresse email, pseudonyme choisi</li>
            <li><strong className="text-white/60">Données de jeu :</strong> scores, historique des parties, ELO, solde de coins</li>
            <li><strong className="text-white/60">Données techniques :</strong> adresse IP (anonymisée après 30 jours), type de navigateur, logs d'erreurs</li>
            <li><strong className="text-white/60">Données de session :</strong> cookies de session (durée : 30 jours)</li>
          </ul>
          <p>
            Nous ne collectons pas de données de paiement directement. Si des achats intégrés sont disponibles,
            ils sont gérés par un prestataire tiers certifié PCI-DSS.
          </p>
        </Block>

        <Block title="3. Finalités du traitement">
          <p>Vos données sont utilisées pour :</p>
          <ul className="list-disc list-inside space-y-1 text-white/40">
            <li>Gérer votre compte et authentifier vos connexions</li>
            <li>Calculer et afficher les classements et statistiques de jeu</li>
            <li>Détecter les comportements frauduleux et protéger l'intégrité du jeu</li>
            <li>Envoyer des notifications relatives à votre compte (avec votre consentement)</li>
            <li>Améliorer nos services grâce à des statistiques d'usage agrégées et anonymisées</li>
          </ul>
        </Block>

        <Block title="4. Base légale du traitement">
          <p>Le traitement de vos données repose sur :</p>
          <ul className="list-disc list-inside space-y-1 text-white/40">
            <li><strong className="text-white/60">Exécution du contrat :</strong> gestion du compte, des parties et des coins</li>
            <li><strong className="text-white/60">Intérêt légitime :</strong> sécurité du service, prévention de la fraude</li>
            <li><strong className="text-white/60">Consentement :</strong> communications marketing (révocable à tout moment)</li>
          </ul>
        </Block>

        <Block title="5. Durée de conservation">
          <ul className="list-disc list-inside space-y-1 text-white/40">
            <li>Données de compte actif : conservées pendant toute la durée de vie du compte</li>
            <li>Après suppression du compte : données supprimées sous 30 jours (sauf obligation légale)</li>
            <li>Logs techniques : 90 jours maximum</li>
            <li>Données financières (achats) : 5 ans (obligation légale comptable)</li>
          </ul>
        </Block>

        <Block title="6. Partage des données">
          <p>
            Nous ne vendons, ne louons et ne cédons jamais vos données personnelles à des tiers à des fins
            commerciales. Vos données peuvent être partagées uniquement avec :
          </p>
          <ul className="list-disc list-inside space-y-1 text-white/40">
            <li>Nos prestataires techniques (hébergement, analytics) dans le cadre de contrats conformes au RGPD</li>
            <li>Les autorités compétentes en cas d'obligation légale ou de signalement de fraude</li>
          </ul>
        </Block>

        <Block title="7. Vos droits (RGPD)">
          <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
          <ul className="list-disc list-inside space-y-1 text-white/40">
            <li><strong className="text-white/60">Accès :</strong> obtenir une copie de vos données personnelles</li>
            <li><strong className="text-white/60">Rectification :</strong> corriger des données inexactes</li>
            <li><strong className="text-white/60">Effacement :</strong> demander la suppression de vos données (« droit à l'oubli »)</li>
            <li><strong className="text-white/60">Portabilité :</strong> recevoir vos données dans un format structuré</li>
            <li><strong className="text-white/60">Opposition :</strong> s'opposer au traitement pour des raisons légitimes</li>
            <li><strong className="text-white/60">Limitation :</strong> restreindre temporairement le traitement</li>
          </ul>
          <p>
            Pour exercer ces droits, contactez-nous à <span className="text-white/70">privacy@quizarena.app</span>.
            Nous répondons dans un délai maximum de 30 jours. Vous pouvez également saisir la CNIL si vous
            estimez que vos droits ne sont pas respectés.
          </p>
        </Block>

        <Block title="8. Cookies">
          <p>
            Nous utilisons uniquement des cookies strictement nécessaires au fonctionnement du service
            (cookie de session, préférences de langue). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
          </p>
        </Block>

        <Block title="9. Sécurité">
          <p>
            Vos données sont stockées sur des serveurs sécurisés, avec des accès restreints et audités.
            Les mots de passe sont hachés (bcrypt). Les communications sont chiffrées via HTTPS/TLS.
            En cas de violation de données, nous vous informerons dans les 72 heures conformément au RGPD.
          </p>
        </Block>

        <Block title="10. Modifications">
          <p>
            Toute modification importante de cette politique vous sera notifiée par email avec un préavis de
            15 jours. La poursuite de l'utilisation du service après ce délai vaut acceptation.
          </p>
        </Block>

        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/25">
          <Link to="/terms"  className="hover:text-white/50 transition">Conditions générales</Link>
          <Link to="/rules"  className="hover:text-white/50 transition">Règles du jeu</Link>
          <Link to="/refund" className="hover:text-white/50 transition">Remboursements</Link>
          <Link to="/"       className="hover:text-white/50 transition ml-auto">← Retour à l'app</Link>
        </div>
      </div>
    </div>
  );
}
