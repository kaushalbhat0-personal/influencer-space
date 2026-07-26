import type { AnalyticsEvent } from "../types";

type AnalyticsHandler = (event: AnalyticsEvent) => void;

const handlers: Set<AnalyticsHandler> = new Set();

export function onAnalyticsEvent(handler: AnalyticsHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function trackEvent(type: AnalyticsEvent["type"], payload: Record<string, unknown> = {}): void {
  const event: AnalyticsEvent = { type, payload, timestamp: Date.now() };
  Array.from(handlers).forEach((handler) => {
    try {
      handler(event);
    } catch {
      // silently fail individual handlers
    }
  });
}

export function trackPageView(slug: string, tenantId: string): void {
  trackEvent("page_view", { slug, tenantId });
}

export function trackCtaClick(label: string, href: string): void {
  trackEvent("cta_click", { label, href });
}

export function trackProductClick(productId: string, productName: string): void {
  trackEvent("product_click", { productId, productName });
}

export function trackLinkClick(url: string, title: string): void {
  trackEvent("link_click", { url, title });
}

export function trackScrollDepth(depth: number, pageSlug: string): void {
  trackEvent("scroll_depth", { depth, pageSlug });
}

export function trackConversion(type: string, value?: number): void {
  trackEvent("conversion", { conversionType: type, value });
}

export function createAnalyticsMiddleware() {
  return (event: AnalyticsEvent) => {
    if (typeof window === "undefined") return;
    try {
      const { fetch } = window;
      fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
        keepalive: true,
      });
    } catch {
      // silently fail
    }
  };
}

export function createConsoleAnalytics(): AnalyticsHandler {
  return (event: AnalyticsEvent) => {
    console.log(`[analytics] ${event.type}`, event.payload);
  };
}
