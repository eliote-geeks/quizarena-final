import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Block, ConfirmModal, Label, Loader } from "../ui";
import { NavIcon } from "../ui/icons";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import * as duel from "../lib/duelSocket";
import {
  WarriorChar, HeraldChar, RobotChar, TrophyChar,
  EasyChar, MedChar, HardChar,
  charForCategory, AnimeCard, AnimeModeCard,
} from "../ui/anime";

const STAKES = [100, 500, 1000, 2500, 5000];

const DIFFICULTIES = [
  { id: "facile",    label: "Facile",    hint: "pour s'échauffer · ×1,20",             multiplier: 1.2, Char: EasyChar, accent: "#16A34A" },
  { id: "moyen",     label: "Moyen",     hint: "un vrai défi · ×1,50",                 multiplier: 1.5, Char: MedChar,  accent: "#2563EB" },
  { id: "difficile", label: "Difficile", hint: "presque sans faute · ×2,00",           multiplier: 2,   Char: HardChar, accent: "#F97316" },
];

const CANCEL_REASONS = {
  solde_insuffisant:       "L'adversaire trouvé n'avait plus le solde suffisant, mise remboursée.",
  adversaire_deconnecte:   "L'adversaire s'est déconnecté avant le début, mise remboursée.",
  adversaire_pas_pret:     "L'adversaire n'a pas confirmé sa présence à temps, mise remboursée.",
  erreur_serveur:          "Erreur serveur inattendue — mise remboursée automatiquement.",
};

