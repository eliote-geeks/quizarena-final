import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import { Block, Loader, Stat } from "../ui";
import { NavIcon } from "../ui/icons";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import * as duel from "../lib/duelSocket";

/* ── Niveaux de difficulté de l'IA ─────────────────────────────────── */
const LEVELS = [
  {
    id: "facile",
    label: "Facile",
    hint: "3/10 bonnes réponses en moyenne",
    accent: "#16A34A",
    bg: "rgba(22,163,74,0.12)",
    border: "rgba(22,163,74,0.35)",
    multiplier: 1.2,
  },
  {
    id: "moyen",
    label: "Moyen",
    hint: "5/10 en moyenne — 50/50",
    accent: "#2563EB",
    bg: "rgba(37,99,235,0.12)",
    border: "rgba(37,99,235,0.35)",
    multiplier: 1.5,
  },
  {
    id: "difficile",
    label: "Difficile",
    hint: "7/10 en moyenne — exigeant",
    accent: "#F97316",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.35)",
    multiplier: 2,
  },
];

/**
 * Popup de règles affiché avant chaque partie solo.
 * L'utilisateur choisit la difficulté de l'IA et doit cocher la case
 * avant de pouvoir jouer.
 */
function SoloDuelRulesModal({ mode, cat, onConfirm, onCancel }) {
  const [agreed, setAgreed] = useState(false);
  const [level, setLevel] = useState("moyen");
  const isChallenge = mode === "CHALLENGE";
  const lvl = LEVELS.find((l) => l.id === level);

  const rules = isChallenge
    ? [
        { icon: "coin",   text: "Mise de 500 F débitée immédiatement" },
        { icon: "zap",    text: "10 questions, 8 secondes par question" },
        { icon: "trophy", text: `Victoire → ${Math.round(500 * lvl.multiplier).toLocaleString("fr-FR")} F versés (×${String(lvl.multiplier).replace(".", ",")})` },
        { icon: "trophy", text: "Égalité → 95 % de la mise remboursée" },
        { icon: "alert",  text: "Défaite ou abandon → mise perdue" },
      ]
    : [
        { icon: "zap",   text: "10 questions, 8 secondes par question" },
        { icon: "check", text: "Mode entraînement — aucune mise, aucun gain" },
        { icon: "check", text: "Aucune limite de parties, pas de pression" },
      ];

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-end justify-center bg-ink/85 px-0 pb-0 backdrop-blur-[3px] sm:items-center sm:px-5 sm:pb-5"
      onClick={onCancel}
    >
      <div
        className="anim-rise w-full max-w-md rounded-t-(--radius-panel) bg-ink-2 sm:rounded-(--radius-panel)"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ── En-tête ── */}
        <div
          className={clsx(
            "flex items-center gap-4 px-6 pt-6 pb-5 border-b border-ink-4",
            isChallenge ? "text-flare" : "text-live"
          )}
        >
          <span
            className={clsx(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-(--radius-tag)",
              isChallenge ? "bg-flare/15" : "bg-live/15"
            )}
          >
            <NavIcon type={isChallenge ? "swords" : "star"} className="h-6 w-6" />
          </span>
          <div>
            <p className="t-label text-bone-4 text-[11px] uppercase tracking-wider">
              {cat?.name ?? "Catégorie"} · vs Ordinateur
            </p>
            <h2 className="t-display text-xl mt-0.5">
              {isChallenge ? "Solo Challenge" : "Solo Entraînement"}
            </h2>
          </div>
        </div>

        {/* ── Choix du niveau de l'IA ── */}
        <div className="px-6 pt-5 pb-2">
          <p className="t-label text-bone-4 text-[10px] uppercase tracking-wider mb-3">
            Niveau de l'adversaire IA
          </p>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLevel(l.id)}
                className={clsx(
                  "press flex flex-col items-center gap-1 rounded-(--radius-card) border-2 px-2 py-3 text-center transition-all",
                  level === l.id ? "border-transparent" : "border-transparent bg-ink-3 hover:bg-ink-4"
                )}
                style={level === l.id ? { background: l.bg, borderColor: l.border } : {}}
              >
                <span className="t-title text-[14px] font-bold" style={level === l.id ? { color: l.accent } : {}}>
                  {l.label}
                </span>
                <span className="t-body text-[10px] text-bone-4">{l.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Règles ── */}
        <div className="px-6 py-4">
          <p className="t-label text-bone-4 text-[10px] uppercase tracking-wider mb-3">
            Règles du jeu
          </p>
          <ul className="flex flex-col gap-2.5">
            {rules.map((r, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className={clsx(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    r.icon === "alert"
                      ? "bg-danger/15 text-danger"
                      : r.icon === "coin"
                      ? "bg-flare/15 text-flare"
                      : r.icon === "trophy"
                      ? "bg-live/12 text-live"
                      : "bg-ink-4 text-bone-3"
                  )}
                >
                  <RuleIcon type={r.icon} />
                </span>
                <span className="t-body text-sm text-bone-2">{r.text}</span>
              </li>
            ))}
          </ul>

          {/* Récap mise pour le challenge */}
          {isChallenge && lvl && (
            <div
              className="mt-4 rounded-(--radius-card) px-4 py-3 flex items-center justify-between"
              style={{ background: lvl.bg, border: `1px solid ${lvl.border}` }}
            >
              <div>
                <p className="t-label text-[10px] uppercase tracking-wider text-bone-4">Adversaire</p>
                <p className="t-title text-[14px] font-bold mt-0.5" style={{ color: lvl.accent }}>
                  Ordinateur · {lvl.label}
                </p>
              </div>
              <div className="text-right">
                <p className="t-label text-[10px] uppercase tracking-wider text-bone-4">Mise</p>
                <p className="t-display text-xl font-black text-flare mt-0.5">500 F</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Accord ── */}
        <div className="border-t border-ink-4 px-6 py-4">
          <label className="flex cursor-pointer items-start gap-3">
            <span
              onClick={() => setAgreed((v) => !v)}
              className={clsx(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all",
                agreed
                  ? "border-flare bg-flare/20 text-flare"
                  /* ↓ border visible même décoché — bone-4 au lieu de ink-5 */
                  : "border-bone-4/70 bg-ink-3 text-transparent"
              )}
            >
              <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                <polyline points="1,4 4,7 10,1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span
              className="t-body text-sm text-bone-3 select-none"
              onClick={() => setAgreed((v) => !v)}
            >
              J'ai lu les règles et je comprends les conditions
              {isChallenge && " (dont la mise non remboursable en cas de défaite)"}
            </span>
          </label>
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-2.5 px-6 pb-6">
          <Block tone="ghost" className="flex-1" onClick={onCancel}>
            Annuler
          </Block>
          <Block
            className="flex-1"
            disabled={!agreed}
            onClick={agreed ? () => onConfirm(level) : undefined}
          >
            {isChallenge ? "Jouer · 500 F" : "Jouer"}
          </Block>
        </div>
      </div>
    </div>
  );
}

