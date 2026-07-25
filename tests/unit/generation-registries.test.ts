import { describe, it, expect, beforeEach } from "vitest";
import { StrategyRegistry } from "@/lib/generation/infrastructure/registries/strategy-registry";
import { ProviderRegistry } from "@/lib/generation/infrastructure/registries/provider-registry";
import { PipelineStageRegistry } from "@/lib/generation/infrastructure/registries/pipeline-stage-registry";
import { InMemoryPromptRegistry } from "@/lib/generation/infrastructure/registries/prompt-registry";
import type { GenerationStrategy, AIProvider, AIPrompt, AIResponse, AIOptions, PipelineStageDef } from "@/lib/generation/contracts";
import type { StrategyType, PipelineStage } from "@/lib/generation/contracts";
import { success, failure } from "@/lib/generation/infrastructure/helpers/result";

describe("StrategyRegistry", () => {
  let registry: StrategyRegistry;

  beforeEach(() => {
    registry = new StrategyRegistry();
  });

  it("registers and creates a strategy", () => {
    registry.register("free", () => createMockStrategy("free"));
    const s = registry.create("free");
    expect(s.type).toBe("free");
  });

  it("throws on duplicate registration", () => {
    registry.register("free", () => createMockStrategy("free"));
    expect(() => registry.register("free", () => createMockStrategy("free"))).toThrow("already registered");
  });

  it("throws on unknown strategy", () => {
    expect(() => registry.create("free")).toThrow("Unknown strategy");
  });

  it("lists registered strategies", () => {
    registry.register("free", () => createMockStrategy("free"));
    registry.register("pro", () => createMockStrategy("pro"));
    expect(registry.list()).toEqual(["free", "pro"]);
  });

  it("unregisters a strategy", () => {
    registry.register("free", () => createMockStrategy("free"));
    registry.unregister("free");
    expect(registry.list()).toEqual([]);
  });

  it("has returns correct boolean", () => {
    expect(registry.has("free")).toBe(false);
    registry.register("free", () => createMockStrategy("free"));
    expect(registry.has("free")).toBe(true);
  });

  it("get returns factory or undefined", () => {
    expect(registry.get("free")).toBeUndefined();
    registry.register("free", () => createMockStrategy("free"));
    expect(registry.get("free")).toBeDefined();
  });

  it("locks and prevents registration", () => {
    registry.lock();
    expect(() => registry.register("free", () => createMockStrategy("free"))).toThrow("locked");
    expect(() => registry.unregister("free")).toThrow("locked");
  });

  it("reports lock state", () => {
    expect(registry.isLocked()).toBe(false);
    registry.lock();
    expect(registry.isLocked()).toBe(true);
  });
});

describe("ProviderRegistry", () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  it("registers and creates a provider", () => {
    registry.register("openai", createMockProvider("openai"));
    const p = registry.create("openai");
    expect(p.name).toBe("openai");
  });

  it("throws on duplicate registration", () => {
    registry.register("openai", createMockProvider("openai"));
    expect(() => registry.register("openai", createMockProvider("openai"))).toThrow("already registered");
  });

  it("throws on unknown provider", () => {
    expect(() => registry.create("nonexistent")).toThrow("Unknown AI provider");
  });

  it("get returns provider or undefined", () => {
    expect(registry.get("openai")).toBeUndefined();
    registry.register("openai", createMockProvider("openai"));
    expect(registry.get("openai")).toBeDefined();
  });

  it("list returns registered names", () => {
    registry.register("a", createMockProvider("a"));
    registry.register("b", createMockProvider("b"));
    expect(registry.list()).toEqual(["a", "b"]);
  });

  it("getDefault returns first provider", () => {
    registry.register("first", createMockProvider("first"));
    registry.register("second", createMockProvider("second"));
    expect(registry.getDefault().name).toBe("first");
  });

  it("getDefault throws when empty", () => {
    expect(() => registry.getDefault()).toThrow("No AI providers registered");
  });

  it("unregister removes a provider", () => {
    registry.register("openai", createMockProvider("openai"));
    registry.unregister("openai");
    expect(registry.list()).toEqual([]);
  });

  it("checkAll returns health statuses", async () => {
    registry.register("healthy", createMockProvider("healthy", true));
    registry.register("unhealthy", createMockProvider("unhealthy", false));
    const results = await registry.checkAll();
    expect(results.healthy).toBe(true);
    expect(results.unhealthy).toBe(false);
  });

  it("isHealthy returns correct state", () => {
    registry.register("p", createMockProvider("p", true));
    expect(registry.isHealthy("p")).toBe(true);
  });

  it("isHealthy returns false for unregistered", () => {
    expect(registry.isHealthy("nobody")).toBe(false);
  });
});

