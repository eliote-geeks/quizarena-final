import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { CATEGORIES } from "../data/mockData";
import { BadgeHelp, ChevronRight, Grid2X2, Headphones, Zap } from "lucide-react";
import PixelScene from "../components/PixelScene";
import * as api from "../lib/api";

const AMBER = "#E5A800";

export default function Categories() {
  const { t, lang } = useApp();
  const [serverCategories, setServerCategories] = useState([]);
  const [error, setError] = useState("");

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
  const questionCount = categories.reduce((sum, category) => sum + category.server.questionCount, 0);

  return (
    <div className="min-h-full px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-5">

      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: AMBER }}>
            <Grid2X2 className="w-4 h-4" />
            Banque de quiz
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl mt-1" style={{ color: "var(--qa-text)" }}>
            {t.categories.title}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--qa-text-sub)" }}>
            {t.categories.subtitle}
          </p>
        </div>

        <div
          className="grid grid-cols-3 gap-2 rounded-2xl p-2"
          style={{ background: "var(--qa-surface)", border: "1px solid var(--qa-border)" }}
        >
          <CategoryStat icon={BadgeHelp} label="Thèmes" value={categories.length || "—"} />
          <CategoryStat icon={Zap} label="Chrono" value="8s" />
          <CategoryStat icon={Headphones} label="Questions" value={questionCount ? questionCount.toLocaleString("fr-FR") : "—"} />
        </div>
      </motion.header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((c, i) => {
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
                  className="group block rounded-2xl transition-all overflow-hidden hover:scale-[1.01]"
                  style={{ background: "var(--qa-surface)", border: "1px solid var(--qa-border)" }}
                >
                  <PixelScene category={c.id} idx={i} />

                  <div className="p-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ background: `${AMBER}18`, color: AMBER }}
                        >
                          <Icon className="w-3 h-3" />
                        </div>
                        <span className="text-sm font-bold" style={{ color: "var(--qa-text)" }}>{c.name[lang]}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 transition" style={{ color: "var(--qa-text-faint)" }} />
                    </div>
                    <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--qa-text-sub)" }}>{c.description[lang]}</p>
                    <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--qa-divider)" }}>
                      <span className="text-[10px]" style={{ color: "var(--qa-text-faint)" }}>{c.style[lang]}</span>
                      <span className="text-[10px]" style={{ color: "var(--qa-text-faint)" }}>{c.server.questionCount.toLocaleString("fr-FR")} {t.categories.questions}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
        {error && <p className="rounded-xl p-4 text-center text-sm" style={{ color: "var(--danger)", background: "var(--qa-surface)" }}>{error}</p>}
        {!error && serverCategories.length > 0 && categories.length === 0 && <p className="rounded-xl p-4 text-center text-sm" style={{ color: "var(--qa-text-sub)", background: "var(--qa-surface)" }}>Aucun thème de cette édition n’est encore jouable.</p>}
    </div>
  );
}

function CategoryStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: "var(--qa-active)" }}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--qa-text-faint)" }}>
        <Icon className="w-3.5 h-3.5" style={{ color: AMBER }} />
        {label}
      </div>
      <div className="text-sm font-bold mt-0.5" style={{ color: "var(--qa-text)" }}>
        {value}
      </div>
    </div>
  );
}
