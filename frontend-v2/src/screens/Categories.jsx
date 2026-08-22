import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Input, Label, Loader } from "../ui";
import { CATEGORY_PHOTO } from "../ui/icons";
import { charForCategory } from "../ui/anime";
import * as api from "../lib/api";

/** id des catégories dont le sujet EST le Cameroun — sert seulement au
 * petit badge 🇨🇲 sur la carte, plus à un regroupement à part (retour
 * direct de Paul le 19/08 : la page ne doit pas donner l'impression
 * d'être bloquée sur le Cameroun — les 14 autres catégories couvrent le
 * monde entier et doivent se voir tout autant). */
const CAMEROON_IDS = ["football-cm", "musique-cm", "histoire-cm", "societe-cm", "gastronomie-cm"];

/** Répartit les catégories Cameroun dans la liste au lieu de les
 * regrouper en tête — une tous les 3 thèmes globaux plutôt qu'un bloc
 * à part. */
function diversify(categories) {
  const cm = categories.filter((c) => CAMEROON_IDS.includes(c.id));
  const world = categories.filter((c) => !CAMEROON_IDS.includes(c.id));
  const merged = [];
  let cmIdx = 0;
  world.forEach((c, i) => {
    merged.push(c);
    if ((i + 1) % 3 === 0 && cmIdx < cm.length) merged.push(cm[cmIdx++]);
  });
  merged.push(...cm.slice(cmIdx));
  return merged;
}

export default function Categories() {
  const [categories, setCategories] = useState(null); // null = chargement
  const [q, setQ] = useState("");

  useEffect(() => {
    api.getCategories().then((r) => setCategories(r.categories));
  }, []);

  const ordered = useMemo(() => diversify(categories ?? []), [categories]);

  const needle = q.trim().toLowerCase();
  const filtered = needle ? ordered.filter((c) => c.name.toLowerCase().includes(needle)) : ordered;

  if (!categories) return <Loader full />;

  return (
    <div className="mx-auto w-full max-w-[1344px] px-5 pt-8 pb-16 sm:px-8 sm:pt-12">
      <Label tone="flare">{categories.length} thèmes · dans le monde entier</Label>
      <h1 className="t-display mt-3 text-2xl sm:text-3xl">Catégories</h1>

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Chercher une catégorie…"
        className="mt-7 max-w-sm"
      />

      {needle && filtered.length === 0 && <p className="t-body mt-8 text-sm text-bone-4">Aucune catégorie ne correspond.</p>}

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {filtered.map((c, i) => (
          <CategoryCard key={c.id} c={c} index={i} photo={CATEGORY_PHOTO[c.id]} featured={CAMEROON_IDS.includes(c.id)} />
        ))}
      </div>
    </div>
  );
}

export function CategoryCard({ c, photo, featured }) {
  const Char = charForCategory(c.id);
  return (
    <Link
      to="/duel"
      state={{ duelMode: "bot", categoryId: c.id }}
      className="press gacha-card group relative flex flex-col overflow-hidden rounded-(--radius-card) transition-all"
      style={{
        border: "1.5px solid rgba(255,255,255,0.07)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.32)",
      }}
    >
      {/* Photo de fond + personnage anime */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/3" }}>
        {photo && (
          <img
            src={photo}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-35 transition-opacity duration-300 group-hover:opacity-50"
          />
        )}
        {/* Coins losange */}
        <span className="absolute top-[5px] left-[5px] text-[6px] leading-none z-10 text-flare opacity-35">◆</span>
        <span className="absolute top-[5px] right-[5px] text-[6px] leading-none z-10 text-flare opacity-35">◆</span>
        {featured && (
          <span className="t-label absolute top-2 left-2 z-10 rounded-(--radius-tag) bg-ink/75 px-2 py-1 text-bone">
            🇨🇲
          </span>
        )}
        {/* Personnage centré */}
        <div className="relative z-10 flex h-full items-end justify-center">
          <div className="w-[72%] max-w-[110px]">
            <Char />
          </div>
        </div>
      </div>

      {/* Séparateur gradient or */}
      <div
        className="w-full h-px"
        style={{ background: "linear-gradient(to right, transparent, rgba(242,169,59,0.28), transparent)" }}
      />

      <div className="relative z-10 flex flex-1 flex-col gap-1 px-3 py-2.5">
        <h2 className="t-display text-[13px] leading-tight">{c.name}</h2>
      </div>
    </Link>
  );
}
