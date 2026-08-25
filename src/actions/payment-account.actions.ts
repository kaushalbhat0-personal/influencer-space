"use server";

import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";
import {
  getPaymentAccount,
  savePaymentAccount,
  verifyPaymentAccount,
  disconnectPaymentAccount,
  computePaymentReadiness,
  getPaymentHealth,
} from "@/modules/payment-account";
import { getPaymentProviderAdapter } from "@/modules/payment-account";
import type { PaymentAccountInput, PaymentRefundInput } from "@/modules/payment-account";
import { decrypt } from "@/lib/crypto";
import { captureError } from "@/lib/observability/error-tracker";

async function requireCreatorOrSuperAdmin(): Promise<{ tenantId?: string; isSuper: boolean; actor?: string }> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  // RCCF-72.18D: explicitly deny agency and support roles
  if (role === "AGENCY_ADMIN" || role === "AGENCY_STAFF" || role === "SUPPORT" || role === "READ_ONLY") {
    return { isSuper: false };
  }
  const isSuper = role === "SUPER_ADMIN";
  const tenantId = session?.user?.tenantId ?? undefined;
  if (!isSuper && !tenantId) return { isSuper: false };
  return { tenantId, isSuper, actor: session?.user?.email ?? session?.user?.name ?? "user" };
}

/** Phase 4 — creator's own payment account (creator or super-admin only). */
export async function getMyPaymentAccount(): Promise<{ ok: boolean; account?: Awaited<ReturnType<typeof getPaymentAccount>>; readiness?: Awaited<ReturnType<typeof computePaymentReadiness>>; error?: string }> {
  const ctx = await requireCreatorOrSuperAdmin();
  if (!ctx.tenantId) return { ok: false, error: "Unauthorized" };
  const [account, readiness] = await Promise.all([getPaymentAccount(ctx.tenantId), computePaymentReadiness(ctx.tenantId)]);
  return { ok: true, account, readiness };
}

/** Phase 4 — save/edit the creator's own payment account. */
export async function saveMyPaymentAccount(input: PaymentAccountInput): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireCreatorOrSuperAdmin();
  if (!ctx.tenantId) return { success: false, error: "Unauthorized" };
  const result = await savePaymentAccount(ctx.tenantId, input, ctx.actor ?? "creator");
  revalidatePath("/admin/payments");
  return { success: result.success, error: result.error };
}

/**
 * RCCF-72.18D.7.5 — a successful verification carries the canonical readiness
 * snapshot so the creator UI can distinguish "credentials verified" from
 * "account ready to accept storefront payments" in the same response.
 */
export async function verifyMyPaymentAccount(): Promise<{ success: boolean; verified?: boolean; readiness?: Awaited<ReturnType<typeof computePaymentReadiness>>; error?: string }> {
  const ctx = await requireCreatorOrSuperAdmin();
  if (!ctx.tenantId) return { success: false, error: "Unauthorized" };
  const result = await verifyPaymentAccount(ctx.tenantId, ctx.actor ?? "creator");
  if (result.success) revalidatePath("/admin/payments");
  return result;
}

export async function disconnectMyPaymentAccount(): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireCreatorOrSuperAdmin();
  if (!ctx.tenantId) return { success: false, error: "Unauthorized" };
  const result = await disconnectPaymentAccount(ctx.tenantId, ctx.actor ?? "creator");
  revalidatePath("/admin/payments");
  return result;
}

/** Phase 6 — DIRECT_CREATOR checkout: create a hosted checkout on the creator's
 * account. The customer is a storefront guest, so the tenant comes from the
 * product row. CreatorStore is never in the money flow. */
