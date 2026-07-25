import type { PipelineStage, GenerationStrategy } from "@/lib/generation/contracts";

export type AIDecision = "deterministic" | "cache" | "ai" | "skip";

export interface DecisionReason {
  decision: AIDecision;
  primaryReason: string;
  details: string[];
  stage: PipelineStage;
  confidence: number;
  threshold: number;
  budgetRemaining: number | null;
  estimatedCost: number;
}

export interface DecisionContext {
  stage: PipelineStage;
  confidence: number;
  hasCachedResult: boolean;
  strategy: GenerationStrategy;
  strategyAllowsAI: boolean;
  aiCallsUsed: number;
  maxAICalls: number;
  budgetRemaining: number;
  estimatedAiCost: number;
  creatorMonthlySpend: number;
  monthlyBudget: number;
  deterministicAvailable: boolean;
}

export interface DecisionMetrics {
  deterministicDecisions: number;
  cacheHits: number;
  aiCalls: number;
  skippedStages: number;
  budgetDenials: number;
  confidenceDenials: number;
}
