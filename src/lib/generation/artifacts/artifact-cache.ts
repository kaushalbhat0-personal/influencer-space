import type { GenerationCache } from "@/lib/generation/contracts";
import type { Artifact } from "./types";
import { computeChecksum } from "./types";

export class ArtifactCache {
  constructor(
    private cache: GenerationCache,
    private ttlMs: number = 300000,
  ) {}

  async get(blueprint: { website: unknown; pages: unknown; sections: unknown; products: unknown }): Promise<Artifact[] | null> {
    const key = this.buildKey(blueprint);
    const result = await this.cache.get<Artifact[]>(`artifacts:${key}`);
    if (result.success && result.data) return result.data;
    return null;
  }

  async set(blueprint: { website: unknown; pages: unknown; sections: unknown; products: unknown }, artifacts: Artifact[]): Promise<void> {
    const key = this.buildKey(blueprint);
    await this.cache.set(`artifacts:${key}`, artifacts, this.ttlMs);
  }

  async invalidate(blueprint: { website: unknown; pages: unknown; sections: unknown; products: unknown }): Promise<void> {
    const key = this.buildKey(blueprint);
    await this.cache.invalidate(`artifacts:${key}`);
  }

  async invalidateAll(): Promise<void> {
    await this.cache.invalidateByPattern("artifacts:*");
  }

  private buildKey(blueprint: { website: unknown; pages: unknown; sections: unknown; products: unknown }): string {
    return computeChecksum(blueprint);
  }
}
