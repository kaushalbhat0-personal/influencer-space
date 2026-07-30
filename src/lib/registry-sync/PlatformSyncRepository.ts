import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { REQUIRED_RUNTIME_TABLES } from "./types";
import type {
  TargetPlan, TargetPricing, TargetRevenueConfig,
  TargetBillingConfig, TargetCommissionPolicy,
  SourcePlan, SourcePricing, SourceRevenueConfig,
  SourceBillingConfig, SourceCommissionPolicy,
} from "./types";

export class PlatformSyncRepository {
  async checkSchema(): Promise<string[]> {
    const missing: string[] = [];
    for (const table of REQUIRED_RUNTIME_TABLES) {
      try {
        const r = await prisma.$queryRawUnsafe(
          `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${table}') as "exists"`
        );
        const exists = (r as Record<string, unknown>[])[0]?.exists ?? false;
        if (!exists) missing.push(table);
      } catch {
        missing.push(table);
      }
    }
    return missing;
  }

  async getSchemaVersion(): Promise<string | null> {
    try {
      const r = await prisma.$queryRawUnsafe(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '_PlatformRuntimeSchema') as "exists"`
      );
      const tableExists = (r as Record<string, unknown>[])[0]?.exists ?? false;
      if (!tableExists) return null;

      const rows = await prisma.$queryRawUnsafe(
        `SELECT "version" FROM "_PlatformRuntimeSchema" ORDER BY "createdAt" DESC LIMIT 1`
      );
      const version = (rows as Record<string, unknown>[])[0]?.version;
      return typeof version === "string" ? version : null;
    } catch {
      return null;
    }
  }

  async getTargetPlans(): Promise<TargetPlan[]> {
    const plans = await prisma.billingPlan.findMany({ orderBy: { code: "asc" } });
    return plans.map((p) => ({
      id: p.id,
      code: p.code,
      family: p.family,
      name: p.name,
      price: p.price,
      currency: p.currency,
      cycle: p.cycle,
      status: p.status,
      version: p.version,
    }));
  }

  async getTargetPricings(): Promise<TargetPricing[]> {
    const pricings = await prisma.commercialPricing.findMany({ orderBy: { planCode: "asc" } });
    return pricings.map((p) => ({
      id: p.id,
      planCode: p.planCode,
      workspaceType: p.workspaceType,
      monthlyPrice: p.monthlyPrice,
      yearlyPrice: p.yearlyPrice,
      currency: p.currency,
      status: p.status,
      version: p.version,
    }));
  }

  async getTargetRevenueConfig(): Promise<TargetRevenueConfig | null> {
    const config = await prisma.revenueConfiguration.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { version: "desc" },
    });
    if (!config) return null;
    return {
      id: config.id,
      status: config.status,
      defaultCurrency: config.defaultCurrency,
      defaultTrialDays: config.defaultTrialDays,
      gracePeriodDays: config.gracePeriodDays,
      invoicePrefix: config.invoicePrefix,
      autoRenew: config.autoRenew,
      refundWindowDays: config.refundWindowDays,
      prorationEnabled: config.prorationEnabled,
      version: config.version,
    };
  }

  async getTargetBillingConfig(): Promise<TargetBillingConfig | null> {
    const config = await prisma.billingConfiguration.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { version: "desc" },
    });
    if (!config) return null;
    return {
      id: config.id,
      status: config.status,
      taxMode: config.taxMode,
      cancellationPolicy: config.cancellationPolicy,
      defaultRegion: config.defaultRegion,
      version: config.version,
    };
  }

  async getTargetCommissionPolicy(): Promise<TargetCommissionPolicy | null> {
    const policy = await prisma.commissionPolicy.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { version: "desc" },
    });
    if (!policy) return null;
    return {
      id: policy.id,
      status: policy.status,
      agencyClientPercent: policy.agencyClientPercent,
      platformPercent: policy.platformPercent,
      referralPercent: policy.referralPercent,
      creatorDefaultShare: policy.creatorDefaultShare,
      agencyDefaultShare: policy.agencyDefaultShare,
      version: policy.version,
    };
  }

  async upsertPlan(plan: SourcePlan): Promise<void> {
    await prisma.billingPlan.upsert({
      where: { code: plan.code },
      update: {
        family: plan.family,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        cycle: plan.cycle,
      },
      create: {
        code: plan.code,
        family: plan.family,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        cycle: plan.cycle,
      },
    });
  }

  async upsertPricing(pricing: SourcePricing): Promise<void> {
    const existing = await prisma.commercialPricing.findFirst({
      where: { planCode: pricing.planCode, status: "ACTIVE" },
      orderBy: { version: "desc" },
    });
    if (existing) {
      await prisma.commercialPricing.update({
        where: { id: existing.id },
        data: {
          workspaceType: pricing.workspaceType,
          monthlyPrice: pricing.monthlyPrice,
          yearlyPrice: pricing.yearlyPrice,
          currency: pricing.currency,
        },
      });
    } else {
      await prisma.commercialPricing.create({
        data: {
          planCode: pricing.planCode,
          workspaceType: pricing.workspaceType,
          monthlyPrice: pricing.monthlyPrice,
          yearlyPrice: pricing.yearlyPrice,
          currency: pricing.currency,
        },
      });
    }
  }

  async upsertRevenueConfig(config: SourceRevenueConfig): Promise<void> {
    const existing = await this.getTargetRevenueConfig();
    if (existing) {
      await prisma.revenueConfiguration.update({
        where: { id: existing.id },
        data: { ...config, status: "ACTIVE" },
      });
    } else {
      await prisma.revenueConfiguration.create({
        data: { ...config, status: "ACTIVE" } as Prisma.RevenueConfigurationCreateInput,
      });
    }
  }

  async upsertBillingConfig(config: SourceBillingConfig): Promise<void> {
    const existing = await this.getTargetBillingConfig();
    if (existing) {
      await prisma.billingConfiguration.update({
        where: { id: existing.id },
        data: { ...config, status: "ACTIVE" },
      });
    } else {
      await prisma.billingConfiguration.create({
        data: { ...config, status: "ACTIVE" } as Prisma.BillingConfigurationCreateInput,
      });
    }
  }

  async upsertCommissionPolicy(policy: SourceCommissionPolicy): Promise<void> {
    const existing = await this.getTargetCommissionPolicy();
    if (existing) {
      await prisma.commissionPolicy.update({
        where: { id: existing.id },
        data: { ...policy, status: "ACTIVE" },
      });
    } else {
      await prisma.commissionPolicy.create({
        data: { ...policy, status: "ACTIVE" } as Prisma.CommissionPolicyCreateInput,
      });
    }
  }

  async deletePlan(planCode: string): Promise<void> {
    await prisma.billingPlanFeature.deleteMany({ where: { plan: { code: planCode } } });
    await prisma.billingPlan.delete({ where: { code: planCode } });
  }

  async deletePricing(planCode: string): Promise<void> {
    await prisma.commercialPricing.deleteMany({ where: { planCode } });
  }
}
