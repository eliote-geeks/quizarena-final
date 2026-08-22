import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import { Block, ConfirmModal, Label, Loader, Tag } from "../ui";
import { NavIcon } from "../ui/icons";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import { ClanEmblem } from "../lib/clanEmblems";
import * as duel from "../lib/duelSocket";

const REASON_LABELS = {
  CHEATING: "Triche présumée",
  HARASSMENT: "Harcèlement",
  SPAM: "Spam / flooding",
  BUG: "Exploitation de bug",
  OTHER: "Autre",
};

/**
 * Profil public d'un joueur — accessible via /player/:username.
 * Affiche stats, clan, historique de duels récents et bouton "Défier".
 */
export default function PlayerProfile() {
  const { username } = useParams();
  const nav = useNavigate();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [challenging, setChallenging] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("CHEATING");
  const [reportDetail, setReportDetail] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [confirmChallenge, setConfirmChallenge] = useState(false);

  useEffect(() => {
    setProfile(null);
    setError("");
    api.getPlayerProfile(username)
      .then(setProfile)
      .catch(() => setError("Joueur introuvable ou profil inaccessible."));
  }, [username]);

  const isMe = profile?.id === me?.id;

  const challenge = async () => {
    setChallenging(true);
    setConfirmChallenge(false);
    try {
      // Naviguer vers DuelSetup avec le pseudo pré-rempli comme cible d'invitation
      nav("/duel", { state: { challengeUsername: username } });
    } finally {
      setChallenging(false);
    }
  };

  const sendReport = async () => {
    setReportBusy(true);
    try {
      await api.reportPlayer(username, reportReason, reportDetail.trim() || undefined);
      setReportDone(true);
      setTimeout(() => setShowReport(false), 2000);
    } catch (e) {
      alert(e.message || "Erreur lors du signalement");
    } finally {
      setReportBusy(false);
    }
  };

  if (error) return (
    <div className="mx-auto w-full max-w-[720px] px-5 pt-16 text-center">
      <p className="t-body text-bone-4">{error}</p>
      <button onClick={() => nav(-1)} className="t-label mt-4 text-bone-4 hover:text-flare">← retour</button>
    </div>
  );

  if (!profile) return <Loader full />;

  const winRate = profile.stats.duelsPlayed > 0
    ? Math.round((profile.stats.duelsWon / profile.stats.duelsPlayed) * 100)
    : 0;

  return (
    <div className="mx-auto w-full max-w-[720px] px-5 pt-8 pb-16 sm:px-8 sm:pt-12">
      <button onClick={() => nav(-1)} className="t-label text-bone-4 hover:text-flare">← retour</button>

      {/* ── En-tête profil ── */}
      <div className="mt-6 flex items-start gap-5">
        <div className="relative shrink-0">
          <img
            src={api.avatarUrl(profile.username)}
            alt={profile.username}
            className="h-20 w-20 rounded-full object-cover ring-2 ring-flare/30 sm:h-24 sm:w-24"
          />
          {profile.online && (
            <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-live ring-2 ring-ink" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="t-display text-2xl font-black">{profile.username}</h1>
            {profile.clan && (
              <span
                className="t-label rounded px-1.5 py-1 text-[11px] font-bold"
                style={{ background: (profile.clan.bannerColor ?? "#f59e0b") + "25", color: profile.clan.bannerColor ?? "#f59e0b" }}
              >
                [{profile.clan.tag}]
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 flex-wrap">
            {profile.online ? (
              <Tag tone="live">● En ligne</Tag>
            ) : (
              <span className="t-label text-[11px] text-bone-4">Hors ligne</span>
            )}
            {profile.region && (
              <span className="t-body text-xs text-bone-4">{profile.region}</span>
            )}
            <span className="t-body text-xs text-bone-4">
              Membre depuis {new Date(profile.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </span>
          </div>
          {profile.clan && (
            <button
              onClick={() => nav(`/clans/${profile.clan.id}`)}
              className="mt-3 flex items-center gap-2 rounded-xl bg-ink-2 px-2.5 py-2 text-left transition hover:bg-ink-3"
            >
              <ClanEmblem emblemKey={profile.clan.emblemKey} tag={profile.clan.tag} color={profile.clan.bannerColor} size="sm" />
              <span><span className="t-label block text-[9px] text-bone-4">{profile.clanRole === "leader" ? "chef de clan" : "clan"}</span><span className="t-title text-xs text-flare">{profile.clan.name} ›</span></span>
            </button>
          )}
        </div>
      </div>

      {/* ── Actions ── */}
      {!isMe && (
        <div className="mt-6 flex gap-3">
          <Block
            icon={<NavIcon type="swords" className="h-4 w-4" />}
            onClick={() => setConfirmChallenge(true)}
            loading={challenging}
            className="flex-1"
          >
            Défier en duel
          </Block>
          <button
            onClick={() => setShowReport(true)}
            className="press flex h-10 items-center gap-1.5 rounded-(--radius-card) bg-ink-3 px-3 text-xs text-bone-4 hover:text-danger transition-colors"
          >
            <NavIcon type="flag" className="h-3.5 w-3.5" />
            Signaler
          </button>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="mt-8">
        <Label className="mb-4">statistiques</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Gains totaux" value={profile.stats.winningsCoins.toLocaleString("fr-FR") + " F"} accent />
          <StatCard label="Duels joués" value={profile.stats.duelsPlayed} />
          <StatCard label="Victoires" value={profile.stats.duelsWon} />
          <StatCard label="Taux de victoire" value={winRate + " %"} />
        </div>
        {profile.stats.totalGames > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <StatCard label="Parties jouées" value={profile.stats.totalGames} />
            <StatCard label="Moy. score/partie" value={Math.round(profile.stats.avgScore) + " pts"} />
          </div>
        )}
      </div>

      {/* ── Derniers duels ── */}
      {profile.recentDuels.length > 0 && (
        <div className="mt-8">
          <Label className="mb-4">duels récents</Label>
          <div className="flex flex-col gap-2">
            {profile.recentDuels.map((d) => {
              const isA = d.playerA === profile.username;
              const myScore = isA ? d.scoreA : d.scoreB;
              const oppScore = isA ? d.scoreB : d.scoreA;
              const opp = isA ? d.playerB : d.playerA;
              const won = d.winnerId && (
                (isA && d.scoreA > d.scoreB) || (!isA && d.scoreB > d.scoreA)
              );
              const lost = d.winnerId && !won && d.winnerId !== null;
              const tie = !d.winnerId || d.scoreA === d.scoreB;
              return (
                <div key={d.id} className="flex items-center gap-3 rounded-(--radius-card) bg-ink-2 px-4 py-3">
                  <div
                    className={clsx(
                      "t-label shrink-0 rounded px-2 py-1 text-[11px] font-black",
                      won ? "bg-live/15 text-live" : lost ? "bg-danger/15 text-danger" : "bg-bone-4/15 text-bone-4"
                    )}
                  >
                    {won ? "V" : lost ? "D" : "="}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="t-body text-sm text-bone-2">vs {opp}</span>
                    <div className="t-label mt-0.5 text-[11px] text-bone-4">
                      {myScore} – {oppScore} · {d.stakeCoins.toLocaleString("fr-FR")} F
                    </div>
                  </div>
                  <span className="t-body text-[11px] text-bone-4 shrink-0">
                    {new Date(d.completedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal signalement ── */}
      {showReport && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-ink/70 backdrop-blur-[3px] px-5">
          <div className="anim-rise w-full max-w-sm rounded-(--radius-panel) bg-ink-2 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="t-display text-lg">Signaler {profile.username}</h3>
              <button onClick={() => setShowReport(false)} className="text-bone-4 hover:text-bone">
                <NavIcon type="x" className="h-5 w-5" />
              </button>
            </div>

            {reportDone ? (
              <p className="t-body text-center text-live py-4">✓ Signalement envoyé. Merci !</p>
            ) : (
              <>
                <label className="t-label mb-2 block text-xs text-bone-4">Motif</label>
                <div className="flex flex-col gap-2 mb-4">
                  {Object.entries(REASON_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setReportReason(key)}
                      className={clsx(
                        "press flex items-center gap-2.5 rounded-(--radius-card) px-3 py-2.5 text-sm text-left transition-colors",
                        reportReason === key ? "bg-danger/15 text-danger" : "bg-ink-3 text-bone-3 hover:bg-ink-4"
                      )}
                    >
                      <span className={clsx("h-2 w-2 rounded-full shrink-0", reportReason === key ? "bg-danger" : "bg-bone-4")} />
                      {label}
                    </button>
                  ))}
                </div>

                <label className="t-label mb-1.5 block text-xs text-bone-4">Détails (facultatif)</label>
                <textarea
                  value={reportDetail}
                  onChange={(e) => setReportDetail(e.target.value)}
                  placeholder="Décrivez ce que vous avez observé…"
                  rows={3}
                  className="w-full rounded-(--radius-card) bg-ink-3 px-3 py-2 text-sm text-bone outline-none resize-none mb-5 border border-transparent focus:border-danger/40 transition-colors"
                  maxLength={400}
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowReport(false)}
                    className="flex-1 rounded-(--radius-card) bg-ink-3 py-2.5 text-sm text-bone-4 hover:bg-ink-4"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={sendReport}
                    disabled={reportBusy}
                    className={clsx(
                      "flex-1 rounded-(--radius-card) py-2.5 text-sm font-bold transition-colors",
                      reportBusy ? "bg-danger/30 text-danger/50" : "bg-danger/20 text-danger hover:bg-danger/30"
                    )}
                  >
                    {reportBusy ? "Envoi…" : "Envoyer le signalement"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal confirmer défi ── */}
      <ConfirmModal
        open={confirmChallenge}
        title={`Défier ${profile.username} ?`}
        message="Tu seras redirigé vers la configuration du duel. Tu pourras choisir ta mise et envoyer une invitation."
        confirmLabel="Créer l'invitation"
        onConfirm={challenge}
        onCancel={() => setConfirmChallenge(false)}
      />
    </div>
  );
}

function StatCard({ label, value, accent = false }) {
  return (
    <div className="rounded-(--radius-card) bg-ink-2 px-4 py-3">
      <div className={clsx("t-display text-xl font-black", accent ? "text-flare" : "text-bone")}>{value}</div>
      <div className="t-label mt-1 text-[11px] text-bone-4">{label}</div>
    </div>
  );
}
