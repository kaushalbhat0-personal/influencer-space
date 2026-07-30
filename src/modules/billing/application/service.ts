import { billingRepository } from "../infrastructure/repository";
import { razorpayProvider } from "../infrastructure/providers/razorpay";
import { getPlan, getAllPlans, getPlansByFamily } from "@/lib/capabilities";
import { validateTransition } from "../domain/lifecycle";
import { capabilityService } from "@/lib/capabilities";
import { commissionService } from "@/lib/commission";
import { partnerService } from "@/lib/partners";
import { logAction } from "@/lib/audit";
import { platformEventBus } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";
import { metricsService } from "@/lib/observability/metrics-service";
import type { CheckoutResult } from "../domain/types";
import type { FeatureId } from "@/lib/capabilities/constants";

export class BillingService {
  async createCheckout(workspaceId: string, planCode: string, email?: string): Promise<CheckoutResult> {
    const start = Date.now();
    logger.info("createCheckout started", "billing", { operation: "create_checkout", metadata: { workspaceId, planCode } as Record<string, unknown> });
    const plan = getPlan(planCode);
    if (!plan) {
      logger.info("createCheckout completed", "billing", { operation: "create_checkout", duration: Date.now() - start, metadata: { result: "error", error: `Unknown plan: ${planCode}` } as Record<string, unknown> });
      metricsService.recordDuration("billing_execution", Date.now() - start);
      return { success: false, error: `Unknown plan: ${planCode}` };
    }

    const order = await razorpayProvider.createCheckout({
      planCode,
      accountId: workspaceId,
      email,
      currency: plan.currency,
    });

    if (!order.success) {
      logger.info("createCheckout completed", "billing", { operation: "create_checkout", duration: Date.now() - start, metadata: { result: "error", error: "Checkout creation failed" } as Record<string, unknown> });
      metricsService.recordDuration("billing_execution", Date.now() - start);
      return order;
    }

    await billingRepository.createEvent({
      workspaceId,
      accountId: workspaceId,
      type: "CHECKOUT_STARTED",
      idempotencyKey: `checkout_${order.orderId}`,
      payload: { planCode, orderId: order.orderId, amount: plan.price },
    });

    logger.info("createCheckout completed", "billing", { operation: "create_checkout", duration: Date.now() - start, metadata: { result: "success" } as Record<string, unknown> });
    metricsService.recordDuration("billing_execution", Date.now() - start);
    return order;
  }

