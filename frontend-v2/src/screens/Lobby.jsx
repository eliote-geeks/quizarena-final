import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import clsx from "clsx";
import { Block, ConfirmModal, Label, Leader, Loader, Money, Row, Stat } from "../ui";
import { CategoryCard } from "./Categories";
import { TournamentCard } from "./Tournaments";
import { CATEGORY_PHOTO, NavIcon } from "../ui/icons";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import * as duel from "../lib/duelSocket";
import { avatarUrl } from "../lib/api";
import { ClanEmblem } from "../lib/clanEmblems";

/** id des catégories dont le sujet EST le Cameroun — sert juste au petit
 * badge 🇨🇲, plus à les mettre systématiquement en tête (retour direct
 * de Paul le 19/08 : l'aperçu accueil ne doit pas donner l'impression
 * que le site est bloqué sur le Cameroun — 14 des 19 catégories
 * couvrent le monde entier). */
const CAMEROON_IDS = ["football-cm", "musique-cm", "histoire-cm", "societe-cm", "gastronomie-cm"];

/** Aperçu volontairement varié pour l'accueil : quelques thèmes du
 * monde entier + une seule touche Cameroun, jamais les 5 d'un coup. */
const HOME_PREVIEW_IDS = ["geographie", "sport", "football-cm", "cinema", "technologie", "musique-cm"];

/** Bannières promo — que des vraies fonctionnalités, aucun chiffre
 * inventé (§DESIGN.md : jamais de fausse donnée), pointant vers de
 * vraies routes. Photo en fond (réutilise les vraies photos de
 * catégorie déjà en place, jamais de stock générique) + voile plat
 * `bg-ink/*` pour la lisibilité — pas un dégradé, la seule exception
 * dégradé du projet reste `.fade-to-panel` (§app.css). */
const BANNERS = [
  {
    id: "tournaments",
    photo: "/categories/sport.webp",
    eyebrow: "bracket en direct",
    title: "Tournois à élimination directe",
    body: "4 à 16 joueurs, bracket temps réel. Le vainqueur remporte 60% du pot.",
    cta: "Voir les tournois",
    to: "/tournaments",
  },
  {
    id: "invite",
    photo: "/categories/technologie.webp",
    eyebrow: "duel entre amis",
    title: "Défie un ami par lien",
    body: "Invitation privée, mise partagée, le duel démarre dès qu'il rejoint.",
    cta: "Inviter un ami",
    to: "/duel",
  },
  {
    id: "categories",
    photo: "/categories/football-cm.webp",
    eyebrow: "19 thèmes",
    title: "5 catégories 100% Cameroun",
    body: "Football, musique, histoire, société, gastronomie — questions vérifiées.",
    cta: "Explorer les catégories",
    to: "/categories",
  },
];

/**
 * Le lobby est une UNE de journal sportif, pas un dashboard.
 * Une seule action dominante, le reste est un tableau de scores.
 *
 * Solde et stats viennent du vrai compte. Le tableau "Meilleurs gains"
 * vient du vrai classement (/api/leaderboard, argent gagné). La cagnotte
 * de la semaine reste illustrative tant qu'il n'y a pas de vrai système
 * de cagnotte côté serveur — mais on n'affiche plus de faux "joueurs en
 * ligne" ni de faux adversaires cliquables : ça a fait croire à un vrai
 * duel là où il n'y en avait pas.
 */
