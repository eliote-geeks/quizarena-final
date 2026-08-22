import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Label, Loader } from "../ui";
import { NavIcon } from "../ui/icons";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";

/**
 * Annuaire des joueurs — recherche par pseudo + liste des connectés.
 * Un clic sur un joueur ouvre son profil (/player/:username).
 */
export default function Players() {
  const nav = useNavigate();
  const { user: me } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null); // null = pas encore cherché
  const [searching, setSearching] = useState(false);
  const [online, setOnline] = useState([]);
  const [loadingOnline, setLoadingOnline] = useState(true);
  const debounceRef = useRef(null);

  useEffect(() => {
    api.getOnlinePlayers()
      .then((r) => setOnline(r.online ?? []))
      .finally(() => setLoadingOnline(false));
  }, []);

  const search = (q) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim() || q.trim().length < 2) { setResults(null); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await api.searchPlayers(q.trim());
        setResults(r.players ?? []);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const onlineFiltered = online.filter((p) => p.id !== me?.id);

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 pt-8 pb-16 sm:px-8 sm:pt-12">
      <Label tone="flare">communauté</Label>
      <h1 className="t-display mt-3 text-2xl sm:text-3xl">Joueurs</h1>
      <p className="t-body mt-2 max-w-md text-sm text-bone-4">
        Recherche un joueur, consulte son profil et défie-le en duel.
      </p>

      {/* Barre de recherche */}
      <div className="relative mt-8 max-w-md">
        <NavIcon type="users" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-bone-4 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Chercher par pseudo…"
          className="w-full rounded-(--radius-card) bg-ink-2 pl-10 pr-4 py-3 text-sm text-bone outline-none border border-transparent focus:border-flare/50 transition-colors"
        />
        {searching && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <Loader size="xs" />
          </span>
        )}
      </div>

      {/* Résultats de recherche */}
      {results !== null && (
        <section className="mt-6">
          {results.length === 0 ? (
            <p className="t-body text-sm text-bone-4">Aucun joueur trouvé pour « {query} ».</p>
          ) : (
            <>
              <Label className="mb-3">{results.length} résultat{results.length !== 1 ? "s" : ""}</Label>
              <div className="flex flex-col gap-2">
                {results.map((p) => (
                  <PlayerRow key={p.id} player={p} onView={() => nav(`/player/${p.username}`)} />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Joueurs en ligne */}
      {results === null && (
        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-live animate-pulse" />
            <Label tone="live">
              {loadingOnline ? "chargement…" : `${onlineFiltered.length} joueur${onlineFiltered.length !== 1 ? "s" : ""} en ligne`}
            </Label>
          </div>
          {loadingOnline ? (
            <div className="flex justify-center py-8"><Loader /></div>
          ) : onlineFiltered.length === 0 ? (
            <p className="t-body py-4 text-sm text-bone-4">
              Aucun autre joueur en ligne pour l'instant.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {onlineFiltered.map((p) => (
                <PlayerRow key={p.id} player={{ ...p, online: true }} onView={() => nav(`/player/${p.username}`)} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export function PlayerRow({ player, onView, compact = false }) {
  const nav = useNavigate();
  return (
    <div
      onClick={onView}
      className={clsx(
        "flex cursor-pointer items-center gap-3 rounded-(--radius-card) bg-ink-2 px-4 py-3 transition-colors hover:bg-ink-3 active:bg-ink-4",
        compact && "py-2"
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <img
          src={api.avatarUrl(player.username)}
          alt={player.username}
          className={clsx("rounded-full object-cover", compact ? "h-8 w-8" : "h-10 w-10")}
        />
        {player.online && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-live ring-2 ring-ink-2" />
        )}
      </div>

      {/* Infos */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={clsx("t-title truncate font-semibold", compact ? "text-[13px]" : "text-[14px]")}>
            {player.username}
          </span>
          {player.clan && (
            <span
              className="t-label rounded px-1 py-0.5 text-[10px] font-bold"
              style={{ background: `${player.clan.bannerColor ?? "#f59e0b"}25`, color: player.clan.bannerColor ?? "#f59e0b", border: `1px solid ${player.clan.bannerColor ?? "#f59e0b"}45` }}
            >
              [{player.clan.tag}]
            </span>
          )}
        </div>
        <div className="t-body mt-0.5 flex items-center gap-2 text-xs text-bone-4">
          {player.region && <span>{player.region}</span>}
          {player.online ? (
            <span className="text-live">● En ligne</span>
          ) : null}
        </div>
      </div>

      {player.online && <button onClick={(event) => { event.stopPropagation(); nav("/duel", { state: { challengeUsername: player.username } }); }} className="press flex h-8 items-center gap-1.5 rounded-lg bg-flare/12 px-2.5 text-[10px] font-bold uppercase tracking-wider text-flare hover:bg-flare/20"><NavIcon type="swords" className="h-3.5 w-3.5" />Défier</button>}
      <NavIcon type="user" className="h-4 w-4 shrink-0 text-bone-4" />
    </div>
  );
}
