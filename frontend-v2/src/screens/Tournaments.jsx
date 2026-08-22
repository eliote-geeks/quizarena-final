import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Block, ConfirmModal, Input, Label, Loader, Tag } from "../ui";
import { CategoryIcon, CATEGORY_ICON, CATEGORY_PHOTO, NavIcon } from "../ui/icons";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";

const STAKES = [500, 1000, 2500, 5000];

/**
 * Bracket à élimination directe, vraie inscription payante (débit
 * immédiat) et vrai bracket serveur — voir backend/src/modules/tournament/.
 * La création possède sa route dédiée /tournaments/create.
 */
export default function Tournaments() {
  const nav = useNavigate();
  const { balanceCoins } = useAuth();
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [cat, setCat] = useState(null);
  const [coverImage] = useState(null);
  const [stake, setStake] = useState(500);
  const [capacity, setCapacity] = useState(4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmCreate, setConfirmCreate] = useState(false);
  const [confirmJoin, setConfirmJoin] = useState(null);
  const sheetRef = useRef(null);

  useEffect(() => {
    api.getTournaments().then(setData);
    api.getCategories().then((result) => setCategories(result.categories));
  }, []);

  useEffect(() => {
    if (!showCreate) return;
    const handler = (event) => { if (sheetRef.current && !sheetRef.current.contains(event.target)) setShowCreate(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCreate]);

  const myIds = new Set((data?.mine ?? []).map((t) => t.id));
  const joinable = (data?.open ?? []).filter((t) => !myIds.has(t.id));
  const trimmedName = name.trim();
  const potTotal = stake * capacity;
  const canAfford = balanceCoins >= stake;

  const create = async () => {
    if (busy || !trimmedName) return;
    setConfirmCreate(false); setBusy(true); setError("");
    try {
      const tournament = await api.createTournament({ name: trimmedName, categoryId: cat ?? undefined, coverImage: coverImage ?? undefined, stakeCoins: stake, capacity });
      nav(`/tournaments/${tournament.id}`);
    } catch (err) { setError(err.message || "Impossible de créer le tournoi"); setBusy(false); }
  };

  const join = async (id) => {
    if (busy) return;
    setConfirmJoin(null);
    setBusy(true);
    setError("");
    try {
      await api.joinTournament(id);
      nav(`/tournaments/${id}`);
    } catch (err) {
      setError(err.message || "Impossible de rejoindre");
      setBusy(false);
    }
  };

  const confirmJoinTarget = confirmJoin ? joinable.find((t) => t.id === confirmJoin) : null;

  if (!data) return <Loader full />;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 pt-8 pb-24 sm:px-8 sm:pt-12">
      <Label tone="flare">cagnottes communes</Label>
      <h1 className="t-display mt-3 text-2xl sm:text-3xl">Tournois</h1>
      <p className="t-body mt-2 max-w-md text-sm text-bone-4">
        Bracket à élimination directe. 1er ·&nbsp;60%, finaliste ·&nbsp;25%, demi-finalistes ·&nbsp;7,5% chacun.
      </p>

      {error && <p className="t-body mt-4 text-sm text-danger">{error}</p>}

      {/* ── Mes tournois ── */}
      {data.mine.length > 0 && (
        <section className="mt-10">
          <Label className="mb-4">mes tournois</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.mine.map((t) => (
              <TournamentCard key={t.id} t={t} onClick={() => nav(`/tournaments/${t.id}`)} />
            ))}
          </div>
        </section>
      )}

      {/* ── Tournois ouverts ── */}
      <section className="mt-10">
        <Label className="mb-4">tournois ouverts</Label>
        {joinable.length === 0 ? (
          <p className="t-body py-4 text-sm text-bone-4">
            Aucun tournoi en attente — créez le vôtre via le&nbsp;<span className="font-bold text-flare">+</span>&nbsp;en bas.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {joinable.map((t) => (
              <TournamentCard key={t.id} t={t} onClick={() => setConfirmJoin(t.id)} action="rejoindre" />
            ))}
          </div>
        )}
      </section>

      {/* ── FAB créer ── */}
      <button
        onClick={() => nav("/tournaments/create")}
        aria-label="Créer un tournoi"
        className="press fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-5 z-[9800] flex h-14 w-14 items-center justify-center rounded-full bg-flare text-ink shadow-xl shadow-flare/30 hover:bg-flare/90 sm:bottom-6 sm:right-8"
      >
        <NavIcon type="plus" className="h-7 w-7" />
      </button>

      {/* ── Bottom sheet création ── */}
      {showCreate && (
        <div className="fixed inset-0 z-[10001] flex items-end justify-center bg-ink/60 backdrop-blur-[3px] sm:items-center">
          <div
            ref={sheetRef}
            className="anim-rise w-full max-w-[640px] overflow-y-auto rounded-t-2xl bg-ink-2 px-6 pt-6 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] shadow-2xl sm:rounded-2xl sm:max-h-[90vh]"
            style={{ maxHeight: "90dvh" }}
          >
            {/* En-tête */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <Label tone="flare">nouveau tournoi</Label>
                <h2 className="t-display mt-1 text-xl">Créer un tournoi</h2>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-4 text-bone-3 hover:text-bone"
              >
                <NavIcon type="x" className="h-4 w-4" />
              </button>
            </div>

            {categories === null ? (
              <div className="flex justify-center py-8"><Loader /></div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Nom */}
                <FormStep number={1} title="Nom du tournoi">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex. Coupe des amis, Grand Quiz…"
                    maxLength={60}
                  />
                </FormStep>

                {/* Catégorie */}
                <FormStep number={2} title="Thème" subtitle="Facultatif — Mélangé par défaut">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <CatBtn selected={cat === null} onClick={() => setCat(null)} label="Mélangé" sub="toutes catégories" />
                    {categories.slice(0, 5).map((c) => (
                      <CatBtn
                        key={c.id}
                        selected={cat === c.id}
                        onClick={() => setCat(c.id)}
                        label={c.name}
                        sub={`${c.questionCount} questions`}
                        photo={CATEGORY_PHOTO[c.id]}
                      />
                    ))}
                  </div>
                </FormStep>

                {/* Mise */}
                <FormStep number={3} title="Droit d'entrée">
                  <div className="grid grid-cols-4 gap-2">
                    {STAKES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStake(s)}
                        className={clsx(
                          "press flex flex-col items-center rounded-(--radius-card) py-3 gap-0.5 transition-all",
                          stake === s ? "bg-flare text-ink" : "bg-ink-3 text-bone-2 hover:bg-ink-4"
                        )}
                      >
                        <span className="t-display text-lg font-black">{s.toLocaleString("fr-FR")}</span>
                        <span className={clsx("t-label text-[10px]", stake === s ? "opacity-70" : "text-bone-4")}>FCFA</span>
                      </button>
                    ))}
                  </div>
                </FormStep>

                {/* Capacité */}
                <FormStep number={4} title="Nombre de joueurs">
                  <div className="grid grid-cols-3 gap-2">
                    {(data.capacities ?? [4, 8, 16]).map((n) => (
                      <button
                        key={n}
                        onClick={() => setCapacity(n)}
                        className={clsx(
                          "press flex flex-col items-center rounded-(--radius-card) py-4 gap-1 transition-all",
                          capacity === n ? "bg-flare text-ink" : "bg-ink-3 text-bone-2 hover:bg-ink-4"
                        )}
                      >
                        <span className="t-display text-2xl font-black">{n}</span>
                        <span className={clsx("t-label text-[10px]", capacity === n ? "opacity-70" : "text-bone-4")}>
                          {n === 4 ? "2 tours" : n === 8 ? "3 tours" : "4 tours"}
                        </span>
                      </button>
                    ))}
                  </div>
                </FormStep>

                {/* Résumé */}
                <div className="rounded-(--radius-card) bg-ink-3 px-4 py-3 flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="t-body text-bone-4">Pot total</span>
                    <span className="t-display text-flare font-black">{potTotal.toLocaleString("fr-FR")} F</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="t-body text-bone-4">1er · 60%</span>
                    <span className="t-body text-bone-3">{Math.round(potTotal * 0.6).toLocaleString("fr-FR")} F</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="t-body text-bone-4">2e · 25%</span>
                    <span className="t-body text-bone-3">{Math.round(potTotal * 0.25).toLocaleString("fr-FR")} F</span>
                  </div>
                  <div className="h-px bg-ink-5 my-0.5" />
                  <div className="flex justify-between text-sm">
                    <span className="t-body text-bone-4">Votre solde</span>
                    <span className={clsx("t-body font-semibold", canAfford ? "text-live" : "text-danger")}>
                      {balanceCoins.toLocaleString("fr-FR")} F
                    </span>
                  </div>
                </div>

                {!canAfford && (
                  <p className="t-body text-sm text-danger">Solde insuffisant. Rechargez depuis le portefeuille.</p>
                )}

                <Block
                  size="lg"
                  full
                  icon={<NavIcon type="trophy" className="h-5 w-5" />}
                  onClick={() => setConfirmCreate(true)}
                  loading={busy}
                  disabled={!trimmedName || !canAfford}
                >
                  Créer · {stake.toLocaleString("fr-FR")} F
                </Block>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modales ── */}
      <ConfirmModal
        open={confirmCreate}
        title={trimmedName ? `Créer « ${trimmedName} » ?` : "Créer ce tournoi ?"}
        message={`Droit d'entrée débité immédiatement : ${stake.toLocaleString("fr-FR")} F. Pot total : ${potTotal.toLocaleString("fr-FR")} F pour ${capacity} joueurs. Démarre automatiquement dès que toutes les places sont prises.`}
        confirmLabel="Créer et payer"
        busy={busy}
        onConfirm={create}
        onCancel={() => setConfirmCreate(false)}
      />
      <ConfirmModal
        open={!!confirmJoin}
        title="Rejoindre ce tournoi ?"
        message={
          confirmJoinTarget
            ? `Droit d'entrée débité immédiatement : ${confirmJoinTarget.stakeCoins.toLocaleString("fr-FR")} F. Place ${confirmJoinTarget.entryCount + 1}/${confirmJoinTarget.capacity}.`
            : ""
        }
        confirmLabel="Rejoindre et payer"
        busy={busy}
        onConfirm={() => join(confirmJoin)}
        onCancel={() => setConfirmJoin(null)}
      />
    </div>
  );
}

