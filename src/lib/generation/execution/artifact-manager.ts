import type { PipelineStage } from "@/lib/generation/contracts";

export interface ArtifactEntry {
  name: string;
  stage: PipelineStage;
  data: Record<string, unknown>;
  version: number;
  createdAt: Date;
  lineage: string[];
}

export class ArtifactManager {
  private store = new Map<string, ArtifactEntry[]>();

  create(stage: PipelineStage, name: string, data: Record<string, unknown>): ArtifactEntry {
    const versions = this.store.get(name) ?? [];
    const entry: ArtifactEntry = {
      name,
      stage,
      data,
      version: versions.length + 1,
      createdAt: new Date(),
      lineage: versions.length > 0 ? [...versions[versions.length - 1]!.lineage, versions[versions.length - 1]!.stage] : [],
    };
    versions.push(entry);
    this.store.set(name, versions);
    return entry;
  }

  replace(stage: PipelineStage, name: string, data: Record<string, unknown>): ArtifactEntry {
    const entry: ArtifactEntry = {
      name,
      stage,
      data,
      version: 1,
      createdAt: new Date(),
      lineage: [],
    };
    this.store.set(name, [entry]);
    return entry;
  }

  get(name: string): ArtifactEntry | null {
    const versions = this.store.get(name);
    if (!versions || versions.length === 0) return null;
    return versions[versions.length - 1]!;
  }

  latest(name: string): ArtifactEntry | null {
    return this.get(name);
  }

  version(name: string): number {
    const entry = this.get(name);
    return entry?.version ?? 0;
  }

  versionCount(name: string): number {
    return this.store.get(name)?.length ?? 0;
  }

  lineage(name: string): string[] {
    const entry = this.get(name);
    return entry ? [...entry.lineage] : [];
  }

  resolve(inputs: string[]): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};
    for (const input of inputs) {
      const entry = this.get(input);
      if (entry) resolved[input] = entry.data;
    }
    return resolved;
  }

  has(name: string): boolean {
    return this.store.has(name) && (this.store.get(name)?.length ?? 0) > 0;
  }

  clear(): void {
    this.store.clear();
  }

  allNames(): string[] {
    return Array.from(this.store.keys());
  }

  get size(): number {
    return this.store.size;
  }
}
