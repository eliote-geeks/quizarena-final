import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import * as api from "../lib/api";
import AnimeAvatar from "../components/AnimeAvatar";
import { SFX } from "../lib/soundEngine";
import {
  Bot, ChevronLeft, ChevronRight, Eye, Flame, Radio,
  Swords, Trophy, Users, Zap, TrendingUp, Clock, X, Ticket, Check,
} from "lucide-react";

/* ─── Variants Framer Motion ─── */
const fadeUp   = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } };
const stagger  = { show: { transition: { staggerChildren: 0.07 } } };

/* ════════════════════════════════════════
   BANNIÈRES PUBLICITAIRES ROTATIVES
   ════════════════════════════════════════ */
const BANNER_ADS = [
  {
    id: "mtn-momo",
    bg: "linear-gradient(105deg,#1a1200 0%,#2d1f00 55%,#1a1200 100%)",
    accent: "#FFCC00",
    logo: "MTN",
    logoStyle: { background: "#FFCC00", color: "#000" },
    tag: "Partenaire officiel",
    headline: "Dépôt instantané via Mobile Money",
    sub: "MTN MoMo accepté · Minimum 500 F · Crédité en moins de 30 secondes · Aucun frais caché.",
    cta: "Déposer maintenant",
    ctaBg: "#FFCC00",
    ctaColor: "#000",
    image: "/tournaments/africa.webp",
  },
  {
    id: "orange-money",
    bg: "linear-gradient(105deg,#1a0a00 0%,#2e1200 55%,#1a0a00 100%)",
    accent: "#FF7900",
    logo: "Orange",
    logoStyle: { background: "#FF7900", color: "#fff" },
    tag: "Retrait rapide",
    headline: "Retirez vos gains en Orange Money",
    sub: "Virement vers votre compte Orange Money · Traité sous 2 min · Disponible 24h/24.",
    cta: "Retirer mes gains",
    ctaBg: "#FF7900",
    ctaColor: "#fff",
    image: "/tournaments/versus.webp",
  },
  {
    id: "vip",
    bg: "linear-gradient(105deg,#0a0600 0%,#1c1100 55%,#0a0600 100%)",
    accent: "#E5A800",
    logo: "VIP",
    logoStyle: { background: "linear-gradient(90deg,#E5A800,#c98f00)", color: "#000" },
    tag: "Statut VIP",
    headline: "30 victoires = création de tournois",
    sub: "Atteins 30 victoires en duel sur 30 jours · Crée ton bracket · Fixe la mise · Touche la cagnotte.",
    cta: "Voir mon avancement",
    ctaBg: "#E5A800",
    ctaColor: "#000",
    image: "/tournaments/championship.webp",
  },
  {
    id: "tournoi-info",
    bg: "linear-gradient(105deg,#060010 0%,#0d0020 55%,#060010 100%)",
    accent: "#a855f7",
    logo: "TOP",
    logoStyle: { background: "rgba(168,85,247,.25)", color: "#a855f7" },
    tag: "Comment ça marche",
    headline: "90 % du pot redistribué aux joueurs",
    sub: "Exemple 8 joueurs × 500 F = 4 000 F · 1er : 2 160 F · 2e : 900 F · 3e/4e : 270 F chacun.",
    cta: "Rejoindre un tournoi",
    ctaBg: "#a855f7",
    ctaColor: "#fff",
    image: "/tournaments/championship.webp",
  },
  {
    id: "anti-triche",
    image: "/questions/microscope.webp",
    imageAlt: "Microscope de laboratoire",
    bg: "linear-gradient(105deg,#001010 0%,#001f1f 55%,#001010 100%)",
    accent: "#00b377",
    logo: "SEC",
    logoStyle: { background: "rgba(0,179,119,.15)", color: "#00b377" },
    tag: "Plateforme sécurisée",
    headline: "Anti-triche actif sur chaque partie",
    sub: "Détection automatique · Gains en quarantaine si suspicion · Déblocage admin sous 24h.",
    cta: "En savoir plus",
    ctaBg: "#00b377",
    ctaColor: "#000",
    image: "/tournaments/africa.webp",
  },
];