export async function createDirectCheckout(input: { productId: string; customerEmail?: string; customerName?: string }): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> {
  // RCCF-69.2 — DIRECT_CREATOR is `status: "future"` in the canonical registry
  // and the webhook cannot reconcile its Payment Links (notes mismatch). It must
  // never be invoked in the normal production path — a strategy not marked
  // `active` is refused here as defense-in-depth, even if called directly.
  const { resolveCommerceStrategy } = await import("@/modules/commerce-strategy");

  // RCCF-69.2 (P0) — the Product lookup is scoped to the server-resolved checkout
  // tenant so a foreign product can never be used to build a DIRECT_CREATOR
  // checkout or ProductOrder.
  const { resolveCheckoutTenantId } = await import("@/actions/checkout.actions");
  const checkoutTenantId = await resolveCheckoutTenantId();
  if (!checkoutTenantId) return { success: false, error: "Product not found" };

  const product = await prisma.product.findFirst({
    where: { id: input.productId, tenantId: checkoutTenantId, isActive: true, status: "PUBLISHED", archivedAt: null },
  });
  if (!product) return { success: false, error: "Product not found" };
  const tenantId = product.tenantId;

  const strategy = await resolveCommerceStrategy(tenantId);
  if (strategy.id !== "DIRECT_CREATOR" || strategy.definition.status !== "active") {
    return { success: false, error: "Direct creator checkout is not available yet." };
  }

  const readiness = await computePaymentReadiness(tenantId);
  if (readiness.strategy !== "DIRECT_CREATOR" || readiness.readiness !== "ready") {
    return { success: false, error: "Creator payment account not ready" };
  }

  const account = await prisma.paymentAccount.findUnique({ where: { tenantId } });
  const adapter = getPaymentProviderAdapter(account?.provider ?? "");
  if (!adapter) return { success: false, error: "No provider adapter" };

  const { decrypt } = await import("@/lib/crypto");
  const keyId = account?.providerKeyId ? decrypt(account.providerKeyId) : null;
  const keySecret = account?.providerKeySecret ? decrypt(account.providerKeySecret) : null;

  // ── RCCF-72.18D.6.1 + RCCF-72.18D.7.3 — order-unique checkout identity ────
  // Razorpay enforces GLOBAL uniqueness on Payment Link reference_id (proven by
  // D.7.2's real Test Mode transaction): a second link for the same product is
  // REJECTED when reference_id repeats. The server-generated per-checkout
  // reconciliationRef (UUIDv4) is therefore used as BOTH the provider
  // reference_id AND the persisted reconciliation identity:
  //   - unique per checkout → same product can be purchased repeatedly,
  //     concurrent checkouts never collide;
  //   - minted before the Payment Link exists, persisted in providerMetadata
  //     below, and attached as a link note by the adapter — Razorpay propagates
  //     notes onto payments, so the signed webhook can only ever match by exact
  //     server-persisted equality (never client/tenant input);
  //   - D.6.1 semantics unchanged: providerReference (plink id) stays PRIMARY,
  //     reconciliationRef stays FALLBACK.
  const reconciliationRef = crypto.randomUUID();

  const result = await adapter.createCheckout({
    providerAccount: { provider: account!.provider as never, providerKeyId: keyId, providerKeySecret: keySecret },
    order: {
      // RCCF-72.18D.7.3 — NEVER the productId (not unique per checkout) and
      // never any client/tenant-provided value. Server-minted per checkout.
      referenceId: reconciliationRef,
      amount: product.price,
      currency: "INR",
      description: product.name,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      metadata: { reconciliationRef },
    },
  });

  if (result.success && result.checkoutUrl) {
    await prisma.productOrder.create({
      data: {
        tenantId,
        productId: product.id,
        amount: product.price,
        status: "PENDING",
        razorpayOrderId: result.providerReference ?? `dc_${Date.now()}`,
        fanEmail: input.customerEmail ?? null,
        commerceStrategy: "DIRECT_CREATOR",
        provider: account!.provider,
        providerReference: result.providerReference ?? null,
        providerMetadata: { checkoutUrl: result.checkoutUrl, reconciliationRef },
        paymentAccountId: account!.id,
      },
    });
  }
  return { success: !!result.success && !!result.checkoutUrl, checkoutUrl: result.checkoutUrl, error: result.error };
}

/**
 * RCCF-72.18D.3 — Product refund initiation for DIRECT_CREATOR orders.
 *
 * Authorization: creator (tenant owner) or SUPER_ADMIN.
 * Agency roles (AGENCY_ADMIN, AGENCY_STAFF) are explicitly DENIED.
 *
 * Safety invariants:
 * - Order must belong to the authenticated tenant.
 * - Order must be DIRECT_CREATOR.
 * - Order must have a historical paymentAccountId (no fallback to current account).
 * - paymentAccountId must belong to the same tenant.
 * - Refund amount must be > 0 and <= remaining refundable amount.
  * - Atomic conditional update guards ONLY refundStatus (NONE/PARTIAL/FAILED →
  *   PENDING): exactly one in-flight request can ever exist, which blocks
  *   duplicate initiation without persisting a monetary reservation.
  * - Does NOT execute provider refund (deferred to D.4's executeProductOrderRefund).
  * - RCCF-72.18D.5.1 ledger semantics: refundAmount means ACTUAL refunded paise,
  *   so initiation NEVER writes it. The PENDING status is the sole reservation
  *   marker and the requested amount travels explicitly to D.4, which re-validates
  *   it against fresh state — failures therefore release headroom by construction.
   */
