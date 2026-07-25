import type { UsageQuota } from "./types";
import type { UsageMetric } from "./constants";
import { USAGE_METRICS } from "./constants";

export interface PlanLimits {
  max_products: number;
  gallery_limit: number;
  storage_gb: number;
  orders_limit: number;
  messages_limit: number;
  [key: string]: number;
}

export interface UsageCounts {
  products: number;
  gallery: number;
  storageUsed?: number;
  orders: number;
  messages?: number;
}

const METRIC_CONFIG: Record<
  UsageMetric,
  { label: string; unit: string; planKey: string; defaultLimit: number }
> = {
  products: { label: "Products", unit: "items", planKey: "max_products", defaultLimit: Infinity },
  gallery: { label: "Gallery Items", unit: "items", planKey: "gallery_limit", defaultLimit: Infinity },
  storage: { label: "Storage", unit: "GB", planKey: "storage_gb", defaultLimit: Infinity },
  orders: { label: "Orders", unit: "orders", planKey: "orders_limit", defaultLimit: Infinity },
  messages: { label: "Messages", unit: "messages", planKey: "messages_limit", defaultLimit: Infinity },
};

function resolveLimit(planKey: string, features: Record<string, unknown>): number {
  const val = features[planKey];
  if (typeof val === "number") return val === -1 ? Infinity : val;
  return Infinity;
}

export function computeUsage(
  counts: UsageCounts,
  features: Record<string, unknown>,
): UsageQuota[] {
  return USAGE_METRICS.map((metric) => {
    const config = METRIC_CONFIG[metric];
    const used = counts[metric as keyof UsageCounts] ?? 0;
    const limit = resolveLimit(config.planKey, features);
    return {
      metric,
      label: config.label,
      used: used as number,
      limit,
      unit: config.unit,
    };
  });
}

export type UsageStatus = "ok" | "warning" | "over_limit";

export function getUsageStatus(used: number, limit: number, warningThreshold = 0.8): UsageStatus {
  if (limit === Infinity) return "ok";
  if (used >= limit) return "over_limit";
  if (used >= limit * warningThreshold) return "warning";
  return "ok";
}

export function getUsagePercentage(used: number, limit: number): number {
  if (limit === Infinity || limit === 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function isMetricOverLimit(quota: UsageQuota): boolean {
  return quota.limit !== Infinity && quota.used >= quota.limit;
}

export function getMetricsOverLimit(quotas: UsageQuota[]): UsageQuota[] {
  return quotas.filter(isMetricOverLimit);
}

export function getMetricsAtWarning(quotas: UsageQuota[], warningThreshold = 0.8): UsageQuota[] {
  return quotas.filter(
    (q) => q.limit !== Infinity && q.used >= q.limit * warningThreshold && q.used < q.limit,
  );
}

export function formatUsageDisplay(used: number, limit: number, unit: string): string {
  if (limit === Infinity) return `${used} ${unit}`;
  return `${used} / ${limit} ${unit}`;
}

export function buildDefaultFeatures(family: "creator" | "agency"): Record<string, unknown> {
  if (family === "agency") {
    return {
      max_products: 100,
      gallery_limit: 100,
      storage_gb: 50,
      orders_limit: 10000,
      messages_limit: 5000,
      custom_domain: true,
      custom_branding: true,
      max_websites: 10,
      max_team_members: 10,
      analytics_advanced: true,
      api_access: true,
      priority_support: true,
      ai_automation: true,
      max_clients: 50,
      white_label: true,
    };
  }
  return {
    max_products: 10,
    gallery_limit: 50,
    storage_gb: 5,
    orders_limit: 500,
    messages_limit: 1000,
    custom_domain: false,
    custom_branding: false,
    max_websites: 1,
    max_team_members: 1,
    analytics_advanced: false,
    api_access: false,
    priority_support: false,
    ai_automation: false,
    max_clients: 0,
    white_label: false,
  };
}
