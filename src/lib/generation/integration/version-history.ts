import type { VersionEntry } from "./types";

export class VersionHistory {
  private entries: VersionEntry[] = [];
  private store = new Map<string, VersionEntry[]>();

  add(entry: VersionEntry): void {
    this.entries.push(entry);
    const key = `${entry.generationId}`;
    const existing = this.store.get(key) ?? [];
    existing.push(entry);
    this.store.set(key, existing);
  }

  getGenerationHistory(generationId: string): VersionEntry[] {
    return this.store.get(generationId) ?? [];
  }

  getAll(): VersionEntry[] {
    return [...this.entries];
  }

  latest(generationId: string): VersionEntry | null {
    const versions = this.getGenerationHistory(generationId);
    if (versions.length === 0) return null;
    return versions[versions.length - 1]!;
  }

  getVersion(generationId: string, version: number): VersionEntry | null {
    const versions = this.getGenerationHistory(generationId);
    return versions.find((v) => v.version === version) ?? null;
  }

  rollback(generationId: string, targetVersion: number): VersionEntry | null {
    const target = this.getVersion(generationId, targetVersion);
    if (!target) return null;

    const versions = this.store.get(generationId) ?? [];
    const idx = versions.findIndex((v) => v.version === targetVersion);
    if (idx === -1) return null;

    this.store.set(generationId, versions.slice(0, idx + 1));
    return target;
  }

  clear(): void {
    this.entries = [];
    this.store.clear();
  }
}