export default function Lobby() {
  const nav = useNavigate();
  const { stats, balanceCoins } = useAuth();
  const [top, setTop] = useState(null);
  const [categories, setCategories] = useState(null);
  const [runningTournaments, setRunningTournaments] = useState(null);
  const [openDuels, setOpenDuels] = useState(null);
  const [liveDuels, setLiveDuels] = useState([]);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [homeClans, setHomeClans] = useState([]);
  const [joiningCode, setJoiningCode] = useState(null);
  const [joinError, setJoinError] = useState("");
  const [pendingJoin, setPendingJoin] = useState(null); // duel en attente de confirmation
  const [showSwordCrash, setShowSwordCrash] = useState(false);

  /** Lance l'animation d'épées puis navigue vers /duel (560 ms). */
  const goToDuel = useCallback(() => {
    setShowSwordCrash(true);
    setTimeout(() => {
      setShowSwordCrash(false);
      nav("/duel");
    }, 560);
  }, [nav]);

  useEffect(() => {
    api.getLeaderboard().then((d) => setTop(d.leaderboard.slice(0, 5)));
    api.getClans(1, 12).then((d) => setHomeClans(d.clans)).catch(() => {});
    api.getCategories().then((r) => {
      const byId = new Map(r.categories.map((c) => [c.id, c]));
      const preview = HOME_PREVIEW_IDS.map((id) => byId.get(id)).filter(Boolean);
      setCategories(preview);
    });
    // Tournois "lancés" : les miens en cours + les ouverts qui cherchent
    // encore des joueurs — pas les miens déjà terminés, l'accueil n'est
    // pas un historique.
    api.getTournaments().then((d) => {
      const mineActive = d.mine.filter((t) => t.status !== "COMPLETED");
      const mineIds = new Set(mineActive.map((t) => t.id));
      const openOthers = d.open.filter((t) => !mineIds.has(t.id));
      setRunningTournaments([...mineActive, ...openOthers].slice(0, 3));
    });
    // Un duel ouvert créé/rejoint par quelqu'un d'autre pendant qu'on
    // reste sur l'accueil doit apparaître/disparaître sans recharger la
    // page — un seul fetch au montage ne suffisait pas (bug remonté par
    // Paul le 19/08 : un duel publié n'apparaissait pas), même poll que
    // la page dédiée /duels-ouverts.
    const loadOpenDuels = () => api.getOpenDuels().then((d) => {
      // Inclut le duel de l'utilisateur lui-même (mine) en tête s'il en a un —
      // le backend le filtre de "open" pour éviter le self-join, mais on veut
      // qu'il le voie quand même sur l'accueil pour confirmer la publication.
      const all = d.mine ? [{ ...d.mine, isMine: true }, ...d.open] : d.open;
      setOpenDuels(all.slice(0, 4));
    });
    loadOpenDuels();
    const openDuelsTimer = setInterval(loadOpenDuels, 5000);
    const loadLiveDuels = () => api.getLiveDuels().then((data) => setLiveDuels(data.matches)).catch(() => {});
    loadLiveDuels();
    const liveDuelsTimer = setInterval(loadLiveDuels, 3000);
    const loadOnlinePlayers = () => api.getOnlinePlayers().then((data) => setOnlinePlayers(data.online)).catch(() => {});
    loadOnlinePlayers();
    const onlinePlayersTimer = setInterval(loadOnlinePlayers, 10_000);
    duel.connect();
    const offError = duel.on("error", (msg) => {
      setJoiningCode(null);
      setJoinError(msg.message || "Impossible de rejoindre ce duel.");
    });
    return () => {
      clearInterval(openDuelsTimer);
      clearInterval(liveDuelsTimer);
      clearInterval(onlinePlayersTimer);
      offError();
    };
  }, []);

  const joinOpenDuel = (d) => {
    if (joiningCode) return;
    if (d.stakeCoins > balanceCoins) {
      setJoinError("Solde insuffisant pour cette mise.");
      return;
    }
    setJoinError("");
    setPendingJoin(d); // affiche la confirmation avant de rejoindre
  };

  const confirmJoin = () => {
    if (!pendingJoin) return;
    const d = pendingJoin;
    setPendingJoin(null);
    setJoiningCode(d.code);
    duel.joinInvite(d.code); // navigation automatique au "matched", §ui/GlobalDuelWatcher.jsx
  };

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[1100px] px-5 pb-8 sm:px-8">
      {showSwordCrash && <SwordCrashFlash />}

      {/* Confirmation avant de rejoindre un duel ouvert depuis l'accueil */}
      <ConfirmModal
        open={!!pendingJoin}
        title={`Rejoindre le duel de ${pendingJoin?.username ?? ""} ?`}
        message={
          pendingJoin
            ? `Mise de ${pendingJoin.stakeCoins.toLocaleString("fr-FR")} F débitée immédiatement. Si tu gagnes, tu remportes ${pendingJoin.prizeCoins?.toLocaleString("fr-FR")} F.`
            : ""
        }
        confirmLabel={`Rejoindre · ${pendingJoin?.stakeCoins?.toLocaleString("fr-FR") ?? ""} F`}
        onConfirm={confirmJoin}
        onCancel={() => setPendingJoin(null)}
      />
      {/* ── Bandeau mobile uniquement : la barre desktop vit dans Shell. ── */}
      <header className="flex items-center justify-between gap-4 pt-5 pb-4 sm:hidden">
        <span className="t-display text-lg tracking-tight text-flare">QUIZARENA</span>
        <button
          type="button"
          onClick={() => nav("/wallet")}
          className="press flex items-center gap-2 rounded-full border border-flare/20 bg-flare/8 px-3 py-2"
          aria-label="Ouvrir le portefeuille"
        >
          <span className="t-label text-[9px] text-bone-4">SOLDE</span>
          <Money value={balanceCoins} size="sm" tone="flare" />
        </button>
      </header>

      <div className="rule-flare sm:mt-9" />

      {/* ── L'action dominante. Le plus gros élément est la chose
             la plus importante — le test n°4 de DESIGN.md. ── */}
      <section className="grid gap-8 pt-6 pb-9 sm:pt-10 sm:pb-14 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
        <div>
          <p className="t-label mb-2 text-[9px] text-bone-4 sm:hidden">PARTIE CLASSIQUE</p>
          <h1 className="t-display text-[2rem] leading-none sm:text-[clamp(2rem,7vw,3.5rem)] sm:leading-[1.05]">
            Duel <span className="text-flare">rapide</span>
          </h1>

          <div className="mt-4 hidden items-center gap-5 sm:flex">
            <Stat label="format" value="10 manches" size="sm" />
            <Stat label="parties jouées" value={stats?.totalGames ?? 0} size="sm" />
          </div>

          <div className="t-label mt-4 flex items-center gap-2 text-[10px] text-bone-3 sm:hidden">
            <span>10 QUESTIONS</span>
            <span className="h-1 w-1 rounded-full bg-flare" />
            <span>8 S</span>
            <span className="h-1 w-1 rounded-full bg-flare" />
            <span>MISE AU CHOIX</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 sm:mt-5">
            <Block
              size="md"
              icon={<NavIcon type="swords" className="h-4 w-4" />}
              onClick={goToDuel}
              className="w-full justify-center sm:w-auto"
            >
              Lancer un duel
            </Block>
          </div>

          <p className="t-body mt-5 hidden max-w-md text-sm text-bone-3 sm:block">
            Dix questions, huit secondes chacune. Le plus de bonnes réponses
            gagne. Vainqueur emporte la mise.
          </p>

          <p className="t-body mt-3 text-center text-[11px] text-bone-4 sm:hidden">
            Le meilleur score remporte la mise.
          </p>
        </div>

        {/* ── Colonne de droite : chiffres bruts, aucun encadré. ── */}
        <aside className="hidden flex-col gap-5 sm:flex">
          <div>
            <Label className="mb-2">votre solde</Label>
            <Money value={balanceCoins} size="lg" tone="flare" />
            <p className="t-body mt-2 text-sm text-bone-3">
              Rechargez ou retirez depuis le portefeuille à tout moment.
            </p>
          </div>
        </aside>
      </section>

      <div className="grid gap-4 pb-9 sm:gap-6 sm:pb-12 lg:grid-cols-2">
      <section className="order-2 min-w-0 rounded-2xl border border-ink-5 bg-ink-2/45 p-4 sm:p-5 lg:order-1">
        <div className="flex items-baseline justify-between pb-4"><h2 className="t-display text-lg">Clans à découvrir</h2><button onClick={() => nav("/clans")} className="t-label text-flare">tous ›</button></div>
        {homeClans.length === 0 ? <p className="t-body text-sm text-bone-4">Aucun clan disponible.</p> : <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{homeClans.map((clan) => <button key={clan.id} onClick={() => nav(`/clans/${clan.id}`)} className="press min-w-[220px] rounded-(--radius-card) bg-ink-2 p-4 text-left hover:bg-ink-3"><div className="flex items-center gap-3"><ClanEmblem emblemKey={clan.emblemKey} tag={clan.tag} color={clan.bannerColor} size="sm" /><div className="min-w-0"><div className="t-title truncate text-sm">{clan.name}</div><div className="t-body mt-1 text-xs text-bone-4">{clan.memberCount} membre{clan.memberCount !== 1 ? "s" : ""} · {clan.joinPolicyLabel}</div></div></div></button>)}</div>}
      </section>

      {/* Profils réellement connectés au WebSocket — aucune présence fictive. */}
      <section className="order-1 min-w-0 rounded-2xl border border-ink-5 bg-ink-2/45 p-4 sm:p-5 lg:order-2">
        <div className="flex items-baseline justify-between pb-4">
          <h2 className="t-display text-lg">Joueurs en ligne</h2>
          <Label tone="live">{onlinePlayers.length} connecté{onlinePlayers.length !== 1 ? "s" : ""}</Label>
        </div>
        {onlinePlayers.length === 0 ? (
          <p className="t-body text-sm text-bone-4">Aucun autre joueur connecté pour l’instant.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {onlinePlayers.map((player) => (
              <div key={player.id} className="min-w-[220px] rounded-(--radius-card) bg-ink-2 p-4 text-left hover:bg-ink-3">
                <button onClick={() => nav(`/player/${encodeURIComponent(player.username)}`)} className="press w-full text-left">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img src={avatarUrl(player.username)} alt={player.username} className="h-11 w-11 rounded-full object-cover" />
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-live ring-2 ring-ink-2" />
                  </div>
                  <div className="min-w-0">
                    <div className="t-title truncate text-sm">{player.username}</div>
                    <div className="t-body mt-1 truncate text-xs text-bone-4">{player.clan ? `[${player.clan.tag}] ${player.clan.name}` : player.region || "Disponible"}</div>
                  </div>
                </div>
                </button>
                <button onClick={() => nav("/duel", { state: { challengeUsername: player.username } })} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-flare/20 bg-flare/8 py-2 text-[10px] font-black uppercase tracking-wider text-flare hover:bg-flare/15"><NavIcon type="swords" className="h-3.5 w-3.5" />Lancer un défi privé</button>
              </div>
            ))}
          </div>
        )}
      </section>
      </div>

      <section className="pb-10 sm:pb-14">
        <div className="rule-bone flex items-baseline justify-between pt-5 pb-4"><h2 className="t-display text-lg">Matchs en direct</h2><Label tone="flare">live</Label></div>
        {liveDuels.length === 0 ? <p className="t-body text-sm text-bone-4">Aucun match en cours pour l’instant.</p> : <div className="relative z-20 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{liveDuels.map((match) => <Link key={match.id} to={`/duel/spectate/${match.id}`} aria-label={`Regarder ${match.players[0].username} contre ${match.players[1].username}`} className="press group relative z-20 min-w-[290px] cursor-pointer touch-manipulation rounded-(--radius-card) border border-danger/30 bg-ink-2 p-4 text-left hover:border-flare/60"><div className="flex items-center justify-between"><div className="t-label flex items-center gap-2 text-[10px] text-danger"><span className="h-2 w-2 animate-pulse rounded-full bg-danger" />EN DIRECT</div><span className="t-label text-[9px] text-bone-4">◉ {match.viewerCount ?? 0} spectateur{match.viewerCount !== 1 ? "s" : ""}</span></div><div className="mt-4 flex items-center justify-between gap-2 text-sm"><span className="max-w-24 truncate">{match.players[0].username}</span><strong className="t-display text-flare">{match.scoreA} – {match.scoreB}</strong><span className="max-w-24 truncate text-right">{match.players[1].username}</span></div><div className="mt-3 flex items-center justify-between"><span className="t-body text-xs text-bone-4">Mise {match.stakeCoins.toLocaleString("fr-FR")} F</span><span className="rounded-lg bg-flare/12 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-flare">Regarder →</span></div></Link>)}</div>}
      </section>

      {/* ── Bannières promo, swipables — vraies fonctionnalités seulement. ── */}
      <section className="pb-14">
        <BannerCarousel banners={BANNERS} />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          ── Duels ouverts + Ma garde + Créer ──
          Deux zones distinctes :
          1. Garde + boutons de création (zone "action") — toujours visible
          2. Scroll horizontal des duels des autres — si il y en a
      ══════════════════════════════════════════════════════════════════ */}
      <section className="pb-14">
        <div className="rule-bone flex items-baseline justify-between pt-5 pb-4">
          <h2 className="t-display text-lg">Duels ouverts</h2>
          <Label tone="flare" className="cursor-pointer hover:text-flare-hot" onClick={() => nav("/duels-ouverts")}>
            tous ›
          </Label>
        </div>

        {joinError && <p className="t-body mb-3 text-sm text-danger">{joinError}</p>}

        {/* ── Zone d'action : garde et salle des duels uniquement. ── */}
        <div className="mb-5 grid gap-3 grid-cols-1 sm:grid-cols-2">

          {/* Ma garde — mon duel ouvert actif, si j'en ai un */}
          {openDuels?.find((d) => d.isMine) ? (() => {
            const mine = openDuels.find((d) => d.isMine);
            return (
              <div className="relative overflow-hidden rounded-(--radius-card) border border-flare/35 bg-flare/8 px-4 py-4">
                {/* Pulsation "en direct" */}
                <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flare opacity-70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-flare" />
                </span>
                <p className="t-label text-[10px] uppercase tracking-widest text-flare mb-2">Ma garde</p>
                <div className="flex items-center gap-3">
                  <img
                    src={avatarUrl(mine.username)}
                    alt={mine.username}
                    className="h-10 w-10 rounded-full object-cover shrink-0 border-2 border-flare/40"
                  />
                  <div className="min-w-0">
                    <p className="t-title text-[14px] truncate">{mine.username}</p>
                    <p className="t-body text-[11px] text-bone-4 mt-0.5">En attente d'un adversaire…</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Money value={mine.stakeCoins} size="sm" tone="flare" />
                  <span className="t-label text-[10px] text-bone-4 uppercase">Mise</span>
                </div>
              </div>
            );
          })() : (
            /* Pas de garde active : bouton "Créer un duel ouvert" */
            <button
              onClick={goToDuel}
              className="press flex flex-col items-start gap-3 rounded-(--radius-card) border-2 border-dashed border-ink-4 px-4 py-4 text-left transition-colors hover:border-flare/40 hover:text-flare group"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-(--radius-tag) bg-ink-3 text-bone-4 group-hover:bg-flare/15 group-hover:text-flare transition-colors">
                <NavIcon type="swords" className="h-5 w-5" />
              </span>
              <div>
                <p className="t-label text-[11px] uppercase tracking-wider text-bone-4 group-hover:text-flare">Créer un duel</p>
                <p className="t-body mt-0.5 text-xs text-bone-5">Publie et attends un adversaire</p>
              </div>
            </button>
          )}

          {/* Aller sur la page duels ouverts */}
          <button
            onClick={() => nav("/duels-ouverts")}
            className="press flex flex-col items-start gap-3 rounded-(--radius-card) bg-ink-2 px-4 py-4 text-left transition-colors hover:bg-ink-3 group"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-(--radius-tag) bg-ink-3 text-bone-4 group-hover:bg-ink-4 transition-colors">
              <NavIcon type="megaphone" className="h-5 w-5" />
            </span>
            <div>
              <p className="t-label text-[11px] uppercase tracking-wider text-bone-3">Salle des duels</p>
              <p className="t-body mt-0.5 text-xs text-bone-5">Tous les duels ouverts en direct</p>
            </div>
          </button>
        </div>

        {/* ── Cartes joueurs — duels ouverts des autres ── */}
        {openDuels && openDuels.filter((d) => !d.isMine).length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {openDuels.filter((d) => !d.isMine).map((d) => (
              <OpenDuelCard
                key={d.code}
                d={d}
                onJoin={() => joinOpenDuel(d)}
                loading={joiningCode === d.code}
                disabled={!!joiningCode}
                canAfford={d.stakeCoins <= balanceCoins}
              />
            ))}
          </div>
        )}

        {openDuels && openDuels.filter((d) => !d.isMine).length === 0 && (
          <p className="t-body text-sm text-bone-4 py-2">Aucun duel ouvert pour l'instant — crée le premier !</p>
        )}
      </section>

      {/* ── Tournois : défilement horizontal ── */}
      <section className="pb-14">
        <div className="rule-bone flex items-baseline justify-between pt-5 pb-4">
          <h2 className="t-display text-lg">Tournois</h2>
          <Label tone="flare" className="cursor-pointer hover:text-flare-hot" onClick={() => nav("/tournaments")}>
            tous les tournois ›
          </Label>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {runningTournaments === null && (
            <div className="flex items-center justify-center py-4">
              <Loader />
            </div>
          )}
          {(runningTournaments ?? []).map((t) => (
            <div key={t.id} className="w-44 flex-shrink-0 sm:w-52">
              <TournamentCard t={t} onClick={() => nav(`/tournaments/${t.id}`)} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Aperçu des catégories — scroll horizontal comme les tournois. ── */}
      <section className="pb-14">
        <div className="rule-bone flex items-baseline justify-between pt-5 pb-4">
          <h2 className="t-display text-lg">Catégories</h2>
          <Label tone="flare" className="cursor-pointer hover:text-flare-hot" onClick={() => nav("/categories")}>
            toutes les catégories ›
          </Label>
        </div>
        {categories === null ? (
          <div className="flex justify-center py-8"><Loader /></div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c, i) => (
              <div key={c.id} className="w-36 flex-shrink-0 sm:w-44">
                <CategoryCard c={c} index={i} photo={CATEGORY_PHOTO[c.id]} featured={CAMEROON_IDS.includes(c.id)} />
              </div>
            ))}
            {/* Carte "Explorer" à la fin */}
            <div className="w-36 flex-shrink-0 sm:w-44">
              <button
                onClick={() => nav("/categories")}
                className="press flex h-full min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-(--radius-card) border-2 border-dashed border-ink-4 text-bone-4 hover:border-flare/40 hover:text-flare transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6"><rect x="2" y="2" width="7" height="7" rx="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5"/></svg>
                <span className="t-label text-[11px]">Tout explorer</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Tableau de score réel : meilleurs gains, pas de faux adversaires. ── */}
      <section>
        <div className="rule-bone flex items-baseline justify-between pt-5 pb-4">
          <h2 className="t-display text-lg">Meilleurs gains</h2>
          <Label tone="flare" className="cursor-pointer hover:text-flare-hot" onClick={() => nav("/leaderboard")}>
            classement complet ›
          </Label>
        </div>

        <div className="-mx-4">
          {top === null && (
            <div className="flex justify-center px-4 py-8">
              <Loader />
            </div>
          )}
          {top?.length === 0 && (
            <p className="t-body px-4 py-6 text-sm text-bone-4">Personne n'a encore gagné de partie.</p>
          )}
          {(top ?? []).map((p) => (
            <Row key={p.id} rank={p.rank}>
              <span className="t-title min-w-0 max-w-[60%] truncate text-[15px]">
                {p.username}
                {p.me && <span className="t-label ml-2 text-bone-4">vous</span>}
              </span>
              <Leader />
              <Money value={p.winningsCoins} size="sm" tone={p.rank === 1 ? "flare" : "bone"} />
            </Row>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Animation de choc d'épées — plein écran, 560 ms, déclenché sur
   "Créer un duel" / "Lancer un duel". Fond sombre, deux lames qui
   convergent du bas-gauche et bas-droit, flash doré à l'impact.
   Aucune lib : CSS keyframes (§styles/app.css clash-*) + SVG inline.
───────────────────────────────────────────────────────────────────── */
function SwordCrashFlash() {
  const DUR = "560ms";

  /* Lame SVG inline (même forme que SwordBlade dans icons.jsx) */
  const blade = (
    <>
      <rect x="11.1" y="2"    width="1.8" height="12.5" />
      <polygon points="12,1 13.5,4 10.5,4" />
      <rect x="7.8"  y="14.5" width="8.4" height="1.7" rx="0.5" />
      <rect x="11.1" y="16.2" width="1.8" height="3.6" />
      <rect x="9.6"  y="19.6" width="4.8" height="1.8" rx="0.9" />
    </>
  );

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed", inset: 0, zIndex: 9998,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgb(4 4 10)",
        animation: `clash-overlay ${DUR} ease-in-out forwards`,
        pointerEvents: "none",
      }}
    >
      {/* Scène — 200×200 px centrée */}
      <div style={{ position: "relative", width: 200, height: 200 }}>

        {/* Lame gauche (dorée) */}
        <svg
          viewBox="0 0 24 24" fill="currentColor"
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            color: "var(--color-flare)",
            animation: `clash-sword-l ${DUR} cubic-bezier(.22,.68,0,1.2) forwards`,
            filter: "drop-shadow(0 0 10px color-mix(in srgb,var(--color-flare) 80%,transparent))",
          }}
        >
          {blade}
        </svg>

        {/* Lame droite (blanche / os) */}
        <svg
          viewBox="0 0 24 24" fill="currentColor"
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            color: "rgb(210 200 180)",
            animation: `clash-sword-r ${DUR} cubic-bezier(.22,.68,0,1.2) forwards`,
            filter: "drop-shadow(0 0 8px rgba(230,210,160,.55))",
          }}
        >
          {blade}
        </svg>

        {/* Flash doré circulaire au choc */}
        <div
          style={{
            position: "absolute",
            inset: "-40%",
            borderRadius: "50%",
            background: "radial-gradient(circle, #fff9e0 0%, #f2a93b 28%, #e07000 55%, transparent 72%)",
            animation: `clash-spark ${DUR} ease-out forwards`,
            pointerEvents: "none",
          }}
        />

        {/* Rayons en étoile autour du choc */}
        <svg
          viewBox="-1 -1 2 2"
          style={{
            position: "absolute",
            inset: "-80%",
            width: "260%", height: "260%",
            animation: `clash-ray ${DUR} ease-out forwards`,
            overflow: "visible",
          }}
        >
          {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg) => (
            <line
              key={deg}
              x1="0" y1="0"
              x2={0.52 * Math.cos(deg * Math.PI / 180)}
              y2={0.52 * Math.sin(deg * Math.PI / 180)}
              stroke={deg % 60 === 0 ? "#fff8d6" : "rgba(242,169,59,.7)"}
              strokeWidth={deg % 60 === 0 ? "0.06" : "0.04"}
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* Texte CLASH — apparaît à l'impact */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: `clash-ray ${DUR} ease-out forwards`,
            pointerEvents: "none",
          }}
        >
          <span style={{
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "#fff9e0",
            textShadow: "0 0 12px #f2a93b, 0 0 30px #f2a93b",
            marginTop: 4,
          }}>
            DUEL
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Carte de duel ouvert — card joueur avec avatar, pseudo, mise et bouton
 * rejoindre. Largeur fixe (140px mobile, 160px desktop) pour le scroll
 * horizontal. L'avatar vient du générateur anime local (§api.avatarUrl).
 */
