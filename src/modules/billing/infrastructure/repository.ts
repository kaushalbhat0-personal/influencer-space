import { prisma } from "@/lib/prisma";
import type { BillingSubscription, BillingInvoice, BillingEvent } from "@/generated/prisma/client";

export class BillingRepository {
  async findSubscriptionByWorkspaceId(workspaceId: string): Promise<BillingSubscription | null> {
    return prisma.billingSubscription.findUnique({ where: { workspaceId } });
  }

  async upsertSubscription(workspaceId: string, data: { planId: string; status: string; trialEndsAt?: Date | null; renewsAt?: Date | null }): Promise<BillingSubscription> {
    const existing = await prisma.billingSubscription.findUnique({ where: { workspaceId } });
    if (existing) {
      return prisma.billingSubscription.update({
        where: { workspaceId },
        data,
      });
    }
    return prisma.billingSubscription.create({
      data: {
        accountId: workspaceId,
        workspaceId,
        ...data,
      },
    });
  }

  async createEvent(data: { workspaceId: string; accountId: string; type: string; idempotencyKey?: string; payload?: unknown }): Promise<BillingEvent> {
    return prisma.billingEvent.create({ data: { workspaceId: data.workspaceId, accountId: data.accountId, type: data.type, idempotencyKey: data.idempotencyKey, payload: data.payload as never } });
  }

  async createInvoice(data: { workspaceId: string; accountId: string; planCode: string; amount: number; currency?: string; status?: string }): Promise<BillingInvoice> {
    return prisma.billingInvoice.create({ data: { workspaceId: data.workspaceId, accountId: data.accountId, planCode: data.planCode, amount: data.amount, currency: data.currency ?? "INR", status: data.status ?? "PENDING" } });
  }

  async updateInvoiceStatus(invoiceId: string, status: string, providerReference?: string): Promise<BillingInvoice> {
    return prisma.billingInvoice.update({
      where: { id: invoiceId },
      data: { status, providerReference, paidAt: status === "PAID" ? new Date() : undefined },
    });
  }

  async findPlanByCode(code: string) {
    return prisma.billingPlan.findUnique({ where: { code } });
  }

  async findPlanFeatures(planId: string) {
    return prisma.billingPlanFeature.findMany({
      where: { planId },
      include: { feature: true },
    });
  }

  async isDuplicateEvent(idempotencyKey: string): Promise<boolean> {
    const existing = await prisma.billingEvent.findUnique({ where: { idempotencyKey } });
    return !!existing;
  }
}

export const billingRepository = new BillingRepository();
