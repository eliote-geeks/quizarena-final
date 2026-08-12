import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Zap, Swords, Trophy, BookOpen, Coins, TrendingUp, Shield, Clock,
  CheckCircle, XCircle, AlertTriangle, ChevronRight,
} from "lucide-react";

const AMBER = "#E5A800";

const PAYOUT_ROWS = [
  { score: "0 – 4 / 10", mult: "×0.00", net: "−100%",  win: false, note: "Tout perdu" },
  { score: "5 / 10",     mult: "×0.60", net: "−40%",   win: false, note: "Récupère 60%" },
  { score: "6 / 10",     mult: "×0.85", net: "−15%",   win: false, note: "Récupère 85%" },
  { score: "7 / 10",     mult: "×1.20", net: "+20%",   win: true,  note: "Bénéfice" },
  { score: "8 / 10",     mult: "×1.60", net: "+60%",   win: true,  note: "Bénéfice" },
  { score: "9 / 10",     mult: "×2.20", net: "+120%",  win: true,  note: "Bénéfice" },
  { score: "10 / 10",    mult: "×3.00", net: "+200%",  win: true,  note: "Jackpot" },
];

function Section({ icon: Icon, title, color = AMBER, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.07] overflow-hidden"
      style={{ background: "var(--qa-surface)" }}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]" style={{ background: `${color}08` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, color }}>
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-bold" style={{ color: "var(--qa-text)" }}>{title}</h2>
      </div>
      <div className="px-5 py-5 space-y-3 text-sm leading-relaxed" style={{ color: "var(--qa-text-sub)" }}>
        {children}
      </div>
    </motion.section>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
      <span className="text-xs" style={{ color: "var(--qa-text-faint)" }}>{label}</span>
      <span className="text-xs font-semibold" style={{ color: highlight || "var(--qa-text)" }}>{value}</span>
    </div>
  );
}

function Rule({ icon: Icon = ChevronRight, text, color }) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: color || "var(--qa-text-faint)" }} />
      <span>{text}</span>
    </li>
  );
}

