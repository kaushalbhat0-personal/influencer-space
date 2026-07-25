import type { GenerationRequest, GenerationStrategy, StageRegistry } from "@/lib/generation/contracts";
import { getStrategy } from "@/lib/generation/strategies/strategies";

export interface CostEstimate {
  estimatedCost: { total: number; aiCalls: number; tokensUsed: number };
  estimatedDurationMs: number;
  stageCount: number;
  aiStageCount: number;
  deterministicStageCount: number;
  cacheSavingsPercent: number;
  providerUsage: Record<string, number>;
}

export class GenerationEstimator {
  constructor(private stageRegistry: StageRegistry) {}

  async estimateCost(request: GenerationRequest, strategy?: GenerationStrategy): Promise<CostEstimate> {
    const stages = this.stageRegistry.getAll();
    const stageCount = stages.length;
    const deterministicStages = stages.filter((s) => s.supportsDeterministic);
    const s = strategy ?? getStrategy(request.strategy);

    const forceAI = request.options?.forceAI ?? false;
    const skipAI = request.options?.skipAI ?? false;

    let aiStageCount = 0;
    let totalCost = 0;
    const aiCostPerStage = s.budget.dailyAiCost / Math.max(s.maxAICallsPerGeneration, 1);

    for (const stage of stages) {
      const useAI = s.allowsAI && stage.supportsAI && !skipAI && (forceAI || s.canUseAI(aiStageCount));
      if (useAI) {
        aiStageCount++;
        totalCost += aiCostPerStage;
      }
    }

    totalCost = Math.min(totalCost, s.budget.dailyAiCost);

    const baseDuration = stageCount * 500;
    const aiDuration = aiStageCount * 2000;
    const durationWithParallel = s.parallelStages ? (baseDuration + aiDuration) * 0.6 : baseDuration + aiDuration;
    const cacheSavings = request.options?.cacheTTL ? 20 : 0;

    const estimatedDurationMs = Math.round(durationWithParallel * (1 - cacheSavings / 100));

    return {
      estimatedCost: {
        total: Math.round(totalCost * 100) / 100,
        aiCalls: aiStageCount,
        tokensUsed: aiStageCount * 500,
      },
      estimatedDurationMs,
      stageCount,
      aiStageCount,
      deterministicStageCount: deterministicStages.length,
      cacheSavingsPercent: cacheSavings,
      providerUsage: { "default": aiStageCount },
    };
  }

  async estimateDuration(request: GenerationRequest, strategy?: GenerationStrategy): Promise<number> {
    const estimate = await this.estimateCost(request, strategy);
    return estimate.estimatedDurationMs;
  }
}
