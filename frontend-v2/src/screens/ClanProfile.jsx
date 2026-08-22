import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import { Block, ConfirmModal, Label, Loader } from "../ui";
import { NavIcon } from "../ui/icons";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import { ClanEmblem } from "../lib/clanEmblems";

/**
 * Page de profil d'un clan — membres, stats cumulées, actions du leader.
 */
export default function ClanProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user: me } = useAuth();
  const [clan, setClan] = useState(null);
  const [error, setError] = useState("");
  const [confirmKick, setConfirmKick] = useState(null); // { userId, username }
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [warData, setWarData] = useState(null);

  const load = () => {
    setClan(null);
    api.getClan(id)
      .then(setClan)
      .catch(() => setError("Clan introuvable"));
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!clan || !["leader", "officer"].includes(clan.myRole)) return;
    api.getClanJoinRequests(clan.id).then((data) => setJoinRequests(data.requests)).catch(() => setJoinRequests([]));
  }, [clan?.id, clan?.myRole]);

  useEffect(() => {
    if (!clan?.isMember) { setWarData(null); return; }
    const refresh = () => api.getClanWars(1, 4).then(setWarData).catch(() => {});
    refresh();
    const timer = window.setInterval(refresh, 8_000);
    return () => window.clearInterval(timer);
  }, [clan?.id, clan?.isMember]);

  if (error) return (
    <div className="mx-auto w-full max-w-[720px] px-5 pt-16 text-center">
      <p className="t-body text-bone-4">{error}</p>
      <button onClick={() => nav("/clans")} className="t-label mt-4 text-bone-4 hover:text-flare">← clans</button>
    </div>
  );

  if (!clan) return <Loader full />;

  const isLeader = clan.leaderId === me?.id;
  const isOfficer = clan.myRole === "officer";
  const isMember = clan.isMember;

  const join = async () => {
    setBusy(true);
    try {
      await api.joinClan(clan.id);
      load();
    } catch (e) {
      alert(e.message || "Impossible de rejoindre ce clan");
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    setConfirmLeave(false);
    setBusy(true);
    try {
      await api.leaveClan();
      nav("/clans");
    } catch (e) {
      alert(e.message || "Impossible de quitter ce clan");
      setBusy(false);
    }
  };

  const kick = async () => {
    if (!confirmKick) return;
    const { userId } = confirmKick;
    setConfirmKick(null);
    try {
      await api.kickMember(clan.id, userId);
      load();
    } catch (e) {
      alert(e.message || "Impossible d'exclure ce membre");
    }
  };

  const setRole = async (userId, role) => {
    try {
      await api.setMemberRole(clan.id, userId, role);
      load();
    } catch (e) {
      alert(e.message || "Erreur lors du changement de rôle");
    }
  };

  const onlineCount = clan.members.filter((m) => m.online).length;
  const reviewRequest = async (requestId, action) => {
    try {
      await api.reviewClanJoinRequest(clan.id, requestId, action);
      setJoinRequests((items) => items.filter((item) => item.id !== requestId));
      if (action === "accept") load();
    } catch (e) { alert(e.message || "Impossible de traiter la candidature"); }
  };

  const respondWar = async (warId, accept) => {
    try {
      const result = await api.respondClanWar(warId, accept);
      if (accept) nav(`/clan-wars/${warId}`);
      else setWarData(await api.getClanWars(1, 4));
      return result;
    } catch (e) { alert(e.message || "Impossible de traiter cette guerre"); }
  };

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 pt-8 pb-16 sm:px-8 sm:pt-12">
      <button onClick={() => nav("/clans")} className="t-label text-bone-4 hover:text-flare">← clans</button>

      {/* ── En-tête ── */}
      <div className="mt-6">
        <div className="flex items-start gap-5">
          {/* Badge */}
          <ClanEmblem emblemKey={clan.emblemKey} tag={clan.tag} color={clan.bannerColor} size="lg" className="sm:h-24 sm:w-24" />
          <div className="min-w-0 flex-1">
            <h1 className="t-display text-2xl font-black sm:text-3xl">{clan.name}</h1>
            {clan.description && (
              <p className="t-body mt-1 text-sm text-bone-4">{clan.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="t-label flex items-center gap-1 text-[11px] text-bone-4">
                <NavIcon type="users" className="h-3 w-3" />
                {clan.members.length} membre{clan.members.length !== 1 ? "s" : ""}
              </div>
              <div className="t-label flex items-center gap-1 text-[11px] text-live">
                <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse" />
                {onlineCount} en ligne
              </div>
              <div className="t-label text-[11px] text-bone-4">
                Créé le {new Date(clan.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-3">
          {isMember && <Block onClick={() => nav("/clan-wars")}>Guerres de clans</Block>}
          {isLeader && <Block tone="outline" onClick={() => nav(`/clans/${clan.id}/manage`)}>Gérer le clan</Block>}
          {!isMember && (
            <Block icon={<NavIcon type="shield" className="h-4 w-4" />} onClick={join} loading={busy}>
              Rejoindre le clan
            </Block>
          )}
          {isMember && !isLeader && (
            <button
              onClick={() => setConfirmLeave(true)}
              className="press rounded-(--radius-card) bg-ink-3 px-4 py-2.5 text-sm text-bone-4 hover:text-danger transition-colors"
            >
              Quitter le clan
            </button>
          )}
        </div>
      </div>

      {/* ── Stats globales ── */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Gains cumulés"
          value={clan.totalWinnings.toLocaleString("fr-FR") + " F"}
          accent
          color={clan.bannerColor}
        />
        <StatCard label="Victoires de guerre" value={clan.warWins ?? 0} tone="live" />
        <StatCard label="Défaites de guerre" value={clan.warLosses ?? 0} tone="danger" />
        <StatCard label="Gains de guerre" value={(clan.warEarnings ?? 0).toLocaleString("fr-FR") + " F"} accent color={clan.bannerColor} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-ink-5 bg-ink-2 px-4 py-3 text-xs text-bone-4"><span>{clan.members.length} membres</span><span>{onlineCount} en ligne</span><span>{clan.warDraws ?? 0} égalité(s)</span><span>{(clan.warWins ?? 0) + (clan.warLosses ?? 0) + (clan.warDraws ?? 0) ? Math.round(((clan.warWins ?? 0) / ((clan.warWins ?? 0) + (clan.warLosses ?? 0) + (clan.warDraws ?? 0))) * 100) : 0}% de victoires de guerre</span></div>

      {warData?.activeWar && <button onClick={() => nav(`/clan-wars/${warData.activeWar.id}`)} className="mt-6 w-full rounded-2xl border border-live/35 bg-live/10 p-5 text-left"><Label tone="live">guerre de clan active</Label><div className="mt-2 flex items-center justify-between gap-4"><div><h3 className="t-display text-xl">{warData.activeWar.challengerClan.name} <span className="text-flare">vs</span> {warData.activeWar.defenderClan.name}</h3><p className="mt-1 text-xs text-bone-4">{warData.activeWar.teamSize}v{warData.activeWar.teamSize} · {warData.activeWar.stakeCoins ? `${warData.activeWar.stakeCoins.toLocaleString("fr-FR")} F par clan` : "gratuit"}</p></div><span className="t-display text-2xl">{warData.activeWar.challengerScore}–{warData.activeWar.defenderScore}</span></div></button>}

      {!warData?.activeWar && warData?.incomingChallenges?.map((war) => <section key={war.id} className="mt-6 rounded-2xl border border-flare/40 bg-flare/10 p-5"><Label tone="flare">déclaration de guerre reçue</Label><h3 className="t-display mt-2 text-xl">{war.challengerClan.name} défie {clan.name}</h3><p className="mt-1 text-sm text-bone-4">{war.teamSize}v{war.teamSize} · {war.stakeCoins ? `${war.stakeCoins.toLocaleString("fr-FR")} F par clan` : "guerre gratuite"}</p>{isLeader && <div className="mt-4 flex gap-3"><Block tone="outline" onClick={() => respondWar(war.id, false)}>Refuser</Block><Block onClick={() => respondWar(war.id, true)}>Accepter</Block></div>}</section>)}

      {/* ── Membres ── */}
      <div className="mt-8">
        <Label className="mb-4">membres</Label>
        <div className="flex flex-col gap-2">
          {clan.members.map((m) => (
            <MemberRow
              key={m.userId}
              member={m}
              isMe={m.userId === me?.id}
              canManage={(isLeader || isOfficer) && m.userId !== me?.id}
              isLeader={isLeader}
              clanColor={clan.bannerColor}
              onProfile={() => nav(`/player/${m.username}`)}
              onKick={() => setConfirmKick({ userId: m.userId, username: m.username })}
              onSetRole={(role) => setRole(m.userId, role)}
            />
          ))}
        </div>
      </div>

      {(isLeader || isOfficer) && clan.joinPolicy === "APPROVAL" && (
        <div className="mt-8">
          <Label className="mb-4">candidatures {joinRequests.length ? `(${joinRequests.length})` : ""}</Label>
          {joinRequests.length === 0 ? <p className="t-body text-sm text-bone-4">Aucune candidature en attente.</p> : (
            <div className="flex flex-col gap-2">{joinRequests.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center gap-3 rounded-(--radius-card) bg-ink-2 px-4 py-3">
                <img src={api.avatarUrl(request.user.username)} alt="" className="h-9 w-9 rounded-full" />
                <div className="min-w-0 flex-1"><div className="t-title text-sm">{request.user.username}</div><div className="t-body text-xs text-bone-4">{request.user.stats?.totalGames ?? 0} parties · {request.balanceCoins.toLocaleString("fr-FR")} F</div></div>
                <button onClick={() => reviewRequest(request.id, "reject")} className="press rounded-lg px-3 py-2 text-xs text-bone-4 hover:text-danger">Refuser</button>
                <button onClick={() => reviewRequest(request.id, "accept")} className="press rounded-lg bg-flare px-3 py-2 text-xs font-bold text-ink">Accepter</button>
              </div>
            ))}</div>
          )}
        </div>
      )}

      <button onClick={() => nav("/clan-wars")} className="group mt-10 w-full overflow-hidden rounded-(--radius-card) border border-flare/30 bg-linear-to-r from-flare/12 via-ink-2 to-ink-2 p-6 text-left transition hover:border-flare/60">
        <div className="flex items-center gap-5"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-flare/15 text-2xl">⚔️</div><div className="min-w-0 flex-1"><Label tone="flare">compétition active</Label><h3 className="t-display mt-1 text-xl">Guerres de clans</h3><p className="t-body mt-1 text-sm text-bone-4">Compose ton équipe, trouve un clan disponible et dispute toutes les confrontations sous 24 heures.</p></div><span className="text-xl text-flare transition group-hover:translate-x-1">→</span></div>
      </button>

      {/* ── Modales ── */}
      <ConfirmModal
        open={!!confirmKick}
        tone="danger"
        title={`Exclure ${confirmKick?.username} ?`}
        message="Ce joueur sera retiré du clan immédiatement. Il pourra rejoindre un autre clan."
        confirmLabel="Exclure"
        onConfirm={kick}
        onCancel={() => setConfirmKick(null)}
      />
      <ConfirmModal
        open={confirmLeave}
        tone="danger"
        title="Quitter le clan ?"
        message="Tu ne seras plus membre de ce clan. Tu pourras en rejoindre ou en créer un nouveau."
        confirmLabel="Quitter"
        onConfirm={leave}
        onCancel={() => setConfirmLeave(false)}
      />
    </div>
  );
}

function StatCard({ label, value, accent = false, color, tone }) {
  return (
    <div className="rounded-(--radius-card) bg-ink-2 px-4 py-3">
      <div
        className={clsx("t-display text-xl font-black", tone === "live" ? "text-live" : tone === "danger" ? "text-danger" : "text-bone")}
        style={accent && color ? { color } : {}}
      >
        {value}
      </div>
      <div className="t-label mt-1 text-[11px] text-bone-4">{label}</div>
    </div>
  );
}

function MemberRow({ member, isMe, canManage, isLeader, clanColor, onProfile, onKick, onSetRole }) {
  const [showActions, setShowActions] = useState(false);
  const roleLabel = { leader: "Leader", officer: "Officier", member: "Membre" };

  return (
    <div className="flex items-center gap-3 rounded-(--radius-card) bg-ink-2 px-4 py-3">
      {/* Avatar + online */}
      <div className="relative shrink-0">
        <img
          src={api.avatarUrl(member.username)}
          alt={member.username}
          className="h-10 w-10 rounded-full object-cover cursor-pointer"
          onClick={onProfile}
        />
        {member.online && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-live ring-2 ring-ink-2" />
        )}
      </div>

      {/* Infos */}
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onProfile}>
        <div className="flex items-center gap-1.5">
          <span className="t-title text-[14px] font-semibold truncate">{member.username}</span>
          {member.role === "leader" && <span className="text-sm">👑</span>}
          {isMe && <span className="t-label text-[10px] text-bone-4">(moi)</span>}
        </div>
        <div className="t-body flex items-center gap-2 mt-0.5 text-xs text-bone-4">
          <span
            className="t-label text-[10px] rounded px-1 py-0.5"
            style={{ background: clanColor + "20", color: clanColor }}
          >
            {roleLabel[member.role] ?? member.role}
          </span>
          {member.totalGames > 0 && <span>{member.totalGames} parties · {Math.round(member.winRate * 100)}% victoires</span>}
        </div>
      </div>

      {/* Gains */}
      <div className="hidden text-right sm:block shrink-0">
        <div className="t-display text-sm font-black text-flare">{member.winnings.toLocaleString("fr-FR")} F</div>
        <div className="t-label text-[10px] text-bone-4">gagnés</div>
      </div>

      {/* Actions leader */}
      {canManage && member.role !== "leader" && (
        <div className="relative shrink-0">
          <button
            onClick={() => setShowActions((s) => !s)}
            className="press flex h-8 w-8 items-center justify-center rounded-full bg-ink-3 text-bone-4 hover:bg-ink-4"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
          {showActions && (
            <div className="absolute right-0 top-9 z-20 w-44 rounded-(--radius-card) bg-ink-3 shadow-xl border border-ink-5 py-1">
              {isLeader && member.role === "member" && (
                <button
                  className="w-full px-4 py-2 text-left text-sm text-bone-3 hover:bg-ink-4"
                  onClick={() => { setShowActions(false); onSetRole("officer"); }}
                >
                  Promouvoir officier
                </button>
              )}
              {isLeader && member.role === "officer" && (
                <button
                  className="w-full px-4 py-2 text-left text-sm text-bone-3 hover:bg-ink-4"
                  onClick={() => { setShowActions(false); onSetRole("member"); }}
                >
                  Rétrograder membre
                </button>
              )}
              <button
                className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-ink-4"
                onClick={() => { setShowActions(false); onKick(); }}
              >
                Exclure du clan
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
