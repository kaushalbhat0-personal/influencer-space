/**
 * Hybrid Intelligence Enrichment Engine â€” IMPLEMENTATION-32.
 *
 * Deterministic First. AI Second. Knowledge First. Generation Last.
 *
 * Runs a SINGLE low-cost AI enrichment call ONLY when deterministic confidence
 * is below a configurable threshold. Every AI response ENRICHES existing
 * knowledge through the deterministic merge policy â€” nothing replaces it. The
 * engine is a pure enhancement of the onboarding pipeline: KnowledgeBuilder
 * stays the owner of deterministic knowledge, PersonaEngine unchanged.
 */
import { platformTelemetry } from "@/lib/telemetry";
import { buildConfidenceContributions, computeComposite, clamp01 } from "./confidence";
import { ENRICHMENT_CONFIG, type ConfidenceContribution } from "./config";
import { hashSource } from "./hash";
import { mergeIdentity } from "./merge";
import { executeEnrichmentCall } from "./provider";
import { renderEnrichmentPrompt } from "./prompt";
import type { AIEnrichmentOutput, EnrichmentDiagnostics, IdentityEnrichmentInput, IdentityProfile } from "./types";
import type { AcquisitionDiagnostics } from "@/lib/generation/acquisition/types";
import { sanitizeEntityType, isKnownProvider } from "./validate";

interface EnrichmentOptions {
  /** True when called during a dev probe / verification context. */
  forceAi?: boolean;
  missingFields?: string[];
  acquisition?: Pick<AcquisitionDiagnostics, "capabilities" | "populatedFields" | "missingFields"> | null;
  /** Test seam — defaults to the real provider system. */
  aiExecutor?: typeof executeEnrichmentCall;
}

function emptyDiagnostics(notes: string[]): EnrichmentDiagnostics {
  return {
    aiUsed: false,
    provider: null,
    model: null,
    cacheHit: false,
    promptVersion: ENRICHMENT_CONFIG.promptVersion,
    latencyMs: 0,
    cost: 0,
    confidenceBefore: 0,
    confidenceAfter: 0,
    fieldsEnriched: [],
    fieldsPreserved: [],
    mergeDecisions: [],
    notes,
  };
}

function buildDeterministicProfile(input: IdentityEnrichmentInput, contributions: ConfidenceContribution[]): IdentityProfile {
  const confidence = computeComposite(contributions);
  return {
    entityType: null,
    persona: input.persona,
    industry: null,
    primaryNiche: input.primaryNiche,
    secondaryNiches: [],
    audience: null,
    brand: null,
    contentStyle: null,
    businessModel: null,
    themeRecommendation: null,
    sectionRecommendations: [],
    confidence,
    evidence: contributions.map((c) => ({ source: c.source, value: c.score })),
    ai: {
      used: false,
      provider: null,
      model: null,
      promptVersion: ENRICHMENT_CONFIG.promptVersion,
      cacheHit: false,
      latencyMs: 0,
      cost: 0,
      confidenceBefore: confidence,
      confidenceAfter: confidence,
    },
    diagnostics: emptyDiagnostics([]),
  };
}

