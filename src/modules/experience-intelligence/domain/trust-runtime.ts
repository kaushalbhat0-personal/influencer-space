// ── Trust Runtime (Phase 4) ─────────────────────────────────
// Canonical trust profile inside Experience Intelligence. NOT a new platform
// runtime — a deterministic projection of trust sources already in the
// Runtime Context (testimonials, achievements, timeline, social links,
// community, Business Health, recommendation completion).

import type { TrustProfile, TrustSource } from "../domain/types";

export interface TrustInput {
  testimonialCount: number;
  timelineCount: number;
  socialLinkCount: number;
  achievementsPresent: boolean;
  communityPresent: boolean;
  businessHealth: number;
  recommendationCompletion: number;
  verifiedBadge: boolean;
}

export function computeTrustProfile(input: TrustInput): TrustProfile {
  const sources: TrustSource[] = [
    { id: "testimonials", label: "Testimonials", present: input.testimonialCount > 0, weight: 30 },
    { id: "achievements", label: "Achievements", present: input.achievementsPresent, weight: 20 },
    { id: "timeline", label: "Milestones", present: input.timelineCount > 0, weight: 15 },
    { id: "social", label: "Social presence", present: input.socialLinkCount > 0, weight: 10 },
    { id: "community", label: "Community", present: input.communityPresent, weight: 10 },
    { id: "business_health", label: "Business Health", present: input.businessHealth >= 70, weight: 10 },
    { id: "recommendations", label: "Completed recommendations", present: input.recommendationCompletion >= 50, weight: 5 },
  ];

  const totalWeight = sources.reduce((sum, s) => sum + s.weight, 0);
  const presentWeight = sources.filter((s) => s.present).reduce((sum, s) => sum + s.weight, 0);
  const score = totalWeight > 0 ? Math.round((presentWeight / totalWeight) * 100) : 0;

  return { score, sources };
}
