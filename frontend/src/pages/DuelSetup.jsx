import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import * as duel from "../lib/duelSocket";
import { Check, Copy, Link2, Minus, Plus, Search, Share2, Swords, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

const STAKES = [100, 250, 500, 1000, 2500, 5000];
const CANCEL_MESSAGES = {
  solde_insuffisant: "L’adversaire n’a plus le solde requis. Aucune mise n’a été perdue.",
  adversaire_deconnecte: "L’adversaire s’est déconnecté avant le départ. Mise remboursée.",
  adversaire_pas_pret: "L’adversaire n’a pas confirmé sa présence. Mise remboursée.",
};

export default function DuelSetup() {
  const { coins, currency, user, refreshWallet } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const inviteCode = params.get("invite");
  const directTarget = location.state?.quickOpponent?.name || location.state?.challengeUsername || null;
  const [stake, setStake] = useState(location.state?.defaultStake || 500);
  const [mode, setMode] = useState("queue");
  const [status, setStatus] = useState(inviteCode ? "invited" : "setup");
  const [createdInvite, setCreatedInvite] = useState(null);
  const [error, setError] = useState("");
  const actionRef = useRef(null);

  useEffect(() => {
    duel.connect();
    const offMatched = duel.on("matched", () => { refreshWallet().catch(() => {}); navigate("/duel/play"); });
    const offQueued = duel.on("queued", () => setStatus("searching"));
    const offTimeout = duel.on("queue_timeout", () => { setStatus("setup"); setError("Aucun adversaire disponible pour cette mise. Réessaie dans un instant."); });
    const offCancelled = duel.on("duel_cancelled", (message) => { setStatus("setup"); setCreatedInvite(null); setError(CANCEL_MESSAGES[message.reason] || "Duel annulé. La mise a été remboursée si elle avait été débitée."); refreshWallet().catch(() => {}); });
    const offError = duel.on("error", (message) => { setStatus(inviteCode ? "invited" : "setup"); setError(message.message || "Impossible de lancer ce duel"); });
    const offCreated = duel.on("invite_created", (message) => { setCreatedInvite(message); setStatus("waiting"); });
    const offExpired = duel.on("invite_expired", () => { setCreatedInvite(null); setStatus("setup"); setError("Le lien a expiré sans adversaire."); });
    const offDeclined = duel.on("invite_declined", (message) => { setCreatedInvite(null); setStatus("setup"); setError(`${message.username || "Le joueur"} a refusé le défi.`); });
    return () => { offMatched(); offQueued(); offTimeout(); offCancelled(); offError(); offCreated(); offExpired(); offDeclined(); };
  }, [inviteCode, navigate, refreshWallet]);

  const ensureStake = () => {
    if (stake < 100) { setError("La mise minimale est de 100 F."); return false; }
    if (stake > coins) { setError(`Solde insuffisant : il te faut ${formatMoney(stake, currency)}.`); return false; }
    setError(""); return true;
  };

  const launch = () => {
    if (!ensureStake()) return;
    actionRef.current = mode;
    if (mode === "queue") { setStatus("searching"); duel.queue(stake); }
    else duel.createInvite(stake, mode === "open", directTarget || undefined);
  };

  const acceptInvite = () => {
    if (!inviteCode) return;
    setError(""); setStatus("searching"); duel.joinInvite(inviteCode);
  };

  const cancel = () => {
    if (status === "searching") duel.cancelQueue();
    if (status === "waiting") duel.cancelInvite();
    setStatus(inviteCode ? "invited" : "setup"); setCreatedInvite(null);
  };

  const inviteLink = createdInvite ? `${window.location.origin}/duel?invite=${encodeURIComponent(createdInvite.code)}` : "";
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(inviteLink); toast.success("Lien copié"); }
    catch { window.prompt("Copie ce lien", inviteLink); }
  };
  const shareLink = async () => {
    if (navigator.share) { await navigator.share({ title: "Défi QuizArena", text: `${user?.name || "Un joueur"} te défie sur QuizArena`, url: inviteLink }).catch(() => {}); }
    else copyLink();
  };

  if (status === "invited") return (
    <Shell back={() => navigate("/")} eyebrow="Invitation privée" title="Un joueur t’attend dans l’arène">
      <div className="card rounded-3xl p-6 text-center"><Swords className="mx-auto h-12 w-12" style={{ color: "var(--accent)" }} /><p className="mt-4 text-sm" style={{ color: "var(--text-sub)" }}>La mise exacte et le solde des deux joueurs seront vérifiés par le serveur avant le débit.</p>{error && <ErrorMessage text={error} />}<button onClick={acceptInvite} className="btn-primary mt-6 w-full rounded-2xl py-4">Vérifier et accepter</button><button onClick={() => navigate("/")} className="btn-ghost mt-3 w-full py-3">Refuser</button></div>
    </Shell>
  );

  if (status === "searching") return <Shell back={cancel} eyebrow="Matchmaking sécurisé" title="Recherche d’un adversaire"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.3, repeat: Infinity, ease: "linear" }} className="mx-auto mt-14 h-20 w-20 rounded-full border-4 border-t-transparent" style={{ borderColor: "var(--accent)" }} /><p className="mt-8 text-center text-sm" style={{ color: "var(--text-sub)" }}>Mise {formatMoney(stake, currency)} · aucun débit définitif sans match valide</p><button onClick={cancel} className="btn-secondary mt-8 w-full rounded-2xl py-3">Annuler la recherche</button></Shell>;

  if (status === "waiting") return (
    <Shell back={cancel} eyebrow={createdInvite?.isPublic ? "Duel publié" : "Invitation prête"} title={createdInvite?.isPublic ? "Ton défi est visible" : "Partage ce lien privé"}>
      <div className="card rounded-3xl p-5"><div className="flex items-center gap-3 rounded-xl p-3" style={{ background: "var(--surface-2)" }}><Link2 className="h-5 w-5 shrink-0" style={{ color: "var(--accent)" }} /><span className="min-w-0 flex-1 truncate text-xs">{inviteLink}</span><Check className="h-4 w-4" style={{ color: "var(--success)" }} /></div><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={copyLink} className="btn-secondary inline-flex items-center justify-center gap-2 rounded-xl py-3"><Copy className="h-4 w-4" />Copier</button><button onClick={shareLink} className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl py-3"><Share2 className="h-4 w-4" />Partager</button></div><p className="mt-4 text-center text-xs" style={{ color: "var(--text-sub)" }}>En attente · mise {formatMoney(stake, currency)}</p><button onClick={cancel} className="btn-ghost mt-3 w-full py-2">Annuler le défi</button></div>
    </Shell>
  );

  return (
    <Shell back={() => navigate("/")} eyebrow="Nouveau duel" title="Configure ton défi">
      <div className="grid grid-cols-3 gap-2">{[["queue", Search, "Aléatoire"], ["open", Swords, "Duel ouvert"], ["private", UserPlus, directTarget ? directTarget : "Lien privé"]].map(([id, Icon, label]) => <button key={id} onClick={() => setMode(id)} className={`rounded-2xl p-3 text-center text-xs font-bold ${mode === id ? "btn-primary" : "card"}`}><Icon className="mx-auto mb-2 h-5 w-5" />{label}</button>)}</div>
      <section className="mt-6"><label className="mb-2 block text-xs font-bold" style={{ color: "var(--text-sub)" }}>Mise par joueur</label><div className="card rounded-2xl p-5"><div className="flex items-center gap-3"><button onClick={() => setStake((value) => Math.max(100, value - 50))} className="btn-secondary grid h-11 w-11 place-items-center rounded-xl"><Minus className="h-4 w-4" /></button><input type="number" min="100" max="50000" value={stake} onChange={(event) => setStake(Math.max(0, Number(event.target.value) || 0))} className="min-w-0 flex-1 bg-transparent text-center font-display text-3xl font-bold outline-none" style={{ color: "var(--accent)" }} /><button onClick={() => setStake((value) => Math.min(50000, value + 50))} className="btn-secondary grid h-11 w-11 place-items-center rounded-xl"><Plus className="h-4 w-4" /></button></div><div className="mt-4 grid grid-cols-3 gap-2">{STAKES.map((amount) => <button key={amount} onClick={() => setStake(amount)} className={stake === amount ? "btn-primary rounded-lg py-2 text-xs" : "btn-secondary rounded-lg py-2 text-xs"}>{amount.toLocaleString("fr-FR")}</button>)}</div><div className="mt-4 flex justify-between border-t pt-4 text-sm" style={{ borderColor: "var(--divider)" }}><span style={{ color: "var(--text-sub)" }}>Gain brut vainqueur</span><strong style={{ color: "var(--success)" }}>{formatMoney(Math.round(stake * 1.8), currency)}</strong></div></div></section>
      {error && <ErrorMessage text={error} />}
      <button onClick={launch} disabled={stake > coins || stake < 100} className="btn-primary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-4 disabled:opacity-40"><Swords className="h-5 w-5" />{mode === "queue" ? "Trouver un adversaire" : mode === "open" ? "Publier le duel" : directTarget ? `Défier ${directTarget}` : "Créer le lien privé"}</button>
      <p className="mt-3 text-center text-xs" style={{ color: "var(--text-faint)" }}>Le serveur vérifie les deux soldes et calcule seul le score, l’ELO et le paiement.</p>
    </Shell>
  );
}

function Shell({ back, eyebrow, title, children }) { return <div className="min-h-full px-4 sm:px-6 py-8 max-w-xl mx-auto"><button onClick={back} className="btn-ghost inline-flex items-center gap-2 text-xs"><X className="h-4 w-4" />Retour</button><header className="mt-6"><p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>{eyebrow}</p><h1 className="mt-2 font-display text-4xl font-extrabold" style={{ color: "var(--text)" }}>{title}</h1></header><div className="mt-7">{children}</div></div>; }
function ErrorMessage({ text }) { return <p className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(244,63,94,.1)", color: "var(--danger)" }}>{text}</p>; }
