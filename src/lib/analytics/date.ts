export type DatePreset =
  | "today" | "yesterday" | "last_7_days" | "last_30_days" | "last_90_days"
  | "this_month" | "last_month" | "this_year" | "all";

export interface DateRangePreset {
  value: DatePreset;
  label: string;
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_90_days", label: "Last 90 Days" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_year", label: "This Year" },
  { value: "all", label: "All Time" },
];

export interface DateRange {
  from: Date;
  to: Date;
  preset: DatePreset;
  label: string;
}

export interface FiscalYearConfig {
  startMonth: number;
  startDay: number;
}

export interface BusinessCalendar {
  fiscalYear: FiscalYearConfig;
  weekStartDay: number;
  timezone: string;
  isHoliday?(date: Date): boolean;
}

const defaultCalendar: BusinessCalendar = {
  fiscalYear: { startMonth: 4, startDay: 1 },
  weekStartDay: 1,
  timezone: "Asia/Kolkata",
};

export function now(timezone?: string): Date {
  if (!timezone) return new Date();
  try {
    const str = new Date().toLocaleString("en-US", { timeZone: timezone });
    return new Date(str);
  } catch {
    return new Date();
  }
}

export function computeDateRange(preset: DatePreset, timezone?: string, calendar?: BusinessCalendar): DateRange {
  const cal = calendar ?? defaultCalendar;
  const tz = timezone ?? cal.timezone;
  const tzNow = now(tz);
  const start = new Date(tzNow);
  start.setHours(0, 0, 0, 0);

  switch (preset) {
    case "today":
      return { from: start, to: tzNow, preset, label: "Today" };
    case "yesterday": {
      const y = new Date(start);
      y.setDate(y.getDate() - 1);
      const ye = new Date(y);
      ye.setHours(23, 59, 59, 999);
      return { from: y, to: ye, preset, label: "Yesterday" };
    }
    case "last_7_days": {
      const d = new Date(start);
      d.setDate(d.getDate() - 7);
      return { from: d, to: tzNow, preset, label: "Last 7 Days" };
    }
    case "last_30_days": {
      const d = new Date(start);
      d.setDate(d.getDate() - 30);
      return { from: d, to: tzNow, preset, label: "Last 30 Days" };
    }
    case "last_90_days": {
      const d = new Date(start);
      d.setDate(d.getDate() - 90);
      return { from: d, to: tzNow, preset, label: "Last 90 Days" };
    }
    case "this_month":
      return { from: new Date(tzNow.getFullYear(), tzNow.getMonth(), 1), to: tzNow, preset, label: "This Month" };
    case "last_month": {
      const lm = new Date(tzNow.getFullYear(), tzNow.getMonth() - 1, 1);
      const lme = new Date(tzNow.getFullYear(), tzNow.getMonth(), 0, 23, 59, 59, 999);
      return { from: lm, to: lme, preset, label: "Last Month" };
    }
    case "this_year":
      return { from: new Date(tzNow.getFullYear(), 0, 1), to: tzNow, preset, label: "This Year" };
    case "all":
      return { from: new Date(2020, 0, 1), to: tzNow, preset, label: "All Time" };
  }
}

export function previousPeriod(range: DateRange): DateRange {
  const diff = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - diff),
    to: new Date(range.from.getTime()),
    preset: range.preset,
    label: `Previous ${range.label}`,
  };
}

export function getFiscalYear(date: Date, fiscalYearConfig?: FiscalYearConfig): number {
  const cfg = fiscalYearConfig ?? defaultCalendar.fiscalYear;
  const year = date.getFullYear();
  const fyStart = new Date(year, cfg.startMonth - 1, cfg.startDay);
  return date >= fyStart ? year + 1 : year;
}

export function getWeekStart(date: Date, weekStartDay = 1): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day < weekStartDay ? 7 : 0) + day - weekStartDay;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatCurrency(amount: number, currency = "INR", locale = "en-IN"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatCompact(amount: number, currency = "₹"): string {
  if (amount >= 10000000) return `${currency}${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `${currency}${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${currency}${(amount / 1000).toFixed(1)}k`;
  return `${currency}${amount}`;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}
