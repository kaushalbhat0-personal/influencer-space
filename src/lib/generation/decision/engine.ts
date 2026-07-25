import type { GenerationCache } from "@/lib/generation/contracts";
import type { AIDecision, DecisionReason, DecisionContext } from "./types";
import type { TieredGenerationStrategy } from "@/lib/generation/strategies";
import { getStageConfidenceThreshold } from "@/lib/generation/strategies/strategies";

export interface DecisionMetrics {
  deterministicDecisions: number;
  cacheHits: number;
  aiCalls: number;
  skippedStages: number;
  budgetDenials: number;
  confidenceDenials: number;
}

export class GenerationDecisionEngine {
  private metrics: DecisionMetrics = {
    deterministicDecisions: 0,
    cacheHits: 0,
    aiCalls: 0,
    skippedStages: 0,
    budgetDenials: 0,
    confidenceDenials: 0,
  };

  constructor(private cache: GenerationCache) {}

  evaluate(context: DecisionContext): DecisionReason {
    const threshold = getStageConfidenceThreshold(context.strategy as TieredGenerationStrategy, context.stage);

    if (context.hasCachedResult) {
      this.metrics.cacheHits++;
      return this.buildDecision("cache", context, threshold, ["Matching cached result found"]);
    }

    if (context.deterministicAvailable && context.confidence >= threshold) {
      this.metrics.deterministicDecisions++;
      return this.buildDecision("deterministic", context, threshold, [
        `Deterministic output satisfies stage (confidence ${context.confidence.toFixed(2)} ≥ threshold ${threshold.toFixed(2)})`,
      ]);
    }

    if (!context.strategyAllowsAI) {
      if (context.deterministicAvailable) {
        this.metrics.deterministicDecisions++;
        return this.buildDecision("deterministic", context, threshold, [
          "AI disabled by strategy, using deterministic fallback",
          `Deterministic available with confidence ${context.confidence.toFixed(2)}`,
        ]);
      }
      this.metrics.skippedStages++;
      return this.buildDecision("skip", context, threshold, [
        "AI generation is disabled by current strategy",
        "No deterministic alternative available",
      ]);
    }

    if (context.aiCallsUsed >= context.maxAICalls) {
      this.metrics.skippedStages++;
      return this.buildDecision("skip", context, threshold, [
        `AI call limit reached (${context.aiCallsUsed}/${context.maxAICalls})`,
      ]);
    }

    if (context.confidence < threshold) {
      this.metrics.confidenceDenials++;
      if (context.deterministicAvailable) {
        this.metrics.deterministicDecisions++;
        return this.buildDecision("deterministic", context, threshold, [
          `Confidence (${context.confidence.toFixed(2)}) below threshold (${threshold.toFixed(2)}), using deterministic fallback`,
        ]);
      }
    }

    if (context.estimatedAiCost > context.budgetRemaining) {
      this.metrics.budgetDenials++;
      this.metrics.skippedStages++;
      return this.buildDecision("skip", context, threshold, [
        `Insufficient budget: estimated cost ${context.estimatedAiCost.toFixed(4)} exceeds remaining ${context.budgetRemaining.toFixed(4)}`,
      ]);
    }

    if (context.creatorMonthlySpend + context.estimatedAiCost > context.monthlyBudget) {
      this.metrics.budgetDenials++;
      this.metrics.skippedStages++;
      return this.buildDecision("skip", context, threshold, [
        `Monthly creator budget exceeded: ${(context.creatorMonthlySpend + context.estimatedAiCost).toFixed(4)} > ${context.monthlyBudget.toFixed(4)}`,
      ]);
    }

    this.metrics.aiCalls++;
    return this.buildDecision("ai", context, threshold, [
      `AI required: confidence ${context.confidence.toFixed(2)} below deterministic threshold`,
      `Budget sufficient: ${context.estimatedAiCost.toFixed(4)} ≤ ${context.budgetRemaining.toFixed(4)}`,
      `AI calls used: ${context.aiCallsUsed}/${context.maxAICalls}`,
    ]);
  }

  getMetrics(): DecisionMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      deterministicDecisions: 0,
      cacheHits: 0,
      aiCalls: 0,
      skippedStages: 0,
      budgetDenials: 0,
      confidenceDenials: 0,
    };
  }

  private buildDecision(
    decision: AIDecision,
    ctx: DecisionContext,
    threshold: number,
    details: string[],
  ): DecisionReason {
    const primaryReasons: Record<AIDecision, string> = {
      deterministic: "Deterministic output sufficient",
      cache: "Cached AI result available",
      ai: "AI generation required",
      skip: "Stage skipped",
    };

    return {
      decision,
      primaryReason: primaryReasons[decision],
      details,
      stage: ctx.stage,
      confidence: ctx.confidence,
      threshold,
      budgetRemaining: ctx.budgetRemaining,
      estimatedCost: ctx.estimatedAiCost,
    };
  }
}
