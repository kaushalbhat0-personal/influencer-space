/**
 * RCCF-72.18D.6.1 — DIRECT_CREATOR Payment Link reconciliation.
 *
 * Closes the P1 activation blocker from RCCF-72.18D.6: a customer can pay a
 * creator's Razorpay Payment Link, but the `payment.captured` completion path
 * expects `notes.orderId/productId`, which Payment Link payments do not carry
 * (the link notes carry `referenceId`/`creatorStore`). Without reconciliation
 * the ProductOrder stays PENDING forever and fulfillment never activates.
 *
 * This module is the ONE canonical bridge from a Payment Link payment back to
 * its exact ProductOrder, feeding the existing canonical completion boundary
 * (`completeProductOrder`) — no parallel completion system, no duplicated
 * quota/fulfillment/analytics logic.
 *
 * Identity model (never trust the wire for tenant/order):
 *   1. PRIMARY   — a provider Payment Link id surfaced by the payload
 *                  (`payload.payment_link.entity.id` or
 *                  `payment.entity.payment_link`) matched against the
 *                  server-persisted `ProductOrder.providerReference`
 *                  (exact equality; also covers legacy orders created before
 *                  reconciliationRef existed).
 *   2. FALLBACK  — `notes.reconciliationRef` (a per-checkout crypto UUID the
 *                  checkout persisted inside `providerMetadata` and attached
 *                  as a Payment Link note; Razorpay propagates link notes onto
 *                  payments) matched by exact JSON-path equality.
 *
 * If BOTH resolve they MUST agree on the same order — otherwise the delivery
 * is treated as corrupt and nothing is mutated.
 *
 * Safety invariants:
 *   - DIRECT_CREATOR orders only; PLATFORM_COLLECT is structurally unreachable
 *     (its orders never carry a plink providerReference/reconciliationRef) and
 *     explicitly re-validated here as defense-in-depth.
 *   - Amount authority: server `order.amount` × 100 in integer paise must equal
 *     the captured amount exactly. Under/over/malformed/missing amounts never
 *     complete an order. No partial-payment semantics are invented.
 *   - State safety via the canonical boundary: only PENDING transitions;
 *     COMPLETED is an idempotent success no-op; every other state is refused
 *     by `completeProductOrder`.
 *   - Idempotency: the established `razorpay_payment_captured_product_<payId>`
 *     BillingEvent key dedupes duplicate deliveries after completion; the
 *     unique constraint collapses racing duplicates.
 *   - No credentials are decrypted and no provider API call is made: the
 *     webhook payload plus server-persisted identity is sufficient.
 *   - Unknown provider identity → zero mutation, safe result.
 */

import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/observability/error-tracker";

export interface DirectCreatorReconciliationInput {
  /** Provider payment id (`payment.entity.id`) — the financial occurrence. */
  paymentId: string;
  /** Captured amount in integer paise straight from the signed payload. */
  capturedAmountPaise: number;
  /** Merged webhook notes (payment + subscription entities). */
  notes: Record<string, string>;
  /**
   * Any Payment Link ids the payload exposes (e.g. `payload.payment_link.entity.id`,
   * `payment.entity.payment_link`). Empty/absent values are ignored.
   */
  providerPaymentLinkIds?: Array<string | undefined | null>;
}

export type DirectCreatorReconciliationResult =
  | { status: "completed"; orderId: string }
  | { status: "already_completed"; orderId: string }
  | { status: "unmatched" }
  | { status: "refused"; reason: string };

