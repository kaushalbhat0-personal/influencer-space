/**
 * Canonical Entitlements & Limits Runtime — IMPLEMENTATION-59
 *
 * Every plan capability is metadata-driven. This runtime is the single source
 * of truth for feature access, usage limits, quotas, and upgrade enforcement.
 * No hardcoded checks anywhere else.
 */
import { COMMERCE_PLANS, getCommercePlan } from "@/config/commerce/plans";

// ── Typed Capability Model ────────────────────────────────────
export type CapabilityType = "boolean" | "limit" | "monthly_limit" | "storage" | "enum" | "unlimited";

export interface TypedCapability {
  key: string;
  type: CapabilityType;
  value: number | boolean | string;
  label: string;
  category: string;
  unit?: string;
}

export interface PlanEntitlements {
  planCode: string;
  planName: string;
  planVersion?: number;
  capabilities: TypedCapability[];
  snapshotDate: string;
}

export interface UsageRecord {
  key: string;
  label: string;
  used: number;
  limit: number;
  remaining: number;
  isUnlimited: boolean;
  unit: string;
  category: string;
  usagePercent: number;
  status: "green" | "amber" | "red";
}

export interface LimitCheck {
  allowed: boolean;
  capability?: string;
  limit?: number;
  used?: number;
  remaining?: number;
  usagePercent?: number;
  status?: "green" | "amber" | "red";
  reason?: string;
  suggestedUpgrade?: string;
  upgradeBenefits?: string[];
}

function pctStatus(pct: number): "green" | "amber" | "red" {
  if (pct > 90) return "red";
  if (pct >= 70) return "amber";
  return "green";
}

function buildUpgradeBenefits(currentPlanCode: string, targetPlanCode: string): string[] {
  const current = getCommercePlan(currentPlanCode);
  const target = getCommercePlan(targetPlanCode);
  if (!current || !target) return [];
  const currentCaps = new Set(current.capabilities);
  return target.capabilities.filter((c) => !currentCaps.has(c)).slice(0, 4)
    .map((c) => CAPABILITY_CATALOG.find((x) => x.key === c)?.label ?? c);
}

// ── Capability Definitions ────────────────────────────────────

/** Canonical capability catalog with types, defaults, and metadata. */
export const CAPABILITY_CATALOG: TypedCapability[] = [
  { key: "premium_themes", type: "boolean", value: false, label: "Premium Themes", category: "Marketplace" },
  { key: "custom_domain", type: "boolean", value: false, label: "Custom Domain", category: "Domains" },
  { key: "advanced_builder", type: "boolean", value: false, label: "Advanced Builder", category: "Builder" },
  { key: "ai_generation", type: "boolean", value: false, label: "AI Content Generation", category: "AI" },
  { key: "advanced_ai", type: "boolean", value: false, label: "Advanced AI", category: "AI" },
  { key: "social_integrations", type: "boolean", value: false, label: "Social Integrations", category: "Commerce" },
  { key: "api_access", type: "boolean", value: false, label: "API Access", category: "Developer" },
  { key: "api_integrations", type: "boolean", value: false, label: "API Integrations", category: "Developer" },
  { key: "white_label", type: "boolean", value: false, label: "White Label", category: "Branding" },
  { key: "brand_removal", type: "boolean", value: false, label: "Brand Removal", category: "Branding" },
  { key: "advanced_analytics", type: "boolean", value: false, label: "Advanced Analytics", category: "Analytics" },
  { key: "priority_support", type: "boolean", value: false, label: "Priority Support", category: "Support" },
  { key: "basic_builder", type: "boolean", value: true, label: "Basic Website Builder", category: "Builder" },
  { key: "basic_themes", type: "boolean", value: true, label: "Basic Themes", category: "Marketplace" },
  { key: "creator_subdomain", type: "boolean", value: true, label: "Creator Subdomain", category: "Domains" },

  { key: "storage", type: "storage", value: 5, label: "Storage", category: "Storage", unit: "GB" },
  { key: "max_products", type: "limit", value: 10, label: "Products", category: "Commerce" },
  { key: "max_gallery", type: "limit", value: 20, label: "Gallery Images", category: "Content" },
  { key: "max_bookings", type: "limit", value: 10, label: "Bookings", category: "Commerce" },
  { key: "max_team_members", type: "limit", value: 1, label: "Team Members", category: "Team" },
  { key: "max_websites", type: "limit", value: 1, label: "Websites", category: "Website" },
  { key: "max_clients", type: "limit", value: 0, label: "Clients", category: "Team" },
  { key: "ai_credits", type: "monthly_limit", value: 500, label: "AI Credits", category: "AI", unit: "credits/mo" },
  { key: "theme_experience", type: "enum", value: "free", label: "Theme Experience", category: "Marketplace" },
];

const catalogByKey = new Map(CAPABILITY_CATALOG.map((c) => [c.key, c]));

// ── Plan → Entitlements Resolution ────────────────────────────

