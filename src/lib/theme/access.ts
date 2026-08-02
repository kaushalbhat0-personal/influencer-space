/**
 * Theme subscription access — IMPLEMENTATION-25.
 *
 * Maps a creator's subscription plan to a theme tier band and answers whether
 * a given theme is unlocked. Single source of truth for marketplace gating
 * (lock badges, upgrade CTAs, apply blocking). No theme logic is hardcoded in
 * the UI; everything flows through this module.
 */
import type { ThemeTier } from "./types-new";
import { THEME_TIERS } from "./types-new";

export function tierRank(tier: ThemeTier): number {
  return THEME_TIERS.indexOf(tier);
}

/** Theme count unlocked per plan tier (ENTERPRISE = unlimited/future). */
export const TIER_THEME_LIMITS: Record<ThemeTier, number> = {
  free: 5,
  starter: 15,
  pro: 30,
  business: 50,
  enterprise: Number.POSITIVE_INFINITY,
};

const PLAN_TO_TIER: Record<string, ThemeTier> = {
  FREE: "free",
  STARTER: "starter",
  PRO: "pro",
  GROWTH: "business",
  ENTERPRISE: "enterprise",
  FREELANCER: "free",
  creator_free: "free",
  creator_pro: "pro",
  creator_elite: "business",
  agency_free: "free",
  agency_studio: "business",
  agency_agency: "enterprise",
};

export function planTier(plan: string | null | undefined): ThemeTier {
  if (!plan) return "free";
  return PLAN_TO_TIER[plan.toUpperCase()] ?? "free";
}

export function isThemeUnlocked(tier: ThemeTier | undefined, plan: string | null | undefined): boolean {
  const t = tier ?? "free";
  return tierRank(t) <= tierRank(planTier(plan));
}

/** The next tier a plan needs to upgrade to unlock more themes. */
export function nextTier(plan: string | null | undefined): ThemeTier {
  const cur = planTier(plan);
  const idx = THEME_TIERS.indexOf(cur);
  return THEME_TIERS[Math.min(idx + 1, THEME_TIERS.length - 1)] ?? "enterprise";
}
