import type { GenerationStrategy, StrategyType, PipelineStage } from "@/lib/generation/contracts";

export interface TieredGenerationStrategy extends GenerationStrategy {
  readonly providerPriority: readonly string[];
  readonly modelMap: Readonly<Record<string, string>>;
  readonly maxTokens: number;
  readonly confidenceThresholds: Readonly<Partial<Record<PipelineStage, number>>>;
  readonly defaultConfidenceThreshold: number;
  readonly maxAiCostPerGeneration: number;
  readonly maxAiCostPerCreatorPerMonth: number;
  readonly promptVersions: Readonly<Record<string, string>>;
}

function createStrategy(
  type: StrategyType,
  overrides: Partial<TieredGenerationStrategy>,
): TieredGenerationStrategy {
  const defaults: TieredGenerationStrategy = {
    type,
    allowsAI: false,
    maxRegenerationsPerDay: 0,
    maxAICallsPerGeneration: 0,
    cacheTTL: 300000,
    parallelStages: false,
    budget: { dailyAiCost: 0, monthlyAiCost: 0 },
    canRegenerate: () => false,
    canUseAI: () => false,
    providerPriority: [],
    modelMap: {},
    maxTokens: 512,
    confidenceThresholds: {},
    defaultConfidenceThreshold: 0.5,
    maxAiCostPerGeneration: 0,
    maxAiCostPerCreatorPerMonth: 0,
    promptVersions: {},
  };
  return { ...defaults, ...overrides };
}

const BASE_STAGE_THRESHOLDS: Partial<Record<PipelineStage, number>> = {
  source_resolution: 1.0,
  profile_extraction: 0.9,
  intelligence_analysis: 0.8,
  theme_selection: 0.6,
  content_generation: 0.5,
  seo_generation: 0.4,
  section_composition: 0.7,
  website_composition: 0.6,
};

export const FREE_STRATEGY: TieredGenerationStrategy = createStrategy("free", {
  allowsAI: false,
  maxRegenerationsPerDay: 1,
  maxAICallsPerGeneration: 0,
  cacheTTL: 600000,
  parallelStages: false,
  budget: { dailyAiCost: 0, monthlyAiCost: 0 },
  canRegenerate: () => true,
  canUseAI: () => false,
  providerPriority: ["deterministic", "ollama", "deepseek"],
  modelMap: { default: "deepseek-chat" },
  maxTokens: 256,
  confidenceThresholds: { ...BASE_STAGE_THRESHOLDS, content_generation: 0.3, seo_generation: 0.3 },
  defaultConfidenceThreshold: 0.3,
  maxAiCostPerGeneration: 0.002,
  maxAiCostPerCreatorPerMonth: 0.02,
});

export const PRO_STRATEGY: TieredGenerationStrategy = createStrategy("pro", {
  allowsAI: true,
  maxRegenerationsPerDay: 5,
  maxAICallsPerGeneration: 3,
  cacheTTL: 300000,
  parallelStages: false,
  budget: { dailyAiCost: 0.06, monthlyAiCost: 0.60 },
  canRegenerate: (today: number) => today < 5,
  canUseAI: (used: number) => used < 3,
  providerPriority: ["deepseek", "google"],
  modelMap: { default: "deepseek-chat", fallback: "gemini-1.5-flash" },
  maxTokens: 1024,
  confidenceThresholds: { ...BASE_STAGE_THRESHOLDS, content_generation: 0.5, seo_generation: 0.5 },
  defaultConfidenceThreshold: 0.5,
  maxAiCostPerGeneration: 0.02,
  maxAiCostPerCreatorPerMonth: 0.60,
        promptVersions: { hero: "v1" },
});

export const ELITE_STRATEGY: TieredGenerationStrategy = createStrategy("elite", {
  allowsAI: true,
  maxRegenerationsPerDay: 20,
  maxAICallsPerGeneration: 20,
  cacheTTL: 120000,
  parallelStages: true,
  budget: { dailyAiCost: 0.30, monthlyAiCost: 3.00 },
  canRegenerate: () => true,
  canUseAI: (used: number) => used < 20,
  providerPriority: ["deepseek", "openai", "google", "anthropic"],
  modelMap: { default: "deepseek-chat", premium: "gpt-4o-mini", max: "claude-3-haiku" },
  maxTokens: 2048,
  confidenceThresholds: { ...BASE_STAGE_THRESHOLDS, content_generation: 0.7, seo_generation: 0.6 },
  defaultConfidenceThreshold: 0.7,
  maxAiCostPerGeneration: 0.10,
  maxAiCostPerCreatorPerMonth: 3.00,
        promptVersions: { hero: "v2", seo: "v1", branding: "v1" },
});

export const AGENCY_STRATEGY: TieredGenerationStrategy = createStrategy("agency", {
  allowsAI: true,
  maxRegenerationsPerDay: 100,
  maxAICallsPerGeneration: 100,
  cacheTTL: 60000,
  parallelStages: true,
  budget: { dailyAiCost: 1.00, monthlyAiCost: 10.00 },
  canRegenerate: () => true,
  canUseAI: () => true,
  providerPriority: ["deepseek", "openai", "anthropic", "google"],
  modelMap: { default: "deepseek-chat", premium: "gpt-4o", max: "claude-3-5-sonnet" },
  maxTokens: 4096,
  confidenceThresholds: { ...BASE_STAGE_THRESHOLDS, content_generation: 0.85, seo_generation: 0.8 },
  defaultConfidenceThreshold: 0.85,
  maxAiCostPerGeneration: 0.50,
  maxAiCostPerCreatorPerMonth: 10.00,
        promptVersions: { hero: "v3", seo: "v2", branding: "v2", products: "v1" },
});

export const STRATEGY_MAP: Record<StrategyType, TieredGenerationStrategy> = {
  free: FREE_STRATEGY,
  pro: PRO_STRATEGY,
  elite: ELITE_STRATEGY,
  agency: AGENCY_STRATEGY,
  batch: FREE_STRATEGY,
};

export function getStrategy(type: StrategyType): TieredGenerationStrategy {
  return STRATEGY_MAP[type] ?? FREE_STRATEGY;
}

export function getStageConfidenceThreshold(strategy: TieredGenerationStrategy, stage: PipelineStage): number {
  return strategy.confidenceThresholds[stage] ?? strategy.defaultConfidenceThreshold;
}
