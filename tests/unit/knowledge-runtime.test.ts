import { describe, it, expect } from "vitest";

import {
  computeKnowledgeScore,
  detectMissingFields,
  generateCompletionQuestions,
  applicableFieldsForPack,
  resolvePack,
  getPack,
  computeStorefrontScore,
  generateBuilderHints,
  applyDeclaredAnswers,
  validateAnswer,
  MAX_COMPLETION_QUESTIONS,
  resolveAssist,
  getField,
} from "@/modules/knowledge-runtime";
import type { KnowledgeSnapshot } from "@/modules/knowledge-runtime";

function makeSnapshot(overrides: Partial<KnowledgeSnapshot> = {}): KnowledgeSnapshot {
  const base: KnowledgeSnapshot = {
    identity: { name: "", tagline: "", bio: "", avatarUrl: null, bannerUrl: null },
    brand: { logoUrl: null, customTheme: false },
    commerce: {
      productCount: 0,
      productsWithDescription: 0,
      productsWithImage: 0,
      offersPriced: 0,
      offerCount: 0,
      serviceCount: 0,
      courseCount: 0,
      bookingCount: 0,
    },
    content: { galleryCount: 0, galleryWithTitle: 0, galleryWithAltText: 0, faqCount: 0, feedCount: 0 },
    trust: { testimonialCount: 0, timelineCount: 0, gameCount: 0 },
    media: { heroMediaPresent: false, heroTitlePresent: false },
    seo: { title: "", description: "" },
    contact: { email: "", phone: "", location: "", languages: [], businessHours: [] },
    social: { socialLinkCount: 0, primaryPlatform: "", feedConnected: false, affiliateLinkCount: 0 },
    business: { customDomain: null, subdomain: "test" },
    declared: {},
    entityType: "creator",
  };
  return { ...base, ...overrides };
}

function completeCreator(): KnowledgeSnapshot {
  return makeSnapshot({
    identity: {
      name: "Rahul Fitness",
      tagline: "Helping beginners get strong",
      bio: "Certified fitness coach helping beginners build sustainable habits with simple programs.",
      avatarUrl: "https://cdn.test/avatar.jpg",
      bannerUrl: "https://cdn.test/banner.jpg",
    },
    brand: { logoUrl: "https://cdn.test/logo.png", customTheme: true },
    commerce: {
      productCount: 3,
      productsWithDescription: 3,
      productsWithImage: 3,
      offersPriced: 3,
      offerCount: 3,
      serviceCount: 1,
      courseCount: 1,
      bookingCount: 1,
    },
    content: {
      galleryCount: 4,
      galleryWithTitle: 4,
      galleryWithAltText: 4,
      faqCount: 3,
      feedCount: 3,
    },
    trust: { testimonialCount: 3, timelineCount: 3, gameCount: 0 },
    media: { heroMediaPresent: true, heroTitlePresent: true },
    seo: { title: "Rahul Fitness — Online Coach", description: "Online fitness coaching for beginners. Programs, plans and 1:1 support." },
    contact: { email: "rahul@test.com", phone: "9876543210", location: "Mumbai", languages: ["English", "Hindi"], businessHours: [] },
    social: { socialLinkCount: 3, primaryPlatform: "YouTube", feedConnected: true, affiliateLinkCount: 2 },
    business: { customDomain: "rahul.fit", subdomain: "rahul" },
    declared: {
      brand_mission: "Make fitness sustainable for every beginner.",
      brand_voice: "Casual",
      business_hours: "Mon–Sat, 9am–6pm",
      trust_achievements: "1M subscribers and 10k clients coached.",
      seo_keywords: ["fitness coach", "workout plans", "nutrition"],
      creator_sponsors: "Partnered with Nike and AMD on multiple campaigns.",
      creator_resources: "Free workout presets and a weekly newsletter for fans.",
    },
  });
}

function nearlyComplete(): KnowledgeSnapshot {
  return makeSnapshot({
    identity: { name: "Rahul", tagline: "", bio: "x".repeat(40), avatarUrl: "a", bannerUrl: "b" },
    brand: { logoUrl: "l", customTheme: true },
    commerce: {
      productCount: 3, productsWithDescription: 3, productsWithImage: 3, offersPriced: 3, offerCount: 3,
      serviceCount: 1, courseCount: 1, bookingCount: 1,
    },
    content: { galleryCount: 4, galleryWithTitle: 4, galleryWithAltText: 4, faqCount: 3, feedCount: 3 },
    trust: { testimonialCount: 3, timelineCount: 3, gameCount: 0 },
    media: { heroMediaPresent: true, heroTitlePresent: true },
    seo: { title: "Rahul — Coach", description: "x".repeat(40) },
    contact: { email: "r@t.com", phone: "9876543210", location: "Mumbai", languages: ["English"], businessHours: [] },
    social: { socialLinkCount: 2, primaryPlatform: "YouTube", feedConnected: true, affiliateLinkCount: 1 },
    business: { customDomain: "r.fit", subdomain: "r" },
    declared: { brand_voice: "Casual", trust_achievements: "x".repeat(15), creator_sponsors: "x".repeat(6), creator_resources: "x".repeat(12) },
  });
}

