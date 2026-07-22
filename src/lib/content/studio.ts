import type { CreatorProfile, CreatorIntelligence } from "@/lib/creators/types";
import { contentGeneratorRegistry } from "./generators/registry";
import type { ContentGenerator, GeneratorInput, GeneratorResult } from "./generators/interface";
import { HeroGenerator } from "./generators/hero";
import { AboutGenerator } from "./generators/about";
import { SeoGenerator } from "./generators/seo";

export interface StudioOutput {
  sections: Record<string, Record<string, unknown>>;
  seo: Record<string, unknown> | null;
  latencyMs: number;
  cacheHits: number;
  totalGenerators: number;
}

/**
 * Content Studio — orchestrates content generation.
 * Each generator produces structured, editable content.
 * No rendering data — only what Builder components consume.
 */
export class ContentStudio {
  private generators: ContentGenerator[] = [];

  constructor() {
    // Register built-in generators
    this.register(new HeroGenerator());
    this.register(new AboutGenerator());
    this.register(new SeoGenerator());
  }

  register(generator: ContentGenerator): void {
    this.generators.push(generator);
    contentGeneratorRegistry.register(generator);
  }

  /** Generate all content for a creator. */
  async generateAll(profile: CreatorProfile, intelligence: CreatorIntelligence): Promise<StudioOutput> {
    const t0 = performance.now();
    const sections: Record<string, Record<string, unknown>> = {};
    let cacheHits = 0;

    const input: GeneratorInput = { profile, intelligence };

    for (const gen of this.generators) {
      try {
        const result = await gen.generate(input);
        if (result.cached) cacheHits++;
        for (const componentId of result.componentIds) {
          sections[componentId] = { ...sections[componentId], ...JSON.parse(JSON.stringify(result.content)) };
        }
      } catch (error) {
        console.error(`[ContentStudio] Generator "${gen.id}" failed:`, error);
      }
    }

    // Extract SEO separately
    const seoContent = sections["seo"] || sections[""] || null;
    delete sections[""];

    return {
      sections,
      seo: seoContent,
      latencyMs: Math.round(performance.now() - t0),
      cacheHits,
      totalGenerators: this.generators.length,
    };
  }

  /** Generate content for a single section. */
  async generateSection(generatorId: string, profile: CreatorProfile, intelligence: CreatorIntelligence): Promise<GeneratorResult | null> {
    const gen = contentGeneratorRegistry.get(generatorId);
    if (!gen) return null;

    const input: GeneratorInput = { profile, intelligence };
    return gen.generate(input);
  }

  /** Get all registered generators. */
  getGenerators(): ContentGenerator[] {
    return this.generators;
  }
}

export const contentStudio = new ContentStudio();
