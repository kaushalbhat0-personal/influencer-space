import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { WebsiteBlueprint, BlueprintMetadata } from "./types";
import type { SectionBlueprint, ProductBlueprint } from "./types";
import type { ExperiencePlan } from "@/lib/generation/experience-plan/types";
import { composeFromGraph } from "./website-blueprint";
import { PageComposer } from "./page-composer";
import { NavigationComposer } from "./navigation-composer";
import { SectionComposer } from "./section-composer";
import { HeroComposer } from "./hero-composer";
import { ProductComposer } from "./product-composer";
import { GalleryComposer } from "./gallery-composer";
import { FeedComposer } from "./feed-composer";
import { AboutComposer } from "./about-composer";
import { ContactComposer } from "./contact-composer";
import { ThemeComposer } from "./theme-composer";
import { SEOComposer } from "./seo-composer";
import { BuilderComposer } from "./builder-composer";

export class LayoutComposer {
  private pageComposer = new PageComposer();
  private navComposer = new NavigationComposer();
  private sectionComposer = new SectionComposer();
  private heroComposer = new HeroComposer();
  private productComposer = new ProductComposer();
  private galleryComposer = new GalleryComposer();
  private feedComposer = new FeedComposer();
  private aboutComposer = new AboutComposer();
  private contactComposer = new ContactComposer();
  private themeComposer = new ThemeComposer();
  private seoComposer = new SEOComposer();
  private builderComposer = new BuilderComposer();

  compose(graph: KnowledgeGraph, sourceKey: string, plan: ExperiencePlan): WebsiteBlueprint {
    const website = composeFromGraph(graph);
    const pages = this.pageComposer.compose(graph);
    const navigation = this.navComposer.compose(pages);
    const sections = this.sectionComposer.compose(graph, plan);
    const products = this.productComposer.compose(graph);
    const gallery = this.galleryComposer.compose(graph);
    const feed = this.feedComposer.compose(graph);
    const about = this.aboutComposer.compose(graph);
    const contact = this.contactComposer.compose(graph.seo.slug, graph.creator.name);
    const theme = this.themeComposer.compose(graph);
    const seo = this.seoComposer.compose(graph);
    const builder = this.builderComposer.compose(sections, pages);

    const confidence = this.calculateConfidence(graph, sections, products);
    const metadata: BlueprintMetadata = {
      generatedAt: new Date().toISOString(),
      version: 1,
      confidence,
      sourceKey,
      intelligenceVersion: "1.0",
    };

    return Object.freeze({
      website,
      pages,
      navigation,
      sections,
      products,
      gallery,
      feed,
      about,
      contact,
      seo,
      theme,
      builder,
      metadata,
    });
  }

  private calculateConfidence(graph: KnowledgeGraph, sections: SectionBlueprint[], products: ProductBlueprint[]): number {
    let score = graph.confidence * 0.3;
    score += Math.min(sections.length / 10, 0.3);
    score += Math.min(products.length / 5, 0.2);
    score += graph.seo.keywords.length > 0 ? 0.1 : 0;
    score += graph.theme.primary ? 0.1 : 0;
    return Math.round(Math.min(score, 1) * 100) / 100;
  }
}
