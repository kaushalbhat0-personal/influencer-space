/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import type {
  StorefrontSlot, StorefrontPage, StorefrontData, StorefrontTheme,
  PreviewToken, VersionEntry, CacheEntry, AnalyticsEvent, SeoMetadata,
} from "../types";

describe("type definitions", () => {
  it("StorefrontSlot is constructable", () => {
    const slot: StorefrontSlot = { id: "s1", moduleId: "hero.default", config: { title: "Hi" } };
    expect(slot.moduleId).toBe("hero.default");
  });

  it("StorefrontPage is constructable", () => {
    const page: StorefrontPage = {
      id: "p1", slug: "home", isHome: true, slots: [], seo: { title: "Store", description: "desc" },
    };
    expect(page.isHome).toBe(true);
  });

  it("StorefrontTheme is constructable", () => {
    const theme: StorefrontTheme = {
      primary: "#000", secondary: "#fff", accent: "#00f", mode: "dark", fonts: { heading: "Inter", body: "Inter" },
    };
    expect(theme.mode).toBe("dark");
  });

  it("StorefrontData is constructable", () => {
    const data: StorefrontData = {
      tenantId: "t1",
      pages: [{ id: "p1", slug: "home", isHome: true, slots: [], seo: { title: "T", description: "D" } }],
      theme: { primary: "#000", secondary: "#fff", accent: "#00f", mode: "dark", fonts: { heading: "Inter", body: "Inter" } },
      navigation: [],
    };
    expect(data.tenantId).toBe("t1");
  });

  it("PreviewToken is constructable", () => {
    const token: PreviewToken = { token: "abc", tenantId: "t1", version: 1, expiresAt: new Date() };
    expect(token.token).toBe("abc");
  });

  it("VersionEntry is constructable", () => {
    const entry: VersionEntry = { version: 1, publishedAt: "2026-01-01", state: "live", label: "v1" };
    expect(entry.state).toBe("live");
  });

  it("CacheEntry is constructable", () => {
    const entry: CacheEntry<string> = { data: "hello", cachedAt: Date.now(), ttl: 60000 };
    expect(entry.data).toBe("hello");
  });

  it("AnalyticsEvent is constructable", () => {
    const event: AnalyticsEvent = { type: "page_view", payload: { slug: "home" }, timestamp: Date.now() };
    expect(event.type).toBe("page_view");
  });

  it("SeoMetadata is constructable", () => {
    const meta: SeoMetadata = {
      title: "Store", description: "Desc", canonicalUrl: "https://example.com", noIndex: false,
    };
    expect(meta.title).toBe("Store");
  });
});
