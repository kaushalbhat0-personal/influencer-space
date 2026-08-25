/**
 * RCCF-73 — Partner additional-client capacity purchase (payment-gated).
 *
 * Replaces the legacy un-gated upsert (RCCF-61) where an ACTIVE
 * AgencyCapacityAddon was granted with NO checkout/webhook/invoice.
 *
 * Flow (all identity server-derived):
 *   agency requests capacity → server derives agency + price → Razorpay ORDER
 *   (notes: purpose=partner_capacity_addon, agencyId, quantity) → user pays →
 *   provider webhook → signature verification (route) → THIS handler:
 *     - identity verification   (agency must exist + be ACTIVE)
 *     - quantity validation     (server-set note range-checked)
 *     - amount verification     (captured paise === canonical unit × qty × 100)
 *     - idempotency             (unique (agencyId, idempotencyKey) addon row +
 *                                dedupe BillingEvent INSIDE the same tx)
 *     - financial record        (PAID BillingInvoice, provider-referenced)
 *     - entitlement             (+quantity ACTIVE capacity, exactly once)
 *     - audit event
 *
 * A failed capture grants NOTHING. A replayed capture mutates NOTHING.
 * A wrong amount NEVER grants capacity. Capacity is never granted from any
 * client-supplied value.
 */
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { captureError } from "@/lib/observability/error-tracker";

export interface CapacityCaptureInput {
  paymentId: string;
  orderId: string;
  capturedAmountPaise: number;
  notes: Record<string, string>;
}

export interface CapacityCaptureResult {
  handled: boolean;
  granted?: boolean;
  reason?: string;
  error?: string;
}

export class PartnerCapacityPurchaseService {
  /** Canonical expected paise for a quantity (pure, exported for tests). */
  expectedAmountPaise(quantity: number, unitPriceInr: number): number {
    return Math.round(unitPriceInr * quantity * 100);
  }

