import { describe, it, expect, beforeEach } from "vitest";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import { LayoutComposer } from "@/lib/generation/composition/layout-composer";
import { DEFAULTS } from "@/lib/generation/experience-plan";
import { ArtifactEngine } from "@/lib/generation/artifacts/artifact-engine";
import { ArtifactRegistry } from "@/lib/generation/artifacts/artifact-registry";
import { ArtifactManifest } from "@/lib/generation/artifacts/artifact-manifest";
import { ArtifactValidator } from "@/lib/generation/artifacts/artifact-validator";
import { ArtifactVersioning } from "@/lib/generation/artifacts/artifact-versioning";
import { ArtifactCache } from "@/lib/generation/artifacts/artifact-cache";
import {
  WebsiteRecordGenerator, ThemeRecordGenerator, PagesGenerator,
  NavigationGenerator, SectionsGenerator, ProductsGenerator,
  GalleryGenerator, SEOGenerator,
} from "@/lib/generation/artifacts/generators/records";
import {
  BuilderJSONGenerator, StorefrontJSONGenerator, PublishSnapshotGenerator,
} from "@/lib/generation/artifacts/generators/composite";
import {
  RobotsGenerator, SitemapGenerator, ManifestGenerator, MetadataGenerator,
} from "@/lib/generation/artifacts/generators/files";
import { computeChecksum, createArtifactId } from "@/lib/generation/artifacts/types";

function createFullRegistry(): ArtifactRegistry {
  const registry = new ArtifactRegistry();
  registry.register(new WebsiteRecordGenerator());
  registry.register(new ThemeRecordGenerator());
  registry.register(new PagesGenerator());
  registry.register(new NavigationGenerator());
  registry.register(new SectionsGenerator());
  registry.register(new ProductsGenerator());
  registry.register(new GalleryGenerator());
  registry.register(new SEOGenerator());
  registry.register(new BuilderJSONGenerator());
  registry.register(new StorefrontJSONGenerator());
  registry.register(new PublishSnapshotGenerator());
  registry.register(new RobotsGenerator());
  registry.register(new SitemapGenerator());
  registry.register(new ManifestGenerator());
  registry.register(new MetadataGenerator());
  return registry;
}

function mockGraph(): KnowledgeGraph {
  return {
    creator: { name: "Test Creator", username: "testcreator", bio: "Digital creator", niche: "fitness", subNiche: ["workout"], platform: "instagram", followers: 50000, engagement: 0.05, contentFrequency: "daily", verified: false, confidence: 0.8 },
    brand: { name: "Test Creator", tagline: "Transform your fitness", description: "Fitness brand", colors: ["#EA580C"], logo: null, existingBranding: false, brandVoice: "inspirational", confidence: 0.7 },
    audience: { ageRange: "25-34", primaryGender: "mixed", primaryLanguage: "english", topCountries: ["US"], interests: ["Fitness"], incomeLevel: "medium", devicePreference: "mobile", activeHours: ["8:00"], confidence: 0.6 },
    products: [{ name: "Workout Program", type: "digital", category: "Fitness", description: "Program", priceRange: "$20-$80", recommended: true, reason: "High demand", confidence: 0.85 }],
    content: { topContentTypes: ["video"], averagePostLength: 200, commonHashtags: ["#fitness"], commonTopics: ["fitness"], postingSchedule: "daily", contentQuality: "high", estimatedReadTime: 2, confidence: 0.7 },
    seo: { pageTitle: "Test Creator Store", metaDescription: "Shop official merch", keywords: ["fitness"], focusPhrase: "fitness store", slug: "test-creator", canonical: "https://test-creator.creatorstore.com", confidence: 0.7 },
    theme: { palette: ["#EA580C"], primary: "#EA580C", secondary: "#F97316", accent: "#FB923C", mode: "light", fontPairing: "Inter + Bebas Neue", borderRadius: "0.5rem", confidence: 0.8 },
    sections: [],
    socialLinks: [{ platform: "instagram", url: "https://instagram.com/test", handle: "@test", followers: 50000, primary: true }],
    businessModel: { type: "mixed", primaryRevenueSource: "Digital", monetizationChannels: ["Digital"], priceTier: "mid", confidence: 0.6 },
    confidence: 0.7,
  };
}

