import { describe, it, expect } from "vitest";
import { KnowledgeBuilder } from "@/lib/generation/intelligence/knowledge-builder";
import { PersonaEngine } from "@/lib/generation/persona";
import { goldenDataset } from "@/lib/generation/golden/registry";
import type { GoldenCreatorEntry } from "@/lib/generation/golden/types";
import { hybridIntelligenceEngine } from "@/lib/generation/intelligence/enrichment/engine";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildRelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import { buildWebsiteBlueprint } from "@/lib/generation/blueprint/builder";
import { composeStorefront } from "@/lib/generation/intelligence/composition/engine";
import { componentRegistry } from "@/lib/registry/components";
import type { ContentSource } from "@/lib/generation/intelligence/types";
import type { EnrichmentCall } from "@/lib/generation/intelligence/enrichment/provider";

const kb = new KnowledgeBuilder();
const personaEngine = new PersonaEngine();

/** Representative rich source for a golden entry (controlled regression input). */
function sourceFor(entry: GoldenCreatorEntry): ContentSource {
  const niche = entry.expectedPrimaryNiche ?? entry.tags[0] ?? "creator";
  const followers = entry.expectedCreatorStage === "celebrity" ? 600_000_000 : 120_000;
  return {
    platform: entry.platform === "youtube" ? "youtube" : "instagram",
    username: entry.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
    displayName: entry.name,
    bio: `${niche} ${entry.name} content and updates. #${niche} #creator`,
    avatarUrl: "https://img/a.jpg",
    followers,
    following: 0,
    posts: 0,
    engagement: 0,
    content: [],
    categories: [niche],
    links: [entry.url],
    keywords: [niche],
    hashtags: [niche],
    languages: ["english"],
  };
}

/** Mock AI enrichment that returns the golden target for the entry. */
function executorFor(entry: GoldenCreatorEntry): () => Promise<EnrichmentCall> {
  return async () =>
    ({
      ok: true,
      provider: "deepseek",
      model: "deepseek-chat",
      content: JSON.stringify({
        entityType: entry.expectedEntityType ?? null,
        primaryNiche: entry.expectedPrimaryNiche ?? null,
        confidenceAdjustment: 0.8,
      }),
      latencyMs: 100,
      cost: 0.0004,
      cacheHit: false,
      error: null,
    }) as EnrichmentCall;
}