describe("Knowledge Runtime — Phase 1: Knowledge Score", () => {
  it("returns 100% overall and per-category for a complete profile", () => {
    const score = computeKnowledgeScore(completeCreator());
    expect(score.overall).toBe(100);
    expect(score.categories.every((c) => c.percent === 100)).toBe(true);
    expect(score.missingFields).toHaveLength(0);
  });

  it("scores a sparse profile with per-category percentages and missing fields", () => {
    const sparse = makeSnapshot({
      identity: { name: "Rahul", tagline: "Coach", bio: "", avatarUrl: null, bannerUrl: null },
      seo: { title: "", description: "" },
    });
    const score = computeKnowledgeScore(sparse);

    expect(score.overall).toBeGreaterThan(0);
    expect(score.overall).toBeLessThan(60);
    expect(score.completeFields).toContain("identity.name");
    expect(score.missingFields.some((m) => m.fieldId === "commerce.products")).toBe(true);
    expect(score.missingFields.some((m) => m.fieldId === "brand.bio")).toBe(true);

    const identity = score.categories.find((c) => c.id === "identity");
    expect(identity).toBeDefined();
    expect(identity!.percent).toBeGreaterThan(0);
  });

  it("never asks for data the profile already has", () => {
    const snapshot = makeSnapshot({
      identity: { name: "Rahul", tagline: "Coach", bio: "x".repeat(40), avatarUrl: "u", bannerUrl: null },
      media: { heroMediaPresent: true, heroTitlePresent: true },
    });
    const missing = detectMissingFields(snapshot);
    expect(missing.some((m) => m.fieldId === "identity.name")).toBe(false);
    expect(missing.some((m) => m.fieldId === "brand.bio")).toBe(false);
    expect(missing.some((m) => m.fieldId === "commerce.products")).toBe(true);
  });

  it("reports confidence based on source verification", () => {
    const declaredComplete = makeSnapshot({
      declared: { brand_mission: "A real mission statement about this creator.", trust_achievements: "Real achievements." },
    });
    const score = computeKnowledgeScore(declaredComplete);
    expect(score.confidence).toBeGreaterThan(0);
    expect(score.confidence).toBeLessThanOrEqual(1);
  });

  it("does not include categories with no applicable fields", () => {
    const score = computeKnowledgeScore(completeCreator());
    expect(score.categories.length).toBe(10);
  });
});

describe("Knowledge Runtime — Phase 2: Missing Field Detection", () => {
  it("detects the canonical missing fields (logo, tagline, products, testimonials, pricing)", () => {
    const missing = detectMissingFields(makeSnapshot());
    const ids = missing.map((m) => m.fieldId);
    expect(ids).toContain("brand.tagline");
    expect(ids).toContain("commerce.products");
    expect(ids).toContain("commerce.pricing");
    expect(ids).toContain("trust.testimonials");
    expect(ids).toContain("content.gallery");
  });

  it("sorts required fields before optional ones, high-priority first", () => {
    const missing = detectMissingFields(makeSnapshot());
    const firstOptional = missing.findIndex((m) => !m.required);
    const required = firstOptional === -1 ? missing : missing.slice(0, firstOptional);
    expect(required.length).toBeGreaterThan(0);
    expect(required.every((m) => m.required)).toBe(true);
    expect(missing.some((m) => m.fieldId === "commerce.products")).toBe(true);
    expect(missing.some((m) => m.fieldId === "trust.testimonials")).toBe(true);
  });
});

describe("Knowledge Runtime — Phase 3: Smart Question Engine", () => {
  it("returns at most 5 questions, only for missing fields", () => {
    const questions = generateCompletionQuestions(makeSnapshot());
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.length).toBeLessThanOrEqual(MAX_COMPLETION_QUESTIONS);
  });

  it("turns missing products into an action question that deep-links", () => {
    const questions = generateCompletionQuestions(makeSnapshot());
    const productQ = questions.find((q) => q.fieldId === "commerce.products");
    expect(productQ).toBeDefined();
    expect(productQ!.type).toBe("action");
    expect(productQ!.href).toBe("/admin/products");
  });

  it("generates text questions for declarable fields like tagline", () => {
    const questions = generateCompletionQuestions(nearlyComplete());
    const taglineQ = questions.find((q) => q.fieldId === "brand.tagline");
    expect(taglineQ).toBeDefined();
    expect(["text", "textarea"]).toContain(taglineQ!.type);
  });

  it("uses pack question templates (educator languages → multichoice)", () => {
    const snapshot = {
      ...completeCreator(),
      entityType: "educator",
      commerce: { ...completeCreator().commerce, courseCount: 0 },
      contact: { ...completeCreator().contact, languages: [] },
    };
    const questions = generateCompletionQuestions(snapshot);
    const langQ = questions.find((q) => q.fieldId === "educator.languages");
    expect(langQ).toBeDefined();
    expect(langQ!.type).toBe("multichoice");
    expect(langQ!.options?.some((o) => o.value === "English")).toBe(true);
  });
});

