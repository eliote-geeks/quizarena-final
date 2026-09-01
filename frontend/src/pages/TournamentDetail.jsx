import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import * as api from "../lib/api";
import * as duel from "../lib/duelSocket";
import { ArrowLeft, Check, Crown, Info, Search, Swords, Ticket, Trophy, UserPlus, Users, UserX, X } from "lucide-react";
import AnimeAvatar from "../components/AnimeAvatar";
import ArenaLoader from "../components/ArenaLoader";
import { tournamentCover } from "../lib/tournamentCovers";
import { SFX } from "../lib/soundEngine";

// Rake identique à payout.ts backend (10%)
const PLATFORM_FEE_PCT = 0.10;

function calcPrizes(stakeCoins, capacity) {
  const pot = stakeCoins * capacity;
  const platformCut = Math.floor(pot * PLATFORM_FEE_PCT);
  const first    = Math.floor(pot * 0.54);
  const second   = Math.floor(pot * 0.225);
  const semiEach = Math.floor(pot * 0.0675);
  const prizes = [{ rank: 1, label: "1re place",          coins: first }];
  if (capacity >= 2) prizes.push({ rank: 2, label: "2e place",         coins: second });
  if (capacity >= 4) prizes.push({ rank: 3, label: "Demi-finales x2",  coins: semiEach, each: true });
  return { pot, platformCut, prizes };
}