export async function requestProductOrderRefund(input: {
  orderId: string;
  amount: number; // amount in minor units (paise)
}): Promise<{ success: boolean; error?: string; code?: string }> {
  const ctx = await requireCreatorOrSuperAdmin();
  if (!ctx.tenantId && !ctx.isSuper) return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };

  const order = await prisma.productOrder.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      tenantId: true,
      amount: true,
      status: true,
      commerceStrategy: true,
      paymentAccountId: true,
      refundAmount: true,
      refundStatus: true,
      razorpayPaymentId: true,
    },
  });

  if (!order) return { success: false, error: "Order not found", code: "NOT_FOUND" };

  // Tenant isolation: order must belong to the authenticated tenant (or SUPER_ADMIN)
  if (!ctx.isSuper && order.tenantId !== ctx.tenantId) {
    return { success: false, error: "Order not found", code: "FORBIDDEN" };
  }

  // Must be a DIRECT_CREATOR order
  if (order.commerceStrategy !== "DIRECT_CREATOR") {
    return { success: false, error: "Refunds for this order type are not supported via this path", code: "INVALID_STRATEGY" };
  }

  // Must have a historical payment account binding
  if (!order.paymentAccountId) {
    return { success: false, error: "This order cannot be refunded via creator-direct path (missing payment account binding)", code: "MISSING_PAYMENT_ACCOUNT" };
  }

  // Verify payment account belongs to the same tenant
  const paymentAccount = await prisma.paymentAccount.findUnique({
    where: { id: order.paymentAccountId },
    select: { id: true, tenantId: true },
  });
  if (!paymentAccount || paymentAccount.tenantId !== order.tenantId) {
    return { success: false, error: "Payment account binding is invalid", code: "INVALID_PAYMENT_ACCOUNT" };
  }

  // Must have a captured payment
  if (!order.razorpayPaymentId) {
    return { success: false, error: "Order has no captured payment to refund", code: "NO_CAPTURED_PAYMENT" };
  }

  // Order must be completed
  if (order.status !== "COMPLETED") {
    return { success: false, error: "Only completed orders can be refunded", code: "INVALID_ORDER_STATUS" };
  }

  // Amount validation (minor units = paise)
  const requestedAmount = Math.floor(input.amount);
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    return { success: false, error: "Refund amount must be a positive integer (paise)", code: "INVALID_AMOUNT" };
  }

  const originalCapturedPaise = Math.round(order.amount * 100);
  const refundedSoFarPaise = order.refundAmount ?? 0;
  const remainingRefundablePaise = originalCapturedPaise - refundedSoFarPaise;

  if (requestedAmount > remainingRefundablePaise) {
    return { success: false, error: "Refund amount exceeds remaining refundable amount", code: "AMOUNT_EXCEEDS_REMAINING" };
  }

  // RCCF-72.18D.5.1 — ledger integrity. refundAmount counts ACTUAL refunded
  // money, so initiation must not reserve into it. The reservation IS the
  // status: an atomic NONE/PARTIAL/FAILED → PENDING transition admits exactly
  // one in-flight request; concurrent initiators lose this guard and observe
  // PENDING below. The requested amount is passed explicitly to D.4.
  const updated = await prisma.productOrder.update({
    where: {
      id: input.orderId,
      // Mutual-exclusion guard: only initiate when no request is in flight.
      refundStatus: { in: ["NONE", "PARTIAL", "FAILED"] },
    },
    data: { refundStatus: "PENDING" },
    select: { id: true, refundStatus: true },
  }).catch(() => null);

  if (!updated) {
    // The status guard failed — either a request is already PENDING or the row
    // changed concurrently between the read above and this update.
    const current = await prisma.productOrder.findUnique({
      where: { id: input.orderId },
      select: { refundStatus: true },
    });
    if (current?.refundStatus === "PENDING") {
      return { success: false, error: "Refund already in progress", code: "REFUND_IN_PROGRESS" };
    }
    return { success: false, error: "Concurrent refund request detected, please retry", code: "CONCURRENT_MODIFICATION" };
  }

  // Audit log
  await logAction(order.tenantId, "product_order:refund_requested", {
    orderId: order.id,
    requestedAmountPaise: requestedAmount,
    refundedSoFarPaise,
    newRefundStatus: "PENDING",
    by: ctx.actor ?? "creator",
  }).catch(() => {});

   return { success: true };
}

