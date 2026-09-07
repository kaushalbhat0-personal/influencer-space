/**
 * RCCF-38 — canonical ProductOrder completion boundary with order metering.
 *
 * Every ProductOrder PENDING → COMPLETED transition passes through
 * `completeProductOrder`, so the monthly order allowance (featureKey "orders")
 * is enforced in exactly one place. The effective plan, `max_orders` limit and
 * the calendar-month period are ALL resolved server-side — the client can never
 * supply a plan, limit, tenant, featureKey or period.
 *
 * Metering reuses the RCCF-31 PlanUsage primitive (the same generic metering
 * used by publishing):
 *
 *   limited plan → computePublishPeriod("monthly") → reserveSlot (atomic
 *   conditional increment `used < limit`) + ProductOrder→COMPLETED in ONE
 *   transaction, so a failed completion rolls the usage back and an exhausted
 *   quota writes nothing.
 *
 *   unlimited plan (-1) → completes normally with no PlanUsage row.
 *
 * Fulfillment is an idempotent post-commit side effect (OrderFulfillment.orderId
 * is @unique), matching the existing webhook pattern.
 */
import { prisma } from "@/lib/prisma";
import { resolveActivePlan } from "./plan-source";
import { capabilityService } from "@/lib/capabilities";
import { DEFAULT_PLAN_CODE } from "@/lib/capabilities/constants";
import { computePublishPeriod } from "@/lib/publishing/publish-period";
import { suggestedPublishUpgrade } from "@/lib/publishing/publish-policy";
import { planUsageRepository } from "../infrastructure/plan-usage-repository";
import { ensureFulfillment } from "@/modules/fulfillment";

export const ORDERS_FEATURE_KEY = "orders";

export interface CompleteOrderResult {
  success: boolean;
  error?: string;
  reason?: "not_found" | "already_completed" | "not_pending" | "quota";
  /** Present when rejected for quota. */
  used?: number;
  limit?: number;
  periodStart?: string;
  periodEnd?: string | null;
  suggestedUpgrade?: "growth" | "scale" | null;
}

