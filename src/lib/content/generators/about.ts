import type { ContentGenerator, GeneratorInput, GeneratorResult } from "./interface";
import { AboutContentSchema } from "../schemas";

export class AboutGenerator implements ContentGenerator {
  readonly id = "about";
  readonly description = "Generate about section content";
  readonly schema = AboutContentSchema;
  readonly componentIds = ["about.default"];
  readonly dependsOn: string[] = ["hero"];

  async generate(input: GeneratorInput): Promise<GeneratorResult> {
    const t0 = performance.now();

    const content = input.profile.description
      ? input.profile.description.slice(0, 500)
      : `${input.profile.name} is a creator building their presence on CreatorStore.`;

    const result = AboutContentSchema.parse({
      title: `About ${input.profile.name}`,
      content,
      imageUrl: input.profile.avatarUrl || null,
    });

    return {
      content: JSON.parse(JSON.stringify(result)),
      componentIds: this.componentIds,
      cached: false,
      latencyMs: Math.round(performance.now() - t0),
      provenance: { generator: this.id, promptVersion: "v1.0.0", generatedAt: new Date().toISOString(), cached: false, latencyMs: Math.round(performance.now() - t0) },
    };
  }
}
