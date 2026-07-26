export interface PerformanceMetrics {
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
}

export interface CacheMetrics {
  storefrontCacheHitRate: number;
  generationCacheHitRate: number;
  builderQueryCacheHitRate: number;
  totalCacheHits: number;
  totalCacheMisses: number;
}

export interface ReliabilityMetrics {
  retryCount: number;
  failedRetries: number;
  uniqueErrorCategories: Record<string, number>;
  jobRunnerStatus: { running: number; registered: number };
  dbLatencyMs: number;
  eventBusSize: number;
}

export interface ObservabilityReport {
  performance: PerformanceMetrics;
  cache: CacheMetrics;
  reliability: ReliabilityMetrics;
  health: { status: string; uptime: number };
  timestamp: string;
}
