import { SMALL_CATALOG_THRESHOLD } from "./constants";

export interface InsightInput {
  orderCount: number;
  prevOrderCount: number;
  productCount: number;
  revenue: number;
  prevRevenue: number;
  galleryCount: number;
}

type InsightRuleFn = (input: InsightInput) => string | null;

const rules: InsightRuleFn[] = [
  (i) => i.orderCount === 0 && i.productCount === 0
    ? "Add your first product to start selling on your storefront."
    : null,

  (i) => i.productCount > 0 && i.orderCount === 0
    ? "You have products but no orders yet. Share your website to start collecting sales."
    : null,

  (i) => i.orderCount > 0 && i.prevOrderCount > 0
    ? (() => {
        const change = Math.round(((i.orderCount - i.prevOrderCount) / i.prevOrderCount) * 100);
        if (change > 0) return `Orders increased ${change}% compared to the previous period.`;
        if (change < 0) return `Orders declined ${Math.abs(change)}% compared to the previous period.`;
        return null;
      })()
    : null,

  (i) => i.revenue > 0 && i.prevRevenue > 0
    ? (() => {
        const change = Math.round(((i.revenue - i.prevRevenue) / i.prevRevenue) * 100);
        if (change > 20) return `Revenue grew ${change}% — strong performance this period.`;
        if (change < -20) return `Revenue dropped ${Math.abs(change)}%. Consider promoting your products.`;
        return null;
      })()
    : null,

  (i) => i.galleryCount === 0
    ? "Add images to your gallery to showcase your work and build trust."
    : null,

  (i) => i.productCount > 0 && i.productCount <= SMALL_CATALOG_THRESHOLD
    ? "Expand your catalog with more products to increase sales opportunities."
    : null,

  (i) => i.galleryCount > 5 && i.orderCount === 0
    ? "Your gallery has content but no sales yet. Try adding a call-to-action to your bio."
    : null,
];

export function computeInsights(input: InsightInput): string[] {
  const results: string[] = [];
  for (const rule of rules) {
    const insight = rule(input);
    if (insight) results.push(insight);
  }
  return results;
}

export type { InsightRuleFn as InsightRule };
