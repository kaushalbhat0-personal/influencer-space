// ── Payment Account — Razorpay Adapter ──────────────────────
// RCCF-IMPLEMENTATION-74. Creates Payment Links on the CREATOR'S OWN Razorpay
// account (their key pair). CreatorStore is not in the money flow — the
// customer pays the creator's Razorpay and funds settle to the creator's bank.

import Razorpay from "razorpay";
import type { PaymentProviderAdapter, PaymentCheckoutInput, PaymentCheckoutResult, PaymentVerificationInput, PaymentVerificationResult, PaymentRefundInput, PaymentAccountStatusResult } from "./types";

function creatorRazorpay(keyId?: string | null, keySecret?: string | null): { client: Razorpay | null; missing: boolean } {
  if (!keyId || !keySecret) return { client: null, missing: true };
  return { client: new Razorpay({ key_id: keyId, key_secret: keySecret }), missing: false };
}

export class RazorpayPaymentAdapter implements PaymentProviderAdapter {
  readonly id = "razorpay" as const;
  readonly label = "Razorpay";

  async createCheckout(input: PaymentCheckoutInput): Promise<PaymentCheckoutResult> {
    const { client, missing } = creatorRazorpay(input.providerAccount.providerKeyId, input.providerAccount.providerKeySecret);
    if (missing) return { success: false, error: "Creator Razorpay keys not configured" };

    try {
      // The SDK's TS types don't expose paymentLink — access via a typed cast.
      const link = await (client as unknown as { paymentLink: { create(args: Record<string, unknown>): Promise<{ id: string; short_url: string }> } }).paymentLink.create({
        amount: Math.round(input.order.amount * 100),
        currency: input.order.currency,
        description: input.order.description.slice(0, 120),
        reference_id: input.order.referenceId,
        customer: input.order.customerEmail
          ? { email: input.order.customerEmail, ...(input.order.customerName ? { name: input.order.customerName } : {}) }
          : undefined,
        notes: { referenceId: input.order.referenceId, creatorStore: "true" },
      });
      return { success: true, checkoutUrl: link.short_url, providerReference: link.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Razorpay payment link failed" };
    }
  }

  async verifyPayment(input: PaymentVerificationInput): Promise<PaymentVerificationResult> {
    const { client, missing } = creatorRazorpay(input.providerKeyId, input.providerKeySecret);
    if (missing) return { success: false, error: "Creator Razorpay keys not configured" };

    try {
      const payment = await (client as unknown as { payments: { fetch(id: string): Promise<{ id: string; amount: number; status: string }> } }).payments.fetch(input.providerPaymentId);
      const amountMatch = Math.round(payment.amount) === Math.round(input.expectedAmount * 100);
      const paid = payment.status === "captured" && amountMatch;
      return { success: paid, status: payment.status === "captured" ? "paid" : payment.status === "failed" ? "failed" : "pending", error: paid ? undefined : "Payment not captured for the expected amount" };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Verification failed" };
    }
  }

  async refundPayment(input: PaymentRefundInput): Promise<{ success: boolean; error?: string }> {
    const { client, missing } = creatorRazorpay(input.providerKeyId, input.providerKeySecret);
    if (missing) return { success: false, error: "Creator Razorpay keys not configured" };
    try {
      await (client as unknown as { payments: { refund(id: string, opts?: { amount?: number }): Promise<unknown> } }).payments.refund(input.providerPaymentId, input.amount ? { amount: Math.round(input.amount * 100) } : undefined);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Refund failed" };
    }
  }

  async getAccountStatus(input: { providerKeyId?: string | null; providerKeySecret?: string | null }): Promise<PaymentAccountStatusResult> {
    // RCCF-69.2 — truthful configuration validation. This checks that the stored
    // credentials are PRESENT and well-FORMATTED. It is NOT a provider-side
    // verification: no Razorpay API call is made, so the account must never be
    // reported as "verified" here. DIRECT_CREATOR (the only consumer of this
    // state) is gated off until real provider verification exists.
    const kid = input.providerKeyId ?? "";
    const ks = input.providerKeySecret ?? "";
    if (!kid || !ks) return { success: false, error: "Keys missing" };
    if (!kid.startsWith("rzp_")) return { success: false, error: "Invalid key id format" };
    return { success: true, verified: false, status: "configured" };
  }
}
