import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AIProvider, AIProviderFactory, AIPrompt, AIResponse, EventPublisher, GenerationCache, Result } from "@/lib/generation/contracts";
import { success, failure } from "@/lib/generation/infrastructure/helpers/result";
import { MockProvider } from "@/lib/generation/providers/providers/mock-provider";
import { DeepSeekProvider } from "@/lib/generation/providers/providers/deepseek-provider";
import { OpenAIProvider } from "@/lib/generation/providers/providers/openai-provider";
import { AnthropicProvider } from "@/lib/generation/providers/providers/anthropic-provider";
import { GoogleProvider } from "@/lib/generation/providers/providers/google-provider";
import { OllamaProvider } from "@/lib/generation/providers/providers/ollama-provider";
import { BaseProvider } from "@/lib/generation/providers/shared/base-provider";
import {
  PROVIDER_PRIORITY, MODEL_CAPABILITIES, getModelCapability, estimateTokens, hashPrompt,
} from "@/lib/generation/providers/shared/provider-types";
import {
  ProviderTimeoutError, ProviderAuthError, ProviderRateLimitError,
  ProviderUnavailableError, ProviderModelNotFoundError,
} from "@/lib/generation/providers/shared/provider-errors";
import { countPromptTokens, countResponseTokens, truncatePrompt } from "@/lib/generation/providers/shared/provider-utils";
import { ProviderRateLimiter } from "@/lib/generation/providers/provider-rate-limiter";
import { ProviderHealthTracker } from "@/lib/generation/providers/provider-health";
import { ProviderCostEstimator } from "@/lib/generation/providers/provider-cost-estimator";
import { ProviderCache } from "@/lib/generation/providers/provider-cache";
import { ProviderFallback, PROVIDER_EVENTS } from "@/lib/generation/providers/provider-fallback";
import { ProviderRouter } from "@/lib/generation/providers/provider-router";
import { ProviderManager } from "@/lib/generation/providers/provider-manager";

const testPrompt: AIPrompt = {
  system: "You are a helpful assistant.",
  messages: [{ role: "user", content: "Hello" }],
};

// ===================== Provider Types & Utils =====================
describe("Provider types & utils", () => {
  it("has correct provider priority order", () => {
    expect(PROVIDER_PRIORITY).toEqual(["cache", "deepseek", "ollama", "google", "openai", "anthropic", "mock"]);
  });

  it("getModelCapability returns model info", () => {
    const cap = getModelCapability("gpt-4o");
    expect(cap).not.toBeNull();
    expect(cap!.provider).toBe("openai");
    expect(cap!.costPerInputToken).toBe(0.0000025);
  });

  it("getModelCapability returns null for unknown", () => {
    expect(getModelCapability("unknown")).toBeNull();
  });

  it("estimateTokens calculates token count", () => {
    expect(estimateTokens("hello")).toBe(2);
    expect(estimateTokens("")).toBe(0);
  });

  it("hashPrompt produces consistent hashes", () => {
    const h1 = hashPrompt(testPrompt);
    const h2 = hashPrompt(testPrompt);
    expect(h1).toBe(h2);
  });

  it("hashPrompt changes with different content", () => {
    const h1 = hashPrompt(testPrompt);
    const h2 = hashPrompt({ ...testPrompt, system: "Different" });
    expect(h1).not.toBe(h2);
  });

  it("MODEL_CAPABILITIES has all expected models", () => {
    expect(MODEL_CAPABILITIES["deepseek-chat"]).toBeDefined();
    expect(MODEL_CAPABILITIES["gpt-4o"]).toBeDefined();
    expect(MODEL_CAPABILITIES["gpt-4o-mini"]).toBeDefined();
    expect(MODEL_CAPABILITIES["claude-3-5-sonnet"]).toBeDefined();
    expect(MODEL_CAPABILITIES["claude-3-haiku"]).toBeDefined();
    expect(MODEL_CAPABILITIES["gemini-1.5-pro"]).toBeDefined();
    expect(MODEL_CAPABILITIES["gemini-1.5-flash"]).toBeDefined();
    expect(MODEL_CAPABILITIES["ollama/llama3"]).toBeDefined();
    expect(MODEL_CAPABILITIES["mock-model"]).toBeDefined();
  });
});

