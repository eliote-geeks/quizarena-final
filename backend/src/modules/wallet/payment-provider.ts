import { env } from "../../lib/env.js";

/**
 * Interface commune Orange Money / MTN MoMo. Aucune des deux clés API
 * n'est renseignée pour l'instant (voir .env.example) — tant que les
 * accès marchands ne sont pas obtenus, `SimulatedProvider` répond à la
 * place avec un léger délai, pour que le reste du système (dépôt →
 * webhook → crédit) soit testable et ne bloque pas le développement.
 *
 * Le jour où les accès arrivent : écrire OrangeMoneyProvider /
 * MtnMomoProvider qui implémentent la même interface et les brancher
 * dans `getPaymentProvider()`. Rien d'autre ne change.
 */
export interface PaymentProvider {
  name: "orange_money" | "mtn_momo" | "simulated";
  requestDeposit(input: { userId: string; phone: string; amountCoins: number }): Promise<{ providerRef: string; status: "pending" | "completed" }>;
  requestWithdrawal(input: { userId: string; phone: string; amountCoins: number }): Promise<{ providerRef: string; status: "pending" | "completed" }>;
}

class SimulatedProvider implements PaymentProvider {
  name = "simulated" as const;

  async requestDeposit({ amountCoins }: { userId: string; phone: string; amountCoins: number }) {
    // En simulation, on considère le dépôt confirmé immédiatement.
    return { providerRef: `SIM-DEP-${Date.now()}-${Math.round(Math.random() * 1e6)}`, status: "completed" as const };
  }

  async requestWithdrawal({ amountCoins }: { userId: string; phone: string; amountCoins: number }) {
    return { providerRef: `SIM-WDR-${Date.now()}-${Math.round(Math.random() * 1e6)}`, status: "completed" as const };
  }
}

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (provider) return provider;
  const hasOrange = Boolean(env.ORANGE_MONEY_API_KEY);
  const hasMtn = Boolean(env.MTN_MOMO_API_KEY);
  if (!hasOrange && !hasMtn) {
    provider = new SimulatedProvider();
  } else {
    // TODO : brancher les vrais clients Orange Money / MTN MoMo dès que
    // les identifiants marchands sont disponibles. Volontairement pas
    // écrit à l'aveugle — chaque API a ses propres contraintes de
    // callback/signature qu'il faut vérifier contre leur documentation
    // au moment de l'implémentation.
    throw new Error(
      "Clés Mobile Money détectées dans .env mais aucun provider réel implémenté — voir src/modules/wallet/payment-provider.ts"
    );
  }
  return provider;
}
