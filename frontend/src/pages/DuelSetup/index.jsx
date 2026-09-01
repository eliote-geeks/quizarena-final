import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { formatMoney } from "../../lib/currency";
import * as api from "../../lib/api";
import * as duel from "../../lib/duelSocket";
import InvitedScreen from "./InvitedScreen";
import SearchingScreen from "./SearchingScreen";
import { WaitingDirectScreen, WaitingScreen } from "./WaitingScreen";
import SetupForm from "./SetupForm";

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
  const autoAccept = params.get("accept") === "1";
  const directTarget = location.state?.quickOpponent?.name || location.state?.challengeUsername || null;
  const [stake, setStake] = useState(location.state?.defaultStake || 500);
  const [mode, setMode] = useState("queue");
  const [status, setStatus] = useState(inviteCode ? "invited" : "setup");
  const [createdInvite, setCreatedInvite] = useState(null);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [inviteHost, setInviteHost] = useState(null);
  const actionRef = useRef(null);
  const autoAcceptRef = useRef(false);

  // Bug réel du 31/08 : cet écran affichait la mise par défaut du
  // formulaire (500 F) au lieu de la vraie mise fixée par le créateur du
  // lien — rien n'allait jamais chercher l'information avant acceptation.
  // Le débit serveur restait juste, mais on demandait de valider "à
  // l'aveugle" un montant faux, inacceptable sur de l'argent réel.
  useEffect(() => {
    if (!inviteCode) return;
    let cancelled = false;
    api.getInviteInfo(inviteCode)
      .then((info) => {
        if (cancelled) return;
        setInviteHost(info);
        setStake(info.stakeCoins);
      })
      .catch(() => { if (!cancelled) setError("Ce lien d’invitation est introuvable ou a expiré."); });
    return () => { cancelled = true; };
  }, [inviteCode]);

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

  useEffect(() => {
    if (!autoAccept || !inviteCode || autoAcceptRef.current) return;
    autoAcceptRef.current = true;
    setError(""); setStatus("searching"); duel.joinInvite(inviteCode);
  }, [autoAccept, inviteCode]);

  const ensureStake = () => {
    if (stake < 100) { setError("La mise minimale est de 100 F."); return false; }
    if (stake > coins) { setError(`Solde insuffisant : il te faut ${formatMoney(stake, currency)}.`); return false; }
    setError(""); return true;
  };

  const launch = () => {
    if (!ensureStake()) return;
    setConfirmation({ type: "launch" });
  };

  const confirmLaunch = () => {
    actionRef.current = mode;
    if (mode === "queue") { setStatus("searching"); duel.queue(stake); }
    else duel.createInvite(stake, mode === "open", directTarget || undefined);
    setConfirmation(null);
  };

  const acceptInvite = () => {
    if (!inviteCode) return;
    setConfirmation({ type: "accept" });
  };
  const confirmAcceptInvite = () => {
    setError(""); setStatus("searching"); duel.joinInvite(inviteCode);
    setConfirmation(null);
  };

  // Annule réellement la recherche/l'invitation en cours — réservé aux
  // boutons explicites ("Annuler la recherche"/"Annuler le défi"). Bug réel
  // du 31/08 : la flèche "Retour" en haut de l'écran appelait cette même
  // fonction, donc quitter l'écran après avoir publié un duel ouvert
  // l'annulait sans le vouloir — il ne redevenait visible que si on
  // naviguait ailleurs sans jamais passer par ce bouton. Le "Retour" du
  // Shell doit juste quitter l'écran (§Shell back=), jamais annuler.
  const cancel = () => {
    if (status === "searching") duel.cancelQueue();
    if (status === "waiting") duel.cancelInvite();
    setStatus(inviteCode ? "invited" : "setup"); setCreatedInvite(null);
  };

  const inviteLink = createdInvite ? `${window.location.origin}/duel?invite=${encodeURIComponent(createdInvite.code)}` : "";

  if (status === "invited") {
    return (
      <InvitedScreen
        navigate={navigate} inviteHost={inviteHost} stake={stake} currency={currency} error={error}
        confirmation={confirmation} acceptInvite={acceptInvite} confirmAcceptInvite={confirmAcceptInvite} setConfirmation={setConfirmation}
      />
    );
  }

  if (status === "searching") {
    return <SearchingScreen navigate={navigate} cancel={cancel} stake={stake} currency={currency} />;
  }

  if (status === "waiting" && createdInvite?.direct) {
    return <WaitingDirectScreen navigate={navigate} createdInvite={createdInvite} stake={stake} currency={currency} error={error} cancel={cancel} />;
  }

  if (status === "waiting") {
    return (
      <WaitingScreen
        navigate={navigate} createdInvite={createdInvite} inviteLink={inviteLink} showShare={showShare}
        setShowShare={setShowShare} user={user} stake={stake} currency={currency} cancel={cancel}
      />
    );
  }

  return (
    <SetupForm
      navigate={navigate} mode={mode} setMode={setMode} stake={stake} setStake={setStake} directTarget={directTarget}
      coins={coins} currency={currency} error={error} launch={launch}
      confirmation={confirmation} setConfirmation={setConfirmation} confirmLaunch={confirmLaunch}
    />
  );
}