// ===================== Provider Errors =====================
describe("Provider errors", () => {
  it("ProviderTimeoutError has correct name", () => {
    const err = new ProviderTimeoutError("deepseek", 5000);
    expect(err.name).toBe("ProviderTimeoutError");
    expect(err.provider).toBe("deepseek");
  });

  it("ProviderAuthError has correct name", () => {
    const err = new ProviderAuthError("openai");
    expect(err.name).toBe("ProviderAuthError");
  });

  it("ProviderRateLimitError has retryAfterMs", () => {
    const err = new ProviderRateLimitError("openai", 30000);
    expect(err.retryAfterMs).toBe(30000);
  });

  it("ProviderUnavailableError has correct name", () => {
    const err = new ProviderUnavailableError("ollama");
    expect(err.name).toBe("ProviderUnavailableError");
  });

  it("ProviderModelNotFoundError has model field", () => {
    const err = new ProviderModelNotFoundError("openai", "gpt-5");
    expect(err.model).toBe("gpt-5");
  });
});

// ===================== Prompt Utils =====================
describe("Prompt utils", () => {
  it("countPromptTokens calculates tokens", () => {
    const count = countPromptTokens(testPrompt);
    expect(count).toBeGreaterThan(0);
  });

  it("countResponseTokens calculates tokens", () => {
    expect(countResponseTokens("Hello world")).toBe(3);
  });

  it("truncatePrompt returns unchanged when under limit", () => {
    const result = truncatePrompt(testPrompt, 10000);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.content).toBe("Hello");
  });
});

// ===================== Mock Provider =====================
describe("MockProvider", () => {
  let provider: MockProvider;

  beforeEach(() => {
    provider = new MockProvider();
  });

  it("has correct name", () => {
    expect(provider.name).toBe("mock");
  });

  it("generates responses", async () => {
    const result = await provider.generate(testPrompt);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toContain("Mock response");
    }
  });

  it("generates JSON responses", async () => {
    const result = await provider.generate({ ...testPrompt, responseFormat: "json_object" });
    if (result.success) {
      const parsed = JSON.parse(result.data.content);
      expect(parsed.status).toBe("ok");
    }
  });

  it("estimateCost returns 0", () => {
    expect(provider.estimateCost(testPrompt)).toBe(0);
  });

  it("supportsModel works", () => {
    expect(provider.supportsModel("mock-model")).toBe(true);
    expect(provider.supportsModel("gpt-4o")).toBe(false);
  });

  it("maxContext returns correct value", () => {
    expect(provider.maxContext()).toBe(4096);
  });

  it("returns health", async () => {
    const result = await provider.health();
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.ok).toBe(true);
  });
});

// ===================== Rate Limiter =====================
describe("ProviderRateLimiter", () => {
  let limiter: ProviderRateLimiter;

  beforeEach(() => {
    limiter = new ProviderRateLimiter(3, 60000);
  });

  it("allows requests within limit", async () => {
    expect(await limiter.check("test")).toBe(true);
    expect(await limiter.check("test")).toBe(true);
    expect(await limiter.check("test")).toBe(true);
  });

  it("blocks requests beyond limit", async () => {
    await limiter.check("test");
    await limiter.check("test");
    await limiter.check("test");
    expect(await limiter.check("test")).toBe(false);
  });

  it("resets limit for different keys", async () => {
    await limiter.check("a");
    await limiter.check("a");
    await limiter.check("a");
    expect(await limiter.check("b")).toBe(true);
  });

  it("reset clears limits", async () => {
    await limiter.check("test");
    await limiter.check("test");
    await limiter.check("test");
    limiter.reset("test");
    expect(await limiter.check("test")).toBe(true);
  });

  it("reset all clears all limits", async () => {
    await limiter.check("a"); await limiter.check("a"); await limiter.check("a");
    limiter.reset();
    expect(await limiter.check("a")).toBe(true);
  });

  it("enqueue waits for slot", async () => {
    const limiter2 = new ProviderRateLimiter(1, 60000);
    await limiter2.check("test");
    const promise = limiter2.enqueue("test", 100);
    limiter2.releaseSlot("test");
    expect(await promise).toBe(true);
  });

  it("enqueue times out", async () => {
    const limiter2 = new ProviderRateLimiter(1, 60000);
    await limiter2.check("test");
    const result = await limiter2.enqueue("test", 50);
    expect(result).toBe(false);
  });
});

