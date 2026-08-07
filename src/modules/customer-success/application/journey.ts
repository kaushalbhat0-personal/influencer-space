// ── Customer Success — Journey Engine ───────────────────────
// RCCF-EPIC-09 Phase 2. Canonical stages with deterministic reach conditions.
// The "next milestone" is the first unreached stage.

import type { JourneyStage, JourneyMilestone, SuccessSignals } from "../domain/types";

export interface JourneyStageDef {
  stage: JourneyStage;
  label: string;
  reached(s: SuccessSignals): boolean;
  estimatedDays: number | null;
}

export const JOURNEY_STAGES: JourneyStageDef[] = [
  { stage: "signed_up", label: "Signed Up", reached: () => true, estimatedDays: 0 },
  { stage: "imported", label: "Imported Your Profile", reached: (s) => s.knowledgeScore !== null, estimatedDays: 0 },
  { stage: "generated", label: "Generated Your Website", reached: (s) => s.healthScore !== null || s.published || s.productCount > 0, estimatedDays: 0 },
  { stage: "builder_started", label: "Opened the Builder", reached: (s) => s.analyticsActive || s.published || s.productCount > 0, estimatedDays: 0 },
  { stage: "published", label: "Published", reached: (s) => s.published, estimatedDays: 1 },
  { stage: "payment_ready", label: "Payment Ready", reached: (s) => s.paymentReady, estimatedDays: 1 },
  { stage: "first_product", label: "Added First Product", reached: (s) => s.hasProducts, estimatedDays: 1 },
  { stage: "first_sale", label: "Made First Sale", reached: (s) => s.hasOrders, estimatedDays: 7 },
  { stage: "returning_seller", label: "Returning Seller", reached: (s) => s.orderCount >= 5, estimatedDays: 30 },
  { stage: "growing_business", label: "Growing Business", reached: (s) => s.orderCount >= 20, estimatedDays: 90 },
];

export const JOURNEY_STAGE_LABEL: Record<JourneyStage, string> = Object.fromEntries(
  JOURNEY_STAGES.map((d) => [d.stage, d.label]),
) as Record<JourneyStage, string>;

export function resolveJourney(s: SuccessSignals): { stage: JourneyStage; milestones: JourneyMilestone[]; next: JourneyMilestone | null } {
  const reached: JourneyStage[] = [];
  for (const def of JOURNEY_STAGES) {
    if (def.reached(s)) reached.push(def.stage);
  }
  const stage = reached[reached.length - 1] ?? "signed_up";

  const milestones: JourneyMilestone[] = JOURNEY_STAGES.map((def) => ({
    stage: def.stage,
    label: def.label,
    reached: reached.includes(def.stage),
    estimatedDays: def.estimatedDays,
  }));

  const next = milestones.find((m) => !m.reached) ?? null;
  return { stage, milestones, next };
}
