import { X } from "lucide-react";

export default function Shell({ back, eyebrow, title, children }) {
  return (
    <div className="min-h-full px-4 sm:px-6 py-8 max-w-xl mx-auto">
      <button onClick={back} className="btn-ghost inline-flex items-center gap-2 text-xs"><X className="h-4 w-4" />Retour</button>
      <header className="mt-6">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>{eyebrow}</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold" style={{ color: "var(--text)" }}>{title}</h1>
      </header>
      <div className="mt-7">{children}</div>
    </div>
  );
}
