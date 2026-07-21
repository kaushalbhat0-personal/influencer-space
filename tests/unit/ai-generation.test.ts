import { describe, it, expect, beforeEach } from "vitest";
import { sourceResolver, SourceResolver } from "@/lib/ai-generation/source-resolver";
import { YouTubeProfileProvider } from "@/lib/ai-generation/providers/youtube";
import { InstagramProfileProvider } from "@/lib/ai-generation/providers/instagram";
import { ManualProfileProvider } from "@/lib/ai-generation/providers/manual";
import { ContentGenerationService } from "@/lib/ai-generation/content-generator";
import { ThemeSelectionStrategy } from "@/lib/ai-generation/theme-strategy";
import { WebsiteComposer } from "@/lib/ai-generation/website-composer";
import { TenantProvisioner } from "@/lib/ai-generation/tenant-provisioner";
import { WebsiteGenerationPipeline } from "@/lib/ai-generation/pipeline";
import type { CreatorProfile, CreatorContent, GeneratedContent } from "@/lib/ai-generation/types";

function makeProfile(overrides?: Partial<CreatorProfile>): CreatorProfile {
  return {
    name: "Test Creator",
    username: "testcreator",
    bio: "Making awesome content for creators",
    avatarUrl: null,
    bannerUrl: null,
    category: "creator",
    niche: "technology",
    socialLinks: [
      { platform: "youtube", url: "https://youtube.com/@testcreator", username: "testcreator" },
      { platform: "instagram", url: "https://instagram.com/testcreator", username: "testcreator" },
    ],
    subscriberCount: 50000,
    followerCount: 25000,
    verified: true,
    platform: "youtube",
    platformUrl: "https://youtube.com/@testcreator",
    rawData: {},
    ...overrides,
  };
}

function makeContent(): CreatorContent {
  return {
    latestPosts: Array.from({ length: 4 }, (_, i) => ({
      id: `post-${i}`,
      title: `Video ${i + 1}`,
      description: `Description ${i + 1}`,
      url: `https://youtube.com/watch?v=${i}`,
      thumbnailUrl: `https://img.youtube.com/vi/video${i}/default.jpg`,
      mediaUrls: [`https://img.youtube.com/vi/video${i}/default.jpg`],
      publishedAt: new Date().toISOString(),
      engagement: 1000 - i * 100,
      metadata: {},
    })),
    featuredPosts: [],
    popularPosts: [],
    totalPosts: 4,
    averageEngagement: 750,
    contentThemes: ["tech", "reviews", "tutorials"],
  };
}

