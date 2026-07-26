import { prisma } from "@/lib/prisma";
import { getPlatformHealth } from "@/lib/reliability/health";

async function measureStorefrontResponse(): Promise<number | null> {
  const websites = await prisma.website.findMany({
    where: { publishStatus: { state: "live" } },
    select: { tenant: { select: { customDomain: true, subdomain: true } } },
    take: 5,
  });
  if (websites.length === 0) return null;

  const start = performance.now();
  try {
    for (const w of websites) {
      const host = w.tenant.customDomain ?? `${w.tenant.subdomain}.localhost:3000`;
      await fetch(`http://${host}`, { signal: AbortSignal.timeout(3000) }).catch(() => {});
    }
    return Math.round((performance.now() - start) / websites.length);
  } catch {
    return null;
  }
}

export async function getPerformanceMetrics(): Promise<{
  performance: {
    averageGenerationDurationMs: number;
    averagePublishingDurationMs: number;
    averageTotalOnboardingMs: number;
    generationCount: number;
    publishCount: number;
    failedGenerationCount: number;
    failedPublishCount: number;
    generationSuccessRate: number;
    publishSuccessRate: number;
    storefrontResponseMs: number | null;
  };
  cache: {
    storefrontCacheHitRate: number;
    generationCacheHitRate: number;
    builderQueryCacheHitRate: number;
    totalCacheHits: number;
    totalCacheMisses: number;
  };
  reliability: {
    retryCount: number;
    failedRetries: number;
    uniqueErrorCategories: Record<string, number>;
    jobRunnerStatus: { running: number; registered: number };
    dbLatencyMs: number;
    eventBusSize: number;
  };
  health: { status: string; uptime: number };
  timestamp: string;
}> {
  const [sessions, statuses, health] = await Promise.all([
    prisma.generationSession.findMany({
      select: {
        status: true,
        startedAt: true,
        completedAt: true,
        error: true,
        retryCount: true,
        stages: {
          where: { type: { in: ["provisioning", "publishing"] } },
          select: { type: true, status: true, duration: true },
        },
      },
    }),
    prisma.publishStatus.findMany({
      select: { state: true, liveVersion: true },
    }),
    getPlatformHealth(),
  ]);

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const failedSessions = sessions.filter((s) => s.status === "failed" || s.status === "cancelled" || s.status === "timed_out");
  const generationCount = sessions.length;
  const failedGenerationCount = failedSessions.length;
  const generationSuccessRate = generationCount > 0 ? Math.round(((generationCount - failedGenerationCount) / generationCount) * 100) : 0;

  const totalOnboardingDurations = completedSessions
    .filter((s) => s.completedAt && s.startedAt)
    .map((s) => s.completedAt!.getTime() - s.startedAt!.getTime());
  const averageTotalOnboardingMs = totalOnboardingDurations.length > 0
    ? Math.round(totalOnboardingDurations.reduce((a, b) => a + b, 0) / totalOnboardingDurations.length)
    : 0;

  const publishDurations: number[] = [];
  for (const s of completedSessions) {
    for (const stage of s.stages) {
      if ((stage.type === "publishing" || stage.type === "provisioning") && stage.duration != null) {
        publishDurations.push(stage.duration);
      }
    }
  }
  const averagePublishingDurationMs = publishDurations.length > 0
    ? Math.round(publishDurations.reduce((a, b) => a + b, 0) / publishDurations.length)
    : 0;

  const publishedCount = statuses.filter((s) => s.state === "live").length;
  const failedPublishCount = statuses.filter((s) => s.state !== "live" && s.state !== "draft").length;
  const publishSuccessRate = statuses.length > 0 ? Math.round((publishedCount / statuses.length) * 100) : 0;

  const errorCategories: Record<string, number> = {};
  for (const s of failedSessions) {
    if (s.error) {
      const cat = s.error.includes("generation") ? "generation"
        : s.error.includes("provision") ? "provisioning"
        : s.error.includes("timeout") ? "timeout"
        : s.error.includes("rate") ? "rate_limit"
        : "unknown";
      errorCategories[cat] = (errorCategories[cat] ?? 0) + 1;
    }
  }

  const retryCount = sessions.filter((s) => s.status === "retrying").length;
  const failedRetries = sessions.filter((s) => s.status === "failed" && s.retryCount > 0).length;

  const storefrontResponseMs = await measureStorefrontResponse();

  const jobs = (await import("@/lib/reliability/jobs")).jobRunner.getStatus();

  return {
    performance: {
      averageGenerationDurationMs: averageTotalOnboardingMs,
      averagePublishingDurationMs,
      averageTotalOnboardingMs,
      generationCount,
      publishCount: statuses.length,
      failedGenerationCount,
      failedPublishCount,
      generationSuccessRate,
      publishSuccessRate,
      storefrontResponseMs,
    },
    cache: {
      storefrontCacheHitRate: 0,
      generationCacheHitRate: 0,
      builderQueryCacheHitRate: 0,
      totalCacheHits: 0,
      totalCacheMisses: 0,
    },
    reliability: {
      retryCount,
      failedRetries,
      uniqueErrorCategories: errorCategories,
      jobRunnerStatus: { running: jobs.filter((j) => j.running).length, registered: jobs.length },
      dbLatencyMs: health.checks.database?.latencyMs ?? -1,
      eventBusSize: (await import("@/lib/events")).platformEventBus.getHistory().length,
    },
    health: { status: health.status, uptime: health.uptime },
    timestamp: new Date().toISOString(),
  };
}
