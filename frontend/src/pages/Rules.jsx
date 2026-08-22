import { motion } from "framer-motion";
import { Bot, BookOpen, ChevronRight, Clock, Crown, LogOut, Swords, Trophy } from "lucide-react";

const AMBER = "#E5A800";

function Section({ icon: Icon, title, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card rounded-2xl overflow-hidden"
    >
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--divider)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="font-display font-semibold text-lg" style={{ color: "var(--text)" }}>{title}</h2>
      </div>
      <div className="px-5 py-5 space-y-3 text-sm leading-relaxed" style={{ color: "var(--text-sub)" }}>
        {children}
      </div>
    </motion.section>
  );
}

function Rule({ icon: Icon = ChevronRight, text }) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
      <span>{text}</span>
    </li>
  );
}

export default function Rules() {
  return (
    <div className="min-h-screen px-4 sm:px-6 py-8 max-w-3xl mx-auto">
      <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4" style={{ color: AMBER }} />
          <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-faint)" }}>Documentation</span>
        </div>
        <h1 className="font-display font-semibold text-3xl" style={{ color: "var(--text)" }}>Règles du jeu</h1>
        <p className="text-sm mt-2" style={{ color: "var(--text-sub)" }}>Une seule banque de questions mélangées: texte, audio et image.</p>
      </motion.header>

      <div className="space-y-5">
        <Section icon={BookOpen} title="Principe général">
          <p>
            Chaque partie contient 10 questions tirées au hasard dans toute la banque. Les formats varient entre texte, audio et image.
          </p>
          <ul className="space-y-2">
            <Rule icon={Clock} text="Duel: 8 secondes par question." />
            <Rule text="Les réponses apparaissent après la question pour laisser le joueur lire, écouter ou regarder le média." />
            <Rule text="Les options sont mélangées à chaque partie." />
          </ul>
        </Section>

        <Section icon={Bot} title="Solo">
          <p>Défie l'ordinateur sur des quiz de culture générale et remporte selon ta mise.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              ["Facile", "Côte 1,05", "10 secondes"],
              ["Moyen", "Côte 1,10", "8 secondes"],
              ["Difficile", "Côte 1,30", "7 secondes"],
            ].map(([name, odd, time]) => (
              <div key={name} className="rounded-xl p-3" style={{ background: "var(--active)" }}>
                <div className="font-semibold" style={{ color: "var(--text)" }}>{name}</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-sub)" }}>{odd}</div>
                <div className="text-xs" style={{ color: "var(--text-sub)" }}>{time}</div>
              </div>
            ))}
          </div>
          <ul className="space-y-2">
            <Rule icon={LogOut} text="Si le joueur sort de la page ou de l'application pendant le quiz, il perd tout le challenge." />
            <Rule text="Le gain est validé à partir de 7 bonnes réponses sur 10." />
          </ul>
        </Section>

        <Section icon={Swords} title="Duel 1v1">
          <p>Affronte d'autres utilisateurs sur des quiz et génère des revenus grâce à ta connaissance.</p>
          <ul className="space-y-2">
            <Rule text="Les duels disponibles affichent le joueur, le temps restant et surtout le montant de la mise." />
            <Rule text="Le rang d'un joueur n'est pas affiché avant l'acceptation pour éviter de décourager les adversaires." />
            <Rule text="Les deux joueurs répondent aux mêmes 10 questions avec un chrono de 8 secondes." />
          </ul>
        </Section>

        <Section icon={Trophy} title="Tournois">
          <p>Faites des battles géantes à coup de cerveau et gagnez encore plus de revenus.</p>
          <ul className="space-y-2">
            <Rule text="Les tournois sont accessibles à tous les joueurs." />
            <Rule text="La création de tournois personnalisés est réservée aux VIP." />
          </ul>
        </Section>

        <Section icon={Crown} title="VIP">
          <p>Pour devenir VIP, vous devez accumuler 30 victoires de Duel sur le dernier mois.</p>
          <ul className="space-y-2">
            <Rule text="Avantage VIP: possibilité de créer des tournois et de remporter 10% de chaque tournoi." />
            <Rule text="Avantage VIP: possibilité d'avoir un lien de parrainage personnel." />
            <Rule text="La page VIP reste accessible, mais les fonctionnalités sont gelées tant que le statut n'est pas débloqué." />
          </ul>
        </Section>
      </div>
    </div>
  );
}
