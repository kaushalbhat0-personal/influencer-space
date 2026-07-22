import type { ContentGenerator, GeneratorInput, GeneratorResult } from "./interface";
import { HeroContentSchema } from "../schemas";
import { aiEngine } from "@/lib/ai/engine";
import { intelligenceCache } from "@/lib/ai/cache";

export class HeroGenerator implements ContentGenerator {
  readonly id = "hero";
  readonly description = "Generate hero section content";
  readonly schema = HeroContentSchema;
  readonly componentIds = ["hero.default", "hero.gaming", "hero.fitness", "hero.education"];
  readonly dependsOn: string[] = [];

  async generate(input: GeneratorInput): Promise<GeneratorResult> {
    const t0 = performance.now();

    const cached = intelligenceCache.get(input.profile);
    if (cached) {
      return {
        content: cached.intelligence as unknown as Record<string, unknown>,
        componentIds: this.componentIds,
        cached: true,
        latencyMs: Math.round(performance.now() - t0),
        provenance: { generator: this.id, promptVersion: "v1.0.0", generatedAt: new Date().toISOString(), cached: true, latencyMs: Math.round(performance.now() - t0) },
      };
    }

    const engine = aiEngine.getEngine();
    const intelligence = await engine.analyze(input.profile);

    const heroTitle = `Welcome to ${input.profile.name}`;
    const result = HeroContentSchema.parse({
      title: heroTitle,
      subtitle: intelligence.audience || null,
      ctaText: intelligence.suggestedCta || "Get Started",
      ctaLink: null,
      alignment: "center",
      showLiveBadge: intelligence.niche === "gaming" || intelligence.niche === "entertainment",
    });

    intelligenceCache.set(input.profile, JSON.parse(JSON.stringify(result)));

    return {
      content: JSON.parse(JSON.stringify(result)),
      componentIds: this.componentIds,
      cached: false,
      latencyMs: Math.round(performance.now() - t0),
      provenance: { generator: this.id, promptVersion: "v1.0.0", generatedAt: new Date().toISOString(), cached: false, latencyMs: Math.round(performance.now() - t0) },
    };
  }
}