function parseEnrichment(content: string): AIEnrichmentOutput | null {
  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== "object") return null;
    const out: AIEnrichmentOutput = {
      entityType: typeof parsed.entityType === "string" ? sanitizeEntityType(parsed.entityType) : null,
      persona: typeof parsed.persona === "string" ? parsed.persona : null,
      industry: typeof parsed.industry === "string" ? parsed.industry : null,
      primaryNiche: typeof parsed.primaryNiche === "string" ? parsed.primaryNiche : null,
      secondaryNiches: Array.isArray(parsed.secondaryNiches) ? parsed.secondaryNiches.filter((x: unknown) => typeof x === "string") : [],
      audience:
        parsed.audience && typeof parsed.audience === "object"
          ? {
              description: typeof parsed.audience.description === "string" ? parsed.audience.description : null,
              interests: Array.isArray(parsed.audience.interests) ? parsed.audience.interests.filter((x: unknown) => typeof x === "string") : [],
            }
          : null,
      brandPosition: typeof parsed.brandPosition === "string" ? parsed.brandPosition : null,
      communicationStyle: typeof parsed.communicationStyle === "string" ? parsed.communicationStyle : null,
      visualStyle: typeof parsed.visualStyle === "string" ? parsed.visualStyle : null,
      contentStyle: typeof parsed.contentStyle === "string" ? parsed.contentStyle : null,
      businessModel: typeof parsed.businessModel === "string" ? parsed.businessModel : null,
      confidenceAdjustment: typeof parsed.confidenceAdjustment === "number" ? clamp01(parsed.confidenceAdjustment) : null,
      recommendedTheme: typeof parsed.recommendedTheme === "string" ? parsed.recommendedTheme : null,
      recommendedSections: Array.isArray(parsed.recommendedSections) ? parsed.recommendedSections.filter((x: unknown) => typeof x === "string") : [],
      missingSignals: Array.isArray(parsed.missingSignals) ? parsed.missingSignals.filter((x: unknown) => typeof x === "string") : [],
      reasoningSummary: typeof parsed.reasoningSummary === "string" ? parsed.reasoningSummary : null,
    };
    // Require at least one enrichment signal, else treat as unhelpful.
    const hasSignal =
      out.entityType || out.primaryNiche || out.industry || out.businessModel || out.contentStyle || out.brandPosition ||
      (out.secondaryNiches?.length ?? 0) > 0 || (out.recommendedSections?.length ?? 0) > 0 || (out.audience?.description);
    return hasSignal ? out : null;
  } catch {
    return null;
  }
}