// ===================== Types / Utils =====================
describe("Artifact types", () => {
  it("computeChecksum produces consistent hashes", () => {
    expect(computeChecksum({ a: 1 })).toBe(computeChecksum({ a: 1 }));
    expect(computeChecksum({ a: 1 })).not.toBe(computeChecksum({ a: 2 }));
  });

  it("createArtifactId generates predictable IDs", () => {
    const id = createArtifactId("seo", "abc123def456");
    expect(id).toContain("seo");
  });
});

// ===================== Artifact Registry =====================
describe("ArtifactRegistry", () => {
  it("registers and retrieves generators", () => {
    const registry = createFullRegistry();
    expect(registry.get("website_record")).toBeDefined();
    expect(registry.get("nonexistent" as any)).toBeUndefined();
  });

  it("prevents duplicate registration", () => {
    const registry = new ArtifactRegistry();
    registry.register(new WebsiteRecordGenerator());
    expect(() => registry.register(new WebsiteRecordGenerator())).toThrow("already registered");
  });

  it("lists all registered types", () => {
    const registry = createFullRegistry();
    const types = registry.listTypes();
    expect(types).toContain("website_record");
    expect(types).toContain("seo");
    expect(types).toContain("storefront_json");
  });
});

// ===================== Artifact Engine =====================
describe("ArtifactEngine", () => {
  it("generates all artifacts from blueprint", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const artifacts = engine.generateAll(blueprint);
    expect(artifacts.length).toBe(15);
  });

  it("generates specific artifact type", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const seo = engine.generateType(blueprint, "seo");
    expect(seo).not.toBeNull();
    expect(seo!.manifest.type).toBe("seo");
  });

  it("returns null for unregistered type", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const result = engine.generateType(blueprint, "metadata" as any);
    expect(result).not.toBeNull();
  });

  it("generates robots.txt content", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const artifact = engine.generateType(blueprint, "robots_txt");
    expect(artifact).not.toBeNull();
    expect(typeof artifact!.data).toBe("string");
    expect((artifact!.data as string)).toContain("User-agent");
  });

  it("generates sitemap.xml content", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const artifact = engine.generateType(blueprint, "sitemap_xml");
    expect(artifact).not.toBeNull();
    expect((artifact!.data as string)).toContain("<?xml");
  });

  it("generates manifest.json", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const artifact = engine.generateType(blueprint, "manifest_json");
    expect(artifact).not.toBeNull();
    const data = artifact!.data as Record<string, unknown>;
    expect(data.name).toBe("Test Creator");
  });

  it("generates storefront JSON", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const artifact = engine.generateType(blueprint, "storefront_json");
    expect(artifact).not.toBeNull();
    const data = artifact!.data as Record<string, unknown>;
    expect((data as any).website.title).toBe("Test Creator");
  });
});

// ===================== Artifact Manifest =====================
describe("ArtifactManifest", () => {
  it("generates manifest from artifacts", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const artifacts = engine.generateAll(blueprint);
    const manifest = new ArtifactManifest();
    const result = manifest.generate(artifacts);
    expect(result.artifactCount).toBe(15);
    expect(result.artifacts).toHaveLength(15);
  });

  it("finds artifact by type", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const artifacts = engine.generateAll(blueprint);
    const manifest = new ArtifactManifest();
    expect(manifest.findByType(artifacts, "seo")).toBeDefined();
    expect(manifest.findByType(artifacts, "nonexistent" as any)).toBeUndefined();
  });
});

// ===================== Artifact Validator =====================
describe("ArtifactValidator", () => {
  it("validates complete set of artifacts", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const artifacts = engine.generateAll(blueprint);
    const validator = new ArtifactValidator();
    const result = validator.validateAll(artifacts);
    expect(result.valid).toBe(true);
    expect(result.artifactsValidated).toBe(15);
  });

  it("reports missing artifacts", () => {
    const validator = new ArtifactValidator();
    const result = validator.validateAll([]);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.startsWith("Missing"))).toBe(true);
  });
});

