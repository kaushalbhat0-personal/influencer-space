"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dashboardService } from "./service";
import { websiteHealthEngine } from "@/lib/platform/health/engine";

export async function getDashboardData() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const [metrics, activity, steps, storefrontUrl, health] = await Promise.all([
    dashboardService.getMetrics(tenantId),
    dashboardService.getActivity(tenantId),
    dashboardService.getQuickStartSteps(tenantId),
    dashboardService.getStorefrontUrl(tenantId),
    websiteHealthEngine.evaluate(tenantId),
  ]);

  return {
    metrics,
    activity,
    health: health.checks.map((c) => ({
      label: c.label,
      score: c.score,
      done: c.done,
      href: c.href,
    })),
    overallScore: health.overallScore,
    steps,
    storefrontUrl,
    creatorName: session.user.name ?? "Creator",
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
