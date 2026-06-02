import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { CATEGORIES } from "../data/mockData";
import { ArrowRight } from "lucide-react";
import ArenaBackground from "../components/ArenaBackground";
import PixelScene from "../components/PixelScene";

const AMBER = "#E5A800";

export default function Categories() {
  const { t, lang } = useApp();

  return (
    <div className="relative min-h-screen">
      <ArenaBackground />
      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-14">
        <div className="mb-12 text-center">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3">// SELECT_STAGE</div>
          <h1 className="font-display font-black uppercase tracking-tighter text-4xl sm:text-5xl lg:text-6xl">
            {t.categories.title}
          </h1>
          <p className="text-slate-400 mt-4 max-w-2xl mx-auto">{t.categories.subtitle}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CATEGORIES.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  to={`/play/${c.id}`}
                  data-testid={`category-${c.id}`}
                  className="group block relative overflow-hidden rounded-2xl border border-white/10 hover:border-[#E5A800]/50 transition-all bg-[#0B0B14]"
                >
                  {/* Pixel scene preview */}
                  <div className="relative">
                    <PixelScene category={c.id} idx={i} />
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="w-11 h-11 rounded-lg flex items-center justify-center border"
                        style={{ background: `${AMBER}10`, borderColor: `${AMBER}40`, color: AMBER }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="font-arcade text-lg" style={{ color: AMBER }}>
                        {String(i + 1).padStart(2, "0")}
                      </div>
                    </div>

                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">
                      {c.style[lang]}
                    </div>
                    <h3 className="font-display font-black uppercase text-2xl tracking-tighter mb-2 text-white">
                      {c.name[lang]}
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">{c.description[lang]}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="text-xs uppercase tracking-widest text-slate-500">
                        {c.questions} {t.categories.questions}
                      </div>
                      <div
                        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest font-bold"
                        style={{ color: AMBER }}
                      >
                        {t.categories.pick}
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
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
