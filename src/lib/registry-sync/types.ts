export type SyncOperation = "create" | "update" | "delete" | "skip";

export type SyncEntityType = "plan" | "pricing" | "revenueConfig" | "billingConfig" | "commissionPolicy";

export interface SyncDiffEntry {
  entity: SyncEntityType;
  key: string;
  operation: SyncOperation;
  source: unknown;
  target: unknown | null;
}

export interface SchemaVersionInfo {
  required: string;
  installed: string | null;
  compatible: boolean;
  upgradedAt: string | null;
}

export interface SyncReport {
  startedAt: string;
  completedAt: string;
  durationMs: number;
  schemaMissing: string[];
  schemaVersion: SchemaVersionInfo;
  sourcePlanCount: number;
  targetPlanCount: number;
  diffs: SyncDiffEntry[];
  created: { plans: string[]; pricings: string[]; revenueConfigs: string[]; billingConfigs: string[]; commissionPolicies: string[] };
  updated: { plans: string[]; pricings: string[]; revenueConfigs: string[]; billingConfigs: string[]; commissionPolicies: string[] };
  deleted: { plans: string[]; pricings: string[]; revenueConfigs: string[]; billingConfigs: string[]; commissionPolicies: string[] };
  errors: string[];
  dryRun: boolean;
}

export interface SyncSummary {
  totalDiffs: number;
  createdCount: number;
  updatedCount: number;
  deletedCount: number;
  errorCount: number;
  schemaMissing: string[];
  isClean: boolean;
}

export interface SyncOptions {
  dryRun?: boolean;
  planCodes?: string[];
}

export interface RegistrySyncService {
  sync(options?: SyncOptions): Promise<SyncReport>;
  validate(): Promise<SyncReport>;
  getDiff(options?: SyncOptions): Promise<SyncReport>;
}

export interface RegistrySyncRepository {
  checkSchema(): Promise<string[]>;
  getSchemaVersion(): Promise<string | null>;
  getTargetPlans(): Promise<TargetPlan[]>;
  getTargetPricings(): Promise<TargetPricing[]>;
  getTargetRevenueConfig(): Promise<TargetRevenueConfig | null>;
  getTargetBillingConfig(): Promise<TargetBillingConfig | null>;
  getTargetCommissionPolicy(): Promise<TargetCommissionPolicy | null>;
  upsertPlan(plan: SourcePlan): Promise<void>;
  upsertPricing(pricing: SourcePricing): Promise<void>;
  upsertRevenueConfig(config: SourceRevenueConfig): Promise<void>;
  upsertBillingConfig(config: SourceBillingConfig): Promise<void>;
  upsertCommissionPolicy(policy: SourceCommissionPolicy): Promise<void>;
  deletePlan(planCode: string): Promise<void>;
  deletePricing(planCode: string): Promise<void>;
}

export interface SourcePlan {
  code: string;
  family: string;
  name: string;
  price: number;
  currency: string;
  cycle: string;
}

export interface TargetPlan {
  id: string;
  code: string;
  family: string;
  name: string;
  price: number;
  currency: string;
  cycle: string;
  status: string;
  version: number;
}

export interface SourcePricing {
  planCode: string;
  workspaceType: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
}

export interface TargetPricing {
  id: string;
  planCode: string;
  workspaceType: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  status: string;
  version: number;
}

export interface SourceRevenueConfig {
  defaultCurrency: string;
  defaultTrialDays: number;
  gracePeriodDays: number;
  invoicePrefix: string;
  autoRenew: boolean;
  refundWindowDays: number;
  prorationEnabled: boolean;
}

export interface TargetRevenueConfig {
  id: string;
  status: string;
  defaultCurrency: string;
  defaultTrialDays: number;
  gracePeriodDays: number;
  invoicePrefix: string;
  autoRenew: boolean;
  refundWindowDays: number;
  prorationEnabled: boolean;
  version: number;
}

export interface SourceBillingConfig {
  taxMode: string;
  cancellationPolicy: string;
  defaultRegion: string;
}

export interface TargetBillingConfig {
  id: string;
  status: string;
  taxMode: string;
  cancellationPolicy: string;
  defaultRegion: string;
  version: number;
}

export interface SourceCommissionPolicy {
  agencyClientPercent: number;
  platformPercent: number;
  referralPercent: number;
  creatorDefaultShare: number;
  agencyDefaultShare: number;
}

export interface TargetCommissionPolicy {
  id: string;
  status: string;
  agencyClientPercent: number;
  platformPercent: number;
  referralPercent: number;
  creatorDefaultShare: number;
  agencyDefaultShare: number;
  version: number;
}

export const REQUIRED_SCHEMA_VERSION = "1.0.0";

export const REQUIRED_RUNTIME_TABLES = [
  "CommercialPricing",
  "RevenueConfiguration",
  "BillingConfiguration",
  "CommissionPolicy",
];

export const RUNTIME_TABLE_NAMES: Record<string, string> = {
  CommercialPricing: "CommercialPricing",
  RevenueConfiguration: "RevenueConfiguration",
  BillingConfiguration: "BillingConfiguration",
  CommissionPolicy: "CommissionPolicy",
};