/**
 * RCCF-72.18D.4 — Execute a creator-direct (DIRECT_CREATOR) product-order refund.
 *
 * Loads the order (must be in PENDING refund state from D.3), verifies the
 * historical PaymentAccount binding belongs to the order's tenant, decrypts
 * the stored credentials, and executes the refund through the Razorpay adapter
 * on the creator's own account.
 *
 * State transitions:
 *   PENDING → PARTIAL (provider refund succeeded, amount < original)
 *   PENDING → REFUNDED (provider refund succeeded, amount = original)
 *   PENDING → FAILED (provider rejected or errored)
 *
 * Idempotency:
 *   - If refundId is already set on the order, returns already processed.
 *   - Uses BillingEvent idempotency key: `product_refund_initiated_<orderId>`.
 *
 * Security:
 *   - Uses historical PaymentAccount binding (order.paymentAccountId), never
 *     the current tenant account.
 *   - Credentials are decrypted in memory only and passed to the adapter.
 *   - Provider errors are captured server-side via captureError() and never
 *     leak to the caller.
 *   - Does NOT support PLATFORM_COLLECT or subscription refunds.
 *
 * RCCF-72.18D.5.1 ledger integrity:
 *   - The execution amount arrives EXPLICITLY (paise) instead of being read
 *     from ProductOrder.refundAmount. refundAmount is ACTUAL refunded-to-date;
 *     D.3 no longer reserves into it, so failures cannot leak headroom and the
 *     amount is re-validated against fresh state before any provider call.
 *   - Failure paths write ONLY refundStatus = FAILED — refundAmount is never
 *     mutated by a failed operation.
 */
