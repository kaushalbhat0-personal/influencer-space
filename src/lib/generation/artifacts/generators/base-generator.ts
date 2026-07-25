import type { WebsiteBlueprint } from "@/lib/generation/composition/types";
import type { Artifact, ArtifactType } from "../types";
import { computeChecksum, createArtifactId, ARTIFACT_DEPENDENCIES } from "../types";

export interface ArtifactGenerator<T = unknown> {
  readonly type: ArtifactType;
  generate(blueprint: WebsiteBlueprint, blueprintChecksum: string, version: number): Artifact<T>;
}

export abstract class BaseGenerator<T> implements ArtifactGenerator<T> {
  abstract readonly type: ArtifactType;
  abstract generateData(blueprint: WebsiteBlueprint): T;

  generate(blueprint: WebsiteBlueprint, blueprintChecksum: string, version: number): Artifact<T> {
    const data = this.generateData(blueprint);
    const checksum = computeChecksum(data);
    const id = createArtifactId(this.type, blueprintChecksum);

    return {
      manifest: {
        id,
        type: this.type,
        version,
        checksum,
        createdAt: new Date().toISOString(),
        dependencies: ARTIFACT_DEPENDENCIES[this.type] ?? [],
        sourceBlueprintVersion: version,
        size: JSON.stringify(data).length,
      },
      data,
    };
  }
}
