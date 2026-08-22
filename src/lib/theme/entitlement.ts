/**
 * Server-side theme entitlement — IMPLEMENTATION-33.
 *
 * Pure decision used by applyThemePackage (the server is authoritative; client
 * locks are visual only). Flows through the canonical plan resolution +
 * CapabilityService premium_themes capability.
 */
import { capabilityService } from "@/lib/capabilities";
import { canonicalPlanCode, planTierFor } from "@/lib/capabilities/plan-resolution";
import { tierRank } from "./access";
import type { ThemeTier } from "./types-new";

export interface ThemeEntitlementDecision {
  allowed: boolean;
  reason?: string;
}

export function themeEntitlementDecision(
  tier: ThemeTier,
  planValue: string | null | undefined,
): ThemeEntitlementDecision {
  if (tier === "free") return { allowed: true };
  const canonical = canonicalPlanCode(planValue);
  if (!canonical) return { allowed: false, reason: "premium_themes:no_plan" };
  const check = capabilityService.can(canonical, "premium_themes");
  if (!check.allowed) return { allowed: false, reason: check.reason ?? "premium_themes:requires_upgrade" };
  // RCCF-71.4.5 (F2): the server must agree with the marketplace tier-band
  // lock. premium_themes alone is insufficient — a theme whose tier exceeds
  // the user's canonical plan tier is NOT allowed (e.g. a business-tier theme
  // on creator_grow). Reuses the canonical PLAN_TO_TIER registry (no duplicate
  // matrix, no hardcoded plan/tier names).
  if (tierRank(tier) > tierRank(planTierFor(canonical))) {
    return { allowed: false, reason: "theme_tier:plan_too_low" };
  }
  return { allowed: true };
}
