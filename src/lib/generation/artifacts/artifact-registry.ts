import type { ArtifactType } from "./types";
import type { ArtifactGenerator } from "./generators/base-generator";

export class ArtifactRegistry {
  private generators = new Map<ArtifactType, ArtifactGenerator>();

  register(generator: ArtifactGenerator): void {
    if (this.generators.has(generator.type)) {
      throw new Error(`Generator already registered for type: ${generator.type}`);
    }
    this.generators.set(generator.type, generator);
  }

  get(type: ArtifactType): ArtifactGenerator | undefined {
    return this.generators.get(type);
  }

  getAll(): ArtifactGenerator[] {
    return Array.from(this.generators.values());
  }

  listTypes(): ArtifactType[] {
    return Array.from(this.generators.keys());
  }
}
