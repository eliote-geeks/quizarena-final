import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";

/**
 * Pages de retour SharePay (URL de succès/annulation configurées côté
 * dashboard, §Applications → Configuration). Notre intégration actuelle
 * utilise le "Pay-In - Charge directe" (push USSD, sans page hébergée) —
 * ces routes ne sont donc pas sollicitées par le flux normal, mais
 * doivent exister pour ne jamais renvoyer une 404 si SharePay redirige
 * ici un jour (Checkout hébergé, changement de méthode…). Le vrai
 * crédit/débit reste toujours décidé par le webhook + la réconciliation
 * périodique (§wallet/reconcile.ts), jamais par cet écran.
 */
function PaymentCallback({ success }) {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate("/wallet", { replace: true }), 3000);
    return () => clearTimeout(t);
  }, [navigate]);

  const Icon = success ? CheckCircle : XCircle;
  const color = success ? "#5DD66E" : "#FF6B6B";

  return (
    <div className="min-h-screen grid place-items-center px-5" style={{ background: "#05050A" }}>
      <div className="max-w-sm w-full rounded-2xl border p-7 text-center" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
        <Icon className="mx-auto h-10 w-10" style={{ color }} />
        <h1 className="mt-4 text-lg font-bold text-white">
          {success ? "Paiement en cours de confirmation" : "Paiement annulé"}
        </h1>
        <p className="mt-2 text-sm text-white/50 leading-relaxed">
          {success
            ? "Ton solde est mis à jour automatiquement dès que l'opérateur confirme la transaction."
            : "Aucun montant n'a été débité. Tu peux réessayer à tout moment depuis ton portefeuille."}
        </p>
        <Link to="/wallet" className="mt-6 inline-block rounded-xl px-5 py-2.5 text-sm font-bold" style={{ background: "#E5A800", color: "#09080a" }}>
          Retour au portefeuille
        </Link>
      </div>
    </div>
  );
}

export const PaymentSuccess = () => <PaymentCallback success />;
export const PaymentCancel = () => <PaymentCallback success={false} />;
