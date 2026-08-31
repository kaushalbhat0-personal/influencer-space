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
    providerAccountId?: string | null;
  };
  order: {
    referenceId: string;
    amount: number;
    currency: string;
    description: string;
    customerEmail?: string | null;
    customerName?: string | null;
    /**
     * RCCF-72.18D.6.1 — extra server-generated key/value pairs attached to the
     * provider checkout entity (Payment Link notes for Razorpay). Razorpay
     * propagates link notes onto every payment made through the link, which is
     * what lets the signed webhook reconcile a Payment Link payment back to its
     * exact ProductOrder WITHOUT trusting client/tenant data from the wire.
     */
    metadata?: Record<string, string>;
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
  amount: number;  // in rupees — converted to paise internally
  currency?: string;
}

export interface PaymentRefundResult {
  success: boolean;
  providerRefundId?: string;
  status?: string;
  error?: string;
}

export interface PaymentAccountStatusResult {
  success: boolean;
  verified?: boolean;
  status?: string;
  error?: string;
  /**
   * RCCF-72.18D.6.2 — provider-answer classification.
   *
   *  - "verified"          — provider authenticated the credential pair.
   *  - "credential_failed" — PERMANENT: provider rejected the credentials
   *                          (401/403) or the stored pair is unusable.
   *  - "transient"         — provider outage / rate limit / network failure:
   *                          nothing can be concluded about the credentials;
   *                          callers must NOT mutate persisted state.
   *  - "unknown"           — unexpected/malformed provider answer.
   *
   * Optional so adapters that cannot verify (manual etc.) stay compatible.
   */
  classification?: "verified" | "credential_failed" | "transient" | "unknown";
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
  refundPayment?(input: PaymentRefundInput): Promise<PaymentRefundResult>;
  /** Probe the merchant account status (keys valid? verified?). */
  getAccountStatus(input: { providerKeyId?: string | null; providerKeySecret?: string | null; providerAccountId?: string | null }): Promise<PaymentAccountStatusResult>;
}
