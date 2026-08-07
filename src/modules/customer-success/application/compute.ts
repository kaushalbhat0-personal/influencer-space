// ── Customer Success — Compute Engine ───────────────────────
// RCCF-EPIC-09. Combines the score, journey, risk and opportunity engines into
// one CustomerSuccess. Signal builders (context / db) feed the same engine.

import type { CustomerSuccess, SuccessSignals } from "../domain/types";
import { computeSuccessScore } from "./score";
import { resolveJourney, JOURNEY_STAGE_LABEL } from "./journey";
import { assessRisk } from "./risk";
import { detectOpportunities } from "./opportunities";

export function computeFromSignals(s: SuccessSignals): CustomerSuccess {
  const { overall, dimensions } = computeSuccessScore(s);
  const { stage, milestones, next } = resolveJourney(s);
  const { risk, findings } = assessRisk(s);
  const opportunities = detectOpportunities(s);

  const reachedCount = milestones.filter((m) => m.reached).length;
  const completionPercent = Math.round((reachedCount / milestones.length) * 100);

  return {
    tenantId: s.tenantId,
    score: overall,
    dimensions,
    stage,
    stageLabel: JOURNEY_STAGE_LABEL[stage],
    milestones,
    nextMilestone: next ? { stage: next.stage, label: next.label, estimatedDays: next.estimatedDays } : null,
    risk,
    riskFindings: findings,
    opportunities,
    completionPercent,
    estimatedTimeToNext: next?.estimatedDays ?? null,
    trialEndsAt: s.trialEndsAt,
    updatedAt: new Date().toISOString(),
  };
}
