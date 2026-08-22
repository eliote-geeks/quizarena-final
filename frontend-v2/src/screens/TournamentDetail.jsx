import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import { Block, ConfirmModal, Label, Leader, Loader, Row } from "../ui";
import { NavIcon } from "../ui/icons";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";

/**
 * Détail + bracket d'un tournoi. Pas de push serveur pour le bracket
 * (contrairement au duel en direct) : on relit périodiquement tant que
 * le tournoi n'est pas terminé — assez pour suivre l'avancée des autres
 * matches sans maintenir un second canal WebSocket juste pour ça.
 */
export default function TournamentDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, refreshWallet } = useAuth();
  const [t, setT] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmJoin, setConfirmJoin] = useState(false);
  const pollRef = useRef(null);

  const load = () => api.getTournament(id).then(setT);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    clearInterval(pollRef.current);
    if (!t || t.status === "COMPLETED") return;
    pollRef.current = setInterval(load, 5000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t?.status]);

  if (!t) return <Loader full />;

  const joined = t.entries.some((e) => e.userId === user?.id);
  const full = t.entries.length >= t.capacity;

  const join = async () => {
    if (busy) return;
    setConfirmJoin(false);
    setBusy(true);
    setError("");
    try {
      setT(await api.joinTournament(id));
      refreshWallet();
    } catch (err) {
      setError(err.message || "Impossible de rejoindre");
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.leaveTournament(id);
      refreshWallet();
      nav("/tournaments");
    } catch (err) {
      setError(err.message || "Impossible de se désinscrire");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 pt-8 pb-16 sm:px-8 sm:pt-12">
      <button onClick={() => nav("/tournaments")} className="t-label text-bone-4 hover:text-flare">
        ← tournois
      </button>

      {(t.coverImage || t.categoryId) && (
        <div className="fade-to-panel relative mt-6 aspect-[21/9] w-full overflow-hidden rounded-(--radius-panel)">
          <img src={t.coverImage || `/categories/${t.categoryId}.webp`} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <Label tone="flare" className="mt-5">
        {t.categoryName} · {statusLabel(t.status)}
      </Label>
      <h1 className="t-display mt-3 text-2xl sm:text-3xl">{t.name}</h1>
      <p className="t-body mt-2 text-sm text-bone-3">
        {t.capacity} joueurs · {t.stakeCoins.toLocaleString("fr-FR")} F
      </p>

      {t.status === "REGISTERING" && (
        <>
          <p className="t-body mt-4 text-sm text-bone-4">
            {t.entries.length}/{t.capacity} inscrits · démarre automatiquement dès la dernière place prise.
          </p>
          <div className="rule mt-6 -mx-4">
            {t.entries.map((e) => (
              <Row key={e.userId}>
                <span className="t-title text-[15px]">{e.username}</span>
              </Row>
            ))}
          </div>
          {error && <p className="t-body mt-4 text-sm text-flare">{error}</p>}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {joined ? (
              <Block tone="outline" size="lg" icon={<NavIcon type="x" className="h-5 w-5" />} onClick={leave} loading={busy}>
                Se désinscrire · remboursé
              </Block>
            ) : (
              <Block size="lg" icon={<NavIcon type="trophy" className="h-5 w-5" />} onClick={() => setConfirmJoin(true)} loading={busy} disabled={full}>
                {full ? "Complet" : `Rejoindre · ${t.stakeCoins.toLocaleString("fr-FR")} F`}
              </Block>
            )}
            {!full && <ShareTournamentButton t={t} />}
          </div>
          <ConfirmModal
            open={confirmJoin}
            title="Rejoindre ce tournoi ?"
            message={`Droit d'entrée débité immédiatement : ${t.stakeCoins.toLocaleString("fr-FR")} F.`}
            confirmLabel="Rejoindre et payer"
            busy={busy}
            onConfirm={join}
            onCancel={() => setConfirmJoin(false)}
          />
        </>
      )}

      {t.status !== "REGISTERING" && (
        <>
          {t.myNextMatchId && (
            <Block
              size="lg"
              full
              className="mt-8"
              icon={<NavIcon type="swords" className="h-5 w-5" />}
              onClick={() => nav("/duel/play", { state: { tournamentMatchId: t.myNextMatchId, tournamentId: t.id } })}
            >
              Jouer mon match ›
            </Block>
          )}

          <div className="mt-10 flex flex-col gap-8">
            {t.bracket.map((r) => (
              <section key={r.round}>
                <Label className="mb-3">{r.label}</Label>
                <div className="rule -mx-4">
                  {r.matches.map((m) => (
                    <MatchRow key={m.id} m={m} myId={user?.id} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {t.status === "COMPLETED" && (
            <section className="mt-10">
              <Label className="mb-3">résultats</Label>
              <div className="rule -mx-4">
                {[...t.entries]
                  .filter((e) => e.placement != null)
                  .sort((a, b) => (a.placement || 99) - (b.placement || 99))
                  .map((e) => (
                    <Row key={e.userId} rank={e.placement || undefined} active={e.userId === user?.id}>
                      <span className="t-title min-w-0 max-w-[45%] truncate text-[15px]">
                        {e.username}
                        {e.userId === user?.id && <span className="t-label ml-2 text-bone-4">vous</span>}
                      </span>
                      <Leader />
                      <span className="t-label shrink-0 text-bone-4">{placementLabel(e.placement)}</span>
                      {e.payoutCoins > 0 && (
                        <span className="t-display shrink-0 text-lg text-flare">{e.payoutCoins.toLocaleString("fr-FR")} F</span>
                      )}
                    </Row>
                  ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function statusLabel(status) {
  if (status === "REGISTERING") return "inscriptions";
  if (status === "IN_PROGRESS") return "en cours";
  return "terminé";
}

function placementLabel(p) {
  if (p === 1) return "vainqueur";
  if (p === 2) return "finaliste";
  if (p === 3) return "demi-finale";
  return "éliminé";
}

function MatchRow({ m, myId }) {
  const mine = m.playerA?.id === myId || m.playerB?.id === myId;
  return (
    <Row active={mine}>
      <Side p={m.playerA} won={!!m.winnerId && m.winnerId === m.playerA?.id} myId={myId} />
      <span className="t-label shrink-0 px-3 text-bone-4">vs</span>
      <Side p={m.playerB} won={!!m.winnerId && m.winnerId === m.playerB?.id} myId={myId} />
    </Row>
  );
}

/**
 * Partage le lien d'inscription du tournoi — demande directe de Paul le
 * 20/08 : "ajouter des joueurs comme ça ils valident leur inscription
 * en payant". Pas besoin d'un système d'invitation séparé : la page
 * /tournaments/:id est déjà protégée normalement, et ProtectedRoute
 * ramène automatiquement ici après connexion/inscription
 * (`state: { from: location }`, §ProtectedRoute.jsx) — un ami qui reçoit
 * ce lien atterrit directement sur ce tournoi, se connecte si besoin, et
 * n'a plus qu'à payer pour confirmer sa place.
 */
function ShareTournamentButton({ t }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/tournaments/${t.id}`;
  const shareText = `Rejoins mon tournoi « ${t.name} » sur QuizArena · droit d'entrée ${t.stakeCoins.toLocaleString("fr-FR")} F — ${link}`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText, url: link });
        return;
      } catch {
        /* partage annulé — on retombe sur la copie */
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papier indisponible — rien à faire de plus ici */
    }
  };

  return (
    <Block tone="outline" size="lg" icon={<NavIcon type="link" className="h-5 w-5" />} onClick={share}>
      {copied ? "Lien copié ✓" : navigator.share ? "Partager le lien" : "Copier le lien"}
    </Block>
  );
}

function Side({ p, won, myId }) {
  return (
    <span
      className={clsx(
        "t-title min-w-0 flex-1 truncate text-[15px]",
        won ? "text-flare" : p ? "text-bone-2" : "text-bone-4"
      )}
    >
      {p ? p.username : "?"}
      {p?.id === myId && <span className="t-label ml-2 text-bone-4">vous</span>}
    </span>
  );
}