// ===================== Health Tracker =====================
describe("ProviderHealthTracker", () => {
  let health: ProviderHealthTracker;

  beforeEach(() => {
    health = new ProviderHealthTracker();
  });

  it("starts unavailable by default", () => {
    expect(health.isAvailable("unknown")).toBe(true);
  });

  it("records success", () => {
    health.recordSuccess("deepseek", 100, 50, 0.01);
    const stats = health.getStats("deepseek");
    expect(stats).not.toBeNull();
    expect(stats!.totalRequests).toBe(1);
    expect(stats!.available).toBe(true);
  });

  it("records failure", () => {
    health.recordFailure("deepseek");
    const stats = health.getStats("deepseek");
    expect(stats).not.toBeNull();
    expect(stats!.available).toBe(false);
    expect(stats!.failures).toBe(1);
    expect(stats!.totalRequests).toBe(1);
  });

  it("getAllStats returns all providers", () => {
    health.recordSuccess("a", 10, 0, 0);
    health.recordSuccess("b", 20, 0, 0);
    expect(health.getAllStats()).toHaveLength(2);
  });

  it("refreshHealth tracks provider health", async () => {
    const provider = new MockProvider();
    await health.refreshHealth(provider);
    const stats = health.getStats("mock");
    expect(stats).not.toBeNull();
  });

  it("reset clears stats", () => {
    health.recordSuccess("a", 10, 0, 0);
    health.reset("a");
    expect(health.getStats("a")).toBeNull();
  });

  it("reset all clears all", () => {
    health.recordSuccess("a", 10, 0, 0);
    health.recordSuccess("b", 20, 0, 0);
    health.reset();
    expect(health.getAllStats()).toHaveLength(0);
  });
});

// ===================== Cost Estimator =====================
describe("ProviderCostEstimator", () => {
  let estimator: ProviderCostEstimator;

  beforeEach(() => {
    estimator = new ProviderCostEstimator();
  });

  it("estimates cost for known model", () => {
    const cost = estimator.estimate(testPrompt, "gpt-4o-mini", "openai");
    expect(cost.totalCost).toBeGreaterThan(0);
    expect(cost.providerName).toBe("openai");
  });

  it("returns zero for unknown model", () => {
    const cost = estimator.estimate(testPrompt, "unknown", "test");
    expect(cost.totalCost).toBe(0);
  });

  it("compares providers by cost", () => {
    const costs = estimator.compareProviders(testPrompt, [
      { model: "gpt-4o", provider: "openai" },
      { model: "gpt-4o-mini", provider: "openai" },
    ]);
    expect(costs).toHaveLength(2);
    expect(costs[0]!.totalCost).toBeLessThanOrEqual(costs[1]!.totalCost);
  });
});

// ===================== Provider Cache =====================
describe("ProviderCache", () => {
  let cache: ProviderCache;
  let genCache: GenerationCache;
  let provider: MockProvider;

  beforeEach(() => {
    const store = new Map<string, any>();
    genCache = {
      get: vi.fn(async (k: string) => success(store.get(k) ?? null)),
      set: vi.fn(async (k: string, v: any) => { store.set(k, v); return success(undefined); }),
      invalidate: vi.fn(async (k: string) => { store.delete(k); return success(undefined); }),
      invalidateByPattern: vi.fn(async () => success(undefined)),
      exists: vi.fn(async (k: string) => success(store.has(k))),
    };
    cache = new ProviderCache(genCache);
    provider = new MockProvider();
  });

  it("misses cache on first call", async () => {
    const result = await cache.getOrGenerate(provider, testPrompt, { cacheKey: "test" });
    expect(result.success).toBe(true);
    expect(cache.getStats().misses).toBe(1);
  });

  it("hits cache on second call", async () => {
    await cache.getOrGenerate(provider, testPrompt, { cacheKey: "test" });
    const result = await cache.getOrGenerate(provider, testPrompt, { cacheKey: "test" });
    if (result.success) expect(result.data.cached).toBe(true);
    expect(cache.getStats().hits).toBe(1);
  });

  it("getCached returns null for missing", async () => {
    const result = await cache.getCached(provider, testPrompt);
    if (result.success) expect(result.data).toBeNull();
  });

  it("invalidate by provider", async () => {
    await cache.getOrGenerate(provider, testPrompt, { cacheKey: "test" });
    await cache.invalidate("mock");
    const stats = cache.getStats();
    expect(stats.hits).toBe(0);
  });

  it("resetStats clears counters", () => {
    cache.getStats();
    cache.resetStats();
    const stats = cache.getStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });
});

