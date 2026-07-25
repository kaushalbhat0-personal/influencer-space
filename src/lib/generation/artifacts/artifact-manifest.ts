import type { Artifact, ArtifactType } from "./types";
import { computeChecksum } from "./types";

export class ArtifactManifest {
  generate(artifacts: Artifact[]): Record<string, unknown> {
    return {
      id: `manifest_${Date.now()}`,
      createdAt: new Date().toISOString(),
      artifactCount: artifacts.length,
      checksum: computeChecksum(artifacts.map((a) => a.manifest)),
      artifacts: artifacts.map((a) => ({
        id: a.manifest.id,
        type: a.manifest.type,
        version: a.manifest.version,
        checksum: a.manifest.checksum,
        createdAt: a.manifest.createdAt,
        dependencies: a.manifest.dependencies,
        size: a.manifest.size,
      })),
    };
  }

  findByType(artifacts: Artifact[], type: ArtifactType): Artifact | undefined {
    return artifacts.find((a) => a.manifest.type === type);
  }

  findByTypes(artifacts: Artifact[], types: ArtifactType[]): Artifact[] {
    const typeSet = new Set(types);
    return artifacts.filter((a) => typeSet.has(a.manifest.type));
  }
}
