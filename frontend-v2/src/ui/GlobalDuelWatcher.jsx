import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Label } from "./index";
import * as duel from "../lib/duelSocket";
import { playMatchChime, speakMatchFound, requestNotifyPermission, notifyMatchFound } from "../lib/notifications";
import { avatarUrl } from "../lib/api";
import * as api from "../lib/api";

/**
 * Monté une seule fois pour toute la session connectée (§ProtectedRoute.jsx),
 * indépendamment de l'écran affiché — un duel ouvert peut être accepté
 * pendant que le créateur navigue ailleurs. Dès que "matched" arrive :
 * fanfare audio, voix synthétique "Duel trouvé !", notification navigateur
 * si l'onglet est en arrière-plan, puis navigation vers /duel/play.
 *
 * Gère aussi les toasts "duel_opened" : quand un joueur publie un duel
 * ouvert, tous les autres connectés reçoivent ce message et voient un
 * toast en haut à droite pendant 6 s avec un bouton "Rejoindre".
 */
export default function GlobalDuelWatcher() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [notifPerm, setNotifPerm] = useState(() =>
    "Notification" in window ? Notification.permission : "unsupported"
  );
  // Liste de toasts duel_opened — max 3 simultanément
  const [toasts, setToasts] = useState([]);
  const [joiningCode, setJoiningCode] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [warAlerts, setWarAlerts] = useState([]);
  const dismissRef = useRef({});

  /* ── Demande permission notif au premier mount ─────────────────── */
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((p) => setNotifPerm(p)).catch(() => {});
    }
  }, []);

  /* ── Helpers toast ──────────────────────────────────────────────── */
  const addToast = useCallback((t) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [{ ...t, id }, ...prev].slice(0, 3));
    // Auto-dismiss après 6 s
    const timer = setTimeout(() => dismissToast(id), 6000);
    dismissRef.current[id] = timer;
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    clearTimeout(dismissRef.current[id]);
    delete dismissRef.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* ── WebSocket events ───────────────────────────────────────────── */
  useEffect(() => {
    duel.connect();

    // Duel trouvé → fanfare + voix + notif OS + navigation
    const offMatched = duel.on("matched", (m) => {
      playMatchChime();
      speakMatchFound(m.opponent?.username);
      // Notification OS même si l'onglet est visible (cas du créateur qui attend)
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          const n = new Notification("⚔️ Duel trouvé !", {
            body: m.opponent?.username
              ? `${m.opponent.username} a rejoint — la partie commence !`
              : "Un adversaire a rejoint — la partie commence !",
            tag: "quizarena-matched",
            icon: "/favicon.svg",
          });
          n.onclick = () => { window.focus(); n.close(); };
        } catch {}
      }
      nav("/duel/play");
    });

    // Duel ouvert publié par quelqu'un d'autre → toast in-app
    const offDuelOpened = duel.on("duel_opened", (m) => {
      const fmtStake = (m.stakeCoins ?? 0).toLocaleString("fr-FR");
      addToast({ username: m.username, stakeCoins: m.stakeCoins, code: m.code, fmtStake });

      // Notification OS si l'onglet est en arrière-plan
      if (document.visibilityState !== "visible") {
        notifyMatchFound(null); // réutilise la fn existante pour le son
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(`⚔️ ${m.username} a lancé un duel`, {
              body: `Mise ${fmtStake} F — clique pour rejoindre !`,
              tag: "quizarena-duel-opened-" + m.code,
              icon: "/favicon.svg",
            });
          } catch {}
        }
      }
    });
    const offChallenge = duel.on("duel_challenge", (m) => {
      setChallenges((items) => [m, ...items.filter((item) => item.code !== m.code)].slice(0, 2));
      playMatchChime();
      if (document.visibilityState !== "visible" && "Notification" in window && Notification.permission === "granted") {
        try { new Notification(`Défi privé de ${m.username}`, { body: `Mise ${Number(m.stakeCoins).toLocaleString("fr-FR")} F — accepter ou refuser`, tag: `duel-challenge-${m.code}`, icon: "/favicon.svg" }); } catch {}
      }
    });
    const removeChallenge = (m) => setChallenges((items) => items.filter((item) => item.code !== m.code));
    const offChallengeCancelled = duel.on("duel_challenge_cancelled", removeChallenge);
    const offChallengeExpired = duel.on("duel_challenge_expired", removeChallenge);
    const pushWarAlert = (alert) => {
      setWarAlerts((items) => [alert, ...items.filter((item) => item.warId !== alert.warId)].slice(0, 2));
      playMatchChime();
    };
    const offWarChallenge = duel.on("clan_war_challenge", (m) => pushWarAlert({ ...m, kind: "challenge" }));
    const offWarAccepted = duel.on("clan_war_accepted", (m) => pushWarAlert({ ...m, kind: "accepted" }));
    const offWarDeclined = duel.on("clan_war_declined", (m) => pushWarAlert({ ...m, kind: "declined" }));
    const offWarCancelled = duel.on("clan_war_cancelled", (m) => setWarAlerts((items) => items.filter((item) => item.warId !== m.warId)));

    return () => {
      offMatched();
      offDuelOpened();
      offChallenge(); offChallengeCancelled(); offChallengeExpired();
      offWarChallenge(); offWarAccepted(); offWarDeclined(); offWarCancelled();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Rejoindre depuis un toast ──────────────────────────────────── */
  const joinFromToast = useCallback((code, toastId) => {
    if (joiningCode) return;
    setJoiningCode(code);
    dismissToast(toastId);
    duel.joinInvite(code);
    // GlobalDuelWatcher reçoit "matched" → navigation automatique
    // En cas d'erreur, libérer le lock après 5 s
    setTimeout(() => setJoiningCode(null), 5000);
  }, [joiningCode, dismissToast]);

  return (
    <>
      {/* ── Bannière permission notifications ── */}
      <NotifPermBanner perm={notifPerm} onGranted={() => setNotifPerm("granted")} />

      <div className={clsx("fixed right-4 z-[9992] flex w-[calc(100vw-32px)] max-w-sm flex-col gap-3", pathname === "/" ? "top-20" : "top-16")} aria-live="assertive">
        {challenges.map((challenge) => <DirectChallengeCard key={challenge.code} challenge={challenge} home={pathname === "/"} onAccept={() => { setChallenges((items) => items.filter((item) => item.code !== challenge.code)); duel.joinInvite(challenge.code); }} onDecline={() => { duel.declineInvite(challenge.code); setChallenges((items) => items.filter((item) => item.code !== challenge.code)); }} />)}
        {warAlerts.map((alert) => <ClanWarAlertCard key={`${alert.kind}-${alert.warId}`} alert={alert} onOpen={() => { setWarAlerts((items) => items.filter((item) => item.warId !== alert.warId)); nav(`/clan-wars/${alert.warId}`); }} onAccept={async () => { try { await api.respondClanWar(alert.warId, true); setWarAlerts((items) => items.filter((item) => item.warId !== alert.warId)); nav(`/clan-wars/${alert.warId}`); } catch (e) { window.alert(e.message); } }} onRefuse={async () => { try { await api.respondClanWar(alert.warId, false); setWarAlerts((items) => items.filter((item) => item.warId !== alert.warId)); } catch (e) { window.alert(e.message); } }} />)}
      </div>

      {/* ── Toasts duels ouverts ── */}
      <div
        aria-live="polite"
        style={{
          position: "fixed", top: 64, right: 16, zIndex: 9990,
          display: "flex", flexDirection: "column", gap: 10,
          maxWidth: 320, width: "calc(100vw - 32px)",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <DuelOpenedToast
            key={t.id}
            toast={t}
            joining={joiningCode === t.code}
            disabled={!!joiningCode}
            onJoin={() => joinFromToast(t.code, t.id)}
            onDismiss={() => dismissToast(t.id)}
          />
        ))}
      </div>
    </>
  );
}

