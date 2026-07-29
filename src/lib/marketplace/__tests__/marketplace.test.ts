import { describe, it, expect, beforeEach } from "vitest";
import { MarketplaceRegistry } from "../registry";
import type { MarketplaceProvider } from "../provider";
import type { MarketplacePackage } from "../types";

function createMockProvider(type: string, name: string, packages: MarketplacePackage[]): MarketplaceProvider {
  return {
    type,
    name,
    initialize() { /* noop */ },
    getAll() { return packages; },
    getById(id: string) { return packages.find((p) => p.id === id); },
    getByType(t: string) { return packages.filter((p) => p.type === t); },
    search(query: string) {
      const q = query.toLowerCase();
      return packages.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    },
  };
}

function makeThemePkg(overrides: Partial<MarketplacePackage> = {}): MarketplacePackage {
  return {
    id: "theme:com.test.dark",
    type: "theme",
    name: "Dark Theme",
    description: "A dark theme",
    version: "1.0.0",
    author: { name: "Test", type: "platform", id: "test" },
    category: "dark",
    tags: ["dark", "minimal"],
    previewImages: [],
    pricing: { free: true },
    compatiblePackages: [],
    requiredCapabilities: [],
    source: "mock",
    sourceId: "com.test.dark",
    sourceRegistry: "theme",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeBlueprintPkg(overrides: Partial<MarketplacePackage> = {}): MarketplacePackage {
  return {
    id: "blueprint:com.test.creator",
    type: "blueprint",
    name: "Creator Blueprint",
    description: "A creator blueprint",
    version: "1.0.0",
    author: { name: "Test", type: "platform", id: "test" },
    category: "creator",
    tags: ["creator", "portfolio"],
    previewImages: [],
    pricing: { free: true },
    compatiblePackages: ["theme:com.test.dark"],
    requiredCapabilities: [],
    source: "mock",
    sourceId: "com.test.creator",
    sourceRegistry: "blueprint",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("MarketplaceRegistry", () => {
  let registry: MarketplaceRegistry;

  beforeEach(() => {
    registry = new MarketplaceRegistry();
  });

  describe("provider registration", () => {
    it("registers a provider and exposes its packages", () => {
      const provider = createMockProvider("test", "Test", [makeThemePkg()]);
      registry.registerProvider(provider);
      expect(registry.getAll().length).toBe(1);
      expect(registry.getProviders().length).toBe(1);
      expect(registry.getProviders()[0]?.type).toBe("test");
    });

    it("throws when registering duplicate provider type", () => {
      const provider = createMockProvider("test", "Test", []);
      registry.registerProvider(provider);
      expect(() => registry.registerProvider(provider)).toThrow();
    });

    it("removes a provider and its packages", () => {
      const provider = createMockProvider("test", "Test", [makeThemePkg()]);
      registry.registerProvider(provider);
      expect(registry.getAll().length).toBe(1);
      registry.removeProvider("test");
      expect(registry.getAll().length).toBe(0);
    });
  });

  describe("query", () => {
    beforeEach(() => {
      const provider = createMockProvider("test", "Test", [
        makeThemePkg({ id: "theme:a", name: "Alpha", category: "dark", tags: ["dark"], pricing: { free: true }, compatiblePackages: [] }),
        makeThemePkg({ id: "theme:b", name: "Beta", category: "light", tags: ["light"], pricing: { free: false, price: 9.99 }, requiredCapabilities: ["premium_themes"], compatiblePackages: [] }),
        makeBlueprintPkg({ id: "blueprint:c", name: "Gamma", category: "creator", tags: ["creator"], compatiblePackages: ["theme:a"] }),
      ]);
      registry.registerProvider(provider);
    });

    it("returns all packages", () => {
      expect(registry.getAll().length).toBe(3);
    });

    it("filters by type", () => {
      expect(registry.getAll({ type: "theme" }).length).toBe(2);
      expect(registry.getAll({ type: "blueprint" }).length).toBe(1);
    });

    it("filters by category", () => {
      expect(registry.getAll({ category: "dark" }).length).toBe(1);
      expect(registry.getAll({ category: "creator" }).length).toBe(1);
    });

    it("filters by free status", () => {
      expect(registry.getAll({ free: true }).length).toBe(2);
      expect(registry.getAll({ free: false }).length).toBe(1);
    });

    it("searches by text", () => {
      expect(registry.getAll({ search: "alpha" }).length).toBe(1);
      expect(registry.getAll({ search: "beta" }).length).toBe(1);
      expect(registry.getAll({ search: "gamma" }).length).toBe(1);
      expect(registry.getAll({ search: "nonexistent" }).length).toBe(0);
    });

    it("filters by compatibility", () => {
      const compatible = registry.getAll({ compatibleWith: "blueprint:c" });
      expect(compatible.length).toBe(1);
      expect(compatible[0]?.id).toBe("theme:a");
    });

    it("sorts by name", () => {
      const results = registry.getAll({ sort: "name" });
      expect(results[0]?.name).toBe("Alpha");
      expect(results[2]?.name).toBe("Gamma");
    });

    it("sorts by newest", () => {
      const results = registry.getAll({ sort: "newest" });
      expect(results.length).toBe(3);
    });

    it("paginates with offset and limit", () => {
      const results = registry.getAll({ limit: 2 });
      expect(results.length).toBe(2);
      const page2 = registry.getAll({ offset: 2, limit: 2 });
      expect(page2.length).toBe(1);
    });
  });

  describe("getById", () => {
    it("looks up a package by its marketplace ID", () => {
      const provider = createMockProvider("test", "Test", [makeThemePkg()]);
      registry.registerProvider(provider);
      const pkg = registry.getById("theme:com.test.dark");
      expect(pkg).toBeDefined();
      expect(pkg?.name).toBe("Dark Theme");
    });

    it("returns undefined for unknown ID", () => {
      expect(registry.getById("nonexistent")).toBeUndefined();
    });
  });

  describe("getByType", () => {
    it("returns all packages of a type", () => {
      const provider = createMockProvider("test", "Test", [
        makeThemePkg(),
        makeBlueprintPkg(),
        makeThemePkg({ id: "theme:com.test.light", name: "Light Theme" }),
      ]);
      registry.registerProvider(provider);
      expect(registry.getByType("theme").length).toBe(2);
      expect(registry.getByType("blueprint").length).toBe(1);
    });
  });

  describe("getCategories", () => {
    it("returns sorted unique categories", () => {
      const provider = createMockProvider("test", "Test", [
        makeThemePkg({ category: "dark" }),
        makeBlueprintPkg({ category: "creator" }),
        makeThemePkg({ id: "theme:light", name: "Light", category: "light" }),
      ]);
      registry.registerProvider(provider);
      expect(registry.getCategories()).toEqual(["creator", "dark", "light"]);
    });

    it("filters categories by type", () => {
      const provider = createMockProvider("test", "Test", [
        makeThemePkg({ category: "dark" }),
        makeBlueprintPkg({ category: "creator" }),
      ]);
      registry.registerProvider(provider);
      expect(registry.getCategories("blueprint")).toEqual(["creator"]);
    });
  });

  describe("featured and premium", () => {
    beforeEach(() => {
      const provider = createMockProvider("test", "Test", [
        makeThemePkg({ id: "theme:a", featured: true }),
        makeThemePkg({ id: "theme:b", requiredCapabilities: ["premium_themes"], pricing: { free: false, price: 9.99 } }),
        makeBlueprintPkg({ id: "blueprint:c", featured: true }),
      ]);
      registry.registerProvider(provider);
    });

    it("getFeatured returns featured packages", () => {
      const featured = registry.getFeatured();
      expect(featured.length).toBe(2);
    });

    it("getFeatured filters by type", () => {
      expect(registry.getFeatured("theme").length).toBe(1);
    });

    it("getPremium returns packages with required capabilities", () => {
      const premium = registry.getPremium();
      expect(premium.length).toBe(1);
      expect(premium[0]?.id).toBe("theme:b");
    });

    it("getFree returns free packages", () => {
      const free = registry.getFree();
      expect(free.length).toBe(2);
    });
  });

  describe("compatibility", () => {
    it("returns compatible packages", () => {
      const provider = createMockProvider("test", "Test", [
        makeBlueprintPkg(),
        makeThemePkg({ id: "theme:com.test.dark" }),
      ]);
      registry.registerProvider(provider);
      const compatible = registry.getCompatible("blueprint:com.test.creator");
      expect(compatible.length).toBe(1);
      expect(compatible[0]?.id).toBe("theme:com.test.dark");
    });
  });

  describe("installation tracking", () => {
    it("records install and increments download count", () => {
      const provider = createMockProvider("test", "Test", [makeThemePkg()]);
      registry.registerProvider(provider);
      registry.recordInstall("theme:com.test.dark");
      expect(registry.isInstalled("theme:com.test.dark")).toBe(true);
      expect(registry.getInstallRecord("theme:com.test.dark")).toBeDefined();
      expect(registry.getInstallRecord("theme:com.test.dark")?.packageId).toBe("theme:com.test.dark");
      const pkg = registry.getById("theme:com.test.dark");
      expect(pkg?.downloadCount).toBe(1);
    });

    it("getInstalled returns all installed packages", () => {
      const provider = createMockProvider("test", "Test", [
        makeThemePkg({ id: "theme:a" }),
        makeThemePkg({ id: "theme:b" }),
      ]);
      registry.registerProvider(provider);
      registry.recordInstall("theme:a");
      registry.recordInstall("theme:b");
      expect(registry.getInstalled().length).toBe(2);
    });

    it("handles install of unknown package gracefully", () => {
      registry.recordInstall("nonexistent");
      expect(registry.getInstalled().length).toBe(0);
    });
  });

  describe("events", () => {
    it("calls change handler on install", () => {
      const provider = createMockProvider("test", "Test", [makeThemePkg()]);
      registry.registerProvider(provider);
      const events: string[] = [];
      const unsubscribe = registry.onPackageChange((e) => events.push(e.type));
      registry.recordInstall("theme:com.test.dark");
      expect(events).toContain("updated");
      unsubscribe();
    });
  });

  describe("stats", () => {
    it("returns accurate statistics", () => {
      const provider = createMockProvider("test", "Test", [
        makeThemePkg({ id: "theme:a", category: "dark", featured: true }),
        makeThemePkg({ id: "theme:b", requiredCapabilities: ["premium_themes"], pricing: { free: false, price: 9.99 } }),
        makeBlueprintPkg({ id: "blueprint:c", category: "creator" }),
      ]);
      registry.registerProvider(provider);
      const stats = registry.getStats();
      expect(stats.totalPackages).toBe(3);
      expect(stats.byType.theme).toBe(2);
      expect(stats.byType.blueprint).toBe(1);
      expect(stats.featuredCount).toBe(1);
      expect(stats.premiumCount).toBe(1);
      expect(stats.freeCount).toBe(2);
      expect(stats.providerCount).toBe(1);
    });
  });
});
