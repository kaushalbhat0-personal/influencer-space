// ── Runtime Context Builder (Phase 1) ───────────────────────
// Builds the WebsiteAggregate snapshot ONCE and evaluates every runtime from
// that single snapshot: Knowledge, Goals, Success, Recommendations, Storefront
// Score, Health and dashboard metrics. React.cache() makes the build
// request-scoped — repeated calls within a request share the result. No
// behavior changes; this is a performance + consistency layer.

import { cache as reactCache } from "react";
import {
  knowledgeAggregateSource,
  computeStorefrontScore,
  knowledgeScoreService,
} from "@/modules/knowledge-runtime";
import {
  goalRuntime,
  goalProfileService,
} from "@/modules/goals-runtime";
import {
  recommendationContextSource,
  recommendationRuntime,
} from "@/modules/recommendation-runtime";
import { getCreatorSuccess } from "@/lib/creator-success/runtime";
import { websiteHealthEngine } from "@/lib/platform/health/engine";
import { dashboardService } from "@/features/dashboard/service";
import type { RuntimeContext } from "../domain/types";

// React.cache() provides request-scoped memoization in Next.js server contexts.
// Fall back to a plain (uncached) function in environments where React's cache
// export is unavailable (e.g. node unit tests) — behaviour is identical, only
// the request-scoped memoization is skipped.
const requestCache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof reactCache === "function" ? reactCache : ((fn: (x: never) => unknown) => fn as never);

const buildCached = requestCache(async (tenantId: string, markShown = true): Promise<RuntimeContext> => {
  // Single aggregate build — this is the ONLY place the WebsiteAggregate is
  // constructed per request. Every runtime evaluates from this snapshot.
  const snapshot = await knowledgeAggregateSource.buildSnapshot(tenantId);
  const profile = await goalProfileService.getProfile(tenantId);

  const [success, metrics, health, knowledge, goals] = await Promise.all([
    getCreatorSuccess(tenantId).catch(() => null),
    dashboardService.getMetrics(tenantId),
    websiteHealthEngine.evaluate(tenantId),
    knowledgeScoreService.evaluateFromSnapshot(snapshot),
    goalRuntime.evaluateFrom(snapshot, profile, tenantId),
  ]);

  const recommendationContext = await recommendationContextSource.buildFromSnapshot(snapshot, tenantId, {
    profile,
    success,
  });
  const recommendations = await recommendationRuntime.getRecommendationsFrom(recommendationContext, tenantId, markShown);

  const storefrontScore = computeStorefrontScore(snapshot, knowledge.score.overall, {
    percent: goals.alignment.overall,
    label: "Goal Alignment",
  });

  return {
    tenantId,
    snapshot,
    knowledge,
    goals,
    success,
    recommendations,
    storefrontScore,
    health,
    metrics,
    intelligence: {
      publishState: recommendationContext.metrics.publishState,
      published: recommendationContext.metrics.published,
      analyticsActive: recommendationContext.metrics.analyticsActive,
    },
  };
});

export class RuntimeContextBuilder {
  build(tenantId: string, options?: { markShown?: boolean }): Promise<RuntimeContext> {
    return buildCached(tenantId, options?.markShown ?? true);
  }
}

export const runtimeContextBuilder = new RuntimeContextBuilder();
