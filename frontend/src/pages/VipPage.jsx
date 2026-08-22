import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ArrowRight, Crown, Lock, Share2, Swords, Trophy } from "lucide-react";

const TARGET = 30;

export default function VipPage() {
  const navigate = useNavigate();
  const { wins, isVip } = useApp();
  const monthlyWins = Math.min(wins, TARGET);
  const remaining = Math.max(TARGET - monthlyWins, 0);
  const progress = Math.min(100, (monthlyWins / TARGET) * 100);

  return (
    <div className="qa-shell py-8">
      <section className="overflow-hidden rounded-3xl p-5 lg:p-7" style={{ background: "linear-gradient(135deg, var(--surface-2), var(--surface))" }}>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-orange-soft-qa px-3 py-1 text-xs font-bold uppercase text-orange-qa">
              <Crown className="h-4 w-4" />
              Statut VIP
            </span>
            <h1 className="mt-4 text-4xl font-extrabold text-ink-qa lg:text-6xl">
              {isVip ? "VIP actif" : "VIP verrouillé"}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-ink-soft-qa">
              30 victoires de Duel sur le dernier mois débloquent les outils VIP.
            </p>
            <button
              onClick={() => navigate("/duel")}
              className="btn-primary mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm"
            >
              <Swords className="h-4 w-4" />
              Jouer des duels
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-3xl p-5" style={{ background: "var(--bg)" }}>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-ink-soft-qa">Progression</p>
                <p className="mt-1 text-5xl font-extrabold text-orange-qa">{monthlyWins}/{TARGET}</p>
              </div>
              <span className="rounded-full bg-orange-soft-qa px-3 py-1 text-xs font-bold text-orange-qa">
                {isVip ? "Débloqué" : `${remaining} restantes`}
              </span>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full" style={{ background: "var(--surface-3)" }}>
              <div className="h-full rounded-full bg-orange-qa" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-7 grid gap-3 lg:grid-cols-2">
        <VipBenefit
          icon={Trophy}
          title="Créer des tournois"
          value="10% de commission"
          locked={!isVip}
        />
        <VipBenefit
          icon={Share2}
          title="Lien de parrainage"
          value="Invitations monétisées"
          locked={!isVip}
        />
      </section>
    </div>
  );
}

function VipBenefit({ icon: Icon, title, value, locked }) {
  return (
    <div className="rounded-3xl p-5" style={{ background: "var(--surface)" }}>
      <div className="flex items-center justify-between gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-soft-qa text-orange-qa">
          <Icon className="h-6 w-6" />
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold" style={{ background: "var(--surface-2)", color: "var(--text-sub)" }}>
          {locked && <Lock className="h-3.5 w-3.5" />}
          {locked ? "Gelé" : "Actif"}
        </span>
      </div>
      <h2 className="mt-5 text-xl font-extrabold text-ink-qa">{title}</h2>
      <p className="mt-1 text-sm font-bold text-orange-qa">{value}</p>
    </div>
  );
}
