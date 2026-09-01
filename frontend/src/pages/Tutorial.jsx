import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bot, Coins, Crown, LogIn, Shuffle,
  Swords, Target, Trophy, UserRound, Wallet,
} from "lucide-react";

/**
 * Page tutoriel dédiée, accessible depuis le profil — retour Paul du
 * 31/08 : "fait aussi la page tutoriel qui est dans le profil là utilise
 * des vectors et images prises sur internet pour illustrer". Avant,
 * "Revoir le tutoriel" relançait OnboardingModal, qui ne s'affiche jamais
 * pour un compte connecté (§OnboardingModal.jsx : `if (... || user) return
 * null`) — un bouton qui ne faisait donc littéralement rien. Ici : une
 * vraie page, illustrée avec deux photos Unsplash (licence gratuite, sans
 * attribution requise) pour les sections argent réel, et des compositions
 * vectorielles maison pour le reste (cohérence avec l'identité visuelle
 * déjà en place, §AuthLeft.jsx VersusGraphic).
 */
export default function Tutorial() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full px-4 sm:px-6 py-8 max-w-2xl mx-auto space-y-8">
      <button onClick={() => navigate(-1)} className="btn-ghost inline-flex items-center gap-2 text-xs">
        <ArrowLeft className="h-4 w-4" />Retour
      </button>

      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl">
        <img src="/illustrations/tuto-wallet.jpg" alt="" className="h-40 w-full object-cover sm:h-52" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(9,8,10,.15) 0%, rgba(9,8,10,.92) 100%)" }} />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[.16em]" style={{ color: "var(--accent)" }}>Comment jouer</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl" style={{ color: "#fff" }}>Réponds vite, réponds juste, gagne en FCFA</h1>
        </div>
      </header>

      {/* 3 façons de jouer */}
      <Section title="3 façons de jouer" icon={Target}>
        <div className="grid gap-3 sm:grid-cols-3">
          <ModeCard icon={UserRound} title="Solo" text="Un quiz chronométré, seul contre le score. Choisis ta mise, réponds vite." />
          <ModeCard icon={Swords} title="Duel 1v1" text="Un adversaire réel (ou l'ordinateur), même questions, le meilleur score gagne le pot." />
          <ModeCard icon={Trophy} title="Tournoi" text="Un bracket à élimination directe, 4 à 16 joueurs, jusqu'au dernier debout." />
        </div>
      </Section>

      {/* La mise */}
      <Section title="Comment fonctionne une mise" icon={Coins}>
        <div className="card rounded-2xl p-5">
          <CoinsGraphic />
          <ul className="mt-5 space-y-3 text-sm" style={{ color: "var(--text-sub)" }}>
            <li className="flex gap-2.5"><span style={{ color: "var(--accent)" }}>•</span>Tu choisis un montant avant la partie — le serveur vérifie ton solde avant tout débit.</li>
            <li className="flex gap-2.5"><span style={{ color: "var(--accent)" }}>•</span>En duel, le vainqueur remporte le pot des deux mises (moins les frais de service).</li>
            <li className="flex gap-2.5"><span style={{ color: "var(--accent)" }}>•</span>En cas d'égalité parfaite, chacun est simplement remboursé de sa mise — personne ne perd.</li>
            <li className="flex gap-2.5"><span style={{ color: "var(--accent)" }}>•</span>Une panne technique en cours de partie rembourse automatiquement la mise engagée.</li>
          </ul>
        </div>
      </Section>

      {/* Dépôts et retraits */}
      <Section title="Dépôts & retraits Mobile Money" icon={Wallet}>
        <div className="card overflow-hidden rounded-2xl">
          <img src="/illustrations/tuto-payment.jpg" alt="" className="h-32 w-full object-cover sm:h-40" />
          <div className="p-5">
            <p className="text-sm" style={{ color: "var(--text-sub)" }}>
              Les dépôts et retraits passent par <strong style={{ color: "var(--text)" }}>SharePay</strong>, notre prestataire Mobile Money — MTN MoMo et Orange Money. Un dépôt envoie une demande de confirmation directement sur ton téléphone.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MethodCard label="MTN Mobile Money" code="*126#" text="Valide la demande en attente avec ton code secret MoMo." />
              <MethodCard label="Orange Money" code="#150#" text="Confirme la demande affichée avec ton code secret à 4 chiffres." />
            </div>
            <p className="mt-4 text-xs" style={{ color: "var(--text-faint)" }}>Un retrait débite ton solde immédiatement ; s'il échoue côté opérateur, il est recrédité automatiquement.</p>
          </div>
        </div>
      </Section>

      {/* VIP */}
      <Section title="Devenir VIP" icon={Crown}>
        <div className="card rounded-2xl p-5 text-center">
          <CrownGraphic />
          <p className="mt-4 text-sm" style={{ color: "var(--text-sub)" }}>
            <strong style={{ color: "var(--accent)" }}>30 victoires de Duel</strong> sur un mois glissant débloquent le statut VIP : badge de certification, avatar personnalisé et avantages exclusifs.
          </p>
        </div>
      </Section>

      {/* Sécurité */}
      <Section title="Ton compte, en sécurité" icon={LogIn}>
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoCard icon={Shuffle} title="Sessions actives" text="Consulte et déconnecte à distance chaque appareil connecté à ton compte, depuis Profil." />
          <InfoCard icon={Bot} title="Anti-triche" text="Les gains inhabituels sont mis en quarantaine et vérifiés avant d'être débloqués." />
        </div>
      </Section>

      <button onClick={() => navigate("/profile")} className="btn-primary w-full rounded-2xl py-3.5 font-bold">
        Compris, retour au profil
      </button>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: "var(--accent)" }} />
        <h2 className="font-display text-lg font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ModeCard({ icon: Icon, title, text }) {
  return (
    <div className="card rounded-2xl p-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-bold">{title}</p>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-sub)" }}>{text}</p>
    </div>
  );
}

function MethodCard({ label, code, text }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: "var(--surface-2)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold">{label}</p>
        <code className="rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{code}</code>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: "var(--text-faint)" }}>{text}</p>
    </div>
  );
}

function InfoCard({ icon: Icon, title, text }) {
  return (
    <div className="card rounded-2xl p-4">
      <Icon className="h-5 w-5" style={{ color: "var(--accent)" }} />
      <p className="mt-2.5 text-sm font-bold">{title}</p>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-sub)" }}>{text}</p>
    </div>
  );
}

/* ─── Compositions vectorielles maison (même langage visuel que
   AuthLeft.jsx VersusGraphic : formes arrondies, dégradé ambre, glow) ─── */
function CoinsGraphic() {
  return (
    <div className="mx-auto flex h-16 w-fit items-end justify-center gap-[-8px]">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="grid h-12 w-12 -ml-2 first:ml-0 place-items-center rounded-full border-2 font-display text-xs font-extrabold"
          style={{ background: "linear-gradient(160deg, var(--accent), #b8860b)", borderColor: "var(--surface)", color: "#09080a", zIndex: 3 - i }}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 1.6, delay: i * .18, repeat: Infinity, ease: "easeInOut" }}
        >
          F
        </motion.div>
      ))}
    </div>
  );
}

function CrownGraphic() {
  return (
    <motion.div
      className="mx-auto grid h-16 w-16 place-items-center rounded-2xl"
      style={{ background: "radial-gradient(circle, var(--accent-soft), transparent 70%)" }}
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <Crown className="h-9 w-9" style={{ color: "var(--accent)" }} strokeWidth={1.6} />
    </motion.div>
  );
}
