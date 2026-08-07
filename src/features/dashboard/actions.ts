"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dashboardService } from "./service";
import { runtimeContextBuilder } from "@/modules/runtime-context";
import { businessHealthRuntime } from "@/modules/business-health";

export async function getDashboardData() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  // RCCF-INTEGRATION-01: build the RuntimeContext ONCE — a single
  // WebsiteAggregate build feeds knowledge, goals, success, recommendations,
  // storefront score, health and metrics (previously the snapshot was built 3x).
  const context = await runtimeContextBuilder.build(tenantId);
  const [activity, steps, storefrontUrl, businessHealth] = await Promise.all([
    dashboardService.getActivity(tenantId),
    dashboardService.getQuickStartSteps(tenantId),
    dashboardService.getStorefrontUrl(tenantId),
    // RCCF-EPIC-07: Business Health is computed from the SAME context (no
    // second build); record() appends an immutable projection when due.
    businessHealthRuntime.recordFrom(context, tenantId),
  ]);

  const { metrics, health, knowledge, goals, recommendations, success, storefrontScore } = context;

  return {
    metrics,
    activity,
    health: health.checks.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description,
      score: c.score,
      done: c.done,
      href: c.href,
    })),
    overallScore: health.overallScore,
    knowledge: {
      overall: knowledge.score.overall,
      confidence: knowledge.score.confidence,
      categories: knowledge.score.categories,
      missing: knowledge.score.missingFields.slice(0, 5),
      storefrontOverall: storefrontScore.overall,
    },
    goals: {
      profile: goals.profile,
      dashboard: goals.dashboard,
      alignment: goals.alignment.overall,
    },
    success: success
      ? {
          completionPercent: success.completionPercent,
          completedMilestones: success.completedMilestones,
          totalMilestones: success.totalMilestones,
          milestones: success.milestones,
          nextTask: success.nextTask,
        }
      : null,
    recommendations: {
      top: recommendations[0] ?? null,
      total: recommendations.length,
    },
    businessHealth: {
      health: businessHealth.health,
      trend: businessHealth.trend.trend,
      delta: businessHealth.trend.delta,
    },
    steps,
    storefrontUrl,
    creatorName: session.user.name ?? "Creator",
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