// ===================== Artifact Versioning =====================
describe("ArtifactVersioning", () => {
  let versioning: ArtifactVersioning;

  beforeEach(() => { versioning = new ArtifactVersioning(); });

  it("stores and retrieves latest version", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const artifacts = engine.generateAll(blueprint);
    const seo = artifacts.find((a) => a.manifest.type === "seo")!;
    versioning.add(seo);
    const latest = versioning.latest("seo", seo.manifest.id);
    expect(latest).not.toBeNull();
  });

  it("supports version history", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const artifacts = engine.generateAll(blueprint);
    const seoV1 = artifacts.find((a) => a.manifest.type === "seo")!;
    versioning.add(seoV1);

    const seoV2 = { ...seoV1, manifest: { ...seoV1.manifest, version: 2 } };
    versioning.add(seoV2);

    const history = versioning.listVersions("seo", seoV1.manifest.id);
    expect(history).not.toBeNull();
    expect(history!.versions).toHaveLength(2);
  });

  it("retrieves specific version", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const artifacts = engine.generateAll(blueprint);
    const seoV1 = artifacts.find((a) => a.manifest.type === "seo")!;
    versioning.add(seoV1);
    const seoV2 = { ...seoV1, manifest: { ...seoV1.manifest, version: 2 } };
    versioning.add(seoV2);

    const v1 = versioning.getVersion("seo", seoV1.manifest.id, 1);
    expect(v1).not.toBeNull();
    expect(v1!.manifest.version).toBe(1);
  });

  it("rollback restores previous version", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const artifacts = engine.generateAll(blueprint);
    const seoV1 = artifacts.find((a) => a.manifest.type === "seo")!;
    versioning.add(seoV1);

    const seoV2 = { ...seoV1, manifest: { ...seoV1.manifest, version: 2 } };
    versioning.add(seoV2);

    const rolledBack = versioning.rollback("seo", seoV1.manifest.id, 1);
    expect(rolledBack).not.toBeNull();
    expect(versioning.getHistory("seo", seoV1.manifest.id)).toHaveLength(1);
  });

  it("diff detects changes between versions", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const artifacts = engine.generateAll(blueprint);
    const seoV1 = artifacts.find((a) => a.manifest.type === "seo")!;
    versioning.add(seoV1);

    const seoV2 = { ...seoV1, manifest: { ...seoV1.manifest, version: 2 } };
    versioning.add(seoV2);

    const result = versioning.diff("seo", seoV1.manifest.id, 1, 2);
    expect(result).not.toBeNull();
    expect(result!.versionA).toBe(1);
    expect(result!.versionB).toBe(2);
  });

  it("returns null for nonexistent versions", () => {
    expect(versioning.latest("seo", "nonexistent")).toBeNull();
    expect(versioning.getVersion("seo", "nonexistent", 1)).toBeNull();
    expect(versioning.listVersions("seo", "nonexistent")).toBeNull();
    expect(versioning.diff("seo", "nonexistent", 1, 2)).toBeNull();
  });

  it("clear removes all history", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const seo = engine.generateType(blueprint, "seo")!;
    versioning.add(seo);
    versioning.clear();
    expect(versioning.latest("seo", seo.manifest.id)).toBeNull();
  });
});

// ===================== Artifact Cache =====================
describe("ArtifactCache", () => {
  let cache: ArtifactCache;
  let store: Map<string, any>;

  beforeEach(() => {
    store = new Map();
    cache = new ArtifactCache({
      get: async (k: string) => ({ success: true, data: store.get(k) ?? null }),
      set: async (k: string, v: any) => { store.set(k, v); return { success: true, data: undefined }; },
      invalidate: async (k: string) => { store.delete(k); return { success: true, data: undefined }; },
      invalidateByPattern: async () => { store.clear(); return { success: true, data: undefined }; },
      exists: async () => ({ success: true, data: false }),
    } as any, 5000);
  });

  it("caches and retrieves artifacts", async () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const artifacts = engine.generateAll(blueprint);
    await cache.set(blueprint, artifacts);
    const retrieved = await cache.get(blueprint);
    expect(retrieved).not.toBeNull();
    expect(retrieved).toHaveLength(15);
  });

  it("returns null for missing key", async () => {
    const result = await cache.get({ website: {}, pages: [], sections: [], products: [] });
    expect(result).toBeNull();
  });

  it("invalidates specific blueprint", async () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const artifacts = engine.generateAll(blueprint);
    await cache.set(blueprint, artifacts);
    await cache.invalidate(blueprint);
    expect(await cache.get(blueprint)).toBeNull();
  });

  it("invalidates all cached artifacts", async () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const engine = new ArtifactEngine(createFullRegistry());
    const artifacts = engine.generateAll(blueprint);
    await cache.set(blueprint, artifacts);
    await cache.invalidateAll();
    expect(await cache.get(blueprint)).toBeNull();
  });
});