describe("PipelineStageRegistry", () => {
  let registry: PipelineStageRegistry;

  beforeEach(() => {
    registry = new PipelineStageRegistry();
  });

  it("registers and resolves a stage", () => {
    const def = createMockStageDef("theme_selection");
    registry.register(def);
    expect(registry.resolve("theme_selection")).toBe(def);
  });

  it("throws on duplicate registration", () => {
    registry.register(createMockStageDef("theme_selection"));
    expect(() => registry.register(createMockStageDef("theme_selection"))).toThrow("already registered");
  });

  it("throws on unknown stage resolution", () => {
    expect(() => registry.resolve("profile_extraction")).toThrow("Unknown pipeline stage");
  });

  it("get returns undefined for unknown", () => {
    expect(registry.get("profile_extraction")).toBeUndefined();
  });

  it("getAll returns all registered stages", () => {
    const a = createMockStageDef("source_resolution");
    const b = createMockStageDef("theme_selection");
    registry.register(a);
    registry.register(b);
    expect(registry.getAll()).toEqual([a, b]);
  });

  it("unregister removes a stage", () => {
    registry.register(createMockStageDef("theme_selection"));
    registry.unregister("theme_selection");
    expect(registry.getAll()).toEqual([]);
  });

  it("locks and prevents registration", () => {
    registry.lock();
    expect(() => registry.register(createMockStageDef("theme_selection"))).toThrow("locked");
  });

  it("reports lock state", () => {
    expect(registry.isLocked()).toBe(false);
    registry.lock();
    expect(registry.isLocked()).toBe(true);
  });
});

describe("InMemoryPromptRegistry", () => {
  let registry: InMemoryPromptRegistry;

  beforeEach(() => {
    registry = new InMemoryPromptRegistry();
  });

  it("registers and retrieves a prompt", () => {
    registry.register("theme", { system: "sys", template: "tpl", version: "1.0", createdAt: "2025-01-01" });
    const p = registry.get("theme");
    expect(p).not.toBeNull();
    expect(p!.version).toBe("1.0");
  });

  it("latest returns the most recent version", () => {
    registry.register("theme", { system: "sys1", template: "tpl1", version: "1.0", createdAt: "2025-01-01" });
    registry.register("theme", { system: "sys2", template: "tpl2", version: "2.0", createdAt: "2025-02-01" });
    expect(registry.get("theme")!.version).toBe("2.0");
  });

  it("versions returns history", () => {
    registry.register("theme", { system: "sys1", template: "tpl1", version: "1.0", createdAt: "2025-01-01" });
    registry.register("theme", { system: "sys2", template: "tpl2", version: "2.0", createdAt: "2025-02-01" });
    const v = registry.versions("theme");
    expect(v).toHaveLength(2);
    expect(v[0]!.version).toBe("1.0");
    expect(v[1]!.version).toBe("2.0");
  });

  it("returns null for unknown prompt", () => {
    expect(registry.get("unknown")).toBeNull();
  });

  it("getAll returns latest for each name", () => {
    registry.register("a", { system: "sys", template: "a_v1", version: "1.0", createdAt: "2025-01-01" });
    registry.register("b", { system: "sys", template: "b_v1", version: "1.0", createdAt: "2025-01-01" });
    const all = registry.getAll();
    expect(all.size).toBe(2);
    expect(all.get("a")!.template).toBe("a_v1");
  });

  it("has returns correct boolean", () => {
    expect(registry.has("theme")).toBe(false);
    registry.register("theme", { system: "sys", template: "tpl", version: "1.0", createdAt: "2025-01-01" });
    expect(registry.has("theme")).toBe(true);
  });

  it("count returns number of prompt names", () => {
    expect(registry.count()).toBe(0);
    registry.register("a", { system: "sys", template: "tpl", version: "1.0", createdAt: "2025-01-01" });
    registry.register("b", { system: "sys", template: "tpl", version: "1.0", createdAt: "2025-01-01" });
    expect(registry.count()).toBe(2);
  });

  it("throws on duplicate version registration", () => {
    registry.register("theme", { system: "sys", template: "tpl", version: "1.0", createdAt: "2025-01-01" });
    expect(() => registry.register("theme", { system: "sys", template: "tpl", version: "1.0", createdAt: "2025-01-01" })).toThrow("already registered");
  });

  it("returns immutable copies", () => {
    const original = { system: "sys", template: "tpl", version: "1.0", createdAt: "2025-01-01" };
    registry.register("theme", original);
    const retrieved = registry.get("theme")!;
    retrieved.template = "mutated";
    const again = registry.get("theme")!;
    expect(again.template).toBe("tpl");
  });
});

function createMockStrategy(type: StrategyType): GenerationStrategy {
  return {
    type,
    allowsAI: false,
    maxRegenerationsPerDay: 0,
    maxAICallsPerGeneration: 0,
    cacheTTL: 0,
    parallelStages: false,
    budget: { dailyAiCost: 0, monthlyAiCost: 0 },
    canRegenerate: () => false,
    canUseAI: () => false,
  };
}

function createMockProvider(name: string, healthy = true): AIProvider {
  return {
    name,
    supportsStreaming: false,
    supportsJsonMode: false,
    generate: async (_prompt: AIPrompt, _options?: AIOptions) => {
      if (!healthy) return failure(new Error("unhealthy"));
      return success({
        content: "mock",
        model: name,
        latencyMs: 10,
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        cost: 0,
        cached: false,
      });
    },
    estimateCost: () => 0,
    health: async () => healthy
      ? success({ ok: true, latencyMs: 5 })
      : failure(new Error("unhealthy")),
  };
}

function createMockStageDef(type: PipelineStage): PipelineStageDef {
  return {
    type,
    supportsDeterministic: true,
    supportsAI: false,
    supportsCache: false,
    inputs: [],
    outputs: [],
    execute: async () => success({}),
    canExecute: () => true,
  };
}
