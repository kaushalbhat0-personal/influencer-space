import type { DatePreset } from "./date";

export interface DateRange {
  from: Date;
  to: Date;
  preset: DatePreset;
  label: string;
}

export interface AnalyticsSummary {
  revenue: RevenueStats;
  orders: OrderStats;
  products: ProductStats;
  conversion: ConversionStats;
  insights: string[];
  period: PeriodInfo;
}

export interface PeriodInfo {
  from: string;
  to: string;
}

export interface RevenueStats {
  total: number;
  previousTotal: number;
  changePercent: number | null;
  byDay: { date: string; amount: number }[];
  byProduct: { productName: string; amount: number; count: number }[];
}

export interface OrderStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  previousTotal: number;
  changePercent: number | null;
  averageValue: number;
  topProducts: { name: string; count: number; revenue: number }[];
  byDay: { date: string; count: number }[];
}

export interface ProductStats {
  total: number;
  active: number;
  featured: number;
  withSales: number;
  topPerformers: { name: string; sales: number; revenue: number; conversion: number }[];
  lowestPerformers: { name: string; sales: number; revenue: number }[];
}

export interface ConversionStats {
  overall: number;
  funnel: FunnelStage[];
}

export interface FunnelStage {
  label: string;
  count: number;
  dropoff: number;
  dropoffPercent: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  secondary?: number;
}

export interface ExportConfig {
  formats: ("csv" | "excel" | "pdf")[];
  filename: string;
  data: Record<string, unknown>[];
  columns: { key: string; label: string }[];
}

export interface VisitorStats {
  total: number;
  unique: number;
  returning: number;
  byDevice: { type: string; count: number }[];
  byCountry: { country: string; count: number }[];
  bySource: { source: string; count: number }[];
}

export interface AnalyticsEvent {
  tenantId?: string;
  source: string;
  eventType: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  occurredAt?: Date;
}

export interface MetricValue {
  id: string;
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
