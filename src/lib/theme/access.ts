/**
 * Theme subscription access — IMPLEMENTATION-25/33.
 *
 * Maps a creator's subscription plan to a theme tier band and answers whether
 * a given theme is unlocked. Single source of truth for marketplace gating
 * (lock badges, upgrade CTAs, apply blocking). No theme logic is hardcoded in
 * the UI; everything flows through this module.
 *
 * IMPLEMENTATION-33: the plan→tier mapping now delegates to the canonical
 * resolver (lib/capabilities/plan-resolution) — no duplicate mapping here.
 */
import type { ThemeTier } from "./types-new";
import { THEME_TIERS } from "./types-new";
import { planTierFor } from "@/lib/capabilities/plan-resolution";

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

/** Theme tier band for any plan value (legacy string or canonical code). */
export function planTier(plan: string | null | undefined): ThemeTier {
  return planTierFor(plan);
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