export async function executeProductOrderRefund(input: {
  orderId: string;
  /** Executed refund amount in minor units (paise). Validated against remaining headroom. */
  amount: number;
}): Promise<{ success: boolean; error?: string; code?: string; alreadyProcessed?: boolean; totalRefundedPaise?: number }> {
  const ctx = await requireCreatorOrSuperAdmin();
  if (!ctx.tenantId && !ctx.isSuper) return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };

  const order = await prisma.productOrder.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      tenantId: true,
      amount: true,
      status: true,
      commerceStrategy: true,
      paymentAccountId: true,
      refundAmount: true,
      refundStatus: true,
      razorpayPaymentId: true,
    },
  });

  if (!order) return { success: false, error: "Order not found", code: "NOT_FOUND" };

  // Tenant isolation: order must belong to the authenticated tenant (or SUPER_ADMIN)
  if (!ctx.isSuper && order.tenantId !== ctx.tenantId) {
    return { success: false, error: "Order not found", code: "FORBIDDEN" };
  }

  // Must be a DIRECT_CREATOR order — never PLATFORM_COLLECT or subscription
  if (order.commerceStrategy !== "DIRECT_CREATOR") {
    return { success: false, error: "Refunds for this order type are not supported via this path", code: "INVALID_STRATEGY" };
  }

  // RCCF-72.18D.5.1 — state-aware execution idempotency. The
  // `product_refund_initiated_<orderId>` BillingEvent marks a COMPLETED
  // execution cycle. Combined with a NON-PENDING status it means this exact
  // completion was already applied → report alreadyProcessed. Combined with a
  // PENDING status it belongs to a PRIOR cycle (e.g. partial refund succeeded,
  // creator legitimately initiated another one) → fall through and execute.
  const existingCompletion = await prisma.billingEvent.findUnique({
    where: { idempotencyKey: `product_refund_initiated_${input.orderId}` },
    select: { id: true },
  });
  if (existingCompletion && order.refundStatus !== "PENDING") {
    return { success: true, alreadyProcessed: true };
  }

  // Must be in PENDING state (set by D.3 requestProductOrderRefund) — this is
  // also what blocks duplicate execution of an already-applied cycle.
  if (order.refundStatus !== "PENDING") {
    return { success: false, error: `Order is not in a refundable state (status: ${order.refundStatus})`, code: "INVALID_REFUND_STATE" };
  }

  // Must have a historical payment account binding
  if (!order.paymentAccountId) {
    return { success: false, error: "Order has no historical payment account binding", code: "MISSING_PAYMENT_ACCOUNT" };
  }

  // Verify payment account belongs to the same tenant as the order
  const paymentAccount = await prisma.paymentAccount.findUnique({
    where: { id: order.paymentAccountId },
    select: { id: true, tenantId: true, provider: true, providerKeyId: true, providerKeySecret: true },
  });
  if (!paymentAccount || paymentAccount.tenantId !== order.tenantId) {
    captureError(new Error("Payment account binding mismatch"), {
      service: "payment-account",
      operation: "refundExecute",
      tenantId: order.tenantId,
    });
    return { success: false, error: "Payment account binding is invalid", code: "INVALID_PAYMENT_ACCOUNT" };
  }

  // Decrypt credentials
  const keyId = paymentAccount.providerKeyId ? decrypt(paymentAccount.providerKeyId) : null;
  const keySecret = paymentAccount.providerKeySecret ? decrypt(paymentAccount.providerKeySecret) : null;

  // Verify credentials are usable
  if (!keyId || !keySecret) {
    return { success: false, error: "Creator Razorpay keys not configured", code: "UNAUTHORIZED_PROVIDER" };
  }

  // Verify order has a captured payment
  if (!order.razorpayPaymentId) {
    return { success: false, error: "Order has no captured payment to refund", code: "NO_CAPTURED_PAYMENT" };
  }

  // ── RCCF-72.18D.5.1 ledger integrity ──────────────────────────────────────
  // refundAmount is ACTUAL refunded-to-date (never a reservation). The amount
  // to execute arrives explicitly and is re-validated against fresh state, so
  // an initiator racing an out-of-band webhook cannot breach the ceiling.
  const originalCapturedPaise = Math.round(order.amount * 100);
  const refundedToDatePaise = order.refundAmount ?? 0;

  // Stored-ledger corruption guard: the invariant 0 <= refunded <= captured
  // must already hold before anything else is added to it.
  if (refundedToDatePaise < 0 || refundedToDatePaise > originalCapturedPaise) {
    captureError(new Error("Stored refund ledger out of range"), {
      service: "payment-account",
      operation: "refundExecute",
      tenantId: order.tenantId,
    });
    return { success: false, error: "Stored refund ledger is invalid", code: "INVALID_AMOUNT" };
  }

  const executedAmount = Math.floor(input.amount);
  if (!Number.isFinite(executedAmount) || executedAmount <= 0) {
    return { success: false, error: "Refund amount must be a positive integer (paise)", code: "INVALID_AMOUNT" };
  }

  if (executedAmount > originalCapturedPaise - refundedToDatePaise) {
    return { success: false, error: "Refund amount exceeds remaining refundable amount", code: "AMOUNT_EXCEEDS_REMAINING" };
  }

  // Get the provider adapter
  const adapter = getPaymentProviderAdapter(paymentAccount.provider);
  if (!adapter?.refundPayment) {
    return { success: false, error: "Refund provider not supported", code: "PROVIDER_NOT_SUPPORTED" };
  }

  // Execute the refund through the provider
  let providerResult: { success: boolean; providerRefundId?: string; status?: string; error?: string };
  try {
    providerResult = await adapter.refundPayment({
      provider: paymentAccount.provider as never,
      providerKeyId: keyId,
      providerKeySecret: keySecret,
      providerPaymentId: order.razorpayPaymentId,
      amount: executedAmount / 100, // Convert paise to rupees for adapter
    } as PaymentRefundInput);
  } catch (err) {
    captureError(err, {
      service: "payment-account",
      operation: "refundExecute",
      tenantId: order.tenantId,
      correlation: input.orderId,
    });
    // S-2 release: refundAmount was never reserved at initiation, so a failure
    // writes ONLY the status — the actual-refunded ledger stays untouched and
    // the full headroom is retryable.
    await prisma.productOrder.update({
      where: { id: order.id },
      data: { refundStatus: "FAILED" },
    }).catch(() => {});
    return { success: false, error: "Provider refund execution failed", code: "PROVIDER_ERROR" };
  }

  if (!providerResult.success) {
    // Provider explicitly rejected the refund
    captureError(new Error(`Provider refund rejected: ${providerResult.error ?? "unknown"}`), {
      service: "payment-account",
      operation: "refundExecute",
      tenantId: order.tenantId,
    });
    // S-2 release: refundAmount was never reserved at initiation, so a failure
    // writes ONLY the status — the actual-refunded ledger stays untouched and
    // the full headroom is retryable.
    await prisma.productOrder.update({
      where: { id: order.id },
      data: { refundStatus: "FAILED" },
    }).catch(() => {});
    return { success: false, error: "Provider refund rejected", code: "INVALID_REQUEST" };
  }

  // Provider refund succeeded — transition state. The executed amount is added
  // to the ACTUAL refunded ledger exactly once (validated above, provider-
  // confirmed here); the ceiling cannot be breached.
  const newTotalRefundedPaise = refundedToDatePaise + executedAmount;
  const newRefundStatus: "PARTIAL" | "REFUNDED" =
    newTotalRefundedPaise >= originalCapturedPaise ? "REFUNDED" : "PARTIAL";

  await prisma.$transaction(async (tx) => {
    // Update order with provider refund ID and final status
    await tx.productOrder.update({
      where: { id: order.id },
      data: {
        refundId: providerResult.providerRefundId ?? undefined,
        refundStatus: newRefundStatus,
        refundedAt: new Date(),
        refundAmount: newTotalRefundedPaise,
      },
    });

    // RCCF-72.18D.6.5 — POLICY 1 (digital refund entitlement): a FULL refund
    // revokes the customer's digital download access, in the SAME transaction
    // as the ledger update so entitlement and ledger can never disagree.
    // Partial refunds (PARTIAL) intentionally preserve access; initiation,
    // PENDING and FAILED never reach this branch. Clearing the token makes the
    // link invalid and blocks regeneration of access to the same entitlement;
    // re-running against an already-revoked fulfillment matches zero rows.
    if (newRefundStatus === "REFUNDED") {
      await tx.orderFulfillment.updateMany({
        where: { orderId: order.id, type: { in: ["digital", "course"] }, downloadToken: { not: null } },
        data: { downloadToken: null, downloadExpiresAt: null },
      });
    }

    // Record idempotency event for refund execution. Upsert: the stable
    // per-order key marks the LATEST completed cycle, so a subsequent partial
    // cycle updates the marker instead of violating the unique constraint.
    await tx.billingEvent.upsert({
      where: { idempotencyKey: `product_refund_initiated_${order.id}` },
      update: {
        type: newRefundStatus === "REFUNDED" ? "REFUND_COMPLETED" : "REFUND_PARTIAL",
        payload: {
          orderId: order.id,
          providerRefundId: providerResult.providerRefundId,
          requestedPaise: executedAmount,
          totalRefundedPaise: newTotalRefundedPaise,
          status: newRefundStatus,
        },
      },
      create: {
        workspaceId: null,
        accountId: order.tenantId,
        type: newRefundStatus === "REFUNDED" ? "REFUND_COMPLETED" : "REFUND_PARTIAL",
        idempotencyKey: `product_refund_initiated_${order.id}`,
        payload: {
          orderId: order.id,
          providerRefundId: providerResult.providerRefundId,
          requestedPaise: executedAmount,
          totalRefundedPaise: newTotalRefundedPaise,
          status: newRefundStatus,
        },
      },
    });
  });

  // Audit log
  await logAction(order.tenantId, "product_order:refund_executed", {
    orderId: order.id,
    providerRefundId: providerResult.providerRefundId,
    requestedPaise: executedAmount,
    totalRefundedPaise: newTotalRefundedPaise,
    newRefundStatus,
    providerStatus: providerResult.status,
  }).catch(() => {});

  return { success: true, alreadyProcessed: false, totalRefundedPaise: newTotalRefundedPaise };
}

/** Phase 12 — platform payment health (super admin). */
export async function getPaymentHealthData(): Promise<{ ok: boolean; health?: Awaited<ReturnType<typeof getPaymentHealth>>; error?: string }> {
  const ctx = await requireCreatorOrSuperAdmin();
  if (!ctx.isSuper) return { ok: false, error: "Unauthorized" };
  return { ok: true, health: await getPaymentHealth() };
}
