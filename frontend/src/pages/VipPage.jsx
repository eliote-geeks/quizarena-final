import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ArrowRight, BadgeCheck, Crown, Lock, Swords, Trophy, Unlock } from "lucide-react";

const TARGET = 30;

export default function VipPage() {
  const navigate = useNavigate();
  const { wins, isVip, vipSource, stats } = useApp();
  const appointedByAdmin = vipSource === "ADMIN";
  const monthlyWins = Math.min(wins, TARGET);
  const remaining = Math.max(TARGET - monthlyWins, 0);
  const progress = appointedByAdmin ? 100 : Math.min(100, (monthlyWins / TARGET) * 100);

  return (
    <div className="min-h-full px-4 sm:px-6 py-8 max-w-3xl mx-auto space-y-6">

      {/* Hero — traitement "premium" : mesh doré + halo derrière la
          couronne, plutôt qu'un simple aplat sombre (retour Paul du
          31/08, "fait plus premium"). */}
      <section
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{ background: "#1A1400", border: "1px solid rgba(229,168,0,.22)" }}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden="true" style={{
          background:
            "radial-gradient(30rem 22rem at 90% -10%, rgba(229,168,0,.16), transparent 60%)," +
            "radial-gradient(24rem 20rem at -5% 110%, rgba(229,168,0,.10), transparent 55%)",
        }} />
        <div className="relative flex items-center gap-3 mb-6">
          <div
            className="relative h-12 w-12 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(155deg, #FFD666, var(--accent) 55%, #A77700)", boxShadow: "0 10px 28px -6px var(--accent-glow)" }}
          >
            <Crown className="h-6 w-6" style={{ color: "#3A2900" }} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-orange-qa">Statut VIP</div>
            <div className="font-display text-xl font-extrabold text-white">
              {isVip ? "Actif" : "Verrouillé"}
            </div>
          </div>
          {isVip && (
            <span
              className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              <Unlock className="h-3 w-3" /> Débloqué
            </span>
          )}
        </div>

        <p className="relative text-sm leading-6 text-white/60 max-w-md mb-6">
          {appointedByAdmin
            ? <>L’administration vous a nommé <strong className="text-white">VIP</strong>. Les droits VIP sont actifs immédiatement sur votre compte.</>
            : <>Remporte <strong className="text-white">30 duels</strong> sur les 30 derniers jours pour débloquer les outils VIP. La progression est calculée par le serveur.</>}
        </p>

        {/* Barre de progression */}
        <div
          className="relative rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase text-white/40">{appointedByAdmin ? "Accès accordé" : "Victoires sur 30 jours"}</p>
              <p className="mt-1 font-display text-5xl font-extrabold text-orange-qa">
                {appointedByAdmin ? "VIP" : monthlyWins}
                {!appointedByAdmin && <span className="text-2xl text-white/30">/{TARGET}</span>}
              </p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
              style={{
                background: isVip ? "var(--success-soft)" : "var(--accent-soft)",
                color: isVip ? "var(--success)" : "var(--accent)",
              }}
            >
              {isVip ? (appointedByAdmin ? "Nommé VIP" : "VIP actif") : `${remaining} restante${remaining !== 1 ? "s" : ""}`}
            </span>
          </div>
          {isVip ? (
            // Une fois VIP, il n'y a plus rien à "progresser" — une barre
            // pleine à 100% ne veut rien dire de plus que le badge
            // au-dessus (retour Paul du 31/08 : "retire la ligne verte").
            <div className="flex items-center gap-2 text-xs font-bold" style={{ color: "var(--success)" }}>
              <BadgeCheck className="h-4 w-4" /> Certification VIP active
            </div>
          ) : (
            <div
              className="h-2 overflow-hidden rounded-full"
              style={{ background: "rgba(255,255,255,0.10)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, background: "var(--accent)" }}
              />
            </div>
          )}
        </div>

        <button
          onClick={() => navigate(isVip ? "/tournaments/new" : "/duel")}
          className="btn-primary relative mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm"
        >
          {isVip ? <Trophy className="h-4 w-4" /> : <Swords className="h-4 w-4" />}
          {isVip ? "Créer un tournoi" : "Jouer des duels"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      {/* Avantages VIP */}
      <h2 className="font-display text-2xl font-bold text-ink-qa">Avantages inclus</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <VipBenefit
          icon={Trophy}
          title="Créer des tournois"
          value="Accès organisateur"
          detail="Configure un tournoi, son format, sa mise et son illustration depuis l’arène compétitive."
          locked={!isVip}
        />
        <VipBenefit
          icon={Crown}
          title="Identité VIP"
          value="Badge et couronne"
          detail="Ton statut et son origine sont visibles sur ton profil, avec une présentation réservée aux VIP."
          locked={!isVip}
        />
      </div>

      {/* Stats 30j si disponibles */}
      {stats && (
        <section className="card rounded-2xl p-5">
          <div className="text-xs font-bold uppercase mb-4" style={{ color: "var(--text-faint)" }}>
            Tes 30 derniers jours
          </div>
          <div className="grid grid-cols-3 gap-4">
            <MiniStat label="Parties" value={stats.games30d ?? 0} />
            <MiniStat label="Réussite" value={`${Math.round(stats.winRate30d ?? 0)}%`} />
            <MiniStat label="Victoires duel" value={stats.duelsWon30d ?? 0} accent />
          </div>
        </section>
      )}
    </div>
  );
}

function VipBenefit({ icon: Icon, title, value, detail, locked }) {
  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: "var(--surface)",
        border: `1px solid ${locked ? "var(--border)" : "var(--accent)"}`,
        opacity: locked ? 0.7 : 1,
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <span
          className="grid h-12 w-12 place-items-center rounded-2xl"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          <Icon className="h-6 w-6" />
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
          style={{
            background: locked ? "var(--surface-2)" : "var(--success-soft)",
            color: locked ? "var(--text-faint)" : "var(--success)",
          }}
        >
          {locked ? <><Lock className="h-3 w-3" /> Gelé</> : "Actif"}
        </span>
      </div>
      <div>
        <h3 className="font-display text-lg font-extrabold text-ink-qa">{title}</h3>
        <p className="mt-0.5 text-sm font-bold text-orange-qa">{value}</p>
        <p className="mt-2 text-xs leading-5 text-ink-soft-qa">{detail}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div>
      <p className="text-xs" style={{ color: "var(--text-faint)" }}>{label}</p>
      <strong
        className="mt-1 block text-xl font-extrabold"
        style={{ color: accent ? "var(--accent)" : "var(--text)" }}
      >
        {value}
      </strong>
    </div>
  );
}
