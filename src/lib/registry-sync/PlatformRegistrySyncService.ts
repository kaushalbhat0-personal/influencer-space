import { getAllPlans } from "@/lib/capabilities/plans";
import type { PlanDefinition } from "@/lib/capabilities/types";
import { PlatformSyncRepository } from "./PlatformSyncRepository";
import { REQUIRED_RUNTIME_TABLES, REQUIRED_SCHEMA_VERSION } from "./types";
import type {
  SyncReport, SyncDiffEntry, SyncOptions, SchemaVersionInfo,
  SourcePlan, SourcePricing,
  SourceRevenueConfig, SourceBillingConfig, SourceCommissionPolicy,
} from "./types";

export class PlatformRegistrySyncService {
  private repo: PlatformSyncRepository;

  constructor(repo?: PlatformSyncRepository) {
    this.repo = repo ?? new PlatformSyncRepository();
  }

  async checkSchema(): Promise<string[]> {
    return this.repo.checkSchema();
  }

  async getSchemaVersion(): Promise<SchemaVersionInfo> {
    const installed = await this.repo.getSchemaVersion();
    return {
      required: REQUIRED_SCHEMA_VERSION,
      installed,
      compatible: installed === REQUIRED_SCHEMA_VERSION,
      upgradedAt: null,
    };
  }

  async sync(options: SyncOptions = {}): Promise<SyncReport> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const errors: string[] = [];
    const created = { plans: [] as string[], pricings: [] as string[], revenueConfigs: [] as string[], billingConfigs: [] as string[], commissionPolicies: [] as string[] };
    const updated = { plans: [] as string[], pricings: [] as string[], revenueConfigs: [] as string[], billingConfigs: [] as string[], commissionPolicies: [] as string[] };
    const deleted = { plans: [] as string[], pricings: [] as string[], revenueConfigs: [] as string[], billingConfigs: [] as string[], commissionPolicies: [] as string[] };
    const diffs: SyncDiffEntry[] = [];

    const schemaMissing = await this.repo.checkSchema();
    const schemaVersion = await this.getSchemaVersion();

    let targetPlans: Awaited<ReturnType<PlatformSyncRepository["getTargetPlans"]>> = [];
    let targetPricings: Awaited<ReturnType<PlatformSyncRepository["getTargetPricings"]>> = [];
    const allSourcePlans = getAllPlans();

    if (schemaMissing.length > 0 || !schemaVersion.compatible) {
      const completedAt = new Date().toISOString();
      return {
        startedAt, completedAt,
        durationMs: Date.now() - startTime,
        schemaMissing,
        schemaVersion,
        sourcePlanCount: allSourcePlans.length,
        targetPlanCount: 0,
        diffs, created, updated, deleted, errors, dryRun: options.dryRun ?? false,
      };
    }

