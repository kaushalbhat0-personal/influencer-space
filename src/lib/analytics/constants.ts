export const COMPLETED_STATUSES = ["PAID", "COMPLETED"] as const;
export const COMPLETED_STATUSES_MUTABLE: string[] = ["PAID", "COMPLETED"];

export const ORDER_STATUS_COLORS: Record<string, string> = {
  completed: "#34d399",
  pending: "#f59e0b",
  failed: "#ef4444",
};

export const CHART_COLORS = [
  "#00f5ff", "#a78bfa", "#34d399", "#f59e0b",
  "#ef4444", "#ec4899", "#6366f1", "#14b8a6",
];

export const FUNNEL_STAGES = [
  "Visitors", "Product Views", "Checkout Started", "Payment Completed",
] as const;

export const DEFAULT_DATE_PRESET = "last_30_days";

export const MAX_TOP_PRODUCTS = 10;
export const MAX_CHART_ITEMS = 7;
export const MAX_LOWEST_PERFORMERS = 5;
export const MAX_TOP_PERFORMERS = 5;

export const MINIMUM_INSIGHT_THRESHOLD = 20;
export const SMALL_CATALOG_THRESHOLD = 3;

export const CHART_ANIMATION_DURATION = 300;
export const CHART_ANIMATION_EASE = "ease-in-out";

export const DATE_DISPLAY_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short", day: "numeric",
};

export const CURRENCY_DISPLAY = "INR";
export const LOCALE_DISPLAY = "en-IN";
export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export const CACHE_TTL_MS = 5 * 60 * 1000;
export const MAX_CACHE_ENTRIES = 50;
