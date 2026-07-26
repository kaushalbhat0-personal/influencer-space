/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import {
  CACHE_TAGS, buildCacheTag, getRevalidationPeriod,
  shouldUseISR, getCriticalCssHint, getFontLoadStrategy, supportsIntersectionObserver,
} from "../performance";

describe("CACHE_TAGS", () => {
  it("has all required tags", () => {
    expect(CACHE_TAGS.SNAPSHOT).toBe("storefront-snapshot");
    expect(CACHE_TAGS.TENANT).toBe("storefront-tenant");
    expect(CACHE_TAGS.NAVIGATION).toBe("storefront-nav");
    expect(CACHE_TAGS.SEO).toBe("storefront-seo");
  });
});

describe("buildCacheTag", () => {
  it("joins parts with colon", () => {
    expect(buildCacheTag("tenant", "t1")).toBe("tenant:t1");
  });

  it("handles single part", () => {
    expect(buildCacheTag("snapshot")).toBe("snapshot");
  });
});

describe("getRevalidationPeriod", () => {
  it("home page revalidates quickly", () => {
    expect(getRevalidationPeriod("home")).toBe(60);
  });

  it("product page revalidates at 120s", () => {
    expect(getRevalidationPeriod("product")).toBe(120);
  });

  it("default period is 60s", () => {
    expect(getRevalidationPeriod("unknown")).toBe(60);
  });
});

describe("shouldUseISR", () => {
  it("enables ISR for home", () => {
    expect(shouldUseISR("home")).toBe(true);
  });

  it("disables ISR for draft", () => {
    expect(shouldUseISR("draft")).toBe(false);
  });

  it("disables ISR for preview", () => {
    expect(shouldUseISR("preview")).toBe(false);
  });
});

describe("getCriticalCssHint", () => {
  it("suggests hero for any slots", () => {
    const hints = getCriticalCssHint(1);
    expect(hints).toContain("hero");
  });

  it("suggests product-card for 4+ slots", () => {
    const hints = getCriticalCssHint(4);
    expect(hints).toContain("product-card");
  });

  it("suggests gallery-grid for 7+ slots", () => {
    const hints = getCriticalCssHint(7);
    expect(hints).toContain("gallery-grid");
  });

  it("returns only hero for 1 slot", () => {
    const hints = getCriticalCssHint(1);
    expect(hints).toEqual(["hero"]);
  });
});

describe("getFontLoadStrategy", () => {
  it("uses swap for critical fonts", () => {
    expect(getFontLoadStrategy("Inter")).toBe("swap");
  });

  it("uses optional for non-critical fonts", () => {
    expect(getFontLoadStrategy("Roboto")).toBe("optional");
  });
});

describe("supportsIntersectionObserver", () => {
  it("returns false in non-browser environment", () => {
    expect(supportsIntersectionObserver()).toBe(false);
  });
});
