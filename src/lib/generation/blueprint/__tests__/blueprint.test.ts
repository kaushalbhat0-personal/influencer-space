import { describe, it, expect } from "vitest";
import { buildRelationshipGraph, strongestReinforcedEntity } from "@/lib/generation/intelligence/evidence/relationship";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildWebsiteBlueprint } from "@/lib/generation/blueprint/builder";
import type { BlueprintInput } from "@/lib/generation/blueprint/builder";

function input(bio: string, overrides: Partial<BlueprintInput["identity"]> = {}): BlueprintInput {
  const evidence = buildEvidenceIntelligence({
    sourceText: bio,
    sourceContentTexts: [],
    followers: 0,
    acquisitionCompleteness: 0.9,
    graphNiche: null,
    graphConfidence: 0.5,
    aiEntity: null,
    aiNiches: [],
    aiBusinessModel: null,
    aiUsed: false,
  });
  return {
    evidence,
    relationships: buildRelationshipGraph(bio),
    identity: {
      entityType: null,
      primaryNiche: evidence.primaryNiche,
      businessModel: null,
      audience: [],
      name: "Test",
      username: "test",
      subdomain: "test",
      ...overrides,
    },
  };
}

describe("Relationship Intelligence — lightweight knowledge graph", () => {
  it("builds the FIFA → Football → Sports → Athlete chain", () => {
    const graph = buildRelationshipGraph("Professional footballer. FIFA World Cup with UEFA and Real Madrid.");
    expect(graph.chains).toContain("FIFA → Football → Sports → Athlete");
    expect(graph.reinforcedEntities.some((e) => e.entity === "athlete")).toBe(true);
    expect(strongestReinforcedEntity(graph)).toBe("athlete");
    expect(graph.evidenceCount).toBeGreaterThan(0);
  });

  it("detects brands and sponsorship signals (Nike)", () => {
    const graph = buildRelationshipGraph("Football athlete. Nike and Adidas sponsorship.");
    expect(graph.brands).toContain("Nike");
    expect(graph.brands).toContain("Adidas");
    expect(graph.chains.some((c) => c.includes("Sponsorship"))).toBe(true);
  });

  it("reinforces developer via GitHub", () => {
    const graph = buildRelationshipGraph("Open source developer. My GitHub profile.");
    expect(graph.platforms).toContain("github");
    expect(graph.reinforcedEntities.some((e) => e.entity === "developer")).toBe(true);
    expect(graph.chains.some((c) => c.includes("GitHub"))).toBe(true);
  });

  it("produces no nodes/edges for unrelated text (no invention)", () => {
    const graph = buildRelationshipGraph("Random everyday content about cooking.");
    expect(graph.nodes.length).toBe(0);
    expect(graph.chains.length).toBe(0);
    expect(graph.reinforcedEntities.length).toBe(0);
  });
});