/* ── Sous-composants ── */

function FormStep({ number, title, subtitle, children }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-flare/15 text-flare t-label text-[10px] font-black">
          {number}
        </span>
        <div>
          <p className="t-label text-[13px] font-bold text-bone-2">{title}</p>
          {subtitle && <p className="t-body mt-0.5 text-xs text-bone-4">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function CatBtn({ selected, onClick, label, sub, photo }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "press relative flex flex-col items-start overflow-hidden rounded-(--radius-card) px-3 py-2.5 text-left transition-all",
        selected ? "ring-2 ring-flare bg-flare/10" : "bg-ink-3 hover:bg-ink-4"
      )}
    >
      {photo && <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover opacity-10" />}
      <span className={clsx("t-title relative text-[13px]", selected ? "text-flare" : "text-bone-2")}>{label}</span>
      {sub && <span className="t-body relative mt-0.5 text-[11px] text-bone-4">{sub}</span>}
    </button>
  );
}

export function TournamentCard({ t, onClick, action, preview = false }) {
  const photo = t.coverImage || CATEGORY_PHOTO[t.categoryId];
  const iconType = CATEGORY_ICON[t.categoryId] ?? "star";
  const fill = t.capacity > 0 ? t.entryCount / t.capacity : 0;

  return (
    <button
      onClick={onClick}
      className={clsx(
        "press group flex flex-col overflow-hidden rounded-(--radius-card) bg-ink-3 text-left",
        !preview && "hover:bg-ink-4"
      )}
    >
      <div className="fade-to-panel relative h-24 w-full overflow-hidden flex-shrink-0">
        {photo ? (
          <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-ink-4">
            <CategoryIcon type={iconType} className="h-6 w-6 text-bone-4" />
          </div>
        )}
        <Tag tone={statusTone(t.status)} className="absolute top-2 left-2 text-[9px] px-2 py-0.5">
          {statusLabel(t.status)}
        </Tag>
        <span className="absolute top-2 right-2 t-display text-[12px] font-black text-flare bg-ink/60 rounded-sm px-1.5 py-0.5">
          {t.stakeCoins.toLocaleString("fr-FR")} F
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-3 py-3">
        <h3 className="t-display text-[13px] leading-snug line-clamp-2">{t.name}</h3>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="t-label text-[10px] text-bone-4">{t.entryCount}/{t.capacity} joueurs</span>
            {t.status === "REGISTERING" && (
              <span className="t-label text-[9px] text-live">
                {t.capacity - t.entryCount} place{t.capacity - t.entryCount !== 1 ? "s" : ""} libre{t.capacity - t.entryCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="h-1 w-full rounded-full bg-ink-5 overflow-hidden">
            <div
              className={clsx("h-full rounded-full transition-all", t.status === "IN_PROGRESS" ? "bg-flare" : "bg-live")}
              style={{ width: `${Math.min(100, fill * 100)}%` }}
            />
          </div>
        </div>
        {action && (
          <span className="t-label text-[11px] text-flare opacity-0 transition-opacity group-hover:opacity-100">
            {action} ›
          </span>
        )}
      </div>
    </button>
  );
}

function statusLabel(status) {
  if (status === "REGISTERING") return "inscriptions";
  if (status === "IN_PROGRESS") return "en cours";
  return "terminé";
}
function statusTone(status) {
  if (status === "REGISTERING") return "live";
  if (status === "IN_PROGRESS") return "flare";
  return "ghost";
}
