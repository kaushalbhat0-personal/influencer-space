/**
 * Deterministic evidence detection — IMPLEMENTATION-36.
 *
 * Detects entities, niches, business models and audience segments from the
 * acquired source, recording the matched signals as evidence. Pure, LLM-free.
 */
import {
  ENTITY_RULES,
  NICHE_RULES,
  BUSINESS_MODEL_KEYWORDS,
  AUDIENCE_KEYWORDS,
  RECOMMENDATIONS,
  ENTITY_TYPE_SET,
  type EvidenceEntityType,
  type BusinessModelType,
  type AudienceSegment,
} from "./config";
import type {
  DetectedEntity,
  DetectedNiche,
  DetectedBusinessModel,
  DetectedAudience,
  EvidenceItem,
  EvidenceIntelligence,
  EvidenceIntelligenceInput,
} from "./types";

const ENTITY_WEIGHTS: Record<string, number> = {
  creator: 0.25,
  influencer: 0.4,
  streamer: 0.45,
  athlete: 0.6,
  sports_team: 0.5,
  fitness: 0.55,
  coach: 0.55,
  educator: 0.5,
  teacher: 0.45,
  doctor: 0.6,
  lawyer: 0.55,
  consultant: 0.5,
  developer: 0.55,
  designer: 0.5,
  artist: 0.5,
  musician: 0.5,
  actor: 0.5,
  photographer: 0.5,
  trader: 0.5,
  investor: 0.5,
  restaurant: 0.6,
  startup: 0.5,
  agency: 0.5,
  brand: 0.45,
  company: 0.4,
  podcast: 0.45,
  public_figure: 0.4,
  event: 0.4,
  ngo: 0.4,
  government: 0.4,
  organization: 0.35,
};

function allText(input: EvidenceIntelligenceInput): string {
  return [input.sourceText, ...input.sourceContentTexts].join(" ").toLowerCase();
}

function matches(text: string, keywords: string[]): string[] {
  return keywords.filter((kw) => text.includes(kw));
}

function evidenceFor(source: "bio" | "content" | "acquisition", values: string[], kind: EvidenceItem["kind"]): EvidenceItem[] {
  return values.map((value) => ({ source, value, kind }));
}

/** Detect entities (multi, weighted, evidence-backed). */
export function detectEntities(input: EvidenceIntelligenceInput): DetectedEntity[] {
  const text = allText(input);
  const results: DetectedEntity[] = [];

  for (const rule of ENTITY_RULES) {
    const base = matches(text, rule.keywords);
    const strong = matches(text, rule.strongKeywords ?? []);
    let score = base.length + strong.length * 2;
    if (score === 0) continue;
    // Niche affinity boost (e.g. sports niche → athlete).
    if (rule.nicheAffinity?.includes(input.graphNiche ?? "")) score += 1.5;
    const confidence = Math.min(1, 0.35 + score * 0.08 + strong.length * 0.08);
    results.push({
      entity: rule.entity,
      confidence,
      evidence: [
        ...evidenceFor("bio", base.slice(0, 4), "entity"),
        ...evidenceFor("bio", strong.slice(0, 4), "entity"),
      ],
    });
  }

  results.sort((a, b) => b.confidence - a.confidence);
  return results.slice(0, 4);
}

/** Detect niches (multi, weighted, evidence-backed). */
export function detectNiches(input: EvidenceIntelligenceInput): DetectedNiche[] {
  const text = allText(input);
  const results: DetectedNiche[] = [];
  let total = 0;

  for (const [niche, keywords] of Object.entries(NICHE_RULES)) {
    const matched = matches(text, keywords);
    if (matched.length === 0) continue;
    const weight = 5 + matched.reduce((s, k) => s + k.length, 0) * 1.2 + matched.length * 3;
    total += weight;
    results.push({
      niche,
      weight,
      confidence: 0,
      evidence: evidenceFor("bio", matched.slice(0, 4), "niche"),
    });
  }

  // Weighted confidence across detected niches (top niche is strongest).
  for (const r of results) {
    r.confidence = Math.min(1, r.weight / (total / results.length));
  }
  results.sort((a, b) => b.weight - a.weight);
  return results.slice(0, 5);
}

/** Detect business models (multi, evidence-backed). */
export function detectBusinessModels(input: EvidenceIntelligenceInput): DetectedBusinessModel[] {
  const text = allText(input);
  const results: DetectedBusinessModel[] = [];
  for (const [model, keywords] of Object.entries(BUSINESS_MODEL_KEYWORDS) as Array<[BusinessModelType, string[]]>) {
    const matched = matches(text, keywords);
    if (matched.length === 0) continue;
    results.push({
      model,
      confidence: Math.min(1, 0.4 + matched.length * 0.12),
      evidence: evidenceFor("bio", matched.slice(0, 4), "business"),
    });
  }
  results.sort((a, b) => b.confidence - a.confidence);
  return results.slice(0, 4);
}

/** Detect audience segments (multi, evidence-backed). */
export function detectAudience(input: EvidenceIntelligenceInput): DetectedAudience[] {
  const text = allText(input);
  const results: DetectedAudience[] = [];
  for (const [segment, keywords] of Object.entries(AUDIENCE_KEYWORDS) as Array<[AudienceSegment, string[]]>) {
    const matched = matches(text, keywords);
    if (matched.length === 0) continue;
    results.push({
      segment,
      confidence: Math.min(1, 0.35 + matched.length * 0.15),
      evidence: evidenceFor("bio", matched.slice(0, 4), "audience"),
    });
  }
  results.sort((a, b) => b.confidence - a.confidence);
  return results.slice(0, 4);
}

