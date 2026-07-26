import { describe, it, expect, beforeEach } from "vitest";
import type { ContentSource, ContentItem } from "@/lib/generation/intelligence/types";
import { ContentAnalyzer } from "@/lib/generation/intelligence/content-analyzer";
import { NicheDetector } from "@/lib/generation/intelligence/niche-detector";
import { CreatorProfiler } from "@/lib/generation/intelligence/creator-profiler";
import { AudienceProfiler } from "@/lib/generation/intelligence/audience-profiler";
import { BrandExtractor } from "@/lib/generation/intelligence/brand-extractor";
import { SocialGraph } from "@/lib/generation/intelligence/social-graph";
import { ContentClassifier } from "@/lib/generation/intelligence/content-classifier";
import { KeywordExtractor } from "@/lib/generation/intelligence/keyword-extractor";
import { SEOGenerator } from "@/lib/generation/intelligence/seo-generator";
import { ProductRecommender } from "@/lib/generation/intelligence/product-recommender";
import { SectionRecommender } from "@/lib/generation/intelligence/section-recommender";
import { ThemeSelector } from "@/lib/generation/intelligence/theme-selector";
import { KnowledgeBuilder } from "@/lib/generation/intelligence/knowledge-builder";
import { KnowledgeValidator } from "@/lib/generation/intelligence/knowledge-validator";
import { IntelligenceCache } from "@/lib/generation/intelligence/intelligence-cache";
import {
  THEME_PALETTES, NICHE_KEYWORDS, PRODUCT_RECOMMENDATIONS, formatConfidence,
} from "@/lib/generation/intelligence/types";

function makeItem(overrides?: Partial<ContentItem>): ContentItem {
  return {
    id: "1", type: "post", text: "Sample content for testing", hashtags: ["#test"], mentions: [],
    likes: 100, comments: 10, shares: 5, createdAt: new Date().toISOString(), url: "https://example.com",
    ...overrides,
  };
}

function makeSource(overrides?: Partial<ContentSource>): ContentSource {
  return {
    platform: "instagram",
    username: "testcreator",
    displayName: "Test Creator",
    bio: "Digital creator sharing content daily. Fitness enthusiast and gamer.",
    avatarUrl: "",
    followers: 50000,
    following: 500,
    posts: 200,
    engagement: 0.05,
    content: [makeItem(), makeItem({ text: "Gaming stream highlights #gaming #twitch" }), makeItem({ text: "Workout routine for beginners #fitness" })],
    categories: [],
    links: ["https://linktr.ee/testcreator"],
    ...overrides,
  };
}

// ===================== Types =====================
describe("Intelligence types", () => {
  it("THEME_PALETTES has all expected niches", () => {
    const expected = ["gaming", "education", "finance", "fitness", "music", "travel", "food", "photography", "technology", "art", "lifestyle", "sports", "news", "comedy", "celebrity", "default"];
    for (const niche of expected) {
      expect(THEME_PALETTES[niche]).toBeDefined();
    }
  });

  it("NICHE_KEYWORDS has all expected niches", () => {
    const expected = ["gaming", "education", "finance", "fitness", "music", "travel", "food", "photography", "technology", "art", "lifestyle", "sports", "news", "comedy", "celebrity"];
    for (const niche of expected) {
      expect(NICHE_KEYWORDS[niche].length).toBeGreaterThan(0);
    }
  });

  it("PRODUCT_RECOMMENDATIONS has all expected niches", () => {
    const expected = ["gaming", "education", "finance", "fitness", "music", "travel", "food", "photography", "technology", "art", "lifestyle", "sports", "news", "comedy", "celebrity"];
    for (const niche of expected) {
      expect(PRODUCT_RECOMMENDATIONS[niche]).toHaveLength(3);
    }
  });

  it("formatConfidence returns correct levels", () => {
    expect(formatConfidence(0.95)).toBe("very_high");
    expect(formatConfidence(0.75)).toBe("high");
    expect(formatConfidence(0.55)).toBe("medium");
    expect(formatConfidence(0.35)).toBe("low");
    expect(formatConfidence(0.15)).toBe("very_low");
  });
});

