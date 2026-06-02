import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import ArenaBackground from "../components/ArenaBackground";
import { TOP_WINNERS_MARQUEE, CATEGORIES } from "../data/mockData";
import { ArrowRight, Coins, Swords, Trophy, Zap, ChevronRight } from "lucide-react";

export default function Landing() {
  const { t, lang } = useApp();

  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        <ArenaBackground />
        <div className="scanlines absolute inset-0 opacity-40 pointer-events-none" />

        <div className="relative z-10 max-w-[1400px] w-full mx-auto px-6 lg:px-10 py-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#00FFFF]/40 rounded-full text-[#00FFFF] text-xs uppercase tracking-widest mb-6 bg-[#00FFFF]/5"
            >
              <span className="w-2 h-2 rounded-full bg-[#00FFFF] pulse-glow" />
              {t.landing.tagline}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display font-black uppercase tracking-tighter text-5xl sm:text-6xl lg:text-8xl leading-[0.9]"
            >
              <span className="block">{t.landing.title1}</span>
              <span className="block text-[#FFD700] text-glow-yellow">{t.landing.title2}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-6 text-lg text-slate-300 max-w-2xl"
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
                to="/lobby"
                data-testid="landing-cta-play"
                className="group inline-flex items-center gap-2 bg-[#FFD700] text-black font-bold uppercase tracking-wider px-7 py-4 rounded-md hover:shadow-[0_0_28px_rgba(255,215,0,0.65)] transition-all"
              >
                {t.landing.ctaPlay}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 border border-[#00FFFF]/60 text-[#00FFFF] font-bold uppercase tracking-wider px-7 py-4 rounded-md hover:bg-[#00FFFF]/10 transition-all"
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
                <div key={s.k} className="border-l-2 border-[#FFD700]/50 pl-4">
                  <div className="font-arcade text-3xl text-[#FFD700] text-glow-yellow">{s.v}</div>
                  <div className="text-xs uppercase tracking-widest text-slate-400 mt-1">{t.landing.stats[s.k]}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right side - Animated arcade cabinet */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative aspect-[4/5] max-w-md mx-auto">
              {/* Cabinet frame */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF007F] via-[#9D4CDD] to-[#00FFFF] rounded-[2.5rem] p-1 shadow-[0_0_60px_rgba(255,0,127,0.4)]">
                <div className="w-full h-full bg-[#05050A] rounded-[2.3rem] p-6 flex flex-col">
                  {/* Screen */}
                  <div className="flex-1 bg-black rounded-2xl border-2 border-[#00FFFF]/40 relative overflow-hidden noise">
                    <div className="absolute inset-0 grid-bg opacity-40" />
                    <div className="scanline-bar" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                      <div className="font-pixel text-[10px] text-[#FFD700] mb-3 blink">{t.quiz.ready}</div>
                      <div className="font-display font-black text-4xl text-white mb-4">Q. 07/10</div>
                      <div className="text-xs uppercase tracking-widest text-[#00FFFF] mb-2">{t.quiz.timer}</div>
                      <div className="font-arcade text-6xl text-[#39FF14] text-glow-green">12</div>
                      <div className="mt-6 grid grid-cols-2 gap-2 w-full">
                        {["A", "B", "C", "D"].map((o, i) => (
                          <div
                            key={o}
                            className={`text-xs py-2 rounded border ${
                              i === 1
                                ? "border-[#FFD700] text-[#FFD700] bg-[#FFD700]/10"
                                : "border-white/20 text-slate-400"
                            }`}
                          >
                            {o}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Joystick row */}
                  <div className="mt-4 flex justify-between items-center">
                    <div className="w-8 h-8 rounded-full bg-[#FF3333] shadow-[0_0_12px_rgba(255,51,51,0.7)]" />
                    <div className="font-pixel text-[8px] text-white/60">QUIZARENA</div>
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14]" />
                      <div className="w-5 h-5 rounded-full bg-[#FFD700] shadow-[0_0_8px_#FFD700]" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating coins */}
              <motion.div
                animate={{ y: [0, -14, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-6 -right-2 w-14 h-14 rounded-full bg-[#FFD700] text-black font-display font-black text-xl flex items-center justify-center shadow-[0_0_28px_rgba(255,215,0,0.7)]"
              >
                $
              </motion.div>
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                className="absolute -bottom-4 -left-4 w-12 h-12 rounded-full bg-[#00FFFF] text-black font-arcade text-2xl flex items-center justify-center shadow-[0_0_28px_rgba(0,255,255,0.7)]"
              >
                $
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="border-y border-white/10 bg-[#0B0B14] py-5 overflow-hidden">
        <div className="px-6 mb-3 max-w-[1400px] mx-auto">
          <div className="text-xs uppercase tracking-widest text-[#FFD700] font-arcade text-2xl text-glow-yellow inline-flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#FF3333] blink" />
            {t.landing.topWinnersTitle}
          </div>
        </div>
        <div className="flex marquee-track">
          {[...TOP_WINNERS_MARQUEE, ...TOP_WINNERS_MARQUEE].map((w, i) => (
            <div key={i} className="flex items-center gap-3 px-8 whitespace-nowrap">
              <div className="w-8 h-8 rounded-full bg-[#12121E] border border-[#FFD700]/40 flex items-center justify-center font-pixel text-[8px] text-[#FFD700]">
                {w.name.substring(0, 2)}
              </div>
              <span className="font-medium text-white">{w.name}</span>
              <span className="text-slate-500">→</span>
              <span className="font-arcade text-[#39FF14] text-glow-green text-xl">
                +{w.amount.toLocaleString()}
              </span>
              <Coins className="w-4 h-4 text-[#FFD700]" />
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-10 py-24">
        <div className="grid lg:grid-cols-3 gap-6">
          {[
            { icon: Zap, key: "feature1", color: "#FFD700", glow: "glow-yellow" },
            { icon: Swords, key: "feature2", color: "#FF007F", glow: "glow-pink" },
            { icon: Trophy, key: "feature3", color: "#00FFFF", glow: "glow-cyan" },
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="relative group p-8 bg-[#12121E] border border-white/5 rounded-2xl hover:border-white/20 transition-all"
              >
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${f.glow}`}
                  style={{ background: f.color, color: "#000" }}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="font-display font-bold text-2xl uppercase tracking-tight mb-3">
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
            <div className="text-xs uppercase tracking-widest text-[#00FFFF] mb-3">04 — Process</div>
            <h2 className="font-display font-black uppercase text-4xl sm:text-5xl lg:text-6xl tracking-tighter">
              {t.landing.howTitle}
            </h2>
          </div>
          <div className="grid lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="relative">
                <div className="font-arcade text-7xl text-[#FFD700]/30 leading-none mb-4">
                  0{n}
                </div>
                <p className="text-white text-lg leading-snug">{t.landing[`step${n}`]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories preview */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-10 py-24">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <h2 className="font-display font-black uppercase text-4xl sm:text-5xl tracking-tighter">
            6 Univers <span className="text-[#FF007F]">·</span> 6 Esthétiques
          </h2>
          <Link
            to="/categories"
            className="text-sm uppercase tracking-widest text-[#00FFFF] hover:text-white transition inline-flex items-center gap-1"
          >
            {t.nav.categories} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.id}
                to="/categories"
                className="relative aspect-square rounded-xl border border-white/10 overflow-hidden p-4 flex flex-col justify-between hover:-translate-y-1 transition-all"
                style={{ background: `linear-gradient(160deg, ${c.accent}10, transparent)` }}
              >
                <Icon className="w-8 h-8" style={{ color: c.accent }} />
                <div>
                  <div className="font-display font-bold uppercase text-sm" style={{ color: c.accent }}>
                    {c.name[lang]}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">{c.questions} Q</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-white/10 py-10 text-center text-xs text-slate-500 uppercase tracking-widest">
        Quiz<span className="text-[#FFD700]">Arena</span> — © 2026 — Knowledge Is Power
      </footer>
    </div>
  );
}
