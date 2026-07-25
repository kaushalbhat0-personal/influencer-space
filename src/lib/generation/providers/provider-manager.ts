import type { AIProvider, AIProviderFactory, AIPrompt, AIOptions } from "@/lib/generation/contracts";
import type { GenerationStrategy, GenerationCache, EventPublisher } from "@/lib/generation/contracts";
import { ProviderRouter } from "./provider-router";
import { ProviderRateLimiter } from "./provider-rate-limiter";
import { ProviderHealthTracker } from "./provider-health";
import { ProviderCostEstimator } from "./provider-cost-estimator";
import type { CostBreakdown } from "./provider-cost-estimator";
import { ProviderCache } from "./provider-cache";
import { ProviderFallback } from "./provider-fallback";
import type { ProviderStats } from "./shared/provider-types";

export class ProviderManager {
  private router: ProviderRouter;
  private rateLimiter: ProviderRateLimiter;
  private health: ProviderHealthTracker;
  private costEstimator: ProviderCostEstimator;
  private providerCache: ProviderCache;
  private fallback: ProviderFallback;

  constructor(
    private providerFactory: AIProviderFactory,
    private events: EventPublisher,
    private generationCache: GenerationCache,
  ) {
    this.rateLimiter = new ProviderRateLimiter();
    this.health = new ProviderHealthTracker();
    this.costEstimator = new ProviderCostEstimator();
    this.providerCache = new ProviderCache(generationCache);
    this.fallback = new ProviderFallback(events);
    this.router = new ProviderRouter(
      providerFactory,
      events,
      this.rateLimiter,
      this.health,
      this.costEstimator,
      this.providerCache,
      this.fallback,
    );
  }

  async generate(
    prompt: AIPrompt,
    options?: AIOptions,
    preferredProvider?: string,
    strategy?: GenerationStrategy,
  ) {
    const result = await this.router.route(prompt, options, preferredProvider, strategy);
    if (result.success) return result;

    return this.fallback.executeWithFallback(this.getAllProviders(), prompt, options);
  }

  async generateWithCache(
    provider: AIProvider,
    prompt: AIPrompt,
    options?: AIOptions,
  ) {
    return this.providerCache.getOrGenerate(provider, prompt, options);
  }

  estimateCost(prompt: AIPrompt, model: string, providerName: string): CostBreakdown {
    return this.costEstimator.estimate(prompt, model, providerName);
  }

  compareCosts(prompt: AIPrompt): CostBreakdown[] {
    const models = this.getAllProviders().flatMap((p) => [{ model: (p as unknown as Record<string, string>).model ?? p.name, provider: p.name }]);
    return this.costEstimator.compareProviders(prompt, models);
  }

  getHealth(): ProviderStats[] {
    return this.health.getAllStats();
  }

  getProviderHealth(name: string): ProviderStats | null {
    return this.health.getStats(name);
  }

  async refreshHealth(): Promise<void> {
    for (const provider of this.getAllProviders()) {
      await this.health.refreshHealth(provider);
    }
  }

  getCacheStats(): { hits: number; misses: number; hitRate: number } {
    return this.providerCache.getStats();
  }

  async clearCache() {
    return this.providerCache.clear();
  }

  registerProvider(name: string, provider: AIProvider): void {
    this.providerFactory.register(name, provider);
  }

  private getAllProviders(): AIProvider[] {
    return this.providerFactory.list()
      .map((name) => {
        try { return this.providerFactory.create(name); } catch { return null; }
      })
      .filter((p): p is AIProvider => p !== null);
  }
}