describe("AI Website Generation", () => {
  // ── SOURCE RESOLVER ──────────────────────────────────────────────────

  describe("SourceResolver", () => {
    const resolver = new SourceResolver();

    it("should detect YouTube channel URL", () => {
      const result = resolver.resolve("https://youtube.com/@techcreator");
      expect(result.success).toBe(true);
      expect(result.data!.platform).toBe("youtube");
      expect(result.data!.identifier).toBe("techcreator");
      expect(result.data!.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("should detect YouTube /c/ URL", () => {
      const result = resolver.resolve("https://youtube.com/c/techcreator");
      expect(result.success).toBe(true);
      expect(result.data!.platform).toBe("youtube");
    });

    it("should detect YouTube channel URL", () => {
      const result = resolver.resolve("https://youtube.com/channel/UC123456789");
      expect(result.success).toBe(true);
      expect(result.data!.platform).toBe("youtube");
      expect(result.data!.identifier).toBe("UC123456789");
    });

    it("should detect Instagram profile URL", () => {
      const result = resolver.resolve("https://instagram.com/photographer");
      expect(result.success).toBe(true);
      expect(result.data!.platform).toBe("instagram");
      expect(result.data!.identifier).toBe("photographer");
    });

    it("should detect Instagram reel URL", () => {
      const result = resolver.resolve("https://instagram.com/user/reel/something");
      expect(result.success).toBe(true);
      expect(result.data!.platform).toBe("instagram");
      expect(result.data!.identifier).toBe("user");
    });

    it("should detect TikTok URL", () => {
      const result = resolver.resolve("https://tiktok.com/@dancecreator");
      expect(result.success).toBe(true);
      expect(result.data!.platform).toBe("tiktok");
    });

    it("should treat bare handle as manual", () => {
      const result = resolver.resolve("my-creator-site");
      expect(result.success).toBe(true);
      expect(result.data!.platform).toBe("manual");
    });

    it("should fail on unrecognizable input", () => {
      const result = resolver.resolve("");
      expect(result.success).toBe(false);
    });

    it("should resolve @handle as YouTube", () => {
      const result = resolver.resolve("@techcreator");
      expect(result.success).toBe(true);
      expect(result.data!.platform).toBe("youtube");
    });
  });

  // ── PROFILE PROVIDERS ────────────────────────────────────────────────

  describe("Profile Providers", () => {
    describe("YouTubeProfileProvider", () => {
      const provider = new YouTubeProfileProvider();

      it("should validate YouTube handle", () => {
        expect(provider.validateIdentifier("techcreator")).toBe(true);
        expect(provider.validateIdentifier("ab")).toBe(false);
      });

      it("should extract profile from resolved source", async () => {
        const source = sourceResolver.resolve("https://youtube.com/@techguru");
        expect(source.success && source.data).toBeTruthy();

        const result = await provider.extractProfile(source.data!);
        expect(result.success).toBe(true);
        expect(result.data!.platform).toBe("youtube");
        expect(result.data!.name).toBeTruthy();
        expect(result.data!.niche).toBeTruthy();
      });

      it("should detect gaming niche from handle", async () => {
        const source = sourceResolver.resolve("https://youtube.com/@gamingbeast");
        const result = await provider.extractProfile(source.data!);
        expect(result.data!.niche).toBe("gaming");
      });
    });

    describe("InstagramProfileProvider", () => {
      const provider = new InstagramProfileProvider();

      it("should extract profile from Instagram URL", async () => {
        const source = sourceResolver.resolve("https://instagram.com/photographer");
        const result = await provider.extractProfile(source.data!);
        expect(result.success).toBe(true);
        expect(result.data!.platform).toBe("instagram");
        expect(result.data!.niche).toBe("photography");
      });

      it("should detect fashion niche", async () => {
        const source = sourceResolver.resolve("https://instagram.com/style_fashion");
        const result = await provider.extractProfile(source.data!);
        expect(result.data!.niche).toBe("fashion");
      });
    });

    describe("ManualProfileProvider", () => {
      const provider = new ManualProfileProvider();

      it("should create profile from manual input", async () => {
        const source = sourceResolver.resolve("john-creator");
        const result = await provider.extractProfile(source.data!);
        expect(result.success).toBe(true);
        expect(result.data!.platform).toBe("manual");
        expect(result.data!.name).toBe("John Creator");
      });
    });
  });

  // ── CONTENT GENERATOR ────────────────────────────────────────────────

  describe("ContentGenerationService", () => {
    const service = new ContentGenerationService();

    it("should generate content for tech creator", () => {
      const profile = makeProfile({ niche: "technology" });
      const content = makeContent();
      const result = service.generate(profile, content);

      expect(result.success).toBe(true);
      expect(result.data!.heroTitle).toContain("Test Creator");
      expect(result.data!.heroSubtitle).toContain("tech");
      expect(result.data!.heroCta).toBeTruthy();
      expect(result.data!.aboutSection).toContain("Test Creator");
      expect(result.data!.seoTitle).toContain("Test Creator");
      expect(result.data!.seoDescription).toBeTruthy();
      expect(result.data!.keywords.length).toBeGreaterThan(0);
      expect(result.data!.suggestedSections.length).toBeGreaterThan(0);
    });

    it("should generate content for gaming creator", () => {
      const profile = makeProfile({ niche: "gaming", name: "ProGamer" });
      const content = makeContent();
      const result = service.generate(profile, content);

      expect(result.data!.heroCta).toBe("Watch Now");
      expect(result.data!.suggestedSections.some((s) => s.type === "games")).toBe(true);
    });

    it("should generate content for music creator", () => {
      const profile = makeProfile({ niche: "music", name: "DJ Beats" });
      const content = makeContent();
      const result = service.generate(profile, content);

      expect(result.data!.heroCta).toBe("Listen Now");
    });

    it("should generate content for unknown niche with defaults", () => {
      const profile = makeProfile({ niche: "unknown_niche" });
      const content = makeContent();
      const result = service.generate(profile, content);

      expect(result.success).toBe(true);
      expect(result.data!.heroTitle).toBeTruthy();
    });

    it("should include keywords from content themes", () => {
      const profile = makeProfile({ niche: "technology" });
      const content = makeContent();
      const result = service.generate(profile, content);

      expect(result.data!.keywords).toContain("reviews");
      expect(result.data!.keywords).toContain("tutorials");
    });
  });

  // ── THEME STRATEGY ───────────────────────────────────────────────────

  describe("ThemeSelectionStrategy", () => {
    const strategy = new ThemeSelectionStrategy();

    it("should select gaming theme", () => {
      const profile = makeProfile({ niche: "gaming" });
      const result = strategy.selectTheme(profile);

      expect(result.success).toBe(true);
      expect(result.data!.preset).toBe("gaming-dark");
      expect(result.data!.darkMode).toBe(true);
    });

    it("should select music theme", () => {
      const profile = makeProfile({ niche: "music" });
      const result = strategy.selectTheme(profile);

      expect(result.data!.preset).toBe("music-vibrant");
    });

    it("should use default theme for unknown niche", () => {
      const profile = makeProfile({ niche: "unknown" });
      const result = strategy.selectTheme(profile);

      expect(result.data!.preset).toBe("default-neutral");
    });

    it("should use forced theme when specified", () => {
      const profile = makeProfile({ niche: "gaming" });
      const result = strategy.selectTheme(profile, "custom-dark");

      expect(result.data!.preset).toBe("custom-dark");
    });
  });

  // ── WEBSITE COMPOSER ─────────────────────────────────────────────────

  describe("WebsiteComposer", () => {
    const composer = new WebsiteComposer();
    const genService = new ContentGenerationService();

    it("should compose a website from all inputs", () => {
      const profile = makeProfile({ niche: "gaming" });
      const content = makeContent();
      const genContent = genService.generate(profile, content).data!;
      const theme = new ThemeSelectionStrategy().selectTheme(profile).data!;

      const result = composer.compose(profile, content, genContent, theme);

      expect(result.success).toBe(true);
      expect(result.data!.heroSection.title).toBe(genContent.heroTitle);
      expect(result.data!.heroSection.subtitle).toBeTruthy();
      expect(result.data!.heroSection.ctaText).toBe("Watch Now");
      expect(result.data!.featuredSections.length).toBeGreaterThan(0);
      expect(result.data!.pageStructure.layout).toBe("single-page");
    });

    it("should include link sections with social links", () => {
      const profile = makeProfile({ niche: "technology" });
      const content = makeContent();
      const genContent = genService.generate(profile, content).data!;
      const theme = new ThemeSelectionStrategy().selectTheme(profile).data!;

      const result = composer.compose(profile, content, genContent, theme);

      expect(result.data!.linkSections.length).toBeGreaterThan(0);
      expect(result.data!.linkSections[0]!.links.some((l) => l.icon === "youtube")).toBe(true);
    });

    it("should include product suggestions when applicable", () => {
      const profile = makeProfile({ niche: "technology" });
      const content = makeContent();
      const genContent = genService.generate(profile, content).data!;
      const theme = new ThemeSelectionStrategy().selectTheme(profile).data!;

      const result = composer.compose(profile, content, genContent, theme);

      const hasProducts = result.data!.products.length > 0;
      if (hasProducts) {
        expect(result.data!.products[0]!.status).toBe("draft");
      }
    });
  });

  // ── TENANT PROVISIONER ───────────────────────────────────────────────

  describe("TenantProvisioner", () => {
    const provisioner = new TenantProvisioner();

    it("should provision a tenant from profile", async () => {
      const profile = makeProfile();
      const result = await provisioner.provision(profile);

      expect(result.success).toBe(true);
      expect(result.data!.tenantId).toBeTruthy();
      expect(result.data!.tenantName).toBe("Test Creator");
      expect(result.data!.subdomain).toBe("testcreator");
      expect(result.data!.planId).toBe("STARTER");
    });

    it("should use custom subdomain when provided", async () => {
      const profile = makeProfile();
      const result = await provisioner.provision(profile, {
        subdomain: "custom-sub",
      });

      expect(result.data!.subdomain).toBe("custom-sub");
    });

    it("should use custom admin email when provided", async () => {
      const profile = makeProfile();
      const result = await provisioner.provision(profile, {
        adminEmail: "custom@mail.com",
      });

      expect(result.data!.adminEmail).toBe("custom@mail.com");
    });

    it("should sanitize username into subdomain", async () => {
      const profile = makeProfile({ username: "My Creator!!!" });
      const result = await provisioner.provision(profile);

      expect(result.data!.subdomain).toBe("my-creator");
    });
  });

  // ── FULL PIPELINE ────────────────────────────────────────────────────

  describe("WebsiteGenerationPipeline", () => {
    const pipeline = new WebsiteGenerationPipeline();

    it("should execute full pipeline for YouTube handle", async () => {
      const result = await pipeline.execute({
        source: "@techcreator",
      });

      expect(result.success).toBe(true);
      expect(result.sourcePlatform).toBe("youtube");
      expect(result.creatorName).toBeTruthy();
      expect(result.stages.length).toBe(8);
      expect(result.totalDurationMs).toBeGreaterThan(0);

      const completed = result.stages.filter((s) => s.status === "completed");
      expect(completed.length).toBeGreaterThanOrEqual(6);
    });

    it("should generate content and sections", async () => {
      const result = await pipeline.execute({
        source: "https://youtube.com/@gamingbeast",
      });

      expect(result.generatedContent).toBeTruthy();
      expect(result.generatedContent!.heroTitle).toBeTruthy();
      expect(result.generatedSections.length).toBeGreaterThan(0);
    });

    it("should return theme", async () => {
      const result = await pipeline.execute({
        source: "https://youtube.com/@gamingbeast",
      });

      expect(result.generatedTheme).toBeTruthy();
      expect(result.generatedTheme!.preset).toBe("gaming-dark");
    });

    it("should generate for Instagram URL", async () => {
      const result = await pipeline.execute({
        source: "https://instagram.com/photographer",
      });

      expect(result.success).toBe(true);
      expect(result.sourcePlatform).toBe("instagram");
    });

    it("should generate for manual handle", async () => {
      const result = await pipeline.execute({
        source: "john-creator",
      });

      expect(result.success).toBe(true);
      expect(result.sourcePlatform).toBe("manual");
    });

    it("should skip AI content when skipAI option is set", async () => {
      const result = await pipeline.execute({
        source: "@techcreator",
        options: { skipAI: true },
      });

      expect(result.success).toBe(true);

      const genStage = result.stages.find((s) => s.stage === "ai_content_generation");
      expect(genStage?.status).toBe("skipped");
    });

    it("should use forced theme", async () => {
      const result = await pipeline.execute({
        source: "@techcreator",
        options: { forceTheme: "custom-minimal" },
      });

      expect(result.generatedTheme?.preset).toBe("custom-minimal");
    });

    it("should produce diagnostics", async () => {
      const result = await pipeline.execute({
        source: "@techcreator",
      });

      expect(result.diagnostics.totalStages).toBe(8);
      expect(typeof result.diagnostics.completedStages).toBe("number");
    });

    it("should return dashboard and storefront URLs", async () => {
      const result = await pipeline.execute({
        source: "@techcreator",
      });

      expect(result.dashboardUrl).toBeTruthy();
      expect(result.storefrontUrl).toBeTruthy();
      expect(result.dashboardUrl).toContain("/admin");
    });

    it("should fail gracefully on unresolvable input", async () => {
      const result = await pipeline.execute({
        source: "",
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ── IDEMPOTENCY ─────────────────────────────────────────────────────

  describe("Idempotency", () => {
    const pipeline = new WebsiteGenerationPipeline();

    it("should produce same result when run twice with same input", async () => {
      const result1 = await pipeline.execute({ source: "@testcreator" });
      const result2 = await pipeline.execute({ source: "@testcreator" });

      expect(result1.sourcePlatform).toBe(result2.sourcePlatform);
      expect(result1.success).toBe(result2.success);
      expect(result1.stages.length).toBe(result2.stages.length);
    });
  });
});
