import { describe, it, expect } from "vitest";
import { PersonaRegistry } from "@/lib/generation/persona/registry";
import { ALL_DETECTORS } from "@/lib/generation/persona/detectors/all-detectors";
import { PersonaEngine, ExperienceProfileBuilder } from "@/lib/generation/persona";
import { ExperiencePlanningEngine, DEFAULTS } from "@/lib/generation/experience-plan";
import { LayoutComposer } from "@/lib/generation/composition/layout-composer";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";

function mockGraph(niche: string, overrides?: Partial<KnowledgeGraph>): KnowledgeGraph {
  const base: KnowledgeGraph = {
    creator: { name: "Test", username: "test", bio: "A creator", niche, subNiche: [], platform: "instagram", followers: 1000, engagement: 0.02, contentFrequency: "weekly", verified: false, confidence: 0.7 },
    brand: { name: "Test", tagline: "Tagline", description: "Desc", colors: [], logo: null, existingBranding: false, brandVoice: "casual", confidence: 0.7 },
    audience: { ageRange: "25-34", primaryGender: "female", primaryLanguage: "en", topCountries: ["US"], interests: ["general"], incomeLevel: "medium", devicePreference: "mobile", activeHours: ["18:00"], confidence: 0.6 } as any,
    products: [],
    socialLinks: [],
    content: { topContentTypes: [], averagePostLength: 100, commonHashtags: [], commonTopics: [], postingSchedule: "weekly", contentQuality: "medium", estimatedReadTime: 1, confidence: 0.6 },
    seo: { pageTitle: "", metaDescription: "", keywords: [], focusPhrase: "", slug: "test", canonical: "", confidence: 0.6 },
    theme: { palette: ["#000"], primary: "#000", secondary: "#fff", accent: "#ccc", mode: "light", fontPairing: "Inter", borderRadius: "0.5rem", confidence: 0.8 },
    sections: [],
    businessModel: { type: "mixed", primaryRevenueSource: "Digital", monetizationChannels: [], priceTier: "mid", confidence: 0.5 },
    confidence: 0.7,
    ...overrides,
  };
  return base;
}

describe("PersonaRegistry", () => {
  it("registers all detectors from ALL_DETECTORS", () => {
    const registry = new PersonaRegistry();
    for (const d of ALL_DETECTORS) registry.register(d);
    expect(registry.getAll().length).toBe(ALL_DETECTORS.length);
  });

  it("getDetectorsForNiche returns detectors for a niche", () => {
    const registry = new PersonaRegistry();
    for (const d of ALL_DETECTORS) registry.register(d);
    const edu = registry.getDetectorsForNiche("education");
    expect(edu.length).toBeGreaterThanOrEqual(5);
    edu.forEach((d) => expect(d.niche).toBe("education"));
  });

  it("throws on duplicate registration", () => {
    const registry = new PersonaRegistry();
    registry.register(ALL_DETECTORS[0]!);
    expect(() => registry.register(ALL_DETECTORS[0]!)).toThrow();
  });

  it("listNiches returns all unique niches", () => {
    const registry = new PersonaRegistry();
    for (const d of ALL_DETECTORS) registry.register(d);
    const niches = registry.listNiches();
    expect(niches).toContain("default");
    expect(niches).toContain("education");
    expect(niches).toContain("photography");
    expect(niches).toContain("gaming");
    expect(niches).toContain("technology");
  });
});

