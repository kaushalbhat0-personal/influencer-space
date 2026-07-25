import { describe, it, expect, beforeEach, vi } from "vitest";
import type { GenerationOrchestrator, GenerationRequest, EventPublisher } from "@/lib/generation/contracts";
import type { ContentSource } from "@/lib/generation/intelligence/types";
import { success } from "@/lib/generation/infrastructure/helpers/result";
import { GenerationPipeline } from "@/lib/generation/integration/generation-pipeline";
import { VersionHistory } from "@/lib/generation/integration/version-history";
import { Provisioner } from "@/lib/generation/integration/provisioner";
import { WebsiteAdapter, BuilderAdapter, PublishAdapter, StorefrontAdapter } from "@/lib/generation/integration/adapters";
import { INTEGRATION_EVENTS } from "@/lib/generation/integration/integration-events";
import { ArtifactEngine, ArtifactRegistry } from "@/lib/generation/artifacts";
import { LayoutComposer } from "@/lib/generation/composition/layout-composer";
import { DEFAULTS } from "@/lib/generation/experience-plan";
import { provisioner as registerGenerators } from "@/lib/generation/integration/register-generators";

function mockOrchestrator(): GenerationOrchestrator {
  return {
    generate: vi.fn().mockResolvedValue(success({
      generationId: "gen_1", status: "completed", version: 1,
      snapshotId: null, storefrontUrl: null, artifacts: [],
      cost: { total: 0, aiCalls: 0, tokensUsed: 0 },
      durationMs: 100, stages: [], error: null,
    })),
    cancel: vi.fn(),
    getStatus: vi.fn(),
    getResult: vi.fn(),
    getProgress: vi.fn(),
  };
}

function mockRequest(): GenerationRequest {
  return {
    sourceUrl: "https://instagram.com/testcreator",
    creatorId: "creator_1" as any,
    idempotencyKey: "idem_test_1",
    strategy: "free",
    mode: "full",
  };
}

function mockContentSource(): ContentSource {
  return {
    platform: "instagram",
    username: "testcreator",
    displayName: "Test Creator",
    bio: "Digital creator sharing content daily. Fitness enthusiast.",
    avatarUrl: "",
    followers: 50000,
    following: 500,
    posts: 200,
    engagement: 0.05,
    content: [
      { id: "1", type: "post" as const, text: "Fitness content", hashtags: ["#fitness"], mentions: [], likes: 100, comments: 10, shares: 5, createdAt: new Date().toISOString(), url: "https://example.com" },
    ],
    categories: ["fitness"],
    links: ["https://linktr.ee/testcreator"],
  };
}

// ==================== Integration Events ====================
describe("INTEGRATION_EVENTS", () => {
  it("has all event type constants", () => {
    expect(INTEGRATION_EVENTS.GENERATION_INTEGRATED).toBe("generation.integrated");
    expect(INTEGRATION_EVENTS.WEBSITE_PROVISIONED).toBe("website.provisioned");
    expect(INTEGRATION_EVENTS.BUILDER_INITIALIZED).toBe("builder.initialized");
    expect(INTEGRATION_EVENTS.SNAPSHOT_CREATED).toBe("snapshot.created");
    expect(INTEGRATION_EVENTS.STOREFRONT_UPDATED).toBe("storefront.updated");
    expect(INTEGRATION_EVENTS.GENERATION_REGENERATED).toBe("generation.regenerated");
    expect(INTEGRATION_EVENTS.GENERATION_ROLLBACK).toBe("generation.rollback");
  });
});

