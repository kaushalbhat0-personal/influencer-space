import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockImportProfile, mockGenerate } = vi.hoisted(() => ({
  mockImportProfile: vi.fn(),
  mockGenerate: vi.fn(),
}));

vi.mock("@/lib/onboarding/service", () => ({
  onboardingService: { importProfile: mockImportProfile, generate: mockGenerate },
}));

import { runProvisionPipeline, buildProvisioningInput, detectPlatform, buildContentSource } from "@/lib/generation/integration/provision-pipeline";
import type { ContentSource } from "@/lib/generation/intelligence/types";
import type { PipelineResult } from "@/lib/generation/integration/types";

const contentSource: ContentSource = {
  platform: "youtube",
  username: "creator",
  displayName: "Creator",
  bio: "A gaming creator",
  avatarUrl: "",
  followers: 1000,
  following: 0,
  posts: 10,
  engagement: 0.5,
  content: [],
  categories: ["gaming"],
  links: ["https://youtube.com/@creator"],
};

const knowledgeGraph = {
  creator: { name: "Creator", niche: "gaming" },
  seo: { slug: "creator" },
  confidence: 0.8,
} as never;

const websiteBlueprint = {
  website: { title: "Creator", tagline: "Game on", description: "desc", domain: "creator.creatorstore.com" },
  pages: [{ id: "home", type: "home", title: "Home", slug: "/", sections: [], order: 1, visible: true, metadata: {} }],
  navigation: { desktop: [], mobile: [], bottom: [], mobileBottom: [], sticky: false, style: "standard" },
  sections: [
    { id: "s1", type: "hero", page: "home", order: 1, props: { title: "Creator", headline: "Hey" }, reason: "x", confidence: 0.9 },
    { id: "s2", type: "footer", page: "home", order: 2, props: {}, reason: "x", confidence: 0.9 },
  ],
  products: [],
  gallery: { enabled: false, albums: [], featuredImages: [], ordering: "chronological", layout: "grid" },
  feed: { enabled: false, source: "", limit: 0, layout: "grid", showCaptions: true, autoplay: false },
  about: null,
  contact: null,
  seo: { title: "T", description: "D", keywords: ["k"], ogImage: "", ogType: "website", twitterHandle: "", canonical: "", structuredData: {}, sitemapPriority: 0.5, sitemapChangefreq: "weekly" },
  theme: { primary: "#111", secondary: "#222", accent: "#333", background: "#000", text: "#fff", fonts: { heading: "Inter", body: "Inter" }, spacing: { sectionPadding: "0", containerWidth: "1200px", gap: "0" }, borderRadius: "8px", mode: "dark", buttons: { borderRadius: "8px", padding: "8px", fontWeight: "400", textTransform: "none" }, cards: { borderRadius: "8px", shadow: "none", padding: "8px" }, colors: {} },
  builder: { version: 1, blocks: [], layout: "single", containerWidth: "1200px", metadata: {} },
  metadata: { generatedAt: new Date().toISOString(), version: 1, confidence: 0.8, sourceKey: "key", intelligenceVersion: "1.0" },
} as never;

const artifacts = [
  { manifest: { type: "storefront_json" }, data: { sections: [{ id: "s1", type: "hero", props: { headline: "Creator" } }], navigation: { desktop: [] } } },
  { manifest: { type: "theme_record" }, data: { primary: "#111", secondary: "#222", accent: "#333", fonts: { heading: "Inter" }, mode: "dark" } },
  { manifest: { type: "seo" }, data: { title: "T", description: "D", keywords: ["k"] } },
];

beforeEach(() => {
  mockImportProfile.mockReset();
  mockGenerate.mockReset();
  mockImportProfile.mockResolvedValue({ knowledgeGraph, experienceProfile: {} });
  mockGenerate.mockResolvedValue({ websiteBlueprint, artifacts });
});

describe("RCCF-01 — runProvisionPipeline uses the REAL generation pipeline", () => {
  it("invokes the onboarding pipeline (acquisition → knowledge → blueprint → artifacts)", async () => {
    const result = await runProvisionPipeline(
      { sourceUrl: "https://youtube.com/@creator", creatorId: "u1", creatorName: "Creator", idempotencyPrefix: "test", strategy: "balanced" },
      contentSource,
    );
    expect(mockImportProfile).toHaveBeenCalledWith("https://youtube.com/@creator", "u1", "Creator");
    expect(mockGenerate).toHaveBeenCalled();
    expect(result.blueprint).toBe(websiteBlueprint);
    expect(result.artifacts.length).toBeGreaterThan(0);
  });

  it("does not silently succeed with no output", async () => {
    mockGenerate.mockResolvedValueOnce({ websiteBlueprint: null, artifacts: [] });
    const result = await runProvisionPipeline(
      { sourceUrl: "https://youtube.com/@creator", creatorId: "u1", creatorName: "Creator", idempotencyPrefix: "test", strategy: "balanced" },
      contentSource,
    );
    expect(result.blueprint).toBeNull();
    expect(result.artifacts).toEqual([]);
  });
});

describe("RCCF-01 — buildProvisioningInput carries the generated website", () => {
  it("includes generatedWebsite sections + navigation from the pipeline result", () => {
    const pipelineResult: PipelineResult = {
      generationResult: undefined as never,
      knowledgeGraph,
      blueprint: websiteBlueprint,
      artifacts,
      provisioned: true,
      snapshotId: null,
      storefrontUrl: null,
      version: 1,
    };
    const input = buildProvisioningInput({
      runId: "run1",
      creatorName: "Creator",
      sourceUrl: "https://youtube.com/@creator",
      sourcePlatform: "youtube",
      planCode: "creator_launch",
      pipelineResult,
    });
    expect(input.generatedWebsite?.sections?.length).toBeGreaterThan(0);
    expect(input.generatedContent?.heroTitle).toBeTruthy();
    expect(input.generatedTheme?.colors?.primary).toBe("#111");
  });
});

describe("RCCF-01 — platform detection + content source", () => {
  it("detects youtube", () => {
    expect(detectPlatform("https://youtube.com/@x")).toBe("youtube");
    expect(detectPlatform("https://youtu.be/x")).toBe("youtube");
  });
  it("builds a manual content source for free text", () => {
    const s = buildContentSource("A gaming creator who streams", "manual", "Creator");
    expect(s.bio).toBe("A gaming creator who streams");
    expect(s.username).toBe("creator");
  });
});
