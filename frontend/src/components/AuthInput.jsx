/** Champ de formulaire partagé par les pages d'auth (Login/Register/
 * Forgot/Reset) — style Google (retour Paul du 31/08, référence directe) :
 * contour fin, label flottant qui "coupe" la bordure une fois le champ
 * rempli ou actif, pas d'icône dans le champ. Le flottement est en CSS pur
 * (`:placeholder-shown` + `~`), pas de state JS pour ça.
 * `error` : message affiché sous le champ (Register) ; `hasError` : juste
 * la bordure rouge sans message propre, l'erreur vit ailleurs (Login). */
export default function AuthInput({ icon, label, error, hasError, trailing, className = "", ...props }) {
  const invalid = Boolean(error || hasError);
  return (
    <div className={className}>
      <div className="qa-gfield">
        <input
          {...props}
          placeholder=" "
          onChange={(e) => props.onChange?.(e.target.value)}
          className="qa-ginput"
          style={{ borderColor: invalid ? "#FF6B6B" : undefined, paddingRight: trailing ? "2.75rem" : undefined }}
        />
        {label && <label className="qa-glabel" style={{ color: invalid ? "#FF6B6B" : undefined }}>{label}</label>}
        {trailing && <div className="qa-field-trailing">{trailing}</div>}
      </div>
      {error && <p className="text-xs font-semibold mt-1.5" style={{ color: "#FF6B6B" }}>{error}</p>}
    </div>
  );
}
