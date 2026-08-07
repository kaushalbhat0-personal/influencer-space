// ── Recommendation Context Source ──────────────────────────
// Assembles the full RecommendationContext from EXISTING runtimes only:
// Knowledge Runtime (snapshot + score + storefront), Goals Runtime (profile +
// alignment), Success Runtime (milestones), Commerce counts and live metrics.
// The engine never owns data — this is the single read path.

import { prisma } from "@/lib/prisma";
import {
  knowledgeAggregateSource,
  computeKnowledgeScore,
  computeStorefrontScore,
} from "@/modules/knowledge-runtime";
import {
  goalProfileService,
  recommendedProfile,
  buildGoalCounts,
  computeGoalAlignment,
} from "@/modules/goals-runtime";
import { getCreatorSuccess } from "@/lib/creator-success/runtime";
import type { GoalProfile } from "@/modules/goals-runtime";
import type { KnowledgeSnapshot } from "@/modules/knowledge-runtime";
import type { RecommendationContext } from "../domain/types";

function activeProfile(profile: GoalProfile | null, snapshot: KnowledgeSnapshot): GoalProfile {
  if (profile) return profile;
  const recommended = recommendedProfile(snapshot);
  return {
    weights: recommended.weights,
    updatedAt: "",
    source: "recommended",
    entityType: recommended.entityType,
  };
}

export class RecommendationContextSource {
  async build(tenantId: string): Promise<RecommendationContext> {
    const snapshot = await knowledgeAggregateSource.buildSnapshot(tenantId);

    const [profile, success, publishStatus, analyticsCount, counts] = await Promise.all([
      goalProfileService.getProfile(tenantId),
      getCreatorSuccess(tenantId).catch(() => null),
      prisma.publishStatus.findFirst({
        where: { website: { tenantId } },
        select: { state: true },
      }).catch(() => null),
      prisma.analyticsEvent.count({ where: { tenantId } }).catch(() => 0),
      buildGoalCounts(tenantId, snapshot),
    ]);

    const effectiveProfile = activeProfile(profile, snapshot);
    const knowledgeScore = computeKnowledgeScore(snapshot);
    const goalAlignment = computeGoalAlignment(effectiveProfile, snapshot);
    const storefront = computeStorefrontScore(snapshot, knowledgeScore.overall, {
      percent: goalAlignment.overall,
      label: "Goal Alignment",
    });

    const publishState = publishStatus?.state ?? null;

    return {
      snapshot,
      activeProfile: effectiveProfile,
      success,
      storefront,
      knowledgeScore,
      metrics: {
        productCount: snapshot.commerce.productCount,
        orderCount: counts.orders,
        bookingCount: snapshot.commerce.bookingCount,
        galleryCount: snapshot.content.galleryCount,
        testimonialCount: snapshot.trust.testimonialCount,
        courseCount: snapshot.commerce.courseCount,
        serviceCount: snapshot.commerce.serviceCount,
        faqCount: snapshot.content.faqCount,
        timelineCount: snapshot.trust.timelineCount,
        affiliateLinkCount: snapshot.social.affiliateLinkCount,
        contentFeedCount: snapshot.content.feedCount,
        publishState,
        published: publishState === "live",
        analyticsActive: (analyticsCount ?? 0) > 0,
      },
      counts,
    };
  }
}

export const recommendationContextSource = new RecommendationContextSource();
