import { describe, it, expect, beforeEach } from "vitest";
import { GenerationDecisionEngine } from "@/lib/generation/decision/engine";
import type { PipelineStage } from "@/lib/generation/contracts";
import { PRO_STRATEGY, FREE_STRATEGY, ELITE_STRATEGY, getStageConfidenceThreshold } from "@/lib/generation/strategies/strategies";
import { success } from "@/lib/generation/infrastructure/helpers/result";

function mockCache() {
  return { get: async () => success(null), set: async () => success(undefined), invalidate: async () => success(undefined), invalidateByPattern: async () => success(undefined), exists: async () => success(false) } as any;
}

describe("GenerationDecisionEngine", () => {
  let engine: GenerationDecisionEngine;

  beforeEach(() => {
    engine = new GenerationDecisionEngine(mockCache());
  });

  describe("Cache priority", () => {
    it("returns cache when cached result exists", () => {
      const result = engine.evaluate({
        stage: "content_generation" as PipelineStage,
        confidence: 0.3,
        hasCachedResult: true,
        strategy: PRO_STRATEGY,
        strategyAllowsAI: true,
        aiCallsUsed: 0,
        maxAICalls: 3,
        budgetRemaining: 1,
        estimatedAiCost: 0.01,
        creatorMonthlySpend: 0,
        monthlyBudget: 0.60,
        deterministicAvailable: true,
      });
      expect(result.decision).toBe("cache");
    });

    it("returns cache even when confidence is low", () => {
      const result = engine.evaluate({
        stage: "content_generation" as PipelineStage,
        confidence: 0.1,
        hasCachedResult: true,
        strategy: PRO_STRATEGY,
        strategyAllowsAI: true,
        aiCallsUsed: 3,
        maxAICalls: 3,
        budgetRemaining: 0,
        estimatedAiCost: 0.01,
        creatorMonthlySpend: 100,
        monthlyBudget: 0.60,
        deterministicAvailable: false,
      });
      expect(result.decision).toBe("cache");
    });
  });

  describe("Deterministic decision", () => {
    it("returns deterministic when confidence meets threshold", () => {
      const result = engine.evaluate({
        stage: "source_resolution" as PipelineStage,
        confidence: 1.0,
        hasCachedResult: false,
        strategy: PRO_STRATEGY,
        strategyAllowsAI: true,
        aiCallsUsed: 0,
        maxAICalls: 3,
        budgetRemaining: 1,
        estimatedAiCost: 0.01,
        creatorMonthlySpend: 0,
        monthlyBudget: 0.60,
        deterministicAvailable: true,
      });
      expect(result.decision).toBe("deterministic");
    });

    it("returns deterministic fallback when confidence below threshold but AI disabled", () => {
      const result = engine.evaluate({
        stage: "content_generation" as PipelineStage,
        confidence: 0.2,
        hasCachedResult: false,
        strategy: FREE_STRATEGY,
        strategyAllowsAI: false,
        aiCallsUsed: 0,
        maxAICalls: 0,
        budgetRemaining: 0,
        estimatedAiCost: 0.01,
        creatorMonthlySpend: 0,
        monthlyBudget: 0,
        deterministicAvailable: true,
      });
      expect(result.decision).toBe("deterministic");
    });
  });

  describe("AI decision", () => {
    it("returns ai when confidence below threshold and budget sufficient", () => {
      const result = engine.evaluate({
        stage: "content_generation" as PipelineStage,
        confidence: 0.3,
        hasCachedResult: false,
        strategy: ELITE_STRATEGY,
        strategyAllowsAI: true,
        aiCallsUsed: 0,
        maxAICalls: 20,
        budgetRemaining: 10,
        estimatedAiCost: 0.05,
        creatorMonthlySpend: 0.50,
        monthlyBudget: 3.00,
        deterministicAvailable: false,
      });
      expect(result.decision).toBe("ai");
    });

    it("includes reason details for AI decision", () => {
      const result = engine.evaluate({
        stage: "seo_generation" as PipelineStage,
        confidence: 0.35,
        hasCachedResult: false,
        strategy: PRO_STRATEGY,
        strategyAllowsAI: true,
        aiCallsUsed: 1,
        maxAICalls: 3,
        budgetRemaining: 0.05,
        estimatedAiCost: 0.01,
        creatorMonthlySpend: 0.10,
        monthlyBudget: 0.60,
        deterministicAvailable: false,
      });
      expect(result.decision).toBe("ai");
      expect(result.details.length).toBeGreaterThan(0);
    });
  });

  describe("Skip decision", () => {
    it("returns skip when AI disabled and deterministic unavailable", () => {
      const result = engine.evaluate({
        stage: "content_generation" as PipelineStage,
        confidence: 0.2,
        hasCachedResult: false,
        strategy: FREE_STRATEGY,
        strategyAllowsAI: false,
        aiCallsUsed: 0,
        maxAICalls: 0,
        budgetRemaining: 0,
        estimatedAiCost: 0.01,
        creatorMonthlySpend: 0,
        monthlyBudget: 0,
        deterministicAvailable: false,
      });
      expect(result.decision).toBe("skip");
    });

    it("returns skip when AI call limit reached", () => {
      const result = engine.evaluate({
        stage: "content_generation" as PipelineStage,
        confidence: 0.2,
        hasCachedResult: false,
        strategy: PRO_STRATEGY,
        strategyAllowsAI: true,
        aiCallsUsed: 3,
        maxAICalls: 3,
        budgetRemaining: 1,
        estimatedAiCost: 0.01,
        creatorMonthlySpend: 0,
        monthlyBudget: 0.60,
        deterministicAvailable: false,
      });
      expect(result.decision).toBe("skip");
    });

    it("returns skip when budget insufficient", () => {
      const result = engine.evaluate({
        stage: "content_generation" as PipelineStage,
        confidence: 0.2,
        hasCachedResult: false,
        strategy: PRO_STRATEGY,
        strategyAllowsAI: true,
        aiCallsUsed: 0,
        maxAICalls: 3,
        budgetRemaining: 0.001,
        estimatedAiCost: 0.01,
        creatorMonthlySpend: 0,
        monthlyBudget: 0.60,
        deterministicAvailable: false,
      });
      expect(result.decision).toBe("skip");
    });

    it("returns skip when monthly creator budget exceeded", () => {
      const result = engine.evaluate({
        stage: "content_generation" as PipelineStage,
        confidence: 0.2,
        hasCachedResult: false,
        strategy: PRO_STRATEGY,
        strategyAllowsAI: true,
        aiCallsUsed: 0,
        maxAICalls: 3,
        budgetRemaining: 0.10,
        estimatedAiCost: 0.05,
        creatorMonthlySpend: 0.58,
        monthlyBudget: 0.60,
        deterministicAvailable: false,
      });
      expect(result.decision).toBe("skip");
    });
  });

  describe("Stage-specific thresholds", () => {
    it("source_resolution has high threshold", () => {
      const threshold = getStageConfidenceThreshold(PRO_STRATEGY, "source_resolution" as PipelineStage);
      expect(threshold).toBe(1.0);
    });

    it("content_generation has lower threshold for free", () => {
      const threshold = getStageConfidenceThreshold(FREE_STRATEGY, "content_generation" as PipelineStage);
      expect(threshold).toBe(0.3);
    });

    it("elite has higher content threshold than pro", () => {
      const proThreshold = getStageConfidenceThreshold(PRO_STRATEGY, "content_generation" as PipelineStage);
      const eliteThreshold = getStageConfidenceThreshold(ELITE_STRATEGY, "content_generation" as PipelineStage);
      expect(eliteThreshold).toBeGreaterThan(proThreshold);
    });
  });

  describe("Metrics tracking", () => {
    it("tracks deterministic decisions", () => {
      engine.evaluate({
        stage: "source_resolution" as PipelineStage, confidence: 1.0, hasCachedResult: false,
        strategy: PRO_STRATEGY, strategyAllowsAI: true, aiCallsUsed: 0, maxAICalls: 3,
        budgetRemaining: 1, estimatedAiCost: 0.01, creatorMonthlySpend: 0, monthlyBudget: 0.60, deterministicAvailable: true,
      });
      const m = engine.getMetrics();
      expect(m.deterministicDecisions).toBe(1);
    });

    it("tracks cache hits", () => {
      engine.evaluate({
        stage: "content_generation" as PipelineStage, confidence: 0.1, hasCachedResult: true,
        strategy: PRO_STRATEGY, strategyAllowsAI: true, aiCallsUsed: 0, maxAICalls: 3,
        budgetRemaining: 1, estimatedAiCost: 0.01, creatorMonthlySpend: 0, monthlyBudget: 0.60, deterministicAvailable: false,
      });
      const m = engine.getMetrics();
      expect(m.cacheHits).toBe(1);
    });

    it("tracks AI calls", () => {
      engine.evaluate({
        stage: "content_generation" as PipelineStage, confidence: 0.3, hasCachedResult: false,
        strategy: ELITE_STRATEGY, strategyAllowsAI: true, aiCallsUsed: 0, maxAICalls: 20,
        budgetRemaining: 10, estimatedAiCost: 0.05, creatorMonthlySpend: 0.50, monthlyBudget: 3.00, deterministicAvailable: false,
      });
      const m = engine.getMetrics();
      expect(m.aiCalls).toBe(1);
    });

    it("tracks skipped stages", () => {
      engine.evaluate({
        stage: "content_generation" as PipelineStage, confidence: 0.2, hasCachedResult: false,
        strategy: FREE_STRATEGY, strategyAllowsAI: false, aiCallsUsed: 0, maxAICalls: 0,
        budgetRemaining: 0, estimatedAiCost: 0.01, creatorMonthlySpend: 0, monthlyBudget: 0, deterministicAvailable: false,
      });
      const m = engine.getMetrics();
      expect(m.skippedStages).toBe(1);
    });

    it("tracks budget denials", () => {
      engine.evaluate({
        stage: "content_generation" as PipelineStage, confidence: 0.2, hasCachedResult: false,
        strategy: PRO_STRATEGY, strategyAllowsAI: true, aiCallsUsed: 0, maxAICalls: 3,
        budgetRemaining: 0.001, estimatedAiCost: 0.01, creatorMonthlySpend: 0, monthlyBudget: 0.60, deterministicAvailable: false,
      });
      const m = engine.getMetrics();
      expect(m.budgetDenials).toBe(1);
    });

    it("resetMetrics clears all counters", () => {
      engine.evaluate({
        stage: "content_generation" as PipelineStage, confidence: 0.3, hasCachedResult: false,
        strategy: ELITE_STRATEGY, strategyAllowsAI: true, aiCallsUsed: 0, maxAICalls: 20,
        budgetRemaining: 10, estimatedAiCost: 0.05, creatorMonthlySpend: 0.50, monthlyBudget: 3.00, deterministicAvailable: false,
      });
      engine.resetMetrics();
      const m = engine.getMetrics();
      expect(m.aiCalls).toBe(0);
      expect(m.deterministicDecisions).toBe(0);
    });
  });
});

