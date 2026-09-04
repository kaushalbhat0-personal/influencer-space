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

// PERF-01F F1: initial critical path — StorefrontStatusCard, MetricGrid, publishStatus/recentVersions, QuickStart
// Avoids runtimeContextBuilder (5s) for first paint; deferred intelligence loads after.
export async function getInitialDashboardData() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  const [metrics, steps, storefrontUrl, activity] = await Promise.all([
    dashboardService.getMetrics(tenantId),
    dashboardService.getQuickStartSteps(tenantId),
    dashboardService.getStorefrontUrl(tenantId),
    dashboardService.getActivity(tenantId),
  ]);
  return {
    metrics,
    steps,
    storefrontUrl,
    activity,
    creatorName: session.user.name ?? "Creator",
  };
}

// PERF-01F F1: deferred intelligence — health, knowledge, goals, recommendations, success, businessHealth, evolution, etc.
export async function getDeferredDashboardData() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  const context = await runtimeContextBuilder.build(tenantId);
  const [businessHealth, evolution] = await Promise.all([
    businessHealthRuntime.recordFrom(context, tenantId),
    websiteEvolutionRuntime.detectFrom(context, tenantId),
  ]);
  const { health, knowledge, goals, recommendations, success, storefrontScore } = context as unknown as {
    health: { checks: Array<{ id: string; label: string; description: string; score: number; done: boolean; href: string }>; overallScore: number };
    knowledge: { score: { overall: number; confidence: string; categories: Record<string, number>; missingFields: string[] } };
    goals: { profile: unknown; dashboard: unknown; alignment: { overall: number } };
    recommendations: unknown[];
    success: { completionPercent: number; completedMilestones: number; totalMilestones: number; milestones: unknown[]; nextTask: unknown } | null;
    storefrontScore: { overall: number };
  };
  const successJourney = {
    success: computeFromSignals(await loadSignals(tenantId, context as unknown as Parameters<typeof loadSignals>[1])),
    timeline: await getCustomerTimeline(tenantId, 20),
  };
  const plan = await resolveActivePlan(undefined, tenantId);
  const launchAllowance = isLaunchPlan(plan.code ?? null)
    ? { used: await countActiveCoreContentUsage(tenantId), limit: LAUNCH_GLOBAL_LIMIT }
    : null;
  return {
    health: (health as { checks: Array<{ id: string; label: string; description: string; score: number; done: boolean; href: string }> }).checks.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description,
      score: c.score,
      done: c.done,
      href: c.href,
    })),
    overallScore: (health as { overallScore: number }).overallScore,
    knowledge: {
      overall: (knowledge as { score: { overall: number } }).score.overall,
      confidence: (knowledge as { score: { confidence: string } }).score.confidence,
      categories: (knowledge as { score: { categories: Record<string, number> } }).score.categories,
      missing: (knowledge as { score: { missingFields: string[] } }).score.missingFields.slice(0, 5),
      storefrontOverall: (storefrontScore as { overall: number }).overall,
    },
    goals: {
      profile: (goals as { profile: unknown }).profile,
      dashboard: (goals as { dashboard: unknown }).dashboard,
      alignment: (goals as { alignment: { overall: number } }).alignment.overall,
    },
    success: success
      ? {
          completionPercent: (success as { completionPercent: number }).completionPercent,
          completedMilestones: (success as { completedMilestones: number }).completedMilestones,
          totalMilestones: (success as { totalMilestones: number }).totalMilestones,
          milestones: (success as { milestones: unknown[] }).milestones,
          nextTask: (success as { nextTask: unknown }).nextTask,
        }
      : null,
    recommendations: {
      top: (recommendations as unknown[])[0] ?? null,
      total: (recommendations as unknown[]).length,
    },
    businessHealth: {
      health: (businessHealth as { health: unknown }).health,
      trend: (businessHealth as { trend: { trend: string } }).trend.trend,
      delta: (businessHealth as { trend: { delta: number } }).trend.delta,
    },
    evolution: {
      opportunities: (evolution as unknown[]).slice(0, 3),
    },
    launchAllowance,
    successJourney,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
export type InitialDashboardData = Awaited<ReturnType<typeof getInitialDashboardData>>;
export type DeferredDashboardData = Awaited<ReturnType<typeof getDeferredDashboardData>>;
