import { billingRepository } from "../infrastructure/repository";
import { razorpayProvider } from "../infrastructure/providers/razorpay";
import { getPlan, getAllPlans, getPlansByFamily } from "@/lib/capabilities";
import { validateTransition } from "../domain/lifecycle";
import { mappingForRazorpayEvent, statusForWebhookEvent } from "../domain/webhook";
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
import type { BillingLineItem } from "@/lib/billing/types";

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

  /**
   * IMPLEMENTATION-34 — handles the full Razorpay subscription lifecycle.
   * Every webhook becomes a BillingEvent → subscription status update →
   * capability (entitlement) refresh. Payments never unlock features directly;
   * only these events update the subscription, and CapabilityService derives
   * access from the updated plan.
   */
  async handleSubscriptionWebhook(input: {
    eventName: string;
    workspaceId: string;
    planCode?: string;
    providerReference: string;
    idempotencyKey: string;
    renewsAt?: Date | null;
    amount?: number;
  }): Promise<{ handled: boolean; status?: string; error?: string }> {
    const { eventName, workspaceId, planCode, providerReference, idempotencyKey } = input;
    const start = Date.now();

    if (await billingRepository.isDuplicateEvent(idempotencyKey)) {
      return { handled: false };
    }

    const mapping = mappingForRazorpayEvent(eventName);
    if (!mapping) {
      await this.recordWebhookEvent(input, "CHECKOUT_STARTED", "ignored");
      return { handled: false, error: `Unmapped event: ${eventName}` };
    }

    const existing = await billingRepository.findSubscriptionByWorkspaceId(workspaceId);
    const status = statusForWebhookEvent(eventName, (existing?.status as never) ?? null);
    if (!status) {
      // Illegal transition — record the event but do not mutate the subscription.
      await billingRepository.createEvent({
        workspaceId,
        accountId: workspaceId,
        type: mapping.eventType,
        idempotencyKey,
        payload: { eventName, planCode, providerReference, note: "status_unchanged" },
      });
      return { handled: false, error: `Illegal transition for ${eventName}` };
    }

    // Resolve the plan (canonical commerce code or legacy code fallback).
    // Ensure the BillingPlan row exists from the canonical catalog if missing.
    let plan = planCode ? await billingRepository.findPlanByCode(planCode) : null;
    if (!plan && planCode) {
      const { seedBillingCatalog } = await import("../infrastructure/catalog-seed");
      await seedBillingCatalog().catch(() => {});
      plan = await billingRepository.findPlanByCode(planCode);
    }
    if (!plan && existing?.planId) {
      plan = await prisma.billingPlan.findUnique({ where: { id: existing.planId } });
    }
    if (!plan) throw new Error(`Unknown plan for ${eventName}`);

    const sub = await billingRepository.upsertSubscription(workspaceId, {
      planId: plan.id,
      status,
      renewsAt: input.renewsAt ?? null,
    });

    await billingRepository.createEvent({
      workspaceId,
      accountId: workspaceId,
      type: mapping.eventType,
      idempotencyKey,
      payload: { eventName, planCode: plan.code, providerReference, previousStatus: existing?.status, newStatus: status },
    });

    // Renewal / activation → paid invoice.
    if (mapping.action === "activate" || mapping.action === "renew") {
      const invoice = await billingRepository.createInvoice({
        workspaceId,
        accountId: workspaceId,
        planCode: plan.code,
        amount: input.amount ?? getPlan(plan.code)?.price ?? 0,
        status: "PAID",
      });
      platformEventBus.publish("PaymentCaptured", {
        workspaceId,
        planCode: plan.code,
        amount: input.amount ?? getPlan(plan.code)?.price ?? 0,
        currency: "INR",
        invoiceId: invoice.id,
        subscriptionId: sub.id,
      });
    }

    const tenant = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { tenantId: true } });
    if (tenant?.tenantId) {
      await logAction(tenant.tenantId, "billing:subscription-webhook", {
        eventName,
        workspaceId,
        planCode: plan.code,
        status,
        providerReference,
      }).catch((err) => captureError(err, { service: "billing", operation: "subscriptionWebhook-audit" }));
    }

    logger.info("handleSubscriptionWebhook completed", "billing", { operation: "handle_subscription_webhook", duration: Date.now() - start, metadata: { eventName, status } as Record<string, unknown> });
    metricsService.recordDuration("billing_execution", Date.now() - start);
    return { handled: true, status };
  }

  private async recordWebhookEvent(input: {
    eventName: string;
    workspaceId: string;
    providerReference: string;
    idempotencyKey: string;
  }, type: string, note: string): Promise<void> {
    await billingRepository.createEvent({
      workspaceId: input.workspaceId,
      accountId: input.workspaceId,
      type,
      idempotencyKey: input.idempotencyKey,
      payload: { eventName: input.eventName, providerReference: input.providerReference, note },
    });
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
      cancelledAt: new Date(),
      cancellationReason: reason ?? null,
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

  /**
   * IMPLEMENTATION-35 — resume a CANCELLED/PAST_DUE subscription. Produces a
   * BillingEvent and updates state via the lifecycle (events stay authoritative).
   */
  async resumeSubscription(workspaceId: string): Promise<void> {
    const sub = await billingRepository.findSubscriptionByWorkspaceId(workspaceId);
    if (!sub) throw new Error("No subscription");
    validateTransition(sub.status as never, "ACTIVE");

    await billingRepository.upsertSubscription(workspaceId, {
      planId: sub.planId,
      status: "ACTIVE",
      cancelledAt: null,
      cancellationReason: null,
    });

    await billingRepository.createEvent({
      workspaceId,
      accountId: workspaceId,
      type: "SUBSCRIPTION_RESUMED",
      idempotencyKey: `resume_${workspaceId}_${Date.now()}`,
      payload: { previousStatus: sub.status, newStatus: "ACTIVE" },
    });

    platformEventBus.publish("SubscriptionActivated", { workspaceId, planCode: sub.planId, previousStatus: sub.status });
  }

  /**
   * IMPLEMENTATION-35 — change plan (upgrade/downgrade). Validates the transition
   * then creates a NEW Razorpay subscription checkout. Activation is webhook-
   * driven (BillingEvent → BillingSubscription → capability refresh), so the old
   * plan's capabilities remain until the new subscription activates.
   */
  async changePlan(workspaceId: string, planCode: string, email?: string): Promise<CheckoutResult> {    const target = getPlan(planCode);
    if (!target) return { success: false, error: `Unknown plan: ${planCode}` };

    const current = await billingRepository.findSubscriptionWithPlan(workspaceId);
    if (current?.plan?.code && current.plan.code !== planCode) {
      const currentPlan = getPlan(current.plan.code);
      const canChange =
        current.status === "ACTIVE" || current.status === "TRIALING" || current.status === "PAST_DUE";
      if (!canChange && current.status !== "CANCELLED") {
        return { success: false, error: `Cannot change plan from status ${current.status}` };
      }
    }

    return this.createCheckout(workspaceId, planCode, email);
  }

  /**
   * IMPLEMENTATION-39 — Super Admin manual plan override. Sets the Billing v2
   * subscription directly (the legacy Subscription table is no longer written).
   * Always produces a BillingEvent + audit so the timeline stays authoritative.
   */
  async adminSetPlan(workspaceId: string, planCode: string, status: "ACTIVE" | "CANCELLED" | "PAST_DUE" | "TRIALING", reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const plan = await billingRepository.findPlanByCode(planCode);
      if (!plan) {
        const { seedBillingCatalog } = await import("../infrastructure/catalog-seed");
        await seedBillingCatalog().catch(() => {});
        const reseeded = await billingRepository.findPlanByCode(planCode);
        if (!reseeded) return { success: false, error: `Unknown plan: ${planCode}` };
      }
      const existing = await billingRepository.findSubscriptionByWorkspaceId(workspaceId);
      const sub = await billingRepository.upsertSubscription(workspaceId, {
        planId: (await billingRepository.findPlanByCode(planCode))!.id,
        status,
        cancelledAt: status === "CANCELLED" ? new Date() : null,
        cancellationReason: status === "CANCELLED" ? reason ?? null : null,
      });
      await billingRepository.createEvent({
        workspaceId,
        accountId: workspaceId,
        type: status === "CANCELLED" ? "SUBSCRIPTION_CANCELLED" : "SUBSCRIPTION_ACTIVATED",
        idempotencyKey: `admin_${workspaceId}_${planCode}_${Date.now()}`,
        payload: { planCode, previousStatus: existing?.status, newStatus: status, reason: reason ?? "super-admin" },
      });
      const tenant = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { tenantId: true } });
      if (tenant?.tenantId) {
        await logAction(tenant.tenantId, "billing:admin-set-plan", { workspaceId, planCode, status, reason }).catch(() => {});
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to set plan" };
    }
  }

  async getSubscriptionStatus(workspaceId: string): Promise<{ planCode: string; status: string; active: boolean } | null> {
    const sub = await billingRepository.findSubscriptionWithPlan(workspaceId);
    if (!sub) return null;
    return {
      planCode: sub.plan?.code ?? "creator_free",
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

    // IMPLEMENTATION-34: read-only billing history (events + payment history).
    const events = await prisma.billingEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    const planCode = subscription?.plan?.code ?? "creator_launch";
    const plan = getPlan(planCode);

    const products = await prisma.product.count({ where: { tenantId } });
    const gallery = await prisma.galleryImage.count({ where: { tenantId } });
    const orders = await prisma.productOrder.count({ where: { tenantId } });

    return {
      planCode,
      plan: plan ?? { code: "creator_launch", family: "creator" as const, name: "Creator Launch", description: "", price: 0, currency: "INR", features: {}, recommended: false, badge: "" },
      subscription: subscription ?? { id: "", accountId: workspaceId, workspaceId, planCode: "creator_launch", status: "ACTIVE" as const, trialEndsAt: null, renewsAt: null, cancelledAt: null, createdAt: new Date().toISOString() },
      invoices: invoices.map((inv) => ({
        id: inv.id,
        planCode: inv.planCode,
        planName: getPlan(inv.planCode)?.name ?? inv.planCode,
        amount: inv.amount,
        taxAmount: inv.taxAmount ?? 0,
        total: (inv.amount ?? 0) + (inv.taxAmount ?? 0),
        currency: inv.currency ?? "INR",
        status: inv.status as never,
        issuedAt: inv.issuedAt.toISOString(),
        paidAt: inv.paidAt?.toISOString() ?? null,
        dueAt: inv.dueAt?.toISOString() ?? null,
        invoiceUrl: inv.invoiceUrl ?? null,
        provider: inv.provider ?? null,
        providerReference: inv.providerReference ?? null,
        lineItems: (inv.lineItems as unknown as BillingLineItem[]) ?? [],
      })),
      paymentMethods: [],
      usage: [
        { metric: "max_products", label: "Products", used: products, limit: 5, unit: "" },
        { metric: "max_gallery", label: "Gallery", used: gallery, limit: 10, unit: "" },
      ],
      activeProducts: products,
      activeGallery: gallery,
      storageUsed: 0,
      ordersProcessed: orders,
      messagesSent: 0,
      history: {
        renewalDate: subscription?.renewsAt?.toISOString() ?? null,
        status: subscription?.status ?? null,
        cancelledAt: subscription?.cancelledAt?.toISOString() ?? null,
        cancellationReason: subscription?.cancellationReason ?? null,
        events: events.map((e) => ({
          type: e.type,
          createdAt: e.createdAt.toISOString(),
          payload: (e.payload as Record<string, unknown>) ?? {},
        })),
        paymentHistory: invoices.map((inv) => ({
          id: inv.id,
          amount: inv.amount,
          status: inv.status,
          issuedAt: inv.issuedAt.toISOString(),
          paidAt: inv.paidAt?.toISOString() ?? null,
        })),
      },
    };
  }

  getPlans() {
    return getPlansByFamily("creator");
  }
}

export const billingService = new BillingService();
