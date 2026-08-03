import { describe, it, expect } from "vitest";
import { KnowledgeBuilder } from "@/lib/generation/intelligence/knowledge-builder";
import { PersonaEngine } from "@/lib/generation/persona";
import { goldenDataset } from "@/lib/generation/golden/registry";
import type { GoldenCreatorEntry } from "@/lib/generation/golden/types";
import { hybridIntelligenceEngine } from "@/lib/generation/intelligence/enrichment/engine";
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
});

