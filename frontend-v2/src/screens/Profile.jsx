import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, Block, Label, Row, Stat } from "../ui";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import { ClanEmblem } from "../lib/clanEmblems";

export default function Profile() {
  const nav = useNavigate();
  const { user, stats, logout } = useAuth();
  const [membership, setMembership] = useState(null);
  useEffect(() => { api.getClans(1, 1).then((result) => setMembership(result.myClan)).catch(() => {}); }, []);
  if (!user) return null;

  const joined = new Date(user.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  function handleLogout() {
    logout();
    nav("/login");
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 pt-8 pb-16 sm:px-8 sm:pt-12">
      <header className="flex items-center gap-5">
        <Avatar name={user.username} size="lg" />
        <div className="min-w-0">
          <h1 className="t-display truncate text-3xl">{user.username}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {user.region && <Label>{user.region}</Label>}
          </div>
        </div>
      </header>

      <p className="t-body mt-5 text-sm text-bone-4">Membre depuis {joined}</p>

      {membership?.clan && <Link to={`/clans/${membership.clan.id}`} className="mt-5 flex items-center gap-3 rounded-2xl border border-ink-5 bg-ink-2 p-4 transition hover:border-flare/30">
        <ClanEmblem emblemKey={membership.clan.emblemKey} tag={membership.clan.tag} color={membership.clan.bannerColor} size="sm" />
        <div className="min-w-0 flex-1"><Label>mon clan</Label><div className="t-title mt-1 truncate">{membership.clan.name}</div></div>
        <span className="t-label text-xs text-bone-4">{membership.role === "leader" ? "Chef" : membership.role === "officer" ? "Officier" : "Membre"} ›</span>
      </Link>}

      <div className="rule mt-8 grid grid-cols-3 gap-y-8 pt-7">
        <Stat label="parties jouées" value={stats?.totalGames ?? 0} />
        <Stat label="taux de victoire" value={`${Math.round((stats?.winRateGlobal ?? 0) * 100)}%`} tone="live" />
        <Stat label="score moyen" value={`${(stats?.avgScore ?? 0).toFixed(1)}/10`} />
      </div>

      <section className="mt-10">
        <div className="-mx-4">
          <Row>
            <span className="t-title flex-1 text-[15px]">Solde &amp; transactions</span>
            <Link to="/wallet" className="t-label text-bone-4 hover:text-flare">
              portefeuille ›
            </Link>
          </Row>
        </div>
      </section>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Block tone="ghost" size="md" className="sm:flex-1" disabled>
          Modifier le profil
        </Block>
        <Block tone="outline" size="md" onClick={handleLogout}>
          Se déconnecter
        </Block>
      </div>
    </div>
  );
}
