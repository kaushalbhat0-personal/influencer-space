import { platformTelemetry } from "@/lib/telemetry/telemetry";

export type MetricOperation =
  | "publish"
  | "provision"
  | "generation"
  | "builder_save"
  | "billing_execution"
  | "registry_sync"
  | "import"
  | "onboarding";

export class MetricsService {
  /**
   * Record execution duration for an operation. Returns elapsed ms.
   */
  recordDuration(operation: MetricOperation, durationMs: number, labels?: Record<string, string>): void {
    platformTelemetry.timer("operation_duration", durationMs, { operation, ...labels });
  }

  /**
   * Record a success/failure count.
   */
  recordOutcome(operation: MetricOperation, success: boolean, labels?: Record<string, string>): void {
    platformTelemetry.counter("operation_outcome", 1, {
      operation,
      status: success ? "success" : "failure",
      ...labels,
    });
  }

  /**
   * Record cache hit or miss.
   */
  recordCacheAccess(cacheName: string, hit: boolean): void {
    platformTelemetry.counter("cache_access", 1, { cache: cacheName, result: hit ? "hit" : "miss" });
  }

  /**
   * Record a query or API call duration.
   */
  recordQueryDuration(query: string, durationMs: number): void {
    platformTelemetry.timer("query_duration", durationMs, { query });
  }

  /**
   * Track a slow operation via threshold.
   */
  recordSlowOperation(operation: MetricOperation, durationMs: number, thresholdMs: number, labels?: Record<string, string>): void {
    if (durationMs > thresholdMs) {
      platformTelemetry.counter("slow_operation", 1, { operation, threshold: String(thresholdMs), ...labels });
    }
    this.recordDuration(operation, durationMs, labels);
  }
}

export const metricsService = new MetricsService();

export function trackDuration<T>(
  operation: MetricOperation,
  fn: () => Promise<T>,
  labels?: Record<string, string>,
): Promise<T> {
  const start = Date.now();
  return fn()
    .then((result) => {
      metricsService.recordDuration(operation, Date.now() - start, labels);
      metricsService.recordOutcome(operation, true, labels);
      return result;
    })
    .catch((err) => {
      metricsService.recordDuration(operation, Date.now() - start, labels);
      metricsService.recordOutcome(operation, false, labels);
      throw err;
    });
}
