import { getCategory } from "../data/mockData";
import { useApp } from "../context/AppContext";

export default function CategoryChip({ id, size = "sm" }) {
  const cat = getCategory(id);
  const { lang } = useApp();
  if (!cat) return null;
  const Icon = cat.icon;
  const padding = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${padding} rounded-md border uppercase tracking-wider font-medium`}
      style={{ borderColor: `${cat.accent}66`, color: cat.accent, background: `${cat.accent}10` }}
    >
      <Icon className="w-3.5 h-3.5" />
      {cat.name[lang]}
    </span>
  );
}
