import type { WebsiteBlueprint } from "@/lib/generation/composition/types";
import type { Artifact, ArtifactType } from "./types";
import { computeChecksum } from "./types";
import { ArtifactRegistry } from "./artifact-registry";

export class ArtifactEngine {
  constructor(private registry: ArtifactRegistry) {}

  generateAll(blueprint: WebsiteBlueprint): Artifact[] {
    const blueprintChecksum = computeChecksum({
      website: blueprint.website,
      pages: blueprint.pages,
      sections: blueprint.sections,
      products: blueprint.products,
    });

    const version = blueprint.metadata.version;
    const artifacts: Artifact[] = [];

    for (const generator of this.registry.getAll()) {
      const artifact = generator.generate(blueprint, blueprintChecksum, version);
      artifacts.push(artifact);
    }

    return artifacts;
  }

  generateType(blueprint: WebsiteBlueprint, type: ArtifactType): Artifact | null {
    const generator = this.registry.get(type);
    if (!generator) return null;

    const blueprintChecksum = computeChecksum({
      website: blueprint.website,
      pages: blueprint.pages,
      sections: blueprint.sections,
      products: blueprint.products,
    });

    return generator.generate(blueprint, blueprintChecksum, blueprint.metadata.version);
  }
}
