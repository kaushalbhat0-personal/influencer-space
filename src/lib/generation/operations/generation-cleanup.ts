import type { GenerationCache } from "@/lib/generation/contracts";
import type { GenerationRetention } from "./generation-retention";

export interface CleanupReport {
  startedAt: string;
  completedAt: string;
  checkpointsRemoved: number;
  cacheEntriesRemoved: number;
  eventsRemoved: number;
  artifactsPruned: number;
  snapshotsRemoved: number;
  totalRemoved: number;
}

export class GenerationCleanup {
  constructor(
    private cache: GenerationCache,
    private retention: GenerationRetention,
  ) {}

  async runFullCleanup(): Promise<CleanupReport> {
    const startedAt = new Date().toISOString();

    const cacheRemoved = await this.cleanupCache();

    const report: CleanupReport = {
      startedAt,
      completedAt: new Date().toISOString(),
      checkpointsRemoved: 0,
      cacheEntriesRemoved: cacheRemoved,
      eventsRemoved: 0,
      artifactsPruned: 0,
      snapshotsRemoved: 0,
      totalRemoved: cacheRemoved,
    };

    return report;
  }

  async cleanupCache(): Promise<number> {
    await this.cache.invalidateByPattern("intel:*");
    await this.cache.invalidateByPattern("bp:*");
    await this.cache.invalidateByPattern("artifacts:*");
    return 0;
  }

  async cleanupByPattern(pattern: string): Promise<number> {
    await this.cache.invalidateByPattern(pattern);
    return 0;
  }
}
