export { computeAnalytics } from "./queries";
export { fetchAnalytics, fetchAnalyticsForRange } from "./service";
export type { AnalyticsResponse, AnalyticsResult, AnalyticsError } from "./service";

export {
  computeDateRange,
  previousPeriod,
  formatCurrency,
  formatCompact,
  percentChange,
  getFiscalYear,
  getWeekStart,
  DATE_RANGE_PRESETS,
} from "./date";
export type { DatePreset, DateRange, DateRangePreset, FiscalYearConfig, BusinessCalendar } from "./date";

export { metricsRegistry } from "./metrics";
export type { InsightInput } from "./insights";
export { computeInsights } from "./insights";
export { verifyTenantAccess, assertTenantId } from "./permissions";
export { validateDatePreset, validateTenantId } from "./validation";
export { exportAnalytics, exportService } from "./export";
export type { ExportFormat, ExportColumn, ExportRequest, ExportService, ScheduledExportConfig } from "./export";

export { COMPLETED_STATUSES, CHART_COLORS, ORDER_STATUS_COLORS, FUNNEL_STAGES, DEFAULT_DATE_PRESET, CHART_ANIMATION_DURATION, CURRENCY_DISPLAY } from "./constants";
export { track, trackProductEvent, getFunnelCounts, getFunnelDropoff, getConversionRate, getAllEvents } from "./events";

export { createVisitorAdapter } from "./visitors";
export type { VisitorAnalyticsAdapter, VisitorFilter, VisitorProvider, VisitorAnalyticsConfig, PostHogConfig, PlausibleConfig, GA4Config, SelfHostedConfig } from "./visitors";

export type {
  AnalyticsSummary,
  RevenueStats,
  OrderStats,
  ProductStats,
  ConversionStats,
  FunnelStage,
  ChartDataPoint,
  PeriodInfo,
  VisitorStats,
  MetricValue,
  MetricDefinition,
  DashboardSummary,
  AnalyticsEvent,
} from "./types";