describe("PersonaEngine — end to end", () => {
  it("detects persona for a niche", () => {
    const engine = new PersonaEngine();
    const result = engine.detect(mockGraph("education"));
    expect(result.persona).toBeDefined();
    expect(result.persona.niche).toBe("education");
    expect(result.score).toBeGreaterThanOrEqual(1);
  });

  it("returns Default Creator for unknown niche", () => {
    const engine = new PersonaEngine();
    const result = engine.detect(mockGraph("nonexistent", {
      creator: { name: "Test", username: "test", bio: "", niche: "nonexistent", subNiche: [], platform: "instagram", followers: 100, engagement: 0.01, contentFrequency: "irregular", verified: false, confidence: 0.3 },
    }));
    expect(result.persona.id).toBe("default_creator");
  });

  it("detects Course Creator for education with many digital products", () => {
    const engine = new PersonaEngine();
    const graph = mockGraph("education", {
      products: [
        { name: "Course 1", type: "digital", category: "Education", description: "", priceRange: "$50", recommended: true, reason: "", confidence: 0.9 },
        { name: "Course 2", type: "digital", category: "Education", description: "", priceRange: "$100", recommended: true, reason: "", confidence: 0.9 },
        { name: "Course 3", type: "digital", category: "Education", description: "", priceRange: "$75", recommended: true, reason: "", confidence: 0.9 },
      ],
      content: { topContentTypes: ["educational", "tutorial"], averagePostLength: 500, commonHashtags: [], commonTopics: [], postingSchedule: "weekly", contentQuality: "high", estimatedReadTime: 5, confidence: 0.8 },
      creator: { name: "Prof", username: "prof", bio: "I teach courses on programming", niche: "education", subNiche: [], platform: "youtube", followers: 5000, engagement: 0.05, contentFrequency: "weekly", verified: true, confidence: 0.9 },
      audience: { ageRange: "18-34", primaryGender: "male", primaryLanguage: "en", topCountries: ["US"], interests: ["learning", "programming"], incomeLevel: "medium", devicePreference: "desktop", activeHours: ["14:00"], confidence: 0.7 },
    });
    const result = engine.detect(graph);
    expect(result.persona.id).toBe("education_course_creator");
  });

  it("detects Coach for education with service-based business", () => {
    const engine = new PersonaEngine();
    const graph = mockGraph("education", {
      businessModel: { type: "services", primaryRevenueSource: "Coaching", monetizationChannels: ["1:1"], priceTier: "premium", confidence: 0.7 },
      products: [{ name: "Coaching", type: "service", category: "Coaching", description: "", priceRange: "$200", recommended: true, reason: "", confidence: 0.9 }],
      creator: { name: "Coach", username: "coach", bio: "I help people transform their lives through coaching", niche: "education", subNiche: [], platform: "instagram", followers: 2000, engagement: 0.08, contentFrequency: "daily", verified: false, confidence: 0.8 },
      audience: { ageRange: "25-44", primaryGender: "female", primaryLanguage: "en", topCountries: ["US"], interests: ["personal development", "growth"], incomeLevel: "high", devicePreference: "mobile", activeHours: ["08:00"], confidence: 0.6 },
    });
    const result = engine.detect(graph);
    expect(result.persona.id).toBe("education_coach");
  });

  it("detects Wedding Photographer for photography with wedding bio", () => {
    const engine = new PersonaEngine();
    const graph = mockGraph("photography", {
      creator: { name: "Wedding Pro", username: "wedpro", bio: "Wedding photographer capturing your special day", niche: "photography", subNiche: [], platform: "instagram", followers: 5000, engagement: 0.04, contentFrequency: "weekly", verified: false, confidence: 0.8 },
      audience: { ageRange: "25-34", primaryGender: "female", primaryLanguage: "en", topCountries: ["US"], interests: ["wedding", "event"], incomeLevel: "high", devicePreference: "mobile", activeHours: ["10:00"], confidence: 0.6 },
    });
    const result = engine.detect(graph);
    expect(result.persona.id).toBe("photography_wedding");
  });

  it("detects Streamer for gaming with streaming content", () => {
    const engine = new PersonaEngine();
    const graph = mockGraph("gaming", {
      content: { topContentTypes: ["stream", "gameplay"], averagePostLength: 200, commonHashtags: [], commonTopics: [], postingSchedule: "daily", contentQuality: "high", estimatedReadTime: 3, confidence: 0.8 },
      creator: { name: "Streamer", username: "streamer", bio: "Live streaming daily", niche: "gaming", subNiche: [], platform: "twitch", followers: 15000, engagement: 0.06, contentFrequency: "daily", verified: true, confidence: 0.9 },
      socialLinks: [{ platform: "twitch", url: "https://twitch.tv/streamer", handle: "streamer", followers: 15000, primary: true }],
    });
    const result = engine.detect(graph);
    expect(result.persona.id).toBe("gaming_streamer");
  });

  it("detects SaaS Founder for technology with subscription products", () => {
    const engine = new PersonaEngine();
    const graph = mockGraph("technology", {
      products: [{ name: "SaaS Pro", type: "subscription", category: "Software", description: "", priceRange: "$29/mo", recommended: true, reason: "", confidence: 0.9 }],
      creator: { name: "Founder", username: "founder", bio: "Building the next SaaS platform", niche: "technology", subNiche: [], platform: "twitter", followers: 10000, engagement: 0.03, contentFrequency: "weekly", verified: false, confidence: 0.8 },
      brand: { name: "SaaS Pro", tagline: "Enterprise software", description: "Best SaaS", colors: ["#000"], logo: "logo.png", existingBranding: true, brandVoice: "professional", confidence: 0.9 },
    });
    const result = engine.detect(graph);
    expect(result.persona.id).toBe("tech_saas_founder");
  });

  it("detects Personal Trainer for fitness with service products", () => {
    const engine = new PersonaEngine();
    const graph = mockGraph("fitness", {
      products: [{ name: "Training", type: "service", category: "Fitness", description: "", priceRange: "$50", recommended: true, reason: "", confidence: 0.9 }],
      creator: { name: "Trainer", username: "trainer", bio: "Personal trainer helping you reach your goals", niche: "fitness", subNiche: [], platform: "instagram", followers: 3000, engagement: 0.05, contentFrequency: "daily", verified: false, confidence: 0.8 },
      content: { topContentTypes: ["workout", "exercise"], averagePostLength: 100, commonHashtags: [], commonTopics: [], postingSchedule: "daily", contentQuality: "high", estimatedReadTime: 1, confidence: 0.7 },
    });
    const result = engine.detect(graph);
    expect(result.persona.id).toBe("fitness_personal_trainer");
  });

  it("detects Recipe Creator for food with recipe content", () => {
    const engine = new PersonaEngine();
    const graph = mockGraph("food", {
      content: { topContentTypes: ["recipe", "cooking"], averagePostLength: 200, commonHashtags: [], commonTopics: [], postingSchedule: "daily", contentQuality: "high", estimatedReadTime: 3, confidence: 0.8 },
      creator: { name: "Chef", username: "chef", bio: "Sharing my favorite recipes", niche: "food", subNiche: [], platform: "instagram", followers: 5000, engagement: 0.04, contentFrequency: "daily", verified: false, confidence: 0.8 },
    });
    const result = engine.detect(graph);
    expect(result.persona.id).toBe("food_recipe_creator");
  });

  it("detects Gallery Artist for art with high followers and exhibition bio", () => {
    const engine = new PersonaEngine();
    const graph = mockGraph("art", {
      creator: { name: "Artist", username: "artist", bio: "Featured in multiple gallery exhibitions", niche: "art", subNiche: [], platform: "instagram", followers: 50000, engagement: 0.03, contentFrequency: "weekly", verified: true, confidence: 0.9 },
      brand: { name: "Artist Brand", tagline: "", description: "", colors: [], logo: null, existingBranding: true, brandVoice: "inspirational", confidence: 0.7 },
      content: { topContentTypes: ["art", "studio"], averagePostLength: 100, commonHashtags: [], commonTopics: [], postingSchedule: "weekly", contentQuality: "high", estimatedReadTime: 1, confidence: 0.8 },
    });
    const result = engine.detect(graph);
    expect(result.persona.id).toBe("art_gallery_artist");
  });

  it("detects Fashion Influencer for lifestyle with fashion bio", () => {
    const engine = new PersonaEngine();
    const graph = mockGraph("lifestyle", {
      creator: { name: "Fash", username: "fash", bio: "Fashion influencer sharing outfit ideas", niche: "lifestyle", subNiche: [], platform: "instagram", followers: 20000, engagement: 0.05, contentFrequency: "daily", verified: true, confidence: 0.9 },
      content: { topContentTypes: ["fashion", "style"], averagePostLength: 100, commonHashtags: [], commonTopics: [], postingSchedule: "daily", contentQuality: "high", estimatedReadTime: 1, confidence: 0.8 },
      socialLinks: [{ platform: "instagram", url: "https://instagram.com/fash", handle: "fash", followers: 20000, primary: true }],
    });
    const result = engine.detect(graph);
    expect(result.persona.id).toBe("fashion_influencer");
  });

  it("detects Journalist for news with reporting bio", () => {
    const engine = new PersonaEngine();
    const graph = mockGraph("news", {
      creator: { name: "Reporter", username: "reporter", bio: "Investigative journalist covering world events", niche: "news", subNiche: [], platform: "twitter", followers: 10000, engagement: 0.04, contentFrequency: "daily", verified: true, confidence: 0.9 },
      content: { topContentTypes: ["news", "investigation"], averagePostLength: 500, commonHashtags: [], commonTopics: [], postingSchedule: "daily", contentQuality: "high", estimatedReadTime: 5, confidence: 0.8 },
      audience: { ageRange: "25-64", primaryGender: "male", primaryLanguage: "en", topCountries: ["US"], interests: ["news", "politics", "current affairs"], incomeLevel: "medium", devicePreference: "desktop", activeHours: ["06:00"], confidence: 0.7 },
    });
    const result = engine.detect(graph);
    expect(result.persona.id).toBe("news_journalist");
  });

  it("detects Athlete for sports with sports bio", () => {
    const engine = new PersonaEngine();
    const graph = mockGraph("sports", {
      creator: { name: "Pro", username: "pro", bio: "Professional athlete competing at the highest level", niche: "sports", subNiche: [], platform: "instagram", followers: 100000, engagement: 0.04, contentFrequency: "weekly", verified: true, confidence: 0.9 },
      products: [{ name: "Merch", type: "physical", category: "Apparel", description: "", priceRange: "$30", recommended: true, reason: "", confidence: 0.8 }],
      content: { topContentTypes: ["sports", "training"], averagePostLength: 100, commonHashtags: [], commonTopics: [], postingSchedule: "weekly", contentQuality: "high", estimatedReadTime: 1, confidence: 0.8 },
    });
    const result = engine.detect(graph);
    expect(result.persona.id).toBe("sports_athlete");
  });

  it("detects Explorer for travel with travel content", () => {
    const engine = new PersonaEngine();
    const graph = mockGraph("travel", {
      creator: { name: "Traveler", username: "traveler", bio: "Exploring the world one destination at a time", niche: "travel", subNiche: [], platform: "instagram", followers: 8000, engagement: 0.05, contentFrequency: "weekly", verified: false, confidence: 0.8 },
      content: { topContentTypes: ["travel", "adventure"], averagePostLength: 200, commonHashtags: [], commonTopics: [], postingSchedule: "weekly", contentQuality: "high", estimatedReadTime: 2, confidence: 0.8 },
    });
    const result = engine.detect(graph);
    expect(result.persona.id).toBe("travel_explorer");
  });

  it("detects Singer for music with music bio", () => {
    const engine = new PersonaEngine();
    const graph = mockGraph("music", {
      creator: { name: "Vocalist", username: "vocalist", bio: "Singer and songwriter sharing my music", niche: "music", subNiche: [], platform: "youtube", followers: 20000, engagement: 0.06, contentFrequency: "weekly", verified: true, confidence: 0.9 },
      products: [{ name: "Album", type: "digital", category: "Music", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.9 }],
    });
    const result = engine.detect(graph);
    expect(result.persona.id).toBe("music_singer");
  });

  it("detects Journalist for news with reporting bio", () => {
    const engine = new PersonaEngine();
    const graph = mockGraph("news", {
      creator: { name: "Reporter", username: "reporter", bio: "Investigative journalist covering world events", niche: "news", subNiche: [], platform: "twitter", followers: 10000, engagement: 0.04, contentFrequency: "daily", verified: true, confidence: 0.9 },
      content: { topContentTypes: ["news", "investigation"], averagePostLength: 500, commonHashtags: [], commonTopics: [], postingSchedule: "daily", contentQuality: "high", estimatedReadTime: 5, confidence: 0.8 },
      audience: { ageRange: "25-64", primaryGender: "male", primaryLanguage: "en", topCountries: ["US"], interests: ["news", "politics", "current affairs"], incomeLevel: "medium", devicePreference: "desktop", activeHours: ["06:00"], confidence: 0.7 },
    });
    const result = engine.detect(graph);
    expect(result.persona.id).toBe("news_journalist");
  });
});

