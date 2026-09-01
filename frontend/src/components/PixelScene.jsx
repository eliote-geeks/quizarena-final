import { motion } from "framer-motion";

/**
 * PixelScene — animated SVG-based pixel art scene per category.
 * Each scene is a small video-game cutscene playing above the question.
 * Color palette is constrained: amber (#E5A800) + off-white + dark surfaces.
 * Categories are distinguished by SCENE COMPOSITION, not by hue.
 */

const AMBER = "#E5A800";
const AMBER_DIM = "#8a6500";
const BONE = "#E8E2D0";
const SHADOW = "#0B0B14";
const GHOST = "#3a3a44";

export default function PixelScene({ category, idx = 0, boss = false, hitFlash = 0 }) {
  const scenes = {
    histoire: <KnightVsCastle key={idx} boss={boss} hitFlash={hitFlash} />,
    geographie: <GlobeRadar key={idx} boss={boss} hitFlash={hitFlash} />,
    sciences: <AtomLab key={idx} boss={boss} hitFlash={hitFlash} />,
    cinema: <FilmReel key={idx} boss={boss} hitFlash={hitFlash} />,
    sport: <BoxerArena key={idx} boss={boss} hitFlash={hitFlash} />,
    musique: <Equalizer key={idx} boss={boss} hitFlash={hitFlash} />,
  };

  return (
    <div className="relative w-full h-[150px] sm:h-[175px] overflow-hidden border-b border-white/10 bg-[#0B0B14]">
      {/* CRT scanlines overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-30 scanlines z-20" />
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 60px rgba(0,0,0,0.7)" }} />
      <div className="relative w-full h-full">{scenes[category] || <SecondaryScene category={category} />}</div>
      {/* Hit flash overlay */}
      {hitFlash > 0 && (
        <div
          key={`hit-${hitFlash}`}
          className="absolute inset-0 pointer-events-none z-25"
          style={{
            background: "rgba(229,168,0,0.25)",
            animation: "fadeOut 0.35s ease-out forwards",
          }}
        />
      )}
    </div>
  );
}

/* The remaining themes deliberately use their own motion language instead of
   recycling the castle: circuits, leaves, steam, pages, flashes and speed lines. */
