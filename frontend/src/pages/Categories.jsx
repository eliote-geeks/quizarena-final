import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { CATEGORIES } from "../data/mockData";
import { ArrowRight } from "lucide-react";
import ArenaBackground from "../components/ArenaBackground";

export default function Categories() {
  const { t, lang } = useApp();

  return (
    <div className="relative min-h-screen">
      <ArenaBackground />
      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-14">
        <div className="mb-12 text-center">
          <div className="text-xs uppercase tracking-widest text-[#FF007F] mb-3">// SELECT</div>
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
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  to={`/play/${c.id}`}
                  data-testid={`category-${c.id}`}
                  className="group block relative overflow-hidden rounded-2xl border border-white/10 hover:border-white/40 transition-all bg-[#0B0B14] h-[280px]"
                  style={{ boxShadow: `inset 0 0 0 1px ${c.accent}20` }}
                >
                  {/* Gradient background per category */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${c.bgClass}`} />
                  {/* grid overlay */}
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage: `linear-gradient(to right, ${c.accent}22 1px, transparent 1px), linear-gradient(to bottom, ${c.accent}22 1px, transparent 1px)`,
                      backgroundSize: "44px 44px",
                    }}
                  />
                  {/* scanlines for retro categories */}
                  {(c.id === "histoire" || c.id === "musique") && (
                    <div className="absolute inset-0 scanlines opacity-50" />
                  )}
                  {/* glow blob */}
                  <div
                    className="absolute -right-20 -bottom-20 w-60 h-60 rounded-full blur-3xl opacity-40 group-hover:opacity-70 transition-opacity"
                    style={{ background: c.accent }}
                  />

                  <div className="relative h-full p-6 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center group-hover:rotate-6 transition-transform"
                        style={{
                          background: `${c.accent}15`,
                          border: `1px solid ${c.accent}55`,
                          color: c.accent,
                        }}
                      >
                        <Icon className="w-7 h-7" />
                      </div>
                      <div
                        className="font-arcade text-xl"
                        style={{ color: c.accent }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
                        {c.style}
                      </div>
                      <h3
                        className="font-display font-black uppercase text-3xl tracking-tighter mb-2"
                        style={{ color: c.accent }}
                      >
                        {c.name[lang]}
                      </h3>
                      <p className="text-sm text-slate-300/80 mb-4">{c.description[lang]}</p>
                      <div className="flex items-center justify-between">
                        <div className="text-xs uppercase tracking-widest text-slate-500">
                          {c.questions} {t.categories.questions}
                        </div>
                        <div
                          className="inline-flex items-center gap-1 text-xs uppercase tracking-widest font-bold"
                          style={{ color: c.accent }}
                        >
                          {t.categories.pick} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
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