// ===================== Provider Fallback =====================
describe("ProviderFallback", () => {
  let fallback: ProviderFallback;
  let events: EventPublisher;

  beforeEach(() => {
    events = { publish: vi.fn().mockResolvedValue(success(undefined)) };
    fallback = new ProviderFallback(events);
  });

  it("returns first successful provider", async () => {
    const providers = [new MockProvider(), new MockProvider()];
    const result = await fallback.executeWithFallback(providers, testPrompt);
    expect(result.success).toBe(true);
  });

  it("falls back on failure", async () => {
    const failingProvider: AIProvider = {
      name: "failing", supportsStreaming: false, supportsJsonMode: false,
      generate: async () => failure(new Error("fail")),
      estimateCost: () => 0,
      health: async () => success({ ok: false, latencyMs: 0 }),
    };
    const providers = [failingProvider, new MockProvider()];
    const result = await fallback.executeWithFallback(providers, testPrompt);
    expect(result.success).toBe(true);
    expect(events.publish).toHaveBeenCalledWith("provider.fallback", expect.any(Object));
  });

  it("fails when all providers fail", async () => {
    const failing: AIProvider = {
      name: "fail", supportsStreaming: false, supportsJsonMode: false,
      generate: async () => failure(new Error("fail")),
      estimateCost: () => 0,
      health: async () => success({ ok: false, latencyMs: 0 }),
    };
    const result = await fallback.executeWithFallback([failing, failing], testPrompt);
    expect(result.success).toBe(false);
  });

  it("has correct event constants", () => {
    expect(PROVIDER_EVENTS.SELECTED).toBe("provider.selected");
    expect(PROVIDER_EVENTS.FAILED).toBe("provider.failed");
    expect(PROVIDER_EVENTS.FALLBACK).toBe("provider.fallback");
    expect(PROVIDER_EVENTS.CACHED).toBe("provider.cached");
    expect(PROVIDER_EVENTS.RATE_LIMITED).toBe("provider.rate_limited");
  });
});

// ===================== Provider Router =====================
describe("ProviderRouter", () => {
  let router: ProviderRouter;
  let factory: AIProviderFactory;
  let events: EventPublisher;

  beforeEach(() => {
    const mock = new MockProvider();
    factory = {
      register: vi.fn(),
      create: vi.fn().mockReturnValue(mock),
      getDefault: vi.fn().mockReturnValue(mock),
      list: vi.fn().mockReturnValue(["mock"]),
    };
    events = { publish: vi.fn().mockResolvedValue(success(undefined)) };
    router = new ProviderRouter(factory, events);
  });

  it("routes to available provider", async () => {
    const result = await router.route(testPrompt);
    expect(result.success).toBe(true);
  });

  it("uses preferred provider", async () => {
    const result = await router.route(testPrompt, undefined, "mock");
    expect(result.success).toBe(true);
  });
});

// ===================== Provider Manager =====================
describe("ProviderManager", () => {
  let manager: ProviderManager;
  let factory: AIProviderFactory;
  let events: EventPublisher;
  let genCache: GenerationCache;

  beforeEach(() => {
    const mock = new MockProvider();
    factory = {
      register: vi.fn(),
      create: vi.fn().mockReturnValue(mock),
      getDefault: vi.fn().mockReturnValue(mock),
      list: vi.fn().mockReturnValue(["mock"]),
    };
    events = { publish: vi.fn().mockResolvedValue(success(undefined)) };
    genCache = {
      get: vi.fn(async () => success(null)),
      set: vi.fn(async () => success(undefined)),
      invalidate: vi.fn(async () => success(undefined)),
      invalidateByPattern: vi.fn(async () => success(undefined)),
      exists: vi.fn(async () => success(false)),
    };
    manager = new ProviderManager(factory, events, genCache);
  });

  it("generates response", async () => {
    const result = await manager.generate(testPrompt);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.content).toContain("Mock response");
  });

  it("generates with cache", async () => {
    const provider = new MockProvider();
    const result = await manager.generateWithCache(provider, testPrompt, { cacheKey: "test" });
    expect(result.success).toBe(true);
  });

  it("estimates cost", () => {
    const cost = manager.estimateCost(testPrompt, "mock-model", "mock");
    expect(cost.totalCost).toBe(0);
  });

  it("compares costs", () => {
    manager.registerProvider("mock", new MockProvider());
    const costs = manager.compareCosts(testPrompt);
    expect(Array.isArray(costs)).toBe(true);
  });

  it("gets health stats", () => {
    const health = manager.getHealth();
    expect(Array.isArray(health)).toBe(true);
  });

  it("gets cache stats", () => {
    const stats = manager.getCacheStats();
    expect(stats.hitRate).toBe(0);
  });

  it("refreshes health", async () => {
    await manager.refreshHealth();
    const health = manager.getHealth();
    expect(health.length).toBeGreaterThanOrEqual(0);
  });

  it("registers provider", () => {
    manager.registerProvider("custom", new MockProvider());
    expect(factory.register).toHaveBeenCalledWith("custom", expect.any(MockProvider));
  });
});

