// ── Payment Account — Provider Adapter Interface ────────────
// RCCF-IMPLEMENTATION-74. EVERY provider interaction goes through this
// interface — checkout, verification, refunds, account status. Provider-specific
// logic lives only inside adapters; commerce/order runtimes never import a
// provider directly.

import type { PaymentProviderId } from "../domain/types";

export interface PaymentCheckoutInput {
  providerAccount: {
    provider: PaymentProviderId;
    providerKeyId?: string | null;
    providerKeySecret?: string | null;
  };
  order: {
    referenceId: string;
    amount: number;
    currency: string;
    description: string;
    customerEmail?: string | null;
    customerName?: string | null;
  };
}

export interface PaymentCheckoutResult {
  success: boolean;
  /** Where the customer is redirected to pay (hosted checkout / payment link). */
  checkoutUrl?: string;
  providerReference?: string;
  error?: string;
}

export interface PaymentVerificationInput {
  provider: PaymentProviderId;
  providerKeyId?: string | null;
  providerKeySecret?: string | null;
  providerPaymentId: string;
  expectedAmount: number;
}

export interface PaymentVerificationResult {
  success: boolean;
  status?: "paid" | "pending" | "failed";
  error?: string;
}

export interface PaymentRefundInput {
  provider: PaymentProviderId;
  providerKeyId?: string | null;
  providerKeySecret?: string | null;
  providerPaymentId: string;
  amount?: number;
  currency?: string;
}

export interface PaymentAccountStatusResult {
  success: boolean;
  verified?: boolean;
  status?: string;
  error?: string;
}

/**
 * Canonical provider adapter. New providers (Stripe, PhonePe, Cashfree, PayU,
 * Manual) implement this interface — checkout/orders/commerce runtimes never
 * change.
 */
export interface PaymentProviderAdapter {
  readonly id: PaymentProviderId;
  readonly label: string;
  /** Create a checkout (hosted link on the merchant's own account). */
  createCheckout(input: PaymentCheckoutInput): Promise<PaymentCheckoutResult>;
  /** Verify a payment was captured for the expected amount. */
  verifyPayment(input: PaymentVerificationInput): Promise<PaymentVerificationResult>;
  /** Refund a payment. May be unimplemented for a provider. */
  refundPayment?(input: PaymentRefundInput): Promise<{ success: boolean; error?: string }>;
  /** Probe the merchant account status (keys valid? verified?). */
  getAccountStatus(input: { providerKeyId?: string | null; providerKeySecret?: string | null }): Promise<PaymentAccountStatusResult>;
}
