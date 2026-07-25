import type { HealthCheckItem, HealthScoreResult } from "./types";

interface HealthInput {
  productCount: number;
  orderCount: number;
  galleryCount: number;
  hasCustomDomain: boolean;
  hasSEO: boolean;
}

const SCORE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 50,
} as const;

export function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.HIGH) return "text-green-400";
  if (score >= SCORE_THRESHOLDS.MEDIUM) return "text-amber-400";
  return "text-red-400";
}

export function getScoreDotColor(done: boolean): string {
  return done ? "bg-green-500" : "bg-zinc-700";
}

export function computeHealthChecks(data: HealthInput): HealthScoreResult {
  const checks: HealthCheckItem[] = [
    { label: "Profile", done: true, score: 100, href: "/admin/settings" },
    { label: "Products", done: data.productCount > 0, score: data.productCount > 0 ? 100 : 10, href: "/admin/products" },
    { label: "Gallery", done: data.galleryCount > 0, score: data.galleryCount > 0 ? 100 : 10, href: "/admin/gallery" },
    { label: "Custom Domain", done: data.hasCustomDomain, score: data.hasCustomDomain ? 100 : 30, href: "/admin/settings/domain" },
    { label: "SEO", done: data.hasSEO, score: data.hasSEO ? 100 : 20, href: "/admin/seo" },
    { label: "Commerce", done: data.orderCount > 0, score: data.orderCount > 0 ? 100 : 0, href: "/admin/orders" },
  ];

  const overall = Math.round(checks.reduce((s, c) => s + c.score, 0) / checks.length);

  return { overall, checks };
}