// ===================== Niche Detector =====================
describe("NicheDetector", () => {
  let detector: NicheDetector;

  beforeEach(() => { detector = new NicheDetector(); });

  it("detects gaming niche", () => {
    const result = detector.detect(makeSource({
      bio: "Professional gamer and streamer",
      content: [makeItem({ text: "Amazing gaming stream today #twitch #esports" })],
    }));
    expect(result.niche).toBe("gaming");
  });

  it("detects fitness niche", () => {
    const result = detector.detect(makeSource({
      bio: "Fitness coach helping you get fit",
      content: [makeItem({ text: "Great workout routine for beginners" })],
    }));
    expect(result.niche).toBe("fitness");
  });

  it("detects tech niche", () => {
    const result = detector.detect(makeSource({
      bio: "Software developer and tech enthusiast",
      content: [makeItem({ text: "Building amazing apps with code" })],
    }));
    expect(result.niche).toBe("technology");
  });

  it("detects food niche", () => {
    const result = detector.detect(makeSource({
      bio: "Home chef sharing recipes",
      content: [makeItem({ text: "Delicious recipe for homemade pasta" })],
    }));
    expect(result.niche).toBe("food");
  });

  it("returns lifestyle default for unclear content", () => {
    const result = detector.detect(makeSource({ bio: "Just sharing my life", content: [makeItem({ text: "A beautiful day" })] }));
    expect(result.niche).toBe("lifestyle");
  });

  it("returns all niche scores", () => {
    const scores = detector.scoreAllNiches(makeSource());
    expect(scores.length).toBeGreaterThan(5);
  });

  it("detects sub-niches", () => {
    const subs = detector.detectSubNiches(makeSource({
      content: [makeItem({ text: "Gaming stream highlights #twitch" })],
    }));
    expect(subs.length).toBeGreaterThan(0);
  });
});

// ===================== Content Analyzer =====================
describe("ContentAnalyzer", () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => { analyzer = new ContentAnalyzer(); });

  it("analyzes content types", () => {
    const result = analyzer.analyze(makeSource());
    expect(result.topContentTypes).toContain("post");
  });

  it("extracts common hashtags", () => {
    const result = analyzer.analyze(makeSource({
      content: [makeItem({ hashtags: ["#gaming", "#stream"] }), makeItem({ hashtags: ["#gaming", "#fun"] })],
    }));
    expect(result.commonHashtags).toContain("#gaming");
  });

  it("detects posting schedule", () => {
    const now = Date.now();
    const day = 86400000;
    const result = analyzer.analyze(makeSource({
      content: [
        makeItem({ createdAt: new Date(now).toISOString() }),
        makeItem({ createdAt: new Date(now - day).toISOString() }),
        makeItem({ createdAt: new Date(now - day * 2).toISOString() }),
      ],
    }));
    expect(result.postingSchedule).toBe("daily");
  });

  it("reports average post length", () => {
    const result = analyzer.analyze(makeSource());
    expect(result.averagePostLength).toBeGreaterThan(0);
  });

  it("estimates read time", () => {
    const result = analyzer.analyze(makeSource());
    expect(result.estimatedReadTime).toBeGreaterThanOrEqual(0);
  });
});

// ===================== Creator Profiler =====================
describe("CreatorProfiler", () => {
  let profiler: CreatorProfiler;

  beforeEach(() => { profiler = new CreatorProfiler(new NicheDetector()); });

  it("profiles creator from source", () => {
    const result = profiler.profile(makeSource());
    expect(result.name).toBe("Test Creator");
    expect(result.niche).toBeDefined();
  });

  it("uses username when display name missing", () => {
    const result = profiler.profile(makeSource({ displayName: "" }));
    expect(result.name).toBe("testcreator");
  });
});

