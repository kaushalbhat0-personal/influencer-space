import type { AIProvider, AIPrompt, AIOptions, AIResponse } from "@/lib/generation/contracts";
import type { GenerationCache } from "@/lib/generation/contracts";
import { success } from "../infrastructure/helpers/result";
import { hashPrompt } from "./shared/provider-types";

export class ProviderCache {
  private hits = 0;
  private misses = 0;

  constructor(
    private cache: GenerationCache,
    private defaultTTLMs: number = 300000,
  ) {}

  async getOrGenerate(
    provider: AIProvider,
    prompt: AIPrompt,
    options?: AIOptions,
  ) {
    const cacheKey = this.buildCacheKey(provider, prompt, options);

    if (options?.cacheKey) {
      const cached = await this.cache.get<AIResponse>(`prompt:${cacheKey}`);
      if (cached.success && cached.data) {
        this.hits++;
        return success({ ...cached.data, cached: true });
      }
    }

    this.misses++;
    const result = await provider.generate(prompt, options);
    if (result.success && options?.cacheKey) {
      const ttl = options?.cacheTTL ?? this.defaultTTLMs;
      await this.cache.set(`prompt:${cacheKey}`, result.data, ttl);
    }

    return result;
  }

  async getCached(
    provider: AIProvider,
    prompt: AIPrompt,
    options?: AIOptions,
  ) {
    const cacheKey = this.buildCacheKey(provider, prompt, options);
    const cached = await this.cache.get<AIResponse>(`prompt:${cacheKey}`);
    if (cached.success && cached.data) {
      this.hits++;
      return success({ ...cached.data, cached: true });
    }
    this.misses++;
    return success(null);
  }

  async invalidate(providerName: string) {
    return this.cache.invalidateByPattern(`prompt:${providerName}:*`);
  }

  async clear() {
    return this.cache.invalidateByPattern("prompt:*");
  }

  getStats(): { hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  private buildCacheKey(provider: AIProvider, prompt: AIPrompt, options?: AIOptions): string {
    return `${provider.name}:${hashPrompt(prompt, options)}`;
  }
}
