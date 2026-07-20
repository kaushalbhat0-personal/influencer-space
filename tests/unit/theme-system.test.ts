import { describe, it, expect, beforeEach } from "vitest";
import { ThemeRegistry, themeRegistry } from "@/lib/builder/theme/registry";
import { ThemeResolver } from "@/lib/builder/theme/resolver";
import { ThemeSerializer } from "@/lib/builder/theme/serializer";
import { ThemeDiagnosticsEngine } from "@/lib/builder/theme/diagnostics";
import { ThemeQueryService } from "@/lib/builder/theme/query";
import type { ThemeDefinition } from "@/lib/builder/theme/types";

const sampleTheme: ThemeDefinition = {
  id: "test-theme", name: "Test Theme", version: "1.0.0",
  description: "Test", author: "Test",
  groups: [
    { id: "colors", label: "Colors", category: "color", tokens: [
      { key: "color.primary", value: "#2563EB", category: "color", group: "colors", editable: true, source: "theme" },
      { key: "color.secondary", value: "#7C3AED", category: "color", group: "colors", editable: true, source: "theme" },
      { key: "color.accent", value: "{color.primary}", category: "color", group: "colors", editable: true, source: "theme" },
    ]},
    { id: "typography", label: "Typography", category: "typography", tokens: [
      { key: "font.base", value: "16px", category: "typography", group: "typography", editable: true, source: "theme" },
    ]},
    { id: "spacing", label: "Spacing", category: "spacing", tokens: [
      { key: "space.md", value: "16px", category: "spacing", group: "spacing", editable: true, source: "theme" },
      { key: "space.lg", value: "{space.md}", category: "spacing", group: "spacing", editable: true, source: "theme" },
    ]},
  ],
  metadata: {},
};

describe("ThemeSystem", () => {
  beforeEach(() => {
    themeRegistry.load(sampleTheme);
  });

  describe("ThemeRegistry", () => {
    it("should load a theme", () => {
      expect(themeRegistry.size).toBeGreaterThan(0);
      expect(themeRegistry.themeName).toBe("Test Theme");
    });

    it("should get tokens by key", () => {
      const token = themeRegistry.getToken("color.primary");
      expect(token).not.toBeNull();
      expect(token!.value).toBe("#2563EB");
    });

    it("should list tokens by category", () => {
      const colors = themeRegistry.listTokens({ category: "color" });
      expect(colors.length).toBe(3);
    });

    it("should list tokens by search", () => {
      const results = themeRegistry.listTokens({ search: "primary" });
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it("should add and remove tokens", () => {
      expect(themeRegistry.addToken("colors", { key: "color.test", value: "#FFF", category: "color" })).toBe(true);
      expect(themeRegistry.getToken("color.test")).not.toBeNull();
      expect(themeRegistry.removeToken("color.test")).toBe(true);
      expect(themeRegistry.getToken("color.test")).toBeNull();
    });

    it("should prevent duplicate token keys", () => {
      expect(themeRegistry.addToken("colors", { key: "color.primary", value: "#000", category: "color" })).toBe(false);
    });
  });

  describe("ThemeResolver", () => {
    it("should resolve literal values", () => {
      const resolver = new ThemeResolver();
      const val = resolver.resolveSingle("color.primary");
      expect(val).toBe("#2563EB");
    });

    it("should resolve token references", () => {
      const resolver = new ThemeResolver();
      const val = resolver.resolveSingle("color.accent");
      expect(val).toBe("#2563EB");
    });

    it("should resolve nested references", () => {
      const resolver = new ThemeResolver();
      const val = resolver.resolveSingle("space.lg");
      expect(val).toBe("16px");
    });

    it("should return null for unknown keys", () => {
      const resolver = new ThemeResolver();
      expect(resolver.resolveSingle("unknown.key")).toBeNull();
    });

    it("should detect circular references gracefully", () => {
      themeRegistry.load({
        id: "circ", name: "Circ", version: "1", description: "", author: "",
        groups: [{ id: "c", label: "C", category: "custom", tokens: [
          { key: "a", value: "{b}", category: "custom", editable: true, source: "theme" },
          { key: "b", value: "{a}", category: "custom", editable: true, source: "theme" },
        ]}],
        metadata: {},
      });
      const resolver = new ThemeResolver();
      const cycles = resolver.detectCircularReferences();
      expect(cycles.length).toBeGreaterThan(0);
      themeRegistry.load(sampleTheme);
    });
  });

  describe("ThemeSerializer", () => {
    it("should serialize and deserialize", () => {
      const s = new ThemeSerializer();
      const serialized = s.serialize();
      expect(serialized.themeId).toBe("test-theme");

      const def = s.deserialize(serialized);
      expect(def).not.toBeNull();
      expect(def!.name).toBe("Test Theme");
    });
  });

  describe("ThemeDiagnostics", () => {
    it("should report token counts", () => {
      const d = new ThemeDiagnosticsEngine();
      const report = d.run();
      expect(report.totalTokens).toBeGreaterThan(0);
      expect(report.totalGroups).toBeGreaterThan(0);
    });

    it("should detect invalid references", () => {
      themeRegistry.load({
        id: "bad", name: "Bad", version: "1", description: "", author: "",
        groups: [{ id: "x", label: "X", category: "custom", tokens: [
          { key: "bad.ref", value: "{nonexistent}", category: "custom", editable: true, source: "theme" },
        ]}],
        metadata: {},
      });
      const d = new ThemeDiagnosticsEngine();
      const report = d.run();
      expect(report.invalidReferences.length).toBeGreaterThan(0);
      themeRegistry.load(sampleTheme);
    });
  });

  describe("ThemeQueryService", () => {
    it("should return resolved theme", () => {
      const q = new ThemeQueryService();
      const resolved = q.getResolved();
      expect(resolved["color.accent"]).toBe("#2563EB");
    });

    it("should return token count", () => {
      const q = new ThemeQueryService();
      expect(q.getTokenCount()).toBeGreaterThan(0);
    });
  });
});
