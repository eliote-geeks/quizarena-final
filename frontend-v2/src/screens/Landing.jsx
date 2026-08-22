import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Block, Label, Leader, Loader, Money, Row, Stat } from "../ui";
import * as api from "../lib/api";

const STEPS = [
  { n: "01", title: "Choisissez un thème", body: "14 catégories, de la culture générale au sport." },
  { n: "02", title: "Misez", body: "500 à 5 000 F. Le vainqueur emporte les deux mises." },
  { n: "03", title: "Répondez le plus vite", body: "Sept questions, dix secondes chacune. Le score décide." },
];

export default function Landing() {
  // Chiffres réels de la plateforme — jamais de nombre inventé sur une
  // page qui doit convaincre de déposer de l'argent réel.
  const [stats, setStats] = useState(null);
  const [top, setTop] = useState(null);

  useEffect(() => {
    api.getPublicStats().then(setStats).catch(() => {});
    api.getPublicLeaderboard().then((r) => setTop(r.leaderboard)).catch(() => {});
  }, []);

  return (
    <div className="grain min-h-dvh">
      <div className="mx-auto w-full max-w-[1100px] px-5 pb-24 sm:px-8">
        {/* ── Bandeau ── */}
        <header className="flex items-center justify-between gap-4 pt-6 pb-5">
          <span className="t-display text-lg text-flare">QUIZARENA</span>
          <div className="flex items-center gap-6">
            <Link to="/login" className="t-label hidden text-bone-3 hover:text-bone sm:inline">
              connexion
            </Link>
            <Block as={Link} to="/register" size="sm">
              Créer un compte
            </Block>
          </div>
        </header>

        <div className="rule-flare" />

        {/* ── Le cri ── */}
        <section className="pt-12 pb-14">
          <h1 className="anim-rise t-display text-[clamp(3.4rem,13vw,8.5rem)]">
            Votre culture
            <br />
            <span className="text-flare">vaut de l'argent.</span>
          </h1>
          <p className="anim-rise-2 t-body mt-6 max-w-lg text-lg text-bone-3">
            Duels de culture générale en argent réel. Misez, répondez plus vite que
            l'adversaire, encaissez par Orange Money ou MTN MoMo.
          </p>
          <div className="anim-rise-3 mt-8 flex flex-col gap-3 sm:flex-row">
            <Block as={Link} to="/register" size="lg" className="sm:flex-1">
              Jouer maintenant
            </Block>
            <Block as={Link} to="/rules" tone="outline" size="lg">
              Voir les règles
            </Block>
          </div>
        </section>

        {/* ── Chiffres bruts, tous réels (§/api/public/stats) ── */}
        <section className="rule grid grid-cols-2 gap-y-8 pt-8 pb-14 sm:grid-cols-4">
          <Stat label="joueurs actifs (7j)" value={stats ? stats.activePlayers7d : <Loader />} tone="live" />
          <Stat label="gains distribués (7j)" value={stats ? `${stats.payoutsWeekCoins.toLocaleString("fr-FR")} F` : <Loader />} tone="flare" />
          <Stat label="duels aujourd'hui" value={stats ? stats.duelsToday : <Loader />} />
          <Stat label="catégories" value={stats ? stats.categoriesCount : <Loader />} />
        </section>

        {/* ── Comment ça marche ── */}
        <section className="rule-bone pt-8 pb-14">
          <h2 className="t-display mb-8 text-3xl">Comment ça marche</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n}>
                <span className="t-display block text-flare">{s.n}</span>
                <h3 className="t-title mt-3 text-xl">{s.title}</h3>
                <p className="t-body mt-2 text-sm text-bone-3">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Preuve sociale : le tableau des meilleurs, pas des avis clients ── */}
        <section>
          <div className="rule-bone flex items-baseline justify-between pt-5 pb-4">
            <h2 className="t-display text-2xl">Tête du classement</h2>
            <Link to="/register" className="t-label text-flare hover:text-flare-hot">
              rejoindre ›
            </Link>
          </div>
          <div className="-mx-4">
            {top === null && (
              <div className="flex justify-center px-4 py-8">
                <Loader />
              </div>
            )}
            {top?.length === 0 && (
              <p className="t-body px-4 py-6 text-sm text-bone-4">Personne n'a encore gagné de partie.</p>
            )}
            {(top ?? []).map((p) => (
              <Row key={p.rank} rank={p.rank}>
                <span className="t-title min-w-0 max-w-[42%] truncate text-[15px]">{p.username}</span>
                {p.region && <span className="t-label shrink-0 text-bone-4">{p.region}</span>}
                <Leader />
                <Money value={p.winningsCoins} size="sm" tone={p.rank === 1 ? "flare" : "bone"} />
              </Row>
            ))}
          </div>
        </section>

        {/* ── Pied ── */}
        <footer className="rule mt-14 flex flex-wrap items-center gap-x-6 gap-y-3 pt-6">
          <Label>© QuizArena {new Date().getFullYear()}</Label>
          <FooterLink to="/rules">règles</FooterLink>
          <FooterLink to="/terms">cgu</FooterLink>
          <FooterLink to="/privacy">confidentialité</FooterLink>
          <FooterLink to="/refund">remboursement</FooterLink>
        </footer>
      </div>
    </div>
  );
}

function FooterLink({ to, children }) {
  return (
    <Link to={to} className="t-label text-bone-4 hover:text-flare">
      {children}
    </Link>
  );
}
