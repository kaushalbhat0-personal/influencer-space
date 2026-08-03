/**
 * Evidence-based confidence — IMPLEMENTATION-32.
 *
 * Extends (never discards) the existing deterministic confidence with weighted
 * evidence contributors. The deterministic graph confidence remains a base
 * contributor; AI contributes only when actually used.
 */
import type { ContentSource } from "@/lib/generation/intelligence/types";
import type { AIEnrichmentOutput, IdentityEnrichmentInput } from "./types";
import { CONFIDENCE_CONTRIBUTORS, type ConfidenceContribution } from "./config";

/** Same buckets the existing ExperienceProfileBuilder uses (extended). */
export function normalizePersonaScore(score: number): number {
  if (score >= 80) return 0.95;
  if (score >= 60) return 0.85;
  if (score >= 40) return 0.75;
  if (score >= 20) return 0.6;
  return 0.45;
}

function profileCompleteness(source: ContentSource): number {
  const checks = [
    !!source.displayName,
    !!source.bio,
    source.followers > 0,
    source.links.length > 0,
    !!source.website,
    !!source.avatarUrl,
    (source.keywords?.length ?? 0) > 0,
    (source.content?.length ?? 0) > 0,
  ];
  return checks.filter(Boolean).length / checks.length;
}

function platformCoverage(input: IdentityEnrichmentInput): number {
  const populated = input.acquisition?.populatedFields.length ?? 0;
  const missing = input.acquisition?.missingFields.length ?? 0;
  if (populated + missing === 0) return 0.5;
  return populated / (populated + missing);
}

function keywordSignal(source: ContentSource): number {
  const signals = [
    (source.keywords?.length ?? 0) >= 3,
    (source.hashtags?.length ?? 0) > 0,
    (source.languages?.length ?? 0) > 0,
    (source.categories?.length ?? 0) > 0,
  ];
  return signals.filter(Boolean).length / signals.length;
}

/** Agreement between deterministic niche and AI primaryNiche. */
function crossSignalAgreement(input: IdentityEnrichmentInput, ai: AIEnrichmentOutput | null): number {
  if (!ai?.primaryNiche || !input.primaryNiche) return 0.5;
  const a = ai.primaryNiche.toLowerCase();
  const b = input.primaryNiche.toLowerCase();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.6;
  return 0.2;
}

export interface ConfidenceResult {
  contributions: ConfidenceContribution[];
  composite: number;
}

export function buildConfidenceContributions(
  input: IdentityEnrichmentInput,
  ai: AIEnrichmentOutput | null,
): ConfidenceContribution[] {
  const agreement = crossSignalAgreement(input, ai);
  const contributions: ConfidenceContribution[] = [
    { key: "deterministicBase", label: "Deterministic Intelligence", score: clamp01(input.graphConfidence), weight: 0.35, source: "deterministic" },
    { key: "profileCompleteness", label: "Profile Completeness", score: profileCompleteness(input.source), weight: 0.2, source: "deterministic" },
    { key: "personaSignal", label: "Persona Match", score: normalizePersonaScore(input.personaScore), weight: 0.2, source: "deterministic" },
    { key: "platformCoverage", label: "Platform Coverage", score: platformCoverage(input), weight: 0.1, source: "deterministic" },
    { key: "keywordSignal", label: "Keyword Quality", score: keywordSignal(input.source), weight: 0.05, source: "deterministic" },
    { key: "crossSignalAgreement", label: "Cross-Signal Agreement", score: agreement, weight: 0.1, source: ai ? "ai" : "deterministic" },
  ];

  if (ai && typeof ai.confidenceAdjustment === "number") {
    contributions.push({
      key: "aiSignal",
      label: "AI Enrichment",
      score: clamp01(ai.confidenceAdjustment),
      weight: 0.2,
      source: "ai",
    });
  }

  // Reuse the configured weights (source of truth lives in config).
  for (const c of contributions) {
    const conf = CONFIDENCE_CONTRIBUTORS.find((x) => x.key === c.key);
    if (conf) c.weight = conf.weight;
  }

  return contributions;
}

export function computeComposite(contributions: ConfidenceContribution[]): number {
  const totalWeight = contributions.reduce((s, c) => s + c.weight, 0);
  if (totalWeight <= 0) return 0;
  const weighted = contributions.reduce((s, c) => s + c.score * c.weight, 0);
  return clamp01(weighted / totalWeight);
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
