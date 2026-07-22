import type { ContentGenerator, GeneratorInput, GeneratorResult } from "./interface";
import { SeoContentSchema } from "../schemas";
import { aiEngine } from "@/lib/ai/engine";

export class SeoGenerator implements ContentGenerator {
  readonly id = "seo";
  readonly description = "Generate SEO metadata";
  readonly schema = SeoContentSchema;
  readonly componentIds = [];
  readonly dependsOn: string[] = ["hero", "about"];

  async generate(input: GeneratorInput): Promise<GeneratorResult> {
    const t0 = performance.now();

    const engine = aiEngine.getEngine();
    const intelligence = await engine.analyze(input.profile);

    const seoTitle = `${input.profile.name} — ${intelligence.niche.charAt(0).toUpperCase() + intelligence.niche.slice(1)} Creator`.slice(0, 60);
    const seoDesc = `${input.profile.name} creates ${intelligence.contentStyle || "amazing content"}. ${intelligence.audience ? `For ${intelligence.audience}.` : ""}`.slice(0, 160);

    const result = SeoContentSchema.parse({
      title: seoTitle,
      description: seoDesc,
      keywords: intelligence.seoKeywords.slice(0, 8),
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
