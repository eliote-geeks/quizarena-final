import { Link } from "react-router-dom";
import { Label } from "../../ui";

/**
 * Chrome des écrans auth : plein écran, centré, aucune carte.
 * Le formulaire flotte dans le vide comme le reste du système (§3).
 */
export default function AuthLayout({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="grain flex min-h-dvh flex-col items-center justify-center px-5 py-14">
      <div className="w-full max-w-[380px]">
        <Link to="/" className="t-display mb-12 block text-center text-lg text-flare">
          QUIZARENA
        </Link>

        {eyebrow && (
          <Label tone="flare" className="mb-3 text-center">
            {eyebrow}
          </Label>
        )}
        <h1 className="anim-rise t-display mb-9 text-center text-[2.4rem] leading-[0.9]">
          {title}
        </h1>
        {subtitle && (
          <p className="t-body -mt-6 mb-9 text-center text-sm text-bone-3">{subtitle}</p>
        )}

        <div className="anim-rise-2">{children}</div>

        {footer && <div className="mt-9 text-center">{footer}</div>}
      </div>
    </div>
  );
}
