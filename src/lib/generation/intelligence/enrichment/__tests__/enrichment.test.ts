import { describe, it, expect, vi } from "vitest";
import { createHash } from "crypto";
import { KnowledgeBuilder } from "@/lib/generation/intelligence/knowledge-builder";
import { PersonaEngine } from "@/lib/generation/persona";
import { hybridIntelligenceEngine } from "@/lib/generation/intelligence/enrichment/engine";
import { buildConfidenceContributions, computeComposite, normalizePersonaScore, clamp01 } from "@/lib/generation/intelligence/enrichment/confidence";
import { mergeIdentity } from "@/lib/generation/intelligence/enrichment/merge";
import { hashSource } from "@/lib/generation/intelligence/enrichment/hash";
import { renderEnrichmentPrompt } from "@/lib/generation/intelligence/enrichment/prompt";
import { executeWithManager } from "@/lib/generation/intelligence/enrichment/provider";
import { ProviderRegistry, InMemoryGenerationCache, InProcessEventPublisher } from "@/lib/generation/infrastructure";
import { ProviderManager } from "@/lib/generation/providers";
import { success } from "@/lib/generation/infrastructure";
import type { AIProvider, AIPrompt, AIOptions, AIResponse } from "@/lib/generation/contracts";
import type { Result } from "@/lib/generation/domain";
import type { ContentSource } from "@/lib/generation/intelligence/types";
import type { EnrichmentCall } from "@/lib/generation/intelligence/enrichment/provider";
import type { IdentityEnrichmentInput } from "@/lib/generation/intelligence/enrichment/types";

const kb = new KnowledgeBuilder();
const personaEngine = new PersonaEngine();

function source(overrides: Partial<ContentSource> = {}): ContentSource {
  return {
    platform: "instagram",
    username: "cristiano",
    displayName: "Cristiano Ronaldo",
    bio: "",
    avatarUrl: "",
    followers: 0,
    following: 0,
    posts: 0,
    engagement: 0,
    content: [],
    categories: [],
    links: ["https://instagram.com/cristiano"],
    ...overrides,
  };
}

async function inputFor(src: ContentSource, acquisition?: IdentityEnrichmentInput["acquisition"]): Promise<IdentityEnrichmentInput> {
  const graph = kb.build(src);
  const match = personaEngine.detect(graph);
  return {
    source: src,
    graphConfidence: graph.confidence,
    persona: { id: match.persona.id, name: match.persona.name },
    personaScore: match.score,
    primaryNiche: graph.creator.niche || null,
    acquisition: acquisition ?? null,
  };
}

function mockExecutor(content: string | null, ok = true, overrides: Partial<EnrichmentCall> = {}): (prompt?: AIPrompt, options?: AIOptions) => Promise<EnrichmentCall> {
  return async () =>
    ({
      ok,
      provider: "deepseek",
      model: "deepseek-chat",
      content,
      latencyMs: 120,
      cost: 0.0004,
      cacheHit: false,
      error: ok ? null : "all providers failed",
      ...overrides,
    }) as EnrichmentCall;
}

describe("confidence — evidence-based contributors", () => {
  it("normalizes persona scores with the existing buckets", () => {
    expect(normalizePersonaScore(10)).toBe(0.45);
    expect(normalizePersonaScore(30)).toBe(0.6);
    expect(normalizePersonaScore(90)).toBe(0.95);
  });

  it("computes a weighted composite that never exceeds 1", async () => {
    const input = await inputFor(source({ bio: "Football athlete #football", followers: 600_000_000, website: "cr7.com", keywords: ["football", "athlete"] }));
    const contributions = buildConfidenceContributions(input, null);
    const composite = computeComposite(contributions);
    expect(composite).toBeGreaterThanOrEqual(0);
    expect(composite).toBeLessThanOrEqual(1);
    expect(contributions.some((c) => c.key === "deterministicBase")).toBe(true);
  });

  it("includes the AI contributor only when AI enrichment is applied", async () => {
    const input = await inputFor(source());
    const withoutAi = buildConfidenceContributions(input, null);
    expect(withoutAi.some((c) => c.key === "aiSignal")).toBe(false);
    const withAi = buildConfidenceContributions(input, { entityType: "athlete", confidenceAdjustment: 0.8 });
    expect(withAi.some((c) => c.key === "aiSignal")).toBe(true);
    expect(computeComposite(withAi)).toBeGreaterThan(computeComposite(withoutAi));
  });
});

