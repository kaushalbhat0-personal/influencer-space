"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dashboardService } from "./service";
import { runtimeContextBuilder } from "@/modules/runtime-context";
import { businessHealthRuntime } from "@/modules/business-health";
import { websiteEvolutionRuntime } from "@/modules/website-evolution";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { isLaunchPlan, countActiveCoreContentUsage, LAUNCH_GLOBAL_LIMIT } from "@/modules/billing/application/content-limit.enforcement";
import { loadSignals, getCustomerTimeline } from "@/modules/customer-success";
import { computeFromSignals } from "@/modules/customer-success";

export async function getDashboardData() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  // RCCF-INTEGRATION-01: build the RuntimeContext ONCE — a single
  // WebsiteAggregate build feeds knowledge, goals, success, recommendations,
  // storefront score, health and metrics (previously the snapshot was built 3x).
  const context = await runtimeContextBuilder.build(tenantId);
  const [activity, steps, storefrontUrl, businessHealth, evolution] = await Promise.all([
    dashboardService.getActivity(tenantId),
    dashboardService.getQuickStartSteps(tenantId),
    dashboardService.getStorefrontUrl(tenantId),
    // RCCF-EPIC-07: Business Health is computed from the SAME context (no
    // second build); record() appends an immutable projection when due.
    businessHealthRuntime.recordFrom(context, tenantId),
    // RCCF-EPIC-09: growth-triggered evolution opportunities from the same context.
    websiteEvolutionRuntime.detectFrom(context, tenantId),
  ]);

  const { metrics, health, knowledge, goals, recommendations, success, storefrontScore } = context;

  // RCCF-72.17C.4 (DASH-03): the Success Journey card previously rebuilt the
  // full ~62-query Runtime Context in a second client request. The CustomerSuccess
  // is a pure function of the SAME context already built here — derive it from
  // that context (only the ~5 companion signal reads + 5 timeline reads remain)
  // and thread it into the card so the redundant build disappears.
  const successJourney = {
    success: computeFromSignals(await loadSignals(tenantId, context)),
    timeline: await getCustomerTimeline(tenantId, 20),
  };

  // RCCF-72.15B �?" Launch core-content allowance, sourced from the shared
  // server primitive so the UI never invents or hardcodes its own counter.
  const plan = await resolveActivePlan(undefined, tenantId);
  const launchAllowance = isLaunchPlan(plan.code ?? null)
    ? { used: await countActiveCoreContentUsage(tenantId), limit: LAUNCH_GLOBAL_LIMIT }
    : null;

  return {
    metrics,
    launchAllowance,
    successJourney,
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
    evolution: {
      opportunities: evolution.slice(0, 3),
    },
    steps,
    storefrontUrl,
    creatorName: session.user.name ?? "Creator",
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