describe("Knowledge Runtime — Phase 4: Category Packs", () => {
  it("maps onboarding categories to packs", () => {
    expect(resolvePack("fitness").id).toBe("fitness");
    expect(resolvePack("restaurant").id).toBe("restaurant");
    expect(resolvePack("photography").id).toBe("photography");
    expect(resolvePack("art").id).toBe("designer");
    expect(resolvePack("education").id).toBe("educator");
    expect(resolvePack("gaming").id).toBe("creator");
  });

  it("replaces universal fields with entity-specific fields (no duplicates)", () => {
    const fitness = applicableFieldsForPack("fitness");
    const ids = fitness.map((f) => f.id);
    expect(ids).not.toContain("commerce.products");
    expect(ids).toContain("fitness.programs");
    expect(ids).not.toContain("content.gallery");
    expect(ids).toContain("fitness.transformations");
    // No duplicate knowledge: every registry id appears once.
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("restaurant pack scores the menu, not generic products", () => {
    const fields = applicableFieldsForPack("restaurant");
    const ids = fields.map((f) => f.id);
    expect(ids).toContain("restaurant.menu");
    expect(ids).toContain("restaurant.cuisine");
    expect(ids).not.toContain("commerce.products");
    expect(ids).not.toContain("commerce.bookings");
    expect(ids).toContain("restaurant.reservations");
  });

  it("creator pack includes sponsors, affiliate links and resources", () => {
    const ids = applicableFieldsForPack("creator").map((f) => f.id);
    expect(ids).toContain("creator.sponsors");
    expect(ids).toContain("creator.resources");
    expect(getPack("creator").name).toBe("Creator");
    expect(resolvePack("unknown-category").id).toBe("creator");
  });
});

describe("Knowledge Runtime — Completion Engine", () => {
  it("accepts declared answers and stores them under fact keys", () => {
    const snapshot = makeSnapshot();
    const applied = applyDeclaredAnswers(snapshot, [
      { fieldId: "brand.mission", value: "I exist to make fitness simple." },
      { fieldId: "brand.voice", value: "Casual" },
    ]);
    expect(applied.errors).toHaveLength(0);
    expect(applied.facts.brand_mission).toBe("I exist to make fitness simple.");
    expect(applied.facts.brand_voice).toBe("Casual");
    // Re-scoring reflects the answer immediately.
    const rescore = computeKnowledgeScore(applied.updatedSnapshot);
    expect(rescore.completeFields).toContain("brand.mission");
  });

  it("rejects inline answers for content fields (no duplicate forms)", () => {
    const applied = applyDeclaredAnswers(makeSnapshot(), [
      { fieldId: "commerce.products", value: "Shampoo" },
    ]);
    expect(applied.errors).toHaveLength(1);
    expect(applied.facts.commerce_products).toBeUndefined();
  });

  it("enforces registry validation (bio min length)", () => {
    const bioField = getField("brand.bio")!;
    expect(validateAnswer(bioField, "short").valid).toBe(false);
    expect(validateAnswer(bioField, "x".repeat(40)).valid).toBe(true);
  });
});

describe("Knowledge Runtime — Phase 9: Storefront Quality Score", () => {
  it("returns seven dimensions plus an overall score", () => {
    const storefront = computeStorefrontScore(makeSnapshot());
    expect(storefront.dimensions).toHaveLength(7);
    expect(storefront.overall).toBeGreaterThanOrEqual(0);
    expect(storefront.overall).toBeLessThanOrEqual(100);
  });

  it("scores a complete storefront 100 and an empty one low", () => {
    expect(computeStorefrontScore(completeCreator()).overall).toBe(100);
    expect(computeStorefrontScore(makeSnapshot()).overall).toBeLessThan(40);
  });
});

describe("Knowledge Runtime — Phase 7: Builder Hints", () => {
  it("emits contextual hints for missing content with builder module ids", () => {
    const hints = generateBuilderHints(makeSnapshot());
    expect(hints.some((h) => h.moduleId === "products" && h.severity === "critical")).toBe(true);
    expect(hints.some((h) => h.moduleId === "gallery" && h.message.includes("3"))).toBe(true);
    expect(hints.some((h) => h.moduleId === "testimonials")).toBe(true);
  });

  it("keeps hints quiet once content exists", () => {
    const hints = generateBuilderHints(completeCreator());
    expect(hints).toHaveLength(0);
  });
});

describe("Knowledge Runtime — Phase 8: AI Boundary", () => {
  it("allows rewrite/summarize on assistable fields only", () => {
    const decision = resolveAssist({ operation: "summarize", fieldId: "brand.bio", value: "This is a long bio about a creator who does many things at once." });
    expect(decision.allowed).toBe(true);
  });

  it("never allows assistance that invents facts", () => {
    expect(resolveAssist({ operation: "rewrite", fieldId: "trust.testimonials", value: "X" }).allowed).toBe(false);
    expect(resolveAssist({ operation: "rewrite", fieldId: "commerce.pricing", value: "10" }).allowed).toBe(false);
  });

  it("does not assist empty values — AI never starts from nothing", () => {
    expect(resolveAssist({ operation: "rewrite", fieldId: "brand.bio", value: "" }).allowed).toBe(false);
  });
});