// ===================== Concrete Providers =====================
describe("DeepSeekProvider", () => {
  it("fails without API key", async () => {
    const provider = new DeepSeekProvider();
    const result = await provider.generate(testPrompt);
    expect(result.success).toBe(false);
  });

  it("has correct name", () => {
    expect(new DeepSeekProvider().name).toBe("deepseek");
  });
});

describe("OpenAIProvider", () => {
  it("fails without API key", async () => {
    const provider = new OpenAIProvider();
    const result = await provider.generate(testPrompt);
    expect(result.success).toBe(false);
  });

  it("estimates cost for mini model", () => {
    const provider = new OpenAIProvider({ model: "gpt-4o-mini" });
    expect(provider.estimateCost(testPrompt)).toBeGreaterThan(0);
  });
});

describe("AnthropicProvider", () => {
  it("fails without API key", async () => {
    const provider = new AnthropicProvider();
    const result = await provider.generate(testPrompt);
    expect(result.success).toBe(false);
  });

  it("has correct name", () => {
    expect(new AnthropicProvider().name).toBe("anthropic");
  });
});

describe("GoogleProvider", () => {
  it("fails without API key", async () => {
    const provider = new GoogleProvider();
    const result = await provider.generate(testPrompt);
    expect(result.success).toBe(false);
  });

  it("has correct name", () => {
    expect(new GoogleProvider().name).toBe("google");
  });
});

describe("OllamaProvider", () => {
  it("has correct name", () => {
    expect(new OllamaProvider().name).toBe("ollama");
  });
});

// ===================== Provider Integration =====================
describe("Provider integration scenarios", () => {
  it("cache + fallback flow", async () => {
    const events = { publish: vi.fn().mockResolvedValue(success(undefined)) };
    const failingProvider: AIProvider = {
      name: "fail", supportsStreaming: false, supportsJsonMode: false,
      generate: async () => failure(new Error("fail")),
      estimateCost: () => 0,
      health: async () => success({ ok: false, latencyMs: 0 }),
    };
    const fallback = new ProviderFallback(events);
    const result = await fallback.executeWithFallback([failingProvider, new MockProvider()], testPrompt);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.content).toContain("Mock response");
  });

  it("rate limiter with health tracking", async () => {
    const limiter = new ProviderRateLimiter(1, 60000);
    const health = new ProviderHealthTracker();

    await limiter.check("test");
    expect(await limiter.check("test")).toBe(false);

    health.recordSuccess("mock", 10, 0, 0);
    expect(health.getStats("mock")!.totalRequests).toBe(1);
  });

  it("MockProvider generates theme response", async () => {
    const provider = new MockProvider();
    const result = await provider.generate({ ...testPrompt, system: "Generate theme colors" });
    if (result.success) {
      const parsed = JSON.parse(result.data.content);
      expect(parsed.primary).toBeDefined();
    }
  });

  it("MockProvider generates SEO description", async () => {
    const provider = new MockProvider();
    const result = await provider.generate({ ...testPrompt, system: "Generate SEO description" });
    if (result.success) expect(result.data.content).toContain("SEO");
  });

  it("BaseProvider health returns ok", async () => {
    class TestProvider extends BaseProvider {
      name = "test";
      supportsStreaming = false;
      supportsJsonMode = false;
      model = "mock-model";
      async generate() { return success(this.buildResponse("ok", "test", 0)); }
    }
    const provider = new TestProvider();
    expect(provider.maxContext()).toBe(4096);
    expect(provider.supportsModel("mock-model")).toBe(true);
    expect(provider.estimateCost(testPrompt)).toBe(0);
  });
});