// ===================== Generators (Individual) =====================
describe("Individual generators", () => {
  let blueprint: any;

  beforeEach(() => {
    blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
  });

  it("WebsiteRecordGenerator has correct type", () => {
    const gen = new WebsiteRecordGenerator();
    expect(gen.type).toBe("website_record");
  });

  it("ThemeRecordGenerator produces theme data", () => {
    const gen = new ThemeRecordGenerator();
    const artifact = gen.generate(blueprint, "abc", 1);
    expect((artifact.data as any).primary).toBe("#EA580C");
  });

  it("PagesGenerator produces page list", () => {
    const gen = new PagesGenerator();
    const artifact = gen.generate(blueprint, "abc", 1);
    expect(Array.isArray(artifact.data)).toBe(true);
  });

  it("NavigationGenerator produces navigation data", () => {
    const gen = new NavigationGenerator();
    const artifact = gen.generate(blueprint, "abc", 1);
    expect((artifact.data as any).desktop).toBeDefined();
  });

  it("SectionsGenerator produces section list", () => {
    const gen = new SectionsGenerator();
    const artifact = gen.generate(blueprint, "abc", 1);
    expect(Array.isArray(artifact.data)).toBe(true);
  });

  it("ProductsGenerator produces product list", () => {
    const gen = new ProductsGenerator();
    const artifact = gen.generate(blueprint, "abc", 1);
    expect(Array.isArray(artifact.data)).toBe(true);
  });

  it("GalleryGenerator produces gallery data", () => {
    const gen = new GalleryGenerator();
    const artifact = gen.generate(blueprint, "abc", 1);
    expect((artifact.data as any).enabled).toBe(false);
  });

  it("SEOGenerator produces SEO data", () => {
    const gen = new SEOGenerator();
    const artifact = gen.generate(blueprint, "abc", 1);
    expect((artifact.data as any).title).toContain("Test Creator");
  });

  it("BuilderJSONGenerator produces builder blocks", () => {
    const gen = new BuilderJSONGenerator();
    const artifact = gen.generate(blueprint, "abc", 1);
    expect((artifact.data as any).blocks).toBeDefined();
  });

  it("StorefrontJSONGenerator produces storefront data", () => {
    const gen = new StorefrontJSONGenerator();
    const artifact = gen.generate(blueprint, "abc", 1);
    expect((artifact.data as any).website).toBeDefined();
    expect((artifact.data as any).sections).toBeDefined();
  });

  it("PublishSnapshotGenerator produces snapshot data", () => {
    const gen = new PublishSnapshotGenerator();
    const artifact = gen.generate(blueprint, "abc", 1);
    expect((artifact.data as any).records).toBeDefined();
  });

  it("RobotsGenerator produces robots.txt", () => {
    const gen = new RobotsGenerator();
    const artifact = gen.generate(blueprint, "abc", 1);
    expect(typeof artifact.data).toBe("string");
    expect(artifact.data as string).toContain("User-agent");
  });

  it("SitemapGenerator produces sitemap.xml", () => {
    const gen = new SitemapGenerator();
    const artifact = gen.generate(blueprint, "abc", 1);
    expect(artifact.data as string).toContain("<urlset");
  });

  it("ManifestGenerator produces manifest.json", () => {
    const gen = new ManifestGenerator();
    const artifact = gen.generate(blueprint, "abc", 1);
    expect((artifact.data as any).name).toBe("Test Creator");
  });

  it("MetadataGenerator produces metadata", () => {
    const gen = new MetadataGenerator();
    const artifact = gen.generate(blueprint, "abc", 1);
    expect((artifact.data as any).pageCount).toBeGreaterThan(0);
  });
});