function OpenDuelCard({ d, onJoin, loading, disabled, canAfford }) {
  const fmtStake = d.stakeCoins?.toLocaleString("fr-FR");
  const fmtPrize = d.prizeCoins?.toLocaleString("fr-FR");
  return (
    <div className="flex w-36 flex-shrink-0 flex-col overflow-hidden rounded-(--radius-card) bg-ink-2 sm:w-44">
      {/* Avatar zone */}
      <div className="relative flex h-20 items-center justify-center bg-ink-3">
        <img
          src={avatarUrl(d.username)}
          alt={d.username}
          className="h-14 w-14 rounded-full object-cover border-2 border-ink-4"
        />
        {/* Badge mise — coin supérieur droit */}
        <span className="absolute top-2 right-2 rounded-(--radius-tag) bg-flare/90 px-1.5 py-0.5 text-[10px] font-black text-ink leading-none">
          {fmtStake} F
        </span>
      </div>
      {/* Info */}
      <div className="flex flex-col gap-2 px-3 py-3">
        <p className="t-title truncate text-[13px]">{d.username}</p>
        {fmtPrize && (
          <p className="t-body text-[11px] text-live leading-none">à gagner : {fmtPrize} F</p>
        )}
        <button
          onClick={onJoin}
          disabled={disabled || !canAfford}
          className={clsx(
            "press mt-1 w-full rounded-(--radius-tag) py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors",
            !canAfford
              ? "cursor-not-allowed bg-ink-4 text-bone-5"
              : disabled
              ? "cursor-not-allowed bg-ink-3 text-bone-4"
              : "bg-flare text-ink hover:bg-flare-hot"
          )}
        >
          {loading ? "…" : !canAfford ? "Solde insuf." : "Rejoindre"}
        </button>
      </div>
    </div>
  );
}

