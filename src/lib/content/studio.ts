import type { CreatorProfile, CreatorIntelligence } from "@/lib/creators/types";
import { contentGeneratorRegistry } from "./generators/registry";
import type { ContentGenerator, GeneratorInput, GeneratorResult, GeneratorProvenance } from "./generators/interface";
import { HeroGenerator } from "./generators/hero";
import { AboutGenerator } from "./generators/about";
import { SeoGenerator } from "./generators/seo";

export interface StudioOutput {
  sections: Record<string, Record<string, unknown>>;
  provenance: Record<string, GeneratorProvenance>;
  seo: Record<string, unknown> | null;
  latencyMs: number;
  cacheHits: number;
  totalGenerators: number;
}

/**
 * Content Studio — orchestrates content generation with dependency ordering and per-generator caching.
 */
export class ContentStudio {
  private generators: ContentGenerator[] = [];

  constructor() {
    this.register(new HeroGenerator());
    this.register(new AboutGenerator());
    this.register(new SeoGenerator());
  }

  register(generator: ContentGenerator): void {
    this.generators.push(generator);
    contentGeneratorRegistry.register(generator);
  }

  /** Topological sort generators by dependency order. */
  private sortByDependencies(): ContentGenerator[] {
    const sorted: ContentGenerator[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (gen: ContentGenerator) => {
      if (visited.has(gen.id)) return;
      if (visiting.has(gen.id)) throw new Error(`Circular dependency detected: ${gen.id}`);
      visiting.add(gen.id);
      for (const depId of gen.dependsOn) {
        const dep = contentGeneratorRegistry.get(depId);
        if (dep) visit(dep);
      }
      visiting.delete(gen.id);
      visited.add(gen.id);
      sorted.push(gen);
    };

    for (const gen of this.generators) visit(gen);
    return sorted;
  }

  /** Generate all content for a creator. */
  async generateAll(profile: CreatorProfile, intelligence: CreatorIntelligence): Promise<StudioOutput> {
    const t0 = performance.now();
    const sections: Record<string, Record<string, unknown>> = {};
    const provenance: Record<string, GeneratorProvenance> = {};
    let cacheHits = 0;

    const sorted = this.sortByDependencies();
    const input: GeneratorInput = { profile, intelligence };

    for (const gen of sorted) {
      try {
        const result = await gen.generate(input);
        if (result.cached) cacheHits++;
        for (const componentId of result.componentIds) {
          sections[componentId] = { ...sections[componentId], ...JSON.parse(JSON.stringify(result.content)) };
        }
        if (result.provenance) {
          provenance[gen.id] = result.provenance;
        }
      } catch (error) {
        console.error(`[ContentStudio] Generator "${gen.id}" failed:`, error);
      }
    }

    const seoContent = sections["seo"] || null;
    delete sections[""];

    return {
      sections,
      provenance,
      seo: seoContent,
      latencyMs: Math.round(performance.now() - t0),
      cacheHits,
      totalGenerators: sorted.length,
    };
  }

  /** Generate content for a single section. */
  async generateSection(generatorId: string, profile: CreatorProfile, intelligence: CreatorIntelligence): Promise<GeneratorResult | null> {
    const gen = contentGeneratorRegistry.get(generatorId);
    if (!gen) return null;
    const input: GeneratorInput = { profile, intelligence };
    return gen.generate(input);
  }

  getGenerators(): ContentGenerator[] {
    return this.generators;
  }
}

export const contentStudio = new ContentStudio();
