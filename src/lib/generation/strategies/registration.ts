import type { StrategyFactory, GenerationStrategy } from "@/lib/generation/contracts";
import { FREE_STRATEGY, PRO_STRATEGY, ELITE_STRATEGY, AGENCY_STRATEGY } from "./strategies";

export function registerStrategies(registry: StrategyFactory): void {
  registry.register("free", () => cloneStrategy(FREE_STRATEGY));
  registry.register("pro", () => cloneStrategy(PRO_STRATEGY));
  registry.register("elite", () => cloneStrategy(ELITE_STRATEGY));
  registry.register("agency", () => cloneStrategy(AGENCY_STRATEGY));
  registry.register("batch", () => cloneStrategy(FREE_STRATEGY));
}

function cloneStrategy(s: GenerationStrategy): GenerationStrategy {
  return {
    type: s.type,
    allowsAI: s.allowsAI,
    maxRegenerationsPerDay: s.maxRegenerationsPerDay,
    maxAICallsPerGeneration: s.maxAICallsPerGeneration,
    cacheTTL: s.cacheTTL,
    parallelStages: s.parallelStages,
    budget: { ...s.budget },
    canRegenerate: s.canRegenerate.bind(s),
    canUseAI: s.canUseAI.bind(s),
  };
}