export default function DuelSetup() {
  const nav = useNavigate();
  const location = useLocation();
  const { balanceCoins } = useAuth();
  const directTarget = location.state?.challengeUsername ?? null;
  const [mode, setMode] = useState(() => location.state?.duelMode ?? (directTarget ? "online" : null));
  const [difficulty, setDifficulty] = useState("moyen");
  const [categories, setCategories] = useState(null);
  const [stake, setStake] = useState(100);
  const [cat, setCat] = useState(() => location.state?.categoryId ?? null);
  const [searching, setSearching] = useState(false);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(() =>
    location.state?.cancelledReason
      ? (CANCEL_REASONS[location.state.cancelledReason] ?? "Duel annulé, mise remboursée.")
      : ""
  );

  useEffect(() => {
    api.getCategories().then((r) => {
      setCategories(r.categories);
      setCat((c) => c ?? r.categories[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    duel.connect();
    const offQueued    = duel.on("queued",       () => setError(""));
    const offTimeout   = duel.on("queue_timeout", () => {
      setSearching(false);
      setError("Aucun adversaire trouvé pour cette mise, réessaie — ou joue contre l'ordinateur en attendant.");
    });
    const offCancelled = duel.on("duel_cancelled", (msg) => {
      setSearching(false);
      setError(CANCEL_REASONS[msg.reason] ?? "Duel annulé, mise remboursée.");
    });
    const offError     = duel.on("error", (msg) => {
      setSearching(false);
      setError(msg.message || "Erreur de connexion");
    });
    const offInviteCreated = duel.on("invite_created", (msg) => {
      if (msg.isPublic) {
        // Duel ouvert publié → marquer comme actif (pour le cleanup) + animation
        openDuelActiveRef.current = true;
        setCelebrating(true);
        setTimeout(() => {
          setCelebrating(false);
          setInvite({ code: msg.code, expiresInMs: msg.expiresInMs, isPublic: true });
        }, 1600);
      } else {
        setInvite({ code: msg.code, expiresInMs: msg.expiresInMs, isPublic: false });
      }
    });
    const offInviteExpired = duel.on("invite_expired",  () => {
      openDuelActiveRef.current = false;
      setInvite(null);
      setError("Personne n'a rejoint ton invitation à temps, réessaie.");
    });
    const offInviteDeclined = duel.on("invite_declined", (msg) => {
      setInvite(null);
      setError(`${msg.username ?? "Le joueur"} a refusé ton défi.`);
    });
    return () => {
      offQueued(); offTimeout(); offCancelled(); offError(); offInviteCreated(); offInviteExpired(); offInviteDeclined();
      // Annuler le duel ouvert si le composant se démonte alors qu'il est
      // encore publié — le joueur a navigué sans cliquer "Annuler".
      if (openDuelActiveRef.current) {
        duel.cancelInvite();
        openDuelActiveRef.current = false;
      }
    };
  }, [nav]);

  const [confirming, setConfirming] = useState(false);
  const [confirmingOpen, setConfirmingOpen] = useState(false); // confirmation avant publication duel ouvert
  const [celebrating, setCelebrating] = useState(false); // animation post-publication

  // Ref pour suivre si un duel ouvert est actif (publish envoyé au serveur
  // mais pas encore annulé) — même pendant la célébration où `invite` est null.
  // Permet d'annuler proprement si le joueur navigue sans cliquer "Annuler".
  const openDuelActiveRef = useRef(false);

  const start = () => {
    if (mode === "bot" && !cat) return;
    if (stake > balanceCoins) { setError("Solde insuffisant pour cette mise."); return; }
    setError("");
    setConfirming(true);
  };

  const confirmStart = () => {
    setConfirming(false);
    setSearching(true);
    if (mode === "bot") duel.botDuel(cat, stake, difficulty);
    else duel.queue(stake);
  };

  const cancel = () => { duel.cancelQueue(); setSearching(false); };

  const inviteFriend = () => {
    if (stake > balanceCoins) { setError("Solde insuffisant pour cette mise."); return; }
    setError("");
    duel.createInvite(stake, false, directTarget);
  };

  const publishOpenDuel = () => {
    if (stake > balanceCoins) { setError("Solde insuffisant pour cette mise."); return; }
    setError("");
    setConfirmingOpen(true); // affiche la confirmation avant d'envoyer
  };

  const confirmPublishOpen = () => {
    setConfirmingOpen(false);
    duel.createInvite(stake, true);
  };

  const cancelInvite = () => {
    duel.cancelInvite();
    openDuelActiveRef.current = false;
    setInvite(null);
  };

  if (celebrating) return <DuelPublishedCelebration stake={stake} />;

  if (invite) {
    return invite.isPublic
      ? <OpenWaitingPanel stake={stake} onCancel={cancelInvite}/>
      : <InvitePanel code={invite.code} stake={stake} targetUsername={invite.targetUsername} onCancel={cancelInvite}/>;
  }
  if (searching) return <Searching stake={stake} bot={mode === "bot"} onCancel={cancel}/>;
  if (!mode) return <ModeChoice onPick={setMode} onTournament={() => nav("/tournaments")}/>;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col px-5 pt-8 pb-16 sm:px-8 sm:pt-12">
      <button onClick={() => setMode(null)} className="t-label text-bone-4 hover:text-flare">
        ← changer de mode
      </button>
      <Label tone="flare" className="mt-4">
        {mode === "bot" ? "contre l'ordinateur" : mode === "open" ? "duel ouvert" : "duel en ligne"}
      </Label>
      <h1 className="t-display mt-2 text-2xl sm:text-3xl">Choisir le combat</h1>
      {directTarget && <div className="mt-5 flex items-center gap-3 rounded-xl border border-flare/25 bg-flare/8 p-3"><img src={api.avatarUrl(directTarget)} alt="" className="h-10 w-10 rounded-full object-cover" /><div><Label tone="flare">défi direct</Label><div className="t-title mt-1 text-sm">Adversaire : {directTarget}</div></div></div>}

      {/* ── Difficulté (mode bot) ── */}
      {mode === "bot" && (
        <div className="mt-6">
          <Label className="mb-2">niveau</Label>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map((d) => (
              <AnimeCard
                key={d.id}
                Char={d.Char}
                label={d.label}
                sublabel={d.hint}
                selected={difficulty === d.id}
                accentColor={d.accent}
                onClick={() => setDifficulty(d.id)}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-flare/25 bg-flare/8 px-4 py-3"><div><div className="t-label text-bone-4">gain versé si victoire</div><div className="t-display mt-1 text-2xl text-flare">{Math.round(stake * (DIFFICULTIES.find((item) => item.id === difficulty)?.multiplier ?? 1.2)).toLocaleString("fr-FR")} F</div></div><div className="text-right text-xs text-bone-4"><strong className="block text-bone">Mise {stake.toLocaleString("fr-FR")} F</strong>Plus le niveau est difficile,<br/>plus le multiplicateur augmente.</div></div>
        </div>
      )}

      {/* ── Catégories (mode bot) ── */}
      {mode === "bot" && (
        <div className="mt-5">
          <Label className="mb-2">catégorie</Label>
          {categories === null && (
            <div className="flex justify-center py-4"><Loader/></div>
          )}
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {(categories ?? []).map((c) => {
              const Char = charForCategory(c.id);
              return (
                <AnimeCard
                  key={c.id}
                  Char={Char}
                  label={c.name}
                  selected={cat === c.id}
                  accentColor="#F59E0B"
                  onClick={() => setCat(c.id)}
                  className="text-[11px]"
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Mise ── */}
      <div className="mt-5">
        <Label className="mb-2">mise</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {STAKES.map((s) => (
            <button
              key={s}
              onClick={() => setStake(s)}
              className={clsx(
                "t-display press py-2.5 text-[15px]",
                stake === s ? "bg-flare text-bone" : "bg-ink-2 text-bone-2 hover:bg-ink-3"
              )}
            >
              {s.toLocaleString("fr-FR")}
            </button>
          ))}
        </div>
        <p className="t-body mt-3 text-sm text-bone-4">
          {mode === "bot"
            ? `Gain brut si victoire : ${Math.round(stake * ({ facile: 1.2, moyen: 1.5, difficile: 2 }[difficulty] ?? 1.2)).toLocaleString("fr-FR")} F (${difficulty === "facile" ? "×1,20" : difficulty === "moyen" ? "×1,50" : "×2,00"}). Égalité = 95% remboursé, défaite = mise perdue.`
            : mode === "open"
              ? "Visible sur la page « duels ouverts » et sur l'accueil — n'importe qui peut le rejoindre. Débité seulement quand quelqu'un rejoint. À score égal, le plus rapide gagne tout."
              : "Le vainqueur emporte 90% des deux mises · à score égal, le plus rapide à répondre gagne tout. Questions mélangées sur tout le thème, pas de catégorie à choisir."}
        </p>
      </div>

      {error && <p className="t-body mt-6 text-sm text-flare">{error}</p>}

      <div className="mt-auto flex flex-col gap-2 pt-8">
        {mode === "open" ? (
          <Block size="md" full icon={<NavIcon type="megaphone" className="h-4 w-4"/>} onClick={publishOpenDuel}>
            Publier le duel ouvert · {stake.toLocaleString("fr-FR")} F
          </Block>
        ) : (
          <>
            <Block
              size="md" full
              icon={<NavIcon type={mode === "bot" ? "robot" : "swords"} className="h-4 w-4"/>}
              onClick={start}
              disabled={mode === "bot" && !cat}
            >
              {mode === "bot" ? "Défier l'ordinateur" : "Trouver un adversaire"} · {stake.toLocaleString("fr-FR")} F
            </Block>
            {mode === "online" && (
              <Block tone="outline" size="md" full icon={<NavIcon type="link" className="h-4 w-4"/>} onClick={inviteFriend}>
                {directTarget ? `Envoyer le défi à ${directTarget}` : "Inviter un ami par lien"}
              </Block>
            )}
          </>
        )}
      </div>

      {/* Confirmation duel en ligne / bot */}
      <ConfirmModal
        open={confirming}
        title={`Miser ${stake.toLocaleString("fr-FR")} F ?`}
        message={
          mode === "bot"
            ? `Débité immédiatement. Victoire = ${Math.round(stake * ({ facile: 1.2, moyen: 1.5, difficile: 2 }[difficulty] ?? 1.2)).toLocaleString("fr-FR")} F versés selon le niveau, égalité = 95% remboursé, défaite = mise perdue.`
            : "Débité dès qu'un adversaire est trouvé. Vainqueur emporte 90% des deux mises — à score égal, le plus rapide gagne tout."
        }
        confirmLabel="Confirmer la mise"
        onConfirm={confirmStart}
        onCancel={() => setConfirming(false)}
      />

      {/* Confirmation duel ouvert — avant publication */}
      <ConfirmModal
        open={confirmingOpen}
        title={`Publier pour ${stake.toLocaleString("fr-FR")} F ?`}
        message={`Ton duel sera visible publiquement. La mise de ${stake.toLocaleString("fr-FR")} F ne sera débitée que quand quelqu'un le rejoint — tu peux annuler à tout moment avant ça.`}
        confirmLabel={`Publier · ${stake.toLocaleString("fr-FR")} F`}
        onConfirm={confirmPublishOpen}
        onCancel={() => setConfirmingOpen(false)}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Choix du mode — 4 cartes anime en grille 2×2
   ────────────────────────────────────────────────────────────────── */
function ModeChoice({ onPick, onTournament }) {
  const nav = useNavigate();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[680px] flex-col px-5 pt-8 pb-12 sm:px-8 sm:pt-10">
      <Label tone="flare">duel 1v1</Label>
      <h1 className="t-display mt-2 text-2xl sm:text-3xl">Comment jouer ?</h1>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <AnimeModeCard
          Char={WarriorChar}
          label="En ligne"
          sublabel="Contre un vrai joueur"
          accent="#DC2626"
          onClick={() => onPick("online")}
        />
        <AnimeModeCard
          Char={HeraldChar}
          label="Duel ouvert"
          sublabel="Visible par tout le monde"
          accent="#D97706"
          onClick={() => onPick("open")}
        />
        <AnimeModeCard
          Char={RobotChar}
          label="Ordinateur"
          sublabel="Facile, moyen ou difficile"
          accent="#2563EB"
          onClick={() => onPick("bot")}
        />
        <AnimeModeCard
          Char={TrophyChar}
          label="Tournoi"
          sublabel="Bracket 4–16 joueurs"
          accent="#7C3AED"
          onClick={onTournament}
        />
      </div>

      <button onClick={() => nav("/duels-ouverts")} className="t-label mt-6 text-bone-4 hover:text-flare">
        voir les duels ouverts en attente ›
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Animation de célébration — affiché 1.6 s après "Publier le duel".
   Deux épées qui s'entrechoquent (CSS clash-*, §app.css) + texte de
   confirmation animé. Jamais de bouton : la durée est courte et fixe,
   ça enchaîne automatiquement sur OpenWaitingPanel.
   ────────────────────────────────────────────────────────────────── */
function DuelPublishedCelebration({ stake }) {
  const fmtStake = stake.toLocaleString("fr-FR");
  const blade = (
    <>
      <rect x="11.1" y="2"    width="1.8" height="12.5"/>
      <polygon points="12,1 13.5,4 10.5,4"/>
      <rect x="7.8"  y="14.5" width="8.4" height="1.7" rx="0.5"/>
      <rect x="11.1" y="16.2" width="1.8" height="3.6"/>
      <rect x="9.6"  y="19.6" width="4.8" height="1.8" rx="0.9"/>
    </>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9990,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "rgb(4 4 10)",
      animation: "clash-overlay 1.6s ease-in-out forwards",
    }}>
      {/* Scène d'impact */}
      <div style={{ position: "relative", width: 180, height: 180, marginBottom: 36 }}>
        {/* Lame gauche */}
        <svg viewBox="0 0 24 24" fill="currentColor" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          color: "var(--color-flare)",
          animation: "clash-sword-l 0.7s cubic-bezier(.22,.68,0,1.2) forwards",
          filter: "drop-shadow(0 0 12px color-mix(in srgb,var(--color-flare) 80%,transparent))",
        }}>{blade}</svg>
        {/* Lame droite */}
        <svg viewBox="0 0 24 24" fill="currentColor" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          color: "rgb(220 210 190)",
          animation: "clash-sword-r 0.7s cubic-bezier(.22,.68,0,1.2) forwards",
          filter: "drop-shadow(0 0 8px rgba(230,210,150,.5))",
        }}>{blade}</svg>
        {/* Flash */}
        <div style={{
          position: "absolute", inset: "-45%",
          borderRadius: "50%",
          background: "radial-gradient(circle, #fff9e0 0%, #f2a93b 25%, #e07000 52%, transparent 72%)",
          animation: "clash-spark 0.7s ease-out forwards",
        }}/>
        {/* Rayons */}
        <svg viewBox="-1 -1 2 2" style={{
          position: "absolute", inset: "-85%",
          width: "270%", height: "270%",
          animation: "clash-ray 0.7s ease-out forwards",
          overflow: "visible",
        }}>
          {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg) => (
            <line key={deg} x1="0" y1="0"
              x2={0.55 * Math.cos(deg * Math.PI / 180)}
              y2={0.55 * Math.sin(deg * Math.PI / 180)}
              stroke={deg % 60 === 0 ? "#fff8d6" : "rgba(242,169,59,.65)"}
              strokeWidth={deg % 60 === 0 ? "0.055" : "0.038"}
              strokeLinecap="round"
            />
          ))}
        </svg>
      </div>

      {/* Texte de confirmation */}
      <div className="anim-rise text-center px-6">
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.22em",
          textTransform: "uppercase", color: "var(--color-flare)",
          marginBottom: 10, opacity: 0.9,
        }}>Duel publié !</p>
        <h2 style={{
          fontFamily: "var(--font-display, 'Unbounded', system-ui, sans-serif)",
          fontSize: "clamp(1.6rem,6vw,2.4rem)",
          fontWeight: 900,
          color: "var(--color-bone)",
          margin: "0 0 12px",
          lineHeight: 1.15,
        }}>
          Mise {fmtStake} F<br/>
          <span style={{ color: "var(--color-flare)" }}>en attente…</span>
        </h2>
        <p style={{ fontSize: 13, color: "var(--color-bone-3)", maxWidth: 280, margin: "0 auto" }}>
          Tous les joueurs connectés viennent d'être notifiés.
          Tu peux naviguer librement — on te préviendra dès qu'un adversaire rejoint.
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Panneaux d'attente / invitation
   ────────────────────────────────────────────────────────────────── */
function OpenWaitingPanel({ stake, onCancel }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col items-center justify-center px-5 text-center">
      <Label tone="flare" className="anim-rise mb-4">mise {stake.toLocaleString("fr-FR")} F · duel ouvert</Label>
      <h1 className="anim-rise-2 t-display text-[clamp(2rem,8vw,3.2rem)]">
        Visible par<br/>tout le monde
      </h1>
      <p className="t-body anim-rise-3 mt-5 max-w-xs text-sm text-bone-4">
        Publié sur la page « duels ouverts » et l'accueil. Tu peux naviguer librement — dès que quelqu'un rejoint, tu es renvoyé directement dans la partie, avec un signal sonore.
      </p>
      <button
        onClick={() => setConfirmCancel(true)}
        className="t-label anim-rise-3 mt-8 text-bone-4 hover:text-flare"
      >
        annuler la publication
      </button>

      {/* Confirmation avant d'annuler — on vérifie que c'est intentionnel */}
      <ConfirmModal
        open={confirmCancel}
        tone="danger"
        title="Retirer ce duel ?"
        message={`Ton duel ouvert (${stake.toLocaleString("fr-FR")} F) sera retiré de la liste publique. Tu pourras en créer un nouveau à tout moment.`}
        confirmLabel="Oui, retirer le duel"
        cancelLabel="Garder publié"
        onConfirm={() => { setConfirmCancel(false); onCancel(); }}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}

function InvitePanel({ code, stake, targetUsername, onCancel }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/duel/join/${code}`;
  const shareText = `Défie-moi sur QuizArena · mise ${stake.toLocaleString("fr-FR")} F — ${link}`;

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ text: shareText, url: link }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col items-center justify-center px-5 text-center">
      <Label tone="flare" className="anim-rise mb-4">mise {stake.toLocaleString("fr-FR")} F · code {code}</Label>
      <h1 className="anim-rise-2 t-display text-2xl sm:text-3xl">{targetUsername ? `Défi envoyé à ${targetUsername}` : "Envoie ce lien à ton adversaire"}</h1>
      {targetUsername && <p className="t-body mt-4 text-sm text-bone-4">Une invitation spéciale vient d’apparaître sur son écran. Le duel démarre dès qu’il accepte.</p>}
      {!targetUsername && <>
      <div className="anim-rise-3 mt-5 w-full break-all bg-ink-2 px-4 py-3 text-left">
        <span className="t-body text-sm text-bone-3">{link}</span>
      </div>
      <div className="anim-rise-3 mt-4 flex w-full flex-col gap-2">
        <Block size="md" full onClick={share}>
          {copied ? "Lien copié ✓" : navigator.share ? "Partager le lien" : "Copier le lien"}
        </Block>
      </div>
      </>}
      <button onClick={onCancel} className="t-label mt-4 text-bone-4 hover:text-flare">annuler l'invitation</button>
      <p className="t-body mt-8 max-w-xs text-xs text-bone-4">
        {targetUsername ? "Il peut accepter ou refuser directement. L’invitation expire après 5 minutes." : "Dès que ton ami ouvre le lien et se connecte, le duel démarre automatiquement — l'invitation expire après 5 minutes."}
      </p>
    </div>
  );
}

function Searching({ stake, bot, onCancel }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <Label tone="flare" className="anim-rise mb-4">mise {stake.toLocaleString("fr-FR")} F</Label>
      <h1 className="anim-rise-2 t-display text-[clamp(2.2rem,9vw,4rem)]">
        {bot ? "Préparation du duel…" : <>Recherche d'un<br/>adversaire…</>}
      </h1>
      <button onClick={onCancel} className="t-label anim-rise-3 mt-8 text-bone-4 hover:text-flare">annuler</button>
    </div>
  );
}