describe("golden dataset â€” expanded regression anchors (IMPLEMENTATION-32)", () => {
  const enriched = goldenDataset.listAll().filter((e) => e.expectedEntityType && e.expectedPrimaryNiche);

  it("has the expected representative entries", () => {
    const names = goldenDataset.listAll().map((e) => e.name);
    for (const n of ["Cristiano Ronaldo", "MrBeast", "Fireship", "Nike", "Apple", "Khan Academy", "SeaShell Restaurant", "Jane Photography", "Fit Coach Alex", "Creatosa Agency"]) {
      expect(names).toContain(n);
    }
    expect(enriched.length).toBeGreaterThanOrEqual(10);
  });

  it("rich sources never collapse to the default_creator fallback", async () => {
    for (const entry of enriched) {
      const graph = kb.build(sourceFor(entry));
      const match = personaEngine.detect(graph);
      // A rich source must not degrade to the fallback persona (the AUDIT-01
      // regression the acquisition + enrichment layers fix).
      if (entry.expectedPersonaId !== "default_creator") {
        expect(match.persona.id, entry.name).not.toBe("default_creator");
      }
    }
  });

  it("reproduces the enriched entityType (AI fills; deterministic preserved)", async () => {
    for (const entry of enriched) {
      const src = sourceFor(entry);
      const graph = kb.build(src);
      const match = personaEngine.detect(graph);
      const profile = await hybridIntelligenceEngine.enrich(
        {
          source: src,
          graphConfidence: graph.confidence,
          persona: { id: match.persona.id, name: match.persona.name },
          personaScore: match.score,
          primaryNiche: graph.creator.niche || null,
          acquisition: null,
        },
        { forceAi: true, aiExecutor: executorFor(entry) },
      );
      expect(profile.entityType, entry.name).toBe(entry.expectedEntityType);
      if (entry.expectedPersonaId !== "default_creator") {
        expect(profile.persona?.id, entry.name).not.toBe("default_creator");
      }
    }
  });

  it("resolves the Ronaldo regression: not default Creator / not low confidence", async () => {
    const entry = goldenDataset.getCreator("golden-athlete-001")!;
    const src = sourceFor(entry);
    const graph = kb.build(src);
    const match = personaEngine.detect(graph);
    const profile = await hybridIntelligenceEngine.enrich(
      {
        source: src,
        graphConfidence: graph.confidence,
        persona: { id: match.persona.id, name: match.persona.name },
        personaScore: match.score,
        primaryNiche: graph.creator.niche || null,
        acquisition: null,
      },
      { forceAi: true, aiExecutor: executorFor(entry) },
    );
    expect(profile.persona?.id).not.toBe("default_creator");
    expect(profile.entityType).toBe("athlete");
    expect(profile.primaryNiche).toBe("sports");
    expect(profile.confidence).toBeGreaterThan(0.5);
  });

  it("evidence intelligence meets the golden expectations (entity/niches/audience/confidence)", async () => {
    const evidenceEntries = goldenDataset
      .listAll()
      .filter((e) => e.expectedEntityType && e.expectedNiches && e.minimumConfidence);
    expect(evidenceEntries.length).toBeGreaterThanOrEqual(35);

    for (const entry of evidenceEntries) {
      const expectedNiches = entry.expectedNiches ?? [];
      // Build an evidence source from the entry's real signals (name + tags + niche).
      const bio = `${entry.name} ${entry.tags.join(" ")} ${entry.expectedPrimaryNiche ?? ""} content and updates.`.trim();
      const intel = buildEvidenceIntelligence({
        sourceText: bio,
        sourceContentTexts: [],
        followers: 100000,
        acquisitionCompleteness: 0.9,
        graphNiche: entry.expectedPrimaryNiche ?? null,
        graphConfidence: 0.6,
        aiEntity: entry.expectedEntityType,
        aiNiches: expectedNiches,
        aiBusinessModel: entry.expectedBusinessModel,
        aiUsed: false,
      });

      // Primary entity matches the golden expectation (or is reinforced by AI).
      const primaryMatches =
        intel.primaryEntity === entry.expectedEntityType ||
        (intel.entities.find((e) => e.entity === entry.expectedEntityType)?.aiReinforced ?? false);
      expect(primaryMatches, entry.name).toBe(true);

      // Every expected niche is detected (deterministic or AI).
      for (const niche of expectedNiches) {
        expect(intel.niches.some((n) => n.niche === niche), `${entry.name}: ${niche}`).toBe(true);
      }

      // Minimum confidence is met and every conclusion has evidence.
      expect(intel.confidence.overall, entry.name).toBeGreaterThanOrEqual(entry.minimumConfidence!);
      expect(intel.diagnostics.evidenceCount, entry.name).toBeGreaterThan(0);
    }
  });

  it("website blueprint is deterministic, serializable and entity-driven (all profiles)", async () => {
    const entries = goldenDataset.listAll().filter((e) => e.expectedEntityType);
    for (const entry of entries) {
      const bio = `${entry.name} ${entry.tags.join(" ")} ${entry.expectedPrimaryNiche ?? ""} content and updates.`.trim();
      const evidence = buildEvidenceIntelligence({
        sourceText: bio,
        sourceContentTexts: [],
        followers: 100000,
        acquisitionCompleteness: 0.9,
        graphNiche: entry.expectedPrimaryNiche ?? null,
        graphConfidence: 0.6,
        aiEntity: entry.expectedEntityType,
        aiNiches: entry.expectedNiches ?? [],
        aiBusinessModel: entry.expectedBusinessModel,
        aiUsed: false,
      });
      const relationships = buildRelationshipGraph(bio);
      const input = {
        evidence,
        relationships,
        identity: { entityType: entry.expectedEntityType ?? null, primaryNiche: entry.expectedPrimaryNiche ?? null, businessModel: null, audience: [], name: entry.name, username: "x", subdomain: "x" },
      };
      const blueprint = buildWebsiteBlueprint(input);
      const again = buildWebsiteBlueprint(input);

      // Deterministic + versioned + serializable.
      expect(JSON.stringify(blueprint)).toBe(JSON.stringify(again));
      expect(blueprint.version).toBeGreaterThanOrEqual(1);
      expect(JSON.parse(JSON.stringify(blueprint)).sections.length).toBe(blueprint.sections.length);
      // Navigation derives from visible sections.
      expect(blueprint.navigation.length).toBeGreaterThan(0);
      expect(blueprint.visibleSections.length).toBeGreaterThan(0);
      expect(blueprint.entity).toBe(entry.expectedEntityType);
    }
  });

  it("blueprint matches the golden expectations for representative profiles", async () => {
    const byName = (n: string) => goldenDataset.listAll().find((e) => e.name === n)!;
    const cases = [
      { entry: byName("Lionel Messi"), bio: "Football athlete. FIFA, Champions League with Real Madrid. Nike partner.", expected: { layout: "portfolio", theme: "bold-sport", cta: "Shop Merch", seo: "Person", sections: ["hero", "achievements", "sponsors"], integrations: ["youtube"], brands: ["Nike"] } },
      { entry: byName("Pizza Napoletana"), bio: "Restaurant with a menu and table reservations. Local dining.", expected: { layout: "restaurant", theme: "warm-dining", cta: "Reserve Table", seo: "Restaurant", sections: ["hero", "menu", "reservations"], integrations: ["google_maps"] } },
      { entry: byName("Theo (t3.gg)"), bio: "Fullstack developer. GitHub and open source. TypeScript and React.", expected: { layout: "portfolio", theme: "dark-tech", cta: "View My Work", seo: "Person", sections: ["hero", "projects", "skills", "experience", "github"], integrations: ["github"] } },
      { entry: byName("Trainer Riya"), bio: "Fitness coach. Programs, transformations and nutrition coaching.", expected: { layout: "landing", theme: "energetic-coach", cta: "Book Session", seo: "Person", sections: ["hero", "programs", "pricing", "transformations", "booking"], integrations: ["instagram"] } },
    ];
    for (const { entry, bio, expected } of cases) {
      const evidence = buildEvidenceIntelligence({ sourceText: bio, sourceContentTexts: [], followers: 100000, acquisitionCompleteness: 0.9, graphNiche: entry.expectedPrimaryNiche ?? null, graphConfidence: 0.6, aiEntity: entry.expectedEntityType, aiNiches: entry.expectedNiches ?? [], aiBusinessModel: entry.expectedBusinessModel, aiUsed: false });
      const relationships = buildRelationshipGraph(bio);
      const blueprint = buildWebsiteBlueprint({ evidence, relationships, identity: { entityType: entry.expectedEntityType ?? null, primaryNiche: entry.expectedPrimaryNiche ?? null, businessModel: null, audience: [], name: entry.name, username: "x", subdomain: "x" } });
      expect(blueprint.entity, entry.name).toBe(entry.expectedEntityType);
      expect(blueprint.layout, entry.name).toBe(expected.layout);
      expect(blueprint.theme.family, entry.name).toBe(expected.theme);
      expect(blueprint.cta.primary, entry.name).toBe(expected.cta);
      expect(blueprint.seo.structuredDataType, entry.name).toBe(expected.seo);
      for (const section of expected.sections) {
        expect(blueprint.visibleSections, `${entry.name}: ${section}`).toContain(section);
      }
      for (const integration of expected.integrations) {
        expect(blueprint.integrations, `${entry.name}: ${integration}`).toContain(integration);
      }
      if (expected.brands) {
        for (const brand of expected.brands) expect(blueprint.evidence.brands, entry.name).toContain(brand);
      }
    }
  });

  it("blueprint → composition → builder aggregate is deterministic for all profiles", async () => {
    const entries = goldenDataset.listAll().filter((e) => e.expectedEntityType);
    for (const entry of entries) {
      const bio = `${entry.name} ${entry.tags.join(" ")} ${entry.expectedPrimaryNiche ?? ""} content and updates.`.trim();
      const evidence = buildEvidenceIntelligence({
        sourceText: bio,
        sourceContentTexts: [entry.platform],
        followers: 100000,
        acquisitionCompleteness: 0.9,
        graphNiche: entry.expectedPrimaryNiche ?? null,
        graphConfidence: 0.6,
        aiEntity: entry.expectedEntityType,
        aiNiches: entry.expectedNiches ?? [],
        aiBusinessModel: entry.expectedBusinessModel,
        aiUsed: false,
      });
      const relationships = buildRelationshipGraph(bio, [entry.platform]);
      const blueprint = buildWebsiteBlueprint({
        evidence,
        relationships,
        identity: { entityType: entry.expectedEntityType ?? null, primaryNiche: entry.expectedPrimaryNiche ?? null, businessModel: null, audience: [], name: entry.name, username: "x", subdomain: "x" },
      });
      const input = {
        blueprint,
        identity: { entityType: blueprint.entity, name: entry.name, username: "x", bio, tagline: null, avatarUrl: null, socialLinks: [entry.url], subdomain: "x" },
        evidence,
        relationships,
      };
      const composition = composeStorefront(input);
      const again = composeStorefront(input);

      // Deterministic + versioned + serializable.
      expect(composition.version).toBe(1);
      expect(composition.diagnostics.deterministicSignature).toBe(again.diagnostics.deterministicSignature);
      expect(JSON.stringify(composition)).toBe(JSON.stringify(again));

      // Builder pages exist and every visible section maps to a REGISTERED component.
      expect(composition.builder.pages.length).toBeGreaterThan(0);
      for (const page of composition.builder.pages) {
        for (const section of page.sections) {
          for (const slot of section.slots) {
            expect(componentRegistry.get(slot.moduleId), `${entry.name}: ${slot.moduleId}`).toBeTruthy();
          }
        }
      }
      // No visible blueprint section is left unmapped.
      expect(composition.diagnostics.unmappedSections).toEqual([]);
    }
  });
});