/** Merge AI-derived entity/niches/business (hybrid output) into the detections. */
export function mergeAI(
  input: EvidenceIntelligenceInput,
  entities: DetectedEntity[],
  niches: DetectedNiche[],
  business: DetectedBusinessModel[],
): { entities: DetectedEntity[]; niches: DetectedNiche[]; business: DetectedBusinessModel[]; enriched: string[] } {
  const enriched: string[] = [];

  if (input.aiEntity && ENTITY_TYPE_SET.has(input.aiEntity)) {
    const existing = entities.find((e) => e.entity === input.aiEntity);
    if (existing) {
      existing.confidence = Math.min(1, existing.confidence + 0.2);
      existing.aiReinforced = true;
    } else {
      entities.push({
        entity: input.aiEntity as EvidenceEntityType,
        confidence: 0.7,
        aiReinforced: true,
        evidence: [{ source: "ai", value: input.aiEntity, kind: "entity" }],
      });
    }
    enriched.push("entity");
  }

  for (const n of input.aiNiches ?? []) {
    const existing = niches.find((x) => x.niche === n);
    if (existing) existing.confidence = Math.min(1, existing.confidence + 0.15);
    else niches.push({ niche: n, weight: 20, confidence: 0.6, evidence: [{ source: "ai", value: n, kind: "niche" }] });
  }
  if ((input.aiNiches?.length ?? 0) > 0) enriched.push("niches");

  if (input.aiBusinessModel) {
    const existing = business.find((b) => b.model === input.aiBusinessModel);
    if (existing) existing.confidence = Math.min(1, existing.confidence + 0.15);
    else business.push({ model: input.aiBusinessModel as BusinessModelType, confidence: 0.6, evidence: [{ source: "ai", value: input.aiBusinessModel, kind: "business" }] });
    enriched.push("business");
  }

  return { entities, niches, business, enriched };
}

/** Build the full evidence intelligence (deterministic + AI merge). */
export function buildEvidenceIntelligence(input: EvidenceIntelligenceInput): EvidenceIntelligence {
  let entities = detectEntities(input);
  let niches = detectNiches(input);
  let business = detectBusinessModels(input);
  const audience = detectAudience(input);

  const merged = mergeAI(input, entities, niches, business);
  entities = merged.entities;
  niches = merged.niches;
  business = merged.business;

  entities.sort((a, b) => b.confidence - a.confidence);
  niches.sort((a, b) => b.weight - a.weight);
  business.sort((a, b) => b.confidence - a.confidence);

  const primaryEntity = entities[0]?.entity ?? null;
  const primaryNiche = niches[0]?.niche ?? input.graphNiche;

  // Recommendations from the primary entity (fallback to creator defaults).
  const rec = RECOMMENDATIONS[primaryEntity ?? "creator"] ?? RECOMMENDATIONS.creator!;
  const seoKeywords = Array.from(new Set([...(rec?.seoKeywords ?? []), ...(niches.slice(0, 2).map((n) => n.niche))]));

  // Composable confidence with explanation.
  const entityConf = entities[0]?.confidence ?? 0.3;
  const nicheConf = niches[0]?.confidence ?? 0.3;
  const businessConf = business[0]?.confidence ?? 0.3;
  const audienceConf = audience[0]?.confidence ?? 0.3;
  const acquisition = input.acquisitionCompleteness;
  const breakdown = [
    { key: "entity", label: "Entity", score: entityConf, weight: 0.3 },
    { key: "niche", label: "Niche", score: nicheConf, weight: 0.25 },
    { key: "business", label: "Business Model", score: businessConf, weight: 0.15 },
    { key: "audience", label: "Audience", score: audienceConf, weight: 0.15 },
    { key: "acquisition", label: "Acquisition", score: acquisition, weight: 0.15 },
  ];
  const totalWeight = breakdown.reduce((s, b) => s + b.weight, 0);
  const overall = breakdown.reduce((s, b) => s + b.score * b.weight, 0) / totalWeight;

  const evidenceCount = [...entities, ...niches, ...business, ...audience].reduce((s, d) => s + d.evidence.length, 0);

  return {
    entities,
    primaryEntity,
    niches,
    primaryNiche,
    businessModels: business,
    audience: {
      segments: audience,
      language: null,
      region: null,
      scope: "unknown",
    },
    recommendations: {
      theme: rec?.theme ?? null,
      sections: rec?.sections ?? [],
      cta: rec?.cta ?? null,
      products: rec?.products ?? [],
      services: rec?.services ?? [],
      brandTone: rec?.brandTone ?? null,
      colorStyle: rec?.colorStyle ?? null,
      typography: rec?.typography ?? null,
      seoKeywords,
    },
    confidence: {
      overall,
      entity: entityConf,
      niche: nicheConf,
      business: businessConf,
      audience: audienceConf,
      acquisition,
      breakdown,
    },
    diagnostics: {
      aiUsed: input.aiUsed ?? false,
      aiFieldsEnriched: merged.enriched,
      entityCount: entities.length,
      nicheCount: niches.length,
      evidenceCount,
    },
  };
}
