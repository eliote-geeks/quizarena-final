import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import * as api from "../lib/api";
import { ChevronLeft, ChevronRight, Crown, Flag, Search, Swords, Users, Wifi, WifiOff } from "lucide-react";
import AnimeAvatar from "../components/AnimeAvatar";

/**
 * Annuaire des joueurs — recherche par pseudo + liste des connectés en direct.
 * Un clic sur une ligne navigue vers /player/:username.
 * Les joueurs en ligne ont un bouton "Défier" direct vers /duel.
 */
export default function Players() {
  const navigate = useNavigate();
  const { user: me, currency } = useApp();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);   // null = aucune recherche active
  const [searching, setSearching] = useState(false);
  const [online, setOnline] = useState([]);
  const [loadingOnline, setLoadingOnline] = useState(true);
  const debounceRef = useRef(null);

  // Annuaire complet paginé — avant le 31/08, /players n'avait aucun
  // moyen de "juste tout voir" sans taper une recherche (retour Paul).
  const [directory, setDirectory] = useState(null);
  const [dirPage, setDirPage] = useState(1);
  const [dirTotalPages, setDirTotalPages] = useState(1);
  const [loadingDirectory, setLoadingDirectory] = useState(true);

  // Charge les connectés au montage, rafraîchit toutes les 8 s
  useEffect(() => {
    let alive = true;
    const load = () =>
      api.getOnlinePlayers()
        .then((r) => { if (alive) setOnline(r.online ?? []); })
        .finally(() => { if (alive) setLoadingOnline(false); });
    load();
    const timer = setInterval(load, 8000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoadingDirectory(true);
    api.getPlayersPage(dirPage, 24)
      .then((result) => {
        if (!alive) return;
        setDirectory(result.players || []);
        setDirTotalPages(result.totalPages || 1);
      })
      .catch(() => { if (alive) setDirectory([]); })
      .finally(() => { if (alive) setLoadingDirectory(false); });
    return () => { alive = false; };
  }, [dirPage]);

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
    <div className="min-h-full px-4 sm:px-6 py-8 max-w-4xl mx-auto space-y-8">

      {/* En-tête */}
      <header>
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-orange-qa">
          <Users className="h-4 w-4" />
          Communauté
        </div>
        <h1 className="mt-2 font-display text-4xl font-extrabold text-ink-qa">
          Joueurs
        </h1>
        <p className="mt-2 text-sm text-ink-soft-qa">
          Recherche un joueur, consulte son profil et défie-le en duel.
        </p>
      </header>

      {/* Barre de recherche */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--text-faint)" }} />
        <input
          type="search"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Chercher par pseudo…"
          className="w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm outline-none transition-colors"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
        {searching && (
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin rounded-full border-2"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
          />
        )}
      </div>

      {/* Résultats de recherche */}
      {results !== null && (
        <section>
          {results.length === 0 ? (
            <p className="py-6 text-sm text-ink-soft-qa">
              Aucun joueur trouvé pour « {query} ».
            </p>
          ) : (
            <div className="space-y-1">
              <div className="mb-3 text-xs font-bold uppercase" style={{ color: "var(--text-faint)" }}>
                {results.length} résultat{results.length !== 1 ? "s" : ""}
              </div>
              {results.map((p) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  currency={currency}
                  onView={() => navigate(`/player/${p.username}`)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Joueurs en ligne — affiché uniquement si pas de recherche active */}
      {results === null && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "var(--success)", boxShadow: "0 0 6px var(--success)" }}
            />
            <div className="text-xs font-bold uppercase" style={{ color: "var(--success)" }}>
              {loadingOnline
                ? "Chargement…"
                : `${onlineFiltered.length} joueur${onlineFiltered.length !== 1 ? "s" : ""} en ligne`}
            </div>
          </div>

          {loadingOnline ? (
            <div className="py-8 text-center text-sm text-ink-soft-qa">Chargement…</div>
          ) : onlineFiltered.length === 0 ? (
            <p className="py-6 text-sm text-ink-soft-qa">
              Aucun autre joueur connecté pour l'instant.
            </p>
          ) : (
            <div className="space-y-1">
              {onlineFiltered.map((p) => (
                <PlayerRow
                  key={p.id}
                  player={{ ...p, online: true }}
                  currency={currency}
                  onView={() => navigate(`/player/${p.username}`)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Annuaire complet, paginé — affiché sous les connectés, tant
          qu'aucune recherche n'est active. */}
      {results === null && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-orange-qa" />
            <h2 className="font-display text-xl font-extrabold">Tous les joueurs</h2>
          </div>

          {loadingDirectory ? (
            <div className="py-8 text-center text-sm text-ink-soft-qa">Chargement…</div>
          ) : !directory || directory.length === 0 ? (
            <p className="py-6 text-sm text-ink-soft-qa">Aucun joueur pour l'instant.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {directory.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    currency={currency}
                    onView={() => navigate(`/player/${player.username}`)}
                  />
                ))}
              </div>
              {dirTotalPages > 1 && (
                <nav className="mt-5 flex items-center justify-between" aria-label="Pagination annuaire">
                  <button
                    className="btn-secondary rounded-xl px-4 py-2 text-sm disabled:opacity-40"
                    disabled={dirPage === 1}
                    onClick={() => setDirPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-bold" style={{ color: "var(--text-sub)" }}>
                    Page {dirPage} sur {dirTotalPages}
                  </span>
                  <button
                    className="btn-secondary rounded-xl px-4 py-2 text-sm disabled:opacity-40"
                    disabled={dirPage === dirTotalPages}
                    onClick={() => setDirPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}

/** Ligne joueur réutilisable (aussi dans Leaderboard, MainLobby…) */
export function PlayerRow({ player, currency, onView, compact = false }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={onView}
      className="flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 transition"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-md)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <AnimeAvatar seed={player.username} src={player.avatarUrl} alt="" size={compact ? 32 : 40} className="border" />
        {player.online && (
          <span
            className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2"
            style={{ background: "var(--success)", ringColor: "var(--surface)" }}
          />
        )}
      </div>

      {/* Infos */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {player.isVip && <Crown className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--accent)" }} />}
          <span className={`font-bold truncate ${compact ? "text-sm" : "text-base"}`}>
            {player.username}
          </span>
          {player.online ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "var(--success)" }}>
              <Wifi className="h-3 w-3" /> En ligne
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--text-faint)" }}>
              <WifiOff className="h-3 w-3" />
            </span>
          )}
        </div>
        {player.region && (
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>
            {player.region}
          </p>
        )}
      </div>

      {/* Défier si en ligne */}
      {player.online && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate("/duel", { state: { challengeUsername: player.username } });
          }}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition"
          style={{
            background: "var(--accent-soft)",
            color: "var(--accent)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(229,168,0,0.22)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent-soft)")}
        >
          <Swords className="h-3.5 w-3.5" />
          Défier
        </button>
      )}
    </div>
  );
}
