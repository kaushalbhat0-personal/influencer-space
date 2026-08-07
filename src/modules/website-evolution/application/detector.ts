// ── Opportunity Detection (Phase 2) ─────────────────────────
// Detects evolution opportunities from GROWTH signals (product/gallery/
// testimonial/booking/faq thresholds + goals). Pure and deterministic — it
// never changes anything. Before/after scores are computed once per detection
// (no duplicate calculations).

import type { RuntimeContext } from "@/modules/runtime-context";
import { computeBusinessHealth } from "@/modules/business-health";
import type { HealthEvalDeps } from "@/modules/business-health";
import { computeConversionScore, computeTrustProfile, trustInputFrom } from "@/modules/experience-intelligence";
import { EVOLUTION_REGISTRY, capLift } from "../domain/registry";
import type { EvolutionHistory, EvolutionOpportunity } from "../domain/types";

export function detectOpportunities(
  ctx: RuntimeContext,
  history: EvolutionHistory,
  deps: HealthEvalDeps,
): EvolutionOpportunity[] {
  const beforeHealth = computeBusinessHealth(ctx, deps).overallScore;
  const beforeConversion = computeConversionScore(ctx).overall;
  const beforeTrust = computeTrustProfile(trustInputFrom(ctx)).score;

  const opportunities: EvolutionOpportunity[] = [];

  for (const def of EVOLUTION_REGISTRY) {
    const entry = history[def.id];
    if (entry && (entry.status === "applied" || entry.status === "rejected")) continue;
    if (!def.when(ctx)) continue;

    const before = { health: beforeHealth, conversion: beforeConversion, trust: beforeTrust };
    const after = {
      health: capLift(beforeHealth + def.expectedLift.health),
      conversion: capLift(beforeConversion + def.expectedLift.conversion),
      trust: capLift(beforeTrust + def.expectedLift.trust),
    };

    opportunities.push({
      id: def.id,
      title: def.title,
      reason: def.reason,
      expectedLift: def.expectedLift,
      estimatedEffort: def.estimatedEffort,
      applicableGoals: def.applicableGoals,
      change: def.change,
      before,
      after,
      roi: Math.round(((def.expectedLift.health + def.expectedLift.conversion) / Math.max(1, def.estimatedEffort)) * 100) / 100,
      status: entry?.status ?? "detected",
    });
  }

  return opportunities.sort((a, b) => b.roi - a.roi);
}
