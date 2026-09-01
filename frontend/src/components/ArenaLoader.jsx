/**
 * Squelette générique de page. Il ne simule aucune étape réseau et ne bloque
 * pas l'utilisateur avec un écran de jeu artificiel : les blocs reprennent
 * simplement la future structure de la page pendant la lecture de l'API.
 */
export default function ArenaLoader({ label = "Chargement…", fullScreen = false }) {
  if (fullScreen) {
    return <div className="min-h-screen p-4 sm:p-6" style={{ background: "var(--bg)" }} role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl gap-6">
        <aside className="hidden w-56 shrink-0 space-y-6 border-r pr-5 lg:block" style={{ borderColor: "var(--divider)" }}>
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="space-y-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-10 w-full rounded-xl" />)}</div>
        </aside>
        <main className="flex-1 space-y-6 py-3">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-44 w-full rounded-3xl" />
          <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}</div>
          <Skeleton className="h-52 w-full rounded-3xl" />
        </main>
      </div>
    </div>;
  }

  return <div className="w-full space-y-5" role="status" aria-label={label}>
    <span className="sr-only">{label}</span>
    <div className="space-y-3">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-9 w-64 max-w-[75%]" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
    <Skeleton className="h-40 w-full rounded-3xl" />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}</div>
  </div>;
}

export function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg ${className}`} style={{ background: "var(--surface-2)", border: "1px solid var(--divider)" }} />;
}
