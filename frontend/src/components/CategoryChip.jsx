import { getCategory } from "../data/mockData";
import { useApp } from "../context/AppContext";

const AMBER = "#E5A800";

export default function CategoryChip({ id, size = "sm" }) {
  const cat = getCategory(id);
  const { lang } = useApp();
  if (!cat) return null;
  const Icon = cat.icon;
  const padding = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${padding} rounded-md border border-white/10 uppercase tracking-wider font-medium text-white/80 bg-white/[0.03]`}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: AMBER }} />
      {cat.name[lang]}
    </span>
  );
}
