import type { GenerationCache } from "@/lib/generation/contracts";
import type { KnowledgeGraph } from "./types";

export class IntelligenceCache {
  constructor(
    private cache: GenerationCache,
    private ttlMs: number = 300000,
  ) {}

  async get(sourceKey: string): Promise<KnowledgeGraph | null> {
    const result = await this.cache.get<KnowledgeGraph>(`intel:${sourceKey}`);
    if (result.success && result.data) return result.data;
    return null;
  }

  async set(sourceKey: string, graph: KnowledgeGraph): Promise<void> {
    await this.cache.set(`intel:${sourceKey}`, graph, this.ttlMs);
  }

  async invalidate(sourceKey: string): Promise<void> {
    await this.cache.invalidate(`intel:${sourceKey}`);
  }

  async invalidateAll(): Promise<void> {
    await this.cache.invalidateByPattern("intel:*");
  }
}
