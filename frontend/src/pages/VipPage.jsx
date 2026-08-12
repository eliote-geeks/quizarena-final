import { useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { CATEGORIES } from "../data/mockData";
import { formatMoney } from "../lib/currency";
import { toast } from "sonner";
import {
  Crown, Trophy, Users, Sparkles, Lock, Plus, Minus, Calendar, ChevronRight,
} from "lucide-react";

const STAKE_PRESETS = [500, 1000, 2500, 5000];

export default function VipPage() {
  const { wins, referrals, isVip, vipTargets, coins, currency, addWin, addReferral } = useApp();

  const [showCreate, setShowCreate] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [stake, setStake] = useState(1000);
  const [slots, setSlots] = useState(16);
  const [startsIn, setStartsIn] = useState("01:00:00");

  const winsPct = Math.min(100, (wins / vipTargets.wins) * 100);
  const refPct  = Math.min(100, (referrals / vipTargets.referrals) * 100);

  const handleCreate = () => {
    toast.success("Tournoi créé", {
      description: `${CATEGORIES.find(c => c.id === category)?.name?.fr} · mise ${formatMoney(stake, currency)} · ${slots} places · démarre dans ${startsIn}`,
    });
    setShowCreate(false);
  };

  return (
    <div className="min-h-full px-4 sm:px-6 py-8 max-w-4xl mx-auto space-y-8">

      {/* Hero */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden p-8 mesh-hero"
        style={{
          border: "1px solid var(--border-md)",
        }}
      >
        <div className="flex items-center gap-2 text-xs font-medium mb-3" style={{ color: "var(--text-faint)" }}>
          <Sparkles className="w-3.5 h-3.5" />
          <span>Statut Prestige</span>
        </div>
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "var(--accent)",
              color: "var(--accent-fg)",
              boxShadow: "0 12px 32px -8px var(--accent-glow)",
            }}
          >
            <Crown className="w-7 h-7" strokeWidth={2} />
          </div>
          <div>
            <h1 className="font-display font-semibold text-4xl sm:text-5xl leading-[1.05] tracking-tight" style={{ color: "var(--text)" }}>
              {isVip ? "Vous êtes " : "Devenir "}
              <span className="serif-italic" style={{ color: "var(--accent)" }}>VIP</span>
            </h1>
            <p className="mt-3 text-base max-w-md" style={{ color: "var(--text-sub)" }}>
              {isVip
                ? "Créez vos propres tournois et invitez la communauté."
                : "Accumulez victoires et parrainages pour débloquer la création de tournois."}
            </p>
          </div>
        </div>
      </motion.header>

      {/* Progress */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        <ProgressCard
          icon={Trophy}
          label="Victoires cumulées"
          current={wins}
          target={vipTargets.wins}
          pct={winsPct}
          onDebugPlus={addWin}
        />
        <ProgressCard
          icon={Users}
          label="Parrainages validés"
          current={referrals}
          target={vipTargets.referrals}
          pct={refPct}
          onDebugPlus={addReferral}
        />
      </motion.section>

      {/* Privilège */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--divider)" }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <h2 className="font-display font-semibold text-lg tracking-tight" style={{ color: "var(--text)" }}>
              Privilège débloqué
            </h2>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: isVip ? "var(--accent-soft)" : "var(--active)",
                color: isVip ? "var(--accent-hover)" : "var(--text-faint)",
                border: "1px solid var(--border)",
              }}
            >
              <Trophy className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold text-base tracking-tight" style={{ color: "var(--text)" }}>
                Créer votre propre tournoi
              </div>
              <p className="text-sm mt-1" style={{ color: "var(--text-sub)" }}>
                Vous choisissez le thème, la mise, le nombre de places et l'horaire. Plafond de mise appliqué tant que la réglementation n'est pas confirmée.
              </p>
            </div>
          </div>

          <button
            onClick={() => isVip ? setShowCreate(true) : toast.error("Statut VIP requis", { description: `${vipTargets.wins - wins} victoires et ${vipTargets.referrals - referrals} parrainages manquants.` })}
            className={isVip ? "btn-primary w-full mt-5 py-3 rounded-xl text-sm inline-flex items-center justify-center gap-2" : "w-full mt-5 py-3 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-2"}
            style={isVip ? {} : { background: "var(--active)", color: "var(--text-sub)", border: "1px solid var(--border)" }}
          >
            {isVip ? (
              <>Créer un tournoi <ChevronRight className="w-4 h-4" /></>
            ) : (
              <><Lock className="w-4 h-4" /> Verrouillé</>
            )}
          </button>
        </div>
      </motion.section>

      {/* À venir */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="card rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--divider)" }}>
          <h2 className="font-display font-semibold text-lg tracking-tight" style={{ color: "var(--text)" }}>
            À venir pour les VIP
          </h2>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--divider)" }}>
          {[
            { icon: Sparkles, title: "Salon privé", text: "Une salle réservée aux VIP avec chat en direct." },
            { icon: Trophy,   title: "Badge exclusif", text: "Un badge à côté de votre nom en jeu." },
            { icon: Users,    title: "Cashback parrainage", text: "5% sur les mises de vos filleuls." },
          ].map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="flex items-start gap-3 px-6 py-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--active)", color: "var(--text-faint)" }}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{p.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-sub)" }}>{p.text}</div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* Modal création */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowCreate(false)}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden card"
          >
            <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--divider)" }}>
              <h2 className="font-display font-semibold text-xl tracking-tight" style={{ color: "var(--text)" }}>
                Nouveau tournoi
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--text-sub)" }}>
                Configurez les paramètres avant de lancer.
              </p>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-sub)" }}>
                  Thème
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input w-full px-4 py-3 rounded-xl text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.name.fr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-sub)" }}>
                  Mise par participant
                </label>
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => setStake(s => Math.max(100, s - 100))} className="btn-secondary w-10 h-10 rounded-lg flex items-center justify-center">
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={stake}
                    onChange={(e) => setStake(Math.max(100, parseInt(e.target.value) || 0))}
                    className="flex-1 text-center font-display font-semibold text-xl bg-transparent focus:outline-none tracking-tight"
                    style={{ color: "var(--accent)" }}
                  />
                  <button onClick={() => setStake(s => Math.min(coins, s + 100))} className="btn-secondary w-10 h-10 rounded-lg flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {STAKE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setStake(preset)}
                      className={stake === preset ? "btn-primary py-2 rounded-lg text-xs" : "btn-secondary py-2 rounded-lg text-xs"}
                    >
                      {formatMoney(preset, currency)}
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--text-faint)" }}>
                  Plafond : 5 000 FCFA (période réglementaire transitoire).
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-sub)" }}>
                  Nombre de places
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[8, 16, 32, 64].map((n) => (
                    <button
                      key={n}
                      onClick={() => setSlots(n)}
                      className={slots === n ? "btn-primary py-2 rounded-lg text-sm" : "btn-secondary py-2 rounded-lg text-sm"}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-sub)" }}>
                  Démarrage dans
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["00:30:00", "01:00:00", "03:00:00"].map((v) => (
                    <button
                      key={v}
                      onClick={() => setStartsIn(v)}
                      className={startsIn === v ? "btn-primary py-2 rounded-lg text-sm inline-flex items-center justify-center gap-1.5" : "btn-secondary py-2 rounded-lg text-sm inline-flex items-center justify-center gap-1.5"}
                    >
                      <Calendar className="w-3 h-3" />
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1 py-3 rounded-xl text-sm">
                  Annuler
                </button>
                <button onClick={handleCreate} className="btn-primary flex-[2] py-3 rounded-xl text-sm">
                  Créer
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function ProgressCard({ icon: Icon, label, current, target, pct, onDebugPlus }) {
  const done = current >= target;
  return (
    <div className="card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: done ? "var(--success-soft)" : "var(--accent-soft)",
            color: done ? "var(--success)" : "var(--accent-hover)",
          }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="text-xs font-medium" style={{ color: "var(--text-sub)" }}>
          {label}
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-display font-semibold text-4xl tracking-tight" style={{ color: done ? "var(--success)" : "var(--accent)" }}>
          {current}
        </span>
        <span className="text-sm" style={{ color: "var(--text-faint)" }}>
          / {target}
        </span>
      </div>

      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--active)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: done ? "var(--success)" : "var(--accent)",
          }}
        />
      </div>

      <button onClick={onDebugPlus} className="btn-ghost mt-2 text-xs font-medium">
        + Simuler
      </button>
    </div>
  );
}
