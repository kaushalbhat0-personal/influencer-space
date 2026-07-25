import type { PipelineStage } from "@/lib/generation/contracts";
import type { ContentSource, SectionIntelligence as LocalSectionIntelligence } from "./types";
import type { CreatorIntelligence } from "./types";
import { NicheDetector } from "./niche-detector";
import { CreatorProfiler } from "./creator-profiler";

export class SectionRecommender {
  constructor(
    private nicheDetector: NicheDetector,
    private creatorProfiler: CreatorProfiler,
  ) {}

  recommend(source: ContentSource): LocalSectionIntelligence[] {
    const niche = this.nicheDetector.detect(source);
    const profile = this.creatorProfiler.profile(source);
    const sections = this.getSectionsForNiche();

    const stages: PipelineStage[] = [
      "source_resolution", "profile_extraction", "intelligence_analysis",
      "theme_selection", "content_generation", "seo_generation",
      "section_composition", "website_composition", "provisioning",
      "publishing",
    ];

    return sections.map((section, i) => ({
      type: section,
      priority: stages.indexOf(section) + 1,
      recommended: true,
      reason: this.generateReason(section, niche.niche, profile),
      order: i,
      confidence: 0.8,
    }));
  }

  private getSectionsForNiche(): PipelineStage[] {
    return [
      "source_resolution", "profile_extraction", "theme_selection",
      "content_generation", "seo_generation", "website_composition",
    ];
  }

  private generateReason(stage: PipelineStage, niche: string, profile: CreatorIntelligence): string {
    const reasons: Record<string, string> = {
      source_resolution: `Essential for importing ${niche} creator content`,
      profile_extraction: `Required to build creator profile with ${this.formatNumber(profile.followers)} followers`,
      intelligence_analysis: `Analyzes ${niche} content patterns for optimal store setup`,
      theme_selection: `Applies ${this.capitalize(niche)}-optimized theme settings`,
      content_generation: `Generates ${niche} content aligned with your brand voice`,
      seo_generation: `Optimizes store for ${niche} search terms and discoverability`,
      section_composition: `Arranges ${niche}-specific store sections for maximum engagement`,
      website_composition: `Composes complete store with ${niche}-optimized layout`,
      provisioning: `Sets up hosting infrastructure for your ${niche} store`,
      publishing: `Makes your ${niche} store live for fans and followers`,
    };
    return reasons[stage] ?? `Required stage for ${niche} store setup`;
  }

  private formatNumber(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