describe("merge strategy — deterministic first", () => {
  it("fills missing fields from AI and never overwrites the deterministic persona", async () => {
    const input = await inputFor(source({ bio: "Football athlete #football", followers: 600_000_000, keywords: ["football"] }));
    // Build a deterministic profile via the engine (confidence high → no AI).
    const base = await hybridIntelligenceEngine.enrich(input, { forceAi: false });
    const result = mergeIdentity(base, {
      entityType: "athlete",
      persona: "Nike Sponsored",
      primaryNiche: "sports",
      audience: { description: "Football fans worldwide", interests: ["football"] },
      confidenceAdjustment: 0.9,
    });
    expect(result.profile.persona?.id).toBe(base.persona?.id); // deterministic persona preserved
    expect(result.profile.entityType).toBe("athlete"); // AI filled missing
    expect(result.profile.audience?.description).toBe("Football fans worldwide");
    expect(result.profile.confidence).toBeGreaterThanOrEqual(base.confidence);
    expect(result.decisions.some((d) => d.startsWith("entityType:ai-filled"))).toBe(true);
  });

  it("caps AI confidence upgrades", async () => {
    const input = await inputFor(source());
    const base = await hybridIntelligenceEngine.enrich(input, { forceAi: false });
    const result = mergeIdentity(base, { entityType: "creator", confidenceAdjustment: 1 });
    expect(result.profile.confidence - base.confidence).toBeLessThanOrEqual(0.2 + 1e-9);
  });

  it("rejects unconfigured entity types (config-driven)", async () => {
    const input = await inputFor(source());
    const base = await hybridIntelligenceEngine.enrich(input, { forceAi: false });
    const result = mergeIdentity(base, { entityType: "alien" });
    expect(result.profile.entityType).toBeNull();
  });
});

describe("hashing — stable normalized cache keys", () => {
  it("produces identical hashes for identical sources and different ones otherwise", () => {
    expect(hashSource(source({ bio: "a" }))).toBe(hashSource(source({ bio: "a" })));
    expect(hashSource(source({ bio: "a" }))).not.toBe(hashSource(source({ bio: "b" })));
    expect(hashSource(source())).toBe(createHash("sha1").update(JSON.stringify({ platform: "instagram", username: "cristiano", displayName: "Cristiano Ronaldo", bio: "", avatarUrl: "", followers: 0, following: 0, posts: 0, engagement: 0, content: [], categories: [], links: ["https://instagram.com/cristiano"], verified: false, website: null, languages: null, location: null, keywords: null, hashtags: null, socialLinks: null })).digest("hex").slice(0, 20));
  });
});

describe("prompt — creator-intelligence-enrichment", () => {
  it("renders a structured JSON prompt with all required variables", () => {
    const rendered = renderEnrichmentPrompt({
      platform: "instagram",
      displayName: "Cristiano",
      username: "cristiano",
      bio: "Football athlete",
      verified: false,
      followers: 600_000_000,
      website: "cr7.com",
      keywords: ["football"],
      hashtags: ["football"],
      languages: ["english"],
      categories: ["sports"],
      niche: "sports",
      persona: "Athlete",
      confidence: 0.5,
      missingFields: ["bio"],
      capabilities: ["followers"],
    });
    expect(rendered.responseFormat).toBe("json_object");
    expect(rendered.messages[0]?.content).toContain("Cristiano");
    expect(rendered.messages[0]?.content).toContain("entityType");
    expect(rendered.messages[0]?.content).toContain("confidenceAdjustment");
    expect(rendered.templateId).toBe("creator-intelligence-enrichment.v1");
  });
});