export default function TournamentDetail() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { coins, currency, refreshWallet, user } = useApp();
  const userId = user?.id;
  const [tournament, setTournament] = useState(null);
  const [error, setError] = useState("");
  const [kickingId, setKickingId] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // "join" | "start" | "leave"
  const [inviteOpen, setInviteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(() =>
    api.getTournament(tournamentId)
      .then(setTournament)
      .catch((e) => setError(e.message)),
    [tournamentId]
  );

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!tournament || tournament.status === "COMPLETED") return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load, tournament]);
  useEffect(() => {
    duel.connect();
    const off = duel.on("matched", () => navigate("/duel/play"));
    return off;
  }, [navigate]);

  const join = async () => {
    setActionLoading(true); setError("");
    try { setTournament(await api.joinTournament(tournamentId)); await refreshWallet(); SFX.confirm(); }
    catch (e) { setError(e.message); SFX.error(); }
    finally { setActionLoading(false); setConfirmModal(null); }
  };
  const leave = async () => {
    setActionLoading(true); setError("");
    try { await api.leaveTournament(tournamentId); await refreshWallet(); load(); SFX.cancel(); }
    catch (e) { setError(e.message); SFX.error(); }
    finally { setActionLoading(false); setConfirmModal(null); }
  };
  const startTournament = async () => {
    setActionLoading(true); setError("");
    try { setTournament(await api.startTournament(tournamentId)); SFX.tournamentStart(); }
    catch (e) { setError(e.message); SFX.error(); }
    finally { setActionLoading(false); setConfirmModal(null); }
  };
  const markReady = async () => {
    setActionLoading(true); setError("");
    try { setTournament(await api.readyTournament(tournamentId)); SFX.ready(); }
    catch (e) { setError(e.message); SFX.error(); }
    finally { setActionLoading(false); }
  };
  const cancelReady = async () => {
    setActionLoading(true); setError("");
    try { setTournament(await api.cancelTournamentReady(tournamentId)); SFX.cancel(); }
    catch (e) { setError(e.message); SFX.error(); }
    finally { setActionLoading(false); }
  };
  const sendInvites = async (userIds) => {
    setError("");
    try { setTournament(await api.inviteToTournament(tournamentId, userIds)); SFX.confirm(); }
    catch (e) { setError(e.message); SFX.error(); throw e; }
  };
  const play = () => {
    duel.tournamentEnter(tournament.myNextMatchId);
    navigate("/duel/play");
  };
  const kick = async (targetId) => {
    if (kickingId) return;
    setKickingId(targetId);
    setError("");
    try { setTournament(await api.kickTournamentPlayer(tournamentId, targetId)); SFX.cancel(); }
    catch (e) { setError(e.message); SFX.error(); }
    finally { setKickingId(null); }
  };

  if (!tournament && !error)
    return <div className="qa-shell py-8"><ArenaLoader label="Chargement du bracket…" /></div>;
  if (!tournament)
    return (
      <div className="qa-shell py-8">
        <button onClick={() => navigate("/tournaments")} className="btn-secondary rounded-xl px-4 py-3">Retour</button>
        <p className="mt-6 text-red-500">{error}</p>
      </div>
    );

  const pot = tournament.stakeCoins * tournament.capacity;
  const { prizes, platformCut } = calcPrizes(tournament.stakeCoins, tournament.capacity);
  const isCreator = tournament.creatorId && tournament.creatorId === userId;
  const isFull = tournament.entries.length >= tournament.capacity;
  const isRegistering = tournament.status === "REGISTERING";
  const isReadyCheck = tournament.status === "READY_CHECK";
  const readyCount = tournament.readyCount ?? 0;

  return (
    <div className="qa-shell space-y-6 py-8">
      {/* Modals de confirmation */}
      <TournamentConfirmModal
        open={confirmModal === "join"}
        type="join"
        amount={formatMoney(tournament.stakeCoins, currency)}
        loading={actionLoading}
        onCancel={() => setConfirmModal(null)}
        onConfirm={join}
      />
      <TournamentConfirmModal
        open={confirmModal === "start"}
        type="start"
        amount={`${tournament.capacity} joueurs`}
        loading={actionLoading}
        onCancel={() => setConfirmModal(null)}
        onConfirm={startTournament}
      />
      <TournamentConfirmModal
        open={confirmModal === "leave"}
        type="leave"
        amount={formatMoney(tournament.stakeCoins, currency)}
        loading={actionLoading}
        onCancel={() => setConfirmModal(null)}
        onConfirm={leave}
      />

      <InvitePlayersModal
        open={inviteOpen}
        tournamentId={tournamentId}
        stakeLabel={formatMoney(tournament.stakeCoins, currency)}
        slotsLeft={tournament.capacity - tournament.entries.length}
        onClose={() => setInviteOpen(false)}
        onSend={sendInvites}
      />

      <button onClick={() => navigate("/tournaments")} className="btn-ghost inline-flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />Tournois
      </button>

      {/* Header */}
      <header className="card overflow-hidden rounded-3xl">
        <div className="grid lg:grid-cols-[1.1fr_.9fr]">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <span className="chip chip-accent">
                {tournament.status === "REGISTERING" ? "Inscriptions ouvertes"
                  : tournament.status === "READY_CHECK" ? "Confirmation de présence"
                  : tournament.status === "IN_PROGRESS" ? "Tournoi en cours"
                  : tournament.status === "COMPLETED" ? "Terminé"
                  : tournament.status}
              </span>
              {isCreator && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: "rgba(229,168,0,.15)", color: "var(--accent)" }}>
                  <Crown className="h-3 w-3" />Créateur
                </span>
              )}
            </div>
            <h1 className="mt-4 font-display text-4xl font-extrabold">{tournament.name?.replace(/\s*[·-]\s*d[ée]mo\s*$/i, "").trim()}</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-sub)" }}>{tournament.categoryName}</p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <Stat icon={Ticket} label="Entrée"   value={formatMoney(tournament.stakeCoins, currency)} />
              <Stat icon={Users}  label="Inscrits" value={`${tournament.entries.length}/${tournament.capacity}`} />
              <Stat icon={Trophy} label="Pot"      value={formatMoney(pot, currency)} />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {!tournament.myEntry && isRegistering && (
                <button
                  disabled={coins < tournament.stakeCoins}
                  onClick={() => setConfirmModal("join")}
                  className="btn-primary rounded-xl px-6 py-3 disabled:opacity-40"
                >
                  S'inscrire
                </button>
              )}
              {tournament.myEntry && isRegistering && !isCreator && (
                <button onClick={() => setConfirmModal("leave")} className="btn-secondary rounded-xl px-6 py-3">Se désinscrire</button>
              )}

              {/* Le créateur lance le tournoi une fois toutes les places prises */}
              {isCreator && isRegistering && (
                <button
                  disabled={!isFull}
                  onClick={() => setConfirmModal("start")}
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 disabled:opacity-40"
                  title={isFull ? "Lancer le tournoi" : "Le tournoi doit être complet"}
                >
                  <Swords className="h-4 w-4" />
                  {isFull ? "Lancer le tournoi" : `En attente (${tournament.entries.length}/${tournament.capacity})`}
                </button>
              )}

              {/* Invitation nominative — optionnelle, le tournoi reste ouvert à tous */}
              {isCreator && isRegistering && !isFull && (
                <button
                  onClick={() => { SFX.modalOpen(); setInviteOpen(true); }}
                  className="btn-secondary inline-flex items-center gap-2 rounded-xl px-6 py-3"
                >
                  <UserPlus className="h-4 w-4" />Inviter des joueurs
                </button>
              )}

              {/* Check de présence : chaque joueur confirme avant le tirage */}
              {isReadyCheck && tournament.myEntry && !tournament.myReady && (
                <button
                  onClick={markReady}
                  disabled={actionLoading}
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 disabled:opacity-40"
                >
                  <Check className="h-4 w-4" />Je suis prêt
                </button>
              )}
              {isReadyCheck && tournament.myReady && (
                <span
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold"
                  style={{ background: "var(--success-soft)", color: "var(--success)" }}
                >
                  <Check className="h-4 w-4" />Tu es prêt · en attente des autres
                </span>
              )}
              {isReadyCheck && isCreator && (
                <button onClick={cancelReady} disabled={actionLoading} className="btn-secondary rounded-xl px-6 py-3 disabled:opacity-40">
                  Annuler le lancement
                </button>
              )}
              {tournament.myNextMatchId && (
                <button onClick={play} className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3">
                  <Swords className="h-4 w-4" />Jouer mon match
                </button>
              )}
            </div>

            {error && <p className="mt-4 text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>

          <div className="min-h-52 overflow-hidden border-t lg:border-l lg:border-t-0" style={{ background: "#0B0B14", borderColor: "var(--border)" }}>
            <img src={tournamentCover(tournament)} alt={`Illustration de ${tournament.name}`} className="h-full min-h-52 w-full object-cover" />
          </div>
        </div>
      </header>

      {/* Barre de progression du check de présence */}
      {isReadyCheck && (
        <section className="card rounded-3xl p-5 sm:p-7" style={{ borderColor: "var(--accent)" }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
                Confirmation de présence
              </p>
              <h2 className="mt-1 font-display text-2xl font-extrabold">
                {readyCount} / {tournament.capacity} joueurs prêts
              </h2>
              <p className="mt-2 text-sm" style={{ color: "var(--text-sub)" }}>
                Le bracket est tiré au sort dès que tout le monde a confirmé. Aucun match ne
                démarre — et aucun forfait n'est compté — avant ce moment.
              </p>
            </div>
          </div>
          <div className="mt-5 h-2.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--accent)" }}
              initial={{ width: 0 }}
              animate={{ width: `${(readyCount / tournament.capacity) * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </section>
      )}

      {/* Joueurs inscrits — créateur voit bouton Retirer */}
      {(isRegistering || isReadyCheck) && (
        <section className="card rounded-3xl p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>Joueurs inscrits</p>
              <h2 className="mt-1 font-display text-2xl font-extrabold">{tournament.entries.length} / {tournament.capacity}</h2>
            </div>
            {isFull && (
              <span className="chip" style={{ background: "var(--success-soft)", color: "var(--success)" }}>Complet</span>
            )}
          </div>

          {tournament.entries.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucun joueur inscrit pour l'instant.</p>
          ) : (
            <ul className="space-y-2">
              {tournament.entries.map((entry, i) => (
                <li
                  key={entry.userId}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: "var(--surface-2)" }}
                >
                  <AnimeAvatar seed={entry.username} size={32} alt="" />
                  <span className="flex-1 truncate text-sm font-semibold">{entry.username}</span>
                  {i === 0 && (
                    <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>
                      <Crown className="inline h-3 w-3 mr-0.5" />Créateur
                    </span>
                  )}
                  {isReadyCheck && (
                    <span
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold"
                      style={entry.ready
                        ? { background: "var(--success-soft)", color: "var(--success)" }
                        : { background: "var(--surface-3)", color: "var(--text-faint)" }}
                    >
                      {entry.ready ? <><Check className="h-3 w-3" />Prêt</> : "En attente"}
                    </span>
                  )}
                  {isCreator && isRegistering && entry.userId !== userId && (
                    <button
                      onClick={() => kick(entry.userId)}
                      disabled={kickingId === entry.userId}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold disabled:opacity-40 transition-colors"
                      style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
                      title="Retirer du tournoi"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      {kickingId === entry.userId ? "…" : "Retirer"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Invitations envoyées, sans réponse — visibles du créateur seul.
              Elles ne réservent aucune place : le compteur d'inscrits ne bouge
              pas tant que l'invité n'a pas accepté et payé. */}
          {isCreator && (tournament.pendingInvites?.length ?? 0) > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                Invitations en attente
              </p>
              <ul className="space-y-2">
                {tournament.pendingInvites.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center gap-3 rounded-xl border border-dashed px-3 py-2.5"
                    style={{ borderColor: "var(--border-md)" }}
                  >
                    <AnimeAvatar seed={inv.username} size={32} alt="" />
                    <span className="flex-1 truncate text-sm font-semibold" style={{ color: "var(--text-sub)" }}>
                      {inv.username}
                    </span>
                    <span className="text-xs font-bold" style={{ color: "var(--text-faint)" }}>Invité</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Slots vides */}
          {!isFull && Array.from({ length: tournament.capacity - tournament.entries.length }, (_, i) => (
            <div
              key={`empty-${i}`}
              className="mt-2 flex items-center gap-3 rounded-xl border border-dashed px-3 py-2.5"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="h-8 w-8 rounded-full" style={{ background: "var(--surface-3)" }} />
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>En attente d'un joueur…</span>
            </div>
          ))}
        </section>
      )}

      {/* Répartition des gains */}
      <section className="card rounded-3xl p-5 sm:p-7">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
            <Trophy className="inline h-3.5 w-3.5 mr-1" />Répartition des gains
          </p>
          <h2 className="mt-1 font-display text-2xl font-extrabold">Pot : {formatMoney(pot, currency)}</h2>
        </div>
        <div className="space-y-2">
          {prizes.map((p) => (
            <div
              key={p.rank}
              className="flex items-center justify-between rounded-2xl px-4 py-3"
              style={{ background: p.rank === 1 ? "rgba(229,168,0,.12)" : "var(--surface-2)" }}
            >
              <span className="text-sm font-semibold">{p.label}</span>
              <div className="text-right">
                <span className="text-base font-extrabold" style={{ color: p.rank === 1 ? "var(--accent)" : "var(--text)" }}>
                  {formatMoney(p.coins, currency)}
                </span>
                {p.each && <span className="ml-1 text-xs" style={{ color: "var(--text-faint)" }}>chacun</span>}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: "var(--surface-2)" }}>
            <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-sub)" }}>
              <Info className="h-3.5 w-3.5" />Commission plateforme (10%)
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--text-faint)" }}>{formatMoney(platformCut, currency)}</span>
          </div>
        </div>
      </section>

      {/* Bracket */}
      <section className="card overflow-x-auto rounded-3xl p-5 sm:p-7">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-qa">Tableau à élimination</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold">Bracket officiel</h2>
          </div>
          <span className="chip">{tournament.capacity} joueurs</span>
        </div>
        {tournament.bracket.length ? (
          <div className="flex min-w-max items-stretch gap-8 pb-2">
            {tournament.bracket.map((round, index) => (
              <div key={round.round} className="relative flex w-72 flex-col">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-orange-qa">{round.label}</p>
                <div className="flex flex-1 flex-col justify-around gap-4">
                  {round.matches.map((match) => <BracketMatch key={match.id} match={match} />)}
                </div>
                {index < tournament.bracket.length - 1 && (
                  <div className="absolute -right-5 top-11 bottom-5 w-px" style={{ background: "var(--accent)" }} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <ProvisionalBracket entries={tournament.entries} capacity={tournament.capacity} />
        )}
      </section>
    </div>
  );
}

/* ─── Modal de sélection des joueurs à inviter ─── */
function InvitePlayersModal({ open, tournamentId, stakeLabel, slotsLeft, onClose, onSend }) {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Recherche débouncée : la liste par défaut (query vide) montre déjà les
  // premiers joueurs invitables, on ne force donc pas à taper pour voir du monde.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      api.getInvitablePlayers(tournamentId, query.trim().length >= 2 ? query.trim() : "")
        .then((d) => { if (!cancelled) setPlayers(d.players || []); })
        .catch(() => { if (!cancelled) setPlayers([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, tournamentId, query]);

  useEffect(() => { if (!open) { setSelected([]); setQuery(""); } }, [open]);

  const toggle = (id) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const dismiss = () => { SFX.cancel(); onClose(); };

  const send = async () => {
    if (!selected.length || sending) return;
    setSending(true);
    try { await onSend(selected); onClose(); }
    catch { /* l'erreur est affichée par la page appelante */ }
    finally { setSending(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)" }}
            onClick={dismiss}
          />
          <motion.div
            className="relative flex w-full max-w-md flex-col rounded-3xl p-6"
            style={{ background: "var(--surface)", border: "1px solid var(--border-md)", maxHeight: "82vh" }}
            initial={{ y: 48, opacity: 0, scale: .96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 48, opacity: 0, scale: .96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <button
              onClick={dismiss}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full transition"
              style={{ background: "var(--surface-2)", color: "var(--text-faint)" }}
            >
              <X className="h-4 w-4" />
            </button>

            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--accent)" }}>
              Inviter des joueurs
            </p>
            <h3 className="font-display text-xl font-extrabold">Choisis qui défier</h3>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-sub)" }}>
              L'invitation ne réserve pas de place et ne débite rien. Chaque joueur
              reçoit une notification et ne paie les {stakeLabel} qu'en acceptant.
            </p>

            {/* Recherche */}
            <div className="mt-4 flex items-center gap-2 rounded-2xl px-4 py-3"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <Search className="h-4 w-4 shrink-0" style={{ color: "var(--text-faint)" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Chercher un pseudo…"
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: "var(--text)" }}
              />
            </div>

            {/* Liste */}
            <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto">
              {loading ? (
                <p className="py-6 text-center text-sm" style={{ color: "var(--text-faint)" }}>Recherche…</p>
              ) : players.length === 0 ? (
                <p className="py-6 text-center text-sm" style={{ color: "var(--text-faint)" }}>
                  {query ? "Aucun joueur trouvé." : "Aucun joueur invitable pour l'instant."}
                </p>
              ) : (
                players.map((p) => {
                  const on = selected.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition"
                      style={{
                        background: on ? "rgba(229,168,0,.12)" : "var(--surface-2)",
                        border: `1px solid ${on ? "var(--accent)" : "transparent"}`,
                      }}
                    >
                      <AnimeAvatar seed={p.username} size={32} alt="" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{p.username}</span>
                        {p.region && (
                          <span className="block truncate text-xs" style={{ color: "var(--text-faint)" }}>{p.region}</span>
                        )}
                      </span>
                      <span
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-md"
                        style={{
                          background: on ? "var(--accent)" : "transparent",
                          border: `1.5px solid ${on ? "var(--accent)" : "var(--border-md)"}`,
                          color: "#000",
                        }}
                      >
                        {on && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Avertissement : plus de sélectionnés que de places restantes */}
            {selected.length > slotsLeft && (
              <p className="mt-3 rounded-xl px-3 py-2 text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                Il ne reste que {slotsLeft} place{slotsLeft > 1 ? "s" : ""}. Les invitations
                partiront quand même : les premiers à accepter prendront les places.
              </p>
            )}

            <button
              onClick={send}
              disabled={!selected.length || sending}
              className="btn-primary mt-4 w-full rounded-2xl py-3.5 font-bold disabled:opacity-40"
            >
              {sending
                ? "Envoi…"
                : selected.length
                ? `Inviter ${selected.length} joueur${selected.length > 1 ? "s" : ""}`
                : "Sélectionne au moins un joueur"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Modal confirmation inscription / désinscription ─── */
function TournamentConfirmModal({ open, type, amount, loading, onCancel, onConfirm }) {
  const isJoin = type === "join";
  const isStart = type === "start";
  // Le son de résultat est joué par le handler appelant (il connaît la
  // réponse du serveur) — ici on ne signale que l'ouverture et l'abandon.
  useEffect(() => { if (open) SFX.modalOpen(); }, [open]);
  const dismiss = () => { SFX.cancel(); onCancel?.(); };
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)" }}
            onClick={!loading ? dismiss : undefined}
          />
          {/* Carte */}
          <motion.div
            className="relative w-full max-w-sm rounded-3xl p-6"
            style={{ background: "var(--surface)", border: "1px solid var(--border-md)" }}
            initial={{ y: 48, opacity: 0, scale: .96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 48, opacity: 0, scale: .96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            {/* Icône */}
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl"
              style={{ background: isJoin || isStart ? "rgba(229,168,0,.15)" : "rgba(244,63,94,.1)", color: isJoin || isStart ? "var(--accent)" : "var(--danger)" }}>
              {isStart ? <Swords className="h-8 w-8" /> : isJoin ? <Trophy className="h-8 w-8" /> : <X className="h-8 w-8" />}
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-center mb-1"
              style={{ color: isJoin || isStart ? "var(--accent)" : "var(--danger)" }}>
              {isStart ? "Lancement du tournoi" : isJoin ? "Confirmation d'inscription" : "Confirmation de désinscription"}
            </p>
            <h3 className="font-display text-xl font-extrabold text-center mb-2">
              {isStart ? "Lancer le tournoi ?" : isJoin ? "Rejoindre ce tournoi ?" : "Quitter ce tournoi ?"}
            </h3>
            <p className="text-sm text-center leading-relaxed mb-6" style={{ color: "var(--text-sub)" }}>
              {isStart
                ? `Les ${amount} vont recevoir une demande de confirmation de présence. Le bracket ne sera tiré au sort qu'une fois tout le monde prêt.`
                : isJoin
                ? `La mise de ${amount} sera débitée de ton solde. Elle sera remboursée si le tournoi n'atteint pas sa capacité.`
                : `Tu seras retiré du bracket et ${amount} te seront remboursés immédiatement.`}
            </p>

            <div className="flex gap-3">
              <button
                onClick={dismiss}
                disabled={loading}
                className="btn-secondary flex-1 rounded-2xl py-3 font-bold disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 rounded-2xl py-3 font-bold inline-flex items-center justify-center gap-2 transition disabled:opacity-40"
                style={{
                  background: isJoin || isStart ? "var(--accent)" : "var(--danger)",
                  color: isJoin || isStart ? "#000" : "#fff",
                }}
              >
                {loading ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: .8, repeat: Infinity, ease: "linear" }}
                    className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent"
                  />
                ) : (
                  <><Check className="h-4 w-4" />{isStart ? "Lancer" : isJoin ? "Confirmer" : "Se désinscrire"}</>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
      <Icon className="h-4 w-4 text-orange-qa" />
      <p className="mt-2 text-[10px] uppercase" style={{ color: "var(--text-sub)" }}>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function BracketMatch({ match }) {
  return (
    <article
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor: match.status === "IN_PROGRESS" ? "var(--accent)" : "var(--border)",
        background: "var(--surface-2)",
      }}
    >
      <BracketPlayer player={match.playerA} winner={match.winnerId === match.playerA?.id} />
      <div className="mx-3 h-px" style={{ background: "var(--divider)" }} />
      <BracketPlayer player={match.playerB} winner={match.winnerId === match.playerB?.id} />
      <p
        className="border-t px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
        style={{ borderColor: "var(--divider)", color: "var(--text-faint)" }}
      >
        {match.status === "READY" ? "Prêt à jouer"
          : match.status === "IN_PROGRESS" ? "En direct"
          : match.status === "COMPLETED" ? "Terminé"
          : "En attente"}
      </p>
    </article>
  );
}

