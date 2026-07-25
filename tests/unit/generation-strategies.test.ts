import { describe, it, expect } from "vitest";
import { FREE_STRATEGY, PRO_STRATEGY, ELITE_STRATEGY, AGENCY_STRATEGY, STRATEGY_MAP, getStrategy } from "@/lib/generation/strategies/strategies";
import { registerStrategies } from "@/lib/generation/strategies/registration";
import { StrategyRegistry } from "@/lib/generation/infrastructure/registries/strategy-registry";

describe("Strategies", () => {
  describe("FREE_STRATEGY", () => {
    it("disallows AI", () => {
      expect(FREE_STRATEGY.allowsAI).toBe(false);
      expect(FREE_STRATEGY.canUseAI(0)).toBe(false);
    });

    it("has zero budget", () => {
      expect(FREE_STRATEGY.budget.dailyAiCost).toBe(0);
      expect(FREE_STRATEGY.maxAiCostPerGeneration).toBe(0.002);
    });

    it("prefers deterministic and ollama", () => {
      expect(FREE_STRATEGY.providerPriority).toContain("deterministic");
      expect(FREE_STRATEGY.providerPriority).toContain("ollama");
      expect(FREE_STRATEGY.providerPriority).not.toContain("mock");
    });

    it("has low confidence threshold", () => {
      expect(FREE_STRATEGY.defaultConfidenceThreshold).toBe(0.3);
    });
  });

  describe("PRO_STRATEGY", () => {
    it("allows limited AI", () => {
      expect(PRO_STRATEGY.allowsAI).toBe(true);
      expect(PRO_STRATEGY.canUseAI(0)).toBe(true);
      expect(PRO_STRATEGY.canUseAI(3)).toBe(false);
      expect(PRO_STRATEGY.maxAICallsPerGeneration).toBe(3);
    });

    it("allows limited regenerations", () => {
      expect(PRO_STRATEGY.canRegenerate(0)).toBe(true);
      expect(PRO_STRATEGY.canRegenerate(5)).toBe(false);
    });

    it("has pro budget", () => {
      expect(PRO_STRATEGY.budget.dailyAiCost).toBe(0.06);
      expect(PRO_STRATEGY.maxAiCostPerGeneration).toBe(0.02);
    });

    it("prefers deepseek with google fallback", () => {
      expect(PRO_STRATEGY.providerPriority[0]).toBe("deepseek");
      expect(PRO_STRATEGY.providerPriority[1]).toBe("google");
    });
  });

  describe("ELITE_STRATEGY", () => {
    it("allows generous AI", () => {
      expect(ELITE_STRATEGY.allowsAI).toBe(true);
      expect(ELITE_STRATEGY.maxAICallsPerGeneration).toBe(20);
    });

    it("supports parallel stages", () => {
      expect(ELITE_STRATEGY.parallelStages).toBe(true);
    });

    it("has higher confidence threshold", () => {
      expect(ELITE_STRATEGY.defaultConfidenceThreshold).toBe(0.7);
    });

    it("has richer prompt versions", () => {
      expect(ELITE_STRATEGY.promptVersions).toHaveProperty("hero");
      expect(ELITE_STRATEGY.promptVersions).toHaveProperty("branding");
    });
  });

  describe("AGENCY_STRATEGY", () => {
    it("allows unlimited AI", () => {
      expect(AGENCY_STRATEGY.allowsAI).toBe(true);
      expect(AGENCY_STRATEGY.canUseAI(999)).toBe(true);
    });

    it("has premium providers", () => {
      expect(AGENCY_STRATEGY.providerPriority).toContain("anthropic");
      expect(AGENCY_STRATEGY.providerPriority.indexOf("deepseek")).toBeLessThan(AGENCY_STRATEGY.providerPriority.indexOf("openai"));
    });

    it("has premium models", () => {
      expect(AGENCY_STRATEGY.modelMap.premium).toBe("gpt-4o");
      expect(AGENCY_STRATEGY.modelMap.max).toBe("claude-3-5-sonnet");
    });

    it("has highest confidence threshold", () => {
      expect(AGENCY_STRATEGY.defaultConfidenceThreshold).toBe(0.85);
    });
  });

  describe("STRATEGY_MAP", () => {
    it("contains all strategy types", () => {
      expect(STRATEGY_MAP.free).toBeDefined();
      expect(STRATEGY_MAP.pro).toBeDefined();
      expect(STRATEGY_MAP.elite).toBeDefined();
      expect(STRATEGY_MAP.agency).toBeDefined();
      expect(STRATEGY_MAP.batch).toBeDefined();
    });

    it("getStrategy returns correct strategy", () => {
      expect(getStrategy("free").allowsAI).toBe(false);
      expect(getStrategy("elite").allowsAI).toBe(true);
    });

    it("batch defaults to free", () => {
      expect(getStrategy("batch").type).toBe("free");
    });
  });

  describe("registerStrategies", () => {
    it("registers all strategies in registry", () => {
      const registry = new StrategyRegistry();
      registerStrategies(registry);
      expect(registry.list()).toContain("free");
      expect(registry.list()).toContain("pro");
      expect(registry.list()).toContain("elite");
      expect(registry.list()).toContain("agency");
      expect(registry.list()).toContain("batch");
    });

    it("creates strategy instances on demand", () => {
      const registry = new StrategyRegistry();
      registerStrategies(registry);
      const free = registry.create("free");
      expect(free.type).toBe("free");
      expect(free.allowsAI).toBe(false);
    });

    it("returns cloned instances", () => {
      const registry = new StrategyRegistry();
      registerStrategies(registry);
      const a = registry.create("free");
      const b = registry.create("free");
      expect(a).not.toBe(b);
    });

    it("pro strategy enforces limits", () => {
      const registry = new StrategyRegistry();
      registerStrategies(registry);
      const pro = registry.create("pro");
      expect(pro.canUseAI(0)).toBe(true);
      expect(pro.canUseAI(3)).toBe(false);
      expect(pro.canRegenerate(0)).toBe(true);
      expect(pro.canRegenerate(5)).toBe(false);
    });
  });

  describe("Cost enforcement", () => {
    it("free strategy costs nothing", () => {
      expect(FREE_STRATEGY.budget.dailyAiCost).toBe(0);
      expect(FREE_STRATEGY.budget.monthlyAiCost).toBe(0);
    });

    it("pro strategy has tier-appropriate budget", () => {
      expect(PRO_STRATEGY.budget.monthlyAiCost).toBeLessThanOrEqual(1);
    });

    it("elite strategy has higher budget than pro", () => {
      expect(ELITE_STRATEGY.budget.monthlyAiCost).toBeGreaterThan(PRO_STRATEGY.budget.monthlyAiCost);
    });

    it("agency strategy has highest budget", () => {
      expect(AGENCY_STRATEGY.budget.monthlyAiCost).toBeGreaterThan(ELITE_STRATEGY.budget.monthlyAiCost);
    });

    it("cost per generation decreases from agency to free", () => {
      const costs = [FREE_STRATEGY, PRO_STRATEGY, ELITE_STRATEGY, AGENCY_STRATEGY].map((s) => s.maxAiCostPerGeneration);
      for (let i = 1; i < costs.length; i++) {
        expect(costs[i]!).toBeGreaterThanOrEqual(costs[i - 1]!);
      }
    });
  });
});
