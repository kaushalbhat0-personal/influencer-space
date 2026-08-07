"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dashboardService } from "./service";
import { websiteHealthEngine } from "@/lib/platform/health/engine";
import { knowledgeScoreService } from "@/modules/knowledge-runtime";

export async function getDashboardData() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const [metrics, activity, steps, storefrontUrl, health, knowledge] = await Promise.all([
    dashboardService.getMetrics(tenantId),
    dashboardService.getActivity(tenantId),
    dashboardService.getQuickStartSteps(tenantId),
    dashboardService.getStorefrontUrl(tenantId),
    websiteHealthEngine.evaluate(tenantId),
    knowledgeScoreService.evaluate(tenantId),
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
    steps,
    storefrontUrl,
    creatorName: session.user.name ?? "Creator",
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