function SecondaryScene({ category }) {
  const name = category || "culture";
  return <svg viewBox="0 0 320 180" className="absolute inset-0 h-full w-full pixel-block" preserveAspectRatio="xMidYMid slice">
    <rect width="320" height="180" fill={SHADOW} />
    {name === "technologie" && <><path d="M24 38H116V76H210V126H296" fill="none" stroke={AMBER} strokeWidth="2" /><path d="M24 142H82V102H174V54H296" fill="none" stroke={BONE} strokeWidth="2" opacity=".75" /><motion.rect x="110" y="67" width="18" height="18" fill={AMBER} animate={{ x: [0, 82, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} /><motion.circle cx="296" cy="126" r="6" fill={AMBER} animate={{ opacity: [.2, 1, .2] }} transition={{ duration: 1.2, repeat: Infinity }} /></>}
    {name === "afrique" && <><circle cx="160" cy="82" r="45" fill="none" stroke={AMBER} strokeWidth="2" /><path d="M145 42L177 55L184 91L165 124L136 108L127 72Z" fill={AMBER} opacity=".75" /><motion.circle cx="89" cy="40" r="5" fill={BONE} animate={{ y: [0, 72, 0], opacity: [.2, 1, .2] }} transition={{ duration: 2.1, repeat: Infinity }} /><motion.circle cx="231" cy="132" r="5" fill={BONE} animate={{ y: [0, -72, 0], opacity: [.2, 1, .2] }} transition={{ duration: 2.1, repeat: Infinity, delay: .45 }} /></>}
    {name === "nature" && <><rect y="132" width="320" height="48" fill={AMBER_DIM} opacity=".32" />{[72, 136, 201, 258].map((x, i) => <motion.g key={x} animate={{ rotate: [-4, 4, -4] }} transition={{ duration: 2.4 + i * .2, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: `${x}px 132px` }}><rect x={x} y="70" width="4" height="64" fill={BONE} /><ellipse cx={x - 12} cy="88" rx="15" ry="7" fill={AMBER} /><ellipse cx={x + 13} cy="105" rx="16" ry="7" fill={AMBER} /></motion.g>)}</>}
    {name === "gastronomie" && <><ellipse cx="160" cy="121" rx="78" ry="23" fill={BONE} /><ellipse cx="160" cy="118" rx="66" ry="15" fill={SHADOW} /><motion.path d="M125 92C112 78 138 70 125 50M160 92C147 76 174 65 160 42M194 92C181 74 207 63 195 49" fill="none" stroke={AMBER} strokeWidth="4" animate={{ y: [0, -12, 0], opacity: [.25, 1, .25] }} transition={{ duration: 1.7, repeat: Infinity }} /></>}
    {name === "litterature" && <><motion.g animate={{ rotateY: [0, 16, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "160px 94px" }}><path d="M74 47H157V140H74Z" fill={BONE} /><path d="M163 47H246V140H163Z" fill={BONE} /><path d="M160 47V140" stroke={AMBER} strokeWidth="4" />{[72, 88, 104].map((y) => <path key={y} d={`M92 ${y}H142M178 ${y}H228`} stroke={SHADOW} strokeWidth="3" opacity=".7" />)}</motion.g></>}
    {name === "celebrites" && <><motion.g animate={{ scale: [.75, 1.2, .75], opacity: [.25, 1, .25] }} transition={{ duration: 1.6, repeat: Infinity }} style={{ transformOrigin: "160px 88px" }}><polygon points="160,28 172,70 216,70 180,96 194,140 160,114 126,140 140,96 104,70 148,70" fill={AMBER} /></motion.g>{[48, 275].map((x, i) => <motion.rect key={x} x={x} y="20" width="5" height="130" fill={BONE} animate={{ opacity: [.1, .8, .1] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * .35 }} />)}</>}
    {name === "anime" && <><motion.g animate={{ x: [-38, 38] }} transition={{ duration: 1.15, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}>{[35, 67, 100, 133, 166, 199, 232].map((y, i) => <path key={y} d={`M25 ${y}H${205 + i * 10}`} stroke={i % 2 ? BONE : AMBER} strokeWidth="4" />)}</motion.g><motion.path d="M246 40L285 90L246 140" fill="none" stroke={AMBER} strokeWidth="8" animate={{ scale: [.8, 1.1, .8] }} transition={{ duration: 1.15, repeat: Infinity }} style={{ transformOrigin: "265px 90px" }} /></>}
    {!["technologie", "afrique", "nature", "gastronomie", "litterature", "celebrites", "anime"].includes(name) && <><circle cx="160" cy="90" r="38" fill="none" stroke={AMBER} strokeWidth="5" />{[0, 60, 120, 180, 240, 300].map((angle) => <motion.rect key={angle} x="156" y="20" width="8" height="30" fill={BONE} animate={{ rotate: [angle, angle + 360] }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "160px 90px" }} />)}<motion.circle cx="160" cy="90" r="9" fill={AMBER} animate={{ scale: [.75, 1.15, .75] }} transition={{ duration: 1.3, repeat: Infinity }} /></>}
  </svg>;
}

/* ============================================================
   BOSS SPRITE — common pixel boss that pulses & glares.
   Used in all scenes when `boss` prop is true (mid-round milestone).
   ============================================================ */
function BossSprite({ x = 260, y = 70 }) {
  return (
    <motion.g
      initial={{ opacity: 0, y: y - 30 }}
      animate={{ opacity: 1, y, x: [0, -6, 0] }}
      transition={{
        opacity: { duration: 0.5 },
        y: { duration: 0.5 },
        x: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
      }}
    >
      {/* Aura */}
      <motion.circle
        cx={x + 22} cy={y + 24} r={32}
        fill={AMBER} opacity={0.18}
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      {/* Body */}
      <rect x={x} y={y + 8} width={44} height={36} fill={BONE} />
      {/* Horns */}
      <polygon points={`${x + 4},${y + 8} ${x + 10},${y - 4} ${x + 14},${y + 8}`} fill={BONE} />
      <polygon points={`${x + 30},${y + 8} ${x + 34},${y - 4} ${x + 40},${y + 8}`} fill={BONE} />
      {/* Glowing eyes */}
      <motion.rect
        x={x + 10} y={y + 20} width={6} height={5}
        fill={AMBER}
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
      <motion.rect
        x={x + 28} y={y + 20} width={6} height={5}
        fill={AMBER}
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }}
      />
      {/* Mouth */}
      <rect x={x + 12} y={y + 32} width={20} height={4} fill={SHADOW} />
      <rect x={x + 14} y={y + 32} width={3} height={3} fill={BONE} />
      <rect x={x + 22} y={y + 32} width={3} height={3} fill={BONE} />
      <rect x={x + 28} y={y + 32} width={3} height={3} fill={BONE} />
      {/* Crown */}
      <rect x={x + 16} y={y - 2} width={12} height={4} fill={AMBER} />
      <rect x={x + 18} y={y - 6} width={2} height={4} fill={AMBER} />
      <rect x={x + 21} y={y - 6} width={2} height={4} fill={AMBER} />
      <rect x={x + 24} y={y - 6} width={2} height={4} fill={AMBER} />
      {/* Label */}
      <text
        x={x + 22}
        y={y + 56}
        textAnchor="middle"
        fontFamily="VT323"
        fontSize="14"
        fill={AMBER}
      >
        ! BOSS !
      </text>
    </motion.g>
  );
}

/* ============================================================
   HISTOIRE — Pixel knight charging toward a castle, swinging sword
   ============================================================ */
function KnightVsCastle({ boss }) {
  return (
    <svg viewBox="0 0 320 180" className="absolute inset-0 w-full h-full pixel-block" preserveAspectRatio="xMidYMid slice">
      {/* Sky */}
      <rect width="320" height="180" fill={SHADOW} />
      {/* Distant mountains */}
      <polygon points="0,140 60,100 120,140" fill={GHOST} opacity="0.6" />
      <polygon points="100,140 180,90 260,140" fill={GHOST} opacity="0.4" />
      {/* Ground */}
      <rect x="0" y="140" width="320" height="40" fill={AMBER_DIM} opacity="0.3" />
      {/* Castle (right) */}
      <g>
        <rect x="240" y="80" width="60" height="60" fill={BONE} opacity="0.85" />
        <rect x="244" y="74" width="6" height="6" fill={BONE} />
        <rect x="254" y="74" width="6" height="6" fill={BONE} />
        <rect x="264" y="74" width="6" height="6" fill={BONE} />
        <rect x="274" y="74" width="6" height="6" fill={BONE} />
        <rect x="284" y="74" width="6" height="6" fill={BONE} />
        <rect x="294" y="74" width="6" height="6" fill={BONE} />
        {/* Door */}
        <rect x="262" y="110" width="14" height="30" fill={SHADOW} />
        {/* Flag pole */}
        <rect x="269" y="50" width="2" height="24" fill={BONE} />
        <motion.rect
          x="271" y="50" width="14" height="8"
          fill={AMBER}
          animate={{ scaleX: [1, 0.6, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "271px 54px" }}
        />
      </g>
      {/* Knight (animated march) */}
      <motion.g
        animate={{ x: [0, 8, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* shadow */}
        <ellipse cx="80" cy="138" rx="14" ry="3" fill="#000" opacity="0.5" />
        {/* legs */}
        <rect x="74" y="120" width="4" height="18" fill={BONE} />
        <rect x="82" y="120" width="4" height="18" fill={BONE} />
        {/* body */}
        <rect x="70" y="96" width="20" height="26" fill={BONE} />
        {/* helmet */}
        <rect x="72" y="80" width="16" height="18" fill={BONE} />
        <rect x="76" y="88" width="8" height="3" fill={SHADOW} />
        {/* plume */}
        <rect x="78" y="74" width="4" height="8" fill={AMBER} />
        {/* sword (animated swing) */}
        <motion.g
          animate={{ rotate: [-20, 30, -20] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "92px 108px" }}
        >
          <rect x="92" y="86" width="3" height="26" fill={AMBER} />
          <rect x="88" y="108" width="11" height="3" fill={BONE} />
        </motion.g>
        {/* shield */}
        <rect x="62" y="102" width="8" height="14" fill={AMBER} />
      </motion.g>
      {/* Sparks */}
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={150 + i * 30}
          cy={120}
          r="2"
          fill={AMBER}
          animate={{ y: [0, -20, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
      {boss && <BossSprite x={150} y={50} />}
    </svg>
  );
}

/* ============================================================
   GEOGRAPHIE — Rotating wireframe globe with radar sweep
   ============================================================ */
function GlobeRadar({ boss }) {
  return (
    <svg viewBox="0 0 320 180" className="absolute inset-0 w-full h-full pixel-block" preserveAspectRatio="xMidYMid slice">
      <rect width="320" height="180" fill={SHADOW} />
      {/* Stars */}
      {[[40, 30], [280, 25], [60, 150], [250, 50], [20, 100], [300, 130]].map(([x, y], i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r="1.5"
          fill={BONE}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
      {/* Globe */}
      <g transform="translate(160 95)">
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        >
          {/* Wireframe sphere */}
          <circle r="58" fill="none" stroke={AMBER} strokeWidth="1.5" opacity="0.9" />
          <ellipse rx="58" ry="20" fill="none" stroke={AMBER} strokeWidth="1" opacity="0.6" />
          <ellipse rx="58" ry="40" fill="none" stroke={AMBER} strokeWidth="1" opacity="0.6" />
          <ellipse rx="20" ry="58" fill="none" stroke={AMBER} strokeWidth="1" opacity="0.6" />
          <ellipse rx="40" ry="58" fill="none" stroke={AMBER} strokeWidth="1" opacity="0.6" />
          {/* Continents (pixelized) */}
          <g fill={AMBER}>
            <rect x="-30" y="-20" width="6" height="6" />
            <rect x="-24" y="-20" width="6" height="6" />
            <rect x="-24" y="-14" width="6" height="6" />
            <rect x="-30" y="-14" width="6" height="6" />
            <rect x="-12" y="-8" width="6" height="6" />
            <rect x="-6" y="-8" width="6" height="6" />
            <rect x="-6" y="-2" width="6" height="6" />
            <rect x="14" y="-20" width="6" height="6" />
            <rect x="20" y="-20" width="6" height="6" />
            <rect x="14" y="-14" width="6" height="6" />
            <rect x="14" y="6" width="6" height="6" />
            <rect x="20" y="6" width="6" height="6" />
            <rect x="20" y="12" width="6" height="6" />
            <rect x="-30" y="20" width="6" height="6" />
            <rect x="-24" y="20" width="6" height="6" />
          </g>
        </motion.g>
        {/* Radar sweep */}
        <motion.path
          d="M 0 0 L 58 0 A 58 58 0 0 0 41 -41 Z"
          fill={AMBER}
          opacity="0.25"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        {/* Targets blip */}
        {[[35, -10], [-20, 30], [10, -45]].map(([x, y], i) => (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r="3"
            fill={BONE}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.4, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
      </g>
      {boss && <BossSprite x={40} y={40} />}
    </svg>
  );
}

/* ============================================================
   SCIENCES — Atom with orbiting electrons in a lab dish
   ============================================================ */
function AtomLab({ boss }) {
  return (
    <svg viewBox="0 0 320 180" className="absolute inset-0 w-full h-full pixel-block" preserveAspectRatio="xMidYMid slice">
      <rect width="320" height="180" fill={SHADOW} />
      {/* Lab table */}
      <rect x="0" y="155" width="320" height="25" fill={AMBER_DIM} opacity="0.4" />
      {/* Beaker (left) */}
      <g transform="translate(40 70)">
        <rect x="0" y="0" width="34" height="8" fill={BONE} />
        <rect x="4" y="8" width="26" height="72" fill="none" stroke={BONE} strokeWidth="2" />
        {/* Bubbling liquid */}
        <motion.rect
          x="6" y="50" width="22" height="28"
          fill={AMBER} opacity="0.7"
          animate={{ y: [50, 45, 50] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={i}
            cx={10 + i * 7}
            cy={70}
            r="1.5"
            fill={BONE}
            animate={{ y: [-5, -25, -5], opacity: [1, 0, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
      </g>
      {/* Atom */}
      <g transform="translate(200 90)">
        {/* Orbits */}
        <ellipse rx="50" ry="18" fill="none" stroke={AMBER} strokeWidth="1.5" opacity="0.8" />
        <motion.g animate={{ rotate: 60 }}>
          <ellipse rx="50" ry="18" fill="none" stroke={AMBER} strokeWidth="1.5" opacity="0.6" />
        </motion.g>
        <motion.g animate={{ rotate: 120 }}>
          <ellipse rx="50" ry="18" fill="none" stroke={AMBER} strokeWidth="1.5" opacity="0.4" />
        </motion.g>
        {/* Nucleus */}
        <motion.circle
          r="8"
          fill={AMBER}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <circle r="4" fill={BONE} />
        {/* Electrons */}
        <motion.circle
          cx="50" cy="0" r="3" fill={BONE}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "0 0" }}
        />
        <motion.g
          animate={{ rotate: -360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        >
          <circle cx="50" cy="0" r="3" fill={BONE} transform="rotate(60)" />
        </motion.g>
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
        >
          <circle cx="50" cy="0" r="3" fill={BONE} transform="rotate(120)" />
        </motion.g>
      </g>
      {boss && <BossSprite x={140} y={30} />}
    </svg>
  );
}

/* ============================================================
   CINEMA — Rolling film reel + spotlight beam
   ============================================================ */
function FilmReel({ boss }) {
  return (
    <svg viewBox="0 0 320 180" className="absolute inset-0 w-full h-full pixel-block" preserveAspectRatio="xMidYMid slice">
      <rect width="320" height="180" fill={SHADOW} />
      {/* Spotlight cone */}
      <motion.polygon
        points="50,0 80,180 20,180"
        fill={AMBER}
        opacity="0.15"
        animate={{ x: [0, 220, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Film strip running across */}
      <motion.g
        animate={{ x: [0, -40] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      >
        {[...Array(12)].map((_, i) => (
          <g key={i} transform={`translate(${i * 40} 70)`}>
            <rect x="0" y="0" width="40" height="40" fill={BONE} opacity="0.92" />
            <rect x="3" y="4" width="6" height="6" fill={SHADOW} />
            <rect x="31" y="4" width="6" height="6" fill={SHADOW} />
            <rect x="3" y="30" width="6" height="6" fill={SHADOW} />
            <rect x="31" y="30" width="6" height="6" fill={SHADOW} />
            <rect x="12" y="13" width="16" height="14" fill={AMBER_DIM} opacity="0.7" />
          </g>
        ))}
      </motion.g>
      {/* Reel left */}
      <ReelWheel cx={48} cy={130} />
      <ReelWheel cx={272} cy={130} reverse />
      {boss && <BossSprite x={140} y={30} />}
    </svg>
  );
}

function ReelWheel({ cx, cy, reverse }) {
  return (
    <motion.g
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
    >
      <circle cx={cx} cy={cy} r="30" fill={BONE} opacity="0.9" />
      <circle cx={cx} cy={cy} r="8" fill={SHADOW} />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <rect
          key={deg}
          x={cx - 1.5}
          y={cy - 25}
          width="3"
          height="14"
          fill={SHADOW}
          transform={`rotate(${deg} ${cx} ${cy})`}
        />
      ))}
    </motion.g>
  );
}

/* ============================================================
   SPORT — Pixel boxer punching a heavy bag
   ============================================================ */
function BoxerArena({ boss }) {
  return (
    <svg viewBox="0 0 320 180" className="absolute inset-0 w-full h-full pixel-block" preserveAspectRatio="xMidYMid slice">
      <rect width="320" height="180" fill={SHADOW} />
      {/* Ring floor */}
      <rect x="0" y="150" width="320" height="30" fill={AMBER_DIM} opacity="0.4" />
      {/* Ring ropes */}
      <line x1="0" y1="105" x2="320" y2="105" stroke={AMBER} strokeWidth="1.5" opacity="0.8" />
      <line x1="0" y1="125" x2="320" y2="125" stroke={AMBER} strokeWidth="1.5" opacity="0.6" />
      {/* Spotlight halo */}
      <motion.ellipse
        cx="200" cy="140" rx="80" ry="20"
        fill={AMBER}
        opacity="0.15"
        animate={{ opacity: [0.1, 0.25, 0.1] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      />
      {/* Heavy bag */}
      <motion.g
        animate={{ x: [0, 6, -2, 0] }}
        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "240px 80px" }}
      >
        <rect x="232" y="60" width="3" height="20" fill={BONE} />
        <rect x="220" y="80" width="30" height="65" fill={AMBER} />
        <rect x="220" y="105" width="30" height="3" fill={SHADOW} />
        <rect x="220" y="120" width="30" height="3" fill={SHADOW} />
      </motion.g>
      {/* Boxer */}
      <g transform="translate(110 95)">
        {/* shadow */}
        <ellipse cx="20" cy="55" rx="20" ry="3" fill="#000" opacity="0.5" />
        {/* legs */}
        <rect x="14" y="38" width="6" height="18" fill={BONE} />
        <rect x="24" y="38" width="6" height="18" fill={BONE} />
        {/* shorts */}
        <rect x="10" y="30" width="24" height="12" fill={AMBER} />
        {/* torso */}
        <rect x="10" y="10" width="24" height="22" fill={BONE} />
        {/* head */}
        <rect x="14" y="-4" width="16" height="14" fill={BONE} />
        {/* eye */}
        <rect x="24" y="2" width="3" height="3" fill={SHADOW} />
        {/* back arm */}
        <rect x="4" y="12" width="6" height="14" fill={BONE} />
        {/* Punching arm */}
        <motion.g
          animate={{ x: [0, 38, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "easeOut" }}
        >
          <rect x="34" y="14" width="22" height="6" fill={BONE} />
          <rect x="54" y="11" width="10" height="12" fill={AMBER} />
        </motion.g>
      </g>
      {/* Impact stars */}
      <motion.g
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.3, 0.5] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "easeOut" }}
        style={{ transformOrigin: "220px 105px" }}
      >
        <polygon points="220,98 224,105 220,112 216,105" fill={AMBER} />
        <polygon points="213,105 220,109 227,105 220,101" fill={AMBER} />
      </motion.g>
      {boss && <BossSprite x={140} y={35} />}
    </svg>
  );
}

/* ============================================================
   MUSIQUE — Pixel equalizer + waveform
   ============================================================ */
function Equalizer({ boss }) {
  const bars = 20;
  return (
    <svg viewBox="0 0 320 180" className="absolute inset-0 w-full h-full pixel-block" preserveAspectRatio="xMidYMid slice">
      <rect width="320" height="180" fill={SHADOW} />
      {/* Center waveform */}
      <motion.polyline
        points="0,90 20,80 40,100 60,70 80,110 100,80 120,95 140,75 160,105 180,80 200,100 220,70 240,110 260,85 280,95 300,80 320,90"
        fill="none"
        stroke={AMBER}
        strokeWidth="2"
        opacity="0.6"
        animate={{ x: [0, -20, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
      />
      {/* Bars */}
      <g>
        {[...Array(bars)].map((_, i) => {
          const x = 8 + i * 16;
          return (
            <motion.rect
              key={i}
              x={x}
              y="60"
              width="8"
              fill={AMBER}
              animate={{ height: [10, 70, 30, 90, 20, 60, 15], y: [130, 70, 110, 50, 120, 80, 125] }}
              transition={{
                duration: 1.4 + (i % 5) * 0.1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.05,
              }}
            />
          );
        })}
      </g>
      {/* Vinyl on right */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "280px 90px" }}
      >
        <circle cx="280" cy="90" r="24" fill={BONE} />
        <circle cx="280" cy="90" r="20" fill={SHADOW} />
        <circle cx="280" cy="90" r="16" fill={BONE} opacity="0.3" />
        <circle cx="280" cy="90" r="6" fill={AMBER} />
        <rect x="278" y="65" width="4" height="4" fill={SHADOW} />
      </motion.g>
      {boss && <BossSprite x={130} y={20} />}
    </svg>
  );
}
