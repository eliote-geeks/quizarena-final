import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Mail } from "lucide-react";

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

function PolicyCard({ icon: Icon, title, text, color, ok }) {
  return (
    <div
      className="flex gap-3 p-4 rounded-xl border"
      style={{ background: ok ? "rgba(93,214,110,0.05)" : "rgba(255,107,107,0.05)", borderColor: ok ? "rgba(93,214,110,0.2)" : "rgba(255,107,107,0.2)" }}
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: ok ? "#5DD66E" : "#FF6B6B" }} />
      <div>
        <p className="text-xs font-bold mb-0.5" style={{ color: ok ? "#5DD66E" : "#FF6B6B" }}>{title}</p>
        <p className="text-xs text-white/40 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

export default function Refund() {
  return (
    <div className="min-h-screen" style={{ background: "#05050A" }}>
      <div className="max-w-2xl mx-auto px-5 py-10">

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${AMBER}15`, color: AMBER }}>
              <RefreshCw className="w-4 h-4" />
            </div>
            <Link to="/" className="font-display font-black text-sm">Quiz<span style={{ color: AMBER }}>Arena</span></Link>
          </div>
          <h1 className="text-xl font-bold text-white mt-4">Politique de Remboursement</h1>
          <p className="text-xs text-white/30 mt-1">Dernière mise à jour : {UPDATED}</p>
        </motion.div>

        {/* Summary cards */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3 mb-8">
          <PolicyCard
            icon={CheckCircle} ok
            title="Remboursé automatiquement"
            text="Panne technique pendant une partie avec mise active · Partie interrompue par un bug côté serveur · Partie commencée mais non complétée suite à une erreur système."
          />
          <PolicyCard
            icon={XCircle} ok={false}
            title="Non remboursable"
            text="Coins perdus lors d'une partie normale (défaite, mauvais score) · Entrées de tournoi une fois la partie lancée · Coins dépensés volontairement via les fonctionnalités du jeu."
          />
          <PolicyCard
            icon={AlertTriangle} ok={false}
            title="Cas exclus (suspension de compte)"
            text="Toute tentative de fraude ou de triche entraîne la perte de l'ensemble du solde de coins, sans possibilité de recours."
          />
        </motion.div>

        <Block title="1. Nature des coins et des achats">
          <p>
            Les coins QuizArena sont une monnaie virtuelle de jeu. Ils n'ont aucune valeur monétaire réelle et
            ne peuvent être échangés contre de l'argent, des biens ou des services en dehors de la Plateforme.
          </p>
          <p>
            Si la Plateforme propose des achats de coins en monnaie réelle (packs de démarrage, recharges),
            ces achats sont soumis aux conditions spécifiques décrites dans la section 4 ci-dessous.
          </p>
        </Block>

        <Block title="2. Coins gagnés ou perdus en jeu">
          <p>
            La perte de coins résultant d'une partie jouée normalement — qu'il s'agisse d'une défaite en Duel,
            d'un mauvais score en Solo ou d'une élimination en Tournoi — est définitive et ne peut
            faire l'objet d'aucune réclamation.
          </p>
          <p>
            Le jeu implique un risque de perte inhérent à sa nature compétitive. En participant à une partie
            avec mise, vous reconnaissez et acceptez ce risque.
          </p>
        </Block>

        <Block title="3. Incidents techniques — remboursement automatique">
          <p>
            En cas d'incident technique avéré (panne serveur, déconnexion forcée, bug bloquant) survenant
            pendant une partie avec mise active et non encore terminée, l'Éditeur s'engage à créditer
            automatiquement la mise initiale sur votre compte dans un délai de 48 heures.
          </p>
          <p>
            Pour signaler un incident technique affectant une partie en cours, contactez notre support dans
            les <strong className="text-white/70">24 heures suivant l'incident</strong>, en précisant :
          </p>
          <ul className="list-disc list-inside space-y-1 text-white/40">
            <li>Votre pseudonyme et adresse email associée</li>
            <li>La date, l'heure et le mode de jeu concerné</li>
            <li>Le montant de la mise engagée</li>
            <li>Une description de l'incident rencontré</li>
          </ul>
        </Block>

        <Block title="4. Achats en monnaie réelle (si applicable)">
          <p>
            Si vous avez effectué un achat de coins en monnaie réelle via la Plateforme ou les stores
            officiels (App Store, Google Play), vous disposez d'un <strong className="text-white/70">droit de rétractation de 14 jours</strong> conformément
            au Code de la consommation français, à condition que les coins achetés n'aient pas encore été
            utilisés.
          </p>
          <p>
            Une fois les coins achetés partiellement ou entièrement utilisés, le droit de rétractation cesse
            de s'appliquer. Conformément à l'article L221-28 du Code de la consommation, l'accès au contenu
            numérique avec votre consentement exprès rend le remboursement impossible.
          </p>
          <p>
            Pour exercer votre droit de rétractation, contactez-nous à{" "}
            <span className="text-white/70">support@quizarena.app</span> dans le délai imparti.
          </p>
        </Block>

        <Block title="5. Tournois — politique spécifique">
          <p>
            Les frais d'entrée à un tournoi sont <strong className="text-white/70">non remboursables</strong> une fois
            que le tournoi a officiellement démarré. Si un tournoi est annulé par l'Éditeur avant son lancement,
            les frais d'entrée sont remboursés dans leur intégralité.
          </p>
          <p>
            Si un joueur se retrouve dans l'impossibilité de participer à un tournoi pour cause de bug technique
            avéré, l'Éditeur examinera la situation au cas par cas.
          </p>
        </Block>

        <Block title="6. Procédure de réclamation">
          <p>
            Pour toute réclamation relative à un remboursement, voici la procédure à suivre :
          </p>
          <ol className="list-decimal list-inside space-y-2 text-white/40">
            <li>Envoyez un email à <span className="text-white/70">support@quizarena.app</span> avec l'objet « Réclamation remboursement »</li>
            <li>Décrivez précisément la situation et joignez toute preuve disponible (screenshot, date/heure)</li>
            <li>Notre équipe vous répondra dans un délai de <strong className="text-white/60">5 jours ouvrés</strong></li>
            <li>En cas de décision favorable, le crédit apparaît sur votre compte sous 48h</li>
          </ol>
        </Block>

        {/* Contact card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/[0.08] p-5 mb-8"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <Mail className="w-4 h-4" style={{ color: AMBER }} />
            <span className="text-sm font-semibold text-white">Nous contacter</span>
          </div>
          <div className="space-y-1.5 text-xs text-white/40">
            <p>Support joueurs : <span className="text-white/70">support@quizarena.app</span></p>
            <p>Questions légales : <span className="text-white/70">legal@quizarena.app</span></p>
            <p>Délai de réponse : 5 jours ouvrés maximum</p>
          </div>
        </motion.div>

        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/25">
          <Link to="/terms"   className="hover:text-white/50 transition">Conditions générales</Link>
          <Link to="/privacy" className="hover:text-white/50 transition">Confidentialité</Link>
          <Link to="/rules"   className="hover:text-white/50 transition">Règles du jeu</Link>
          <Link to="/"        className="hover:text-white/50 transition ml-auto">← Retour à l'app</Link>
        </div>
      </div>
    </div>
  );
}
