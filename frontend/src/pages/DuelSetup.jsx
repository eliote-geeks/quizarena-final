import { useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { TOTAL_QUESTIONS } from "../data/mockData";
import { formatMoney } from "../lib/currency";
import { ArrowRight, BookOpen, Check, Coins, Copy, Link2, Minus, Plus, Search, Share2, Swords, UserPlus } from "lucide-react";
import { toast } from "sonner";

const STAKE_PRESETS = [100, 250, 500, 1000, 2500, 5000];

export default function DuelSetup() {
  const { coins, currency, user } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const quickOpponent = location.state?.quickOpponent;
  const inviteId = searchParams.get("invite");
  const inviteStake = Number(searchParams.get("stake")) || 500;
  const inviteHost = searchParams.get("host") || "Un ami";

  const [stake, setStake] = useState(location.state?.defaultStake || 500);
  const [searching, setSearching] = useState(false);
  const [matched, setMatched] = useState(!!quickOpponent);
  const [inviteLink, setInviteLink] = useState("");

  const opponentName = quickOpponent?.name || "QuantumKid";
  const opponentElo  = quickOpponent?.elo  || 1120;

  const startSearch = () => {
    if (stake > coins) { toast.error("Solde insuffisant"); return; }
    setSearching(true);
    setTimeout(() => { setSearching(false); setMatched(true); }, 2200);
  };

  const startDuel = () =>
    navigate("/duel/play", { state: { category: "random", stake, opponentName, opponentElo } });

  const acceptInvite = () => {
    if (inviteStake > coins) {
      toast.error("Solde insuffisant", { description: `Il vous faut ${formatMoney(inviteStake, currency)}.` });
      return;
    }
    navigate("/duel/play", {
      state: {
        category: "random",
        stake: inviteStake,
        opponentName: inviteHost,
        opponentElo: 1050,
        inviteId,
      },
    });
  };

  const createInviteLink = () => {
    if (stake > coins) { toast.error("Solde insuffisant"); return; }
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    const host = encodeURIComponent(user?.name || "Joueur");
    const origin = window.location.origin;
    const link = `${origin}/duel?invite=${id}&stake=${stake}&host=${host}`;
    setInviteLink(link);
    navigator.clipboard?.writeText(link)
      .then(() => toast.success("Lien copié"))
      .catch(() => toast.success("Lien créé"));
  };

  const copyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard?.writeText(inviteLink);
    toast.success("Lien copié");
  };

  const shareInviteLink = async () => {
    if (!inviteLink) return;
    if (navigator.share) {
      await navigator.share({
        title: "Challenge QuizArena",
        text: `${user?.name || "Un ami"} te défie sur QuizArena.`,
        url: inviteLink,
      }).catch(() => {});
      return;
    }
    copyInviteLink();
  };

  const potentialWin = stake * 2 - Math.round(stake * 0.05);

  if (inviteId) {
    return (
      <div className="min-h-full px-4 sm:px-6 py-8 max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          <section className="overflow-hidden rounded-3xl p-6" style={{ background: "linear-gradient(135deg, var(--surface-2), var(--surface))" }}>
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-soft-qa px-3 py-1 text-xs font-extrabold uppercase text-orange-qa">
              <Swords className="h-4 w-4" />
              Invitation duel
            </div>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight text-ink-qa">
              {inviteHost} te défie.
            </h1>
            <p className="mt-2 text-sm font-medium text-ink-soft-qa">
              10 questions mélangées. Le plus juste gagne la cagnotte.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat label="Mise" value={formatMoney(inviteStake, currency)} />
              <MiniStat label="Cagnotte" value={formatMoney(inviteStake * 2, currency)} />
            </div>
            <button
              onClick={acceptInvite}
              className="btn-primary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base"
            >
              <Swords className="h-5 w-5" />
              Accepter le challenge
              <ArrowRight className="h-5 w-5" />
            </button>
          </section>
          <button onClick={() => navigate("/duel")} className="btn-secondary w-full rounded-2xl py-3 text-sm">
            Créer mon propre duel
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 sm:px-6 py-8 max-w-xl mx-auto">
      <AnimatePresence mode="wait">

        {!searching && !matched && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <header>
              <div className="flex items-center gap-2 text-xs font-medium mb-3" style={{ color: "var(--text-faint)" }}>
                <Swords className="w-3.5 h-3.5" />
                <span>Nouveau duel</span>
              </div>
              <h1 className="font-display font-semibold text-4xl leading-[1.05] tracking-tight" style={{ color: "var(--text)" }}>
                Fixez votre <span className="serif-italic" style={{ color: "var(--accent)" }}>mise</span>
              </h1>
              <p className="mt-3 text-base" style={{ color: "var(--text-sub)" }}>
                Culture générale · {TOTAL_QUESTIONS} questions mélangées · 10 par duel.
              </p>
            </header>

            {/* Theme card */}
            <div className="card rounded-2xl p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-soft)", color: "var(--accent-hover)" }}>
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>Culture générale</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-sub)" }}>
                  Histoire, sciences, sport, cinéma, tech, culture… Toutes les époques.
                </div>
              </div>
            </div>

            {/* Mise */}
            <section>
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-sub)" }}>Votre mise</label>
              <div className="card rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => setStake((s) => Math.max(50, s - 50))}
                    className="btn-secondary w-11 h-11 rounded-xl flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={stake}
                    onChange={(e) => setStake(Math.max(50, parseInt(e.target.value) || 0))}
                    data-testid="bet-stake-input"
                    className="flex-1 text-center font-display font-semibold text-3xl bg-transparent focus:outline-none tabular-nums tracking-tight"
                    style={{ color: "var(--accent)" }}
                  />
                  <button
                    onClick={() => setStake((s) => Math.min(coins, s + 50))}
                    className="btn-secondary w-11 h-11 rounded-xl flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-5">
                  {STAKE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setStake(preset)}
                      className={stake === preset ? "btn-primary py-2 rounded-lg text-xs" : "btn-secondary py-2 rounded-lg text-xs"}
                    >
                      {preset.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-4" style={{ borderTop: "1px solid var(--divider)" }}>
                  <Row label="Votre mise" value={formatMoney(stake, currency)} />
                  <Row label="Gain potentiel" value={`+${formatMoney(potentialWin, currency)}`} color="var(--success)" />
                  <Row label="Frais (5%)" value={formatMoney(Math.round(stake * 0.05), currency)} small />
                </div>
              </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={startSearch}
                data-testid="bet-confirm-btn"
                disabled={stake > coins}
                className="btn-primary py-4 rounded-2xl text-base inline-flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Search className="w-5 h-5" />
                Trouver un adversaire
              </button>
              <button
                onClick={createInviteLink}
                disabled={stake > coins}
                className="btn-secondary py-4 rounded-2xl text-base inline-flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <UserPlus className="w-5 h-5" />
                Inviter un ami
              </button>
            </div>
            {stake > coins && (
              <p className="text-center text-sm font-medium" style={{ color: "var(--danger)" }}>
                Solde insuffisant — rechargez votre wallet
              </p>
            )}

            {inviteLink && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="card rounded-2xl p-4"
              >
                <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink-qa">
                  <Check className="h-4 w-4 text-orange-qa" />
                  Lien de challenge prêt
                </div>
                <div className="flex items-center gap-2 rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
                  <Link2 className="h-4 w-4 shrink-0 text-orange-qa" />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-soft-qa">{inviteLink}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={copyInviteLink} className="btn-secondary inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm">
                    <Copy className="h-4 w-4" />
                    Copier
                  </button>
                  <button onClick={shareInviteLink} className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm">
                    <Share2 className="h-4 w-4" />
                    Envoyer
                  </button>
                </div>
              </motion.section>
            )}
          </motion.div>
        )}

        {searching && (
          <motion.div
            key="search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-24 text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 mx-auto rounded-full border-4 border-t-transparent mb-6"
              style={{ borderColor: "var(--accent)" }}
            />
            <h2 className="font-display font-semibold text-2xl tracking-tight" style={{ color: "var(--text)" }}>
              Recherche d'un adversaire…
            </h2>
            <p className="text-sm mt-2" style={{ color: "var(--text-sub)" }}>
              Prêt à jouer ?
            </p>
          </motion.div>
        )}

        {matched && (
          <motion.div
            key="matched"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 pt-4"
          >
            <div className="text-center">
              <div className="text-xs uppercase tracking-widest font-medium" style={{ color: "var(--accent)" }}>
                Match trouvé
              </div>
              <h2 className="font-display font-semibold text-3xl mt-1 tracking-tight" style={{ color: "var(--text)" }}>
                Préparez-vous
              </h2>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <PlayerCard name="Vous" subtitle="Prêt" />
              <div className="font-serif-i text-2xl px-2" style={{ color: "var(--accent)" }}>vs</div>
              <PlayerCard name={opponentName} subtitle="Prêt" />
            </div>

            <div className="card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium" style={{ color: "var(--text-sub)" }}>Cagnotte</span>
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  <span className="font-display font-semibold text-2xl tracking-tight" style={{ color: "var(--accent)" }}>
                    {formatMoney(stake * 2, currency)}
                  </span>
                </div>
              </div>
              <button
                onClick={startDuel}
                data-testid="start-duel-btn"
                className="btn-primary w-full py-4 rounded-2xl text-base inline-flex items-center justify-center gap-2"
              >
                <Swords className="w-5 h-5" /> Lancer le duel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--bg)" }}>
      <p className="text-xs font-bold uppercase text-ink-soft-qa">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-ink-qa">{value}</p>
    </div>
  );
}

function Row({ label, value, color, small }) {
  return (
    <div className={`flex items-center justify-between ${small ? "text-xs" : "text-sm"}`}>
      <span style={{ color: small ? "var(--text-faint)" : "var(--text-sub)" }}>{label}</span>
      <span className={small ? "" : "font-semibold"} style={{ color: color || (small ? "var(--text-faint)" : "var(--text)") }}>
        {value}
      </span>
    </div>
  );
}

function PlayerCard({ name, subtitle }) {
  return (
    <div className="card rounded-2xl p-4 text-center">
      <div className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-base mx-auto mb-2"
        style={{ background: "var(--accent-soft)", color: "var(--accent-hover)", border: "1px solid var(--border)" }}>
        {name.substring(0, 2).toUpperCase()}
      </div>
      <div className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{name}</div>
      <div className="text-xs mt-0.5" style={{ color: "var(--text-sub)" }}>{subtitle}</div>
    </div>
  );
}
