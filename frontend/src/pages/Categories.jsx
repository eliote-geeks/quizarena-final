import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { CATEGORIES } from "../data/mockData";
import { ChevronRight, Grid2X2, Zap } from "lucide-react";
import PixelScene from "../components/PixelScene";
import * as api from "../lib/api";

const AMBER = "#E5A800";
const PAGE_SIZE = 6;

export default function Categories() {
  const { t, lang } = useApp();
  const [serverCategories, setServerCategories] = useState([]);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.getCategories()
      .then((result) => setServerCategories(result.categories || []))
      .catch((requestError) => setError(requestError.message || "Catégories indisponibles"));
  }, []);

  // Ce second produit conserve volontairement les thèmes présents dans son
  // frontend. Les compteurs et la disponibilité viennent toutefois du serveur.
  const categories = useMemo(() => {
    const byId = new Map(serverCategories.map((category) => [category.id, category]));
    return CATEGORIES.map((category) => ({ ...category, server: byId.get(category.id) })).filter((category) => category.server);
  }, [serverCategories]);
  const pages = Math.max(1, Math.ceil(categories.length / PAGE_SIZE));
  const visibleCategories = categories.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  return (
    <div className="min-h-full px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-5">

      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl px-5 py-7 sm:px-7"
        style={{ background: "#15110D", border: "1px solid var(--qa-border)" }}
      >
        <motion.span aria-hidden className="absolute right-6 top-6 h-2.5 w-2.5 rounded-full" style={{ background: AMBER }} animate={{ opacity: [.35, 1, .35] }} transition={{ duration: 1.8, repeat: Infinity }} />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: AMBER }}>
            <Grid2X2 className="w-4 h-4" />
            Choisis. Joue. Gagne.
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl mt-2" style={{ color: "var(--qa-text)" }}>
            {t.categories.title}
          </h1>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "rgba(0,0,0,.22)", color: "var(--qa-text-sub)" }}><Zap className="h-3.5 w-3.5" style={{ color: AMBER }} />8 secondes par manche</div>
        </div>
      </motion.header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCategories.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/category/${c.id}`}
                  data-testid={`category-${c.id}`}
                  className="group block rounded-3xl transition-all overflow-hidden hover:-translate-y-1"
                  style={{ background: "var(--qa-surface)", border: "1px solid var(--qa-border)" }}
                >
                  <PixelScene category={c.id} idx={i} />

                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ background: `${AMBER}18`, color: AMBER }}
                        >
                          <Icon className="w-3 h-3" />
                        </div>
                        <span className="text-lg font-bold" style={{ color: "var(--qa-text)" }}>{c.name[lang]}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 transition" style={{ color: "var(--qa-text-faint)" }} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs font-semibold" style={{ color: "var(--qa-text-sub)" }}><span>{c.style[lang]}</span><span className="inline-flex items-center gap-1" style={{ color: AMBER }}>Jouer <ChevronRight className="h-3.5 w-3.5" /></span></div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
        {pages > 1 && <nav aria-label="Pagination des univers" className="flex items-center justify-center gap-2 pt-2"><button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="btn-secondary rounded-xl px-3 py-2 text-xs disabled:opacity-35">Précédent</button>{Array.from({ length: pages }, (_, index) => <button key={index + 1} onClick={() => setPage(index + 1)} aria-current={page === index + 1 ? "page" : undefined} className={page === index + 1 ? "btn-primary grid h-9 w-9 place-items-center rounded-xl text-xs" : "btn-secondary grid h-9 w-9 place-items-center rounded-xl text-xs"}>{index + 1}</button>)}<button onClick={() => setPage((current) => Math.min(pages, current + 1))} disabled={page === pages} className="btn-secondary rounded-xl px-3 py-2 text-xs disabled:opacity-35">Suivant</button></nav>}
        {error && <p className="rounded-xl p-4 text-center text-sm" style={{ color: "var(--danger)", background: "var(--qa-surface)" }}>{error}</p>}
        {!error && serverCategories.length > 0 && categories.length === 0 && <p className="rounded-xl p-4 text-center text-sm" style={{ color: "var(--qa-text-sub)", background: "var(--qa-surface)" }}>Aucun thème de cette édition n’est encore jouable.</p>}
    </div>
  );
}
