/**
 * Enrichment provider bootstrap — IMPLEMENTATION-32.
 *
 * Wires the onboarding pipeline into the EXISTING generation provider
 * infrastructure (ProviderManager -> ProviderRouter -> ProviderFallback ->
 * ProviderRateLimiter -> ProviderHealth -> ProviderCostEstimator). Providers are
 * registered from env keys; when no provider has a key, enrichment is skipped
 * (deterministic pipeline continues). Never registers MockProvider (its canned
 * output would fabricate profile data).
 */
import { ProviderManager, getModelCapability, hashPrompt, PROVIDER_PRIORITY } from "@/lib/generation/providers";
import { DeepSeekProvider, GoogleProvider, OpenAIProvider, AnthropicProvider, OllamaProvider } from "@/lib/generation/providers";
import { ProviderRegistry, InMemoryGenerationCache, InProcessEventPublisher } from "@/lib/generation/infrastructure";
import type { AIPrompt, AIOptions, GenerationCache, AIResponse } from "@/lib/generation/contracts";

export interface EnrichmentCall {
  ok: boolean;
  provider: string | null;
  model: string | null;
  content: string | null;
  latencyMs: number;
  cost: number;
  cacheHit: boolean;
  error: string | null;
}

let managerInstance: ProviderManager | null | undefined;
let factoryInstance: ProviderRegistry | null = null;
let cacheInstance: InMemoryGenerationCache | null = null;

function buildManager(): ProviderManager | null {
  if (managerInstance !== undefined) return managerInstance;

  const env = process.env ?? {};
  const factory = new ProviderRegistry();
  if (env.DEEPSEEK_API_KEY) factory.register("deepseek", new DeepSeekProvider({ apiKey: env.DEEPSEEK_API_KEY }));
  if (env.GEMINI_API_KEY || env.GOOGLE_API_KEY) {
    factory.register("google", new GoogleProvider({ apiKey: env.GEMINI_API_KEY || env.GOOGLE_API_KEY }));
  }
  if (env.OPENAI_API_KEY) factory.register("openai", new OpenAIProvider({ apiKey: env.OPENAI_API_KEY }));
  if (env.ANTHROPIC_API_KEY) factory.register("anthropic", new AnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY }));
  if (env.OLLAMA_BASE_URL) factory.register("ollama", new OllamaProvider({ baseUrl: env.OLLAMA_BASE_URL }));

  if (factory.list().length === 0) {
    managerInstance = null; // no credentials -> deterministic-only
    return null;
  }

  factoryInstance = factory;
  cacheInstance = new InMemoryGenerationCache();
  managerInstance = new ProviderManager(factory, new InProcessEventPublisher(), cacheInstance);
  return managerInstance;
}

/** First provider the router would try (existing PROVIDER_PRIORITY, minus cache). */
function firstProviderName(): string | null {
  if (!factoryInstance) return null;
  return PROVIDER_PRIORITY.find((name) => name !== "cache" && factoryInstance?.list().includes(name)) ?? null;
}

/** Persist a cache entry with the SAME key format the router reads. */
async function writeThroughCache(prompt: AIPrompt, options: AIOptions, data: AIResponse, cache: GenerationCache | null, providerName: string | null): Promise<void> {
  if (!providerName || !cache || !options.cacheKey) return;
  const key = `prompt:${providerName}:${hashPrompt(prompt, options)}`;
  const ttl = options.cacheTTL ?? 300000;
  await cache.set<AIResponse>(key, data, ttl);
}

/** Provider priority is the existing default: deepseek -> google -> openai -> anthropic. */
export function getEnrichmentManager(): ProviderManager | null {
  return buildManager();
}

export function hasEnrichmentProviders(): boolean {
  return buildManager() !== null;
}

/** Execute one call through a SPECIFIC manager (test seam for routing/cache). */
export async function executeWithManager(
  manager: ProviderManager,
  prompt: AIPrompt,
  options: AIOptions,
  cache?: GenerationCache | null,
  cacheProviderName?: string | null,
): Promise<EnrichmentCall> {
  const started = Date.now();
  try {
    const result = await manager.generate(prompt, options);
    if (result.success) {
      const data = result.data as AIResponse;
      const model = data.model;
      // Write-through so the built-in ProviderCache actually short-circuits
      // duplicate enrichment (the existing router only READS the cache).
      if (!data.cached) await writeThroughCache(prompt, options, data, cache ?? null, cacheProviderName ?? null);
      return {
        ok: true,
        provider: model ? (getModelCapability(model)?.provider ?? null) : null,
        model,
        content: data.content,
        latencyMs: data.latencyMs ?? Date.now() - started,
        cost: data.cost ?? 0,
        cacheHit: data.cached ?? false,
        error: null,
      };
    }
    return { ok: false, provider: null, model: null, content: null, latencyMs: Date.now() - started, cost: 0, cacheHit: false, error: result.error instanceof Error ? result.error.message : String(result.error) };
  } catch (error) {
    return { ok: false, provider: null, model: null, content: null, latencyMs: Date.now() - started, cost: 0, cacheHit: false, error: error instanceof Error ? error.message : "unknown" };
  }
}

/**
 * Execute ONE enrichment call through the existing provider system. The cache
 * key enables the built-in ProviderCache (reused — no duplicate cache).
 */
export async function executeEnrichmentCall(prompt: AIPrompt, options: AIOptions): Promise<EnrichmentCall> {
  const manager = buildManager();
  if (!manager) {
    return { ok: false, provider: null, model: null, content: null, latencyMs: 0, cost: 0, cacheHit: false, error: "no_providers" };
  }
  return executeWithManager(manager, prompt, options, cacheInstance, firstProviderName());
}