  async handlePaymentCaptured(workspaceId: string, planCode: string, providerReference: string, idempotencyKey: string): Promise<void> {
    const start = Date.now();
    logger.info("handlePaymentCaptured started", "billing", { operation: "handle_payment_captured", metadata: { workspaceId, planCode } as Record<string, unknown> });
    if (await billingRepository.isDuplicateEvent(idempotencyKey)) {
      logger.info("handlePaymentCaptured completed", "billing", { operation: "handle_payment_captured", duration: Date.now() - start, metadata: { result: "duplicate" } as Record<string, unknown> });
      metricsService.recordDuration("billing_execution", Date.now() - start);
      return;
    }

    const plan = await billingRepository.findPlanByCode(planCode);
    if (!plan) throw new Error(`Unknown plan: ${planCode}`);

    const sub = await billingRepository.upsertSubscription(workspaceId, {
      planId: plan.id,
      status: "ACTIVE",
    });

    validateTransition(sub.status as never, "ACTIVE");

    await billingRepository.createEvent({
      workspaceId,
      accountId: workspaceId,
      type: "PAYMENT_SUCCEEDED",
      idempotencyKey,
      payload: { planCode, providerReference, previousStatus: sub.status, newStatus: "ACTIVE" },
    });

    const invoice = await billingRepository.createInvoice({
      workspaceId,
      accountId: workspaceId,
      planCode,
      amount: getPlan(planCode)?.price ?? 0,
      status: "PAID",
    });

    // ── Capability Activation ───────────────────────────────────────────
    capabilityService.can(planCode, "custom_domain");

    // ── Partner Commission ──────────────────────────────────────────────
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { agencyId: true, tenantId: true },
    });

    if (workspace?.agencyId) {
      const partnerRecord = await partnerService.get(workspace.agencyId);
      if (partnerRecord) {
        try {
          commissionService.processCommission({
            invoiceId: invoice.id,
            partnerId: workspace.agencyId,
            subscriptionId: sub.id,
            planCode,
            gross: getPlan(planCode)?.price ?? 0,
            currency: "INR",
          });
        } catch (err) {
          captureError(err, { service: "billing", operation: "processCommission" });
        }
      }
    }

    // ── Event ─────────────────────────────────────────────────────────────
    platformEventBus.publish("PaymentCaptured", {
      workspaceId,
      planCode,
      amount: getPlan(planCode)?.price ?? 0,
      currency: "INR",
      invoiceId: invoice.id,
      subscriptionId: sub.id,
    });

    platformEventBus.publish("SubscriptionActivated", {
      workspaceId,
      planCode,
      previousStatus: sub.status,
    });

    // ── Audit ───────────────────────────────────────────────────────────
    const tenantId = workspace?.tenantId;
    if (tenantId) {
      await logAction(tenantId, "payment:captured", {
        workspaceId,
        planCode,
        invoiceId: invoice.id,
        subscriptionId: sub.id,
        providerReference,
      }).catch((err) => {
        captureError(err, { service: "billing", operation: "paymentCaptured-audit" });
      });
    }

    logger.info("handlePaymentCaptured completed", "billing", { operation: "handle_payment_captured", duration: Date.now() - start, metadata: { result: "success" } as Record<string, unknown> });
    metricsService.recordDuration("billing_execution", Date.now() - start);
  }

  async cancelSubscription(workspaceId: string, reason?: string): Promise<void> {
    const start = Date.now();
    logger.info("cancelSubscription started", "billing", { operation: "cancel_subscription", metadata: { workspaceId } as Record<string, unknown> });
    const sub = await billingRepository.findSubscriptionByWorkspaceId(workspaceId);
    if (!sub) {
      captureError(new Error("No active subscription"), { service: "billing", operation: "cancel_subscription" });
      throw new Error("No active subscription");
    }

    validateTransition(sub.status as never, "CANCELLED");

    await billingRepository.upsertSubscription(workspaceId, {
      planId: sub.planId,
      status: "CANCELLED",
    });

    await billingRepository.createEvent({
      workspaceId,
      accountId: workspaceId,
      type: "SUBSCRIPTION_CANCELLED",
      payload: { previousStatus: sub.status, newStatus: "CANCELLED", reason },
    });

    platformEventBus.publish("SubscriptionCancelled", {
      workspaceId,
      planCode: sub.planId,
      reason,
    });

    logger.info("cancelSubscription completed", "billing", { operation: "cancel_subscription", duration: Date.now() - start, metadata: { result: "success" } as Record<string, unknown> });
    metricsService.recordDuration("billing_execution", Date.now() - start);
  }

  async getSubscriptionStatus(workspaceId: string): Promise<{ planCode: string; status: string; active: boolean } | null> {
    const sub = await billingRepository.findSubscriptionByWorkspaceId(workspaceId);
    if (!sub) return null;
    const plan = await billingRepository.findPlanByCode("creator_free");
    return {
      planCode: plan?.code ?? "creator_free",
      status: sub.status,
      active: sub.status === "ACTIVE" || sub.status === "TRIALING",
    };
  }

  async getBillingInfo(workspaceId: string, tenantId: string) {
    const subscription = await billingRepository.findSubscriptionWithPlan(workspaceId);
    const invoices = await prisma.billingInvoice.findMany({
      where: { workspaceId },
      orderBy: { issuedAt: "desc" },
      take: 50,
    });

    const planCode = subscription?.plan?.code ?? "creator_free";
    const plan = getPlan(planCode);

    const products = await prisma.product.count({ where: { tenantId } });
    const gallery = await prisma.galleryImage.count({ where: { tenantId } });
    const orders = await prisma.productOrder.count({ where: { tenantId } });

    return {
      plan: plan ?? { code: "creator_free", family: "creator" as const, name: "Free", description: "", price: 0, currency: "INR", features: {}, recommended: false, badge: "" },
      subscription: subscription ?? { id: "", accountId: workspaceId, workspaceId, planCode: "creator_free", status: "ACTIVE" as const, trialEndsAt: null, renewsAt: null, cancelledAt: null, createdAt: new Date().toISOString() },
      invoices: invoices.map((inv) => ({
        id: inv.id, amount: inv.amount, status: inv.status, issuedAt: inv.issuedAt.toISOString(), planCode: inv.planCode,
      })),
      paymentMethods: [],
      usage: [
        { feature: "max_products" as FeatureId, used: products, limit: 5 },
        { feature: "max_gallery" as FeatureId, used: gallery, limit: 10 },
      ],
      activeProducts: products,
      activeGallery: gallery,
      storageUsed: 0,
      ordersProcessed: orders,
      messagesSent: 0,
    };
  }

  getPlans() {
    return getPlansByFamily("creator");
  }
}

export const billingService = new BillingService();
