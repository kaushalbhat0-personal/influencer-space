import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { SectionBlueprint, SectionType, PageType } from "../types";

export interface VariantDefinition {
  id: string;
  niche: string;
  label: string;
  description: string;
}

export abstract class BaseVariantStrategy {
  abstract readonly id: string;
  abstract readonly niche: string;
  abstract readonly label: string;
  abstract readonly description: string;

  abstract match(graph: KnowledgeGraph): number;

  abstract composeSections(graph: KnowledgeGraph): Array<{
    type: SectionType; page: PageType; props: Record<string, unknown>; reason: string;
  }>;

  compose(graph: KnowledgeGraph): SectionBlueprint[] {
    return this.composeSections(graph).map((s, i) => ({
      id: `section_${s.type}_${i}`,
      type: s.type,
      page: s.page,
      order: i,
      props: s.props,
      reason: s.reason,
      confidence: 0.85,
    }));
  }

  protected hero(headline: string, tagline: string, cta: string, alignment = "center") {
    return { type: "hero" as const, page: "home" as const, props: { headline, subheadline: tagline, cta, showProfile: true, alignment, overlay: false }, reason: "Hero section" };
  }

  protected products(graph: KnowledgeGraph, title = "Products", limit = 4) {
    if (!graph.products?.length) return [];
    return [{ type: "featured_products" as const, page: "home" as const, props: { title, count: Math.min(graph.products.length, limit), layout: "grid" }, reason: "Featured products" }];
  }

  protected productGrid(graph: KnowledgeGraph) {
    if (!graph.products?.length) return [];
    return [{ type: "product_grid" as const, page: "products" as const, props: { title: "All Products", layout: "grid", columns: 3 }, reason: "Product catalog" }];
  }

  protected contentFeed(graph: KnowledgeGraph) {
    if (!graph.content.topContentTypes?.length) return [];
    return [{ type: "content_feed" as const, page: "home" as const, props: { title: "Latest", limit: 6, layout: graph.content.contentQuality === "high" ? "grid" : "list" }, reason: "Latest content" }];
  }

  protected gallery(title = "Gallery") {
    return [{ type: "gallery" as const, page: "gallery" as const, props: { title, layout: "masonry", columns: 3 }, reason: "Visual showcase" }];
  }

  protected about(name: string) {
    return [{ type: "about" as const, page: "about" as const, props: { title: `About ${name}`, showStats: true }, reason: "About" }];
  }

  protected social(graph: KnowledgeGraph) {
    if (!graph.socialLinks?.length) return [];
    return [{ type: "social_links" as const, page: "home" as const, props: { title: "Follow", layout: "horizontal", links: graph.socialLinks }, reason: "Social links" }];
  }

  protected contact() {
    return [{ type: "contact_form" as const, page: "contact" as const, props: { title: "Contact" }, reason: "Contact form" }];
  }

  protected footer(name: string) {
    return [{ type: "footer" as const, page: "home" as const, props: { copyright: `© ${name}` }, reason: "Footer" }];
  }

  protected testimonial() {
    return [{ type: "testimonials" as const, page: "home" as const, props: { title: "Testimonials", layout: "carousel" }, reason: "Testimonials" }];
  }

  protected stats() {
    return [{ type: "stats" as const, page: "home" as const, props: { title: "Stats" }, reason: "Statistics" }];
  }

  protected faq() {
    return [{ type: "faq" as const, page: "home" as const, props: { title: "FAQ", items: [{ q: "Question?", a: "Answer." }] }, reason: "FAQ" }];
  }
}
