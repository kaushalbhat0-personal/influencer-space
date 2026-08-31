// ── RCCF-71.1 — Canonical Theme Foundation (Phase 1) ─────────────────────
// Guardrails that the persisted Website.themeConfig appearance values
// (borderRadius, layoutDensity) and the heading/body fonts reach the CANONICAL
// runtime — snapshot → LayoutEngine → CSS vars → renderer — identically in
// Builder preview, the preview route and the published storefront. No
// Builder-only CSS, no second theme authority, no plan/capability changes.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildRuntimeSnapshot, EMPTY_AGGREGATE } from "@/lib/storefront/build-snapshot";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import type { PublishedSnapshot } from "@/types/snapshot";

const repoRoot = resolve(process.cwd());

function read(file: string): string {
  return readFileSync(resolve(repoRoot, file), "utf8");
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    websiteId: "w1",
    correlationId: "c1",
    builderPages: [{ id: "p", name: "Home", slug: "/", order: 0, isHome: true, sections: [], theme: "default", metadata: {} }],
    aggregate: { ...EMPTY_AGGREGATE, hero: { title: "Hi", subtitle: "", description: "" } },
    navItems: [],
    themePackageId: "com.creatos.neon-dark",
    themeColors: {},
    themeFonts: {},
    ...overrides,
  };
}

describe("RCCF-71.1 — borderRadius reaches the canonical snapshot/runtime", () => {
  it("persisted themeConfig.borderRadius is baked into snapshot.theme.borderRadius", () => {
    const snapshot = buildRuntimeSnapshot(baseInput({ themeConfig: { borderRadius: "16", layoutDensity: "spacious" } }));
    expect(snapshot.theme.borderRadius).toBe("16");
    expect(snapshot.theme.layoutDensity).toBe("spacious");
  });

  it("LayoutEngine emits the full radius scale derived from the base px", () => {
    const snapshot = buildRuntimeSnapshot(baseInput({ themeConfig: { borderRadius: "16" } }));
    const vars = layoutEngine.resolve(snapshot).theme;
    expect(vars["--radius-sm"]).toBe("4px");
    expect(vars["--radius-md"]).toBe("12px");
    expect(vars["--radius-lg"]).toBe("16px");
    expect(vars["--radius-xl"]).toBe("24px");
    expect(vars["--radius-2xl"]).toBe("32px");
    expect(vars["--radius-3xl"]).toBe("48px");
    expect(vars["--radius-full"]).toBe("9999px");
  });

  it("radius 0 clamps to a flat scale", () => {
    const snapshot = buildRuntimeSnapshot(baseInput({ themeConfig: { borderRadius: "0" } }));
    const vars = layoutEngine.resolve(snapshot).theme;
    expect(vars["--radius-lg"]).toBe("0px");
    expect(vars["--radius-xl"]).toBe("0px");
  });
});

describe("RCCF-71.1 — layoutDensity reaches the canonical runtime and changes section spacing", () => {
  it.each(["compact", "comfortable", "spacious"] as const)("%s maps to a controlled --section-spacing", (density) => {
    const snapshot = buildRuntimeSnapshot(baseInput({ themeConfig: { layoutDensity: density } }));
    const vars = layoutEngine.resolve(snapshot).theme;
    const expected = density === "compact" ? "2rem" : density === "spacious" ? "5rem" : "3rem";
    expect(vars["--section-spacing"]).toBe(expected);
  });

  it("section wrappers consume --section-spacing instead of a hardcoded py-12", () => {
    const src = read("src/lib/registry/components/renderers.tsx");
    expect(src).toContain("var(--section-spacing,3rem)");
    expect(src).not.toContain("px-4 py-12");
  });
});