/** True when the value looks like a usable provider link reference. */
function usableLinkRef(value: string | undefined | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function reconcileDirectCreatorPaymentLinkPayment(
  input: DirectCreatorReconciliationInput,
): Promise<DirectCreatorReconciliationResult> {
  const linkRefs = (input.providerPaymentLinkIds ?? []).filter(usableLinkRef);
  const reconciliationRef = typeof input.notes?.reconciliationRef === "string" ? input.notes.reconciliationRef : "";
  if (!input.paymentId) return { status: "refused", reason: "missing payment id" };

  try {
    // ── Resolve candidate order(s) by exact server-persisted identity ──────
    let byLinkRef: Awaited<ReturnType<typeof resolveByLinkReference>> = null;
    for (const ref of linkRefs) {
      const found = await resolveByLinkReference(ref);
      if (found && byLinkRef && found.id !== byLinkRef.id) {
        // Two different plink refs resolving to two different orders in one
        // delivery is structurally impossible for legitimate traffic.
        captureError(new Error("Payment Link reconciliation resolved conflicting orders"), {
          service: "direct-creator-reconciliation",
          operation: "resolve",
        });
        return { status: "refused", reason: "conflicting provider identities" };
      }
      if (found && !byLinkRef) byLinkRef = found;
    }

    const byToken = reconciliationRef ? await resolveByReconciliationToken(reconciliationRef) : null;

    // Cross-check: when both signals exist they must agree.
    if (byLinkRef && byToken && byLinkRef.id !== byToken.id) {
      captureError(new Error("Payment Link reconciliation identity mismatch"), {
        service: "direct-creator-reconciliation",
        operation: "resolve",
      });
      return { status: "refused", reason: "identity mismatch" };
    }

    const order = byLinkRef ?? byToken;
    if (!order) return { status: "unmatched" };

    // Defense-in-depth strategy gate (queries already filter on this).
    if (order.commerceStrategy !== "DIRECT_CREATOR") {
      captureError(new Error("Non-DIRECT_CREATOR order reached creator reconciliation"), {
        service: "direct-creator-reconciliation",
        operation: "strategyGate",
        tenantId: order.tenantId,
      });
      return { status: "refused", reason: "strategy" };
    }

    // Already completed → idempotent success (no quota, no fulfillment, no event).
    if (order.status === "COMPLETED") return { status: "already_completed", orderId: order.id };

    // Any other non-PENDING state (FAILED/CANCELLED/refund states) must never
    // be completed by a webhook — the canonical boundary refuses these too,
    // but refusing before any side effect keeps intent explicit.
    if (order.status !== "PENDING") {
      return { status: "refused", reason: `state ${order.status}` };
    }

    // ── Amount authority: server order.amount vs captured paise ────────────
    const expectedPaise = Math.round(order.amount * 100);
    const capturedPaise = Math.round(input.capturedAmountPaise);
    if (!Number.isFinite(capturedPaise) || capturedPaise !== expectedPaise) {
      captureError(
        new Error(`DIRECT_CREATOR amount mismatch: captured ${capturedPaise} vs expected ${expectedPaise}`),
        { service: "direct-creator-reconciliation", operation: "amountGate", tenantId: order.tenantId },
      );
      return { status: "refused", reason: "amount_mismatch" };
    }

    // ── Canonical completion boundary (quota + state + fulfillment) ────────
    const { completeProductOrder } = await import("./order-completion");
    const completed = await completeProductOrder(order.id, { paymentId: input.paymentId });

    if (!completed.success) {
      if (completed.reason === "already_completed") {
        return { status: "already_completed", orderId: order.id };
      }
      captureError(
        new Error(`DIRECT_CREATOR reconciliation did not complete (${completed.reason ?? "unknown"}): order=${order.id} tenant=${order.tenantId}`),
        { service: "direct-creator-reconciliation", operation: "complete", tenantId: order.tenantId },
      );
      return { status: "refused", reason: completed.reason ?? "completion_failed" };
    }

    // Established BillingEvent convention — dedupes duplicate deliveries of
    // the same payment AFTER the (idempotent) completion; the unique
    // constraint collapses racing duplicates.
    await prisma.billingEvent
      .create({
        data: {
          workspaceId: null,
          accountId: order.tenantId,
          type: "PAYMENT_CAPTURED_PRODUCT",
          idempotencyKey: `razorpay_payment_captured_product_${input.paymentId}`,
          payload: {
            orderId: order.id,
            productId: order.productId,
            amount: order.amount,
            reconciliation: "direct_creator_payment_link",
            providerPaymentLinkId: linkRefs[0] ?? null,
          },
        },
      })
      .catch(() => {});

    return { status: "completed", orderId: order.id };
  } catch (error) {
    captureError(error, { service: "direct-creator-reconciliation", operation: input.paymentId });
    return { status: "refused", reason: "reconciliation_error" };
  }
}

/**
 * Match a provider Payment Link id against the server-persisted
 * ProductOrder.providerReference. DIRECT_CREATOR only — PLATFORM_COLLECT
 * orders can never carry a plink providerReference.
 */
async function resolveByLinkReference(providerReference: string) {
  return prisma.productOrder.findFirst({
    where: { commerceStrategy: "DIRECT_CREATOR", providerReference },
    select: { id: true, tenantId: true, productId: true, amount: true, status: true, commerceStrategy: true },
  });
}

/**
 * Match the per-checkout reconciliation token (server-generated at checkout,
 * persisted in providerMetadata AND attached as a Payment Link note).
 */
async function resolveByReconciliationToken(reconciliationRef: string) {
  return prisma.productOrder.findFirst({
    where: {
      commerceStrategy: "DIRECT_CREATOR",
      providerMetadata: { path: ["reconciliationRef"], equals: reconciliationRef },
    },
    select: { id: true, tenantId: true, productId: true, amount: true, status: true, commerceStrategy: true },
  });
}