function RuleIcon({ type }) {
  const s = { width: 11, height: 11, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" };
  if (type === "check")  return <svg {...s}><polyline points="20 6 9 17 4 12" /></svg>;
  if (type === "alert")  return <svg {...s}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
  if (type === "coin")   return <svg {...s}><circle cx="12" cy="12" r="9" /><path d="M14.8 9A2 2 0 0 0 12 7.5a2 2 0 0 0 0 4c1.1 0 2 .9 2 2a2 2 0 0 1-2 2A2 2 0 0 1 9.2 14" /></svg>;
  if (type === "trophy") return <svg {...s}><path d="M6 9H4.5a2.5 2.5 0 0 0 0 5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 1 0 5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>;
  if (type === "zap")    return <svg {...s}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
  return <svg {...s}><circle cx="12" cy="12" r="10" /></svg>;
}

export default function CategoryDetail() {
  const { categoryId } = useParams();
  const nav = useNavigate();
  const { balanceCoins } = useAuth();
  const [cat, setCat] = useState(null);
  const [pendingMode, setPendingMode] = useState(null); // null | { mode }

  useEffect(() => {
    api.getCategories().then((r) => {
      setCat(r.categories.find((c) => c.id === categoryId) ?? r.categories[0]);
    });
    // Connexion au WebSocket duel — nécessaire pour botDuel() qui envoie
    // un message WS et reçoit "matched" via GlobalDuelWatcher → /duel/play.
    duel.connect();
  }, [categoryId]);

  /**
   * Lance un vrai duel contre l'ordinateur via le moteur WebSocket.
   * GlobalDuelWatcher (monté globalement dans ProtectedRoute) écoute
   * "matched" et navigue vers /duel/play dès que le bot répond.
   * stakeCoins = 0 pour LIBRE (entraînement sans argent).
   */
  const launch = (level) => {
    if (!pendingMode || !cat) return;
    setPendingMode(null);
    const stakeCoins = pendingMode.mode === "CHALLENGE" ? 500 : 0;
    duel.botDuel(cat.id, stakeCoins, level);
  };

  if (!cat) return <Loader full />;

  const canChallenge = balanceCoins >= 500;

  return (
    <div className="mx-auto w-full max-w-[720px] px-5 pt-8 pb-16 sm:px-8 sm:pt-12">
      <button onClick={() => nav("/categories")} className="t-label text-bone-4 hover:text-flare">
        ← catégories
      </button>

      <h1 className="t-display mt-5 text-[clamp(3rem,11vw,6rem)]">{cat.name}</h1>

      <div className="rule mt-6 grid grid-cols-2 gap-y-6 pt-6">
        <Stat label="format" value="10 manches" size="sm" />
        <Stat label="difficulté" value={cat.difficulty} size="sm" />
      </div>

      <div className="mt-10 flex flex-col gap-2.5">
        {/* Solo entraînement (sans mise) */}
        <button
          onClick={() => setPendingMode({ mode: "LIBRE" })}
          className="press group flex items-center justify-between bg-ink-2 px-5 py-5 text-left hover:bg-ink-3 rounded-(--radius-card)"
        >
          <div>
            <span className="t-title block text-[17px]">Solo entraînement</span>
            <span className="t-body block text-sm text-bone-4">Sans mise · contre l'IA · aucun gain</span>
          </div>
          <span className="t-label text-bone-4 group-hover:text-live">jouer ›</span>
        </button>

        {/* Solo challenge (avec mise) */}
        <button
          onClick={() => {
            if (!canChallenge) return;
            setPendingMode({ mode: "CHALLENGE" });
          }}
          disabled={!canChallenge}
          className={clsx(
            "press group flex items-center justify-between px-5 py-5 text-left rounded-(--radius-card)",
            canChallenge
              ? "bg-ink-2 hover:bg-ink-3"
              : "cursor-not-allowed bg-ink-2/50 opacity-50"
          )}
        >
          <div>
            <span className="t-title block text-[17px]">Solo challenge</span>
            <span className="t-body block text-sm text-bone-4">
              500 F · contre l'IA · gains selon la difficulté
            </span>
          </div>
          <span className={clsx("t-label", canChallenge ? "text-bone-4 group-hover:text-flare" : "text-bone-4")}>
            {canChallenge ? "jouer ›" : "solde insuffisant"}
          </span>
        </button>
      </div>

      <p className="t-body mt-8 text-sm text-bone-4">Les questions sont variées et ne sont pas répétées pendant 7 jours.</p>

      {/* Popup règles + choix niveau */}
      {pendingMode && (
        <SoloDuelRulesModal
          mode={pendingMode.mode}
          cat={cat}
          onConfirm={launch}
          onCancel={() => setPendingMode(null)}
        />
      )}
    </div>
  );
}