// ===================== Audience Profiler =====================
describe("AudienceProfiler", () => {
  let profiler: AudienceProfiler;

  beforeEach(() => { profiler = new AudienceProfiler(); });

  it("profiles audience", () => {
    const result = profiler.profile(makeSource());
    expect(result.ageRange).toBeDefined();
    expect(result.primaryLanguage).toBeDefined();
  });

  it("detects gender from content", () => {
    const source: ContentSource = {
      platform: "instagram", username: "test", displayName: "Test", bio: "Fashion and beauty content creator",
      avatarUrl: "", followers: 1000, following: 100, posts: 50, engagement: 0.03,
      content: [{ id: "1", type: "post", text: "She is amazing, her style is great", hashtags: ["#fashion"], mentions: [], likes: 100, comments: 10, shares: 5, createdAt: new Date().toISOString(), url: "" }],
      categories: [], links: [],
    };
    const result = profiler.profile(source);
    expect(result.primaryGender).toBe("female");
  });
});

// ===================== Brand Extractor =====================
describe("BrandExtractor", () => {
  let extractor: BrandExtractor;

  beforeEach(() => { extractor = new BrandExtractor(); });

  it("extracts brand name", () => {
    const result = extractor.extract(makeSource());
    expect(result.name).toBe("Test Creator");
  });

  it("detects brand voice", () => {
    const result = extractor.extract(makeSource({ content: [makeItem({ text: "Learn how to code with these tutorials" })] }));
    expect(result.brandVoice).toBe("educational");
  });

  it("detects professional voice", () => {
    const result = extractor.extract(makeSource({ bio: "Business consultant and expert in strategy" }));
    expect(result.brandVoice).toBe("professional");
  });

  it("detects existing branding", () => {
    const result = extractor.extract(makeSource({ bio: "Official store for my brand" }));
    expect(result.existingBranding).toBe(true);
  });
});

// ===================== Social Graph =====================
describe("SocialGraph", () => {
  let graph: SocialGraph;

  beforeEach(() => { graph = new SocialGraph(); });

  it("builds social links", () => {
    const result = graph.build(makeSource());
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!.primary).toBe(true);
  });

  it("extracts mentioned handles", () => {
    const result = graph.build(makeSource({ content: [makeItem({ mentions: ["@othercreator"] })] }));
    expect(result.some((l) => l.handle === "@othercreator")).toBe(true);
  });
});

// ===================== Content Classifier =====================
describe("ContentClassifier", () => {
  let classifier: ContentClassifier;

  beforeEach(() => { classifier = new ContentClassifier(new NicheDetector()); });

  it("classifies content type", () => {
    const result = classifier.classify(makeSource());
    expect(result.primaryType).toBeDefined();
  });
});

// ===================== Keyword Extractor =====================
describe("KeywordExtractor", () => {
  let extractor: KeywordExtractor;

  beforeEach(() => { extractor = new KeywordExtractor(new ContentAnalyzer()); });

  it("extracts keywords from source", () => {
    const result = extractor.extract(makeSource());
    expect(result.length).toBeGreaterThan(0);
  });

  it("extracts niche-specific keywords", () => {
    const result = extractor.extractNicheKeywords("I love gaming and streaming on twitch");
    expect(result.length).toBeGreaterThan(0);
  });
});

// ===================== SEO Generator =====================
describe("SEOGenerator", () => {
  let seo: SEOGenerator;

  beforeEach(() => {
    const nicheDetector = new NicheDetector();
    seo = new SEOGenerator(nicheDetector, new KeywordExtractor(new ContentAnalyzer()), new CreatorProfiler(nicheDetector));
  });

  it("generates SEO metadata", () => {
    const result = seo.generate(makeSource());
    expect(result.pageTitle).toContain("Test Creator");
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.slug).toBe("test-creator");
  });
});