function ClanWarAlertCard({ alert, onOpen, onAccept, onRefuse }) {
  const isChallenge = alert.kind === "challenge";
  return <section className="overflow-hidden rounded-2xl border border-flare/40 bg-ink-2 shadow-2xl">
    <div className="h-1 bg-linear-to-r from-flare via-danger to-flare" />
    <div className="p-4">
      <Label tone="flare">{isChallenge ? "déclaration de guerre" : alert.kind === "accepted" ? "guerre acceptée" : "guerre refusée"}</Label>
      <h3 className="t-display mt-2 text-lg">{isChallenge ? `${alert.clanName} défie ton clan` : alert.kind === "accepted" ? `${alert.opponentClanName} entre dans l’arène` : "Le clan adverse a refusé"}</h3>
      <p className="mt-1 text-xs text-bone-4">{isChallenge ? `${alert.teamSize}v${alert.teamSize} · ${alert.stakeCoins ? `${Number(alert.stakeCoins).toLocaleString("fr-FR")} F par clan` : "gratuit"}` : alert.kind === "accepted" ? "Compose ton équipe : le délai de 24 heures a commencé." : "Tu peux immédiatement publier ou accepter une autre demande."}</p>
      <div className="mt-4 flex gap-2">{isChallenge ? <><button onClick={onRefuse} className="flex-1 rounded-lg border border-ink-5 px-3 py-2 text-xs font-bold text-bone-4">Refuser</button><button onClick={onAccept} className="flex-1 rounded-lg bg-flare px-3 py-2 text-xs font-bold text-ink">Accepter</button></> : <button onClick={onOpen} className="w-full rounded-lg bg-flare px-3 py-2 text-xs font-bold text-ink">{alert.kind === "accepted" ? "Ouvrir la guerre" : "Voir les guerres"}</button>}</div>
    </div>
  </section>;
}