  /**
   * Handle a captured payment whose order notes tag it as a partner capacity
   * add-on purchase. Idempotent per provider payment id.
   */
  async handleCapture(input: CapacityCaptureInput): Promise<CapacityCaptureResult> {
    const { paymentId, orderId, capturedAmountPaise } = input;
    if (!paymentId) return { handled: false, error: "missing payment id" };

    // Server-set order notes (never client input): identity + quantity.
    const agencyId = input.notes.agencyId ?? "";
    const quantity = Number.parseInt(input.notes.quantity ?? "", 10);
    if (!agencyId || !Number.isInteger(quantity) || quantity <= 0 || quantity > 1000) {
      await this.recordRejection(paymentId, "invalid_order_notes");
      return { handled: true, granted: false, reason: "invalid_order_notes" };
    }

    // Identity verification: the agency must still exist and be ACTIVE.
    const agency = await prisma.websiteAgency.findUnique({
      where: { id: agencyId },
      select: { id: true, status: true },
    });
    if (!agency || (agency.status !== "ACTIVE" && agency.status !== "TRIAL")) {
      await this.recordRejection(paymentId, "unknown_or_inactive_agency");
      return { handled: true, granted: false, reason: "unknown_or_inactive_agency" };
    }

    const { PARTNER_ADDON_UNIT_PRICE_INR } = await import("@/config/commerce/agency-addons");

    // Amount verification: the captured paise MUST equal the canonical
    // unit price × quantity. ₹1,999 / ₹2,001 captures are rejected with
    // zero mutation (a durable, idempotent rejection record is kept).
    const expectedPaise = this.expectedAmountPaise(quantity, PARTNER_ADDON_UNIT_PRICE_INR);
    if (!Number.isFinite(capturedAmountPaise) || capturedAmountPaise !== expectedPaise) {
      await this.recordRejection(paymentId, "amount_mismatch");
      captureError(new Error(`Capacity purchase amount mismatch: payment=${paymentId} captured=${capturedAmountPaise} expected=${expectedPaise}`), {
        service: "billing",
        operation: "capacity-capture-amount-mismatch",
      });
      return { handled: true, granted: false, reason: "amount_mismatch" };
    }

    // Replay safety BEFORE the transaction: a prior successful capture for
    // this payment is a no-op (the route-level razorpay_payment_<id> key
    // normally collapses duplicates earlier; this guards direct replays).
    const alreadyCaptured = await prisma.billingEvent.findUnique({
      where: { idempotencyKey: `partner_capacity_captured_${paymentId}` },
      select: { id: true },
    });
    if (alreadyCaptured) return { handled: true, granted: false, reason: "already_captured" };

    const agencyWorkspace = await prisma.workspace.findFirst({
      where: { agencyId },
      select: { id: true },
    });

    try {
      await prisma.$transaction(async (tx) => {
        // Entitlement: ACTIVE addon keyed by (agencyId, capacity_<paymentId>)
        // — the unique constraint makes a concurrent/duplicate capture fail
        // loudly instead of double-granting.
        await tx.agencyCapacityAddon.create({
          data: {
            agencyId,
            quantity,
            unitPriceInr: PARTNER_ADDON_UNIT_PRICE_INR,
            status: "ACTIVE",
            idempotencyKey: `capacity_${paymentId}`,
          },
        });

        // Immutable financial record referencing the provider payment.
        await tx.billingInvoice.create({
          data: {
            workspaceId: agencyWorkspace?.id ?? null,
            accountId: agencyId,
            planCode: "partner_capacity_addon",
            amount: Math.round((capturedAmountPaise / 100) * 100) / 100,
            currency: "INR",
            status: "PAID",
            providerReference: paymentId,
          },
        });

        await tx.billingEvent.create({
          data: {
            workspaceId: agencyWorkspace?.id ?? null,
            accountId: agencyId,
            type: "PARTNER_CAPACITY_PURCHASED",
            idempotencyKey: `partner_capacity_captured_${paymentId}`,
            payload: {
              purpose: "partner_capacity_addon",
              providerOrderId: orderId,
              providerPaymentId: paymentId,
              quantity,
              unitPriceInr: PARTNER_ADDON_UNIT_PRICE_INR,
              amountPaise: capturedAmountPaise,
              event: "payment.captured",
            },
          },
        });
      });
    } catch (err) {
      // Unique-constraint collision ⇒ a concurrent duplicate capture lost the
      // race and its (rolled-back) transaction granted nothing — safe no-op.
      const code = (err as { code?: string }).code;
      if (code === "P2002") {
        return { handled: true, granted: false, reason: "already_captured" };
      }
      captureError(err, { service: "billing", operation: "capacity-capture-commit" });
      throw err;
    }

    await logAction("system", "partner:capacity-addon-purchased", {
      agencyId,
      quantity,
      unitPriceInr: PARTNER_ADDON_UNIT_PRICE_INR,
      paymentId,
      orderId,
    }).catch(() => {});

    return { handled: true, granted: true };
  }

  /** Durable, idempotent rejection record — diagnostics only, zero mutation. */
  private async recordRejection(paymentId: string, reason: string): Promise<void> {
    await prisma.billingEvent
      .create({
        data: {
          // BillingEvent.accountId is non-nullable; unknown identity at
          // rejection time is recorded under the system nil-UUID sentinel.
          accountId: SYSTEM_SENTINEL_ACCOUNT_ID,
          type: "PARTNER_CAPACITY_REJECTED",
          idempotencyKey: `partner_capacity_rejected_${reason}_${paymentId}`,
          payload: { paymentId, reason },
        },
      })
      .catch(() => {});
  }
}

/** Nil-UUID sentinel for events recorded before/without an agency identity. */
export const SYSTEM_SENTINEL_ACCOUNT_ID = "00000000-0000-0000-0000-000000000000";

export const partnerCapacityPurchase = new PartnerCapacityPurchaseService();
