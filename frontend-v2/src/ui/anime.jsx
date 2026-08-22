import clsx from "clsx";

/* ═══════════════════════════════════════════════════════════════════
   Personnages anime — SVG inline, aucune dépendance externe.
   viewBox "0 0 80 96" uniforme · tête en (40,44) · grands yeux (marqueur
   anime) · accessoire propre à chaque rôle.
   Peaux : SKIN_L (teinte claire générique) · SKIN_M (teinte camerounaise).
   ═══════════════════════════════════════════════════════════════════ */

const SKIN_L  = "#F5C5A3";   // teinte claire
const SKIN_M  = "#CF9660";   // teinte camerounaise
const SKIN_SH = "#C8987A";   // ombre bouche/nez

// Éléments communs réutilisés dans chaque personnage
function Eyes({ lx = 28, rx = 52, y = 43, color = "#3B82F6" }) {
  return (
    <>
      {[lx, rx].map((cx, i) => (
        <g key={i}>
          <ellipse cx={cx} cy={y}     rx={7}   ry={8}   fill="white"/>
          <ellipse cx={cx} cy={y + 1} rx={5}   ry={6}   fill={color}/>
          <ellipse cx={cx} cy={y + 1} rx={3}   ry={3.5} fill="#111"/>
          <circle  cx={cx + 2} cy={y - 2}     r={1.3}  fill="white"/>
        </g>
      ))}
    </>
  );
}
function AngryBrows({ color }) {
  return (
    <>
      <path d="M22 35 L37 32" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M43 32 L58 35" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </>
  );
}
function NormalBrows({ color }) {
  return (
    <>
      <path d="M22 34 Q29 31 36 33" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M44 33 Q51 31 58 34" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    </>
  );
}
function HappyBrows({ color }) {
  return (
    <>
      <path d="M22 32 Q29 29 36 31" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M44 31 Q51 29 58 32" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    </>
  );
}
function Nose({ skin = SKIN_SH }) {
  return <circle cx="40" cy="52" r="1.2" fill={skin}/>;
}
function Smile({ skin = SKIN_SH }) {
  return <path d="M34 58 Q40 63 46 58" stroke={skin} strokeWidth="1.5" fill="none" strokeLinecap="round"/>;
}
function BigSmile({ skin = SKIN_SH }) {
  return (
    <>
      <path d="M32 57 Q40 65 48 57" fill={skin}/>
      <ellipse cx="40" cy="60" rx="6" ry="4" fill="#FF9090"/>
    </>
  );
}
function Neutral({ skin = SKIN_SH }) {
  return <path d="M34 59 L46 59" stroke={skin} strokeWidth="1.5" strokeLinecap="round"/>;
}
// Visage de base (tête + oreilles + cou) — à placer APRÈS les cheveux "arrière"
function BaseFace({ skin = SKIN_L }) {
  return (
    <>
      <ellipse cx="40" cy="44" rx="20" ry="22" fill={skin}/>
      <ellipse cx="20" cy="48"  rx={5}  ry={7}  fill={skin}/>
      <ellipse cx="60" cy="48"  rx={5}  ry={7}  fill={skin}/>
      <rect x="34" y="62" width="12" height="13" rx="5" fill={skin}/>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Mode : En ligne — Guerrier aux cheveux rouges hérissés
   ────────────────────────────────────────────────────────────────── */
export function WarriorChar() {
  return (
    <svg viewBox="0 0 80 96" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="92" rx="26" ry="4" fill="#000" fillOpacity=".1"/>
      {/* Corps */}
      <path d="M8 96 Q10 78 40 74 Q70 78 72 96Z" fill="#7F1D1D"/>
      <path d="M33 74 L40 81 L47 74" fill="#991B1B"/>
      <rect x="34" y="63" width="12" height="13" rx="5" fill={SKIN_L}/>
      {/* Cheveux derrière */}
      <ellipse cx="40" cy="37" rx="22" ry="28" fill="#991B1B"/>
      <polygon points="21,34 17,7 28,25"  fill="#DC2626"/>
      <polygon points="40,28 37,4 47,16"  fill="#DC2626"/>
      <polygon points="59,33 63,7 52,24"  fill="#DC2626"/>
      <path d="M19 42 Q15 57 17 69" stroke="#DC2626" strokeWidth="8" strokeLinecap="round"/>
      <path d="M61 42 Q65 57 63 69" stroke="#DC2626" strokeWidth="8" strokeLinecap="round"/>
      <BaseFace skin={SKIN_L}/>
      <Eyes lx={28} rx={52} y={43} color="#DC2626"/>
      <AngryBrows color="#7F1D1D"/>
      <Nose/>
      <Neutral/>
      {/* Cicatrice */}
      <path d="M48 37 L51 47" stroke="#DC2626" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Épées croisées */}
      <line x1="22" y1="90" x2="52" y2="74" stroke="#E5E7EB" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="58" y1="90" x2="28" y2="74" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="18" y="87" width="8" height="3.5" rx="1.5" fill="#FCD34D"/>
      <rect x="54" y="87" width="8" height="3.5" rx="1.5" fill="#FCD34D"/>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Mode : Duel ouvert — Héraut avec mégaphone, peau foncée
   ────────────────────────────────────────────────────────────────── */
export function HeraldChar() {
  return (
    <svg viewBox="0 0 80 96" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="92" rx="26" ry="4" fill="#000" fillOpacity=".1"/>
      <path d="M8 96 Q10 78 40 74 Q70 78 72 96Z" fill="#B45309"/>
      <path d="M33 74 L40 81 L47 74" fill="#D97706"/>
      <rect x="34" y="63" width="12" height="13" rx="5" fill={SKIN_M}/>
      {/* Afro arrondi */}
      <ellipse cx="40" cy="36" rx="24" ry="22" fill="#1C1917"/>
      {/* Cheveux devant/côté */}
      <path d="M19 44 Q15 56 18 66" stroke="#1C1917" strokeWidth="9" strokeLinecap="round"/>
      <path d="M61 44 Q65 56 62 66" stroke="#1C1917" strokeWidth="9" strokeLinecap="round"/>
      <BaseFace skin={SKIN_M}/>
      <Eyes lx={28} rx={52} y={43} color="#D97706"/>
      <HappyBrows color="#1C1917"/>
      <Nose skin="#A86030"/>
      <BigSmile skin="#A86030"/>
      {/* Mégaphone */}
      <path d="M52 78 L62 72 L62 88 L52 84Z" fill="#F59E0B"/>
      <rect x="46" y="79" width="7" height="5" rx="1.5" fill="#FCD34D"/>
      <path d="M62 76 Q68 74 68 80 Q68 86 62 84" stroke="#F59E0B" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Ondes sonores */}
      <path d="M64 77 Q70 80 64 83" stroke="#FCD34D" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Mode : Contre l'ordinateur — Robot cyberpunk
   ────────────────────────────────────────────────────────────────── */
export function RobotChar() {
  return (
    <svg viewBox="0 0 80 96" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="92" rx="26" ry="4" fill="#000" fillOpacity=".1"/>
      <path d="M8 96 Q10 78 40 74 Q70 78 72 96Z" fill="#1E3A5F"/>
      <path d="M33 74 L40 81 L47 74" fill="#1D4ED8"/>
      {/* Tête mécanique (carré arrondi) */}
      <rect x="18" y="22" width="44" height="46" rx="8" fill="#1E40AF"/>
      <rect x="20" y="24" width="40" height="42" rx="7" fill="#2563EB"/>
      {/* Antenne */}
      <rect x="38" y="10" width="4" height="14" rx="2" fill="#1D4ED8"/>
      <circle cx="40" cy="8" r="5" fill="#60A5FA"/>
      <circle cx="40" cy="8" r="3" fill="#93C5FD"/>
      {/* Oreilles mécaniques */}
      <rect x="12" y="38" width="8" height="14" rx="3" fill="#1E40AF"/>
      <rect x="60" y="38" width="8" height="14" rx="3" fill="#1E40AF"/>
      {/* Yeux LED */}
      <rect x="25" y="38" width="11" height="10" rx="3" fill="#0F172A"/>
      <rect x="44" y="38" width="11" height="10" rx="3" fill="#0F172A"/>
      <rect x="26" y="39" width="9"  height="8"  rx="2" fill="#38BDF8"/>
      <rect x="45" y="39" width="9"  height="8"  rx="2" fill="#38BDF8"/>
      <circle cx="30" cy="43" r="1.5" fill="white" fillOpacity=".8"/>
      <circle cx="49" cy="43" r="1.5" fill="white" fillOpacity=".8"/>
      {/* Bouche LED */}
      <rect x="28" y="54" width="24" height="5" rx="2.5" fill="#0F172A"/>
      <rect x="30" y="55" width="5" height="3" rx="1.5" fill="#38BDF8"/>
      <rect x="37" y="55" width="5" height="3" rx="1.5" fill="#38BDF8"/>
      <rect x="44" y="55" width="5" height="3" rx="1.5" fill="#38BDF8"/>
      {/* Cou mécanique */}
      <rect x="34" y="68" width="12" height="8" rx="3" fill="#1E40AF"/>
      {/* Éclair */}
      <path d="M46 80 L58 72 L54 82 L62 74" stroke="#FCD34D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Mode : Tournoi — Champion couronné aux cheveux violets
   ────────────────────────────────────────────────────────────────── */
export function TrophyChar() {
  return (
    <svg viewBox="0 0 80 96" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="92" rx="26" ry="4" fill="#000" fillOpacity=".1"/>
      <path d="M8 96 Q10 78 40 74 Q70 78 72 96Z" fill="#4C1D95"/>
      <path d="M33 74 L40 81 L47 74" fill="#7C3AED"/>
      <rect x="34" y="63" width="12" height="13" rx="5" fill={SKIN_L}/>
      {/* Longs cheveux violets derrière */}
      <path d="M20 44 Q14 65 16 82 Q20 90 28 88" stroke="#7C3AED" strokeWidth="12" strokeLinecap="round"/>
      <path d="M60 44 Q66 65 64 82 Q60 90 52 88" stroke="#7C3AED" strokeWidth="12" strokeLinecap="round"/>
      {/* Base cheveux */}
      <ellipse cx="40" cy="37" rx="22" ry="26" fill="#6D28D9"/>
      <BaseFace skin={SKIN_L}/>
      {/* Couronne */}
      <path d="M24 30 L28 20 L35 28 L40 16 L45 28 L52 20 L56 30Z" fill="#FCD34D"/>
      <circle cx="40" cy="18" r="3" fill="#F59E0B"/>
      <circle cx="28" cy="22" r="2" fill="#F59E0B"/>
      <circle cx="52" cy="22" r="2" fill="#F59E0B"/>
      <Eyes lx={28} rx={52} y={43} color="#7C3AED"/>
      <NormalBrows color="#4C1D95"/>
      <Nose/>
      <Smile/>
      {/* Étoiles */}
      <polygon points="14,70 15.5,74 20,74 16.5,77 18,81 14,78 10,81 11.5,77 8,74 12.5,74" fill="#FCD34D" fillOpacity=".8"/>
      <polygon points="66,68 67,71.5 70.5,71.5 67.8,74 68.8,77.5 66,75.5 63.2,77.5 64.2,74 61.5,71.5 65,71.5" fill="#FCD34D" fillOpacity=".8"/>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Difficulté : Facile — Chibi adorable, cheveux verts bouclés
   ────────────────────────────────────────────────────────────────── */
export function EasyChar() {
  return (
    <svg viewBox="0 0 80 96" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="92" rx="26" ry="4" fill="#000" fillOpacity=".1"/>
      <path d="M8 96 Q10 78 40 74 Q70 78 72 96Z" fill="#14532D"/>
      <path d="M33 74 L40 81 L47 74" fill="#16A34A"/>
      <rect x="34" y="63" width="12" height="13" rx="5" fill={SKIN_L}/>
      {/* Cheveux verts ronds (chibi) */}
      <ellipse cx="40" cy="35" rx="24" ry="22" fill="#16A34A"/>
      {/* Touffes latérales */}
      <ellipse cx="17" cy="44" rx="9"  ry="11" fill="#16A34A"/>
      <ellipse cx="63" cy="44" rx="9"  ry="11" fill="#16A34A"/>
      {/* Mèche sur le front */}
      <path d="M34 38 Q38 28 46 36" stroke="#15803D" strokeWidth="5" strokeLinecap="round" fill="none"/>
      <BaseFace skin={SKIN_L}/>
      {/* Grands yeux chibi */}
      <ellipse cx="28" cy="44" rx="9"  ry="10" fill="white"/>
      <ellipse cx="28" cy="45" rx="7"  ry="8"  fill="#16A34A"/>
      <ellipse cx="28" cy="45" rx="4"  ry="4.5" fill="#111"/>
      <circle  cx="31" cy="42" r="1.8" fill="white"/>
      <ellipse cx="52" cy="44" rx="9"  ry="10" fill="white"/>
      <ellipse cx="52" cy="45" rx="7"  ry="8"  fill="#16A34A"/>
      <ellipse cx="52" cy="45" rx="4"  ry="4.5" fill="#111"/>
      <circle  cx="55" cy="42" r="1.8" fill="white"/>
      <HappyBrows color="#15803D"/>
      <Nose/>
      <BigSmile/>
      {/* Joues roses chibi */}
      <ellipse cx="20" cy="54" rx="5" ry="3.5" fill="#FCA5A5" fillOpacity=".6"/>
      <ellipse cx="60" cy="54" rx="5" ry="3.5" fill="#FCA5A5" fillOpacity=".6"/>
      {/* Goutte de sueur (chibi) */}
      <path d="M62 28 Q64 24 68 26 Q68 30 64 30Z" fill="#93C5FD" fillOpacity=".8"/>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Difficulté : Moyen — Étudiant sérieux avec lunettes
   ────────────────────────────────────────────────────────────────── */
export function MedChar() {
  return (
    <svg viewBox="0 0 80 96" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="92" rx="26" ry="4" fill="#000" fillOpacity=".1"/>
      <path d="M8 96 Q10 78 40 74 Q70 78 72 96Z" fill="#1e3a8a"/>
      <path d="M33 74 L40 81 L47 74" fill="#2563EB"/>
      <rect x="34" y="63" width="12" height="13" rx="5" fill={SKIN_L}/>
      {/* Cheveux noirs nets, coiffés de côté */}
      <ellipse cx="40" cy="36" rx="22" ry="26" fill="#1C1917"/>
      <path d="M18 42 Q22 24 46 22 Q56 22 62 34" fill="#1C1917"/>
      <path d="M18 42 Q16 52 18 66" stroke="#1C1917" strokeWidth="7" strokeLinecap="round"/>
      <path d="M62 40 Q64 52 62 66" stroke="#1C1917" strokeWidth="7" strokeLinecap="round"/>
      <BaseFace skin={SKIN_L}/>
      <Eyes lx={28} rx={52} y={43} color="#1D4ED8"/>
      <NormalBrows color="#1C1917"/>
      <Nose/>
      <Neutral/>
      {/* Lunettes */}
      <rect x="19" y="38" width="17" height="12" rx="5" fill="none" stroke="#374151" strokeWidth="2.2"/>
      <rect x="43" y="38" width="17" height="12" rx="5" fill="none" stroke="#374151" strokeWidth="2.2"/>
      <path d="M36 44 L44 44" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
      <path d="M19 42 L14 40" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
      <path d="M60 42 L66 40" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
      {/* Livre */}
      <rect x="12" y="78" width="20" height="14" rx="2" fill="#2563EB"/>
      <rect x="13" y="79" width="9"  height="12" rx="1" fill="#1D4ED8"/>
      <rect x="15" y="82" width="5"  height="1.5" rx=".5" fill="#93C5FD"/>
      <rect x="15" y="85" width="7"  height="1.5" rx=".5" fill="#93C5FD"/>
      <rect x="15" y="88" width="4"  height="1.5" rx=".5" fill="#93C5FD"/>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Difficulté : Difficile — Maître aux cheveux argentés
   ────────────────────────────────────────────────────────────────── */
export function HardChar() {
  return (
    <svg viewBox="0 0 80 96" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="92" rx="26" ry="4" fill="#000" fillOpacity=".1"/>
      <path d="M8 96 Q10 78 40 74 Q70 78 72 96Z" fill="#111827"/>
      <path d="M33 74 L40 81 L47 74" fill="#1F2937"/>
      <rect x="34" y="63" width="12" height="13" rx="5" fill={SKIN_L}/>
      {/* Cheveux argentés peignés en arrière */}
      <ellipse cx="40" cy="36" rx="22" ry="26" fill="#9CA3AF"/>
      <path d="M18 42 Q20 26 58 24 Q64 28 62 38" fill="#D1D5DB"/>
      <path d="M18 42 Q16 54 20 70" stroke="#9CA3AF" strokeWidth="6" strokeLinecap="round"/>
      <path d="M62 40 Q66 54 62 70" stroke="#9CA3AF" strokeWidth="6" strokeLinecap="round"/>
      {/* Mèche dramatique */}
      <path d="M26 32 Q34 16 50 24" stroke="#E5E7EB" strokeWidth="5" strokeLinecap="round" fill="none"/>
      <BaseFace skin={SKIN_L}/>
      <Eyes lx={28} rx={52} y={43} color="#F97316"/>
      <AngryBrows color="#4B5563"/>
      <Nose/>
      {/* Sourire froid */}
      <path d="M34 58 Q40 61 46 58" stroke={SKIN_SH} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Katana */}
      <path d="M56 70 L72 86" stroke="#D1D5DB" strokeWidth="3" strokeLinecap="round"/>
      <rect x="52" y="67" width="6" height="5" rx="1.5" fill="#F59E0B"/>
      <path d="M53 68 L59 74" stroke="#FCD34D" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Catégorie : Football CM — Footballeur en maillot des Lions
   ────────────────────────────────────────────────────────────────── */
export function FootballerChar() {
  return (
    <svg viewBox="0 0 80 96" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="92" rx="26" ry="4" fill="#000" fillOpacity=".1"/>
      {/* Maillot vert Cameroun */}
      <path d="M8 96 Q10 78 40 74 Q70 78 72 96Z" fill="#006233"/>
      <path d="M33 74 L40 81 L47 74" fill="#007A3D"/>
      {/* Bande rouge */}
      <path d="M15 85 Q40 82 65 85" stroke="#CE1126" strokeWidth="4"/>
      <rect x="34" y="63" width="12" height="13" rx="5" fill={SKIN_M}/>
      {/* Cheveux courts */}
      <ellipse cx="40" cy="35" rx="21" ry="24" fill="#1C1917"/>
      <path d="M19 42 Q17 54 19 64" stroke="#1C1917" strokeWidth="6" strokeLinecap="round"/>
      <path d="M61 42 Q63 54 61 64" stroke="#1C1917" strokeWidth="6" strokeLinecap="round"/>
      <BaseFace skin={SKIN_M}/>
      <Eyes lx={28} rx={52} y={43} color="#78350F"/>
      <NormalBrows color="#1C1917"/>
      <Nose skin="#A86030"/>
      <Smile skin="#A86030"/>
      {/* Ballon */}
      <circle cx="18" cy="84" r="10" fill="white"/>
      <circle cx="18" cy="84" r="10" fill="none" stroke="#1C1917" strokeWidth="1"/>
      <polygon points="18,76 22,80 20,85 16,85 14,80" fill="#1C1917"/>
      <line x1="14" y1="80" x2="18" y2="76" stroke="#1C1917" strokeWidth=".8"/>
      <line x1="22" y1="80" x2="18" y2="76" stroke="#1C1917" strokeWidth=".8"/>
      <line x1="20" y1="85" x2="16" y2="85" stroke="#1C1917" strokeWidth=".8"/>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Catégorie : Musique CM — Musicien avec casque et grand afro
   ────────────────────────────────────────────────────────────────── */
export function MusicianChar() {
  return (
    <svg viewBox="0 0 80 96" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="92" rx="26" ry="4" fill="#000" fillOpacity=".1"/>
      <path d="M8 96 Q10 78 40 74 Q70 78 72 96Z" fill="#581C87"/>
      <path d="M33 74 L40 81 L47 74" fill="#7E22CE"/>
      <rect x="34" y="63" width="12" height="13" rx="5" fill={SKIN_M}/>
      {/* Grand afro */}
      <ellipse cx="40" cy="34" rx="27" ry="24" fill="#1C1917"/>
      <ellipse cx="15" cy="46" rx="10" ry="14" fill="#1C1917"/>
      <ellipse cx="65" cy="46" rx="10" ry="14" fill="#1C1917"/>
      <BaseFace skin={SKIN_M}/>
      {/* Casque sur la tête */}
      <rect x="14" y="34" width="8" height="16" rx="4" fill="#7E22CE"/>
      <rect x="58" y="34" width="8" height="16" rx="4" fill="#7E22CE"/>
      <path d="M19 36 Q40 22 61 36" stroke="#6D28D9" strokeWidth="5" strokeLinecap="round" fill="none"/>
      <circle cx="18" cy="44" r="5" fill="#A855F7"/>
      <circle cx="62" cy="44" r="5" fill="#A855F7"/>
      <Eyes lx={28} rx={52} y={43} color="#A855F7"/>
      <NormalBrows color="#1C1917"/>
      <Nose skin="#A86030"/>
      <Smile skin="#A86030"/>
      {/* Notes de musique */}
      <text x="62" y="76" fontSize="10" fill="#C084FC">♪</text>
      <text x="10" y="80" fontSize="8"  fill="#C084FC" fillOpacity=".7">♫</text>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Catégorie : Histoire CM — Sage avec parchemin
   ────────────────────────────────────────────────────────────────── */
export function HistorianChar() {
  return (
    <svg viewBox="0 0 80 96" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="92" rx="26" ry="4" fill="#000" fillOpacity=".1"/>
      <path d="M8 96 Q10 78 40 74 Q70 78 72 96Z" fill="#78350F"/>
      <path d="M33 74 L40 81 L47 74" fill="#92400E"/>
      <rect x="34" y="63" width="12" height="13" rx="5" fill={SKIN_M}/>
      {/* Cheveux naturels avec mèches grises */}
      <ellipse cx="40" cy="35" rx="22" ry="26" fill="#292524"/>
      <path d="M22 30 Q28 16 40 14 Q52 16 58 30" fill="#44403C"/>
      {/* Mèches grises */}
      <path d="M26 30 Q28 18 34 16" stroke="#D6D3D1" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M54 30 Q52 18 46 16" stroke="#D6D3D1" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M19 44 Q15 56 17 68" stroke="#292524" strokeWidth="7" strokeLinecap="round"/>
      <path d="M61 44 Q65 56 63 68" stroke="#292524" strokeWidth="7" strokeLinecap="round"/>
      <BaseFace skin={SKIN_M}/>
      <Eyes lx={28} rx={52} y={43} color="#92400E"/>
      <NormalBrows color="#292524"/>
      <Nose skin="#A86030"/>
      <Smile skin="#A86030"/>
      {/* Parchemin */}
      <rect x="14" y="76" width="16" height="18" rx="2" fill="#FEF3C7"/>
      <rect x="14" y="76" width="16" height="3" rx="1.5" fill="#D97706"/>
      <rect x="14" y="91" width="16" height="3" rx="1.5" fill="#D97706"/>
      <line x1="17" y1="82" x2="27" y2="82" stroke="#A16207" strokeWidth="1.2"/>
      <line x1="17" y1="85" x2="26" y2="85" stroke="#A16207" strokeWidth="1.2"/>
      <line x1="17" y1="88" x2="24" y2="88" stroke="#A16207" strokeWidth="1.2"/>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Catégorie : Société CM — Citoyenne avec smartphone
   ────────────────────────────────────────────────────────────────── */
export function CitizenChar() {
  return (
    <svg viewBox="0 0 80 96" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="92" rx="26" ry="4" fill="#000" fillOpacity=".1"/>
      <path d="M8 96 Q10 78 40 74 Q70 78 72 96Z" fill="#0F766E"/>
      <path d="M33 74 L40 81 L47 74" fill="#0D9488"/>
      <rect x="34" y="63" width="12" height="13" rx="5" fill={SKIN_M}/>
      {/* Tresses */}
      <ellipse cx="40" cy="35" rx="22" ry="25" fill="#1C1917"/>
      {/* Tresses qui tombent */}
      <path d="M20 46 Q16 62 19 78" stroke="#292524" strokeWidth="7" strokeLinecap="round"/>
      <path d="M60 46 Q64 62 61 78" stroke="#292524" strokeWidth="7" strokeLinecap="round"/>
      {/* Rayures de tresse */}
      <path d="M18 52 L22 54" stroke="#44403C" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M17 58 L21 60" stroke="#44403C" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M17 64 L21 66" stroke="#44403C" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M62 52 L58 54" stroke="#44403C" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M63 58 L59 60" stroke="#44403C" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M63 64 L59 66" stroke="#44403C" strokeWidth="1.5" strokeLinecap="round"/>
      <BaseFace skin={SKIN_M}/>
      <Eyes lx={28} rx={52} y={43} color="#0D9488"/>
      <HappyBrows color="#1C1917"/>
      <Nose skin="#A86030"/>
      <BigSmile skin="#A86030"/>
      {/* Smartphone */}
      <rect x="54" y="76" width="12" height="19" rx="2.5" fill="#1C1917"/>
      <rect x="55" y="78" width="10" height="14" rx="1.5" fill="#0D9488"/>
      <circle cx="60" cy="94" r="1.5" fill="#374151"/>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Catégorie : Gastronomie CM — Chef cuisinier
   ────────────────────────────────────────────────────────────────── */
export function ChefChar() {
  return (
    <svg viewBox="0 0 80 96" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="92" rx="26" ry="4" fill="#000" fillOpacity=".1"/>
      {/* Tablier */}
      <path d="M8 96 Q10 78 40 74 Q70 78 72 96Z" fill="white"/>
      <path d="M33 74 L40 81 L47 74" fill="#F3F4F6"/>
      <line x1="40" y1="78" x2="40" y2="96" stroke="#E5E7EB" strokeWidth="1.5"/>
      <rect x="34" y="63" width="12" height="13" rx="5" fill={SKIN_M}/>
      {/* Cheveux courts sous le chapeau */}
      <ellipse cx="40" cy="38" rx="21" ry="22" fill="#1C1917"/>
      <path d="M19 46 Q17 56 19 66" stroke="#1C1917" strokeWidth="6" strokeLinecap="round"/>
      <path d="M61 46 Q63 56 61 66" stroke="#1C1917" strokeWidth="6" strokeLinecap="round"/>
      {/* Toque de chef */}
      <ellipse cx="40" cy="29" rx="19" ry="14" fill="white"/>
      <rect x="22" y="32" width="36" height="10" rx="2" fill="#F9FAFB"/>
      {/* Bord de toque */}
      <path d="M20 40 Q40 44 60 40" stroke="#E5E7EB" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <BaseFace skin={SKIN_M}/>
      <Eyes lx={28} rx={52} y={43} color="#92400E"/>
      <HappyBrows color="#1C1917"/>
      <Nose skin="#A86030"/>
      <BigSmile skin="#A86030"/>
      {/* Spatule */}
      <path d="M14 76 L14 93" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round"/>
      <rect x="10" y="74" width="8" height="5" rx="1.5" fill="#D1D5DB"/>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Catégories génériques — Science, Géo, Cinéma, Littérature…
   ────────────────────────────────────────────────────────────────── */
export function ScienceChar() {
  return (
    <svg viewBox="0 0 80 96" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="92" rx="26" ry="4" fill="#000" fillOpacity=".1"/>
      <path d="M8 96 Q10 78 40 74 Q70 78 72 96Z" fill="#0C4A6E"/>
      <path d="M33 74 L40 81 L47 74" fill="#0369A1"/>
      <rect x="34" y="63" width="12" height="13" rx="5" fill={SKIN_L}/>
      {/* Cheveux en bataille */}
      <ellipse cx="40" cy="35" rx="22" ry="26" fill="#92400E"/>
      <polygon points="22,32 18,10 28,24" fill="#B45309"/>
      <polygon points="40,28 44,8 50,20" fill="#B45309"/>
      <polygon points="57,34 64,14 54,26" fill="#B45309"/>
      <path d="M19 44 Q15 56 18 66" stroke="#92400E" strokeWidth="6" strokeLinecap="round"/>
      <path d="M61 44 Q65 56 62 66" stroke="#92400E" strokeWidth="6" strokeLinecap="round"/>
      <BaseFace skin={SKIN_L}/>
      <Eyes lx={28} rx={52} y={43} color="#0369A1"/>
      {/* Lunettes rondes */}
      <circle cx="28" cy="43" r="8"  fill="none" stroke="#374151" strokeWidth="2"/>
      <circle cx="52" cy="43" r="8"  fill="none" stroke="#374151" strokeWidth="2"/>
      <path d="M36 43 L44 43" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
      <path d="M20 41 L14 38" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
      <path d="M60 41 L66 38" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
      <NormalBrows color="#92400E"/>
      <Nose/>
      <BigSmile/>
      {/* Erlenmeyer */}
      <path d="M56 76 L50 90 L64 90Z" fill="#BAE6FD" stroke="#0369A1" strokeWidth="1.5"/>
      <rect x="55" y="74" width="6" height="4" rx="1.5" fill="#7DD3FC"/>
      <ellipse cx="58" cy="85" rx="3" ry="2" fill="#38BDF8" fillOpacity=".6"/>
    </svg>
  );
}

export function StarChar() {
  return (
    <svg viewBox="0 0 80 96" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="92" rx="26" ry="4" fill="#000" fillOpacity=".1"/>
      <path d="M8 96 Q10 78 40 74 Q70 78 72 96Z" fill="#701A75"/>
      <path d="M33 74 L40 81 L47 74" fill="#A21CAF"/>
      <rect x="34" y="63" width="12" height="13" rx="5" fill={SKIN_L}/>
      {/* Cheveux roses dramatiques */}
      <ellipse cx="40" cy="35" rx="22" ry="26" fill="#DB2777"/>
      <path d="M18 44 Q10 50 12 72" stroke="#EC4899" strokeWidth="14" strokeLinecap="round"/>
      <path d="M22 30 Q14 14 22 8 Q28 18 24 30" fill="#F472B6"/>
      <path d="M40 26 Q44 8 54 10 Q50 22 46 30" fill="#F472B6"/>
      <path d="M62 44 Q70 50 68 72" stroke="#DB2777" strokeWidth="10" strokeLinecap="round"/>
      <BaseFace skin={SKIN_L}/>
      <Eyes lx={28} rx={52} y={43} color="#A21CAF"/>
      {/* Étoiles dans les yeux */}
      <path d="M28 40 L29 43 L32 43 L30 45 L31 48 L28 46 L25 48 L26 45 L24 43 L27 43Z" fill="#FCD34D" fillOpacity=".5"/>
      <path d="M52 40 L53 43 L56 43 L54 45 L55 48 L52 46 L49 48 L50 45 L48 43 L51 43Z" fill="#FCD34D" fillOpacity=".5"/>
      <NormalBrows color="#9D174D"/>
      <Nose/>
      <Smile/>
      {/* Étincelles */}
      <polygon points="10,76 11,80 15,80 12,83 13,87 10,84 7,87 8,83 5,80 9,80"   fill="#FCD34D" fillOpacity=".8"/>
      <polygon points="70,72 71,75 74,75 72,77 73,80 70,78 67,80 68,77 66,75 69,75" fill="#FCD34D" fillOpacity=".8"/>
    </svg>
  );
}

export function ExplorerChar() {
  return (
    <svg viewBox="0 0 80 96" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="92" rx="26" ry="4" fill="#000" fillOpacity=".1"/>
      <path d="M8 96 Q10 78 40 74 Q70 78 72 96Z" fill="#065F46"/>
      <path d="M33 74 L40 81 L47 74" fill="#059669"/>
      <rect x="34" y="63" width="12" height="13" rx="5" fill={SKIN_M}/>
      <ellipse cx="40" cy="35" rx="22" ry="26" fill="#292524"/>
      <path d="M19 44 Q15 56 17 66" stroke="#292524" strokeWidth="7" strokeLinecap="round"/>
      <path d="M61 44 Q65 56 63 66" stroke="#292524" strokeWidth="7" strokeLinecap="round"/>
      <BaseFace skin={SKIN_M}/>
      <Eyes lx={28} rx={52} y={43} color="#059669"/>
      <NormalBrows color="#292524"/>
      <Nose skin="#A86030"/>
      <Smile skin="#A86030"/>
      {/* Globe */}
      <circle cx="60" cy="83" r="11" fill="#0D9488" stroke="#065F46" strokeWidth="1.5"/>
      <ellipse cx="60" cy="83" rx="5"  ry="11" fill="none" stroke="#065F46" strokeWidth="1.2"/>
      <ellipse cx="60" cy="83" rx="11" ry="4"  fill="none" stroke="#065F46" strokeWidth="1.2"/>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Mapping : catégorie id → composant personnage
   ────────────────────────────────────────────────────────────────── */
export const CATEGORY_CHAR = {
  "football-cm": FootballerChar,
  "sport":       FootballerChar,
  "musique-cm":  MusicianChar,
  "musique":     MusicianChar,
  "histoire-cm": HistorianChar,
  "histoire":    HistorianChar,
  "litterature": HistorianChar,
  "culture":     HistorianChar,
  "societe-cm":  CitizenChar,
  "afrique":     CitizenChar,
  "gastronomie-cm": ChefChar,
  "gastronomie": ChefChar,
  "sciences":    ScienceChar,
  "technologie": ScienceChar,
  "nature":      ScienceChar,
  "cinema":      StarChar,
  "celebrites":  StarChar,
  "anime":       StarChar,
  "geographie":  ExplorerChar,
};

/* Personnage par défaut pour les catégories non mappées */
export function DefaultChar() {
  return <MedChar />;
}

export function charForCategory(id) {
  return CATEGORY_CHAR[id] ?? DefaultChar;
}

/* ──────────────────────────────────────────────────────────────────
   AnimeCard — carte mini style gacha (difficulté / catégorie)
   Fond gradient sombre · coins losange · bordure + glow accent si sélectionnée.
   ────────────────────────────────────────────────────────────────── */
export function AnimeCard({
  Char,
  label,
  sublabel,
  selected = false,
  accentColor = "#F59E0B",
  onClick,
  className,
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "press gacha-card group relative flex flex-col items-center overflow-hidden rounded-(--radius-card) text-center transition-all",
        className
      )}
      style={{
        border: selected
          ? `1.5px solid ${accentColor}`
          : "1.5px solid rgba(255,255,255,0.07)",
        boxShadow: selected
          ? `0 0 0 1.5px ${accentColor}35, 0 0 18px ${accentColor}28, 0 4px 16px rgba(0,0,0,0.45)`
          : "0 2px 8px rgba(0,0,0,0.30)",
      }}
    >
      {/* Barre accent en haut — visible seulement si sélectionnée */}
      {selected && (
        <div
          className="absolute inset-x-0 top-0 h-[2px] z-20"
          style={{ background: accentColor }}
        />
      )}
      {/* Coins losange */}
      <span
        className="absolute top-[5px] left-[5px] text-[6px] leading-none z-20"
        style={{ color: accentColor, opacity: selected ? 0.9 : 0.22 }}
      >◆</span>
      <span
        className="absolute top-[5px] right-[5px] text-[6px] leading-none z-20"
        style={{ color: accentColor, opacity: selected ? 0.9 : 0.22 }}
      >◆</span>

      <div className="w-full relative z-10">
        <Char />
      </div>
      <div className="relative z-10 w-full px-2 pb-2.5">
        <p className="t-display text-[12px] leading-tight">{label}</p>
        {sublabel && (
          <p className="t-label mt-0.5 text-[9px] text-bone-4 leading-tight">{sublabel}</p>
        )}
      </div>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────
   AnimeModeCard — grande carte de mode style gacha / RPG.
   Fond gradient · barre colorée haute · coins ◆ · étoiles rareté
   · personnage · séparateur or · label/sous-label.
   ────────────────────────────────────────────────────────────────── */
export function AnimeModeCard({ Char, label, sublabel, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className="press gacha-card group relative flex flex-col items-center overflow-hidden rounded-(--radius-card) w-full text-center transition-all"
      style={{
        border: `1.5px solid color-mix(in srgb, ${accent} 28%, rgba(255,255,255,0.04))`,
        boxShadow: `0 4px 22px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      {/* Barre couleur en haut */}
      <div
        className="absolute inset-x-0 top-0 h-[3px] z-20"
        style={{ background: accent }}
      />

      {/* Coins losange — 4 coins, ceux du bas plus discrets */}
      <span className="absolute top-[7px] left-[7px] text-[7px] leading-none z-20" style={{ color: accent }}>◆</span>
      <span className="absolute top-[7px] right-[7px] text-[7px] leading-none z-20" style={{ color: accent }}>◆</span>
      <span className="absolute bottom-[7px] left-[7px] text-[7px] leading-none z-20" style={{ color: accent, opacity: 0.38 }}>◆</span>
      <span className="absolute bottom-[7px] right-[7px] text-[7px] leading-none z-20" style={{ color: accent, opacity: 0.38 }}>◆</span>

      {/* Étoiles de rareté */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-0.5 z-20">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="text-[7px] leading-none" style={{ color: accent, opacity: i < 3 ? 0.88 : 0.25 }}>★</span>
        ))}
      </div>

      {/* Personnage */}
      <div className="mt-5 w-full max-w-[108px] relative z-10">
        <Char />
      </div>

      {/* Séparateur gradient or */}
      <div className="relative z-10 w-full px-3">
        <div
          className="w-full h-px"
          style={{ background: `linear-gradient(to right, transparent, ${accent}55, transparent)` }}
        />
      </div>

      {/* Nom du mode + sous-titre */}
      <div className="relative z-10 w-full px-3 py-2.5">
        <p className="t-display text-[13px] tracking-wide">{label}</p>
        <p className="t-label mt-1 text-[9px] text-bone-4">{sublabel}</p>
      </div>
    </button>
  );
}
