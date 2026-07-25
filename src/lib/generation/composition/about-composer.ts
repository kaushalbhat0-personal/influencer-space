import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { SectionBlueprint } from "./types";
import { getVocabulary } from "@/lib/generation/content/vocabularies";

export class AboutComposer {
  compose(graph: KnowledgeGraph): SectionBlueprint {
    const vocab = getVocabulary(graph.creator.niche);
    const name = graph.creator.name;
    const bio = graph.creator.bio || graph.brand.description;
    const category = vocab.products.categoryLabel;

    return {
      id: "section_about",
      type: "about",
      page: "about",
      order: 0,
      props: {
        title: vocab.about.sectionTitle.replace("{name}", name),
        bio: this.formatBio(bio, name),
        avatar: null,
        showStats: true,
        stats: this.getStats(graph, category),
        showSocialLinks: true,
        niche: graph.creator.niche,
        brandVoice: graph.brand.brandVoice,
      },
      reason: `About section introduces ${name}`,
      confidence: 0.75,
    };
  }

  private formatBio(bio: string, name: string): string {
    if (bio && bio.length > 20) return bio;
    return `${name} is a creator sharing their journey and content with the world.`;
  }

  private getStats(graph: KnowledgeGraph, category: string): Array<{ label: string; value: string }> {
    const stats: Array<{ label: string; value: string }> = [];
    if (graph.creator.followers > 0) stats.push({ label: "Followers", value: this.formatNumber(graph.creator.followers) });
    if (graph.content.topContentTypes.length > 0) stats.push({ label: "Content", value: graph.content.topContentTypes[0]! });
    if (graph.products.length > 0) stats.push({ label: category, value: String(graph.products.length) });
    if (graph.socialLinks.length > 0) stats.push({ label: "Platforms", value: String(graph.socialLinks.length) });
    if (stats.length === 0) stats.push({ label: "Creator", value: "Active" });
    return stats;
  }

  private formatNumber(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  }
}