export async function completeProductOrder(
  orderId: string,
  ctx: { paymentId?: string } = {},
): Promise<CompleteOrderResult> {
  const order = await prisma.productOrder.findUnique({ where: { id: orderId } });
  if (!order) return { success: false, error: "Order not found", reason: "not_found" };

  // Idempotent: a completed order is never re-metered and never double-fulfilled.
  if (order.status === "COMPLETED") return { success: true, reason: "already_completed" };
  if (order.status !== "PENDING") {
    return { success: false, error: "Order is not pending", reason: "not_pending" };
  }

  const tenantId = order.tenantId;

  // Server-authoritative plan + order allowance (never from the client).
  const resolved = await resolveActivePlan(undefined, tenantId);
  const planCode = resolved.code ?? DEFAULT_PLAN_CODE;
  const limit = capabilityService.limit(planCode, "max_orders");

  const completeData = {
    status: "COMPLETED" as const,
    ...(ctx.paymentId ? { razorpayPaymentId: ctx.paymentId } : {}),
  };

  if (limit === -1) {
    // Unlimited plan: no usage row required.
    await prisma.productOrder.update({ where: { id: order.id }, data: completeData });
    await ensureFulfillment(order.id).catch(() => {});
    // RCCF-LAUNCH-10: agency product commission (best-effort, post-commit, idempotent)
    try {
      const { computeAndPersistAgencyCommission } = await import("@/lib/agency-commission/service");
      await computeAndPersistAgencyCommission(order.id);
    } catch {}
    // RCCF-COMMERCE-02: customer confirmation (webhook-authoritative, also covers free orders) — F3 dedup via BillingEvent
    try {
      if ((order as { guestToken?: string | null }).guestToken && (order as { fanEmail?: string | null }).fanEmail) {
        const idempotencyKey = `order_customer_confirmed_${order.id}`;
        const existing = await prisma.billingEvent.findUnique({ where: { idempotencyKey }, select: { id: true } }).catch(() => null);
        if (!existing) {
          const fresh = await prisma.productOrder.findUnique({ where: { id: order.id }, select: { guestToken: true, fanEmail: true, amount: true, tenantId: true, productId: true } });
          if (fresh?.guestToken && fresh.fanEmail) {
            const product = await prisma.product.findUnique({ where: { id: fresh.productId }, select: { name: true } });
            const tenant = await prisma.tenant.findUnique({ where: { id: fresh.tenantId }, select: { name: true } });
            const { getPlatformConfig } = await import("@/lib/config/platform");
            const base = getPlatformConfig().appUrl;
            const orderStatusUrl = `${base}/order/${fresh.guestToken}`;
            const storeName = tenant?.name || product?.name || "Store";
            const { sendCommunication } = await import("@/modules/communication");
            const sent = await sendCommunication("order.customer_confirmed", { audience: "customer", recipientId: order.id, email: fresh.fanEmail }, { orderId: order.id, productName: product?.name ?? "Product", amount: String(fresh.amount), storeName, orderStatusUrl }, { tenantId: fresh.tenantId }).catch(() => ({ success: false }));
            if ((sent as { success?: boolean })?.success) {
              await prisma.billingEvent.create({ data: { workspaceId: null, accountId: fresh.tenantId, type: "ORDER_CUSTOMER_CONFIRMED", idempotencyKey, payload: { orderId: order.id } } }).catch(() => {});
            }
          }
        }
      }
    } catch {}
    return { success: true };
  }

  // Limited plan: atomic quota reservation + completion in one transaction.
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { createdAt: true } });
  const createdAt = tenant?.createdAt ?? new Date();
  const period = computePublishPeriod("monthly", createdAt, new Date());

  const txResult = await prisma.$transaction(async (tx) => {
    const reserved = await planUsageRepository.reserveSlot(tx, {
      tenantId,
      featureKey: ORDERS_FEATURE_KEY,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      limit,
    });
    if (!reserved) {
      const usage = await planUsageRepository.getUsage(tx, {
        tenantId,
        featureKey: ORDERS_FEATURE_KEY,
        periodStart: period.periodStart,
      });
      return { quotaExceeded: true as const, used: usage?.used ?? 0 };
    }
    await tx.productOrder.update({ where: { id: order.id }, data: completeData });
    return { quotaExceeded: false as const, used: 0 };
  });

  if (txResult.quotaExceeded) {
    return {
      success: false,
      error: "Order limit reached",
      reason: "quota",
      used: txResult.used,
      limit,
      periodStart: period.periodStart.toISOString(),
      periodEnd: period.periodEnd?.toISOString() ?? null,
      suggestedUpgrade: suggestedPublishUpgrade(planCode),
    };
  }

  await ensureFulfillment(order.id).catch(() => {});
  // RCCF-LAUNCH-10: agency product commission (best-effort, post-commit, idempotent)
  try {
    const { computeAndPersistAgencyCommission } = await import("@/lib/agency-commission/service");
    await computeAndPersistAgencyCommission(order.id);
  } catch {}
  // RCCF-COMMERCE-02: customer confirmation (webhook-authoritative) — F3 dedup via BillingEvent
  try {
    if ((order as { guestToken?: string | null }).guestToken && (order as { fanEmail?: string | null }).fanEmail) {
      const idempotencyKey = `order_customer_confirmed_${order.id}`;
      const existing = await prisma.billingEvent.findUnique({ where: { idempotencyKey }, select: { id: true } }).catch(() => null);
      if (!existing) {
        const fresh = await prisma.productOrder.findUnique({ where: { id: order.id }, select: { guestToken: true, fanEmail: true, amount: true, tenantId: true, productId: true } });
        if (fresh?.guestToken && fresh.fanEmail) {
          const product = await prisma.product.findUnique({ where: { id: fresh.productId }, select: { name: true } });
          const tenant = await prisma.tenant.findUnique({ where: { id: fresh.tenantId }, select: { name: true } });
          const { getPlatformConfig } = await import("@/lib/config/platform");
          const base = getPlatformConfig().appUrl;
          const orderStatusUrl = `${base}/order/${fresh.guestToken}`;
          const storeName = tenant?.name || product?.name || "Store";
          const { sendCommunication } = await import("@/modules/communication");
          const sent = await sendCommunication("order.customer_confirmed", { audience: "customer", recipientId: order.id, email: fresh.fanEmail }, { orderId: order.id, productName: product?.name ?? "Product", amount: String(fresh.amount), storeName, orderStatusUrl }, { tenantId: fresh.tenantId }).catch(() => ({ success: false }));
          if ((sent as { success?: boolean })?.success) {
            await prisma.billingEvent.create({ data: { workspaceId: null, accountId: fresh.tenantId, type: "ORDER_CUSTOMER_CONFIRMED", idempotencyKey, payload: { orderId: order.id } } }).catch(() => {});
          }
        }
      }
    }
  } catch {}
  return { success: true };
}

/** Read the creator's current-month completed-order usage from PlanUsage. */
export async function getCurrentOrderUsage(tenantId: string): Promise<{ used: number; limit: number }> {
  const resolved = await resolveActivePlan(undefined, tenantId);
  const planCode = resolved.code ?? DEFAULT_PLAN_CODE;
  const limit = capabilityService.limit(planCode, "max_orders");
  if (limit === -1) return { used: 0, limit: -1 };

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { createdAt: true } });
  const createdAt = tenant?.createdAt ?? new Date();
  const period = computePublishPeriod("monthly", createdAt, new Date());
  const row = await planUsageRepository.getUsage(prisma, {
    tenantId,
    featureKey: ORDERS_FEATURE_KEY,
    periodStart: period.periodStart,
  });
  return { used: row?.used ?? 0, limit };
}