const SS_BANNER_KEY  = "qa_ad_banner_hidden";
/* ─── Tips ticker lobby ─── */
const TIPS = [
  "Répondre en moins de 3 s donne un bonus de vitesse",
  "Les tournois redistribuent 90 % du pot — 1er, 2e et demi-finalistes gagnent",
  "Catégorie Cameroun : Football, Musique, Histoire, Société, Gastronomie",
  "À score égal, personne ne perd sa mise — c'est match nul",
  "Le classement est basé sur tes vrais gains validés, pas les points",
  "Un streak de bonnes réponses multiplie tes points jusqu'à ×2.5",
  "Dépôt et retrait via MTN MoMo ou Orange Money — crédité en moins de 2 min",
  "L'ordinateur Expert répond en 1 s — bats-le pour tester tes limites",
  "30 victoires en duel sur 30 jours = statut VIP automatique",
  "Les gains en quarantaine sont débloqués par un admin sous 24h",
];

/* ════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ════════════════════════════════════════════════════════ */
export default function MainLobby() {
  const navigate = useNavigate();
  const { coins, currency } = useApp();
  const [top, setTop]             = useState([]);
  const [openDuels, setOpenDuels] = useState([]);
  const [liveDuels, setLiveDuels] = useState([]);
  const [online, setOnline]       = useState([]);
  const [error, setError]         = useState("");
  const [tickerIdx, setTickerIdx] = useState(0);
  const [invites, setInvites] = useState([]);

  useEffect(() => {
    let alive = true;
    const loadStable = async () => {
      try {
        const [ranking] = await Promise.all([api.getLeaderboard()]);
        if (!alive) return;
        setTop((ranking.leaderboard || []).slice(0, 3));
      } catch (e) {
        if (alive) setError(e.message || "Les données du lobby sont indisponibles");
      }
    };
    const loadRealtime = async () => {
      const results = await Promise.allSettled([
        api.getOpenDuels(), api.getLiveDuels(), api.getOnlinePlayers(),
      ]);
      if (!alive) return;
      if (results[0].status === "fulfilled") {
        const d = results[0].value;
        setOpenDuels(d.mine ? [{ ...d.mine, mine: true }, ...(d.open || [])] : d.open || []);
      }
      if (results[1].status === "fulfilled") setLiveDuels(results[1].value.matches || []);
      if (results[2].status === "fulfilled") setOnline(results[2].value.online || []);
    };
    const loadInvites = () =>
      api.getMyTournamentInvites()
        .then((d) => { if (alive) setInvites(d.invites || []); })
        .catch(() => {});
    loadStable(); loadRealtime(); loadInvites();
    const t = setInterval(loadRealtime, 5000);
    const ti = setInterval(loadInvites, 15000);
    return () => { alive = false; clearInterval(t); clearInterval(ti); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTickerIdx((i) => (i + 1) % TIPS.length), 3800);
    return () => clearInterval(t);
  }, []);

  const respondInvite = async (inviteId, accept) => {
    // Retrait optimiste : la carte disparaît tout de suite, et le
    // rechargement qui suit fait foi (si le serveur a refusé, l'invitation
    // réapparaît avec son message d'erreur).
    setInvites((cur) => cur.filter((i) => i.id !== inviteId));
    try {
      if (accept) {
        const t = await api.acceptTournamentInvite(inviteId);
        SFX.confirm();
        navigate(`/tournaments/${t.id}`);
      } else {
        await api.declineTournamentInvite(inviteId);
        SFX.cancel();
      }
    } catch (e) {
      SFX.error();
      setError(e.message || "Impossible de répondre à cette invitation");
      api.getMyTournamentInvites().then((d) => setInvites(d.invites || [])).catch(() => {});
    }
  };

  const activity = useMemo(() => {
    if (liveDuels.length) return `${liveDuels.length} duel${liveDuels.length > 1 ? "s" : ""} en direct`;
    if (openDuels.length) return `${openDuels.length} défi${openDuels.length > 1 ? "s" : ""} en attente`;
    return "L'arène est prête";
  }, [liveDuels.length, openDuels.length]);

  return (
    <>
      {/* Popup flottant */}
      <motion.div
        className="min-h-full px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-6"
        initial="hidden" animate="show" variants={stagger}
      >
        {/* ── Invitations à un tournoi ── */}
        <AnimatePresence>
          {invites.map((inv) => (
            <motion.section
              key={inv.id}
              initial={{ opacity: 0, y: -12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -12, height: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="overflow-hidden rounded-3xl p-5 sm:p-6"
              style={{ background: "var(--surface)", border: "1px solid var(--accent)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
                    <Trophy className="h-3.5 w-3.5" />Invitation à un tournoi
                  </p>
                  <h3 className="mt-2 truncate font-display text-xl font-extrabold">{inv.tournamentName}</h3>
                  <p className="mt-1 text-sm" style={{ color: "var(--text-sub)" }}>
                    <strong style={{ color: "var(--text)" }}>{inv.invitedBy}</strong> t'invite ·
                    {" "}{inv.entryCount}/{inv.capacity} inscrits
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold"
                    style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
                    <Ticket className="h-4 w-4" />
                    {formatMoney(inv.stakeCoins, currency)} débités à l'acceptation
                  </p>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <button
                    onClick={() => respondInvite(inv.id, false)}
                    className="btn-secondary flex-1 rounded-xl px-5 py-3 text-sm font-bold sm:flex-none"
                  >
                    Refuser
                  </button>
                  <button
                    onClick={() => respondInvite(inv.id, true)}
                    disabled={!inv.affordable}
                    className="btn-primary inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-40 sm:flex-none"
                    title={inv.affordable ? "Accepter et payer le droit d'entrée" : "Solde insuffisant"}
                  >
                    <Check className="h-4 w-4" />
                    {inv.affordable ? "Accepter" : "Solde insuffisant"}
                  </button>
                </div>
              </div>
            </motion.section>
          ))}
        </AnimatePresence>

        {/* ── Hero ── */}
        <motion.header variants={fadeUp}
          className="relative isolate overflow-hidden rounded-3xl px-5 py-10 text-center sm:px-8 sm:py-16"
          style={{ background: "linear-gradient(160deg,#0f0d08 0%,#15120e 60%,#1a1508 100%)" }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
              style={{ background: "radial-gradient(circle,rgba(229,168,0,0.18) 0%,transparent 70%)" }} />
          </div>

          <ArenaPresence players={online} liveCount={liveDuels.length} />

          <motion.h1 variants={fadeUp}
            className="font-display mx-auto mt-4 max-w-3xl font-extrabold leading-[.92] tracking-tight text-white"
            style={{ fontSize: "clamp(2.2rem,8vw,5rem)" }}
          >
            <span style={{ color: "var(--accent)" }}>Qui est le plus</span>
            <br />intelligent chez vous ?
          </motion.h1>

          <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-sm text-sm font-medium"
            style={{ color: "rgba(255,255,255,0.55)" }}>
            Réponds vite. Défie les tiens. Prends la place de numéro un.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-6 flex flex-wrap justify-center gap-2">
            {[
              { icon: Users, label: `${online.length} en ligne`, color: "var(--success)" },
              { icon: Radio, label: activity, color: liveDuels.length ? "var(--danger)" : "var(--accent)" },
              { icon: Flame, label: "Gains 2× en tournois", color: "#f97316" },
            ].map(({ icon: Icon, label, color }) => (
              <span key={label} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold"
                style={{ borderColor: "rgba(255,255,255,.12)", background: "rgba(0,0,0,.25)", color }}>
                <Icon className="h-3 w-3" />{label}
              </span>
            ))}
          </motion.div>
        </motion.header>

        {/* ── Mode cards ── */}
        <motion.section variants={stagger}
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0"
        >
          <ModeCard image="/tournaments/africa.webp" icon={Bot} title="Solo"
            sub="Entraîne-toi seul" action="Jouer maintenant" onClick={() => navigate("/play/random")} />
          <ModeCard image="/tournaments/versus.webp" icon={Swords} title="Duel 1v1"
            sub="Affronte un adversaire" action="Lancer un duel" featured onClick={() => navigate("/duel")} />
          <ModeCard image="/tournaments/championship.webp" icon={Trophy} title="Tournois"
            sub="Bracket 4–16 joueurs" action="Voir les tournois" onClick={() => navigate("/tournaments")} />
        </motion.section>

        {/* ── Ticker ── */}
        <motion.div variants={fadeUp}
          className="flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
            <Zap className="h-3 w-3" /> Live
          </span>
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p key={tickerIdx}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="truncate text-sm font-medium"
                style={{ color: "var(--text-sub)" }}
              >
                {TIPS[tickerIdx]}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="flex shrink-0 gap-1">
            {TIPS.map((_, i) => (
              <button key={i} onClick={() => setTickerIdx(i)}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: i === tickerIdx ? 20 : 6, background: i === tickerIdx ? "var(--accent)" : "var(--border-md)" }}
              />
            ))}
          </div>
        </motion.div>

        {error && (
          <p className="rounded-xl px-4 py-3 text-sm"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>
        )}

        {/* ── Bannière pub rotative ── */}
        <motion.div variants={fadeUp}>
          <RotatingAdBanner ads={BANNER_ADS} />
        </motion.div>

        {/* ── Duels disponibles ── */}
        <motion.section variants={fadeUp}
          className="overflow-hidden rounded-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <header className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: "1px solid var(--divider)" }}>
            <div className="flex items-center gap-2">
              <Swords className="h-4 w-4" style={{ color: "var(--accent)" }} />
              <h2 className="font-display font-extrabold">Duels disponibles</h2>
              {openDuels.length > 0 && <span className="chip chip-accent">{openDuels.length}</span>}
            </div>
            <button onClick={() => navigate("/duel")} className="btn-ghost text-xs">Voir tout</button>
          </header>
          <div className="p-4">
            {openDuels.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {openDuels.slice(0, 6).map((duel, i) => (
                  <motion.article key={duel.code}
                    initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }} whileHover={{ y: -2 }}
                    className="rounded-2xl p-4"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <PlayerName username={duel.username} />
                      <span className="font-extrabold tabular-nums" style={{ color: "var(--accent)" }}>
                        {formatMoney(duel.stakeCoins, currency)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-sub)" }}>
                      {duel.mine ? "Ton défi est publié" : `Gain potentiel : ${formatMoney(duel.prizeCoins, currency)}`}
                    </p>
                    <button
                      disabled={duel.mine || duel.stakeCoins > coins}
                      onClick={() => navigate(`/duel?invite=${encodeURIComponent(duel.code)}&accept=1`)}
                      className="btn-primary mt-4 w-full rounded-xl py-2.5 text-sm disabled:opacity-40"
                    >
                      {duel.mine ? "En attente…" : duel.stakeCoins > coins ? "Solde insuffisant" : "Rejoindre"}
                    </button>
                  </motion.article>
                ))}
              </div>
            ) : (
              <Empty text="Aucun défi ouvert pour l'instant."
                action={{ label: "Créer le premier", onClick: () => navigate("/duel") }} />
            )}
          </div>
        </motion.section>

        {/* ── Matchs en direct ── */}
        <motion.section variants={fadeUp}
          className="overflow-hidden rounded-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <header className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: "1px solid var(--divider)" }}>
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4" style={{ color: "var(--danger)" }} />
              <h2 className="font-display font-extrabold">En direct</h2>
              {liveDuels.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black"
                  style={{ background: "rgba(239,68,68,0.15)", color: "var(--danger)" }}>
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "var(--danger)" }} />
                  LIVE {liveDuels.length}
                </span>
              )}
            </div>
          </header>
          <div className="p-4">
            {liveDuels.length ? (
              <div className="space-y-2">
                {liveDuels.slice(0, 6).map((match, i) => (
                  <motion.button key={match.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }} whileHover={{ x: 4 }}
                    onClick={() => navigate(`/duel/play?spectate=${match.id}`)}
                    className="flex w-full items-center gap-3 rounded-xl p-3.5 text-left"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full animate-pulse" style={{ background: "var(--danger)" }} />
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <PlayerName username={match.players?.[0]?.username} />
                      <strong className="shrink-0 tabular-nums" style={{ color: "var(--accent)" }}>
                        {match.scoreA}–{match.scoreB}
                      </strong>
                      <PlayerName username={match.players?.[1]?.username} />
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs shrink-0" style={{ color: "var(--text-faint)" }}>
                      <Eye className="h-3.5 w-3.5" />{match.viewerCount}
                    </span>
                  </motion.button>
                ))}
              </div>
            ) : (
              <Empty text="Aucun match en cours." />
            )}
          </div>
        </motion.section>

        {/* ── Meilleurs gains ── */}
        {top.length > 0 && (
          <motion.section variants={fadeUp}
            className="overflow-hidden rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <header className="flex items-center justify-between px-4 py-3.5"
              style={{ borderBottom: "1px solid var(--divider)" }}>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4" style={{ color: "var(--accent)" }} />
                <h2 className="font-display font-extrabold">Meilleurs gains</h2>
              </div>
              <button onClick={() => navigate("/leaderboard")} className="btn-ghost text-xs">Voir tout</button>
            </header>
            <div className="p-4">
              <HorizontalRail>
                {top.map((player, i) => (
                  <motion.button key={player.id}
                    initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.07 }} whileHover={{ y: -3 }}
                    onClick={() => navigate(`/player/${player.username}`)}
                    className="min-w-[200px] rounded-2xl p-4 text-left"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <div className="flex items-start justify-between">
                      <PlayerName username={player.username} />
                      <span className="chip chip-accent">#{player.rank}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" style={{ color: "var(--success)" }} />
                      <span className="text-xs" style={{ color: "var(--text-sub)" }}>Gains validés</span>
                    </div>
                    <div className="mt-1 font-extrabold tabular-nums" style={{ color: "var(--accent)" }}>
                      {formatMoney(player.winningsCoins, currency)}
                    </div>
                  </motion.button>
                ))}
              </HorizontalRail>
            </div>
          </motion.section>
        )}

        {/* ── Joueurs connectés avec stats ── */}
        {online.length > 0 && (
          <motion.section variants={fadeUp}
            className="overflow-hidden rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <header className="flex items-center gap-2 px-4 py-3.5"
              style={{ borderBottom: "1px solid var(--divider)" }}>
              <Users className="h-4 w-4" style={{ color: "var(--success)" }} />
              <h2 className="font-display font-extrabold">Joueurs connectés</h2>
              <span className="chip" style={{ background: "rgba(34,197,94,0.15)", color: "var(--success)" }}>
                {online.length}
              </span>
            </header>
            <div className="p-4">
              <HorizontalRail>
                {online.slice(0, 12).map((player, i) => {
                  // Palmarès de duel réel — bug corrigé le 31/08 (retour
                  // Paul, capture "V 4 D 0 P 0") : "défaites" mélangeait à
                  // tort les stats Solo avec les victoires de Duel, deux
                  // jeux différents. §backend players/routes.ts duelsLost.
                  const wins = player.wins ?? 0;
                  const losses = player.duelsLost ?? 0;
                  const played = player.duelsPlayed ?? wins + losses;
                  const winRate = played > 0 ? Math.round((wins / played) * 100) : null;
                  return (
                    <motion.button key={player.id}
                      initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }} whileHover={{ y: -3 }}
                      onClick={() => navigate(`/player/${player.username}`)}
                      className="min-w-[190px] rounded-2xl p-4 text-left"
                      style={{ background: "var(--surface-2)" }}
                    >
                      {/* Avatar + dot */}
                      <div className="relative w-fit">
                        <AnimeAvatar seed={player.username} alt="" size={44} className="border-2" />
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2"
                          style={{ background: "var(--success)", borderColor: "var(--surface-2)" }} />
                      </div>

                      {/* Nom */}
                      <strong className="mt-3 block truncate text-[13px]">{player.username}</strong>

                      {/* Palmarès duel */}
                      {winRate !== null ? (
                        <div className="mt-2.5">
                          <div className="flex items-baseline justify-between gap-1 text-[11px] font-bold tabular-nums">
                            <span style={{ color: "var(--success)" }}>{wins}V</span>
                            <span className="text-[10px] font-semibold" style={{ color: "var(--text-faint)" }}>{winRate}%</span>
                            <span style={{ color: "var(--danger)" }}>{losses}D</span>
                          </div>
                          <div className="mt-1 h-1 overflow-hidden rounded-full" style={{ background: "var(--danger-soft)" }}>
                            <div className="h-full rounded-full" style={{ width: `${winRate}%`, background: "var(--success)" }} />
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2.5 text-[11px]" style={{ color: "var(--text-faint)" }}>Pas encore de duel</p>
                      )}

                      {/* Gains */}
                      {(player.winningsCoins ?? 0) > 0 && (
                        <p className="mt-2 text-[12px] font-extrabold tabular-nums"
                          style={{ color: "var(--accent)" }}>
                          {formatMoney(player.winningsCoins, currency)}
                        </p>
                      )}

                      <span className="mt-1 inline-flex items-center gap-1 text-[11px]"
                        style={{ color: "var(--success)" }}>
                        <Clock className="h-3 w-3" /> En ligne
                      </span>
                    </motion.button>
                  );
                })}
              </HorizontalRail>
            </div>
          </motion.section>
        )}

        <div className="h-4" />
      </motion.div>
    </>
  );
}