describe("Persona determinism", () => {
  it("same graph always returns same persona", () => {
    const engine = new PersonaEngine();
    const graph = mockGraph("education", {
      products: [
        { name: "C1", type: "digital", category: "Education", description: "", priceRange: "$50", recommended: true, reason: "", confidence: 0.9 },
        { name: "C2", type: "digital", category: "Education", description: "", priceRange: "$100", recommended: true, reason: "", confidence: 0.9 },
      ],
      content: { topContentTypes: ["educational"], averagePostLength: 500, commonHashtags: [], commonTopics: [], postingSchedule: "weekly", contentQuality: "high", estimatedReadTime: 5, confidence: 0.8 },
      creator: { name: "Prof", username: "prof", bio: "I teach courses", niche: "education", subNiche: [], platform: "youtube", followers: 5000, engagement: 0.05, contentFrequency: "weekly", verified: true, confidence: 0.9 },
    });
    const a = engine.detect(graph);
    const b = engine.detect(graph);
    expect(a.persona.id).toBe(b.persona.id);
    expect(a.score).toBe(b.score);
  });

  it("three consecutive detections are identical", () => {
    const engine = new PersonaEngine();
    const graph = mockGraph("education", {
      businessModel: { type: "services", primaryRevenueSource: "Coaching", monetizationChannels: [], priceTier: "premium", confidence: 0.7 },
      creator: { name: "Coach", username: "coach", bio: "I help people transform", niche: "education", subNiche: [], platform: "instagram", followers: 2000, engagement: 0.08, contentFrequency: "daily", verified: false, confidence: 0.8 },
      audience: { ageRange: "25-44", primaryGender: "female", primaryLanguage: "en", topCountries: ["US"], interests: ["personal development"], incomeLevel: "high", devicePreference: "mobile", activeHours: ["08:00"], confidence: 0.6 },
    });
    const r1 = engine.detect(graph);
    const r2 = engine.detect(graph);
    const r3 = engine.detect(graph);
    expect(r1.persona.id).toBe(r2.persona.id);
    expect(r2.persona.id).toBe(r3.persona.id);
  });

  it("different creators in same niche get different personas", () => {
    const engine = new PersonaEngine();
    const coachGraph = mockGraph("education", {
      businessModel: { type: "services", primaryRevenueSource: "Coaching", monetizationChannels: [], priceTier: "premium", confidence: 0.7 },
      creator: { name: "Coach", username: "coach", bio: "I help people transform", niche: "education", subNiche: [], platform: "instagram", followers: 2000, engagement: 0.08, contentFrequency: "daily", verified: false, confidence: 0.8 },
      audience: { ageRange: "25-44", primaryGender: "female", primaryLanguage: "en", topCountries: ["US"], interests: ["personal development"], incomeLevel: "high", devicePreference: "mobile", activeHours: ["08:00"], confidence: 0.6 },
    });
    const courseGraph = mockGraph("education", {
      products: [
        { name: "C1", type: "digital", category: "Education", description: "", priceRange: "$50", recommended: true, reason: "", confidence: 0.9 },
        { name: "C2", type: "digital", category: "Education", description: "", priceRange: "$100", recommended: true, reason: "", confidence: 0.9 },
      ],
      content: { topContentTypes: ["educational"], averagePostLength: 500, commonHashtags: [], commonTopics: [], postingSchedule: "weekly", contentQuality: "high", estimatedReadTime: 5, confidence: 0.8 },
      creator: { name: "Prof", username: "prof", bio: "I teach courses", niche: "education", subNiche: [], platform: "youtube", followers: 5000, engagement: 0.05, contentFrequency: "weekly", verified: true, confidence: 0.9 },
      audience: { ageRange: "18-34", primaryGender: "male", primaryLanguage: "en", topCountries: ["US"], interests: ["learning", "programming"], incomeLevel: "medium", devicePreference: "desktop", activeHours: ["14:00"], confidence: 0.7 },
    });
    const coach = engine.detect(coachGraph);
    const course = engine.detect(courseGraph);
    expect(coach.persona.id).not.toBe(course.persona.id);
  });
});

