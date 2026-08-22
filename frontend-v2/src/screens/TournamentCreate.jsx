import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Block, ConfirmModal, Input, Label, Loader, Money } from "../ui";
import { CATEGORY_PHOTO, NavIcon } from "../ui/icons";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";

const STAKES = [500, 1000, 2500, 5000];
const CAPACITIES = [4, 8, 16];

export default function TournamentCreate() {
  const nav = useNavigate();
  const { balanceCoins } = useAuth();
  const [categories, setCategories] = useState(null);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [stakeCoins, setStakeCoins] = useState(500);
  const [capacity, setCapacity] = useState(4);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { api.getCategories().then((result) => setCategories(result.categories)).catch(() => setError("Impossible de charger les thèmes")); }, []);

  const selectedCategory = useMemo(() => categories?.find((item) => item.id === categoryId) ?? null, [categories, categoryId]);
  const pot = stakeCoins * capacity;
  const canAfford = balanceCoins >= stakeCoins;
  const valid = name.trim().length >= 3 && canAfford;

  const create = async () => {
    if (!valid || busy) return;
    setConfirm(false); setBusy(true); setError("");
    try {
      const tournament = await api.createTournament({ name: name.trim(), categoryId: categoryId ?? undefined, coverImage: selectedCategory ? CATEGORY_PHOTO[selectedCategory.id] : undefined, stakeCoins, capacity });
      nav(`/tournaments/${tournament.id}`, { replace: true });
    } catch (err) { setError(err.message || "Impossible de créer le tournoi"); setBusy(false); }
  };

  if (!categories && !error) return <Loader full />;

  return (
    <main className="mx-auto w-full max-w-[1050px] px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
      <button onClick={() => nav("/tournaments")} className="t-label text-bone-4 hover:text-flare">← tournois</button>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_330px] lg:items-start">
        <div>
          <Label tone="flare">nouvelle compétition</Label>
          <h1 className="t-display mt-3 text-3xl sm:text-4xl">Créer un tournoi</h1>
          <p className="t-body mt-2 max-w-xl text-sm text-bone-4">Configure ton bracket. Le tournoi démarre automatiquement dès que toutes les places sont prises.</p>

          <div className="mt-8 space-y-5">
            <Panel number="01" title="Identité">
              <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Ex. Coupe des champions" />
            </Panel>

            <Panel number="02" title="Thème" hint="Mélangé utilise toute la réserve de questions.">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Choice active={categoryId === null} onClick={() => setCategoryId(null)} title="Mélangé" subtitle="tous les thèmes" />
                {categories?.map((category) => <Choice key={category.id} active={categoryId === category.id} onClick={() => setCategoryId(category.id)} title={category.name} photo={CATEGORY_PHOTO[category.id]} />)}
              </div>
            </Panel>

            <Panel number="03" title="Droit d’entrée">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{STAKES.map((stake) => <Choice key={stake} active={stakeCoins === stake} onClick={() => setStakeCoins(stake)} title={`${stake.toLocaleString("fr-FR")} F`} subtitle="par joueur" />)}</div>
            </Panel>

            <Panel number="04" title="Format du bracket">
              <div className="grid grid-cols-3 gap-2">{CAPACITIES.map((count) => <Choice key={count} active={capacity === count} onClick={() => setCapacity(count)} title={`${count} joueurs`} subtitle={`${Math.log2(count)} tours`} />)}</div>
            </Panel>
          </div>
        </div>

        <aside className="overflow-hidden rounded-2xl border border-flare/25 bg-ink-2 lg:sticky lg:top-8">
          <div className="relative h-36 overflow-hidden bg-ink-3">
            {selectedCategory && <img src={CATEGORY_PHOTO[selectedCategory.id]} alt="" className="h-full w-full object-cover opacity-45" />}
            <div className="absolute inset-0 grid place-items-center"><NavIcon type="trophy" className="h-12 w-12 text-flare" /></div>
          </div>
          <div className="p-5">
            <Label>aperçu officiel</Label>
            <h2 className="t-display mt-2 text-xl">{name.trim() || "Nom du tournoi"}</h2>
            <p className="t-body mt-1 text-xs text-bone-4">{selectedCategory?.name || "Questions mélangées"} · {capacity} joueurs</p>
            <div className="mt-5 grid grid-cols-2 gap-4 border-y border-bone/10 py-4"><div><Label>pot total</Label><Money value={pot} size="sm" tone="flare" /></div><div><Label>1er prix</Label><Money value={Math.round(pot * 0.6)} size="sm" tone="live" /></div></div>
            <div className="mt-4 space-y-2 text-xs text-bone-4"><div className="flex justify-between"><span>Finaliste</span><strong>{Math.round(pot * 0.25).toLocaleString("fr-FR")} F</strong></div><div className="flex justify-between"><span>Ton solde</span><strong className={canAfford ? "text-bone" : "text-danger"}>{balanceCoins.toLocaleString("fr-FR")} F</strong></div></div>
            {error && <p className="t-body mt-4 text-sm text-danger">{error}</p>}
            {!canAfford && <p className="t-body mt-4 text-xs text-danger">Solde insuffisant pour le droit d’entrée choisi.</p>}
            <Block full size="lg" className="mt-5" icon={<NavIcon type="trophy" className="h-4 w-4" />} disabled={!valid} loading={busy} onClick={() => setConfirm(true)}>Créer et payer</Block>
          </div>
        </aside>
      </div>

      <ConfirmModal open={confirm} title={`Créer « ${name.trim()} » ?`} message={`Le droit d’entrée de ${stakeCoins.toLocaleString("fr-FR")} F sera débité. Le tournoi démarrera à ${capacity} joueurs avec un pot de ${pot.toLocaleString("fr-FR")} F.`} confirmLabel="Confirmer la création" busy={busy} onConfirm={create} onCancel={() => setConfirm(false)} />
    </main>
  );
}

function Panel({ number, title, hint, children }) {
  return <section className="rounded-2xl border border-ink-5 bg-ink-2 p-5"><div className="mb-4 flex gap-3"><span className="t-label text-flare">{number}</span><div><h2 className="t-display text-lg">{title}</h2>{hint && <p className="t-body mt-0.5 text-xs text-bone-4">{hint}</p>}</div></div>{children}</section>;
}

function Choice({ active, onClick, title, subtitle, photo }) {
  return <button type="button" onClick={onClick} className={clsx("press relative min-h-16 overflow-hidden rounded-xl border p-3 text-left transition", active ? "border-flare bg-flare/12" : "border-ink-5 bg-ink-3 hover:bg-ink-4")}>
    {photo && <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover opacity-10" />}
    <strong className={clsx("t-title relative block text-sm", active && "text-flare")}>{title}</strong>{subtitle && <span className="t-body relative mt-1 block text-[10px] text-bone-4">{subtitle}</span>}
  </button>;
}