describe("Website Blueprint — entity-driven storefront", () => {
  it("builds an athlete blueprint (bold-sport, sponsors, merch, Person SEO)", () => {
    const blueprint = buildWebsiteBlueprint(input("Football athlete. FIFA, Champions League with Real Madrid. Nike sponsor."));
    expect(blueprint.entity).toBe("athlete");
    expect(blueprint.layout).toBe("portfolio");
    expect(blueprint.theme.family).toBe("bold-sport");
    expect(blueprint.cta.primary).toBe("Shop Merch");
    expect(blueprint.seo.structuredDataType).toBe("Person");
    expect(blueprint.visibleSections).toContain("achievements");
    expect(blueprint.visibleSections).toContain("sponsors");
    expect(blueprint.visibleSections).not.toContain("courses"); // hidden for athletes
    expect(blueprint.evidence.brands).toContain("Nike");
    expect(blueprint.integrations).toContain("youtube");
  });

  it("builds a restaurant blueprint (menu/reservations, Restaurant SEO)", () => {
    const blueprint = buildWebsiteBlueprint(input("Restaurant with a menu, table reservations and local dining."));
    expect(blueprint.entity).toBe("restaurant");
    expect(blueprint.theme.family).toBe("warm-dining");
    expect(blueprint.cta.primary).toBe("Reserve Table");
    expect(blueprint.seo.structuredDataType).toBe("Restaurant");
    expect(blueprint.visibleSections).toContain("menu");
    expect(blueprint.visibleSections).toContain("reservations");
    expect(blueprint.visibleSections).not.toContain("games");
    expect(blueprint.analytics).toContain("reservation");
  });

  it("builds a developer blueprint (projects/github, dark-tech)", () => {
    const blueprint = buildWebsiteBlueprint(input("Fullstack developer. GitHub and open source. TypeScript."));
    expect(blueprint.entity).toBe("developer");
    expect(blueprint.theme.family).toBe("dark-tech");
    expect(blueprint.cta.primary).toBe("View My Work");
    expect(blueprint.visibleSections).toContain("github");
    expect(blueprint.visibleSections).toContain("projects");
    expect(blueprint.integrations).toContain("github");
    expect(blueprint.monetization).toContain("software");
  });

  it("builds an educator/teacher blueprint (courses, academic, Course SEO)", () => {
    const blueprint = buildWebsiteBlueprint(input("Educator teaching courses with a community newsletter."));
    expect(["educator", "teacher"]).toContain(blueprint.entity);
    expect(blueprint.theme.family).toBe("academic");
    expect(blueprint.cta.primary).toBeTruthy();
    expect(blueprint.visibleSections).toContain("courses");
    expect(blueprint.seo.structuredDataType).toBe("Course");
    expect(blueprint.monetization).toContain("courses");
  });

  it("builds a fitness blueprint (programs/pricing/booking)", () => {
    const blueprint = buildWebsiteBlueprint(input("Fitness coach. Programs, pricing and nutrition coaching."));
    expect(blueprint.entity).toBe("fitness");
    expect(blueprint.theme.family).toBe("energetic-coach");
    expect(blueprint.cta.primary).toBe("Book Session");
    expect(blueprint.visibleSections).toContain("programs");
    expect(blueprint.visibleSections).toContain("pricing");
    expect(blueprint.visibleSections).toContain("booking");
    expect(blueprint.integrations).toContain("calendly");
  });

  it("promotes hidden sections when the business model justifies them", () => {
    // A creator whose evidence shows courses → courses becomes optional.
    const blueprint = buildWebsiteBlueprint(
      input("Content creator selling an online course with enroll links.", {
        businessModel: "courses",
      }),
    );
    const courses = blueprint.sections.find((s) => s.id === "courses");
    expect(courses).toBeTruthy();
    expect(courses!.decision).not.toBe("hidden");
  });

  it("derives navigation only from visible sections", () => {
    const blueprint = buildWebsiteBlueprint(input("Restaurant menu and reservations."));
    for (const nav of blueprint.navigation) {
      expect(blueprint.visibleSections).toContain(nav.id);
    }
    expect(blueprint.navigation.length).toBeLessThanOrEqual(6);
  });

  it("is deterministic, serializable and versioned", () => {
    const a = buildWebsiteBlueprint(input("Football athlete. FIFA."));
    const b = buildWebsiteBlueprint(input("Football athlete. FIFA."));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.version).toBe(1);
    expect(JSON.parse(JSON.stringify(a)).entity).toBe("athlete");
    expect(a.diagnostics.sectionCount).toBe(a.sections.length);
    expect(a.diagnostics.visibleCount).toBe(a.visibleSections.length);
  });

  it("produces a canonical publishing title from the SEO strategy", () => {
    const blueprint = buildWebsiteBlueprint(input("Football athlete. FIFA.", { name: "Cristiano", subdomain: "cristiano" }));
    expect(blueprint.publishing.title).toContain("Cristiano");
    expect(blueprint.publishing.subdomain).toBe("cristiano");
  });
});