describe("Stage-specific confidence thresholds", () => {
  it("free strategy uses low thresholds", () => {
    expect(getStageConfidenceThreshold(FREE_STRATEGY, "content_generation" as PipelineStage)).toBe(0.3);
    expect(getStageConfidenceThreshold(FREE_STRATEGY, "seo_generation" as PipelineStage)).toBe(0.3);
  });

  it("elite strategy uses higher thresholds for content", () => {
    expect(getStageConfidenceThreshold(ELITE_STRATEGY, "content_generation" as PipelineStage)).toBe(0.7);
    expect(getStageConfidenceThreshold(ELITE_STRATEGY, "seo_generation" as PipelineStage)).toBe(0.6);
  });

  it("fallback to defaultConfidenceThreshold for unknown stages", () => {
    expect(getStageConfidenceThreshold(FREE_STRATEGY, "publishing" as PipelineStage)).toBe(0.3);
    expect(getStageConfidenceThreshold(PRO_STRATEGY, "analytics_tracking" as PipelineStage)).toBe(0.5);
  });

  it("pro strategy thresholds are between free and elite", () => {
    const proContent = getStageConfidenceThreshold(PRO_STRATEGY, "content_generation" as PipelineStage);
    const freeContent = getStageConfidenceThreshold(FREE_STRATEGY, "content_generation" as PipelineStage);
    const eliteContent = getStageConfidenceThreshold(ELITE_STRATEGY, "content_generation" as PipelineStage);
    expect(proContent).toBeGreaterThan(freeContent);
    expect(eliteContent).toBeGreaterThan(proContent);
  });
});
