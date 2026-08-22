import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Block, Label, Loader } from "../ui";
import { ClanEmblem } from "../lib/clanEmblems";
import * as api from "../lib/api";
import * as duel from "../lib/duelSocket";

const money = (value) => `${Number(value ?? 0).toLocaleString("fr-FR")} F`;
const STATUS = { PENDING: "Proposition en attente", TEAM_SELECTION: "Composition des équipes", IN_PROGRESS: "Guerre en cours", COMPLETED: "Guerre terminée", DECLINED: "Proposition refusée", EXPIRED: "Délai expiré" };

export default function ClanWarDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [war, setWar] = useState(null);
  const [myClan, setMyClan] = useState(null);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = async () => {
    try {
      const data = await api.getClanWar(id);
      setWar(data);
      if (data.myClanId) setMyClan(await api.getClan(data.myClanId));
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); const timer = window.setInterval(load, 5_000); return () => window.clearInterval(timer); }, [id]);

  const myClanId = war?.myClanId;
  const isLeader = war?.myRole === "leader";
  const incoming = war?.defenderClanId === myClanId;
  const alreadySelected = useMemo(() => war?.members.filter((member) => member.clanId === myClanId).length ?? 0, [war, myClanId]);
  const mySelected = useMemo(() => new Set(war?.members.filter((member) => member.clanId === myClanId).map((member) => member.userId) ?? []), [war, myClanId]);

  const run = async (key, action) => {
    setBusy(key); setError("");
    try { await action(); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(""); }
  };
  const respond = (accept) => run("respond", () => api.respondClanWar(id, accept));
  const cancel = () => run("cancel", () => api.cancelClanWar(id));
  const submitTeam = () => run("team", () => api.selectClanWarTeam(id, selected));
  const enter = () => { setBusy("enter"); duel.connect(); duel.clanWarEnter(war.myNextMatchId); };

  if (error && !war) return <main className="mx-auto max-w-3xl p-8 text-center"><p className="text-danger">{error}</p><button onClick={() => nav("/clan-wars")} className="mt-5 text-flare">← Retour aux guerres</button></main>;
  if (!war) return <Loader full />;
  const resultTone = war.myClanResult === "win" ? "live" : war.myClanResult === "loss" ? "danger" : "flare";

  return <main className="mx-auto w-full max-w-[980px] px-5 pt-8 pb-20 sm:px-8">
    <button onClick={() => nav("/clan-wars")} className="t-label text-bone-4 hover:text-flare">← guerres de clans</button>
    {error && <p className="mt-5 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

    <section className="relative mt-6 overflow-hidden rounded-3xl border border-flare/25 bg-ink-2 p-6 sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,.12),transparent_55%)]" />
      <div className="relative"><div className="flex flex-wrap items-center justify-between gap-3"><Label tone={war.status === "IN_PROGRESS" ? "live" : "flare"}>{STATUS[war.status]}</Label><span className="t-label text-bone-4">{war.teamSize} contre {war.teamSize} · {war.stakeCoins ? `${money(war.stakeCoins)} par clan` : "gratuit"}</span></div>
        <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center sm:gap-8">
          <ClanSide clan={war.challengerClan} />
          <div><div className="t-display text-4xl sm:text-6xl">{war.challengerScore}<span className="mx-2 text-bone-4">–</span>{war.defenderScore}</div><div className="t-label mt-2 text-flare">VS</div></div>
          <ClanSide clan={war.defenderClan} />
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3"><Info label="Mise totale" value={war.stakeCoins ? money(war.stakeCoins * 2) : "Aucune"} /><Info label="Pot net gagnant" value={war.stakeCoins ? money(Math.round(war.stakeCoins * 1.8)) : "Honneur"} /><Info label="Échéance" value={war.endsAt ? new Date(war.endsAt).toLocaleString("fr-FR") : "Après acceptation"} /></div>
      </div>
    </section>

    {war.status === "PENDING" && <section className="mt-6 rounded-2xl border border-flare/35 bg-flare/8 p-5"><Label tone="flare">décision du chef</Label><h2 className="t-display mt-2 text-xl">{incoming ? `${war.challengerClan.name} attend ta réponse` : `En attente de ${war.defenderClan.name}`}</h2><p className="mt-2 text-sm text-bone-4">Les mises ne seront débitées qu’à l’acceptation. Si un chef n’a plus le solde requis, la guerre ne démarre pas.</p>{isLeader && <div className="mt-4 flex flex-wrap gap-3">{incoming ? <><Block tone="outline" disabled={Boolean(busy)} onClick={() => respond(false)}>Refuser</Block><Block disabled={Boolean(busy)} onClick={() => respond(true)}>{busy ? "Vérification…" : "Accepter la guerre"}</Block></> : <Block tone="outline" disabled={Boolean(busy)} onClick={cancel}>{busy ? "Annulation…" : "Retirer le défi"}</Block>}</div>}</section>}

    {war.status === "TEAM_SELECTION" && <section className="mt-8 rounded-2xl border border-ink-5 bg-ink-2 p-5 sm:p-6"><div className="flex items-center justify-between"><div><Label tone="flare">composition officielle</Label><h2 className="t-display mt-2 text-xl">{alreadySelected ? "Équipe verrouillée" : `Choisir ${war.teamSize} combattant${war.teamSize > 1 ? "s" : ""}`}</h2></div><span className="t-display text-2xl text-flare">{alreadySelected}/{war.teamSize}</span></div>{isLeader && !alreadySelected ? <><div className="mt-5 grid gap-2 sm:grid-cols-2">{myClan?.members.map((member) => <label key={member.userId} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${selected.includes(member.userId) ? "border-flare/45 bg-flare/10" : "border-ink-5 bg-ink-3"}`}><input type="checkbox" checked={selected.includes(member.userId)} disabled={!selected.includes(member.userId) && selected.length >= war.teamSize} onChange={() => setSelected((items) => items.includes(member.userId) ? items.filter((value) => value !== member.userId) : [...items, member.userId])} /><img src={api.avatarUrl(member.username)} alt="" className="h-9 w-9 rounded-full" /><div className="min-w-0 flex-1"><div className="t-title truncate text-sm">{member.username}</div><div className="text-xs text-bone-4">{member.winnings.toLocaleString("fr-FR")} F gagnés</div></div></label>)}</div><Block className="mt-5" disabled={selected.length !== war.teamSize || busy === "team"} onClick={submitTeam}>{busy === "team" ? "Verrouillage…" : "Valider définitivement l’équipe"}</Block></> : <p className="mt-5 text-sm text-bone-4">{alreadySelected ? "Tes combattants sont confirmés. Les confrontations seront créées dès que l’autre chef aura validé son équipe." : "Le chef de ton clan prépare actuellement l’équipe."}</p>}</section>}

    {(war.status === "IN_PROGRESS" || war.status === "COMPLETED") && <section className="mt-8"><div className="flex items-center justify-between"><div><Label>{war.status === "COMPLETED" ? "résultats certifiés" : "duels de guerre"}</Label><h2 className="t-display mt-2 text-2xl">Confrontations</h2></div>{war.status === "IN_PROGRESS" && <span className="t-label text-live">● en cours</span>}</div><div className="mt-5 grid gap-3">{war.matches.map((match, index) => { const mine = match.mine; const mineWon = match.winnerId && ((match.playerAId === match.winnerId && match.playerAId && mySelected.has(match.playerAId)) || (match.playerBId === match.winnerId && match.playerBId && mySelected.has(match.playerBId))); return <article key={match.id} className={`rounded-xl border p-4 ${mine ? "border-flare/35 bg-flare/8" : "border-ink-5 bg-ink-2"}`}><div className="flex items-center gap-3"><span className="t-label text-bone-4">#{index + 1}</span><span className="min-w-0 flex-1 truncate text-right text-sm">{match.playerAUsername}</span><span className={`rounded-full px-3 py-1 text-[10px] font-black ${match.status === "COMPLETED" ? (mineWon ? "bg-live/15 text-live" : "bg-danger/15 text-danger") : "bg-ink-4 text-bone-4"}`}>{match.status === "COMPLETED" ? (match.winnerId === match.playerAId ? "1–0" : "0–1") : match.status}</span><span className="min-w-0 flex-1 truncate text-sm">{match.playerBUsername}</span>{mine && <span className="t-label text-flare">TON DUEL</span>}</div></article>; })}</div>{war.myNextMatchId && <Block full className="mt-5" loading={busy === "enter"} onClick={enter}>{busy === "enter" ? "En attente de l’adversaire…" : "Entrer dans ma confrontation de clan"}</Block>}</section>}

    {war.status === "COMPLETED" && <section className={`mt-8 rounded-2xl border p-6 text-center ${war.myClanResult === "win" ? "border-live/35 bg-live/10" : war.myClanResult === "loss" ? "border-danger/30 bg-danger/8" : "border-flare/30 bg-flare/8"}`}><Label tone={resultTone}>résultat collectif</Label><h2 className="t-display mt-3 text-3xl">{war.myClanResult === "win" ? "VICTOIRE DU CLAN" : war.myClanResult === "loss" ? "DÉFAITE DU CLAN" : "ÉGALITÉ"}</h2><p className="mx-auto mt-3 max-w-xl text-sm text-bone-4">{war.winnerClanId && war.payoutCoins > 0 ? `${money(war.payoutCoins)} ont été répartis automatiquement entre les combattants du clan vainqueur.` : war.stakeCoins ? "En cas d’égalité, 95 % de chaque mise sont rendus aux chefs." : "Cette guerre gratuite compte dans les statistiques officielles du clan."}</p><Block className="mt-5" onClick={() => nav(`/clans/${myClanId}`)}>Retour au profil du clan</Block></section>}
  </main>;
}

function ClanSide({ clan }) {
  return <div className="flex min-w-0 flex-col items-center"><ClanEmblem emblemKey={clan.emblemKey} tag={clan.tag} color={clan.bannerColor} size="lg" /><h1 className="t-display mt-3 max-w-full truncate text-base sm:text-xl">{clan.name}</h1><span className="t-label mt-1 text-bone-4">[{clan.tag}]</span></div>;
}

function Info({ label, value }) {
  return <div className="rounded-xl bg-ink-3 px-4 py-3"><div className="t-label text-bone-4">{label}</div><div className="t-title mt-1 text-sm">{value}</div></div>;
}
