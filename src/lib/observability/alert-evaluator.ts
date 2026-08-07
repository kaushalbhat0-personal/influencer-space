import { ALERT_RULES, AlertSeverity, type AlertRule } from "./alert-rules";
import { dashboardMetricsService } from "./dashboard-metrics";
import { logger } from "./logger";
import { healthService } from "./health-service";
import type { DashboardMetrics } from "./dashboard-metrics";
import type { HealthReport } from "./health-service";

export interface AlertEvaluation {
  rule: AlertRule;
  triggered: boolean;
  currentValue: number;
  evaluatedAt: string;
  severity: AlertSeverity;
}

export interface AlertReport {
  evaluations: AlertEvaluation[];
  criticalCount: number;
  warningCount: number;
  totalRules: number;
  evaluatedAt: string;
}

async function evaluateRule(rule: AlertRule, metrics: DashboardMetrics, health: HealthReport): Promise<AlertEvaluation> {
  let currentValue = 0;
  let triggered = false;

  switch (rule.name) {
    case "provision_duration":
      currentValue = metrics.averageProvisionDurationMs;
      triggered = currentValue > rule.threshold;
      break;
    case "publish_duration":
      currentValue = metrics.averagePublishDurationMs;
      triggered = currentValue > rule.threshold;
      break;
    case "billing_failure":
      currentValue = metrics.failedBillingOperations;
      triggered = currentValue > rule.threshold;
      break;
    case "health_critical":
      currentValue = health.overall === "critical" ? 1 : 0;
      triggered = currentValue > rule.threshold;
      break;
    case "generation_failure":
      currentValue = 100 - metrics.generationSuccessRate;
      triggered = currentValue > 0;
      break;
    case "database_latency": {
      const db = health.services["database"];
      currentValue = db?.latencyMs ?? 0;
      triggered = currentValue > rule.threshold;
      break;
    }
    case "workspace_creation_failure":
      currentValue = metrics.failedProvisions;
      triggered = currentValue > rule.threshold;
      break;
    default:
      break;
  }

  return {
    rule,
    triggered,
    currentValue,
    evaluatedAt: new Date().toISOString(),
    severity: rule.severity,
  };
}

export async function evaluateAllRules(
  preCollectedMetrics?: Awaited<ReturnType<typeof dashboardMetricsService.collect>>,
): Promise<AlertReport> {
  const [metrics, health] = await Promise.all([
    // RCCF-LAUNCH-01: the super-admin dashboard already collects metrics; pass
    // them in instead of re-running the full aggregation (duplicate work).
    preCollectedMetrics ?? dashboardMetricsService.collect(),
    healthService.checkAll(),
  ]);

  const evaluations = await Promise.all(
    ALERT_RULES.map((rule) => evaluateRule(rule, metrics, health)),
  );

  const triggered = evaluations.filter((e) => e.triggered);

  logger.info(`Alert evaluation complete: ${triggered.length}/${ALERT_RULES.length} rules triggered`, "alert-evaluator", {
    metadata: { triggeredCount: triggered.length, totalRules: ALERT_RULES.length } as Record<string, unknown>,
  });

  return {
    evaluations,
    criticalCount: triggered.filter((e) => e.severity === AlertSeverity.Critical).length,
    warningCount: triggered.filter((e) => e.severity === AlertSeverity.Warning).length,
    totalRules: ALERT_RULES.length,
    evaluatedAt: new Date().toISOString(),
  };
}

export const alertEvaluator = { evaluateAllRules };
