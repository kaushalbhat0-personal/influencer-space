import { prisma } from "@/lib/prisma";
import type { Prisma, BillingSubscription, BillingInvoice, BillingEvent } from "@/generated/prisma/client";

export class BillingRepository {
  private client(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  async findSubscriptionByWorkspaceId(workspaceId: string, tx?: Prisma.TransactionClient): Promise<BillingSubscription | null> {
    return this.client(tx).billingSubscription.findUnique({ where: { workspaceId } });
  }

  async upsertSubscription(workspaceId: string, data: { planId: string; status: string; trialEndsAt?: Date | null; renewsAt?: Date | null }, tx?: Prisma.TransactionClient): Promise<BillingSubscription> {
    const existing = await this.client(tx).billingSubscription.findUnique({ where: { workspaceId } });
    if (existing) {
      return this.client(tx).billingSubscription.update({
        where: { workspaceId },
        data,
      });
    }
    return this.client(tx).billingSubscription.create({
      data: { accountId: workspaceId, workspaceId, ...data },
    });
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
    return this.client(tx).billingInvoice.create({
      data: {
        workspaceId: data.workspaceId, accountId: data.accountId, planCode: data.planCode,
        amount: data.amount, currency: data.currency ?? "INR", status: data.status ?? "PENDING",
      },
    });
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
