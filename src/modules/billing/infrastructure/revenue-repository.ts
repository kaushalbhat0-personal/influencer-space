import { prisma } from "@/lib/prisma";
import type { RevenueConfiguration, CommissionPolicy, BillingConfiguration, CommercialPricing } from "@/generated/prisma/client";

export class RevenueRepository {
  async getActiveRevenueConfig(): Promise<RevenueConfiguration | null> {
    return prisma.revenueConfiguration.findFirst({ where: { status: "ACTIVE" }, orderBy: { version: "desc" } });
  }

  async upsertRevenueConfig(data: { defaultCurrency?: string; defaultTrialDays?: number; gracePeriodDays?: number; invoicePrefix?: string; autoRenew?: boolean; refundWindowDays?: number; prorationEnabled?: boolean }): Promise<RevenueConfiguration> {
    const existing = await this.getActiveRevenueConfig();
    if (existing) {
      return prisma.revenueConfiguration.update({ where: { id: existing.id }, data: { ...data, status: "ACTIVE" } });
    }
    return prisma.revenueConfiguration.create({ data: { ...data, status: "ACTIVE" } as never });
  }

  async getActiveCommissionPolicy(): Promise<CommissionPolicy | null> {
    return prisma.commissionPolicy.findFirst({ where: { status: "ACTIVE" }, orderBy: { version: "desc" } });
  }

  async upsertCommissionPolicy(data: { agencyClientPercent?: number; platformPercent?: number; referralPercent?: number; creatorDefaultShare?: number; agencyDefaultShare?: number }): Promise<CommissionPolicy> {
    const existing = await this.getActiveCommissionPolicy();
    if (existing) {
      return prisma.commissionPolicy.update({ where: { id: existing.id }, data: { ...data, status: "ACTIVE" } });
    }
    return prisma.commissionPolicy.create({ data: { ...data, status: "ACTIVE" } as never });
  }

  async getActiveBillingConfig(): Promise<BillingConfiguration | null> {
    return prisma.billingConfiguration.findFirst({ where: { status: "ACTIVE" }, orderBy: { version: "desc" } });
  }

  async upsertBillingConfig(data: { taxMode?: string; cancellationPolicy?: string; defaultRegion?: string }): Promise<BillingConfiguration> {
    const existing = await this.getActiveBillingConfig();
    if (existing) {
      return prisma.billingConfiguration.update({ where: { id: existing.id }, data: { ...data, status: "ACTIVE" } });
    }
    return prisma.billingConfiguration.create({ data: { ...data, status: "ACTIVE" } as never });
  }

  async getPricingByPlan(planCode: string): Promise<CommercialPricing | null> {
    return prisma.commercialPricing.findFirst({ where: { planCode, status: "ACTIVE" }, orderBy: { version: "desc" } });
  }

  async getAllActivePricing(): Promise<CommercialPricing[]> {
    return prisma.commercialPricing.findMany({ where: { status: "ACTIVE" } });
  }
}

export const revenueRepository = new RevenueRepository();