describe("ExperienceProfileBuilder", () => {
  const builder = new ExperienceProfileBuilder();

  it("builds ExperienceProfile from graph and persona", () => {
    const graph = mockGraph("education", {
      creator: { name: "Prof", username: "prof", bio: "I teach courses", niche: "education", subNiche: [], platform: "youtube", followers: 5000, engagement: 0.05, contentFrequency: "weekly", verified: true, confidence: 0.9 },
      brand: { name: "Prof Inc", tagline: "Learn well", description: "Best courses", colors: ["#3B82F6"], logo: "logo.png", existingBranding: true, brandVoice: "educational", confidence: 0.9 },
    });
    const engine = new PersonaEngine();
    const match = engine.detect(graph);
    const ep = builder.build(graph, match.persona, match.score);

    expect(ep.persona).toBe(match.persona);
    expect(ep.businessModel).toBeTruthy();
    expect(ep.creatorStage).toBeTruthy();
    expect(ep.commerceStage).toBeTruthy();
    expect(ep.brandStrength).toBeTruthy();
    expect(ep.audienceType).toBeTruthy();
    expect(ep.contentStyle).toBeTruthy();
    expect(ep.confidence).toBeGreaterThanOrEqual(0);
    expect(ep.confidence).toBeLessThanOrEqual(1);
  });

  it("derives creatorStage from followers", () => {
    const engine = new PersonaEngine();
    const match = engine.detect(mockGraph("default"));
    const celebrity = builder.build(
      mockGraph("default", { creator: { name: "T", username: "t", bio: "", niche: "default", subNiche: [], platform: "youtube", followers: 5000000, engagement: 0.1, contentFrequency: "daily", verified: true, confidence: 0.9 } }),
      match.persona, 100,
    );
    expect(celebrity.creatorStage).toBe("celebrity");

    const starting = builder.build(
      mockGraph("default", { creator: { name: "T", username: "t", bio: "", niche: "default", subNiche: [], platform: "youtube", followers: 100, engagement: 0.01, contentFrequency: "irregular", verified: false, confidence: 0.3 } }),
      match.persona, 10,
    );
    expect(starting.creatorStage).toBe("starting");
  });

  it("derives commerceStage from products", () => {
    const engine = new PersonaEngine();
    const match = engine.detect(mockGraph("default"));
    const none = builder.build(mockGraph("default"), match.persona, 50);
    expect(none.commerceStage).toBe("none");

    const scaling = builder.build(
      mockGraph("default", {
        products: Array.from({ length: 15 }, (_, i) => ({
          name: `P${i}`, type: "digital" as const, category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.8,
        })),
      }),
      match.persona, 50,
    );
    expect(scaling.commerceStage).toBe("scaling");
  });

  it("derives brandStrength from brand data", () => {
    const engine = new PersonaEngine();
    const match = engine.detect(mockGraph("default"));
    const weak = builder.build(mockGraph("default"), match.persona, 50);
    expect(weak.brandStrength).toBe("none");

    const dominant = builder.build(
      mockGraph("default", {
        brand: { name: "Strong", tagline: "Tag", description: "Desc", colors: ["#000", "#fff"], logo: "logo.png", existingBranding: true, brandVoice: "professional", confidence: 0.9 },
      }),
      match.persona, 50,
    );
    expect(dominant.brandStrength).toBe("dominant");
  });

  it("derives audienceType from interests", () => {
    const engine = new PersonaEngine();
    const match = engine.detect(mockGraph("default"));
    const luxury = builder.build(
      mockGraph("default", {
        audience: { ageRange: "25-34", primaryGender: "female", primaryLanguage: "en", topCountries: ["US"], interests: ["luxury", "premium", "designer"], incomeLevel: "high", devicePreference: "mobile", activeHours: ["10:00"], confidence: 0.7 },
      }),
      match.persona, 50,
    );
    expect(luxury.audienceType).toBe("luxury");

    const professional = builder.build(
      mockGraph("default", {
        audience: { ageRange: "25-44", primaryGender: "male", primaryLanguage: "en", topCountries: ["US"], interests: ["professional", "business", "career"], incomeLevel: "high", devicePreference: "desktop", activeHours: ["09:00"], confidence: 0.7 },
      }),
      match.persona, 50,
    );
    expect(professional.audienceType).toBe("professional");
  });

  it("derives contentStyle from content types", () => {
    const engine = new PersonaEngine();
    const match = engine.detect(mockGraph("default"));
    const educational = builder.build(
      mockGraph("default", {
        content: { topContentTypes: ["educational", "tutorial"], averagePostLength: 500, commonHashtags: [], commonTopics: [], postingSchedule: "weekly", contentQuality: "high", estimatedReadTime: 5, confidence: 0.8 },
      }),
      match.persona, 50,
    );
    expect(educational.contentStyle).toBe("educational");

    const entertainment = builder.build(
      mockGraph("default", {
        content: { topContentTypes: ["entertainment", "comedy"], averagePostLength: 50, commonHashtags: [], commonTopics: [], postingSchedule: "daily", contentQuality: "medium", estimatedReadTime: 1, confidence: 0.6 },
      }),
      match.persona, 50,
    );
    expect(entertainment.contentStyle).toBe("entertainment");
  });

  it("normalizes confidence from score", () => {
    const engine = new PersonaEngine();
    const match = engine.detect(mockGraph("default"));
    const high = builder.build(mockGraph("default"), match.persona, 90);
    expect(high.confidence).toBe(0.95);

    const low = builder.build(mockGraph("default"), match.persona, 10);
    expect(low.confidence).toBe(0.45);
  });
});

