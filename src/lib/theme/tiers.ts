/**
 * Theme tier assignment — IMPLEMENTATION-25.
 *
 * The SINGLE data source that assigns a subscription tier to every theme in
 * the catalog. Distribution: 5 free · 10 starter (15) · 15 pro (30) ·
 * 20 business (50). Enterprise covers future premium releases.
 *
 * Data-driven: retiering or adding theme #51+ is a configuration change only.
 */
import type { ThemeDefinition, ThemeTier } from "./types-new";
import { tierRank } from "./access";

export const THEME_TIER_BY_ID: Record<string, ThemeTier> = {
  // ── FREE (5) ──
  "com.creatos.creator-studio": "free",
  "com.creatos.neon-dark": "free",
  "com.creatos.creator-dark": "free",
  "com.creatos.business-minimal": "free",
  "com.creatos.education-academy": "free",
  // ── STARTER (10 → 15 total) ──
  "com.creatos.creator-light": "starter",
  "com.creatos.creator-bold": "starter",
  "com.creatos.gaming-neon": "starter",
  "com.creatos.streaming-purple": "starter",
  "com.creatos.photography-light": "starter",
  "com.creatos.music-festival": "starter",
  "com.creatos.corporate-blue": "starter",
  "com.creatos.coach": "starter",
  "com.creatos.podcast-studio": "starter",
  "com.creatos.professional": "starter",
  // ── PRO (15 → 30 total) ──
  "com.creatos.creator-gold": "pro",
  "com.creatos.creator-neon": "pro",
  "com.creatos.creator-midnight": "pro",
  "com.creatos.creator-glass": "pro",
  "com.creatos.creator-pro": "pro",
  "com.creatos.stream-vibe": "pro",
  "com.creatos.gaming-cyber": "pro",
  "com.creatos.gaming-matrix": "pro",
  "com.creatos.streaming-green": "pro",
  "com.creatos.corporate-modern": "pro",
  "com.creatos.corporate-black": "pro",
  "com.creatos.music-stage": "pro",
  "com.creatos.fitness-energy": "pro",
  "com.creatos.luxury-champagne": "pro",
  "com.creatos.executive": "pro",
  // ── BUSINESS (20 → 50 total) ──
  "com.creatos.startup": "business",
  "com.creatos.midnight-ocean": "business",
  "com.creatos.minimal-portfolio": "business",
  "com.creatos.designer": "business",
  "com.creatos.photographer": "business",
  "com.creatos.cyber-arena": "business",
  "com.creatos.esports": "business",
  "com.creatos.game-stream": "business",
  "com.creatos.royal-plum": "business",
  "com.creatos.luxury-gold": "business",
  "com.creatos.luxury-ivory": "business",
  "com.creatos.fashion": "business",
  "com.creatos.forest-canopy": "business",
  "com.creatos.modern-restaurant": "business",
  "com.creatos.fine-dining": "business",
  "com.creatos.bistro": "business",
  "com.creatos.academy": "business",
  "com.creatos.mentor": "business",
  "com.creatos.audio-creator": "business",
  "com.creatos.voice": "business",
  // ── ENTERPRISE (future premium releases; none assigned today) ──
};

/** Resolve a theme's tier: explicit field wins, else the catalog map, else free. */
export function getThemeTier(theme: Pick<ThemeDefinition, "id" | "tier">): ThemeTier {
  if (theme.tier) return theme.tier;
  return THEME_TIER_BY_ID[theme.id] ?? "free";
}

import { planTier as planTierFor } from "./access";

/** True when the theme is included in the given plan's unlocked band. */
export function themeUnlockedForPlan(
  theme: Pick<ThemeDefinition, "id" | "tier">,
  plan: string | null | undefined,
): boolean {
  return tierRank(getThemeTier(theme)) <= tierRank(planTierFor(plan));
}
