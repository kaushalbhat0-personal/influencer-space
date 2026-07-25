import type { Artifact, ArtifactType, VersionHistory } from "./types";

export class ArtifactVersioning {
  private history = new Map<string, Artifact[]>();

  add(artifact: Artifact): void {
    const key = `${artifact.manifest.type}_${artifact.manifest.id}`;
    const versions = this.history.get(key) ?? [];
    versions.push(artifact);
    this.history.set(key, versions);
  }

  latest(type: ArtifactType, id: string): Artifact | null {
    const key = `${type}_${id}`;
    const versions = this.history.get(key);
    if (!versions || versions.length === 0) return null;
    return versions[versions.length - 1]!;
  }

  getVersion(type: ArtifactType, id: string, version: number): Artifact | null {
    const key = `${type}_${id}`;
    const versions = this.history.get(key);
    if (!versions) return null;
    return versions.find((v) => v.manifest.version === version) ?? null;
  }

  getHistory(type: ArtifactType, id: string): Artifact[] {
    const key = `${type}_${id}`;
    return this.history.get(key) ?? [];
  }

  listVersions(type: ArtifactType, id: string): VersionHistory | null {
    const artifacts = this.getHistory(type, id);
    if (artifacts.length === 0) return null;

    return {
      artifactId: id,
      versions: artifacts.map((a) => ({
        version: a.manifest.version,
        checksum: a.manifest.checksum,
        createdAt: a.manifest.createdAt,
      })),
    };
  }

  rollback(type: ArtifactType, id: string, version: number): Artifact | null {
    const target = this.getVersion(type, id, version);
    if (!target) return null;

    const key = `${type}_${id}`;
    const versions = this.history.get(key) ?? [];
    const rollbackIndex = versions.findIndex((v) => v.manifest.version === version);

    if (rollbackIndex !== -1 && rollbackIndex < versions.length - 1) {
      this.history.set(key, versions.slice(0, rollbackIndex + 1));
    }

    return target;
  }

  diff(type: ArtifactType, id: string, v1: number, v2: number): Record<string, unknown> | null {
    const a1 = this.getVersion(type, id, v1);
    const a2 = this.getVersion(type, id, v2);
    if (!a1 || !a2) return null;

    const d1 = JSON.stringify(a1.data);
    const d2 = JSON.stringify(a2.data);

    return {
      artifactId: id,
      type,
      versionA: v1,
      versionB: v2,
      changed: d1 !== d2,
      sizeA: d1.length,
      sizeB: d2.length,
    };
  }

  clear(): void {
    this.history.clear();
  }
}