describe("Integration with LayoutComposer", () => {
  it("composes with experience plan without error", () => {
    const engine = new PersonaEngine();
    const planningEngine = new ExperiencePlanningEngine();
    const builder = new ExperienceProfileBuilder();
    const composer = new LayoutComposer();
    const graph = mockGraph("education", {
      products: [
        { name: "C1", type: "digital", category: "Education", description: "", priceRange: "$50", recommended: true, reason: "", confidence: 0.9 },
        { name: "C2", type: "digital", category: "Education", description: "", priceRange: "$100", recommended: true, reason: "", confidence: 0.9 },
      ],
      content: { topContentTypes: ["educational"], averagePostLength: 500, commonHashtags: [], commonTopics: [], postingSchedule: "weekly", contentQuality: "high", estimatedReadTime: 5, confidence: 0.8 },
      creator: { name: "Prof", username: "prof", bio: "I teach courses", niche: "education", subNiche: [], platform: "youtube", followers: 5000, engagement: 0.05, contentFrequency: "weekly", verified: true, confidence: 0.9 },
      seo: { pageTitle: "Learn", metaDescription: "Best courses", keywords: ["course"], focusPhrase: "", slug: "learn", canonical: "", confidence: 0.8 },
    });
    const match = engine.detect(graph);
    const ep = builder.build(graph, match.persona, match.score);
    const plan = planningEngine.plan(graph, ep);
    const blueprint = composer.compose(graph, "test-key", plan);

    expect(blueprint).toBeDefined();
    expect(blueprint.sections.length).toBeGreaterThan(0);
  });

  it("composes with default plan", () => {
    const composer = new LayoutComposer();
    const graph = mockGraph("default", {
      seo: { pageTitle: "Store", metaDescription: "My store", keywords: ["shop"], focusPhrase: "", slug: "store", canonical: "", confidence: 0.8 },
    });
    const blueprint = composer.compose(graph, "test-key", DEFAULTS);
    expect(blueprint).toBeDefined();
    expect(blueprint.sections.length).toBeGreaterThan(0);
  });
});

describe("Open/Closed compliance", () => {
  it("registering a new detector adds new persona without modifying existing code", () => {
    const registry = new PersonaRegistry();
    for (const d of ALL_DETECTORS) registry.register(d);

    const before = registry.listNiches().length;
    const detectorCount = registry.getAll().length;

    const customDetector = {
      niche: "education",
      getPersona: () => ({
        id: "education_test_persona" as const,
        name: "Test Persona",
        niche: "education",
        description: "A test persona added without modifying any existing code",
        businessModel: "education" as const,
        typicalProducts: ["Tests"],
        contentStyle: "educational" as const,
        audienceType: "niche" as const,
        socialProofEmphasis: "medium" as const,
        pricingEmphasis: "medium" as const,
        defaultModules: ["hero"],
        onboardingDefaults: {},
      }),
      match: () => 99,
    };

    registry.register(customDetector);
    expect(registry.getAll().length).toBe(detectorCount + 1);
    expect(registry.listNiches().length).toBe(before);

    const educationDetectors = registry.getDetectorsForNiche("education");
    const testPersona = educationDetectors.find((d) => d.getPersona().id === "education_test_persona");
    expect(testPersona).toBeDefined();
  });
});
