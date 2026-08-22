import { useEffect, useState } from "react";
import clsx from "clsx";
import { Label, Leader, Loader, Money, Row } from "../ui";
import * as api from "../lib/api";
import { ClanEmblem } from "../lib/clanEmblems";

export default function Leaderboard() {
  const [data, setData] = useState(null); // { leaderboard, myRank, myWinnings }
  const [clans, setClans] = useState(null);
  const [tab, setTab] = useState("players");

  useEffect(() => {
    api.getLeaderboard().then(setData);
    api.getClanRanking().then((result) => setClans(result.clans));
  }, []);

  if (!data) return <Loader full />;

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 pt-8 pb-16 sm:px-8 sm:pt-12">
      <Label tone="flare">classement général</Label>
      <h1 className="t-display mt-3 text-2xl sm:text-3xl">Classement</h1>

      <div className="mt-8 flex gap-2"><button onClick={() => setTab("players")} className={clsx("press rounded-lg px-3 py-2 text-xs", tab === "players" ? "bg-flare text-ink" : "bg-ink-3 text-bone-4")}>Joueurs</button><button onClick={() => setTab("clans")} className={clsx("press rounded-lg px-3 py-2 text-xs", tab === "clans" ? "bg-flare text-ink" : "bg-ink-3 text-bone-4")}>Clans</button></div>

      {tab === "players" ? <><div className="rule mt-4 -mx-4">
        {data.leaderboard.length === 0 && (
          <p className="t-body px-4 py-6 text-sm text-bone-4">Personne n'a encore gagné de partie.</p>
        )}
        {data.leaderboard.map((p) => (
          <Row key={p.id} rank={p.rank} active={p.me}>
            <span className={clsx("t-title min-w-0 max-w-[50%] truncate text-[15px]", p.me && "text-flare")}>
              {p.username}
              {p.me && <span className="t-label ml-2 text-bone-4">vous</span>}
            </span>
            {p.region && <span className="t-label shrink-0 text-bone-4">{p.region}</span>}
            <Leader />
            <Money value={p.winningsCoins} size="sm" tone={p.me ? "flare" : "bone"} />
          </Row>
        ))}
      </div>

      <p className="t-body mt-6 text-sm text-bone-4">
        Votre rang : <span className="text-bone-2">#{data.myRank}</span> · gains cumulés{" "}
        <span className="text-bone-2">{data.myWinnings.toLocaleString("fr-FR")} F</span> · classé sur
        l'argent gagné, mis à jour à chaque partie.
      </p></> : <div className="rule mt-4 -mx-4">{!clans ? <Loader /> : clans.length === 0 ? <p className="t-body px-4 py-6 text-sm text-bone-4">Aucun clan classé pour l’instant.</p> : clans.map((clan) => <Row key={clan.id} rank={clan.rank}><ClanEmblem emblemKey={clan.emblemKey} tag={clan.tag} color={clan.bannerColor} size="sm" /><span className="t-title min-w-0 max-w-[42%] truncate text-[15px]">{clan.name}{clan.certified && <span className="ml-2 text-[11px] text-flare">✓ certifié</span>}</span><span className="t-label text-[11px] text-bone-4">{clan.warWins} victoire{clan.warWins !== 1 ? "s" : ""}</span><Leader /><Money value={clan.winningsCoins} size="sm" tone={clan.certified ? "flare" : "bone"} /></Row>)}</div>}
    </div>
  );
}
