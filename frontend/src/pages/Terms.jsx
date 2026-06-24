import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Scale } from "lucide-react";

const AMBER = "#E5A800";
const UPDATED = "23 juin 2026";

function Block({ title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-7"
    >
      <h2 className="text-sm font-bold text-white mb-3 pb-2 border-b border-white/[0.07]">{title}</h2>
      <div className="text-sm text-white/50 leading-relaxed space-y-2">{children}</div>
    </motion.div>
  );
}

export default function Terms() {
  return (
    <div className="min-h-screen" style={{ background: "#05050A" }}>
      <div className="max-w-2xl mx-auto px-5 py-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${AMBER}15`, color: AMBER }}>
              <Scale className="w-4 h-4" />
            </div>
            <Link to="/" className="font-display font-black text-sm">Quiz<span style={{ color: AMBER }}>Arena</span></Link>
          </div>
          <h1 className="text-xl font-bold text-white mt-4">Conditions Générales d'Utilisation</h1>
          <p className="text-xs text-white/30 mt-1">Dernière mise à jour : {UPDATED}</p>
        </motion.div>

        <Block title="1. Présentation du service">
          <p>
            QuizArena (ci-après « la Plateforme ») est un service de jeu de culture générale compétitif opéré par
            QuizArena SAS (ci-après « l'Éditeur »). La Plateforme permet aux utilisateurs de participer à des parties
            de quiz, seuls ou en duel contre d'autres joueurs, en utilisant des points virtuels (ci-après « coins »).
          </p>
          <p>
            En accédant à la Plateforme et en créant un compte, vous acceptez sans réserve les présentes Conditions
            Générales d'Utilisation (CGU). Si vous n'acceptez pas ces conditions, vous devez cesser immédiatement
            d'utiliser le service.
          </p>
        </Block>

        <Block title="2. Inscription et compte utilisateur">
          <p>
            L'accès aux fonctionnalités de jeu nécessite la création d'un compte. Vous vous engagez à fournir des
            informations exactes lors de l'inscription. Chaque personne ne peut posséder qu'un seul compte.
          </p>
          <p>
            L'Éditeur se réserve le droit de suspendre ou supprimer tout compte qui présente des signes d'utilisation
            frauduleuse, de triche, ou de violation des présentes CGU, sans obligation de remboursement des coins
            non utilisés.
          </p>
          <p>
            Vous êtes responsable de la confidentialité de vos identifiants de connexion et de toutes les actions
            effectuées depuis votre compte.
          </p>
        </Block>

        <Block title="3. Coins (monnaie virtuelle)">
          <p>
            Les coins sont une monnaie virtuelle sans valeur légale et ne constituent pas de la monnaie réelle.
            Ils ne peuvent pas être échangés contre de l'argent réel, des biens ou des services en dehors de la
            Plateforme.
          </p>
          <p>
            Les coins sont utilisés uniquement à l'intérieur de QuizArena pour participer aux parties
            Challenge, Duels et Tournois. Tout solde de coins reste acquis à l'utilisateur mais ne peut faire
            l'objet d'aucun remboursement, sauf disposition contraire explicite.
          </p>
          <p>
            L'Éditeur se réserve le droit de modifier les mécanismes d'attribution et de consommation des coins
            à tout moment, sous réserve d'un préavis raisonnable.
          </p>
        </Block>

        <Block title="4. Règles du jeu et frais">
          <p>
            Les règles détaillées de chaque mode de jeu (Solo Libre, Solo Challenge, Duel 1v1, Tournoi) sont
            disponibles sur la page <Link to="/rules" className="underline hover:text-white/70 transition" style={{ color: AMBER }}>Règles du jeu</Link>.
          </p>
          <p>
            L'Éditeur prélève des frais de service sur chaque transaction de coins impliquant une mise :
          </p>
          <ul className="list-disc list-inside space-y-1 text-white/40">
            <li>Duel — Victoire : 10% du pot total</li>
            <li>Duel — Égalité : 5% de la mise par joueur</li>
            <li>Tournoi : 15% du prize pool total</li>
            <li>Solo Challenge : intégré dans la grille de payout</li>
          </ul>
          <p>
            Ces frais sont définitifs et non négociables. En participant à une partie avec mise, vous acceptez
            explicitement ces conditions.
          </p>
        </Block>

        <Block title="5. Comportements interdits">
          <p>Il est strictement interdit de :</p>
          <ul className="list-disc list-inside space-y-1 text-white/40">
            <li>Utiliser des outils automatisés, bots ou scripts pendant les parties</li>
            <li>Consulter des sources d'information extérieures pendant une partie en cours</li>
            <li>Créer plusieurs comptes pour contourner les restrictions ou pénalités</li>
            <li>Exploiter des bugs ou failles techniques à son avantage</li>
            <li>Partager ses identifiants ou jouer pour le compte d'un tiers</li>
            <li>Tenir des propos haineux, discriminatoires ou menaçants</li>
          </ul>
          <p>
            Toute violation entraîne la suspension immédiate du compte, sans remboursement.
            Les cas de fraude avérée peuvent faire l'objet de poursuites judiciaires.
          </p>
        </Block>

        <Block title="6. Disponibilité du service">
          <p>
            L'Éditeur s'efforce de maintenir la Plateforme disponible 24h/24 et 7j/7.
            Cependant, des interruptions peuvent survenir pour maintenance, mise à jour ou cas de force majeure.
            L'Éditeur ne saurait être tenu responsable de l'indisponibilité temporaire du service.
          </p>
          <p>
            En cas d'interruption technique affectant une partie en cours avec une mise active, l'Éditeur
            s'engage à créditer automatiquement la mise initiale sur le compte de l'utilisateur concerné.
          </p>
        </Block>

        <Block title="7. Propriété intellectuelle">
          <p>
            L'ensemble des contenus de la Plateforme (design, questions, code, images, logotypes) est la propriété
            exclusive de l'Éditeur et est protégé par les lois françaises et internationales sur la propriété
            intellectuelle. Toute reproduction, même partielle, est interdite sans autorisation écrite.
          </p>
        </Block>

        <Block title="8. Limitation de responsabilité">
          <p>
            QuizArena est un jeu de loisir. L'Éditeur ne garantit pas de gains et ne saurait être tenu responsable
            des pertes de coins résultant des performances du joueur lors des parties. Les coins ne représentent
            pas un investissement financier.
          </p>
          <p>
            La responsabilité totale de l'Éditeur envers un utilisateur, quelle que soit la cause, est limitée
            au montant des coins achetés via des achats intégrés au cours des 30 derniers jours.
          </p>
        </Block>

        <Block title="9. Modification des CGU">
          <p>
            L'Éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront
            notifiés par email et/ou notification dans l'application avec un préavis de 15 jours.
            La poursuite de l'utilisation du service après cette période vaut acceptation des nouvelles conditions.
          </p>
        </Block>

        <Block title="10. Droit applicable">
          <p>
            Les présentes CGU sont régies par le droit français. Tout litige relatif à leur interprétation
            ou exécution relève de la compétence exclusive des tribunaux français compétents.
            En cas de litige, une solution amiable sera recherchée en priorité.
          </p>
          <p>
            Contact : <span className="text-white/70">legal@quizarena.app</span>
          </p>
        </Block>

        {/* Footer */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/25">
          <Link to="/rules"   className="hover:text-white/50 transition">Règles du jeu</Link>
          <Link to="/privacy" className="hover:text-white/50 transition">Confidentialité</Link>
          <Link to="/refund"  className="hover:text-white/50 transition">Remboursements</Link>
          <Link to="/"        className="hover:text-white/50 transition ml-auto">← Retour à l'app</Link>
        </div>
      </div>
    </div>
  );
}
