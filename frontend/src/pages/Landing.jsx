import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import ArenaBackground from "../components/ArenaBackground";
import PixelScene from "../components/PixelScene";
import { TOP_WINNERS_MARQUEE, CATEGORIES } from "../data/mockData";
import { ArrowRight, Coins, Swords, Trophy, Zap, ChevronRight } from "lucide-react";

const AMBER = "#E5A800";

export default function Landing() {
  const { t, lang } = useApp();

  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        <ArenaBackground />
        <div className="scanlines absolute inset-0 opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-[1400px] w-full mx-auto px-6 lg:px-10 py-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/15 rounded-full text-white/70 text-xs uppercase tracking-widest mb-6 bg-white/[0.02]"
            >
              <span className="w-2 h-2 rounded-full bg-[#E5A800] pulse-glow" />
              {t.landing.tagline}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display font-black uppercase tracking-tighter text-5xl sm:text-6xl lg:text-8xl leading-[0.9]"
            >
              <span className="block">{t.landing.title1}</span>
              <span className="block" style={{ color: AMBER }}>{t.landing.title2}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-6 text-lg text-slate-300/90 max-w-2xl"
            >
              {t.landing.subtitle}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Link
                to="/"
                data-testid="landing-cta-play"
                className="group inline-flex items-center gap-2 text-black font-bold uppercase tracking-wider px-7 py-4 rounded-md hover:shadow-[0_0_28px_rgba(229,168,0,0.5)] transition-all"
                style={{ background: AMBER }}
              >
                {t.landing.ctaPlay}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 border border-white/20 text-white font-bold uppercase tracking-wider px-7 py-4 rounded-md hover:bg-white/5 transition-all"
              >
                {t.landing.ctaLearn}
              </a>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mt-14 grid grid-cols-3 gap-6 max-w-xl"
            >
              {[
                { k: "players", v: "48.2K" },
                { k: "quizzes", v: "1.2M" },
                { k: "prizes", v: "92M" },
              ].map((s) => (
                <div key={s.k} className="border-l-2 pl-4" style={{ borderColor: `${AMBER}66` }}>
                  <div className="font-arcade text-3xl" style={{ color: AMBER }}>{s.v}</div>
                  <div className="text-xs uppercase tracking-widest text-slate-400 mt-1">{t.landing.stats[s.k]}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right side - Animated arcade cabinet (mono amber) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative aspect-[4/5] max-w-md mx-auto">
              {/* Cabinet frame — solid dark with thin amber border */}
              <div className="absolute inset-0 bg-[#0B0B14] rounded-[2.5rem] p-6 flex flex-col border border-white/10 shadow-[0_0_50px_rgba(229,168,0,0.15)]">
                {/* Screen */}
                <div className="flex-1 bg-black rounded-2xl border-2 relative overflow-hidden noise" style={{ borderColor: `${AMBER}55` }}>
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage: `linear-gradient(to right, ${AMBER}22 1px, transparent 1px), linear-gradient(to bottom, ${AMBER}22 1px, transparent 1px)`,
                      backgroundSize: "20px 20px",
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <div className="font-pixel text-[10px] mb-3 blink" style={{ color: AMBER }}>{t.quiz.ready}</div>
                    <div className="font-display font-black text-3xl text-white mb-3">Q. 07/10</div>
                    <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: AMBER }}>{t.quiz.timer}</div>
                    <div className="font-arcade text-5xl" style={{ color: AMBER, textShadow: `0 0 16px ${AMBER}` }}>12</div>
                    <div className="mt-4 grid grid-cols-2 gap-2 w-full">
                      {["A", "B", "C", "D"].map((o, i) => (
                        <div
                          key={o}
                          className={`text-xs py-2 rounded border ${
                            i === 1 ? "text-black" : "border-white/15 text-slate-400"
                          }`}
                          style={i === 1 ? { background: AMBER, borderColor: AMBER } : {}}
                        >
                          {o}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Joystick row */}
                <div className="mt-4 flex justify-between items-center">
                  <div className="w-7 h-7 rounded-full bg-white/20" />
                  <div className="font-pixel text-[8px] text-white/40">QUIZARENA</div>
                  <div className="flex gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ background: AMBER }} />
                    <div className="w-4 h-4 rounded-full bg-white/20" />
                  </div>
                </div>
              </div>
              {/* Floating coin */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-4 -right-2 w-12 h-12 rounded-full text-black font-display font-black text-lg flex items-center justify-center shadow-[0_0_28px_rgba(229,168,0,0.5)]"
                style={{ background: AMBER }}
              >
                $
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* MARQUEE — winners */}
      <section className="border-y border-white/10 bg-[#0B0B14] py-5 overflow-hidden">
        <div className="px-6 mb-3 max-w-[1400px] mx-auto">
          <div className="text-xs uppercase tracking-widest font-arcade text-xl inline-flex items-center gap-3" style={{ color: AMBER }}>
            <span className="w-2 h-2 rounded-full bg-white blink" />
            {t.landing.topWinnersTitle}
          </div>
        </div>
        <div className="flex marquee-track">
          {[...TOP_WINNERS_MARQUEE, ...TOP_WINNERS_MARQUEE].map((w, i) => (
            <div key={i} className="flex items-center gap-3 px-8 whitespace-nowrap">
              <div className="w-7 h-7 rounded-full bg-[#12121E] border border-white/10 flex items-center justify-center font-pixel text-[8px] text-white/70">
                {w.name.substring(0, 2)}
              </div>
              <span className="font-medium text-white">{w.name}</span>
              <span className="text-slate-600">→</span>
              <span className="font-arcade text-lg" style={{ color: AMBER }}>
                +{w.amount.toLocaleString()}
              </span>
              <Coins className="w-4 h-4" style={{ color: AMBER }} />
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-10 py-24">
        <div className="grid lg:grid-cols-3 gap-6">
          {[
            { icon: Zap, key: "feature1" },
            { icon: Swords, key: "feature2" },
            { icon: Trophy, key: "feature3" },
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="relative group p-8 bg-[#0B0B14] border border-white/10 rounded-2xl hover:border-[#E5A800]/40 transition-all"
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 border"
                  style={{ background: `${AMBER}10`, borderColor: `${AMBER}40`, color: AMBER }}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-2xl uppercase tracking-tight mb-3 text-white">
                  {t.landing[`${f.key}Title`]}
                </h3>
                <p className="text-slate-400">{t.landing[`${f.key}Desc`]}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-t border-white/10 bg-[#0B0B14] py-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="mb-14">
            <div className="text-xs uppercase tracking-widest text-white/40 mb-3">04 — Process</div>
            <h2 className="font-display font-black uppercase text-4xl sm:text-5xl lg:text-6xl tracking-tighter">
              {t.landing.howTitle}
            </h2>
          </div>
          <div className="grid lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="relative">
                <div className="font-arcade text-7xl leading-none mb-4" style={{ color: `${AMBER}55` }}>
                  0{n}
                </div>
                <p className="text-white text-lg leading-snug">{t.landing[`step${n}`]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories preview — with pixel scenes */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-10 py-24">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <h2 className="font-display font-black uppercase text-4xl sm:text-5xl tracking-tighter">
            6 Univers <span style={{ color: AMBER }}>·</span> 6 Animations
          </h2>
          <Link
            to="/"
            className="text-sm uppercase tracking-widest hover:text-white transition inline-flex items-center gap-1"
            style={{ color: AMBER }}
          >
            {t.nav.categories} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {CATEGORIES.map((c, i) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.id}
                to="/"
                className="relative rounded-xl border border-white/10 overflow-hidden hover:-translate-y-1 hover:border-[#E5A800]/40 transition-all bg-[#0B0B14]"
              >
                <PixelScene category={c.id} idx={i} />
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" style={{ color: AMBER }} />
                    <div className="font-display font-bold uppercase text-sm text-white">{c.name[lang]}</div>
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">{c.questions} Q</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-white/10 py-10 text-center text-xs text-slate-500 uppercase tracking-widest">
        Quiz<span style={{ color: AMBER }}>Arena</span> — © 2026 — Knowledge Is Power
      </footer>
    </div>
  );
}
