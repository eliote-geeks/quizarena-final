import { Label } from "../ui";

const BENEFITS = [
  "Commission de plateforme réduite sur chaque duel",
  "Retraits Mobile Money traités en priorité",
  "Accès aux tournois VIP à cagnotte garantie",
  "Un badge « VIP » visible sur le classement et le profil public",
];

/**
 * Pas de suivi de parrainage ni de statut VIP côté serveur (aucun
 * modèle, aucun code de parrainage réel). Avant, cet écran affichait une
 * progression et un code de parrainage codés en dur, identiques pour
 * tout le monde — trompeur. En attendant le vrai système, on annonce le
 * programme sans prétendre suivre une progression qui n'existe pas.
 */
export default function Vip() {
  return (
    <div className="mx-auto w-full max-w-[900px] px-5 pt-8 pb-16 sm:px-8 sm:pt-12">
      <Label tone="flare">statut du compte</Label>
      <h1 className="t-display mt-3 text-[clamp(3rem,10vw,5.5rem)]">Programme VIP à venir</h1>
      <p className="t-body mt-4 max-w-md text-sm text-bone-3">
        Un statut VIP basé sur vos victoires et vos parrainages arrive dans
        une prochaine mise à jour, avec ces avantages :
      </p>

      <section className="rule-bone mt-9 pt-6">
        <ul className="flex flex-col gap-4">
          {BENEFITS.map((b) => (
            <li key={b} className="t-body flex gap-3 text-[15px] text-bone-2">
              <span className="t-display shrink-0 text-flare">—</span>
              {b}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
