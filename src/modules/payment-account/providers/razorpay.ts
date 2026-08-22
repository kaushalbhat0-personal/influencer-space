// ── Payment Account — Razorpay Adapter ──────────────────────
// RCCF-IMPLEMENTATION-74. Creates Payment Links on the CREATOR'S OWN Razorpay
// account (their key pair). CreatorStore is not in the money flow — the
// customer pays the creator's Razorpay and funds settle to the creator's bank.

import Razorpay from "razorpay";
import type { PaymentProviderAdapter, PaymentCheckoutInput, PaymentCheckoutResult, PaymentVerificationInput, PaymentVerificationResult, PaymentRefundInput, PaymentRefundResult, PaymentAccountStatusResult } from "./types";

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
        // RCCF-72.18D.6.1 + RCCF-72.18D.7.3 — merge the server-generated
        // reconciliationRef into the link notes. Razorpay propagates Payment
        // Link notes onto payments, giving the signed webhook a server-
        // persisted, order-unique identity. Since D.7.3 the reference_id IS the
        // per-checkout reconciliationRef (Razorpay enforces global uniqueness on
        // reference_id, so reusing the productId broke repeat purchases); the
        // notes echo it so webhook reconciliation never depends on provider-only
        // fields.
        notes: {
          referenceId: input.order.referenceId,
          creatorStore: "true",
          ...(input.order.metadata ?? {}),
        },
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

  async refundPayment(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    const { client, missing } = creatorRazorpay(input.providerKeyId, input.providerKeySecret);
    if (missing) return { success: false, error: "Creator Razorpay keys not configured" };
    try {
      const refund = await (client as unknown as {
        payments: {
          refund(id: string, opts?: { amount?: number }): Promise<{ id: string; status: string; amount?: number }>;
        };
      }).payments.refund(
        input.providerPaymentId,
        input.amount ? { amount: Math.round(input.amount * 100) } : undefined,
      );
      return {
        success: true,
        providerRefundId: refund.id,
        status: refund.status,
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Refund failed" };
    }
  }

  async getAccountStatus(input: { providerKeyId?: string | null; providerKeySecret?: string | null }): Promise<PaymentAccountStatusResult> {
    // ── RCCF-72.18D.6.2 — REAL provider credential verification ─────────────
    // Razorpay authenticates EVERY API call with Basic Auth (key_id:key_secret)
    // and provides no dedicated "auth check" endpoint. The canonical safe probe
    // is a minimal authenticated READ — `GET /v1/orders?count=1`:
    //   read-only + non-financial (creates nothing) + idempotent + low-risk.
    // A 200 collection response proves the pair authenticates; 401/403 proves
    // it does not. Transient infrastructure failures classify separately so
    // callers never mistake an outage for bad credentials.
    const keyId = input.providerKeyId ?? "";
    const keySecret = input.providerKeySecret ?? "";
    if (!keyId || !keySecret) {
      return { success: false, verified: false, status: "failed", classification: "credential_failed", error: "Keys missing" };
    }
    if (!keyId.startsWith("rzp_")) {
      return { success: false, verified: false, status: "failed", classification: "credential_failed", error: "Invalid key id format" };
    }

    const { client } = creatorRazorpay(keyId, keySecret);
    if (!client) {
      return { success: false, verified: false, status: "failed", classification: "credential_failed", error: "Keys missing" };
    }

    try {
      // The SDK's TS types are loose for list params/results — typed cast,
      // consistent with the other operations in this adapter.
      const result = await (
        client as unknown as {
          orders: { all(args: Record<string, unknown>): Promise<{ entity?: string; count?: number; items?: unknown[] }> };
        }
      ).orders.all({ count: 1 });

      if (result && typeof result === "object" && result.entity === "collection") {
        return { success: true, verified: true, status: "verified", classification: "verified" };
      }
      return {
        success: false,
        verified: false,
        status: "unknown",
        classification: "unknown",
        error: "Unexpected provider verification response",
      };
    } catch (err) {
      // The razorpay-node client surfaces HTTP failures with `.statusCode`
      // (request-lib style errors). Classify defensively — never treat an
      // outage as a credential failure and vice versa.
      const statusCode =
        err && typeof err === "object" && typeof (err as { statusCode?: unknown }).statusCode === "number"
          ? ((err as { statusCode: number }).statusCode)
          : null;

      if (statusCode === 401 || statusCode === 403) {
        return {
          success: false,
          verified: false,
          status: "failed",
          classification: "credential_failed",
          error: statusCode === 403 ? "Credentials rejected by provider (insufficient permission)" : "Provider rejected these credentials",
        };
      }
      if (statusCode !== null && (statusCode === 429 || statusCode >= 500)) {
        return {
          success: false,
          verified: false,
          status: "unknown",
          classification: "transient",
          error: "Payment provider is temporarily unavailable. Try again shortly.",
        };
      }
      // No HTTP status at all → network/DNS/timeout class failure.
      const message = err instanceof Error ? err.message : "";
      const transientSignal = /timeout|timed out|econn|enotfound|ehostunreach|enetunreach|eai_again|socket/i.test(message);
      return {
        success: false,
        verified: false,
        status: "unknown",
        classification: transientSignal ? "transient" : "unknown",
        error: transientSignal ? "Could not reach the payment provider. Try again shortly." : "Verification could not be completed",
      };
    }
  }
}
