import { env } from "../../lib/env.js";

export type MobileMoneyMethod = "MTN_MOMO_CM" | "ORANGE_MONEY_CM";

/** SharePay attend le préfixe pays (§SharePay.pdf, exemples "237690000000") ;
 * le champ téléphone du compte peut avoir été saisi en format local
 * ("690000000"). Normalise plutôt que de faire confiance au format saisi. */
function normalizeCmPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("237")) return digits;
  if (digits.length === 9) return `237${digits}`;
  return digits;
}

/**
 * Interface commune. `SharePayProvider` est le vrai fournisseur (agrégateur
 * Orange Money / MTN MoMo, https://sharepay-api.te-sea.com — même
 * intégration que le projet boulo). `SimulatedProvider` répond
 * immédiatement, pour développer/tester le reste du système (dépôt →
 * webhook → crédit) sans clé API ni argent réel.
 */
export type ProviderStatus = "pending" | "completed" | "failed";

export interface PaymentProvider {
  name: "sharepay" | "simulated";
  requestDeposit(input: {
    merchantReference: string;
    method: MobileMoneyMethod;
    phone: string;
    amountCoins: number;
    payerName?: string;
  }): Promise<{ providerRef: string; status: ProviderStatus }>;
  requestWithdrawal(input: {
    merchantReference: string;
    method: MobileMoneyMethod;
    phone: string;
    beneficiaryName: string;
    amountCoins: number;
  }): Promise<{ providerRef: string; status: ProviderStatus }>;
  /**
   * Filet de sécurité : les webhooks HTTP sont "au moins zéro, au plus
   * une fois" dans la pratique — un dépôt réel du 13 août 2026 a réussi
   * côté SharePay sans jamais notifier notre webhook. Ne jamais dépendre
   * du webhook comme SEULE source de vérité ; toujours pouvoir
   * interroger l'état directement (§ wallet/routes.ts resync).
   */
  checkStatus(input: { providerRef: string; kind: "deposit" | "withdrawal" }): Promise<ProviderStatus>;
}

class SimulatedProvider implements PaymentProvider {
  name = "simulated" as const;

  async requestDeposit({ merchantReference }: { merchantReference: string }) {
    return { providerRef: `SIM-DEP-${merchantReference}`, status: "completed" as const };
  }

  async requestWithdrawal({ merchantReference }: { merchantReference: string }) {
    return { providerRef: `SIM-WDR-${merchantReference}`, status: "completed" as const };
  }

  async checkStatus() {
    return "completed" as const;
  }
}

/**
 * SharePay — charge directe (push USSD), sans page hébergée : le joueur
 * reste dans l'appli et confirme sur son téléphone. Voir SharePay.pdf
 * §"Pay-In - Charge directe" / §"Pay-Out - Virement".
 * Le statut définitif arrive par webhook (routes.ts ci-après), la valeur
 * retournée ici est toujours "pending" — SharePay répond PROCESSING.
 */
class SharePayProvider implements PaymentProvider {
  name = "sharepay" as const;
  private baseUrl = env.SHAREPAY_BASE_URL;
  private apiKey = env.SHAREPAY_API_KEY!;

  private async request(method: string, path: string, body?: unknown) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "X-API-KEY": this.apiKey },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as {
      success: boolean;
      code: string;
      message: string;
      data: Record<string, unknown> | null;
    };
    if (!res.ok || !json.success) {
      throw new Error(`SharePay ${path} → ${json.code ?? res.status} : ${json.message ?? "erreur inconnue"}`);
    }
    return json.data as Record<string, unknown>;
  }

  async requestDeposit(input: {
    merchantReference: string;
    method: MobileMoneyMethod;
    phone: string;
    amountCoins: number;
    payerName?: string;
  }) {
    const data = await this.request("POST", "/api/v1/pay-in/charge", {
      amount: input.amountCoins,
      currency: "XAF",
      paymentMethod: input.method,
      payerAccount: normalizeCmPhone(input.phone),
      payerName: input.payerName,
      merchantReference: input.merchantReference,
      description: "Dépôt QuizArena",
      idempotencyKey: input.merchantReference,
    });
    return { providerRef: data.reference as string, status: "pending" as const };
  }

  async requestWithdrawal(input: {
    merchantReference: string;
    method: MobileMoneyMethod;
    phone: string;
    beneficiaryName: string;
    amountCoins: number;
  }) {
    const data = await this.request("POST", "/api/v1/pay-out/transfer", {
      amount: input.amountCoins,
      currency: "XAF",
      paymentMethod: input.method,
      beneficiaryAccount: normalizeCmPhone(input.phone),
      beneficiaryName: input.beneficiaryName,
      merchantReference: input.merchantReference,
      description: "Retrait QuizArena",
    });
    return { providerRef: data.reference as string, status: "pending" as const };
  }

  async checkStatus(input: { providerRef: string; kind: "deposit" | "withdrawal" }): Promise<ProviderStatus> {
    const path = input.kind === "deposit" ? "pay-in" : "pay-out";
    const data = await this.request("GET", `/api/v1/${path}/check_status/${input.providerRef}`);
    const status = data.status as string;
    if (status === "SUCCESS") return "completed";
    if (status === "FAILED" || status === "CANCELLED") return "failed";
    return "pending"; // PENDING, PROCESSING, REFUNDED (traité comme en cours ici)
  }
}

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (provider) return provider;
  provider = env.SHAREPAY_API_KEY ? new SharePayProvider() : new SimulatedProvider();
  return provider;
}