describe("RCCF-71.1 — old snapshots without appearance fields render safely", () => {
  it("defaults to the 8px scale + comfortable spacing when fields are absent", () => {
    const snapshot = buildRuntimeSnapshot(baseInput());
    expect(snapshot.theme.borderRadius).toBeUndefined();
    expect(snapshot.theme.layoutDensity).toBeUndefined();
    const vars = layoutEngine.resolve(snapshot).theme;
    expect(vars["--radius-lg"]).toBe("8px");
    expect(vars["--section-spacing"]).toBe("3rem");
  });

  it("renderers keep a fallback so a missing var never breaks layout", () => {
    const src = read("src/lib/registry/components/renderers.tsx");
    expect(src).toContain("var(--radius-lg,0.5rem)");
    expect(src).toContain("var(--radius-xl,0.75rem)");
  });
});

describe("RCCF-71.1 — typography values reach the renderer (no hardcoded Inter block)", () => {
  it("LayoutEngine emits the resolved heading/body fonts", () => {
    const snapshot = buildRuntimeSnapshot(
      baseInput({ themeFonts: { heading: "Inter, system-ui, sans-serif", body: "Inter, system-ui, sans-serif" } }),
    );
    const vars = layoutEngine.resolve(snapshot).theme;
    expect(vars["--brand-font-heading"]).toContain("Inter");
    expect(vars["--brand-font-body"]).toContain("Inter");
  });

  it("the theme runtime root consumes --brand-font-* (globals.css)", () => {
    const css = read("src/app/globals.css");
    expect(css).toContain(".theme-root");
    expect(css).toContain("var(--brand-font-body");
    expect(css).toContain("var(--brand-font-heading");
  });

  it("both storefront main and builder canvas carry .theme-root", () => {
    const storefront = read("src/components/storefront/StorefrontPage.tsx");
    const canvas = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(storefront).toMatch(/@container\/main theme-root/);
    expect(canvas).toMatch(/@container\/main theme-root/);
  });
});

describe("RCCF-71.1 — Builder preview and published snapshot receive the SAME values", () => {
  it("buildRuntimeSnapshot is the single server assembly (threads themeConfig)", () => {
    const src = read("src/lib/storefront/build-snapshot.ts");
    expect(src).toContain("themeConfig?: Record<string, string>");
    expect(src).toContain("borderRadius: input.themeConfig?.borderRadius");
  });

  it("the builder canvas resolves appearance through the SAME resolver overrides", () => {
    const canvas = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(canvas).toContain("themeConfig.borderRadius");
    expect(canvas).toContain("themeConfig.layoutDensity");
    expect(canvas).toContain("themeResolver.resolveForSnapshot");
  });

  it("getLivePreviewData returns themeConfig to the canvas", () => {
    const src = read("src/actions/builder-preview.actions.ts");
    expect(src).toContain("themeConfig: true");
    expect(src).toContain("themeConfig: (website?.themeConfig ?? {})");
  });

  it("every buildRuntimeSnapshot caller threads themeConfig (publish/preview/construction/parity)", () => {
    expect(read("src/lib/publishing/service.ts")).toContain("themeConfig: websiteThemeConfig");
    expect(read("src/lib/storefront/storefront-loader.ts")).toContain("themeConfig: (website.themeConfig ?? {})");
    expect(read("src/actions/construction.actions.ts")).toContain("themeConfig: (website.themeConfig ?? {})");
    expect(read("src/lib/observability/runtime-parity.ts")).toContain("themeConfig: (website.themeConfig ?? {})");
  });
});

describe("RCCF-71.1 — preview-only theme selection does not persist", () => {
  it("workspace autosave/save/publish always persist the APPLIED theme, never the preview", () => {
    const src = read("src/features/builder/components/workspace.tsx");
    expect(src).toContain("performSave(currentThemeId, currentThemeId)");
    expect(src).not.toContain("performSave(previewThemeId");
  });
});