/**
 * Carrousel de bannières swipable — défilement natif (scroll-snap, pas
 * de librairie de drag) : léger, et le geste tactile "glisser" marche
 * gratuitement sur mobile. Les points en bas suivent le scroll et
 * permettent aussi de sauter directement à une bannière au clic.
 */
function BannerCarousel({ banners }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goTo = (i) => {
    const el = trackRef.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {banners.map((b) => (
          <Link
            key={b.id}
            to={b.to}
            className="press group relative flex w-full shrink-0 snap-center flex-col justify-between gap-6 overflow-hidden rounded-(--radius-panel) px-6 py-7 text-bone sm:flex-row sm:items-center"
          >
            {b.photo && (
              <img
                src={b.photo}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {/* Voile plat pour la lisibilité — pas un dégradé (§app.css
                .fade-to-panel reste la seule exception dégradée). */}
            <div className="absolute inset-0 bg-ink/72" />
            <div className="relative min-w-0">
              <span className="t-label block text-bone-3">{b.eyebrow}</span>
              <h3 className="t-display mt-1.5 text-2xl sm:text-3xl">{b.title}</h3>
              <p className="t-body mt-2 max-w-md text-sm text-bone-2">{b.body}</p>
            </div>
            <span className="t-label relative shrink-0 whitespace-nowrap text-flare">{b.cta} ›</span>
          </Link>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {banners.map((_, i) => (
          <button
            key={i}
            aria-label={`Bannière ${i + 1}`}
            onClick={() => goTo(i)}
            className={clsx("h-1.5 rounded-full transition-all", i === active ? "w-5 bg-flare" : "w-1.5 bg-ink-4")}
          />
        ))}
      </div>
    </div>
  );
}
