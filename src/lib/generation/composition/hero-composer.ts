import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { SectionBlueprint } from "./types";
import { getVocabulary } from "@/lib/generation/content/vocabularies";

export class HeroComposer {
  compose(graph: KnowledgeGraph): SectionBlueprint {
    const vocab = getVocabulary(graph.creator.niche);
    const name = graph.creator.name || graph.brand.name;
    const headline = vocab.hero.headlineTemplate.replace("{name}", name);
    const subheadline = vocab.hero.subheadlineTemplate
      .replace("{name}", name)
      .replace("{description}", graph.brand.description || graph.creator.bio?.slice(0, 120) || "");

    return {
      id: "section_hero",
      type: "hero",
      page: "home",
      order: 0,
      props: {
        headline,
        subheadline,
        cta: vocab.hero.cta,
        secondaryCta: vocab.hero.secondaryCta,
        showProfile: true,
        showSocialLinks: true,
        background: graph.theme.mode === "dark" ? "dark" : "light",
        alignment: "center",
        overlay: graph.theme.mode === "dark",
        badges: this.getBadges(graph),
      },
      reason: `Hero section introduces ${name}`,
      confidence: 0.9,
    };
  }

  private getBadges(graph: KnowledgeGraph): string[] {
    const badges: string[] = [];
    if (graph.creator.followers > 10000) badges.push(`${this.formatFollowers(graph.creator.followers)} Followers`);
    if (graph.creator.engagement > 0.05) badges.push("High Engagement");
    if (graph.socialLinks.length > 2) badges.push("Multi-Platform");
    if (graph.products.length > 0) badges.push(`${graph.products.length} ${getVocabulary(graph.creator.niche).products.categoryLabel}`);
    return badges;
  }

  private formatFollowers(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  }
}