/* ══════════════════════════════════════════════════════
   BANNIÈRE ROTATIVE — style display ad avec image
   ══════════════════════════════════════════════════════ */
function RotatingAdBanner({ ads }) {
  const [idx, setIdx] = useState(0);
  const [hidden, setHidden] = useState(false); // revient à chaque chargement de page
  const DURATION = 7000;

  useEffect(() => {
    if (hidden) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % ads.length), DURATION);
    return () => clearInterval(t);
  }, [hidden, ads.length]);

  const hideForSession = () => {
    setHidden(true);
  };

  if (hidden) return null;

  const ad = ads[idx];

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ background: ad.bg, minHeight: 120 }}>
      {/* Image fond droite */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-2/5 overflow-hidden sm:w-1/3">
        <AnimatePresence mode="wait">
          <motion.img key={ad.id + "-img"}
            src={ad.image} alt=""
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.5 }}
            className="h-full w-full object-cover"
            style={{ maskImage: "linear-gradient(to right, transparent 0%, black 60%)" }}
          />
        </AnimatePresence>
        {/* Voile de fusion */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.3) 100%)" }} />
      </div>

      {/* Étiquettes haut */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
        <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
          style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
          Pub
        </span>
        <span className="rounded px-2 py-0.5 text-[10px] font-black"
          style={{ ...ad.logoStyle, borderRadius: 4, fontSize: 11, padding: "1px 8px" }}>
          {ad.logo}
        </span>
        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{ad.tag}</span>
      </div>

      {/* Menu masquer */}
      <div className="absolute top-2 right-3 z-10 flex items-center gap-1">
        <button onClick={hideForSession}
          className="rounded px-2 py-1 text-[9px] font-semibold transition-colors hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.35)" }}>
          Ne plus afficher
        </button>
        <button onClick={hideForSession}
          className="rounded-full p-1 transition-colors hover:bg-white/10">
          <X className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.35)" }} />
        </button>
      </div>

      {/* Contenu */}
      <AnimatePresence mode="wait">
        <motion.div key={ad.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative z-10 flex flex-col gap-2 px-4 pb-5 pt-11 sm:flex-row sm:items-center sm:gap-6"
          style={{ maxWidth: "62%" }}
        >
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-extrabold leading-snug text-white sm:text-[18px]">
              {ad.headline}
            </p>
            <p className="mt-1 text-[12px] leading-snug" style={{ color: "rgba(255,255,255,0.5)" }}>
              {ad.sub}
            </p>
            <button className="mt-3 rounded-xl px-4 py-2 text-sm font-black transition-opacity hover:opacity-85"
              style={{ background: ad.ctaBg, color: ad.ctaColor }}>
              {ad.cta}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="absolute bottom-2.5 right-3 flex gap-1.5 z-10">
        {ads.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className="rounded-full transition-all duration-300"
            style={{
              height: 4,
              width: i === idx ? 18 : 4,
              background: i === idx ? ad.accent : "rgba(255,255,255,0.25)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
/* ── Sous-composants ── */
function ArenaPresence({ players, liveCount }) {
  const visible = players.slice(0, 4);
  return (
    <div className="mx-auto flex w-fit items-center rounded-full border py-1.5 pl-2 pr-3.5 gap-3"
      style={{ borderColor: "rgba(255,255,255,.12)", background: "rgba(0,0,0,.22)" }}>
      <div className="flex -space-x-2">
        {visible.length ? visible.map((p) => (
          <AnimeAvatar key={p.id || p.username} seed={p.username} alt="" size={26} className="border-2" />
        )) : (
          <span className="grid h-[26px] w-[26px] place-items-center rounded-full border text-[10px]"
            style={{ borderColor: "var(--divider)" }}>?</span>
        )}
      </div>
      <span className="text-xs font-extrabold text-white/85 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full animate-pulse"
          style={{ background: liveCount > 0 ? "var(--danger)" : "var(--success)" }} />
        {players.length ? `${players.length} dans l'arène` : "Arène ouverte"}
        {liveCount > 0 && <span style={{ color: "var(--danger)" }}>&middot; {liveCount} live</span>}
      </span>
    </div>
  );
}

function ModeCard({ icon: Icon, title, sub, action, onClick, featured, image }) {
  return (
    <motion.button variants={fadeUp} whileHover={{ y: -4 }} onClick={onClick}
      className={`group relative min-w-[240px] snap-center overflow-hidden rounded-2xl text-left sm:min-w-0 ${featured ? "btn-primary" : "card"}`}
      style={{
        // .btn-primary est réutilisé ici juste pour le fond accent, pas
        // comme un vrai bouton — depuis son passage en pilule (style
        // Material, 31/08) il fallait reforcer un rayon de carte normal,
        // sinon la carte "Duel 1v1" se déforme en gros cercle (bug du
        // 31/08, retour Paul, capture à l'appui).
        borderRadius: "1rem",
        ...(featured ? {} : { border: "1px solid var(--border)" }),
      }}
    >
      <div className="pointer-events-none h-28 overflow-hidden">
        <img src={image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 h-28"
          style={{ background: "linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 60%)" }} />
      </div>
      <div className="relative p-5">
        <span className="absolute -top-8 grid h-12 w-12 place-items-center rounded-2xl border transition-colors duration-200"
          style={{
            background: featured ? "var(--accent)" : "var(--surface)",
            color: featured ? "#08080c" : "var(--accent)",
            borderColor: featured ? "var(--accent)" : "var(--border)",
          }}>
          <Icon className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
        </span>
        <div className="mt-2 font-display text-xl font-extrabold">{title}</div>
        <div className="mt-0.5 text-[12px]"
          style={{ color: featured ? "rgba(255,255,255,0.65)" : "var(--text-sub)" }}>{sub}</div>
        <div className="mt-3 inline-flex items-center gap-1 text-sm font-bold">
          {action}
          <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </motion.button>
  );
}

function PlayerName({ username }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <AnimeAvatar seed={username || "joueur"} alt="" size={26} />
      <strong className="truncate text-[13px]">{username || "Joueur"}</strong>
    </span>
  );
}

function Empty({ text, action }) {
  return (
    <div className="py-6 text-center">
      <p className="text-sm" style={{ color: "var(--text-sub)" }}>{text}</p>
      {action && (
        <button onClick={action.onClick} className="mt-3 btn-primary rounded-xl px-4 py-2 text-sm">
          {action.label}
        </button>
      )}
    </div>
  );
}

function HorizontalRail({ children }) {
  const ref = useRef(null);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  return (
    <div className="relative">
      <div ref={ref} className="hide-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
        {children}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button aria-label="Précédent" onClick={() => scroll(-1)}
          className="btn-secondary grid h-8 w-8 place-items-center rounded-lg">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button aria-label="Suivant" onClick={() => scroll(1)}
          className="btn-secondary grid h-8 w-8 place-items-center rounded-lg">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
