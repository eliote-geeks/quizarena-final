import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import * as api from "../lib/api";
import { ArrowLeft, ChevronLeft, ChevronRight, Crown, Flag, Swords, Target, Trophy, Wifi, WifiOff, X } from "lucide-react";
import AnimeAvatar from "../components/AnimeAvatar";

const REPORT_REASONS = [
  { value: "CHEATING",    label: "Triche / bot"          },
  { value: "HARASSMENT",  label: "Harcèlement"           },
  { value: "SPAM",        label: "Spam"                  },
  { value: "BUG",         label: "Comportement anormal"  },
  { value: "OTHER",       label: "Autre"                 },
];
const DISPLAY_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const formatDisplayDate = (value) => value ? DISPLAY_DATE.format(new Date(value)) : "Date indisponible";

export default function PlayerPage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, currency } = useApp();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("OTHER");
  const [reportDetail, setReportDetail] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportMsg, setReportMsg] = useState("");
  const [duelsPage, setDuelsPage] = useState(1);

  useEffect(() => { setDuelsPage(1); }, [username]);
  useEffect(() => {
    api.getPlayerProfile(username, duelsPage, 5).then(setProfile).catch((err) => setError(err.message));
  }, [username, duelsPage]);

  const sendReport = async () => {
    setReportBusy(true);
    setReportMsg("");
    try {
      await api.reportPlayer(username, reportReason, reportDetail);
      setReportMsg("Signalement transmis à la modération. Merci.");
      setTimeout(() => setShowReport(false), 2000);
    } catch (err) {
      setReportMsg(err.message || "Impossible d'envoyer le signalement.");
    } finally {
      setReportBusy(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-full px-5 py-8">
        <button onClick={() => navigate(-1)} className="btn-ghost">← Retour</button>
        <p className="mt-12 text-center text-sm" style={{ color: "var(--danger)" }}>{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-full px-5 py-8">
        <button onClick={() => navigate(-1)} className="btn-ghost">← Retour</button>
        <p className="mt-12 text-center text-sm text-ink-soft-qa">Chargement…</p>
      </div>
    );
  }

  const isSelf = profile.username === user?.name;
  const winRate = profile.stats.duelsPlayed > 0
    ? Math.round((profile.stats.duelsWon / profile.stats.duelsPlayed) * 100)
    : 0;

  return (
    <div className="min-h-full px-4 sm:px-6 py-8 max-w-3xl mx-auto space-y-6">

      <button onClick={() => navigate(-1)} className="btn-ghost inline-flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      {/* En-tête profil */}
      <section className="card rounded-3xl p-6">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <AnimeAvatar seed={profile.username} src={profile.avatarUrl} alt={`Avatar de ${profile.username}`} size={80} className="border" />

          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold truncate">
              {profile.isVip && <Crown className="h-6 w-6 shrink-0" style={{ color: "var(--accent)" }} />}
              <span className="truncate">{profile.username}</span>
            </h1>
            <p
              className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium"
              style={{ color: profile.online ? "var(--success)" : "var(--text-sub)" }}
            >
              {profile.online
                ? <><Wifi className="h-4 w-4" /> En ligne</>
                : <><WifiOff className="h-4 w-4" /> Hors ligne</>
              }
            </p>
            {profile.region && (
              <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>{profile.region}</p>
            )}
          </div>
        </div>

        {!isSelf && (
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              disabled={!profile.online}
              onClick={() => navigate("/duel", { state: { challengeUsername: profile.username } })}
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm disabled:opacity-40"
            >
              <Swords className="h-4 w-4" /> Défier en duel
            </button>
            <button
              onClick={() => { setShowReport(true); setReportMsg(""); }}
              className="btn-secondary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm"
            >
              <Flag className="h-4 w-4" /> Signaler
            </button>
          </div>
        )}
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Swords} label="Duels joués" value={profile.stats.duelsPlayed} />
        <StatCard icon={Trophy} label="Victoires" value={profile.stats.duelsWon} accent />
        <StatCard icon={Target} label="Réussite" value={`${winRate}%`} />
        <StatCard icon={Trophy} label="Gains totaux" value={formatMoney(profile.stats.winningsCoins, currency)} accent />
      </section>

      {/* Duels récents */}
      <section>
        <h2 className="mb-3 font-display text-2xl font-bold">Duels récents</h2>
        <div className="card overflow-hidden rounded-2xl">
          {profile.recentDuels.length === 0 ? (
            <p className="p-6 text-center text-sm" style={{ color: "var(--text-sub)" }}>
              Aucun duel terminé.
            </p>
          ) : (
            profile.recentDuels.map((match) => {
              const isA = match.playerA === profile.username;
              const myScore = isA ? match.scoreA : match.scoreB;
              const oppScore = isA ? match.scoreB : match.scoreA;
              const opp = isA ? match.playerB : match.playerA;
              const oppAvatarUrl = isA ? match.playerBAvatarUrl : match.playerAAvatarUrl;
              const won = match.winnerId === profile.id;
              const draw = !match.winnerId;
              return (
                <button
                  key={match.id}
                  onClick={() => navigate(`/player/${opp}`)}
                  className="grid w-full grid-cols-[auto_auto_1fr_auto] items-center gap-3 border-b px-4 py-3 text-left last:border-0 transition hover:opacity-80"
                  style={{ borderColor: "var(--divider)" }}
                >
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-extrabold"
                    style={{
                      background: draw ? "var(--surface-3)" : won ? "var(--success-soft)" : "var(--danger-soft)",
                      color: draw ? "var(--text-faint)" : won ? "var(--success)" : "var(--danger)",
                    }}
                  >
                    {draw ? "=" : won ? "V" : "D"}
                  </span>
                  <AnimeAvatar seed={opp} src={oppAvatarUrl} alt="" size={32} className="border" />
                  <div className="min-w-0">
                    <strong className="text-sm truncate">vs {opp}</strong>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--text-sub)" }}>
                      {myScore}–{oppScore} · {formatDisplayDate(match.completedAt)}
                    </p>
                  </div>
                  <strong className="text-sm" style={{ color: "var(--accent)" }}>
                    {formatMoney(match.stakeCoins, currency)}
                  </strong>
                </button>
              );
            })
          )}
        </div>
        {profile.recentDuels.length > 0 && (
          <nav className="mt-3 flex items-center justify-between" aria-label="Pagination duels">
            <button disabled={duelsPage <= 1} onClick={() => setDuelsPage((p) => p - 1)} className="btn-secondary inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />Précédent
            </button>
            <span className="text-xs font-bold" style={{ color: "var(--text-sub)" }}>Page {profile.duelsPage} sur {profile.duelsTotalPages}</span>
            <button disabled={duelsPage >= profile.duelsTotalPages} onClick={() => setDuelsPage((p) => p + 1)} className="btn-secondary inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs disabled:opacity-30">
              Suivant<ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        )}
      </section>

      {/* Modal signalement */}
      {showReport && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border-md)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Signaler {profile.username}</h2>
              <button onClick={() => setShowReport(false)} className="p-1.5 rounded-lg" style={{ color: "var(--text-faint)" }}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase" style={{ color: "var(--text-faint)" }}>
                Motif
              </label>
              <div className="grid grid-cols-1 gap-2">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setReportReason(r.value)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-left transition"
                    style={{
                      background: reportReason === r.value ? "var(--accent-soft)" : "var(--surface-2)",
                      border: `1px solid ${reportReason === r.value ? "var(--accent)" : "var(--border)"}`,
                      color: reportReason === r.value ? "var(--accent)" : "var(--text)",
                      fontWeight: reportReason === r.value ? 700 : 500,
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase" style={{ color: "var(--text-faint)" }}>
                Détail (facultatif)
              </label>
              <textarea
                value={reportDetail}
                onChange={(e) => setReportDetail(e.target.value)}
                placeholder="Décris ce qui s'est passé…"
                rows={3}
                className="mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>

            {reportMsg && (
              <p
                className="text-sm rounded-xl px-4 py-3"
                style={{
                  background: reportMsg.includes("transmis") ? "var(--success-soft)" : "var(--danger-soft)",
                  color: reportMsg.includes("transmis") ? "var(--success)" : "var(--danger)",
                }}
              >
                {reportMsg}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowReport(false)}
                className="btn-secondary flex-1 rounded-xl py-3 text-sm"
              >
                Annuler
              </button>
              <button
                onClick={sendReport}
                disabled={reportBusy}
                className="btn-primary flex-1 rounded-xl py-3 text-sm disabled:opacity-50"
              >
                {reportBusy ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="card rounded-2xl p-4">
      <Icon className="h-4 w-4" style={{ color: accent ? "var(--accent)" : "var(--text-sub)" }} />
      <p className="mt-3 text-xs" style={{ color: "var(--text-sub)" }}>{label}</p>
      <strong
        className="mt-1 block text-xl"
        style={{ color: accent ? "var(--accent)" : "var(--text)" }}
      >
        {value}
      </strong>
    </div>
  );
}
