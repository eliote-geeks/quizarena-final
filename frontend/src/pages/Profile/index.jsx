import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import * as api from "../../lib/api";
import { BookOpen, Crown, Swords, Target, Trophy, Zap } from "lucide-react";
import { formatDate } from "../../lib/dateTime";
import AvatarUpload from "./AvatarUpload";
import Settings from "./Settings";
import SessionsList from "./SessionsList";
import History from "./History";

export default function Profile() {
  const navigate = useNavigate();
  const { user, stats, isVip, vipSource, refreshSession } = useApp();
  const [history, setHistory] = useState([]);
  const [duels, setDuels] = useState([]);
  const [duelsPage, setDuelsPage] = useState(1);
  const [duelsTotalPages, setDuelsTotalPages] = useState(1);

  useEffect(() => {
    refreshSession().catch(() => {});
    api.getQuizHistory().then((result) => setHistory(result.history || [])).catch(() => {});
  }, [refreshSession]);

  // Historique des duels paginé (31/08, retour Paul : "pagine en 5 en 5") —
  // recharge la page côté serveur au changement de page plutôt que de tout
  // charger d'un coup.
  useEffect(() => {
    api.getDuelHistory(duelsPage, 5)
      .then((result) => { setDuels(result.matches || []); setDuelsTotalPages(result.pages || 1); })
      .catch(() => {});
  }, [duelsPage]);

  return (
    <div className="min-h-full px-4 sm:px-6 py-8 max-w-4xl mx-auto space-y-7">
      <header className="card rounded-3xl p-6" style={isVip ? { borderColor: "var(--accent)" } : undefined}>
        <div className="flex flex-wrap items-center gap-5">
          <span className="relative">
            <AvatarUpload user={user} refreshSession={refreshSession} />
            {isVip && (
              <span className="absolute -top-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2" style={{ background: "var(--accent)", color: "#09080a", borderColor: "var(--surface)" }}>
                <Crown className="h-4 w-4" />
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-4xl font-extrabold">{user?.name}</h1>
              {isVip && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider" style={{ background: "var(--accent)", color: "#09080a" }}>
                  <Crown className="h-3.5 w-3.5" />VIP
                </span>
              )}
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--text-sub)" }}>Membre depuis {formatDate(user?.createdAt, "—")}</p>
            {isVip && (
              <p className="mt-2 text-xs font-bold" style={{ color: "var(--accent)" }}>
                {vipSource === "ADMIN" ? "Statut VIP accordé par l’administration" : "Statut VIP obtenu par performance"}
              </p>
            )}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Swords} label="Parties" value={stats?.totalGames ?? 0} />
        <Stat icon={Trophy} label="Taux victoire" value={`${Math.round((stats?.winRateGlobal ?? 0) * 100)}%`} />
        <Stat icon={Target} label="Score moyen" value={typeof stats?.avgScore === "number" ? stats.avgScore.toFixed(1) : "—"} />
        <Stat icon={Zap} label="Duels gagnés" value={stats?.duelsWon30d ?? 0} />
      </section>

      <Settings user={user} refreshSession={refreshSession} />
      <SessionsList />
      <History title="Quiz récents" items={history} solo />
      <History
        title="Historique des duels"
        items={duels}
        myUsername={user?.username}
        onSelectOpponent={(opp) => navigate(`/player/${opp}`)}
        page={duelsPage}
        totalPages={duelsTotalPages}
        onPageChange={setDuelsPage}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Action icon={BookOpen} label="Règles" onClick={() => navigate("/rules")} />
        <Action icon={Zap} label="Revoir le tutoriel" onClick={() => navigate("/tutorial")} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="card rounded-2xl p-4">
      <Icon className="h-4 w-4" style={{ color: "var(--accent)" }} />
      <p className="mt-3 text-xs" style={{ color: "var(--text-sub)" }}>{label}</p>
      <strong className="mt-1 block text-2xl">{value}</strong>
    </div>
  );
}

function Action({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="card card-hover flex items-center gap-3 rounded-2xl p-4 text-left">
      <Icon className="h-5 w-5" style={{ color: "var(--accent)" }} />
      <strong className="text-sm">{label}</strong>
    </button>
  );
}
