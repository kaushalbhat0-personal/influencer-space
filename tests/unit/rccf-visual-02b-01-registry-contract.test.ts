import { describe, it, expect, beforeAll, vi } from "vitest";
import { componentRegistry } from "@/lib/registry/components";
import { registerBuiltinComponents } from "@/lib/registry/components/builtins";
import {
  isSerializableFieldDefinition,
  defaultPropsFromFields,
  applyFieldDefaults,
  validateFieldValue,
  withCapabilityState,
  serializeFields,
  deserializeFields,
} from "@/lib/registry/components/fields";
import { toRegistryWire } from "@/lib/registry/components/wire";
import { layoutEngine } from "@/lib/storefront/layout-engine/LayoutEngine";
import type { WebsiteAggregate, PublishedSnapshot, LayoutSnapshot, ThemeSnapshot } from "@/types/snapshot";

// Ensure registry is populated (idempotent — builtins register once)
beforeAll(() => {
  if (componentRegistry.size === 0) registerBuiltinComponents();
  // Re-register if already populated but proof fields missing (dirty reload)
  if (!componentRegistry.get("products.grid")?.fields) {
    // Force re-register by clearing and re-adding — mimic fresh load
    // Vitest isolates modules per run; size check above is enough.
  }
});

function makeAggregate(over: Partial<WebsiteAggregate> = {}): WebsiteAggregate {
  return {
    identity: { name: "Test Creator", tagline: "", bio: "", avatarUrl: null, bannerUrl: null, socialLinks: [] },
    hero: { title: "Hero", subtitle: "", description: "", ctaText: "CTA", ctaLink: "#", socialLinks: [] } as unknown as WebsiteAggregate["hero"],
    products: [],
    gallery: [],
    links: [],
    seo: { title: "", description: "" },
    testimonials: [],
    faq: [],
    timeline: [],
    games: [],
    contentFeed: [],
    courses: [],
    services: [],
    ...over,
  };
}

function makeSnapshot(content: WebsiteAggregate, layout: LayoutSnapshot): PublishedSnapshot {
  const theme: ThemeSnapshot = {
    packageId: "com.creatos.neon-dark",
    colors: { primary: "#6366F1", secondary: "#818CF8", accent: "#A5B4FC", background: "#09090b", foreground: "#fafafa", muted: "#a1a1aa" },
    typography: { heading: "Inter", body: "Inter" },
  };
  return {
    _schema: "creatorstore.snapshot",
    _version: 1,
    metadata: { version: 1, publishedAt: new Date().toISOString(), previousVersion: null, correlationId: "test", generatedBy: "dashboard" },
    content,
    layout,
    theme,
    navigation: [],
    renderingHints: {},
  };
}

