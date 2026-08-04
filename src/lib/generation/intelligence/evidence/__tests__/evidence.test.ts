import { describe, it, expect } from "vitest";
import { buildEvidenceIntelligence, detectEntities, detectNiches, detectBusinessModels, detectAudience, mergeAI } from "@/lib/generation/intelligence/evidence/detect";
import type { EvidenceIntelligenceInput } from "@/lib/generation/intelligence/evidence/types";

function input(bio: string, overrides: Partial<EvidenceIntelligenceInput> = {}): EvidenceIntelligenceInput {
  return {
    sourceText: bio,
    sourceContentTexts: [],
    followers: 0,
    acquisitionCompleteness: 0.8,
    graphNiche: null,
    graphConfidence: 0.5,
    aiEntity: null,
    aiNiches: [],
    aiBusinessModel: null,
    aiUsed: false,
    ...overrides,
  };
}

describe("entity detection — evidence-backed", () => {
  it("detects an athlete with strong football evidence (Ronaldo)", () => {
    const intel = buildEvidenceIntelligence(
      input("Professional footballer. FIFA World Cup, Champions League with Real Madrid. Forward for Portugal."),
    );
    expect(intel.primaryEntity).toBe("athlete");
    const athlete = intel.entities.find((e) => e.entity === "athlete");
    expect(athlete).toBeTruthy();
    expect(athlete!.confidence).toBeGreaterThan(0.6);
    // Every conclusion has evidence.
    expect(athlete!.evidence.length).toBeGreaterThan(0);
    expect(athlete!.evidence.some((e) => e.value === "fifa" || e.value === "football")).toBe(true);
    expect(intel.confidence.overall).toBeGreaterThan(0.5);
  });

  it("detects a restaurant (menu/reservation)", () => {
    const intel = buildEvidenceIntelligence(input("Fresh seafood restaurant. Book a table, view our menu and reserve for dinner."));
    expect(intel.primaryEntity).toBe("restaurant");
    expect(intel.entities[0]!.evidence.some((e) => e.value === "restaurant" || e.value === "menu")).toBe(true);
  });

  it("detects a developer (github/programming)", () => {
    const intel = buildEvidenceIntelligence(input("Fullstack developer. Open source on GitHub, React and TypeScript. SaaS products."));
    expect(intel.primaryEntity).toBe("developer");
    expect(intel.entities[0]!.evidence.some((e) => e.value === "github" || e.value === "developer")).toBe(true);
  });

  it("detects a doctor from medical signals", () => {
    const intel = buildEvidenceIntelligence(input("Physician at a clinic. Healthcare advice for patients."));
    expect(intel.primaryEntity).toBe("doctor");
  });

  it("never assumes Creator when evidence points elsewhere", () => {
    const intel = buildEvidenceIntelligence(input("Lawyer at a law firm handling litigation and legal counsel."));
    expect(intel.primaryEntity).toBe("lawyer");
    expect(intel.primaryEntity).not.toBe("creator");
  });
});

describe("niche detection — multi, weighted", () => {
  it("detects multiple niches with the strongest first", () => {
    const intel = buildEvidenceIntelligence(input("Day trading forex and stock market signals for crypto investors."));
    const niches = intel.niches.map((n) => n.niche);
    expect(niches).toContain("finance");
    expect(niches).toContain("crypto");
    expect(intel.niches.length).toBeGreaterThanOrEqual(2);
    expect(intel.niches[0]!.weight).toBeGreaterThanOrEqual(intel.niches[1]!.weight);
    expect(intel.niches[0]!.evidence.length).toBeGreaterThan(0);
  });

  it("detects developer niches (programming/web/ai)", () => {
    const intel = buildEvidenceIntelligence(input("Programming with React, TypeScript and machine learning models."));
    expect(intel.niches.some((n) => n.niche === "programming")).toBe(true);
    expect(intel.niches.some((n) => n.niche === "web_development")).toBe(true);
    expect(intel.niches.some((n) => n.niche === "ai")).toBe(true);
  });
});

describe("business model detection", () => {
  it("detects courses/education and consulting with evidence", () => {
    const intel = buildEvidenceIntelligence(input("Enroll in my course. Book a consulting call and join the community."));
    const models = intel.businessModels.map((b) => b.model);
    expect(models).toContain("courses");
    expect(models).toContain("consulting");
    expect(intel.businessModels[0]!.evidence.length).toBeGreaterThan(0);
  });

  it("detects products/shop for a store", () => {
    const intel = buildEvidenceIntelligence(input("Shop our merch and products. Buy now."));
    expect(intel.businessModels.some((b) => b.model === "products")).toBe(true);
  });
});

