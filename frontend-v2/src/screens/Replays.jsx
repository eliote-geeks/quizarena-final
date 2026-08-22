import { useEffect, useState } from "react";
import clsx from "clsx";
import { Label, Loader, Money, Row } from "../ui";
import * as api from "../lib/api";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function Replays() {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    api.getQuizHistory().then((r) => setHistory(r.history));
  }, []);

  if (!history) return <Loader full />;

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 pt-8 pb-16 sm:px-8 sm:pt-12">
      <Label tone="flare">historique</Label>
      <h1 className="t-display mt-3 text-[clamp(3rem,10vw,5.5rem)]">Replays</h1>

      <div className="rule mt-8 -mx-4">
        {history.length === 0 && (
          <p className="t-body px-4 py-6 text-sm text-bone-4">Aucune partie jouée pour l'instant.</p>
        )}
        {history.map((r) => {
          const net = r.mode === "CHALLENGE" ? r.payoutCoins - r.stakeCoins : r.payoutCoins;
          const label = r.mode === "CHALLENGE" ? (net > 0 ? "Gagné" : "Perdu") : "Libre";
          const tone = r.mode === "CHALLENGE" ? (net > 0 ? "text-live" : "text-bone-3") : "text-bone-2";
          return (
            <Row key={r.id}>
              <span className={clsx("t-display w-16 shrink-0 text-lg", tone)}>{label}</span>
              <span className="t-title min-w-0 max-w-[36%] truncate text-[15px]">{r.categoryName}</span>
              <span className="t-display ml-auto shrink-0 text-lg sm:ml-0">
                {r.scoreServer}/{r.totalQuestions}
              </span>
              <span className="t-label hidden w-24 shrink-0 text-right text-bone-4 sm:inline">
                {formatDate(r.startedAt)}
              </span>
              <span className="flex w-20 shrink-0 items-baseline justify-end gap-1">
                {net < 0 && <span className="t-display text-bone-4">−</span>}
                <Money value={Math.abs(net)} size="sm" tone={net > 0 ? "live" : "dim"} />
              </span>
            </Row>
          );
        })}
      </div>
    </div>
  );
}
