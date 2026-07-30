export enum AlertSeverity {
  Warning = "warning",
  Critical = "critical",
}

export interface AlertRule {
  name: string;
  description: string;
  condition: string;
  threshold: number;
  severity: AlertSeverity;
  recoverySuggestion: string;
}

const MS_PER_SECOND = 1000;

export const ALERT_RULES: AlertRule[] = [
  {
    name: "provision_duration",
    description: "Provisioning workflow exceeds threshold",
    condition: "duration > threshold",
    threshold: 60 * MS_PER_SECOND,
    severity: AlertSeverity.Critical,
    recoverySuggestion: "Check database load and available connections",
  },
  {
    name: "publish_duration",
    description: "Publishing workflow exceeds threshold",
    condition: "duration > threshold",
    threshold: 30 * MS_PER_SECOND,
    severity: AlertSeverity.Warning,
    recoverySuggestion: "Check snapshot serialization and storage latency",
  },
  {
    name: "billing_failure",
    description: "Billing operation failed",
    condition: "failure_count > 0",
    threshold: 0,
    severity: AlertSeverity.Critical,
    recoverySuggestion: "Check payment provider connectivity and billing service health",
  },
  {
    name: "registry_mismatch",
    description: "Registry sync detected differences between source and target",
    condition: "diff_count > 0",
    threshold: 0,
    severity: AlertSeverity.Warning,
    recoverySuggestion: "Run platform sync to reconcile differences",
  },
  {
    name: "health_critical",
    description: "Health check reports critical state",
    condition: "health_state == critical",
    threshold: 0,
    severity: AlertSeverity.Critical,
    recoverySuggestion: "Check platform health dashboard for specific service failures",
  },
  {
    name: "workspace_creation_failure",
    description: "Workspace creation failed during provisioning",
    condition: "failure_count > 0",
    threshold: 0,
    severity: AlertSeverity.Critical,
    recoverySuggestion: "Check workspace repository and database constraints",
  },
  {
    name: "api_failure_rate",
    description: "Repeated API failures detected",
    condition: "failure_rate > 0.05",
    threshold: 0.05,
    severity: AlertSeverity.Warning,
    recoverySuggestion: "Check API routes for errors and upstream service health",
  },
  {
    name: "generation_failure",
    description: "Content generation failed",
    condition: "failure_count > 0",
    threshold: 0,
    severity: AlertSeverity.Warning,
    recoverySuggestion: "Check AI provider availability and request quotas",
  },
  {
    name: "database_latency",
    description: "Database query latency exceeds threshold",
    condition: "latency > threshold",
    threshold: 5000,
    severity: AlertSeverity.Warning,
    recoverySuggestion: "Check database performance metrics and connection pool",
  },
];

export function getAlertRule(name: string): AlertRule | undefined {
  return ALERT_RULES.find((r) => r.name === name);
}