describe("RCCF-VISUAL-02B-01 — Puck-style registry contract", () => {
  describe("registry contract", () => {
    it("products.grid and gallery.grid declare fields, defaultProps, render, resolveData", () => {
      const prod = componentRegistry.get("products.grid");
      const gal = componentRegistry.get("gallery.grid");
      expect(prod).toBeDefined();
      expect(gal).toBeDefined();
      expect(prod!.fields).toBeDefined();
      expect(gal!.fields).toBeDefined();
      expect(Array.isArray(prod!.fields)).toBe(true);
      expect(prod!.fields!.length).toBeGreaterThan(0);
      expect(gal!.fields!.length).toBeGreaterThan(0);
      expect(prod!.defaultProps).toBeDefined();
      expect(gal!.defaultProps).toBeDefined();
      expect(typeof prod!.renderer).toBe("function");
      expect(typeof gal!.renderer).toBe("function");
      expect(typeof prod!.resolveData).toBe("function");
      expect(typeof gal!.resolveData).toBe("function");
    });

    it("preserves existing section types/variants (all builtins still registered)", () => {
      expect(componentRegistry.size).toBeGreaterThanOrEqual(20);
      expect(componentRegistry.get("hero.default")).toBeDefined();
      expect(componentRegistry.get("footer.default")).toBeDefined();
      expect(componentRegistry.get("timeline.default")).toBeDefined();
    });

    it("fields are typed and include expected keys for proof components", () => {
      const prodFields = componentRegistry.get("products.grid")!.fields!;
      const col = prodFields.find((f) => f.name === "columns");
      expect(col).toBeDefined();
      expect(col!.type).toBe("number");
      expect(col!.validation).toEqual(expect.objectContaining({ min: 1, max: 6 }));
      const galFields = componentRegistry.get("gallery.grid")!.fields!;
      const layout = galFields.find((f) => f.name === "layout");
      expect(layout!.type).toBe("select");
      expect(layout!.options).toBeDefined();
    });
  });

  describe("field/default serialization", () => {
    it("all fields are serializable (wire-safe, no functions)", () => {
      for (const id of ["products.grid", "gallery.grid"]) {
        const fields = componentRegistry.get(id)!.fields!;
        for (const f of fields) {
          expect(isSerializableFieldDefinition(f)).toBe(true);
          // JSON round-trip preserves
          expect(JSON.parse(JSON.stringify(f))).toEqual(f);
        }
      }
    });

    it("defaultProps derives from fields and is wire-safe", () => {
      const prodDef = componentRegistry.get("products.grid")!;
      const fromFields = defaultPropsFromFields(prodDef.fields!);
      // fromFields subset of defaultProps (registry may add extra)
      for (const [k, v] of Object.entries(fromFields)) {
        expect(prodDef.defaultProps[k]).toEqual(v);
      }
      // Wire round-trip
      const wire = toRegistryWire(prodDef);
      expect(wire).not.toBeNull();
      expect(JSON.parse(JSON.stringify(wire))).toEqual(wire);
    });

    it("applyFieldDefaults merges persisted over defaults", () => {
      const fields = componentRegistry.get("products.grid")!.fields!;
      const merged = applyFieldDefaults(fields, { columns: 5 });
      expect(merged.columns).toBe(5);
      // default from fields when not persisted
      expect(merged.showViewAll).toBe(true);
    });

    it("validateFieldValue enforces min/max for columns", () => {
      const col = componentRegistry.get("products.grid")!.fields!.find((f) => f.name === "columns")!;
      expect(validateFieldValue(col, 0)).toMatch(/>= 1/);
      expect(validateFieldValue(col, 7)).toMatch(/<= 6/);
      expect(validateFieldValue(col, 3)).toBeNull();
    });

    it("serializeFields → deserializeFields round-trip", () => {
      const fields = componentRegistry.get("gallery.grid")!.fields!;
      const wire = serializeFields(fields);
      const restored = deserializeFields(wire);
      expect(restored).toEqual(fields);
    });
  });

  describe("render compatibility (LayoutEngine delegation)", () => {
    it("delegated resolveData for products.grid matches legacy switch output", () => {
      const content = makeAggregate({
        products: [
          { id: "p1", name: "A", description: "Desc", price: 100, imageUrl: "/a.jpg", images: [], slug: "a", isFeatured: true, isActive: true, commerceMode: "ONLINE", whatsappUrl: null },
          { id: "p2", name: "B", description: null, price: 0, imageUrl: null, images: [], slug: "b", isFeatured: false, isActive: true } as unknown as WebsiteAggregate["products"][number],
        ],
      });
      const layout: LayoutSnapshot = {
        pages: [{ id: "p1", name: "Home", slug: "/", isHome: true, order: 0, sections: [{ id: "s1", moduleId: "products.grid", config: { columns: 3 }, order: 0, visible: true }] }],
      };
      const snap = makeSnapshot(content, layout);
      const doc = layoutEngine.resolve(snap);
      const sec = doc.pages[0]!.sections[0]!;
      expect(sec.config.resolvedData).toBeDefined();
      expect(Array.isArray(sec.config.resolvedData)).toBe(true);
      const rows = sec.config.resolvedData as Array<Record<string, unknown>>;
      expect(rows.length).toBe(2);
      expect(rows[0]!.name).toBe("A");
      expect(rows[0]!.isFeatured).toBe(true);
      expect(rows[0]!.whatsappUrl).toBeNull();
      expect(sec.config.resolvedTitle).toBe("Test Creator's Products");
    });

    it("delegated resolveData for gallery.grid matches legacy output", () => {
      const content = makeAggregate({
        gallery: [
          { id: "g1", title: "One", description: "D", imageUrl: "/1.jpg", mediaType: "image", videoUrl: null, altText: "Alt", isFeatured: false },
          { id: "g2", title: "", description: null, imageUrl: "/2.jpg", mediaType: "video", videoUrl: "/v.mp4", altText: null, isFeatured: false },
        ],
      });
      const layout: LayoutSnapshot = {
        pages: [{ id: "p1", name: "Home", slug: "/", isHome: true, order: 0, sections: [{ id: "s1", moduleId: "gallery.grid", config: { columns: 2 }, order: 0, visible: true }] }],
      };
      const snap = makeSnapshot(content, layout);
      const doc = layoutEngine.resolve(snap);
      const sec = doc.pages[0]!.sections[0]!;
      const rows = sec.config.resolvedData as Array<Record<string, unknown>>;
      expect(rows.length).toBe(2);
      expect(rows[0]!.caption).toBe("One");
      expect(rows[1]!.isVideo).toBe(true);
      expect(sec.config.resolvedTitle).toBe("Gallery");
    });

    it("field defaults are applied when config omits a field", () => {
      const content = makeAggregate({ products: [] });
      const layout: LayoutSnapshot = {
        pages: [{ id: "p1", name: "Home", slug: "/", isHome: true, order: 0, sections: [{ id: "s1", moduleId: "products.grid", config: {}, order: 0, visible: true }] }],
      };
      const snap = makeSnapshot(content, layout);
      const doc = layoutEngine.resolve(snap);
      // columns default 3 from fields should be injected
      expect(doc.pages[0]!.sections[0]!.config.columns).toBe(3);
      expect(doc.pages[0]!.sections[0]!.config.showViewAll).toBe(true);
    });

    it("non-migrated sections still resolve via legacy switch", () => {
      const content = makeAggregate({ testimonials: [{ id: "t1", author: "A", role: null, content: "Hi", avatarUrl: null, rating: 5, featured: false, category: "" }] });
      const layout: LayoutSnapshot = {
        pages: [{ id: "p1", name: "Home", slug: "/", isHome: true, order: 0, sections: [{ id: "s1", moduleId: "testimonials.default", config: {}, order: 0, visible: true }] }],
      };
      const snap = makeSnapshot(content, layout);
      const doc = layoutEngine.resolve(snap);
      const sec = doc.pages[0]!.sections[0]!;
      expect(Array.isArray(sec.config.resolvedData)).toBe(true);
      expect((sec.config.resolvedData as unknown[]).length).toBe(1);
    });
  });

  describe("resolveData behavior", () => {
    it("products resolveData is pure and does not mutate content", () => {
      const prodDef = componentRegistry.get("products.grid")!;
      const content = makeAggregate({ products: [{ id: "p1", name: "X", description: null, price: 10, imageUrl: null, images: [], slug: "x", isFeatured: false, isActive: true } as unknown as WebsiteAggregate["products"][number]] });
      const before = JSON.stringify(content);
      const out = prodDef.resolveData!({ content, config: {} });
      expect(JSON.stringify(content)).toBe(before);
      expect(out.resolvedData).toBeDefined();
      expect(out.resolvedTitle).toBeDefined();
    });

    it("gallery resolveData maps mediaType to isVideo correctly", () => {
      const galDef = componentRegistry.get("gallery.grid")!;
      const content = makeAggregate({ gallery: [{ id: "g1", title: "T", description: null, imageUrl: "/a.jpg", mediaType: "image", videoUrl: null, altText: null, isFeatured: false }] });
      const out = galDef.resolveData!({ content, config: {} }) as { resolvedData: Array<Record<string, unknown>> };
      expect(out.resolvedData[0]!.isVideo).toBe(false);
      const content2 = makeAggregate({ gallery: [{ id: "g2", title: "T", description: null, imageUrl: "/a.jpg", mediaType: "video", videoUrl: "/v.mp4", altText: null, isFeatured: false }] });
      const out2 = galDef.resolveData!({ content: content2, config: {} }) as { resolvedData: Array<Record<string, unknown>> };
      expect(out2.resolvedData[0]!.isVideo).toBe(true);
    });

    it("LayoutEngine catches resolveData errors and still returns config", () => {
      const def = componentRegistry.get("products.grid")!;
      const original = def.resolveData;
      def.resolveData = () => { throw new Error("boom"); };
      const content = makeAggregate({ products: [] });
      const layout: LayoutSnapshot = { pages: [{ id: "p1", name: "Home", slug: "/", isHome: true, order: 0, sections: [{ id: "s1", moduleId: "products.grid", config: {}, order: 0, visible: true }] }] };
      const snap = makeSnapshot(content, layout);
      expect(() => layoutEngine.resolve(snap)).not.toThrow();
      // presentation/hasContent still computed
      const doc = layoutEngine.resolve(snap);
      expect(doc.pages[0]!.sections[0]).toBeDefined();
      def.resolveData = original;
    });
  });

  describe("capability gating", () => {
    it("withCapabilityState marks premium fields disabled when capability missing", () => {
      const fields = componentRegistry.get("products.grid")!.fields!;
      const premiumField = fields.find((f) => f.requiresCapability);
      expect(premiumField).toBeDefined();
      const disabledWhenMissing = withCapabilityState(fields, () => false);
      const entry = disabledWhenMissing.find((f) => f.name === premiumField!.name)!;
      expect(entry.disabled).toBe(true);
      const enabledWhenPresent = withCapabilityState(fields, () => true);
      const entry2 = enabledWhenPresent.find((f) => f.name === premiumField!.name)!;
      expect(entry2.disabled).toBe(false);
    });

    it("non-premium fields are never disabled", () => {
      const fields = componentRegistry.get("products.grid")!.fields!.filter((f) => !f.requiresCapability);
      const state = withCapabilityState(fields, () => false);
      for (const f of state) expect(f.disabled).toBe(false);
    });

    it("wire types remain serializable after capability gating (no leakage of functions)", () => {
      const fields = componentRegistry.get("gallery.grid")!.fields!;
      const state = withCapabilityState(fields, () => false);
      const serialized = JSON.parse(JSON.stringify(state));
      expect(serialized).toEqual(state);
      // ensure no function leaked
      for (const f of state) {
        for (const v of Object.values(f)) expect(typeof v === "function").toBe(false);
      }
    });

    it("capability gating does not block storefront render (value preserved)", () => {
      const content = makeAggregate({ products: [] });
      const layout: LayoutSnapshot = {
        pages: [{ id: "p1", name: "Home", slug: "/", isHome: true, order: 0, sections: [{ id: "s1", moduleId: "products.grid", config: { highlightFeatured: true }, order: 0, visible: true }] }],
      };
      const snap = makeSnapshot(content, layout);
      const doc = layoutEngine.resolve(snap);
      // value survives even if capability would be gated in builder
      expect(doc.pages[0]!.sections[0]!.config.highlightFeatured).toBe(true);
    });
  });

  describe("PublishedSnapshot → LayoutEngine → renderer path", () => {
    it("production render path is unchanged — renderers still receive resolvedData + presentation + hasContent", () => {
      const content = makeAggregate({
        products: [{ id: "p1", name: "P", description: null, price: 5, imageUrl: null, images: [], slug: "p", isFeatured: false, isActive: true } as unknown as WebsiteAggregate["products"][number]],
      });
      const layout: LayoutSnapshot = {
        pages: [{ id: "p1", name: "Home", slug: "/", isHome: true, order: 0, sections: [{ id: "s1", moduleId: "products.grid", config: { columns: 2, presentation: { titleOverride: "Shop" } }, order: 0, visible: true }] }],
      };
      const snap = makeSnapshot(content, layout);
      const doc = layoutEngine.resolve(snap);
      const cfg = doc.pages[0]!.sections[0]!.config as Record<string, unknown>;
      expect(cfg.resolvedData).toBeDefined();
      expect(cfg.hasContent).toBeDefined();
      expect(cfg.visibilityMode).toBeDefined();
      // presentation titleOverride applied
      expect(cfg.resolvedTitle).toBe("Shop");
    });
  });
});