// ==================== Version History ====================
describe("VersionHistory", () => {
  let vh: VersionHistory;

  beforeEach(() => { vh = new VersionHistory(); });

  it("adds and retrieves versions", () => {
    vh.add({ version: 1, generationId: "gen1", blueprintChecksum: "abc", artifactChecksums: {} as any, snapshotId: "snap1", createdAt: "now", reason: "initial" });
    expect(vh.getGenerationHistory("gen1")).toHaveLength(1);
  });

  it("latest returns most recent", () => {
    vh.add({ version: 1, generationId: "gen1", blueprintChecksum: "abc", artifactChecksums: {} as any, snapshotId: null, createdAt: "t1", reason: "v1" });
    vh.add({ version: 2, generationId: "gen1", blueprintChecksum: "def", artifactChecksums: {} as any, snapshotId: null, createdAt: "t2", reason: "v2" });
    expect(vh.latest("gen1")?.version).toBe(2);
  });

  it("rollback truncates history", () => {
    vh.add({ version: 1, generationId: "gen1", blueprintChecksum: "a", artifactChecksums: {} as any, snapshotId: null, createdAt: "t1", reason: "v1" });
    vh.add({ version: 2, generationId: "gen1", blueprintChecksum: "b", artifactChecksums: {} as any, snapshotId: null, createdAt: "t2", reason: "v2" });
    vh.add({ version: 3, generationId: "gen1", blueprintChecksum: "c", artifactChecksums: {} as any, snapshotId: null, createdAt: "t3", reason: "v3" });
    const result = vh.rollback("gen1", 2);
    expect(result?.version).toBe(2);
    expect(vh.getGenerationHistory("gen1")).toHaveLength(2);
  });

  it("returns null for nonexistent rollback target", () => {
    expect(vh.rollback("gen1", 99)).toBeNull();
  });

  it("getVersion retrieves specific version", () => {
    vh.add({ version: 1, generationId: "gen1", blueprintChecksum: "a", artifactChecksums: {} as any, snapshotId: null, createdAt: "t1", reason: "v1" });
    expect(vh.getVersion("gen1", 1)?.blueprintChecksum).toBe("a");
    expect(vh.getVersion("gen1", 99)).toBeNull();
  });
});

// ==================== Adapters ====================
describe("WebsiteAdapter", () => {
  it("adapts blueprint to website record", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test1", DEFAULTS);
    const adapter = new WebsiteAdapter();
    const record = adapter.adapt(blueprint);
    expect(record.title).toBe("Test Creator");
    expect(record.theme).toBeDefined();
    expect(record.seo).toBeDefined();
    expect(record.navigation).toBeDefined();
  });
});

describe("BuilderAdapter", () => {
  it("adapts artifacts to builder init result", () => {
    const registry = new ArtifactRegistry();
    registerGenerators(registry);
    const bp = new LayoutComposer().compose(mockGraph(), "test1", DEFAULTS);
    const engine = new ArtifactEngine(registry);
    const artifacts = engine.generateAll(bp);
    const adapter = new BuilderAdapter();
    const result = adapter.adapt(artifacts);
    expect(result.blocks).toBeGreaterThan(0);
  });
});

describe("PublishAdapter", () => {
  it("adapts artifacts to publish snapshot result", () => {
    const registry = new ArtifactRegistry();
    registerGenerators(registry);
    const bp = new LayoutComposer().compose(mockGraph(), "test1", DEFAULTS);
    const engine = new ArtifactEngine(registry);
    const artifacts = engine.generateAll(bp);
    const adapter = new PublishAdapter();
    const result = adapter.adapt(artifacts);
    expect(result.snapshotId).toBeTruthy();
    expect(result.artifactCount).toBe(15);
  });
});

describe("StorefrontAdapter", () => {
  it("adapts artifacts to storefront render result", () => {
    const registry = new ArtifactRegistry();
    registerGenerators(registry);
    const bp = new LayoutComposer().compose(mockGraph(), "test1", DEFAULTS);
    const engine = new ArtifactEngine(registry);
    const artifacts = engine.generateAll(bp);
    const adapter = new StorefrontAdapter();
    const result = adapter.adapt(artifacts);
    expect(result.website).toBeDefined();
    expect(result.sections).toBeDefined();
    expect(result.theme).toBeDefined();
  });
});

