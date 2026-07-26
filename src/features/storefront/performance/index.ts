export const CACHE_TAGS = {
  SNAPSHOT: "storefront-snapshot",
  TENANT: "storefront-tenant",
  NAVIGATION: "storefront-nav",
  SEO: "storefront-seo",
} as const;

export function buildCacheTag(...parts: string[]): string {
  return parts.join(":");
}

export function getRevalidationPeriod(pageType: string): number {
  switch (pageType) {
    case "home":
      return 60;
    case "product":
      return 120;
    case "gallery":
      return 300;
    default:
      return 60;
  }
}

export function shouldUseISR(pageType: string): boolean {
  return !["draft", "preview"].includes(pageType);
}

export function getCriticalCssHint(slotCount: number): string[] {
  const hints: string[] = [];
  if (slotCount > 0) hints.push("hero");
  if (slotCount > 3) hints.push("product-card");
  if (slotCount > 6) hints.push("gallery-grid");
  return hints;
}

export function getFontLoadStrategy(fontFamily: string): "swap" | "optional" | "block" {
  const critical = ["Inter", "System-ui", "sans-serif"];
  return critical.includes(fontFamily) ? "swap" : "optional";
}

export function supportsIntersectionObserver(): boolean {
  return typeof window !== "undefined" && "IntersectionObserver" in window;
}
