"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dashboardService } from "./service";

export async function getDashboardData() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const [metrics, activity, health, steps, storefrontUrl] = await Promise.all([
    dashboardService.getMetrics(tenantId),
    dashboardService.getActivity(tenantId),
    dashboardService.getHealthChecks(tenantId),
    dashboardService.getQuickStartSteps(tenantId),
    dashboardService.getStorefrontUrl(tenantId),
  ]);

  return { metrics, activity, health, steps, storefrontUrl, creatorName: session.user.name ?? "Creator" };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
