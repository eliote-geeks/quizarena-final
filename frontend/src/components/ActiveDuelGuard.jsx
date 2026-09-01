import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StakeConfirmModal from "./StakeConfirmModal";
import * as duel from "../lib/duelSocket";
import { DUEL_EXIT_GUARD_EVENT } from "../lib/duelNavigation";

/** Protège les mises contre un clic de navigation accidentel. Le rechargement
 * ou la fermeture de l'onglet restent, par contrainte navigateur, couverts par
 * beforeunload dans DuelPlay. */
export default function ActiveDuelGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(null);
  const [duelEpoch, refresh] = useState(0);
  const arenaWasOpen = useRef(false);
  const bouncing = useRef(false);

  useEffect(() => duel.on("*", () => refresh((value) => value + 1)), []);

  useEffect(() => {
    const request = (event) => {
      if (!duel.hasActiveDuel()) {
        event.detail?.action?.();
        return;
      }
      setPending(event.detail || null);
    };
    window.addEventListener(DUEL_EXIT_GUARD_EVENT, request);
    return () => window.removeEventListener(DUEL_EXIT_GUARD_EVENT, request);
  }, []);

  useEffect(() => {
    const active = duel.hasActiveDuel();
    const inArena = location.pathname === "/duel/play";
    if (active && inArena) {
      arenaWasOpen.current = true;
      bouncing.current = false;
      return;
    }
    if (!active) {
      arenaWasOpen.current = false;
      bouncing.current = false;
      return;
    }
    // Couvre le bouton Retour du navigateur et toute navigation programmatique
    // oubliée : on revient dans l'arène avant d'afficher la décision explicite.
    if (arenaWasOpen.current && !inArena && !bouncing.current) {
      const destination = `${location.pathname}${location.search}${location.hash}`;
      bouncing.current = true;
      setPending({
        destination: "la page demandée",
        action: () => navigate(destination),
      });
      navigate("/duel/play", { replace: true });
    }
  }, [duelEpoch, location.hash, location.pathname, location.search, navigate]);

  const confirm = () => {
    const action = pending?.action;
    setPending(null);
    duel.forfeit();
    window.setTimeout(() => action?.(), 80);
  };

  return <StakeConfirmModal
    open={Boolean(pending)}
    zIndex={120}
    title="Abandonner le duel ?"
    message={`Tu demandes à ouvrir ${pending?.destination || "une autre page"}. Le duel continue côté serveur : confirmer enregistrera un forfait et la mise restera engagée.`}
    confirmLabel="Abandonner et quitter"
    onCancel={() => { setPending(null); bouncing.current = false; }}
    onConfirm={confirm}
  />;
}
