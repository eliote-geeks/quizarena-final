import { Bot } from "lucide-react";
import AnimeAvatar from "../../components/AnimeAvatar";
import { AMBIENT_FAINT, AMBIENT_TEXT } from "./ambientColors";

export default function Player({ name, score, status, right }) {
  const bot = /^Ordinateur/.test(name || "");
  return (
    <div className={right ? "text-right" : "text-left"}>
      <div className={`flex items-center gap-2 ${right ? "justify-end" : ""}`}>
        {bot ? (
          <span className="grid h-9 w-9 place-items-center rounded-xl border" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>
            <Bot className="h-5 w-5" />
          </span>
        ) : (
          <AnimeAvatar seed={name || "joueur"} alt="" size={36} />
        )}
        <strong className="block max-w-24 truncate text-sm sm:text-base" style={{ color: AMBIENT_TEXT }}>{name}</strong>
      </div>
      <span className="font-display text-4xl font-bold" style={{ color: AMBIENT_TEXT }}>{score}</span>
      <p className="hidden text-[10px] sm:block" style={{ color: AMBIENT_FAINT }}>{status}</p>
    </div>
  );
}
