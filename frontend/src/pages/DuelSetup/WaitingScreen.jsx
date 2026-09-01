import { motion } from "framer-motion";
import { Check, Link2, Share2, Swords, UserRound } from "lucide-react";
import { formatMoney } from "../../lib/currency";
import Shell from "./Shell";
import ErrorMessage from "./ErrorMessage";
import ShareModal from "./ShareModal";

// Un défi direct (ciblé sur un pseudo précis) est déjà livré au joueur
// visé par le serveur (§engine.ts createInvite → duel_challenge) : il n'y
// a rien à "partager", le lien n'a aucun sens ici. Avant ce correctif,
// cet écran affichait quand même l'interface de partage de lien — d'où
// l'impression de n'avoir "aucune interface" adaptée pour un défi direct.
export function WaitingDirectScreen({ navigate, createdInvite, stake, currency, error, cancel }) {
  return (
    <Shell back={() => navigate("/")} eyebrow="Défi envoyé" title={`En attente de ${createdInvite.targetUsername || "l'adversaire"}`}>
      <div className="card rounded-3xl p-6 text-center">
        <WaitingForOpponentScene />
        <p className="mt-6 text-sm" style={{ color: "var(--text-sub)" }}>
          {createdInvite.targetUsername || "Ton adversaire"} a reçu ton défi et le voit sur son écran tant qu'il n'a pas répondu.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2 rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
          <Swords className="h-4 w-4" style={{ color: "var(--accent)" }} />
          <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>{formatMoney(stake, currency)} par joueur</span>
        </div>
        {error && <ErrorMessage text={error} />}
        <button onClick={cancel} className="btn-ghost mt-5 w-full py-2">Annuler le défi</button>
      </div>
    </Shell>
  );
}

export function WaitingScreen({ navigate, createdInvite, inviteLink, showShare, setShowShare, user, stake, currency, cancel }) {
  return (
    <Shell back={() => navigate("/")} eyebrow={createdInvite?.isPublic ? "Duel publié" : "Invitation prête"} title={createdInvite?.isPublic ? "Ton défi est visible" : "Partage ce lien privé"}>
      <ShareModal link={inviteLink} open={showShare} user={user} onClose={() => setShowShare(false)} />
      <div className="card rounded-3xl p-5">
        <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
          <Link2 className="h-5 w-5 shrink-0" style={{ color: "var(--accent)" }} />
          <span className="min-w-0 flex-1 truncate text-xs font-mono">{inviteLink}</span>
          <Check className="h-4 w-4" style={{ color: "var(--success)" }} />
        </div>
        <button onClick={() => setShowShare(true)} className="btn-primary mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold">
          <Share2 className="h-4 w-4" />Partager le lien
        </button>
        <p className="mt-4 text-center text-xs" style={{ color: "var(--text-sub)" }}>En attente · mise {formatMoney(stake, currency)}</p>
        <button onClick={cancel} className="btn-ghost mt-3 w-full py-2">Annuler le défi</button>
      </div>
    </Shell>
  );
}

/** Scène d'attente pour un défi direct : deux joueurs face à face, l'un
 * en surbrillance (toi), le lien entre eux qui pulse — contrairement au
 * matchmaking aléatoire, l'adversaire est déjà connu et nommé au-dessus. */
function WaitingForOpponentScene() {
  return (
    <div className="relative mx-auto h-32 max-w-xs overflow-hidden rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border-md)" }}>
      <motion.div
        className="absolute left-1/2 top-1/2 h-px w-24 -translate-x-1/2 -translate-y-1/2"
        style={{ background: "var(--accent)" }}
        animate={{ opacity: [.2, .7, .2] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      />
      <motion.div
        className="absolute left-10 top-1/2 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-2xl border"
        style={{ background: "var(--surface-2)", borderColor: "var(--accent)", color: "var(--accent)" }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <UserRound className="h-7 w-7" />
      </motion.div>
      <motion.div
        className="absolute right-10 top-1/2 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-2xl border"
        style={{ background: "var(--surface-2)", borderColor: "var(--border-md)", color: "var(--text-faint)" }}
        animate={{ opacity: [.4, 1, .4] }}
        transition={{ duration: 1.2, delay: .3, repeat: Infinity, ease: "easeInOut" }}
      >
        <UserRound className="h-7 w-7" />
      </motion.div>
    </div>
  );
}
