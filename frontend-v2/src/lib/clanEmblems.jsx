import { avatarUrl } from "./api";

export const CLAN_EMBLEMS = [
  { key: "shogun", label: "Shogun", seed: "clan-shogun-ember" },
  { key: "kitsune", label: "Kitsune", seed: "clan-kitsune-moon" },
  { key: "ronin", label: "Ronin", seed: "clan-ronin-steel" },
  { key: "sakura", label: "Sakura", seed: "clan-sakura-guard" },
  { key: "titan", label: "Titan", seed: "clan-titan-gold" },
  { key: "neon", label: "Neon", seed: "clan-neon-strike" },
  { key: "dragon", label: "Dragon", seed: "clan-dragon-red" },
  { key: "celestial", label: "Céleste", seed: "clan-celestial-blue" },
];

export function clanEmblemUrl(key) {
  const emblem = CLAN_EMBLEMS.find((item) => item.key === key) ?? CLAN_EMBLEMS[0];
  return avatarUrl(emblem.seed);
}

export function ClanEmblem({ emblemKey, tag, color = "#f59e0b", size = "md", className = "" }) {
  const dimensions = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-10 w-10" : "h-12 w-12";
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-xl ${dimensions} ${className}`} style={{ border: `2px solid ${color}70`, background: `${color}18` }}>
      <img src={clanEmblemUrl(emblemKey)} alt={`Emblème ${tag || "du clan"}`} className="h-full w-full object-cover" />
      {tag && <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-0.5 text-center text-[8px] font-black tracking-widest" style={{ color }}>{tag}</span>}
    </div>
  );
}
