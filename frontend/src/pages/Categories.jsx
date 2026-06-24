import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { CATEGORIES } from "../data/mockData";
import { ChevronRight } from "lucide-react";
import ArenaBackground from "../components/ArenaBackground";
import PixelScene from "../components/PixelScene";

const AMBER = "#E5A800";

export default function Categories() {
  const { t, lang } = useApp();

  return (
    <div className="relative min-h-screen">
      <ArenaBackground />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8">

        <div className="mb-6">
          <h1 className="text-sm font-semibold text-white">{t.categories.title}</h1>
          <p className="text-xs text-white/40 mt-0.5">{t.categories.subtitle}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CATEGORIES.map((c, i) => {
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
                  className="group block rounded-xl border border-white/[0.07] hover:border-white/20 transition-all bg-[#0B0B14] overflow-hidden"
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
                        <span className="text-sm font-medium text-white">{c.name[lang]}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition" />
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed mb-2">{c.description[lang]}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                      <span className="text-[10px] text-white/25">{c.style[lang]}</span>
                      <span className="text-[10px] text-white/25">{c.questions} {t.categories.questions}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