function BracketPlayer({ player, winner }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <AnimeAvatar seed={player?.username || "arena"} alt="" size={28} />
      <strong
        className="min-w-0 flex-1 truncate text-sm"
        style={{ color: winner ? "var(--accent)" : "var(--text)" }}
      >
        {player?.username || "À déterminer"}
      </strong>
      {winner && <Trophy className="h-4 w-4 text-orange-qa" />}
    </div>
  );
}

function ProvisionalBracket({ entries, capacity }) {
  const firstRound = Array.from({ length: capacity / 2 }, (_, i) => ({
    id: `slot-${i}`,
    playerA: entries[i * 2]?.username,
    playerB: entries[i * 2 + 1]?.username,
  }));
  const nextRounds = Math.log2(capacity) - 1;

  return (
    <>
      <p className="mb-5 text-sm" style={{ color: "var(--text-sub)" }}>
        Positions provisoires en direct : les places vides seront remplies à chaque inscription.
        Le tirage devient définitif au lancement.
      </p>
      <div className="flex min-w-max items-stretch gap-8 pb-2">
        <div className="relative flex w-72 flex-col">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-orange-qa">Premier tour</p>
          <div className="flex flex-1 flex-col justify-around gap-4">
            {firstRound.map((match) => (
              <BracketMatch key={match.id} match={{
                ...match,
                status: match.playerA && match.playerB ? "READY" : "PENDING",
                winnerId: null,
                playerA: match.playerA ? { username: match.playerA, id: match.playerA } : null,
                playerB: match.playerB ? { username: match.playerB, id: match.playerB } : null,
              }} />
            ))}
          </div>
          <div className="absolute -right-5 top-11 bottom-5 w-px" style={{ background: "var(--accent)" }} />
        </div>
        {Array.from({ length: nextRounds }, (_, ri) => {
          const size = capacity / (2 ** (ri + 2));
          const isFinal = size === 1;
          return (
            <div key={ri} className="relative flex w-72 flex-col">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-orange-qa">
                {isFinal ? "Finale" : "Tour suivant"}
              </p>
              <div className="flex flex-1 flex-col justify-around gap-4">
                {Array.from({ length: size }, (_, mi) => (
                  <BracketMatch key={mi} match={{ status: "PENDING", winnerId: null, playerA: null, playerB: null }} />
                ))}
              </div>
              {!isFinal && (
                <div className="absolute -right-5 top-11 bottom-5 w-px" style={{ background: "var(--accent)" }} />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
