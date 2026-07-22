export interface AnalyticsEvent {
  tenantId?: string;
  source: string;
  eventType: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  occurredAt?: Date;
}

export interface MetricValue {
  label: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  unit?: string;
}

export interface MetricDefinition {
  id: string;
  label: string;
  description: string;
  unit?: string;
  calculate(from: Date, to: Date, tenantId?: string): Promise<MetricValue>;
}

export interface DashboardSummary {
  period: { from: string; to: string };
  metrics: MetricValue[];
}
