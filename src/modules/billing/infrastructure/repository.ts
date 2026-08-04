import { prisma } from "@/lib/prisma";
import type { Prisma, BillingSubscription, BillingInvoice, BillingEvent } from "@/generated/prisma/client";
import { logger } from "@/lib/observability/logger";
import { metricsService } from "@/lib/observability/metrics-service";

export class BillingRepository {
  private client(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  async findSubscriptionByWorkspaceId(workspaceId: string, tx?: Prisma.TransactionClient): Promise<BillingSubscription | null> {
    return this.client(tx).billingSubscription.findUnique({ where: { workspaceId } });
  }

  async findSubscriptionWithPlan(workspaceId: string) {
    const sub = await prisma.billingSubscription.findUnique({
      where: { workspaceId },
      include: { plan: { select: { code: true } } },
    });
    if (!sub) return null;
    return sub as BillingSubscription & { plan: { code: string } };
  }

  async findSubscriptionsByWorkspaceIds(workspaceIds: string[]) {
    if (workspaceIds.length === 0) return [];
    return prisma.billingSubscription.findMany({
      where: { workspaceId: { in: workspaceIds } },
      include: { plan: true },
    });
  }

  async findInvoicesByWorkspaceIds(workspaceIds: string[], limit = 100) {
    if (workspaceIds.length === 0) return [];
    return prisma.billingInvoice.findMany({
      where: { workspaceId: { in: workspaceIds } },
      orderBy: { issuedAt: "desc" },
      take: limit,
    });
  }

  async findInvoicesByWorkspaceId(workspaceId: string, limit = 50) {
    return prisma.billingInvoice.findMany({
      where: { workspaceId },
      orderBy: { issuedAt: "desc" },
      take: limit,
    });
  }

  async countActiveProSubscriptions() {
    const proPlans = await prisma.billingPlan.findMany({
      where: { family: "creator", price: { gt: 0 } },
      select: { id: true },
    });
    const proPlanIds = proPlans.map((p) => p.id);
    if (proPlanIds.length === 0) return 0;
    return prisma.billingSubscription.count({
      where: { planId: { in: proPlanIds }, status: "ACTIVE" },
    });
  }

  async countProSubscriptionsLegacy() {
    return prisma.subscription.count({ where: { plan: "PRO" } });
  }

  async getAllSubscriptionsWithPlan() {
    return prisma.billingSubscription.findMany({ include: { plan: true } });
  }

  async getInvoiceRevenue() {
    return prisma.billingInvoice.aggregate({
      _sum: { amount: true },
      where: { status: "PAID" },
    });
  }

  async upsertSubscription(workspaceId: string, data: { planId: string; status: string; trialEndsAt?: Date | null; renewsAt?: Date | null; cancelledAt?: Date | null; cancellationReason?: string | null }, tx?: Prisma.TransactionClient): Promise<BillingSubscription> {
    const start = Date.now();
    const client = this.client(tx);
    const existing = await client.billingSubscription.findUnique({ where: { workspaceId } });
    let result: BillingSubscription;
    if (existing) {
      result = await client.billingSubscription.update({ where: { workspaceId }, data });
      logger.info("subscription updated", "billing", { operation: "update_subscription", duration: Date.now() - start, metadata: { workspaceId, planId: data.planId, status: data.status } as Record<string, unknown> });
    } else {
      // Ensure the parent BillingAccount exists (the subscription aggregate root).
      // BillingSubscription.accountId references BillingAccount.id — find the
      // account by its (accountType, accountId) key, or create it (id = workspaceId)
      // for legacy/no-v2 workspaces, then use the account's real id.
      let account = await client.billingAccount.findUnique({
        where: { accountType_accountId: { accountType: "tenant", accountId: workspaceId } },
      });
      if (!account) {
        account = await client.billingAccount.create({
          data: { id: workspaceId, accountType: "tenant", accountId: workspaceId },
        });
      }
      result = await client.billingSubscription.create({
        data: { accountId: account.id, workspaceId, ...data },
      });
      logger.info("subscription created", "billing", { operation: "create_subscription", duration: Date.now() - start, metadata: { workspaceId, planId: data.planId, status: data.status } as Record<string, unknown> });
    }
    metricsService.recordDuration("billing_execution", Date.now() - start);
    return result;
  }

  async createEvent(data: { workspaceId: string; accountId: string; type: string; idempotencyKey?: string; payload?: unknown }, tx?: Prisma.TransactionClient): Promise<BillingEvent> {
    return this.client(tx).billingEvent.create({
      data: {
        workspaceId: data.workspaceId, accountId: data.accountId, type: data.type,
        idempotencyKey: data.idempotencyKey, payload: data.payload as never,
      },
    });
  }

  async createInvoice(data: { workspaceId: string; accountId: string; planCode: string; amount: number; currency?: string; status?: string }, tx?: Prisma.TransactionClient): Promise<BillingInvoice> {
    const start = Date.now();
    const result = await this.client(tx).billingInvoice.create({
      data: {
        workspaceId: data.workspaceId, accountId: data.accountId, planCode: data.planCode,
        amount: data.amount, currency: data.currency ?? "INR", status: data.status ?? "PENDING",
      },
    });
    logger.info("invoice created", "billing", { operation: "create_invoice", duration: Date.now() - start, metadata: { workspaceId: data.workspaceId, planCode: data.planCode, amount: data.amount } as Record<string, unknown> });
    metricsService.recordDuration("billing_execution", Date.now() - start);
    return result;
  }

  async updateInvoiceStatus(invoiceId: string, status: string, providerReference?: string, tx?: Prisma.TransactionClient): Promise<BillingInvoice> {
    return this.client(tx).billingInvoice.update({
      where: { id: invoiceId },
      data: { status, providerReference, paidAt: status === "PAID" ? new Date() : undefined },
    });
  }

  async findPlanByCode(code: string, tx?: Prisma.TransactionClient) {
    return this.client(tx).billingPlan.findUnique({ where: { code } });
  }

  async findPlanFeatures(planId: string, tx?: Prisma.TransactionClient) {
    return this.client(tx).billingPlanFeature.findMany({
      where: { planId },
      include: { feature: true },
    });
  }

  async isDuplicateEvent(idempotencyKey: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const existing = await this.client(tx).billingEvent.findUnique({ where: { idempotencyKey } });
    return !!existing;
  }
}

export const billingRepository = new BillingRepository();
