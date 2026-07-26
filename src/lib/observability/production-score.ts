import { getPerformanceMetrics } from "./service";

export interface ReadinessScore {
  overall: number;
  categories: {
    architecture: number;
    performance: number;
    reliability: number;
    scalability: number;
    security: number;
    observability: number;
    operationalReadiness: number;
  };
  blockers: string[];
  highPriority: string[];
  mediumPriority: string[];
  lowPriority: string[];
}

const ALL_TIME_MS = {
  onboarding: { fast: 60000, acceptable: 180000, slow: 300000 },
  publish: { fast: 5000, acceptable: 15000, slow: 30000 },
  storefront: { fast: 500, acceptable: 1500, slow: 3000 },
  db: { fast: 5, acceptable: 20, slow: 50 },
};

export async function computeProductionScore(): Promise<ReadinessScore> {
  const metrics = await getPerformanceMetrics();
  const { performance, reliability, health } = metrics;

  const categories = {
    architecture: 85,
    performance: scorePerformance(performance),
    reliability: scoreReliability(reliability, health),
    scalability: scoreScalability(performance),
    security: 80,
    observability: scoreObservability(performance),
    operationalReadiness: scoreOperational(health, reliability),
  };

  const overall = Math.round(
    Object.values(categories).reduce((a, b) => a + b, 0) / Object.keys(categories).length,
  );

  const blockers: string[] = [];
  const highPriority: string[] = [];
  const mediumPriority: string[] = [];
  const lowPriority: string[] = [];

  if (performance.generationSuccessRate < 80) {
    blockers.push(`Generation success rate is ${performance.generationSuccessRate}% — below 80% threshold`);
  }
  if (performance.publishSuccessRate < 80 && performance.publishCount > 0) {
    blockers.push(`Publish success rate is ${performance.publishSuccessRate}% — below 80% threshold`);
  }
  if (performance.storefrontResponseMs != null && performance.storefrontResponseMs > 3000) {
    blockers.push(`Storefront response time ${performance.storefrontResponseMs}ms exceeds 3s limit`);
  }
  if (reliability.dbLatencyMs > 50) {
    highPriority.push(`Database latency ${reliability.dbLatencyMs}ms exceeds 50ms threshold`);
  }
  if (performance.averageTotalOnboardingMs > ALL_TIME_MS.onboarding.slow) {
    highPriority.push(`Average onboarding duration ${formatMs(performance.averageTotalOnboardingMs)} exceeds 5 minutes`);
  }
  if (reliability.retryCount > 10) {
    mediumPriority.push(`${reliability.retryCount} retries recorded — review retry logic`);
  }
  if (metrics.cache.storefrontCacheHitRate === 0) {
    mediumPriority.push("Storefront cache hit rate not tracked — add cache metrics instrumentation");
  }
  if (reliability.eventBusSize > 1000) {
    lowPriority.push(`Event bus has ${reliability.eventBusSize} events — consider archiving`);
  }

  if (blockers.length === 0) blockers.push("No critical blockers detected");
  if (highPriority.length === 0) highPriority.push("No high-priority issues detected");

  return {
    overall,
    categories,
    blockers,
    highPriority,
    mediumPriority,
    lowPriority,
  };
}

function scorePerformance(p: {
  generationSuccessRate: number;
  averageTotalOnboardingMs: number;
  averagePublishingDurationMs: number;
  storefrontResponseMs: number | null;
}): number {
  let score = 60;
  if (p.generationSuccessRate >= 95) score += 20;
  else if (p.generationSuccessRate >= 80) score += 10;
  else score -= 20;

  if (p.averageTotalOnboardingMs <= ALL_TIME_MS.onboarding.fast) score += 10;
  else if (p.averageTotalOnboardingMs <= ALL_TIME_MS.onboarding.acceptable) score += 5;
  else if (p.averageTotalOnboardingMs > ALL_TIME_MS.onboarding.slow) score -= 15;

  if (p.averagePublishingDurationMs > 0 && p.averagePublishingDurationMs <= ALL_TIME_MS.publish.acceptable) score += 5;
  else if (p.averagePublishingDurationMs > ALL_TIME_MS.publish.slow) score -= 10;

  if (p.storefrontResponseMs != null) {
    if (p.storefrontResponseMs <= ALL_TIME_MS.storefront.fast) score += 5;
    else if (p.storefrontResponseMs > ALL_TIME_MS.storefront.slow) score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

function scoreReliability(r: { retryCount: number; uniqueErrorCategories: Record<string, number>; dbLatencyMs: number }, h: { status: string }): number {
  let score = 70;
  if (h.status === "ok") score += 15;
  else if (h.status === "degraded") score += 5;
  else score -= 20;

  if (r.retryCount === 0) score += 10;
  else if (r.retryCount <= 5) score += 5;
  else score -= 10;

  const errorCount = Object.values(r.uniqueErrorCategories).reduce((a, b) => a + b, 0);
  if (errorCount === 0) score += 5;
  else if (errorCount > 10) score -= 10;

  if (r.dbLatencyMs >= 0 && r.dbLatencyMs <= ALL_TIME_MS.db.acceptable) score += 5;
  else if (r.dbLatencyMs > ALL_TIME_MS.db.slow) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function scoreScalability(p: { generationCount: number }): number {
  let score = 70;
  if (p.generationCount > 100) score += 15;
  else if (p.generationCount > 10) score += 10;
  else if (p.generationCount > 0) score += 5;
  return Math.min(100, score);
}

function scoreObservability(p: { generationCount: number; storefrontResponseMs: number | null }): number {
  let score = 60;
  if (p.generationCount > 0) score += 10;
  if (p.storefrontResponseMs != null) score += 15;
  score += 10;
  return Math.min(100, score);
}

function scoreOperational(h: { status: string; uptime: number }, r: { dbLatencyMs: number }): number {
  let score = 70;
  if (h.status === "ok") score += 10;
  if (h.uptime > 86400000) score += 10;
  else if (h.uptime > 3600000) score += 5;
  if (r.dbLatencyMs >= 0 && r.dbLatencyMs <= 10) score += 10;
  return Math.min(100, score);
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}