export default function Rules() {
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-3xl mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-4 h-4" style={{ color: AMBER }} />
          <span className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Documentation</span>
        </div>
        <h1 className="text-xl font-bold text-white">Règles du jeu</h1>
        <p className="text-sm text-white/40 mt-1">Tout ce que tu dois savoir avant de jouer tes premiers coins.</p>
      </motion.div>

      <div className="space-y-5">

        {/* ── Principe général ── */}
        <Section icon={BookOpen} title="Principe général">
          <p>
            QuizArena est un jeu de culture générale compétitif. Tu réponds à <strong className="text-white/80">10 questions</strong> par partie,
            sur des thèmes variés (Histoire, Géographie, Sciences, Cinéma, Sport, Musique).
            Chaque question dispose d'un <strong className="text-white/80">chrono de 15 secondes</strong> : plus tu réponds vite, plus tu gagnes de points de vitesse.
          </p>
          <ul className="space-y-2">
            <Rule icon={Clock}        text="15 secondes par question. Passé ce délai, la réponse est comptée incorrecte." />
            <Rule icon={Zap}          text="Bonus de vitesse : la rapidité de ta réponse influence le score (+200 à +1 000 points de vitesse)." color={AMBER} />
            <Rule icon={TrendingUp}   text="Multiplicateur de série : 3 bonnes réponses consécutives → ×1.5 ; 5 en série → ×2.0." color={AMBER} />
            <Rule icon={Shield}       text="Les options de réponse sont mélangées aléatoirement à chaque partie (anti-triche)." />
          </ul>
        </Section>

        {/* ── Mode Libre ── */}
        <Section icon={BookOpen} title="Solo Libre — Sans risque" color="#5DD66E">
          <p>Le mode d'entraînement. Aucune mise, aucun risque. Tu gagnes toujours quelque chose.</p>
          <ul className="space-y-2">
            <Rule icon={CheckCircle} text="+10 FCFA par bonne réponse (max +100 FCFA par partie)." color="#5DD66E" />
            <Rule icon={CheckCircle} text="Défi du Jour : +500 FCFA bonus si tu complètes la question du jour (une fois par 24h)." color="#5DD66E" />
            <Rule icon={CheckCircle} text="Ton ELO et ton XP sont mis à jour selon ta performance." color="#5DD66E" />
            <Rule icon={AlertTriangle} text="Ce mode ne permet pas de gains importants — utilise le Challenge pour miser." />
          </ul>
        </Section>

        {/* ── Mode Challenge ── */}
        <Section icon={Zap} title="Solo Challenge — Mise & Payout" color={AMBER}>
          <p>
            Tu choisis une mise (100, 250, 500, 1 000 ou 2 500 FCFA).
            Ton payout dépend entièrement de ton score final selon cette grille :
          </p>

          <div className="rounded-xl overflow-hidden border border-white/[0.07] mt-1">
            <div className="grid grid-cols-4 gap-0 px-3 py-2 border-b border-white/[0.06] text-[10px] uppercase tracking-widest text-white/25">
              <div>Score</div>
              <div className="text-center">Retour</div>
              <div className="text-center">Net</div>
              <div className="text-right">Note</div>
            </div>
            {PAYOUT_ROWS.map(r => (
              <div
                key={r.score}
                className="grid grid-cols-4 gap-0 px-3 py-2.5 border-b border-white/[0.04] last:border-0 items-center"
                style={{ background: r.win ? "rgba(93,214,110,0.04)" : "rgba(255,85,85,0.03)" }}
              >
                <div className="text-xs font-semibold" style={{ color: r.win ? "#5DD66E" : "#FF6B6B" }}>{r.score}</div>
                <div className="text-center font-arcade text-xs text-white/50">{r.mult}</div>
                <div className="text-center font-arcade text-xs font-bold" style={{ color: r.win ? "#5DD66E" : "#FF6B6B" }}>{r.net}</div>
                <div className="text-right text-[10px] text-white/30">{r.note}</div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-white/30 mt-1">
            Exemple avec une mise de 500 FCFA : score 8/10 → tu reçois 800 FCFA (net +300 FCFA).
            Score 5/10 → tu reçois 300 FCFA (net −200 FCFA).
          </p>

          <div className="rounded-xl p-3.5 border mt-2" style={{ background: "rgba(229,168,0,0.06)", borderColor: `${AMBER}25` }}>
            <p className="text-xs font-semibold mb-1" style={{ color: AMBER }}>Point clé</p>
            <p className="text-xs text-white/50">
              Le seuil de rentabilité est à <strong className="text-white/70">7/10</strong>.
              En dessous, tu perds une partie de ta mise.
              À partir de 7, chaque bonne réponse supplémentaire démultiplie tes gains.
            </p>
          </div>
        </Section>

        {/* ── Duel 1v1 ── */}
        <Section icon={Swords} title="Duel 1v1 — Mise symétrique" color="#74B9FF">
          <p>
            Affronte un adversaire en temps réel sur les mêmes 10 questions.
            Les deux joueurs misent le même montant. Le meilleur score remporte le pot.
          </p>
          <div className="space-y-1 mt-1">
            <Row label="Mise"      value="Symétrique (tu choisis)" />
            <Row label="Victoire"  value="×1.80 ta mise (net +0.80×)" highlight="#5DD66E" />
            <Row label="Défaite"   value="−mise complète (net −1.00×)" highlight="#FF6B6B" />
            <Row label="Égalité"   value="×0.95 remboursé (net −5%)" highlight={AMBER} />
            <Row label="Frais app" value="10% du pot (victoire) · 5% par joueur (nul)" />
          </div>
          <ul className="space-y-2 mt-2">
            <Rule icon={Coins}
              text="Cash-out : si tu mènes de 2+ bonnes réponses après la Q5, tu peux sécuriser un gain garanti avant la fin."
              color={AMBER}
            />
            <Rule icon={AlertTriangle}
              text="L'égalité n'est pas gratuite : le jeu prélève 5% pour couvrir les coûts de la partie."
            />
            <Rule icon={Shield}
              text="L'adversaire est simulé en local pour l'instant. Dans la version définitive, ce sera un joueur humain en ligne."
            />
          </ul>
        </Section>

        {/* ── Tournoi ── */}
        <Section icon={Trophy} title="Tournoi — Mode élimination" color="#A29BFE">
          <p>
            Des tournois à 8, 16 ou 32 joueurs, avec une entrée payante et un prize pool partagé entre les meilleurs.
          </p>
          <div className="space-y-1 mt-1">
            <Row label="Frais maison" value="15% du pot total" />
            <Row label="1er"          value="45% du prize pool" highlight="#5DD66E" />
            <Row label="2e"           value="25% du prize pool" highlight={AMBER} />
            <Row label="3e"           value="15% du prize pool" highlight={AMBER} />
            <Row label="Top 25%"      value="Se partagent 15%" />
          </div>
          <ul className="space-y-2 mt-2">
            <Rule icon={CheckCircle} text="Format élimination directe : perdre une manche = éliminé." color="#5DD66E" />
            <Rule icon={CheckCircle} text="Tous les joueurs répondent aux mêmes questions en simultané." color="#5DD66E" />
            <Rule icon={AlertTriangle} text="L'entrée au tournoi est non remboursable une fois la partie lancée." />
          </ul>
        </Section>

        {/* ── ELO ── */}
        <Section icon={TrendingUp} title="Système ELO & Classement" color="#FD9644">
          <p>
            QuizArena utilise un système ELO (K=32) inspiré des échecs. Ton ELO évolue après chaque partie
            quel que soit le mode.
          </p>
          <ul className="space-y-2">
            <Rule icon={TrendingUp}  text="Victoire contre un adversaire plus fort → gros gain d'ELO." color="#5DD66E" />
            <Rule icon={XCircle}     text="Défaite contre un adversaire moins fort → perte d'ELO importante." color="#FF6B6B" />
            <Rule icon={CheckCircle} text="L'ELO est indépendant des coins — tu peux perdre des coins et monter en ELO." color={AMBER} />
          </ul>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {[["Bronze", "< 1 000", "#CD7F32"], ["Argent", "1 000 – 1 400", "#9aa0a6"], ["Or", "1 400 – 1 800", AMBER], ["Diamant", "> 1 800", "#74B9FF"]].map(([name, range, color]) => (
              <div key={name} className="rounded-xl border border-white/[0.06] p-3" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-xs font-bold mb-0.5" style={{ color }}>{name}</p>
                <p className="text-[10px] text-white/30">{range}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Fair-play ── */}
        <Section icon={Shield} title="Fair-play & Conduite" color="#FF6B6B">
          <ul className="space-y-2">
            <Rule icon={XCircle}     text="L'utilisation d'outils d'aide extérieurs (moteurs de recherche, IA) est interdite pendant une partie." color="#FF6B6B" />
            <Rule icon={XCircle}     text="Tout abus technique constaté entraîne la suspension du compte sans remboursement." color="#FF6B6B" />
            <Rule icon={AlertTriangle} text="Les questions contiennent parfois des pièges. Lis attentivement avant de répondre." />
            <Rule icon={CheckCircle} text="En cas de bug technique avéré, le montant misé est crédité automatiquement." color="#5DD66E" />
          </ul>
        </Section>

        {/* Footer links */}
        <div className="flex flex-wrap justify-center gap-4 pt-2 text-xs text-white/25">
          <Link to="/terms"   className="hover:text-white/50 transition">Conditions générales</Link>
          <Link to="/privacy" className="hover:text-white/50 transition">Confidentialité</Link>
          <Link to="/refund"  className="hover:text-white/50 transition">Remboursements</Link>
        </div>

      </div>
    </div>
  );
}