function DirectChallengeCard({ challenge, home, onAccept, onDecline }) {
  return <section className={clsx("direct-challenge-card overflow-hidden rounded-2xl border border-flare/35 bg-ink-2 shadow-2xl", home && "direct-challenge-home")}>
    <div className="h-1 bg-flare" />
    <div className="p-4">
      <div className="flex items-center gap-3">
        <img src={avatarUrl(challenge.username)} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-flare/40" />
        <div className="min-w-0 flex-1"><Label tone="flare">défi privé · maintenant</Label><h3 className="t-display mt-1 truncate text-lg">{challenge.username} te provoque</h3></div>
        <span className="t-display text-flare">⚔</span>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-ink-3 px-3 py-2"><span className="t-label text-bone-4">mise du duel</span><strong className="text-sm text-flare">{Number(challenge.stakeCoins).toLocaleString("fr-FR")} F</strong></div>
      <div className="mt-3 grid grid-cols-2 gap-2"><button onClick={onDecline} className="rounded-xl border border-ink-5 py-2.5 text-xs font-bold text-bone-3 hover:bg-ink-3">Refuser</button><button onClick={onAccept} className="rounded-xl bg-flare py-2.5 text-xs font-black text-ink shadow-[0_8px_24px_rgba(245,158,11,.22)]">Accepter le défi</button></div>
    </div>
  </section>;
}

/* ──────────────────────────────────────────────────────────────────────
   Toast "duel ouvert" — apparaît en haut à droite, auto-dismiss 6 s.
   ────────────────────────────────────────────────────────────────────── */
