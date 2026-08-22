import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Block, ConfirmModal, Label, Loader, Money } from "../ui";
import { NavIcon } from "../ui/icons";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import * as duel from "../lib/duelSocket";

const POLL_MS = 5000;

/**
 * Liste publique des duels ouverts (§DuelSetup.jsx mode "Duel ouvert") —
 * n'importe qui peut en rejoindre un directement d'ici, sans code ni
 * lien. Poll REST simple (§backend/duel/routes.ts), pas de canal WS
 * dédié : la liste est courte et la fraîcheur à 5s près suffit très
 * largement pour un duel qui reste ouvert plusieurs minutes.
 */
export default function OpenDuels() {
  const nav = useNavigate();
  const { balanceCoins } = useAuth();
  const [open, setOpen] = useState(null);
  const [mine, setMine] = useState(undefined); // undefined = pas encore chargé, null = pas de duel
  const [joiningCode, setJoiningCode] = useState(null);
  const [error, setError] = useState("");
  const [pendingJoin, setPendingJoin] = useState(null); // duel en attente de confirmation

  useEffect(() => {
    let alive = true;
    const load = () => api.getOpenDuels().then((d) => { if (!alive) return; setOpen(d.open); setMine(d.mine ?? null); });
    load();
    const t = setInterval(load, POLL_MS);
    duel.connect();
    // Si le join échoue (déjà pris entre-temps, solde insuffisant côté
    // serveur…) : débloquer le bouton et rafraîchir la liste plutôt que
    // de rester bloqué sur "Rejoindre…" indéfiniment. Le cas de succès
    // n'a rien à faire ici — §GlobalDuelWatcher.jsx gère la navigation.
    const offError = duel.on("error", (msg) => {
      setJoiningCode(null);
      setError(msg.message || "Impossible de rejoindre ce duel.");
      load();
    });
    return () => {
      alive = false;
      clearInterval(t);
      offError();
    };
  }, []);

  const join = (d) => {
    if (joiningCode) return;
    if (d.stakeCoins > balanceCoins) {
      setError("Solde insuffisant pour cette mise.");
      return;
    }
    setError("");
    setPendingJoin(d); // affiche la confirmation
  };

  const confirmJoin = () => {
    if (!pendingJoin) return;
    const d = pendingJoin;
    setPendingJoin(null);
    setJoiningCode(d.code);
    duel.connect();
    duel.joinInvite(d.code);
    // La navigation vers /duel/play arrive via le "matched" global
    // (§ui/GlobalDuelWatcher.jsx) dès que le serveur confirme — pas
    // besoin d'attendre ici, juste désactiver le bouton entre-temps.
  };

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 pt-8 pb-16 sm:px-8 sm:pt-12">
      <button onClick={() => nav("/duel")} className="t-label text-bone-4 hover:text-flare">
        ← duel
      </button>
      <Label tone="flare" className="mt-5">
        premier arrivé, premier servi
      </Label>
      <h1 className="t-display mt-2 text-2xl sm:text-3xl">Duels ouverts</h1>
      <p className="t-body mt-2 max-w-md text-sm text-bone-4">
        Des joueurs attendent un adversaire — rejoins-en un et la partie
        démarre tout de suite, comme un matchmaking public mais avec le
        montant visible à l'avance.
      </p>

      {error && <p className="t-body mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-10">
        {/* Duel ouvert que l'utilisateur courant a publié — filtré de "open"
            par le backend (il ne peut pas se rejoindre lui-même), montré ici
            séparément pour qu'il puisse confirmer la publication. */}
        {mine && (
          <div className="mb-3 flex items-center gap-2.5 rounded-(--radius-card) border border-flare/30 bg-flare/8 px-3 py-2.5 sm:gap-4 sm:px-5 sm:py-4">
            <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-(--radius-tag) bg-flare/22 text-flare sm:flex">
              <NavIcon type="megaphone" className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="t-title truncate text-[14px] sm:text-[15px]">{mine.username}</div>
              <div className="t-label mt-0.5 text-[11px] text-flare sm:text-xs">Ton duel · en attente</div>
            </div>
            <Money value={mine.stakeCoins} size="sm" tone="flare" />
          </div>
        )}

        {open === null && (
          <div className="flex justify-center py-10">
            <Loader />
          </div>
        )}
        {open?.length === 0 && !mine && (
          <p className="t-body py-6 text-sm text-bone-4">
            Aucun duel ouvert pour l'instant — publie le tien depuis l'écran duel.
          </p>
        )}
        {open?.length === 0 && mine && (
          <p className="t-body py-6 text-sm text-bone-4">
            Ton duel est publié — en attente que quelqu'un le rejoigne.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {(open ?? []).map((d) => (
            <div
              key={d.code}
              className="flex items-center gap-2.5 rounded-(--radius-card) bg-ink-2 px-3 py-2.5 sm:gap-4 sm:px-5 sm:py-4"
            >
              <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-(--radius-tag) bg-flare/22 text-flare sm:flex">
                <NavIcon type="megaphone" className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="t-title truncate text-[14px] sm:text-[15px]">{d.username}</div>
                <div className="t-label mt-0.5 text-[11px] text-bone-4 sm:text-xs">
                  <span className="hidden sm:inline">à gagner </span>
                  <span className="text-live">{d.prizeCoins?.toLocaleString("fr-FR")} F</span>
                  <span className="text-bone-4"> · élo {d.eloRating}</span>
                </div>
              </div>
              <div className="hidden text-right sm:block">
                <Label className="mb-1">mise</Label>
                <Money value={d.stakeCoins} size="sm" tone="flare" />
              </div>
              <Money value={d.stakeCoins} size="sm" tone="flare" className="sm:hidden" />
              <Block size="sm" onClick={() => join(d)} loading={joiningCode === d.code} disabled={!!joiningCode} className="px-3 py-2 text-[12px] sm:px-4 sm:py-2.5 sm:text-[13px]">
                Rejoindre
              </Block>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de confirmation avant de rejoindre */}
      <ConfirmModal
        open={!!pendingJoin}
        title={`Rejoindre le duel de ${pendingJoin?.username ?? ""} ?`}
        message={
          pendingJoin
            ? `Mise de ${pendingJoin.stakeCoins.toLocaleString("fr-FR")} F débitée immédiatement. Si tu gagnes, tu remportes ${pendingJoin.prizeCoins?.toLocaleString("fr-FR")} F.`
            : ""
        }
        confirmLabel={`Rejoindre · ${pendingJoin?.stakeCoins?.toLocaleString("fr-FR") ?? ""} F`}
        onConfirm={confirmJoin}
        onCancel={() => setPendingJoin(null)}
      />
    </div>
  );
}