/** Build typed entitlements for a plan by merging the capability catalog with the plan's capability grants. */
export function resolvePlanEntitlements(planCode: string): PlanEntitlements {
  const plan = getCommercePlan(planCode);
  const planCapSet = new Set<string>(plan?.capabilities ?? []);

  const capabilities: TypedCapability[] = CAPABILITY_CATALOG.map((cat) => {
    if (cat.type === "boolean") {
      return { ...cat, value: planCapSet.has(cat.key) };
    }
    if (cat.type === "limit" || cat.type === "monthly_limit") {
      // Paid plans get higher limits; enterprise gets unlimited
      if (plan?.manual) return { ...cat, value: -1 }; // unlimited
      if (plan && (plan.price ?? 0) > 0) {
        const multipliers: Record<string, number> = {
          max_products: 50, max_gallery: 200, max_bookings: 100,
          max_team_members: 10, max_websites: 3, max_clients: 20,
        };
        return { ...cat, value: multipliers[cat.key] ?? (cat.value as number) * 5 };
      }
      return cat;
    }
    if (cat.type === "storage") {
      if (plan?.manual) return { ...cat, value: 500 };
      if (plan && (plan.price ?? 0) > 0) return { ...cat, value: 50 };
      return { ...cat, value: 5 };
    }
    if (cat.type === "enum") {
      if (plan?.manual) return { ...cat, value: "premium" };
      if (planCapSet.has("premium_themes")) return { ...cat, value: "professional" };
      return { ...cat, value: "free" };
    }
    return cat;
  });

  return {
    planCode,
    planName: plan?.name ?? planCode,
    planVersion: undefined,
    capabilities,
    snapshotDate: new Date().toISOString(),
  };
}

// ── Entitlement Runtime Service ───────────────────────────────

export const entitlementRuntime = {
  getCapability(key: string): TypedCapability | undefined {
    return catalogByKey.get(key);
  },

  getAllCapabilities(): TypedCapability[] {
    return CAPABILITY_CATALOG;
  },

  getCapabilitiesByCategory(): Map<string, TypedCapability[]> {
    const grouped = new Map<string, TypedCapability[]>();
    for (const cap of CAPABILITY_CATALOG) {
      const list = grouped.get(cap.category) ?? [];
      list.push(cap);
      grouped.set(cap.category, list);
    }
    return grouped;
  },

  /** Check if a plan has a boolean feature. */
  hasFeature(planCode: string, key: string): LimitCheck {
    const catalog = catalogByKey.get(key);
    if (!catalog) return { allowed: false, reason: "Unknown capability" };

    const plan = getCommercePlan(planCode);
    const hasCap = (plan?.capabilities as readonly string[])?.includes(key) ?? false;

    if (catalog.type === "boolean") {
      return { allowed: hasCap, reason: hasCap ? undefined : `${catalog.label} not available on this plan` };
    }
    return { allowed: hasCap, reason: hasCap ? undefined : "Capability not granted" };
  },

  /** Get the numeric limit for a plan capability. */
  getLimit(planCode: string, key: string): number {
    const entitlements = resolvePlanEntitlements(planCode);
    const cap = entitlements.capabilities.find((c) => c.key === key);
    if (!cap || cap.type === "boolean" || cap.type === "enum") return 0;
    const val = cap.value;
    if (typeof val !== "number") return 0;
    return val === -1 ? -1 : val;
  },

  /** Check a plan against current usage. */
  checkUsage(planCode: string, key: string, used: number): LimitCheck {
    const catalog = catalogByKey.get(key);
    if (!catalog) return { allowed: false, capability: key, reason: `Unknown capability: ${key}` };

    if (catalog.type === "boolean") {
      const r = this.hasFeature(planCode, key);
      return { ...r, capability: key };
    }

    const limit = this.getLimit(planCode, key);
    const usagePct = limit === -1 ? 0 : limit === 0 ? 100 : Math.round((used / limit) * 100);
    const status = pctStatus(usagePct);

    if (limit === -1) return { allowed: true, capability: key, limit: -1, used, remaining: Infinity, usagePercent: 0, status: "green" };
    if (limit === 0) return { allowed: false, capability: key, limit: 0, used, remaining: 0, usagePercent: 100, status: "red", reason: `Not available on this plan` };

    const remaining = Math.max(0, limit - used);
    if (remaining === 0) {
      const upgrade = findUpgradePlan(planCode, key);
      return {
        allowed: false, capability: key, limit, used, remaining: 0, usagePercent: 100, status: "red",
        reason: `${catalog.label} limit reached`,
        suggestedUpgrade: upgrade,
        upgradeBenefits: upgrade ? buildUpgradeBenefits(planCode, upgrade) : undefined,
      };
    }
    return { allowed: true, capability: key, limit, used, remaining, usagePercent: usagePct, status };
  },

  /** Get usage summary for a plan. */
  getUsage(planCode: string, used: Record<string, number>): UsageRecord[] {
    const entitlements = resolvePlanEntitlements(planCode);
    return entitlements.capabilities
      .filter((c) => c.type !== "boolean" && c.type !== "enum")
      .map((c) => {
        const limit = typeof c.value === "number" ? c.value : 0;
        const u = used[c.key] ?? 0;
        const pct = limit === -1 ? 0 : limit === 0 ? 100 : Math.round((u / limit) * 100);
        return {
          key: c.key, label: c.label, unit: c.unit ?? "", category: c.category,
          used: u, limit,
          remaining: limit === -1 ? Infinity : Math.max(0, limit - u),
          isUnlimited: limit === -1,
          usagePercent: pct,
          status: pctStatus(pct),
        };
      });
  },

  /** Enforce entitlement: check usage, return canonical response if disallowed, null if ok. */
  enforce(planCode: string, key: string, used: number): LimitCheck | null {
    const check = this.checkUsage(planCode, key, used);
    return check.allowed ? null : check;
  },
};

/** Find the next upgrade plan that grants a capability. */
function findUpgradePlan(currentPlanCode: string, key: string): string | undefined {
  const current = getCommercePlan(currentPlanCode);
  if (!current) return undefined;
  const family = current.family;
  const candidates = COMMERCE_PLANS.filter(
    (p) => p.family === family && (p.price ?? 0) > (current.price ?? 0) && (p.capabilities as readonly string[]).includes(key)
  ).sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  return candidates[0]?.code;
}
