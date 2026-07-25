import type { AIProvider, AIProviderFactory } from "@/lib/generation/contracts";
import type { GenerationStrategy } from "@/lib/generation/contracts";
import type { TieredGenerationStrategy } from "@/lib/generation/strategies";
import { PROVIDER_PRIORITY } from "./shared/provider-types";
import { ProviderRateLimiter } from "./provider-rate-limiter";
import { ProviderHealthTracker } from "./provider-health";
import { ProviderCostEstimator } from "./provider-cost-estimator";
import { ProviderCache } from "./provider-cache";
import { ProviderFallback, PROVIDER_EVENTS } from "./provider-fallback";
import type { GenerationCache, EventPublisher } from "@/lib/generation/contracts";
import type { AIPrompt, AIOptions } from "@/lib/generation/contracts";
import { success } from "../infrastructure/helpers/result";

export class ProviderRouter {
  private rateLimiter: ProviderRateLimiter;
  private health: ProviderHealthTracker;
  private costEstimator: ProviderCostEstimator;
  private cache: ProviderCache;
  private fallback: ProviderFallback;

  constructor(
    private providerFactory: AIProviderFactory,
    private events: EventPublisher,
    rateLimiter?: ProviderRateLimiter,
    health?: ProviderHealthTracker,
    costEstimator?: ProviderCostEstimator,
    cache?: ProviderCache,
    fallback?: ProviderFallback,
  ) {
    this.rateLimiter = rateLimiter ?? new ProviderRateLimiter();
    this.health = health ?? new ProviderHealthTracker();
    this.costEstimator = costEstimator ?? new ProviderCostEstimator();
    this.cache = cache ?? new ProviderCache(ProviderRouter.nullCache());
    this.fallback = fallback ?? new ProviderFallback(events);
  }

  private static nullCache(): GenerationCache {
    return {
      get: async () => success(null),
      set: async () => success(undefined),
      invalidate: async () => success(undefined),
      invalidateByPattern: async () => success(undefined),
      exists: async () => success(false),
    };
  }

  async route(
    prompt: AIPrompt,
    options?: AIOptions,
    preferredProvider?: string,
    strategy?: GenerationStrategy,
  ) {
    const available = this.getAvailableProviders(preferredProvider, strategy);

    if (available.length === 0) {
      return this.fallback.executeWithFallback(this.getAllProviders(), prompt, options);
    }

    const cacheResult = await this.tryCache(available[0]!, prompt, options);
    if (cacheResult) return cacheResult;

    const rateKey = `provider:${available[0]!.name}`;
    const allowed = await this.rateLimiter.check(rateKey);
    if (!allowed) {
      await this.publishEvent(PROVIDER_EVENTS.FALLBACK, {
        fromProvider: available[0]!.name,
        reason: "rate_limited",
        timestamp: new Date().toISOString(),
      });
      return this.fallback.executeWithFallback(available, prompt, options);
    }

    return this.executeWithHealthTracking(available[0]!, prompt, options);
  }

  private async tryCache(
    provider: AIProvider,
    prompt: AIPrompt,
    options?: AIOptions,
  ) {
    try {
      const cached = await this.cache.getCached(provider, prompt, options);
      if (cached.success && cached.data) {
        await this.publishEvent("provider.cached", {
          provider: provider.name,
          timestamp: new Date().toISOString(),
        });
        return success(cached.data);
      }
    } catch {}
    return null;
  }

  private async executeWithHealthTracking(
    provider: AIProvider,
    prompt: AIPrompt,
    options?: AIOptions,
  ) {
    const start = Date.now();
    const result = await provider.generate(prompt, options);
    const latency = Date.now() - start;

    if (result.success) {
      this.health.recordSuccess(
        provider.name,
        latency,
        result.data.tokenUsage.total,
        result.data.cost,
      );
    } else {
      this.health.recordFailure(provider.name);
    }

    return result;
  }

  private getAvailableProviders(preferred?: string, strategy?: GenerationStrategy): AIProvider[] {
    const priority = (strategy as TieredGenerationStrategy)?.providerPriority ?? PROVIDER_PRIORITY;
    const names = preferred
      ? [preferred, ...priority.filter((p: string) => p !== preferred && p !== "cache")]
      : priority.filter((p: string) => p !== "cache");

    const providers: AIProvider[] = [];
    for (const name of names) {
      try {
        const provider = this.providerFactory.create(name);
        if (provider && this.health.isAvailable(name)) {
          providers.push(provider);
        }
      } catch {}
    }
    return providers;
  }

  private getAllProviders(): AIProvider[] {
    const providers: AIProvider[] = [];
    for (const name of this.providerFactory.list()) {
      try {
        const provider = this.providerFactory.create(name);
        if (provider) providers.push(provider);
      } catch {}
    }
    return providers;
  }

  private async publishEvent(eventType: string, payload: Record<string, unknown>): Promise<void> {
    try { await this.events.publish(eventType, payload); } catch {}
  }
}
