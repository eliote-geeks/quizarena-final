import { ChevronLeft, ChevronRight } from "lucide-react";
import AnimeAvatar from "../../components/AnimeAvatar";
import { formatDateTime } from "../../lib/dateTime";

export default function History({ title, items, solo, myUsername, onSelectOpponent, page, totalPages, onPageChange }) {
  return (
    <section>
      <h2 className="mb-4 font-display text-2xl font-bold">{title}</h2>
      <div className="card overflow-hidden rounded-2xl">
        {items.length ? items.map((item) => {
          if (solo) {
            return (
              <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 border-b px-4 py-3 last:border-0" style={{ borderColor: "var(--divider)" }}>
                <div>
                  <strong>{item.categoryName}</strong>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-sub)" }}>{item.outcome || item.mode} · {formatDateTime(item.startedAt)}</p>
                </div>
                <strong style={{ color: item.outcome === "ABANDONNÉ" ? "var(--danger)" : "var(--accent)" }}>{item.outcome === "ABANDONNÉ" ? "ABANDONNÉ" : `${item.scoreServer}/${item.totalQuestions}`}</strong>
              </div>
            );
          }
          const isA = item.playerA === myUsername;
          const opp = isA ? item.playerB : item.playerA;
          const oppAvatarUrl = isA ? item.playerBAvatarUrl : item.playerAAvatarUrl;
          return (
            <button
              key={item.id}
              onClick={() => onSelectOpponent?.(opp)}
              className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 border-b px-4 py-3 text-left last:border-0 transition hover:opacity-80"
              style={{ borderColor: "var(--divider)" }}
            >
              <AnimeAvatar seed={opp} src={oppAvatarUrl} alt="" size={32} className="border" />
              <div className="min-w-0">
                <strong className="truncate">vs {opp}</strong>
                <p className="mt-1 text-xs" style={{ color: "var(--text-sub)" }}>{item.result === "win" ? "Victoire" : item.result === "loss" ? "Défaite" : "Égalité"} · {formatDateTime(item.completedAt)}</p>
              </div>
              <strong style={{ color: "var(--accent)" }}>{item.scoreA}–{item.scoreB}</strong>
            </button>
          );
        }) : <p className="p-6 text-center text-sm" style={{ color: "var(--text-sub)" }}>Aucune partie enregistrée.</p>}
      </div>
      {onPageChange && items.length > 0 && (
        <nav className="mt-3 flex items-center justify-between" aria-label={`Pagination ${title}`}>
          <button disabled={page <= 1} onClick={() => onPageChange((p) => Math.max(1, p - 1))} className="btn-secondary inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />Précédent
          </button>
          <span className="text-xs font-bold" style={{ color: "var(--text-sub)" }}>Page {page} sur {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))} className="btn-secondary inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs disabled:opacity-30">
            Suivant<ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </section>
  );
}