describe("audience detection", () => {
  it("detects developer audience for a coding creator", () => {
    const intel = buildEvidenceIntelligence(input("Tutorials for developers and programmers."));
    expect(intel.audience.segments.some((a) => a.segment === "developers")).toBe(true);
    expect(intel.audience.segments[0]!.evidence.length).toBeGreaterThan(0);
  });

  it("detects student audience for a teacher", () => {
    const intel = buildEvidenceIntelligence(input("Lessons for students preparing for exams and studying."));
    expect(intel.audience.segments.some((a) => a.segment === "students")).toBe(true);
  });
});

describe("recommendations — config-driven, never random", () => {
  it("recommends a sports storefront for an athlete", () => {
    const intel = buildEvidenceIntelligence(input("Football athlete. FIFA, Champions League. Shop my merch."));
    expect(intel.recommendations.theme).toBeTruthy();
    expect(intel.recommendations.sections).toContain("products");
    expect(intel.recommendations.cta).toBeTruthy();
    expect(intel.recommendations.seoKeywords.length).toBeGreaterThan(0);
  });

  it("recommends menu/reservations for a restaurant", () => {
    const intel = buildEvidenceIntelligence(input("Restaurant with a menu and table reservations."));
    expect(intel.recommendations.sections).toContain("menu");
    expect(intel.recommendations.sections).toContain("reservations");
    expect(intel.recommendations.cta).toBe("Book a table");
  });
});

describe("confidence — composable and explained", () => {
  it("produces a breakdown with per-source scores", () => {
    const intel = buildEvidenceIntelligence(input("Football athlete. FIFA. Real Madrid forward."));
    expect(intel.confidence.breakdown).toContainEqual(expect.objectContaining({ key: "entity" }));
    expect(intel.confidence.breakdown).toContainEqual(expect.objectContaining({ key: "acquisition" }));
    expect(intel.confidence.overall).toBeGreaterThan(0);
    expect(intel.confidence.overall).toBeLessThanOrEqual(1);
  });

  it("AI reinforcement raises entity confidence without extra calls", () => {
    const base = buildEvidenceIntelligence(input("Football player."));
    const withAi = buildEvidenceIntelligence(input("Football player.", { aiEntity: "athlete", aiUsed: true }));
    const baseAthlete = base.entities.find((e) => e.entity === "athlete");
    const aiAthlete = withAi.entities.find((e) => e.entity === "athlete");
    expect(aiAthlete!.aiReinforced).toBe(true);
    expect(aiAthlete!.confidence).toBeGreaterThanOrEqual(baseAthlete!.confidence);
    expect(withAi.diagnostics.aiUsed).toBe(true);
  });
});

describe("mergeAI — hybrid output reinforcement", () => {
  it("adds AI entity when deterministic missed it", () => {
    const entities = detectEntities(input("Random bio with no strong entity signals."));
    const { entities: merged } = mergeAI(
      input("x", { aiEntity: "podcast" }),
      entities,
      detectNiches(input("x")),
      detectBusinessModels(input("x")),
    );
    expect(merged.some((e) => e.entity === "podcast" && e.aiReinforced)).toBe(true);
  });
});

describe("golden regression targets (Ronaldo/MrBeast/Restaurant/Developer)", () => {
  it("Ronaldo → athlete / sports / global / high confidence with evidence", () => {
    const intel = buildEvidenceIntelligence(
      input("Professional footballer. FIFA, UEFA, Champions League with Real Madrid. Forward for Portugal. Global audience."),
    );
    expect(intel.primaryEntity).toBe("athlete");
    expect(intel.primaryNiche).toBe("sports");
    expect(intel.confidence.entity).toBeGreaterThan(0.7);
    expect(intel.diagnostics.evidenceCount).toBeGreaterThan(0);
  });

  it("MrBeast → creator with entertainment + business niches", () => {
    const intel = buildEvidenceIntelligence(
      input("Content creator. Philanthropy and challenge videos. Brand deals and partnerships.", {
        aiNiches: ["entertainment"],
        graphNiche: "finance",
      }),
    );
    expect(intel.entities.some((e) => e.entity === "creator")).toBe(true);
    expect(intel.niches.some((n) => n.niche === "entertainment")).toBe(true);
    expect(intel.businessModels.some((b) => b.model === "sponsorship")).toBe(true);
  });
});