    try {
      const results = await Promise.all([
        this.repo.getTargetPlans(),
        this.repo.getTargetPricings(),
        this.repo.getTargetRevenueConfig(),
        this.repo.getTargetBillingConfig(),
        this.repo.getTargetCommissionPolicy(),
      ]);
      targetPlans = results[0];
      targetPricings = results[1];
      const targetRevenueConfig = results[2];
      const targetBillingConfig = results[3];
      const targetCommissionPolicy = results[4];

      const targetPlanMap = new Map(targetPlans.map((p) => [p.code, p]));
      const targetPricingMap = new Map(targetPricings.map((p) => [p.planCode, p]));

      const filteredPlans: PlanDefinition[] = options.planCodes
        ? allSourcePlans.filter((p) => options.planCodes!.includes(p.code))
        : allSourcePlans;

      // Sync plans
      for (const plan of filteredPlans) {
        try {
          const sourcePlan: SourcePlan = {
            code: plan.code,
            family: plan.family,
            name: plan.name,
            price: plan.price,
            currency: plan.currency,
            cycle: plan.cycle ?? "monthly",
          };
          const existingPlan = targetPlanMap.get(plan.code);
          if (!existingPlan) {
            if (!options.dryRun) await this.repo.upsertPlan(sourcePlan);
            created.plans.push(plan.code);
            diffs.push({ entity: "plan", key: plan.code, operation: "create", source: sourcePlan, target: null });
          } else if (
            existingPlan.family !== sourcePlan.family ||
            existingPlan.name !== sourcePlan.name ||
            existingPlan.price !== sourcePlan.price ||
            existingPlan.currency !== sourcePlan.currency ||
            existingPlan.cycle !== sourcePlan.cycle
          ) {
            if (!options.dryRun) await this.repo.upsertPlan(sourcePlan);
            updated.plans.push(plan.code);
            diffs.push({ entity: "plan", key: plan.code, operation: "update", source: sourcePlan, target: existingPlan });
          }
        } catch (e) {
          errors.push(`Plan ${plan.code}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // Sync commercial pricing
      for (const plan of filteredPlans) {
        try {
          const yearlyPrice = plan.cycle === "annual" ? plan.price : Math.round(plan.price * 10 * 12) / 10;
          const monthlyPrice = plan.cycle === "monthly" ? plan.price : Math.round(plan.price / 12 * 10) / 10;
          const sourcePricing: SourcePricing = {
            planCode: plan.code,
            workspaceType: plan.family,
            monthlyPrice,
            yearlyPrice,
            currency: plan.currency,
          };
          const existingPricing = targetPricingMap.get(plan.code);
          if (!existingPricing) {
            if (!options.dryRun) await this.repo.upsertPricing(sourcePricing);
            created.pricings.push(plan.code);
            diffs.push({ entity: "pricing", key: plan.code, operation: "create", source: sourcePricing, target: null });
          } else if (
            existingPricing.monthlyPrice !== sourcePricing.monthlyPrice ||
            existingPricing.yearlyPrice !== sourcePricing.yearlyPrice ||
            existingPricing.currency !== sourcePricing.currency ||
            existingPricing.workspaceType !== sourcePricing.workspaceType
          ) {
            if (!options.dryRun) await this.repo.upsertPricing(sourcePricing);
            updated.pricings.push(plan.code);
            diffs.push({ entity: "pricing", key: plan.code, operation: "update", source: sourcePricing, target: existingPricing });
          }
        } catch (e) {
          errors.push(`Pricing for ${plan.code}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // Sync RevenueConfiguration (singleton — defaults)
      try {
        const sourceRevenueConfig: SourceRevenueConfig = {
          defaultCurrency: "INR",
          defaultTrialDays: 14,
          gracePeriodDays: 7,
          invoicePrefix: "INV",
          autoRenew: true,
          refundWindowDays: 30,
          prorationEnabled: true,
        };
        if (!targetRevenueConfig) {
          if (!options.dryRun) await this.repo.upsertRevenueConfig(sourceRevenueConfig);
          created.revenueConfigs.push("default");
          diffs.push({ entity: "revenueConfig", key: "default", operation: "create", source: sourceRevenueConfig, target: null });
        } else if (
          targetRevenueConfig.defaultCurrency !== sourceRevenueConfig.defaultCurrency ||
          targetRevenueConfig.defaultTrialDays !== sourceRevenueConfig.defaultTrialDays ||
          targetRevenueConfig.gracePeriodDays !== sourceRevenueConfig.gracePeriodDays ||
          targetRevenueConfig.invoicePrefix !== sourceRevenueConfig.invoicePrefix ||
          targetRevenueConfig.autoRenew !== sourceRevenueConfig.autoRenew ||
          targetRevenueConfig.refundWindowDays !== sourceRevenueConfig.refundWindowDays ||
          targetRevenueConfig.prorationEnabled !== sourceRevenueConfig.prorationEnabled
        ) {
          if (!options.dryRun) await this.repo.upsertRevenueConfig(sourceRevenueConfig);
          updated.revenueConfigs.push("default");
          diffs.push({ entity: "revenueConfig", key: "default", operation: "update", source: sourceRevenueConfig, target: targetRevenueConfig });
        }
      } catch (e) {
        errors.push(`RevenueConfig: ${e instanceof Error ? e.message : String(e)}`);
      }

      // Sync BillingConfiguration (singleton — defaults)
      try {
        const sourceBillingConfig: SourceBillingConfig = {
          taxMode: "exclusive",
          cancellationPolicy: "immediate",
          defaultRegion: "IN",
        };
        if (!targetBillingConfig) {
          if (!options.dryRun) await this.repo.upsertBillingConfig(sourceBillingConfig);
          created.billingConfigs.push("default");
          diffs.push({ entity: "billingConfig", key: "default", operation: "create", source: sourceBillingConfig, target: null });
        } else if (
          targetBillingConfig.taxMode !== sourceBillingConfig.taxMode ||
          targetBillingConfig.cancellationPolicy !== sourceBillingConfig.cancellationPolicy ||
          targetBillingConfig.defaultRegion !== sourceBillingConfig.defaultRegion
        ) {
          if (!options.dryRun) await this.repo.upsertBillingConfig(sourceBillingConfig);
          updated.billingConfigs.push("default");
          diffs.push({ entity: "billingConfig", key: "default", operation: "update", source: sourceBillingConfig, target: targetBillingConfig });
        }
      } catch (e) {
        errors.push(`BillingConfig: ${e instanceof Error ? e.message : String(e)}`);
      }

      // Sync CommissionPolicy (singleton — defaults)
      try {
        const sourceCommissionPolicy: SourceCommissionPolicy = {
          agencyClientPercent: 20,
          platformPercent: 10,
          referralPercent: 5,
          creatorDefaultShare: 70,
          agencyDefaultShare: 30,
        };
        if (!targetCommissionPolicy) {
          if (!options.dryRun) await this.repo.upsertCommissionPolicy(sourceCommissionPolicy);
          created.commissionPolicies.push("default");
          diffs.push({ entity: "commissionPolicy", key: "default", operation: "create", source: sourceCommissionPolicy, target: null });
        } else if (
          targetCommissionPolicy.agencyClientPercent !== sourceCommissionPolicy.agencyClientPercent ||
          targetCommissionPolicy.platformPercent !== sourceCommissionPolicy.platformPercent ||
          targetCommissionPolicy.referralPercent !== sourceCommissionPolicy.referralPercent ||
          targetCommissionPolicy.creatorDefaultShare !== sourceCommissionPolicy.creatorDefaultShare ||
          targetCommissionPolicy.agencyDefaultShare !== sourceCommissionPolicy.agencyDefaultShare
        ) {
          if (!options.dryRun) await this.repo.upsertCommissionPolicy(sourceCommissionPolicy);
          updated.commissionPolicies.push("default");
          diffs.push({ entity: "commissionPolicy", key: "default", operation: "update", source: sourceCommissionPolicy, target: targetCommissionPolicy });
        }
      } catch (e) {
        errors.push(`CommissionPolicy: ${e instanceof Error ? e.message : String(e)}`);
      }

      // Detect orphaned target plans (if not filtered by planCodes)
      if (!options.planCodes) {
        const sourceCodes = new Set(filteredPlans.map((p: PlanDefinition) => p.code));

        for (const tp of targetPlans) {
          if (!sourceCodes.has(tp.code)) {
            diffs.push({ entity: "plan", key: tp.code, operation: "delete", source: null, target: tp });
          }
        }
        for (const tpr of targetPricings) {
          if (!sourceCodes.has(tpr.planCode)) {
            diffs.push({ entity: "pricing", key: tpr.planCode, operation: "delete", source: null, target: tpr });
          }
        }

        if (!options.dryRun) {
          for (const tp of targetPlans) {
            if (!sourceCodes.has(tp.code)) {
              await this.repo.deletePlan(tp.code);
              deleted.plans.push(tp.code);
            }
          }
          for (const tpr of targetPricings) {
            if (!sourceCodes.has(tpr.planCode)) {
              await this.repo.deletePricing(tpr.planCode);
              deleted.pricings.push(tpr.planCode);
            }
          }
        }
      }
    } catch (e) {
      errors.push(`Sync failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    const completedAt = new Date().toISOString();

    return {
      startedAt,
      completedAt,
      durationMs: Date.now() - startTime,
      schemaMissing,
      schemaVersion,
      sourcePlanCount: allSourcePlans.length,
      targetPlanCount: targetPlans.length,
      diffs,
      created,
      updated,
      deleted,
      errors,
      dryRun: options.dryRun ?? false,
    };
  }

  async validate(options: SyncOptions = {}): Promise<SyncReport> {
    return this.sync({ ...options, dryRun: true });
  }

  async getDiff(options: SyncOptions = {}): Promise<SyncReport> {
    return this.sync({ ...options, dryRun: true });
  }
}
