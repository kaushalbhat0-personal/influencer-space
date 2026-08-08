// ── Theme Token Completion — RCCF-LAUNCH-TRACK-05 (Phase 1/2) ──
// The Theme Runtime is the only authority: the resolver emits the full token
// set (status colors, surfaces, border, focus, secondary text, fonts) and the
// LayoutEngine exposes them as CSS variables for every renderer/button.

import { describe, it, expect } from "vitest";
import { themeResolver } from "@/lib/theme/resolver-new";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import type { PublishedSnapshot } from "@/types/snapshot";

describe("ThemeResolver token completion", () => {
  it("resolves the full color token set for a known theme", () => {
    const r = themeResolver.resolveForSnapshot("com.creatos.neon-dark", "dark");
    expect(r).not.toBeNull();
    expect(r!.colors.primary).toBeTruthy();
    for (const key of ["success", "warning", "danger", "surface", "surfaceSecondary", "border", "focus", "textSecondary"] as const) {
      expect(r!.colors[key]).toBeTypeOf("string");
      expect(r!.colors[key]).toBeTruthy();
    }
  });

  it("carries typography mono/display", () => {
    const r = themeResolver.resolveForSnapshot("com.creatos.neon-dark", "dark");
    expect(r!.typography.mono).toBeTruthy();
    expect(r!.typography.display).toBeTruthy();
  });

  it("falls back gracefully for unknown themes", () => {
    const r = themeResolver.resolveForSnapshot("does-not-exist", "dark");
    expect(r).not.toBeNull();
    expect(r!.colors.success).toBeTruthy();
  });
});

describe("LayoutEngine emits the complete theme token set", () => {
  function snapshot(colors: PublishedSnapshot["theme"]["colors"]): PublishedSnapshot {
    return {
      _schema: "creatorstore.snapshot",
      _version: 1,
      metadata: { version: 1, publishedAt: new Date().toISOString(), previousVersion: null, correlationId: "t", generatedBy: "dashboard" },
      content: {
        identity: { name: "T", tagline: "", bio: "", avatarUrl: null, bannerUrl: null, socialLinks: [] },
        hero: {} as PublishedSnapshot["content"]["hero"],
        seo: { title: "", description: "" },
        products: [], gallery: [], links: [], testimonials: [], faq: [], timeline: [], games: [], contentFeed: [], courses: [], services: [],
      } as unknown as PublishedSnapshot["content"],
      theme: { packageId: "com.creatos.neon-dark", colors, typography: { heading: "Inter", body: "Inter", mono: "Mono", display: "Display" } },
      layout: { pages: [] },
      navigation: [],
      renderingHints: {},
    };
  }

  it("emits status/surface/border/focus/font variables from the theme", () => {
    const doc = layoutEngine.resolve(snapshot({
      primary: "#111111", secondary: "#222222", accent: "#333333",
      background: "#000000", foreground: "#ffffff", muted: "#999999",
      success: "#00aa00", warning: "#cc8800", danger: "#cc0000",
      surface: "#0a0a0a", surfaceSecondary: "#141414", border: "rgba(255,255,255,0.2)",
      focus: "#4444ff", textSecondary: "#bbbbbb",
    }));
    const vars = doc.theme;
    expect(vars["--color-success"]).toBe("#00aa00");
    expect(vars["--color-warning"]).toBe("#cc8800");
    expect(vars["--color-danger"]).toBe("#cc0000");
    expect(vars["--surface-secondary"]).toBe("#141414");
    expect(vars["--color-focus"]).toBe("#4444ff");
    expect(vars["--border"]).toBe("rgba(255,255,255,0.2)");
    expect(vars["--text-secondary"]).toBe("#bbbbbb");
    expect(vars["--brand-font-mono"]).toBe("Mono");
    expect(vars["--brand-font-display"]).toBe("Display");
  });

  it("falls back to derived/global defaults when tokens are absent (old snapshots)", () => {
    const doc = layoutEngine.resolve(snapshot({
      primary: "#6366F1", secondary: "#818CF8", accent: "#A5B4FC",
      background: "#09090b", foreground: "#fafafa", muted: "#a1a1aa",
    }));
    const vars = doc.theme;
    expect(vars["--color-success"]).toBe("#10B981");
    expect(vars["--color-warning"]).toBe("#F59E0B");
    expect(vars["--color-danger"]).toBe("#EF4444");
    expect(vars["--text-secondary"]).toBe("#a1a1aa");
    expect(vars["--border"]).toBeTruthy();
  });
});
