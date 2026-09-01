import { Swords } from "lucide-react";
import { AMBIENT_SUB, AMBIENT_TEXT } from "./ambientColors";

export default function Center({ title, subtitle, children }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <Swords className="h-10 w-10" style={{ color: "var(--accent)" }} />
      <h1 className="mt-5 font-display text-3xl font-extrabold sm:text-5xl" style={{ color: AMBIENT_TEXT }}>{title}</h1>
      <p className="mt-3 text-sm" style={{ color: AMBIENT_SUB }}>{subtitle}</p>
      {children}
    </div>
  );
}
