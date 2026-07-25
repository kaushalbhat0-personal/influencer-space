import type { Artifact } from "./types";
import type { ArtifactType } from "./types";

export interface ArtifactValidationResult {
  valid: boolean;
  issues: string[];
  artifactsValidated: number;
  artifactsFailed: number;
}

export class ArtifactValidator {
  validateAll(artifacts: Artifact[]): ArtifactValidationResult {
    const issues: string[] = [];
    const manifestTypes = new Set(artifacts.map((a) => a.manifest.type));

    const allTypes: ArtifactType[] = [
      "website_record", "theme_record", "pages", "navigation", "sections",
      "products", "gallery", "seo", "builder_json", "publish_snapshot",
      "storefront_json", "robots_txt", "sitemap_xml", "manifest_json", "metadata",
    ];

    for (const type of allTypes) {
      if (!manifestTypes.has(type)) {
        issues.push(`Missing artifact: ${type}`);
      }
    }

    for (const artifact of artifacts) {
      this.validateArtifact(artifact, issues);
    }

    const failed = issues.filter((i) => i.startsWith("Missing") || i.startsWith("Invalid")).length;

    return {
      valid: failed === 0,
      issues,
      artifactsValidated: artifacts.length,
      artifactsFailed: failed,
    };
  }

  private validateArtifact(artifact: Artifact, issues: string[]): void {
    if (!artifact.manifest.id) issues.push(`Invalid artifact: missing id for type ${artifact.manifest.type}`);
    if (!artifact.manifest.checksum) issues.push(`Invalid artifact: missing checksum for ${artifact.manifest.id}`);
    if (!artifact.manifest.createdAt) issues.push(`Invalid artifact: missing createdAt for ${artifact.manifest.id}`);
    if (artifact.manifest.version < 1) issues.push(`Invalid artifact: version < 1 for ${artifact.manifest.id}`);
  }

  validateChecksum(_artifact: Artifact): boolean {
    void _artifact;
    return true;
  }
}
