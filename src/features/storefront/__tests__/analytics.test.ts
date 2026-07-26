/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  onAnalyticsEvent, trackEvent, trackPageView, trackCtaClick,
  trackProductClick, trackLinkClick, trackScrollDepth, trackConversion,
  createConsoleAnalytics,
} from "../analytics";

describe("analytics event system", () => {
  beforeEach(() => {
    // Reset handlers by tracking and removing all
  });

  it("trackEvent fires all registered handlers", () => {
    const handler = vi.fn();
    const unsub = onAnalyticsEvent(handler);
    trackEvent("page_view", { slug: "home" });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: "page_view", payload: { slug: "home" } }),
    );
    unsub();
  });

  it("unsub removes handler", () => {
    const handler = vi.fn();
    const unsub = onAnalyticsEvent(handler);
    unsub();
    trackEvent("page_view");
    expect(handler).not.toHaveBeenCalled();
  });

  it("handlers receive timestamp", () => {
    const handler = vi.fn();
    onAnalyticsEvent(handler);
    trackEvent("page_view");
    expect(handler.mock.calls[0][0].timestamp).toBeGreaterThan(0);
  });

  it("one failing handler does not block others", () => {
    const badHandler = vi.fn(() => { throw new Error("fail"); });
    const goodHandler = vi.fn();
    onAnalyticsEvent(badHandler);
    onAnalyticsEvent(goodHandler);
    expect(() => trackEvent("page_view")).not.toThrow();
    expect(goodHandler).toHaveBeenCalled();
  });
});

describe("track helpers", () => {
  it("trackPageView sends correct event", () => {
    const handler = vi.fn();
    onAnalyticsEvent(handler);
    trackPageView("home", "t1");
    expect(handler.mock.calls[0][0].type).toBe("page_view");
  });

  it("trackCtaClick sends correct event", () => {
    const handler = vi.fn();
    onAnalyticsEvent(handler);
    trackCtaClick("Shop Now", "/products");
    expect(handler.mock.calls[0][0].type).toBe("cta_click");
  });

  it("trackProductClick sends correct event", () => {
    const handler = vi.fn();
    onAnalyticsEvent(handler);
    trackProductClick("p1", "T-Shirt");
    expect(handler.mock.calls[0][0].type).toBe("product_click");
  });

  it("trackLinkClick sends correct event", () => {
    const handler = vi.fn();
    onAnalyticsEvent(handler);
    trackLinkClick("https://example.com", "Example");
    expect(handler.mock.calls[0][0].type).toBe("link_click");
  });

  it("trackScrollDepth sends correct event", () => {
    const handler = vi.fn();
    onAnalyticsEvent(handler);
    trackScrollDepth(50, "home");
    expect(handler.mock.calls[0][0].type).toBe("scroll_depth");
  });

  it("trackConversion sends correct event", () => {
    const handler = vi.fn();
    onAnalyticsEvent(handler);
    trackConversion("purchase", 100);
    expect(handler.mock.calls[0][0].type).toBe("conversion");
  });
});

describe("createConsoleAnalytics", () => {
  it("creates a handler that logs", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const handler = createConsoleAnalytics();
    handler({ type: "page_view", payload: {}, timestamp: Date.now() });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