function DuelOpenedToast({ toast, joining, disabled, onJoin, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // micro-délai pour déclencher l'animation d'entrée
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        pointerEvents: "auto",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(110%)",
        transition: "opacity 0.28s ease, transform 0.28s cubic-bezier(.22,.68,0,1.2)",
        background: "var(--color-ink-2)",
        border: "1px solid color-mix(in srgb, var(--color-flare) 30%, transparent)",
        borderRadius: 12,
        padding: "12px 14px",
        boxShadow: "0 8px 32px rgba(0,0,0,.55), 0 0 0 1px rgba(242,169,59,.08)",
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      {/* Icône épées */}
      <span style={{
        flexShrink: 0,
        width: 36, height: 36,
        borderRadius: 10,
        background: "rgba(242,169,59,.14)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--color-flare)",
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21 12 12M21 3l-9 9"/>
          <path d="M3 3l4 1 1 4-2 2-4-1-1-4z" fill="currentColor" stroke="none"/>
          <path d="M21 21l-4-1-1-4 2-2 4 1 1 4z" fill="currentColor" stroke="none"/>
        </svg>
      </span>

      {/* Texte */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 12, fontWeight: 700, color: "var(--color-bone)",
          margin: 0, lineHeight: 1.4,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {toast.username} a lancé un duel
        </p>
        <p style={{ fontSize: 11, color: "var(--color-flare)", margin: "2px 0 0", fontWeight: 600 }}>
          Mise {toast.fmtStake} F
        </p>
      </div>

      {/* Bouton rejoindre */}
      <button
        onClick={onJoin}
        disabled={disabled}
        style={{
          flexShrink: 0,
          padding: "5px 11px",
          borderRadius: 7,
          fontSize: 11,
          fontWeight: 700,
          cursor: disabled ? "not-allowed" : "pointer",
          border: "none",
          fontFamily: "inherit",
          background: disabled ? "var(--color-ink-4)" : "var(--color-flare)",
          color: disabled ? "var(--color-bone-4)" : "#1a0900",
          transition: "background 0.15s",
        }}
      >
        {joining ? "…" : "Rejoindre"}
      </button>

      {/* Fermer */}
      <button
        onClick={onDismiss}
        aria-label="Fermer"
        style={{
          flexShrink: 0,
          width: 20, height: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 4,
          border: "none",
          background: "transparent",
          color: "var(--color-bone-4)",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Bannière de demande de permission notifications.
   Apparaît une seule fois en bas, disparaît si l'utilisateur accepte
   ou ferme. Explication claire de ce qu'on lui demande et pourquoi.
   ────────────────────────────────────────────────────────────────────── */
const NOTIF_BANNER_DISMISSED_KEY = "qa_notif_banner_dismissed";

function NotifPermBanner({ perm, onGranted }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (perm !== "default") return; // déjà accordé ou refusé → pas de bannière
    const dismissed = localStorage.getItem(NOTIF_BANNER_DISMISSED_KEY);
    if (dismissed) return;
    // Afficher après 3 s pour ne pas agresser dès l'ouverture
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, [perm]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(NOTIF_BANNER_DISMISSED_KEY, "1");
  };

  const allow = async () => {
    try {
      const p = await Notification.requestPermission();
      if (p === "granted") onGranted();
    } catch {}
    dismiss();
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 12, // haut de l'écran — ne bloque plus les boutons des modaux en bas
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9980,
        width: "calc(100vw - 32px)",
        maxWidth: 420,
        background: "var(--color-ink-2)",
        border: "1px solid color-mix(in srgb, var(--color-flare) 25%, transparent)",
        borderRadius: 14,
        padding: "14px 16px",
        boxShadow: "0 8px 40px rgba(0,0,0,.65)",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{
          fontSize: 24, flexShrink: 0, lineHeight: 1,
        }}>🔔</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-bone)", margin: "0 0 4px" }}>
            Activer les notifications
          </p>
          <p style={{ fontSize: 12, color: "var(--color-bone-3)", margin: "0 0 12px", lineHeight: 1.5 }}>
            Pour être alerté quand quelqu'un rejoint ton duel ou quand un adversaire est disponible — même si tu navigues ailleurs dans l'app.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={allow}
              style={{
                padding: "7px 16px", borderRadius: 8,
                fontSize: 12, fontWeight: 700,
                background: "var(--color-flare)", color: "#1a0900",
                border: "none", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Autoriser
            </button>
            <button
              onClick={dismiss}
              style={{
                padding: "7px 12px", borderRadius: 8,
                fontSize: 12, fontWeight: 600,
                background: "var(--color-ink-3)", color: "var(--color-bone-3)",
                border: "1px solid var(--color-ink-4)", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Plus tard
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          style={{
            flexShrink: 0, background: "none", border: "none",
            color: "var(--color-bone-4)", cursor: "pointer", padding: 2,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
