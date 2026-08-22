import { Link } from "react-router-dom";
import { Label } from "../../ui";

/** Chrome des pages légales : long texte, filets pleins entre sections,
 * jamais de sidebar de sommaire flottante — juste le texte et le vide. */
export default function LegalLayout({ title, updated, sections }) {
  return (
    <div className="grain min-h-dvh">
      <div className="mx-auto w-full max-w-[720px] px-5 pt-10 pb-24 sm:px-8">
        <Link to="/" className="t-label text-bone-4 hover:text-flare">
          ← quizarena
        </Link>

        <h1 className="t-display mt-6 text-[clamp(2.4rem,8vw,4rem)]">{title}</h1>
        {updated && <Label className="mt-4">mise à jour · {updated}</Label>}

        <div className="mt-10 flex flex-col">
          {sections.map((s, i) => (
            <section key={i} className={i === 0 ? "pb-8" : "rule py-8"}>
              <h2 className="t-title mb-3 text-xl">{s.title}</h2>
              <div className="t-body flex flex-col gap-3 text-[15px] text-bone-3">{s.body}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
