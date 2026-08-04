/**
 * Hybrid Intelligence Enrichment — configuration (IMPLEMENTATION-32).
 *
 * Config-driven enrichment policy: AI trigger threshold, prompt identity,
 * merge policy, confidence weights and cache TTL. All thresholds/configurable —
 * nothing hardcoded in the engine.
 */

export const ENTITY_TYPES = [
  "person",
  "business",
  "creator",
  "influencer",
  "streamer",
  "athlete",
  "sports_team",
  "fitness",
  "coach",
  "educator",
  "teacher",
  "doctor",
  "lawyer",
  "consultant",
  "developer",
  "designer",
  "artist",
  "musician",
  "actor",
  "photographer",
  "trader",
  "investor",
  "restaurant",
  "startup",
  "agency",
  "brand",
  "company",
  "podcast",
  "public_figure",
  "event",
  "ngo",
  "government",
  "organization",
  "hotel",
  "retail",
  "healthcare",
  "non_profit",
  "community",
  "other",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const ENTITY_TYPE_SET: ReadonlySet<string> = new Set(ENTITY_TYPES as readonly string[]);

export interface EnrichmentConfig {
  /** AI runs only when the deterministic composite confidence is BELOW this. */
  aiTriggerConfidenceThreshold: number;
  /** Prompt stage id in the existing prompt registry. */
  promptStage: string;
  /** Prompt version resolved from the registry. */
  promptVersion: string;
  /** Maximum AI enrichment calls per onboarding (cost guard). */
  maxAiCallsPerOnboarding: number;
  /** Identity enrichment cache TTL. */
  cacheTtlMs: number;
  /** Cap on how much AI may raise confidence (never unbounded). */
  maxAiConfidenceUpgrade: number;
  /** Response schema version the prompt is validated against. */
  responseSchemaVersion: number;
}

export const ENRICHMENT_CONFIG: EnrichmentConfig = {
  aiTriggerConfidenceThreshold: 0.5,
  promptStage: "creator-intelligence-enrichment",
  promptVersion: "v1",
  maxAiCallsPerOnboarding: 1,
  cacheTtlMs: 24 * 60 * 60 * 1000,
  maxAiConfidenceUpgrade: 0.2,
  responseSchemaVersion: 1,
};

export type ConfidenceSource = "deterministic" | "ai";

export interface ConfidenceContribution {
  key: string;
  label: string;
  /** 0..1 evidence score for this contributor. */
  score: number;
  /** 0..1 weight (normalized over all contributors). */
  weight: number;
  source: ConfidenceSource;
}

/** Weighted evidence contributors (extend — never replace — existing confidence). */
export const CONFIDENCE_CONTRIBUTORS: ReadonlyArray<{
  key: string;
  label: string;
  weight: number;
}> = [
  { key: "deterministicBase", label: "Deterministic Intelligence", weight: 0.35 },
  { key: "profileCompleteness", label: "Profile Completeness", weight: 0.2 },
  { key: "personaSignal", label: "Persona Match", weight: 0.2 },
  { key: "platformCoverage", label: "Platform Coverage", weight: 0.1 },
  { key: "keywordSignal", label: "Keyword Quality", weight: 0.05 },
  { key: "crossSignalAgreement", label: "Cross-Signal Agreement", weight: 0.1 },
  { key: "aiSignal", label: "AI Enrichment", weight: 0.2 },
];

export interface MergePolicy {
  /** Fields where the deterministic value is authoritative (AI never overwrites). */
  deterministicWins: string[];
  /** Fields AI may FILL when the deterministic value is empty. */
  aiFillsMissing: string[];
  /** Whether AI may upgrade confidence (capped by maxAiConfidenceUpgrade). */
  aiMayUpgradeConfidence: boolean;
  maxAiConfidenceUpgrade: number;
}

export const MERGE_POLICY: MergePolicy = {
  deterministicWins: ["persona", "primaryNiche", "industry"],
  aiFillsMissing: [
    "entityType",
    "audience",
    "brand",
    "contentStyle",
    "visualStyle",
    "businessModel",
    "secondaryNiches",
    "themeRecommendation",
    "sectionRecommendations",
    "communicationStyle",
  ],
  aiMayUpgradeConfidence: true,
  maxAiConfidenceUpgrade: ENRICHMENT_CONFIG.maxAiConfidenceUpgrade,
};
