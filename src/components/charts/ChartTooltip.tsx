"use client";

import { formatCurrency } from "@/lib/analytics/date";
import { CURRENCY_DISPLAY } from "@/lib/analytics/constants";

export const chartTooltipStyle = {
  background: "#18181b",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  fontSize: 12,
} as const;

export const chartGridStroke = "rgba(255,255,255,0.05)";

export const chartTickStyle = { fontSize: 10, fill: "#a1a1aa" } as const;

export const chartBarRadius: [number, number, number, number] = [4, 4, 0, 0];

export const chartMaxBarSize = 32;

export function formatXAxisDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export function formatYAxisCompact(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
  return `₹${value}`;
}

export function formatTooltipCurrency(value: unknown): string {
  const num = typeof value === "number" ? value : Number(String(value ?? 0));
  return formatCurrency(isNaN(num) ? 0 : num, CURRENCY_DISPLAY);
}

export function defaultChartAriaLabel(title: string, dataLength: number): string {
  return `${title} chart with ${dataLength} data points`;
}
