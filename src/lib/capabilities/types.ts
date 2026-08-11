import type { PlanFamily, FeatureId } from "./constants";

export interface PlanDefinition {
  code: string;
  family: PlanFamily;
  name: string;
  description: string;
  price: number;
  currency: string;
  features: Record<string, number | boolean | string>;
  recommended: boolean;
  badge: string;
  targetAudience?: string;
  cycle?: string;
  ctaLabel?: string;
  ctaType?: "signup" | "checkout" | "contact";
  legacyAliases?: string[];
  hidden?: boolean;
  sortOrder?: number;
}

export interface CapabilityCheck {
  allowed: boolean;
  limit?: number;
  remaining?: number;
  used?: number;
  reason?: string;
  suggestedUpgrade?: string;
}

export interface FeatureInfo {
  id: FeatureId;
  label: string;
  description: string;
  category: FeatureCategory;
  valueType: "boolean" | "numeric";
}

export type FeatureCategory =
  | "products"
  | "content"
  | "domain"
  | "branding"
  | "analytics"
  | "ai"
  | "team"
  | "api"
  | "support"
  | "storage";

export interface UsageContext {
  planCode: string;
  usage: Partial<Record<FeatureId, number>>;
}

export interface PlanSummary {
  code: string;
  name: string;
  family: PlanFamily;
  price: number;
  currency: string;
  features: Record<string, number | boolean | string>;
  featureCount: number;
  enabledFeatureCount: number;
}

export interface PlanComparison {
  from: string;
  to: string;
  addedFeatures: { id: FeatureId; label: string }[];
  upgradedLimits: { id: FeatureId; label: string; from: number; to: number }[];
  priceDifference: number;
  recommendation: string;
}

export interface UpgradeRecommendation {
  currentPlan: string;
  targetPlan: string;
  reason: string;
  priority: "high" | "medium" | "low";
  triggeredBy: { feature: FeatureId; used: number; limit: number }[];
}

export interface PlanFeature {
  id: FeatureId;
  value: number | boolean | string;
  effective: number | boolean;
}

export interface LimitCheck {
  featureId: FeatureId;
  planCode: string;
  limit: number;
  used: number;
  remaining: number;
  isUnlimited: boolean;
  isExceeded: boolean;
  usagePercent: number;
}
