/**
 * Deterministic merge layer — IMPLEMENTATION-32.
 *
 * Rules (config-driven via MERGE_POLICY):
 *  - Deterministic values win by default.
 *  - AI fills missing fields only.
 *  - AI may upgrade confidence (capped).
 *  - AI never overwrites verified facts / deterministic personas/niches.
 * Conflicts are recorded, never silent.
 */
import { clamp01 } from "./confidence";
import { MERGE_POLICY, ENTITY_TYPE_SET, type MergePolicy } from "./config";
import type { AIEnrichmentOutput, IdentityProfile } from "./types";

export interface MergeResult {
  profile: IdentityProfile;
  fieldsEnriched: string[];
  fieldsPreserved: string[];
  decisions: string[];
  confidenceAfter: number;
}

function pick<T>(deterministic: T | null | undefined, ai: T | null | undefined, field: string, policy: MergePolicy, fieldsEnriched: string[], fieldsPreserved: string[], decisions: string[]): T | null {
  const det = deterministic ?? null;
  if (det != null && det !== "") {
    if (policy.deterministicWins.includes(field)) {
      decisions.push(`${field}:deterministic-wins`);
      fieldsPreserved.push(field);
    } else if (ai != null && ai !== "") {
      decisions.push(`${field}:conflict-deterministic`);
      fieldsPreserved.push(field);
    } else {
      fieldsPreserved.push(field);
    }
    return det;
  }
  if (ai != null && ai !== "") {
    decisions.push(`${field}:ai-filled`);
    fieldsEnriched.push(field);
    return ai;
  }
  return null;
}

export function mergeIdentity(
  deterministic: IdentityProfile,
  ai: AIEnrichmentOutput | null,
  policy: MergePolicy = MERGE_POLICY,
): MergeResult {
  const fieldsEnriched: string[] = [];
  const fieldsPreserved: string[] = [];
  const decisions: string[] = [];

  if (!ai) {
    return {
      profile: deterministic,
      fieldsEnriched: [],
      fieldsPreserved: ["all"],
      decisions: ["ai:skipped"],
      confidenceAfter: deterministic.confidence,
    };
  }

  const entityType = pick<IdentityProfile["entityType"]>(
    deterministic.entityType,
    (ENTITY_TYPE_SET.has(ai.entityType ?? "") ? ai.entityType : null) as IdentityProfile["entityType"],
    "entityType",
    policy,
    fieldsEnriched,
    fieldsPreserved,
    decisions,
  );

  const primaryNiche = pick<string>(
    deterministic.primaryNiche,
    ai.primaryNiche ?? null,
    "primaryNiche",
    policy,
    fieldsEnriched,
    fieldsPreserved,
    decisions,
  );

  const industry = pick<string>(
    deterministic.industry,
    ai.industry ?? null,
    "industry",
    policy,
    fieldsEnriched,
    fieldsPreserved,
    decisions,
  );

  // AI fills missing secondary niches (append, never replace deterministic set).
  const secondaryNiches = [...deterministic.secondaryNiches];
  for (const n of ai.secondaryNiches ?? []) {
    if (!secondaryNiches.includes(n) && (deterministic.primaryNiche ?? "") !== n) {
      secondaryNiches.push(n);
      fieldsEnriched.push("secondaryNiches");
    }
  }

  const audience = pick<IdentityProfile["audience"]>(
    deterministic.audience,
    ai.audience ? { description: ai.audience.description ?? null, interests: ai.audience.interests ?? [] } : null,
    "audience",
    policy,
    fieldsEnriched,
    fieldsPreserved,
    decisions,
  );

  const brand = pick<IdentityProfile["brand"]>(
    deterministic.brand,
    ai.brandPosition || ai.communicationStyle || ai.visualStyle
      ? { position: ai.brandPosition ?? null, communicationStyle: ai.communicationStyle ?? null, visualStyle: ai.visualStyle ?? null }
      : null,
    "brand",
    policy,
    fieldsEnriched,
    fieldsPreserved,
    decisions,
  );

  const contentStyle = pick<string>(deterministic.contentStyle, ai.contentStyle ?? null, "contentStyle", policy, fieldsEnriched, fieldsPreserved, decisions);
  const businessModel = pick<string>(deterministic.businessModel, ai.businessModel ?? null, "businessModel", policy, fieldsEnriched, fieldsPreserved, decisions);

  let themeRecommendation = deterministic.themeRecommendation;
  if (!themeRecommendation && ai.recommendedTheme) {
    themeRecommendation = { themeId: ai.recommendedTheme, confidence: 0.5 };
    fieldsEnriched.push("themeRecommendation");
  }

  const sectionRecommendations = [...deterministic.sectionRecommendations];
  for (const s of ai.recommendedSections ?? []) {
    if (!sectionRecommendations.includes(s)) {
      sectionRecommendations.push(s);
      fieldsEnriched.push("sectionRecommendations");
    }
  }

  // Confidence: deterministic wins by default; AI may upgrade (capped).
  let confidenceAfter = deterministic.confidence;
  if (policy.aiMayUpgradeConfidence && typeof ai.confidenceAdjustment === "number") {
    const target = clamp01(ai.confidenceAdjustment);
    if (target > deterministic.confidence) {
      confidenceAfter = Math.min(target, deterministic.confidence + policy.maxAiConfidenceUpgrade);
      decisions.push(`confidence:upgraded ${deterministic.confidence.toFixed(2)}→${confidenceAfter.toFixed(2)}`);
    } else {
      decisions.push("confidence:deterministic-wins");
    }
  } else {
    decisions.push("confidence:deterministic");
  }

  const profile: IdentityProfile = {
    ...deterministic,
    entityType,
    primaryNiche,
    industry,
    secondaryNiches: Array.from(new Set(secondaryNiches)),
    audience,
    brand,
    contentStyle,
    businessModel,
    themeRecommendation,
    sectionRecommendations: Array.from(new Set(sectionRecommendations)),
    confidence: confidenceAfter,
    ai: { ...deterministic.ai, confidenceAfter },
    diagnostics: {
      ...deterministic.diagnostics,
      confidenceAfter,
      fieldsEnriched: Array.from(new Set(fieldsEnriched)),
      fieldsPreserved: Array.from(new Set(fieldsPreserved)),
      mergeDecisions: decisions,
    },
  };

  return { profile, fieldsEnriched, fieldsPreserved, decisions, confidenceAfter };
}