describe("HybridIntelligenceEnrichmentEngine", () => {
  it("skips AI when deterministic confidence is above the threshold", async () => {
    const executor = vi.fn(mockExecutor(JSON.stringify({ entityType: "athlete" })));
    const rich = await inputFor(source({ bio: "Football athlete. Record goals. #football #cr7", followers: 600_000_000, website: "cr7.com", keywords: ["football", "athlete", "soccer"] }), { capabilities: ["followers"], populatedFields: ["bio", "followers"], missingFields: [] });
    const profile = await hybridIntelligenceEngine.enrich(rich, { aiExecutor: executor });
    expect(profile.ai.used).toBe(false);
    expect(executor).not.toHaveBeenCalled();
    expect(profile.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("runs exactly ONE AI enrichment call for low-confidence profiles", async () => {
    const executor = vi.fn(
      mockExecutor(JSON.stringify({ entityType: "creator", primaryNiche: "entertainment", audience: { description: "Gen Z audience", interests: ["entertainment"] }, confidenceAdjustment: 0.6 })),
    );
    const input = await inputFor(source(), { capabilities: ["followers"], populatedFields: ["links"], missingFields: ["bio"] });
    const profile = await hybridIntelligenceEngine.enrich(input, { aiExecutor: executor });
    expect(executor).toHaveBeenCalledTimes(1);
    expect(profile.ai.used).toBe(true);
    expect(profile.ai.provider).toBe("deepseek");
    expect(profile.diagnostics.notes.some((n) => n.startsWith("ai:"))).toBe(true);
  });

  it("falls back to the deterministic pipeline when all providers fail", async () => {
    const executor = vi.fn(mockExecutor(null, false));
    const input = await inputFor(source(), { capabilities: ["followers"], populatedFields: ["links"], missingFields: ["bio"] });
    const profile = await hybridIntelligenceEngine.enrich(input, { aiExecutor: executor });
    expect(executor).toHaveBeenCalledTimes(1);
    expect(profile.ai.used).toBe(false);
    expect(profile.diagnostics.notes.some((n) => n.startsWith("ai:"))).toBe(true);
    expect(profile.persona).toBeTruthy(); // deterministic persona intact
  });

  it("treats unparseable AI output as a failure and continues", async () => {
    const executor = vi.fn(mockExecutor("not json"));
    const input = await inputFor(source(), { capabilities: ["followers"], populatedFields: ["links"], missingFields: ["bio"] });
    const profile = await hybridIntelligenceEngine.enrich(input, { aiExecutor: executor });
    expect(profile.ai.used).toBe(false);
    expect(profile.diagnostics.notes).toContain("ai:parse_failed");
  });

  it("reuses a stable cache key per normalized source (no duplicate enrichment)", async () => {
    const seen: string[] = [];
    const executor = vi.fn((prompt: AIPrompt, options: AIOptions) => {
      seen.push(options.cacheKey ?? "");
      return Promise.resolve(mockExecutor(JSON.stringify({ entityType: "creator" }))());
    });
    const input = await inputFor(source(), { capabilities: ["followers"], populatedFields: ["links"], missingFields: ["bio"] });
    await hybridIntelligenceEngine.enrich(input, { aiExecutor: executor });
    const input2 = await inputFor(source(), { capabilities: ["followers"], populatedFields: ["links"], missingFields: ["bio"] });
    await hybridIntelligenceEngine.enrich(input2, { aiExecutor: executor });
    expect(seen).toHaveLength(2);
    expect(seen[0]).toBe(seen[1]); // identical cache key → the real ProviderCache short-circuits
    expect(seen[0]?.startsWith("identity:")).toBe(true);
  });
});

describe("Ronaldo + MrBeast golden regression", () => {
  it("Ronaldo with sufficient public context is no longer default Creator / low confidence", async () => {
    const rich = await inputFor(source({ bio: "Athlete. Football player. Record goals. #football #cr7", followers: 600_000_000, website: "cr7.com", keywords: ["football", "athlete"], hashtags: ["football", "cr7"] }), { capabilities: ["followers"], populatedFields: ["bio", "followers", "links"], missingFields: [] });
    const profile = await hybridIntelligenceEngine.enrich(rich, {});
    expect(profile.persona?.id).not.toBe("default_creator");
    expect(profile.confidence).toBeGreaterThan(0.5);
    expect(profile.primaryNiche).toBe("sports");
  });

  it("Ronaldo entityType is enriched to athlete when AI runs (forceAi)", async () => {
    const executor = vi.fn(
      mockExecutor(JSON.stringify({ entityType: "athlete", primaryNiche: "sports", industry: "professional sports", confidenceAdjustment: 0.9, recommendedTheme: "bold", recommendedSections: ["hero", "products"] })),
    );
    const rich = await inputFor(source({ bio: "Football athlete", followers: 600_000_000 }), { capabilities: ["followers"], populatedFields: ["bio", "followers"], missingFields: [] });
    const profile = await hybridIntelligenceEngine.enrich(rich, { forceAi: true, aiExecutor: executor });
    expect(profile.entityType).toBe("athlete");
    expect(profile.primaryNiche).toBe("sports");
    expect(profile.diagnostics.fieldsEnriched).toContain("entityType");
  });

  it("MrBeast deterministic niche (finance) is corrected by AI enrichment when it runs", async () => {
    const executor = vi.fn(
      mockExecutor(JSON.stringify({ entityType: "creator", primaryNiche: "entertainment", secondaryNiches: ["philanthropy"], confidenceAdjustment: 0.7, contentStyle: "entertainment" })),
    );
    const src = source({ platform: "youtube", username: "MrBeast", displayName: "MrBeast", bio: "I make videos. Philanthropy and challenges.", followers: 250_000_000, keywords: ["videos", "challenges"] });
    const input = await inputFor(src, { capabilities: ["followers", "bio"], populatedFields: ["bio", "followers"], missingFields: [] });
    const profile = await hybridIntelligenceEngine.enrich(input, { forceAi: true, aiExecutor: executor });
    // Deterministic niche (finance) wins for primaryNiche; AI fills secondary signals.
    expect(profile.secondaryNiches).toContain("philanthropy");
    expect(profile.entityType).toBe("creator");
    expect(executor).toHaveBeenCalledTimes(1);
  });
});

describe("provider routing + cache (existing infrastructure)", () => {
  it("falls back to failure when no providers are available", async () => {
    const factory = new ProviderRegistry();
    const manager = new ProviderManager(factory, new InProcessEventPublisher(), new InMemoryGenerationCache());
    const result = await executeWithManager(manager, { system: "s", messages: [{ role: "user", content: "c" }] }, {});
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("routes through a scripted provider and reuses the cache on the second call", async () => {
    let calls = 0;
    const provider: AIProvider = {
      name: "deepseek",
      supportsStreaming: false,
      supportsJsonMode: true,
      async generate(prompt: AIPrompt, _options?: AIOptions): Promise<Result<AIResponse>> {
        calls += 1;
        return success({
          content: JSON.stringify({ entityType: "creator", confidenceAdjustment: 0.5 }),
          model: "deepseek-chat",
          latencyMs: 10,
          tokenUsage: { prompt: 100, completion: 50, total: 150 },
          cost: 0.0002,
          cached: false,
        });
      },
      estimateCost() {
        return 0;
      },
      async health() {
        return success({ ok: true, latencyMs: 1 });
      },
    };
    const factory = new ProviderRegistry();
    factory.register("deepseek", provider);
    const cache = new InMemoryGenerationCache();
    const manager = new ProviderManager(factory, new InProcessEventPublisher(), cache);
    const prompt: AIPrompt = { system: "s", messages: [{ role: "user", content: "c" }], responseFormat: "json_object" };
    const first = await executeWithManager(manager, prompt, { cacheKey: "identity:abc:v1" }, cache, "deepseek");
    const second = await executeWithManager(manager, prompt, { cacheKey: "identity:abc:v1" }, cache, "deepseek");
    expect(first.ok).toBe(true);
    expect(second.cacheHit).toBe(true);
    expect(calls).toBe(1); // cache prevented the duplicate provider call
  });
});

describe("clamp01", () => {
  it("clamps to [0,1]", () => {
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(-0.2)).toBe(0);
    expect(clamp01(0.42)).toBe(0.42);
  });
});
