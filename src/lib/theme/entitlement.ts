/**
 * Server-side theme entitlement — IMPLEMENTATION-33.
 *
 * Pure decision used by applyThemePackage (the server is authoritative; client
 * locks are visual only). Flows through the canonical plan resolution +
 * CapabilityService premium_themes capability.
 */
import { capabilityService } from "@/lib/capabilities";
import { canonicalPlanCode } from "@/lib/capabilities/plan-resolution";
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
  if (check.allowed) return { allowed: true };
  return { allowed: false, reason: check.reason ?? "premium_themes:requires_upgrade" };
}