export class HybridIntelligenceEnrichmentEngine {
  async enrich(input: IdentityEnrichmentInput, options: EnrichmentOptions = {}): Promise<IdentityProfile> {
    const notes: string[] = [];

    // Deterministic-first confidence.
    const deterministicContributions = buildConfidenceContributions(input, null);
    const deterministicProfile = buildDeterministicProfile(input, deterministicContributions);

    if (!options.forceAi && deterministicProfile.confidence >= ENRICHMENT_CONFIG.aiTriggerConfidenceThreshold) {
      notes.push(`confidence:${deterministicProfile.confidence.toFixed(2)}>=threshold:${ENRICHMENT_CONFIG.aiTriggerConfidenceThreshold} (skip AI)`);
      return this.finish(deterministicProfile, notes);
    }

    notes.push(`confidence:${deterministicProfile.confidence.toFixed(2)}<threshold:${ENRICHMENT_CONFIG.aiTriggerConfidenceThreshold} (AI eligible)`);

    // Single low-cost call via the EXISTING provider system (cache re-enabled).
    const sourceHash = hashSource(input.source);
    const cacheKey = `identity:${sourceHash}:${ENRICHMENT_CONFIG.promptVersion}`;
    const rendered = renderEnrichmentPrompt({
      platform: input.source.platform,
      displayName: input.source.displayName,
      username: input.source.username,
      bio: input.source.bio,
      verified: input.source.verified ?? false,
      followers: input.source.followers,
      website: input.source.website ?? null,
      keywords: input.source.keywords ?? [],
      hashtags: input.source.hashtags ?? [],
      languages: input.source.languages ?? [],
      categories: input.source.categories ?? [],
      niche: input.primaryNiche ?? "",
      persona: input.persona?.name ?? "",
      confidence: deterministicProfile.confidence,
      missingFields: options.missingFields ?? [],
      capabilities: input.acquisition?.capabilities ?? [],
    });

    const executor = options.aiExecutor ?? executeEnrichmentCall;
    const call = await executor(
      { system: rendered.system, messages: rendered.messages, responseFormat: "json_object" },
      {
        model: undefined,
        maxTokens: rendered.maxTokens ?? 700,
        temperature: rendered.temperature ?? 0.2,
        cacheKey,
        cacheTTL: ENRICHMENT_CONFIG.cacheTtlMs,
      },
    );

    platformTelemetry.counter("enrichment.calls", 1, { ok: String(call.ok), provider: call.provider ?? "none", cached: String(call.cacheHit) });
    platformTelemetry.timer("enrichment.latency_ms", call.latencyMs, { provider: call.provider ?? "none" });

    if (!call.ok) {
      notes.push(`ai:${call.error ?? "failed"}`);
      return this.finish(deterministicProfile, notes, call);
    }

    const ai = parseEnrichment(call.content ?? "");
    if (!ai) {
      notes.push("ai:parse_failed");
      return this.finish(deterministicProfile, notes, call);
    }

    notes.push(`ai:${call.provider ?? "provider"}:${call.model ?? "model"}${call.cacheHit ? ":cached" : ""}`);

    // Recompute confidence with the AI contributor, then merge.
    const mergedContributions = buildConfidenceContributions(input, ai);
    const mergedComposite = computeComposite(mergedContributions);
    const enrichedBase: IdentityProfile = {
      ...deterministicProfile,
      confidence: mergedComposite,
      ai: {
        ...deterministicProfile.ai,
        used: true,
        provider: call.provider,
        model: call.model,
        cacheHit: call.cacheHit,
        latencyMs: call.latencyMs,
        cost: call.cost,
        confidenceBefore: deterministicProfile.confidence,
        confidenceAfter: mergedComposite,
      },
    };

    const { profile } = mergeIdentity(enrichedBase, ai);

    platformTelemetry.counter("enrichment.used", 1, { provider: call.provider ?? "none", cached: String(call.cacheHit) });
    platformTelemetry.counter("enrichment.cost_usd", call.cost, { provider: call.provider ?? "none" });

    const diagnostics: EnrichmentDiagnostics = {
      aiUsed: true,
      provider: call.provider,
      model: call.model,
      cacheHit: call.cacheHit,
      promptVersion: ENRICHMENT_CONFIG.promptVersion,
      latencyMs: call.latencyMs,
      cost: call.cost,
      confidenceBefore: deterministicProfile.confidence,
      confidenceAfter: profile.confidence,
      fieldsEnriched: profile.diagnostics.fieldsEnriched,
      fieldsPreserved: profile.diagnostics.fieldsPreserved,
      mergeDecisions: profile.diagnostics.mergeDecisions,
      notes: [...notes, ...profile.diagnostics.mergeDecisions],
    };

    return { ...profile, diagnostics, evidence: mergedContributions.map((c) => ({ source: c.source, value: c.score })) };
  }

  private finish(profile: IdentityProfile, notes: string[], call?: { provider: string | null; model: string | null; cacheHit: boolean; latencyMs: number; cost: number }): IdentityProfile {
    if (!call) {
      return {
        ...profile,
        diagnostics: { ...profile.diagnostics, confidenceBefore: profile.confidence, confidenceAfter: profile.confidence, fieldsPreserved: ["all"], notes },
      };
    }
    return {
      ...profile,
      ai: { ...profile.ai, used: call.cacheHit ? false : profile.ai.used, cacheHit: call.cacheHit, latencyMs: call.latencyMs, cost: call.cost, provider: call.provider, model: call.model },
      diagnostics: {
        ...profile.diagnostics,
        aiUsed: call.cacheHit,
        provider: call.provider,
        model: call.model,
        cacheHit: call.cacheHit,
        latencyMs: call.latencyMs,
        cost: call.cost,
        confidenceBefore: profile.confidence,
        confidenceAfter: profile.confidence,
        fieldsPreserved: ["all"],
        notes,
      },
    };
  }
}

export const hybridIntelligenceEngine = new HybridIntelligenceEnrichmentEngine();

// Re-export for consumers/tests.
export { isKnownProvider };

