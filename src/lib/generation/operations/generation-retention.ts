export interface RetentionConfig {
  maxCheckpointAgeMs: number;
  maxCacheAgeMs: number;
  maxEventAgeMs: number;
  maxArtifactVersions: number;
  maxSnapshotAgeMs: number;
  maxHistoryEntries: number;
}

export class GenerationRetention {
  constructor(private config: RetentionConfig = {
    maxCheckpointAgeMs: 7 * 86400000,
    maxCacheAgeMs: 24 * 3600000,
    maxEventAgeMs: 30 * 86400000,
    maxArtifactVersions: 10,
    maxSnapshotAgeMs: 90 * 86400000,
    maxHistoryEntries: 1000,
  }) {}

  getConfig(): RetentionConfig {
    return { ...this.config };
  }

  updateConfig(overrides: Partial<RetentionConfig>): void {
    Object.assign(this.config, overrides);
  }

  isCheckpointExpired(createdAt: Date): boolean {
    return Date.now() - createdAt.getTime() > this.config.maxCheckpointAgeMs;
  }

  isCacheExpired(createdAt: number): boolean {
    return Date.now() - createdAt > this.config.maxCacheAgeMs;
  }

  isEventExpired(createdAt: Date): boolean {
    return Date.now() - createdAt.getTime() > this.config.maxEventAgeMs;
  }

  isSnapshotExpired(createdAt: Date): boolean {
    return Date.now() - createdAt.getTime() > this.config.maxSnapshotAgeMs;
  }

  shouldPruneVersions(versionCount: number): boolean {
    return versionCount > this.config.maxArtifactVersions;
  }
}
