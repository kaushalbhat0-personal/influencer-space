/**
 * Canonical plan resolution — IMPLEMENTATION-33.
 *
 * The SINGLE plan resolution helper. Every consumer resolves plans through this
 * module (or CapabilityService/BillingPlan) — never by comparing raw strings.
 *
 * Consolidates the previous scattered mappings:
 *   - lib/capabilities LEGACY_PLAN_MAP (legacy string → canonical code)
 *   - lib/theme/access PLAN_TO_TIER (plan → theme tier band)
 *   - local display maps (e.g. builder-overview resolvePlanCode)
 * into one config-driven mapping.
 */
import type { ThemeTier } from "@/lib/theme/types-new";
import { getPlan } from "./plans";
import type { PlanDefinition } from "./types";
import { LEGACY_PLAN_MAP, PLAN_CODES, DEFAULT_PLAN_CODE } from "./constants";
import { LEGACY_TO_CANONICAL } from "@/config/commerce/plans";

/** Consolidated plan → theme tier band (legacy + canonical codes). */
const PLAN_TO_TIER: Record<string, ThemeTier> = {
  FREE: "free",
  STARTER: "free",
  PRO: "pro",
  GROWTH: "business",
  ENTERPRISE: "enterprise",
  FREELANCER: "free",
  creator_launch: "free",
  creator_grow: "pro",
  creator_scale: "business",
  creator_enterprise: "enterprise",
  creator_free: "free",
  creator_pro: "pro",
  creator_elite: "business",
  partner_free: "free",
  partner_solo: "business",
  partner_scale: "enterprise",
  partner_enterprise: "enterprise",
  agency_free: "free",
  agency_studio: "business",
  agency_starter: "business",
  agency_growth: "business",
};

const DISPLAY_FALLBACK: Record<string, string> = {
  creator_launch: "Creator Launch",
  creator_grow: "Creator Grow",
  creator_scale: "Creator Scale",
  creator_enterprise: "Creator Enterprise",
  partner_free: "Partner Free",
  partner_solo: "Solo Partner",
  partner_scale: "Partner Scale",
  partner_enterprise: "Partner Enterprise",
  agency_free: "Partner Free",
  agency_studio: "Solo Partner",
  agency_starter: "Solo Partner",
  agency_growth: "Partner Scale",
};

export type PlanOrigin = "canonical" | "legacy" | "none";

export interface ResolvedPlan {
  /** Canonical plan code (legacy values resolved to canonical; null when unknown). */
  code: string | null;
  /** Human display name. */
  displayName: string;
  family: "creator" | "agency" | null;
  /** Consolidated theme tier band for the plan. */
  tier: ThemeTier;
  /** True when the input was a legacy string plan (STARTER/PRO/...). */
  legacy: boolean;
  source: PlanOrigin;
  plan: PlanDefinition | null;
}

export function canonicalPlanCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  if ((PLAN_CODES as readonly string[]).includes(lower)) {
    return LEGACY_TO_CANONICAL[lower] ?? lower;
  }
  const upper = value.trim().toUpperCase();
  return LEGACY_PLAN_MAP[upper] ?? null;
}

const NONE: ResolvedPlan = {
  code: null,
  displayName: "Free",
  family: null,
  tier: "free",
  legacy: false,
  source: "none",
  plan: null,
};

export function resolvePlan(value: string | null | undefined): ResolvedPlan {
  if (!value) return NONE;
  const upper = value.trim().toUpperCase();
  const lower = value.trim().toLowerCase();

  let code: string | null = null;
  let source: PlanOrigin = "none";
  if ((PLAN_CODES as readonly string[]).includes(lower)) {
    code = LEGACY_TO_CANONICAL[lower] ?? lower;
    source = Object.prototype.hasOwnProperty.call(LEGACY_TO_CANONICAL, lower) ? "legacy" : "canonical";
  } else if (LEGACY_PLAN_MAP[upper]) {
    code = LEGACY_PLAN_MAP[upper];
    source = "legacy";
  }
  if (!code) return NONE;

  const plan = getPlan(code) ?? null;
  return {
    code,
    displayName: plan?.name ?? DISPLAY_FALLBACK[code] ?? code,
    family: plan?.family ?? (code.startsWith("agency") || code.startsWith("partner") ? "agency" : "creator"),
    tier: PLAN_TO_TIER[lower] ?? PLAN_TO_TIER[code] ?? "free",
    legacy: source === "legacy",
    source,
    plan,
  };
}

/** Theme tier band for any plan value (legacy or canonical). */
export function planTierFor(value: string | null | undefined): ThemeTier {
  return resolvePlan(value).tier;
}

export const DEFAULT_PLAN = resolvePlan(DEFAULT_PLAN_CODE);

/**
 * Reader migration registry — IMPLEMENTATION-33 diagnostics.
 * Records every consumer migrated from the legacy Subscription table to
 * BillingSubscription.plan.code. Dev/observability only.
 */
export const LEGACY_READER_MIGRATION_STATUS: Array<{ reader: string; migrated: boolean }> = [
  { reader: "Theme Marketplace", migrated: true },
  { reader: "Builder Overview", migrated: true },
  { reader: "Workspace plan chip", migrated: true },
  { reader: "Super Admin Subscriptions", migrated: true },
  { reader: "Super Admin Revenue", migrated: true },
  { reader: "Subscription Metrics (super-admin.service)", migrated: true },
  { reader: "Legacy Pro Counts", migrated: true },
];