// ==================== Provisioner ====================
describe("Provisioner", () => {
  let provisioner: Provisioner;
  let events: EventPublisher;

  beforeEach(() => {
    events = { publish: vi.fn().mockResolvedValue(success(undefined)) };
    provisioner = new Provisioner(events);
  });

  it("provisions website and publishes event", async () => {
    const bp = new LayoutComposer().compose(mockGraph(), "test1", DEFAULTS);
    const registry = new ArtifactRegistry();
    registerGenerators(registry);
    const artifacts = new ArtifactEngine(registry).generateAll(bp);
    const record = await provisioner.provisionWebsite(bp, artifacts);
    expect(record.title).toBe("Test Creator");
    expect(events.publish).toHaveBeenCalledWith("website.provisioned", expect.any(Object));
  });

  it("initializes builder and publishes event", async () => {
    const bp = new LayoutComposer().compose(mockGraph(), "test1", DEFAULTS);
    const registry = new ArtifactRegistry();
    registerGenerators(registry);
    const artifacts = new ArtifactEngine(registry).generateAll(bp);
    const result = await provisioner.initializeBuilder(artifacts);
    expect(result.blocks).toBeGreaterThan(0);
    expect(events.publish).toHaveBeenCalledWith("builder.initialized", expect.any(Object));
  });

  it("creates snapshot and publishes event", async () => {
    const bp = new LayoutComposer().compose(mockGraph(), "test1", DEFAULTS);
    const registry = new ArtifactRegistry();
    registerGenerators(registry);
    const artifacts = new ArtifactEngine(registry).generateAll(bp);
    const result = await provisioner.createSnapshot(artifacts);
    expect(result.artifactCount).toBe(15);
    expect(events.publish).toHaveBeenCalledWith("snapshot.created", expect.any(Object));
  });

  it("renders storefront and publishes event", async () => {
    const bp = new LayoutComposer().compose(mockGraph(), "test1", DEFAULTS);
    const registry = new ArtifactRegistry();
    registerGenerators(registry);
    const artifacts = new ArtifactEngine(registry).generateAll(bp);
    const result = await provisioner.renderStorefront(artifacts);
    expect(result.sections.length).toBeGreaterThan(0);
    expect(events.publish).toHaveBeenCalledWith("storefront.updated", expect.any(Object));
  });
});

// ==================== Generation Pipeline ====================
describe("GenerationPipeline", () => {
  let pipeline: GenerationPipeline;
  let events: EventPublisher;

  beforeEach(() => {
    events = { publish: vi.fn().mockResolvedValue(success(undefined)) };
    pipeline = new GenerationPipeline(mockOrchestrator(), events);
  });

  it("runs full pipeline successfully", async () => {
    const result = await pipeline.runFullPipeline(mockRequest(), mockContentSource());
    expect(result.blueprint).not.toBeNull();
    expect(result.artifacts.length).toBe(15);
    expect(result.provisioned).toBe(true);
    expect(result.snapshotId).toBeTruthy();
  });

  it("stores version history", async () => {
    const result = await pipeline.runFullPipeline(mockRequest(), mockContentSource());
    const history = pipeline.getVersionHistory(result.generationResult.generationId);
    expect(history.length).toBe(1);
  });

  it("regenerates and increments version", async () => {
    const first = await pipeline.runFullPipeline(mockRequest(), mockContentSource());
    const second = await pipeline.regenerate(
      first.generationResult.generationId,
      mockRequest(),
      mockContentSource(),
      first.version,
    );
    const history = pipeline.getVersionHistory(first.generationResult.generationId);
    expect(history.length).toBe(2);
  });

  it("rollback returns to previous version", async () => {
    const first = await pipeline.runFullPipeline(mockRequest(), mockContentSource());
    await pipeline.regenerate(first.generationResult.generationId, mockRequest(), mockContentSource(), first.version);
    const success = await pipeline.rollback(first.generationResult.generationId, 1);
    expect(success).toBe(true);
    const history = pipeline.getVersionHistory(first.generationResult.generationId);
    expect(history.length).toBe(1);
  });

  it("rollback returns false for invalid version", async () => {
    const result = await pipeline.runFullPipeline(mockRequest(), mockContentSource());
    const success = await pipeline.rollback(result.generationResult.generationId, 99);
    expect(success).toBe(false);
  });

  it("getLatestVersion returns current version", async () => {
    const result = await pipeline.runFullPipeline(mockRequest(), mockContentSource());
    const latest = pipeline.getLatestVersion(result.generationResult.generationId);
    expect(latest).not.toBeNull();
    expect(latest!.version).toBe(1);
  });

  it("publishes integration events", async () => {
    await pipeline.runFullPipeline(mockRequest(), mockContentSource());
    expect(events.publish).toHaveBeenCalledWith("generation.integrated", expect.any(Object));
  });

  it("generates storefront URL from domain", async () => {
    const result = await pipeline.runFullPipeline(mockRequest(), mockContentSource());
    expect(result.storefrontUrl).toContain("test-creator.creatorstore.com");
  });

  it("handles null generation result gracefully", async () => {
    const failingOrch: GenerationOrchestrator = {
      ...mockOrchestrator(),
      generate: vi.fn().mockResolvedValue({ success: false, error: new Error("fail") }),
    };
    const badPipeline = new GenerationPipeline(failingOrch, events);
    const result = await badPipeline.runFullPipeline(mockRequest(), mockContentSource());
    expect(result.blueprint).toBeNull();
    expect(result.provisioned).toBe(false);
  });
});

function mockGraph(): any {
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