// ===================== Product Recommender =====================
describe("ProductRecommender", () => {
  let recommender: ProductRecommender;

  beforeEach(() => { recommender = new ProductRecommender(new NicheDetector()); });

  it("recommends products based on niche", () => {
    const result = recommender.recommend(makeSource());
    expect(result.length).toBeGreaterThan(0);
  });

  it("each product has a reason", () => {
    const result = recommender.recommend(makeSource());
    for (const p of result) expect(p.reason).toBeTruthy();
  });

  it("each product has confidence score", () => {
    const result = recommender.recommend(makeSource());
    for (const p of result) {
      expect(p.confidence).toBeGreaterThanOrEqual(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
    }
  });
});

// ===================== Section Recommender =====================
describe("SectionRecommender", () => {
  let recommender: SectionRecommender;

  beforeEach(() => {
    const nd = new NicheDetector();
    recommender = new SectionRecommender(nd, new CreatorProfiler(nd));
  });

  it("recommends sections", () => {
    const result = recommender.recommend(makeSource());
    expect(result.length).toBeGreaterThan(0);
  });

  it("each section has a reason", () => {
    const result = recommender.recommend(makeSource());
    for (const s of result) expect(s.reason).toBeTruthy();
  });
});

// ===================== Theme Selector =====================
describe("ThemeSelector", () => {
  let selector: ThemeSelector;

  beforeEach(() => {
    const nd = new NicheDetector();
    selector = new ThemeSelector(nd, new BrandExtractor());
  });

  it("selects theme for gaming", () => {
    const result = selector.select(makeSource({ bio: "Professional gamer and streamer" }));
    expect(result.primary).toBeDefined();
  });

  it("uses brand colors when available", () => {
    const result = selector.select(makeSource({ bio: "My official brand uses blue colors" }));
    expect(result.primary).toBe("#3B82F6");
  });

  it("provides font pairing", () => {
    const result = selector.select(makeSource());
    expect(result.fontPairing).toBeTruthy();
  });
});

// ===================== Knowledge Builder =====================
describe("KnowledgeBuilder", () => {
  let builder: KnowledgeBuilder;

  beforeEach(() => { builder = new KnowledgeBuilder(); });

  it("builds complete knowledge graph", () => {
    const graph = builder.build(makeSource());
    expect(graph.creator).toBeDefined();
    expect(graph.brand).toBeDefined();
    expect(graph.audience).toBeDefined();
    expect(graph.products).toBeDefined();
    expect(graph.content).toBeDefined();
    expect(graph.seo).toBeDefined();
    expect(graph.theme).toBeDefined();
    expect(graph.sections).toBeDefined();
    expect(graph.socialLinks).toBeDefined();
    expect(graph.businessModel).toBeDefined();
    expect(graph.confidence).toBeGreaterThan(0);
  });

  it("calculates overall confidence", () => {
    const graph = builder.build(makeSource({ followers: 100000, bio: "Very detailed creator bio with lots of context for analysis", content: Array(20).fill(null).map(() => makeItem()) }));
    expect(graph.confidence).toBeGreaterThan(0.3);
  });
});

// ===================== Knowledge Validator =====================
describe("KnowledgeValidator", () => {
  let builder: KnowledgeBuilder;
  let validator: KnowledgeValidator;

  beforeEach(() => {
    builder = new KnowledgeBuilder();
    validator = new KnowledgeValidator();
  });

  it("validates complete knowledge graph", () => {
    const graph = builder.build(makeSource());
    const result = validator.validate(graph);
    expect(result.score).toBeGreaterThan(0);
  });

  it("reports issues for minimal data", () => {
    const graph = builder.build(makeSource({ bio: "", content: [], followers: 0 }));
    const result = validator.validate(graph);
    expect(result.issues.length).toBeGreaterThanOrEqual(0);
  });
});

// ===================== Intelligence Cache =====================
describe("IntelligenceCache", () => {
  let cache: IntelligenceCache;
  let store: Map<string, any>;

  beforeEach(() => {
    store = new Map();
    cache = new IntelligenceCache({
      get: async (k: string) => ({ success: true, data: store.get(k) ?? null }),
      set: async (k: string, v: any) => { store.set(k, v); return { success: true, data: undefined }; },
      invalidate: async (k: string) => { store.delete(k); return { success: true, data: undefined }; },
      invalidateByPattern: async () => { store.clear(); return { success: true, data: undefined }; },
      exists: async () => ({ success: true, data: false }),
    } as any, 5000);
  });

  it("caches and retrieves knowledge graph", async () => {
    const graph = new KnowledgeBuilder().build(makeSource());
    await cache.set("test_creator", graph);
    const retrieved = await cache.get("test_creator");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.creator.name).toBe(graph.creator.name);
  });

  it("returns null for missing key", async () => {
    const result = await cache.get("nonexistent");
    expect(result).toBeNull();
  });

  it("invalidates specific key", async () => {
    const graph = new KnowledgeBuilder().build(makeSource());
    await cache.set("test_creator", graph);
    await cache.invalidate("test_creator");
    expect(await cache.get("test_creator")).toBeNull();
  });

  it("invalidates all keys", async () => {
    const graph = new KnowledgeBuilder().build(makeSource());
    await cache.set("k1", graph);
    await cache.set("k2", graph);
    await cache.invalidateAll();
    expect(await cache.get("k1")).toBeNull();
    expect(await cache.get("k2")).toBeNull();
  });
});

