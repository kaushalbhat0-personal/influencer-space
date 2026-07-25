import type { GenerationCache } from "@/lib/generation/contracts";
import type { WebsiteBlueprint } from "./types";

export class BlueprintCache {
  constructor(
    private cache: GenerationCache,
    private ttlMs: number = 300000,
  ) {}

  async get(sourceKey: string): Promise<WebsiteBlueprint | null> {
    const result = await this.cache.get<WebsiteBlueprint>(`bp:${sourceKey}`);
    if (result.success && result.data) return result.data;
    return null;
  }

  async set(sourceKey: string, blueprint: WebsiteBlueprint): Promise<void> {
    await this.cache.set(`bp:${sourceKey}`, blueprint, this.ttlMs);
  }

  async invalidate(sourceKey: string): Promise<void> {
    await this.cache.invalidate(`bp:${sourceKey}`);
  }

  async invalidateAll(): Promise<void> {
    await this.cache.invalidateByPattern("bp:*");
  }
}
