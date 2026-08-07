"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dashboardService } from "./service";
import { websiteHealthEngine } from "@/lib/platform/health/engine";
import { knowledgeScoreService } from "@/modules/knowledge-runtime";
import { goalRuntime } from "@/modules/goals-runtime";
import { recommendationRuntime } from "@/modules/recommendation-runtime";

export async function getDashboardData() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const [metrics, activity, steps, storefrontUrl, health, knowledge, goals, recommendations] = await Promise.all([
    dashboardService.getMetrics(tenantId),
    dashboardService.getActivity(tenantId),
    dashboardService.getQuickStartSteps(tenantId),
    dashboardService.getStorefrontUrl(tenantId),
    websiteHealthEngine.evaluate(tenantId),
    knowledgeScoreService.evaluate(tenantId),
    goalRuntime.evaluate(tenantId),
    recommendationRuntime.getRecommendations(tenantId),
  ]);

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
      storefrontOverall: knowledge.storefrontScore.overall,
    },
    goals: {
      profile: goals.profile,
      dashboard: goals.dashboard,
      alignment: goals.alignment.overall,
    },
    recommendations: {
      top: recommendations[0] ?? null,
      total: recommendations.length,
    },
    steps,
    storefrontUrl,
    creatorName: session.user.name ?? "Creator",
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
