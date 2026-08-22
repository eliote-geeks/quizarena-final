import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Block, Label, Loader } from "../ui";
import { ClanEmblem } from "../lib/clanEmblems";
import * as api from "../lib/api";

const STATUS = {
  PENDING: "En attente d’acceptation",
  TEAM_SELECTION: "Composition des équipes",
  IN_PROGRESS: "Confrontations en cours",
  COMPLETED: "Terminée",
  DECLINED: "Refusée",
  EXPIRED: "Expirée",
};
const STAKES = [0, 100, 500, 1_000, 5_000];
const money = (value) => `${Number(value ?? 0).toLocaleString("fr-FR")} F`;

export default function ClanWars() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(1);
  const [stake, setStake] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [matched, setMatched] = useState(null);
  const searchingRef = useRef(false);

  const revealMatch = useCallback((war) => {
    if (!war) return;
    setMatched(war);
    window.setTimeout(() => nav(`/clan-wars/${war.id}`), 1600);
  }, [nav]);

  const load = useCallback(async () => {
    try {
      const next = await api.getClanWars(page, 6);
      if (searchingRef.current && !next.search && next.activeWar) revealMatch(next.activeWar);
      searchingRef.current = Boolean(next.search);
      if (next.search) {
        setSize(next.search.teamSize);
        setStake(next.search.stakeCoins ?? 0);
      } else if (next.clanMemberCount) {
        setSize((current) => Math.max(1, Math.min(current, next.clanMemberCount, 20)));
      }
      setData(next);
    } catch (e) { setError(e.message); }
  }, [page, revealMatch]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!data?.search || matched) return undefined;
    const timer = window.setInterval(load, 2500);
    return () => window.clearInterval(timer);
  }, [data?.search, load, matched]);

  const run = async (key, action) => {
    setBusy(key); setError("");
    try { return await action(); }
    catch (e) { setError(e.message); return null; }
    finally { setBusy(""); }
  };
  const search = async () => {
    const result = await run("search", () => api.searchClanWar(size, stake));
    if (!result) return;
    if (result.matched) revealMatch(result.war);
    else { searchingRef.current = true; setData((current) => ({ ...current, search: result.search })); }
  };
  const cancelSearch = async () => {
    const result = await run("cancel-search", api.cancelClanWarSearch);
    if (result) { searchingRef.current = false; await load(); }
  };
  const acceptOffer = async (clanId) => {
    const result = await run(`offer-${clanId}`, () => api.acceptOpenClanWar(clanId));
    if (result?.war) revealMatch(result.war);
  };
  const respond = async (warId, accept) => {
    const result = await run(`respond-${warId}`, () => api.respondClanWar(warId, accept));
    if (!result) return;
    if (accept) revealMatch(result); else await load();
  };
  const cancelChallenge = async (warId) => {
    const result = await run(`cancel-${warId}`, () => api.cancelClanWar(warId));
    if (result) await load();
  };

  if (!data) return <Loader full />;
  if (!data.clan) return <main className="mx-auto w-full max-w-[980px] px-5 pt-12"><h1 className="t-display text-3xl">Guerres de clans</h1><p className="mt-5 text-bone-4">Rejoins d’abord un clan pour entrer dans l’arène collective.</p></main>;
  const active = data.activeWar;
  const searching = Boolean(data.search);
  const canLead = data.myRole === "leader";

  return <main className="mx-auto w-full max-w-[980px] px-5 pt-8 pb-20 sm:px-8">
    <Label tone="flare">compétition collective</Label>
    <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="t-display text-3xl sm:text-4xl">Guerres de clans</h1><p className="t-body mt-2 max-w-2xl text-sm text-bone-4">Une seule guerre à la fois, 24 heures maximum. Chaque demande fixe le format et la même mise pour les deux clans.</p></div>
      <div className="rounded-xl border border-ink-5 bg-ink-2 px-4 py-3 text-right"><div className="t-label text-bone-4">ton clan</div><div className="t-title mt-1">[{data.clan.tag}] {data.clan.name}</div></div>
    </div>
    {error && <p className="mt-5 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
    {active && <ActiveWar war={active} clanId={data.clan.id} onOpen={() => nav(`/clan-wars/${active.id}`)} />}
    {!active && data.incomingChallenges?.map((war) => <ChallengeCard key={war.id} war={war} clanId={data.clan.id} incoming canLead={canLead} busy={busy === `respond-${war.id}`} onAccept={() => respond(war.id, true)} onRefuse={() => respond(war.id, false)} onOpen={() => nav(`/clan-wars/${war.id}`)} />)}
    {!active && data.outgoingChallenges?.map((war) => <ChallengeCard key={war.id} war={war} clanId={data.clan.id} canLead={canLead} busy={busy === `cancel-${war.id}`} onCancel={() => cancelChallenge(war.id)} onOpen={() => nav(`/clan-wars/${war.id}`)} />)}

    {!active && canLead && <section className={`war-matchmaker mt-8 ${searching || matched ? "is-searching" : ""}`}>
      <div className="war-grid-glow" />
      <div className="relative z-[1] grid items-center gap-7 md:grid-cols-[1fr_270px]">
        <div>
          <div className="flex items-center gap-3"><span className="war-live-dot" /><Label tone="flare">matchmaking exact</Label><span className="text-[11px] text-bone-4">1 guerre maximum</span></div>
          <h2 className="t-display mt-4 text-2xl">{matched ? "Adversaire confirmé !" : searching ? "Demande publiée…" : "Trouver un clan"}</h2>
          <p className="t-body mt-2 max-w-xl text-sm text-bone-4">{matched ? "Les deux mises sont sécurisées. Ouverture de la composition des équipes." : searching ? `Offre visible : ${size}v${size}, ${stake ? money(stake) : "gratuit"}. Le hasard ne choisira qu’un clan aux mêmes conditions.` : "Choisis les combattants et la mise par clan. Tu peux attendre un appariement exact ou accepter une demande publique."}</p>
          {!searching && !matched && <>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="war-size-picker" aria-label="Nombre de combattants par clan"><button aria-label="Retirer un combattant" disabled={size <= 1} onClick={() => setSize((value) => Math.max(1, value - 1))}>−</button><div><strong>{size}</strong><span>contre</span><strong>{size}</strong></div><button aria-label="Ajouter un combattant" disabled={size >= Math.min(20, data.clanMemberCount ?? 20)} onClick={() => setSize((value) => Math.min(20, data.clanMemberCount ?? 20, value + 1))}>+</button></div>
              <div className="flex flex-wrap rounded-xl border border-ink-5 bg-ink p-1" aria-label="Mise par clan">{STAKES.map((amount) => <button key={amount} onClick={() => setStake(amount)} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${stake === amount ? "bg-flare text-ink" : "text-bone-4 hover:text-bone"}`}>{amount === 0 ? "Gratuit" : money(amount)}</button>)}</div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4"><Block disabled={busy === "search"} onClick={search}>{busy === "search" ? "Sécurisation…" : "Lancer la recherche aléatoire"}</Block><p className="text-xs text-bone-4">{stake ? `Pot net : ${money(Math.round(stake * 1.8))}, réparti entre les ${size} gagnants.` : "Aucun débit en mode gratuit."}</p></div>
          </>}
          {searching && !matched && <button disabled={busy === "cancel-search"} onClick={cancelSearch} className="mt-5 text-xs font-bold uppercase tracking-widest text-bone-4 hover:text-danger">Annuler la demande</button>}
        </div>
        <div className="war-radar" aria-hidden="true"><span className="war-radar-ring ring-one" /><span className="war-radar-ring ring-two" /><span className="war-radar-sweep" /><div className="war-versus"><span>{data.clan.tag}</span><b>VS</b><span className={matched ? "found" : "mystery"}>{matched ? (matched.challengerClanId === data.clan.id ? matched.defenderClan.tag : matched.challengerClan.tag) : "?"}</span></div></div>
      </div>
    </section>}

    {!active && <section className="mt-10">
      <div className="flex items-center justify-between"><div><Label tone="flare">marché des guerres</Label><h2 className="t-display mt-2 text-2xl">Demandes disponibles</h2></div><span className="t-label text-bone-4">{data.openRequests?.length ?? 0} offre(s)</span></div>
      <p className="t-body mt-2 text-sm text-bone-4">Tu acceptes exactement le format et la mise affichés. Aucun clan ne peut engager un montant différent.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">{!data.openRequests?.length ? <p className="text-sm text-bone-4">Aucune demande publique compatible pour l’instant.</p> : data.openRequests.map((request) => <article key={request.clanId} className="rounded-2xl border border-ink-5 bg-ink-2 p-4"><div className="flex items-center gap-3"><ClanEmblem emblemKey={request.clan.emblemKey} tag={request.clan.tag} color={request.clan.bannerColor} size="sm" /><div className="min-w-0 flex-1"><h3 className="t-title truncate">{request.clan.name}</h3><p className="text-xs text-bone-4">{request.clan._count.members} membres · {request.teamSize}v{request.teamSize}</p></div><div className="text-right"><div className="t-display text-lg text-flare">{request.stakeCoins ? money(request.stakeCoins) : "GRATUIT"}</div><div className="t-label text-[9px] text-bone-4">par clan</div></div></div>{canLead && <Block full className="mt-4" disabled={Boolean(busy)} onClick={() => acceptOffer(request.clanId)}>{busy === `offer-${request.clanId}` ? "Sécurisation…" : "Accepter cette guerre"}</Block>}</article>)}</div>
    </section>}

    <section className="mt-12 border-t border-ink-5 pt-8">
      <div className="flex items-center justify-between"><div><Label>archives officielles</Label><h2 className="t-display mt-2 text-2xl">Historique des guerres</h2></div><span className="text-xs text-bone-4">{data.historyTotal ?? 0} résultat(s)</span></div>
      <div className="mt-5 grid gap-3">{!data.history?.length ? <p className="text-sm text-bone-4">Aucune guerre terminée.</p> : data.history.map((war) => <WarHistory key={war.id} war={war} clanId={data.clan.id} onOpen={() => nav(`/clan-wars/${war.id}`)} />)}</div>
      {(data.historyPages ?? 1) > 1 && <div className="mt-6 flex items-center justify-center gap-3"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-ink-5 px-4 py-2 text-xs disabled:opacity-30">← Précédent</button><span className="t-label text-bone-4">{page} / {data.historyPages}</span><button disabled={page >= data.historyPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-ink-5 px-4 py-2 text-xs disabled:opacity-30">Suivant →</button></div>}
    </section>
  </main>;
}

function ActiveWar({ war, clanId, onOpen }) {
  const enemy = war.challengerClanId === clanId ? war.defenderClan : war.challengerClan;
  return <button onClick={onOpen} className="group mt-8 w-full overflow-hidden rounded-2xl border border-live/35 bg-linear-to-r from-live/10 via-ink-2 to-ink-2 p-6 text-left shadow-[0_0_35px_rgba(52,211,153,.08)]"><div className="flex flex-wrap items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-xl bg-live/15 text-2xl">⚔</span><div className="min-w-0 flex-1"><div className="t-label flex items-center gap-2 text-live"><span className="h-2 w-2 animate-pulse rounded-full bg-live" />guerre active · aucune autre recherche possible</div><h2 className="t-display mt-2 text-2xl">{war.challengerClan.name} <span className="text-flare">vs</span> {war.defenderClan.name}</h2><p className="mt-1 text-sm text-bone-4">{war.teamSize}v{war.teamSize} · {STATUS[war.status]} · {war.stakeCoins ? `${money(war.stakeCoins)} par clan` : "gratuit"}</p></div><div className="text-right"><div className="t-display text-3xl">{war.challengerScore}–{war.defenderScore}</div><span className="t-label text-flare">ouvrir l’arène →</span></div></div><p className="mt-4 text-xs text-bone-4">Adversaire : [{enemy.tag}] {enemy.name}. Termine ou attends la clôture de cette guerre avant d’en lancer une autre.</p></button>;
}

function ChallengeCard({ war, clanId, incoming, canLead, busy, onAccept, onRefuse, onCancel, onOpen }) {
  const enemy = war.challengerClanId === clanId ? war.defenderClan : war.challengerClan;
  return <section className="mt-6 rounded-2xl border border-flare/35 bg-flare/8 p-5"><div className="flex flex-wrap items-center gap-4"><div className="min-w-0 flex-1"><Label tone="flare">{incoming ? "nouvelle déclaration de guerre" : "défi envoyé"}</Label><h2 className="t-display mt-2 text-xl">[{enemy.tag}] {enemy.name}</h2><p className="mt-2 text-sm text-bone-4">{war.teamSize}v{war.teamSize} · {war.stakeCoins ? `${money(war.stakeCoins)} par clan` : "guerre gratuite"}</p></div><button onClick={onOpen} className="text-xs font-bold text-bone-3 hover:text-flare">Voir les détails →</button></div>{canLead && <div className="mt-4 flex flex-wrap gap-3">{incoming ? <><Block tone="outline" disabled={busy} onClick={onRefuse}>Refuser</Block><Block disabled={busy} onClick={onAccept}>{busy ? "Vérification des mises…" : "Accepter et sécuriser les mises"}</Block></> : <Block tone="outline" disabled={busy} onClick={onCancel}>{busy ? "Annulation…" : "Retirer le défi"}</Block>}</div>}</section>;
}

function WarHistory({ war, clanId, onOpen }) {
  const enemy = war.challengerClanId === clanId ? war.defenderClan : war.challengerClan;
  const won = war.status === "COMPLETED" && war.winnerClanId === clanId;
  const lost = war.status === "COMPLETED" && war.winnerClanId && war.winnerClanId !== clanId;
  return <button onClick={onOpen} className="press flex items-center gap-4 rounded-xl border border-ink-5 bg-ink-2 p-4 text-left"><div className={`grid h-10 w-10 place-items-center rounded-full text-lg ${won ? "bg-live/15 text-live" : lost ? "bg-danger/15 text-danger" : "bg-ink-4 text-bone-4"}`}>{won ? "V" : lost ? "D" : "·"}</div><div className="min-w-0 flex-1"><div className="t-title truncate">{war.challengerClan.name} <span className="text-flare">vs</span> {war.defenderClan.name}</div><div className="mt-1 text-xs text-bone-4">{STATUS[war.status]} · {war.teamSize}v{war.teamSize} · {war.stakeCoins ? money(war.stakeCoins) : "gratuit"}</div></div><div className="text-right"><div className="t-display text-xl">{war.challengerScore}–{war.defenderScore}</div><div className="t-label text-[9px] text-bone-4">contre {enemy.tag}</div></div></button>;
}
