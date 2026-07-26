/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import {
  buildSeoMetadata, buildJsonLd, buildOpenGraph, buildTwitterCard,
  canIndex, getRobotsDirective, generateSitemapXml,
} from "../seo";
import type { StorefrontData } from "../types";

function makeData(): StorefrontData {
  return {
    tenantId: "t1",
    pages: [
      { id: "p1", slug: "home", isHome: true, slots: [], seo: { title: "My Store", description: "Best store ever", ogImage: "https://example.com/og.jpg" } },
      { id: "p2", slug: "products", isHome: false, slots: [], seo: { title: "Products", description: "Browse products" } },
    ],
    theme: { primary: "#000", secondary: "#fff", accent: "#00f", mode: "dark", fonts: { heading: "Inter", body: "Inter" } },
    navigation: [],
  };
}

describe("buildSeoMetadata", () => {
  it("builds metadata for home", () => {
    const meta = buildSeoMetadata(makeData(), "home", "https://example.com");
    expect(meta.title).toBe("My Store");
    expect(meta.description).toBe("Best store ever");
    expect(meta.canonicalUrl).toBe("https://example.com");
    expect(meta.ogImage).toBe("https://example.com/og.jpg");
  });

  it("builds metadata for products page", () => {
    const meta = buildSeoMetadata(makeData(), "products", "https://example.com/products");
    expect(meta.title).toBe("Products");
    expect(meta.canonicalUrl).toBe("https://example.com/products");
  });

  it("falls back to first page for unknown slug", () => {
    const meta = buildSeoMetadata(makeData(), "unknown", "https://example.com");
    expect(meta.title).toBe("My Store");
  });

  it("sets default ogType", () => {
    const meta = buildSeoMetadata(makeData(), "home", "https://example.com");
    expect(meta.ogType).toBe("profile");
  });
});

describe("buildJsonLd", () => {
  it("generates Person and WebSite schema", () => {
    const ld = buildJsonLd(makeData(), "https://example.com");
    expect(ld).toHaveLength(2);
    expect(ld[0]["@type"]).toBe("Person");
    expect(ld[1]["@type"]).toBe("WebSite");
  });
});

describe("buildOpenGraph", () => {
  it("builds OG data for home", () => {
    const og = buildOpenGraph(makeData(), "home", "https://example.com");
    expect(og.title).toBe("My Store");
    expect(og.url).toBe("https://example.com");
  });

  it("includes image when available", () => {
    const og = buildOpenGraph(makeData(), "home", "https://example.com");
    expect(og.images).toBeDefined();
    expect(og.images![0].url).toBe("https://example.com/og.jpg");
  });
});

describe("buildTwitterCard", () => {
  it("builds twitter card", () => {
    const card = buildTwitterCard(makeData(), "home");
    expect(card.card).toBe("summary_large_image");
    expect(card.title).toBe("My Store");
  });
});

describe("canIndex", () => {
  it("returns true for home page", () => {
    expect(canIndex(makeData(), "home")).toBe(true);
  });

  it("returns false for draft page", () => {
    const data = makeData();
    data.pages.push({ id: "p3", slug: "draft", isHome: false, slots: [], seo: { title: "Draft", description: "" } });
    expect(canIndex(data, "draft")).toBe(false);
  });
});

describe("getRobotsDirective", () => {
  it("returns index for indexable pages", () => {
    expect(getRobotsDirective(true)).toBe("index, follow");
  });

  it("returns noindex for non-indexable pages", () => {
    expect(getRobotsDirective(false)).toBe("noindex, nofollow");
  });
});

describe("generateSitemapXml", () => {
  it("generates valid sitemap XML", () => {
    const xml = generateSitemapXml([{ url: "https://example.com", priority: 1.0 }]);
    expect(xml).toContain("<?xml");
    expect(xml).toContain("<urlset");
    expect(xml).toContain("<loc>https://example.com</loc>");
    expect(xml).toContain("<priority>1</priority>");
  });

  it("includes lastmod when present", () => {
    const xml = generateSitemapXml([{ url: "https://example.com", priority: 1.0, lastmod: "2026-07-26" }]);
    expect(xml).toContain("<lastmod>2026-07-26</lastmod>");
  });

  it("handles multiple entries", () => {
    const xml = generateSitemapXml([
      { url: "https://example.com", priority: 1.0 },
      { url: "https://example.com/about", priority: 0.8 },
    ]);
    expect(xml.match(/<url>/g)!.length).toBe(2);
  });
});