describe("RCCF-71.1 — no second theme authority / no Builder-only CSS", () => {
  it("ThemeSnapshot gains the appearance fields, additively and optional", () => {
    const snap = read("src/types/snapshot.ts");
    expect(snap).toContain("borderRadius?: string");
    expect(snap).toContain('layoutDensity?: "compact" | "comfortable" | "spacious"');
  });

  it("the resolver owns appearance overrides alongside theme-package resolution", () => {
    const resolver = read("src/lib/theme/resolver-new.ts");
    expect(resolver).toContain("borderRadius?: string");
    expect(resolver).toContain("layoutDensity?:");
    expect(resolver).toContain("overrides.borderRadius ?? base.borderRadius");
  });

  it("renderers consume canonical CSS vars — no hardcoded rounded-lg anywhere", () => {
    const src = read("src/lib/registry/components/renderers.tsx");
    expect(src).not.toContain("rounded-lg");
    expect(src).not.toContain("rounded-xl");
    expect(src).not.toContain("rounded-md");
    expect(src).toContain("var(--radius-lg,");
    expect(src).toContain("var(--radius-xl,");
    expect(src).toContain("var(--radius-md,");
  });

  it("PreviewShell emits canonical --brand-* vars instead of legacy --accent/--primary/--secondary", () => {
    const src = read("src/components/admin/PreviewShell.tsx");
    expect(src).toContain("--brand-primary");
    expect(src).toContain("--brand-secondary");
    expect(src).toContain("--brand-accent");
    expect(src).not.toContain('"--accent"');
    expect(src).not.toContain('"--primary"');
    expect(src).not.toContain('"--secondary"');
  });
});

describe("RCCF-71.1 — capability/plan boundaries untouched", () => {
  it("theme.actions gates appearance through the canonical capability runtime (no raw plan strings)", () => {
    const src = read("src/actions/theme.actions.ts");
    // Canonical entitlement helper + the advanced_builder appearance gate
    // (the premium_themes appearance gate was migrated to advanced_builder by
    // RCCF-71.6.2; applyThemePackage still enforces premium themes via
    // themeEntitlementDecision).
    expect(src).toContain("entitlementService.has(resolved.code, capability)");
    expect(src).toContain('rejectMissing(["advanced_builder"])');
    expect(src).not.toContain('capabilityService');
  });

  it("no plan limits were hardcoded into the theme pipeline", () => {
    expect(read("src/lib/storefront/build-snapshot.ts")).not.toMatch(/plan|tier|quota/i);
    expect(read("src/lib/storefront/layout-engine/LayoutEngine.ts")).not.toMatch(/plan|tier|quota/i);
  });

  it("the snapshot contract remains schema-version 1 (no breaking schema change)", () => {
    const snap = read("src/types/snapshot.ts");
    expect(snap).toContain("CURRENT_SNAPSHOT_VERSION = 1");
  });
});

// ── Behavior smoke: a full old-snapshot → LayoutEngine round trip never throws ──
describe("RCCF-71.1 — published snapshot round trip", () => {
  it("resolves a published snapshot through LayoutEngine with the full token set", () => {
    const snapshot: PublishedSnapshot = {
      _schema: "creatorstore.snapshot",
      _version: 1,
      metadata: { version: 1, publishedAt: new Date().toISOString(), previousVersion: null, correlationId: "t", generatedBy: "dashboard" },
      content: {
        identity: { name: "T", tagline: "", bio: "", avatarUrl: null, bannerUrl: null, socialLinks: [] },
        hero: { title: "Hi", subtitle: "", description: "" } as PublishedSnapshot["content"]["hero"],
        seo: { title: "", description: "" },
        products: [], gallery: [], links: [], testimonials: [], faq: [], timeline: [], games: [], contentFeed: [], courses: [], services: [],
      } as unknown as PublishedSnapshot["content"],
      theme: {
        packageId: "com.creatos.neon-dark",
        colors: { primary: "#111", secondary: "#222", accent: "#333", background: "#000", foreground: "#fff", muted: "#999" },
        typography: { heading: "Inter", body: "Inter" },
      },
      layout: { pages: [] },
      navigation: [],
      renderingHints: {},
    };
    const doc = layoutEngine.resolve(snapshot);
    expect(doc.theme["--radius-lg"]).toBe("8px");
    expect(doc.theme["--section-spacing"]).toBe("3rem");
    expect(doc.theme["--brand-font-heading"]).toBe("Inter");
  });
});