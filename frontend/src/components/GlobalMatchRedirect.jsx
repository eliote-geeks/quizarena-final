import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as duel from "../lib/duelSocket";
import { useApp } from "../context/AppContext";

/**
 * Redirige vers /duel/play dès qu'un match démarre, depuis N'IMPORTE QUELLE
 * page — pas seulement depuis l'écran où le duel a été lancé.
 *
 * Bug réel (30/08/2026) : un joueur qui publie un duel ouvert puis quitte
 * l'écran /duel (retour au lobby, consultation du wallet, etc.) pendant
 * l'attente ne recevait jamais la redirection. Le serveur envoie bien
 * "matched" aux DEUX joueurs dès qu'un adversaire rejoint (§engine.ts
 * createMatch, a.send + b.send), mais le seul écouteur côté client vivait
 * dans DuelSetup.jsx — démonté dès que le créateur naviguait ailleurs, donc
 * l'événement arrivait dans le vide. Son adversaire, lui, était redirigé
 * normalement (il vient de rejoindre, DuelSetup est encore monté chez lui).
 *
 * Monté une seule fois dans Layout, donc actif sur tout écran protégé, au
 * même titre que DuelChallengePrompt et ActiveDuelGuard.
 */
export default function GlobalMatchRedirect() {
  const navigate = useNavigate();
  const { user, refreshWallet } = useApp();

  useEffect(() => {
    if (!user) return undefined;
    duel.connect();
    return duel.on("matched", () => {
      refreshWallet().catch(() => {});
      navigate("/duel/play");
    });
  }, [user, navigate, refreshWallet]);

  return null;
}