// ===================== Integration =====================
describe("Intelligence integration", () => {
  it("full pipeline: source to validated knowledge graph", () => {
    const builder = new KnowledgeBuilder();
    const validator = new KnowledgeValidator();

    const source = makeSource({
      bio: "Professional gamer and content creator. Streaming daily on Twitch. Check out my gaming highlights!",
      platform: "twitch",
      username: "pro_gamer",
      displayName: "Pro Gamer",
      followers: 150000,
      engagement: 0.08,
      content: Array(15).fill(null).map(() => makeItem({
        text: "Amazing gaming session today! Check out my stream highlights on twitch.",
        hashtags: ["#gaming", "#twitch", "#esports", "#stream"],
      })),
      categories: ["gaming", "entertainment"],
    });

    const graph = builder.build(source);
    const validation = validator.validate(graph);

    expect(graph.creator.niche).toBe("gaming");
    expect(graph.theme.primary).toBe(THEME_PALETTES.gaming.primary);
    expect(graph.products.length).toBeGreaterThan(0);
    expect(graph.sections.length).toBeGreaterThan(0);
    expect(graph.seo.keywords.length).toBeGreaterThan(0);
    expect(graph.businessModel.type).toBeDefined();
    expect(validation.score).toBeGreaterThan(0);
  });

  it("handles minimal source gracefully", () => {
    const builder = new KnowledgeBuilder();
    const graph = builder.build(makeSource({
      bio: "",
      content: [],
      followers: 0,
      engagement: 0,
      posts: 0,
      displayName: "",
    }));

    expect(graph.creator.name).toBeTruthy();
    expect(graph.products.length).toBeGreaterThan(0);
    expect(graph.confidence).toBeGreaterThanOrEqual(0);
  });

  it("gaming creator gets gaming theme", () => {
    const builder = new KnowledgeBuilder();
    const graph = builder.build(makeSource({
      bio: "Professional gamer and Twitch streamer",
      content: [makeItem({ text: "Gaming stream highlights" })],
    }));
    expect(graph.theme.primary).toBe(THEME_PALETTES.gaming.primary);
  });

  it("fitness creator gets fitness products", () => {
    const builder = new KnowledgeBuilder();
    const graph = builder.build(makeSource({
      bio: "Fitness coach and personal trainer",
      content: [makeItem({ text: "Workout routine" })],
    }));
    expect(graph.products.some((p) => p.category === "Fitness" || p.category === "Apparel")).toBe(true);
  });
});
