import type { SectionBlueprint, SectionType, PageType } from "../types";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";

export type { SectionType, PageType }; // used in method signatures

export interface LayoutStrategy {
  readonly niche: string;
  readonly label: string;
  readonly description: string;

  compose(graph: KnowledgeGraph): SectionBlueprint[];
}

export abstract class BaseLayoutStrategy implements LayoutStrategy {
  abstract readonly niche: string;
  abstract readonly label: string;
  abstract readonly description: string;

  abstract composeSections(graph: KnowledgeGraph): Array<{ type: SectionType; page: PageType; props: Record<string, unknown>; reason: string }>;

  compose(graph: KnowledgeGraph): SectionBlueprint[] {
    const sections = this.composeSections(graph);
    return sections.map((s, i) => this.createSection(s.type, s.page, i, s.props, s.reason, 0.8));
  }

  protected hero({ name, tagline, cta, alignment, overlay }: { name: string; tagline: string; cta: string; alignment?: string; overlay?: boolean }): { type: SectionType; page: PageType; props: Record<string, unknown>; reason: string } {
    return { type: "hero", page: "home", props: { headline: name, subheadline: tagline, cta, showProfile: true, showSocialLinks: true, alignment: alignment ?? "center", overlay: overlay ?? false }, reason: `Hero section introduces ${name}` };
  }

  protected products(graph: KnowledgeGraph, prefix = "Featured Products", count?: number): Array<{ type: SectionType; page: PageType; props: Record<string, unknown>; reason: string }> {
    if (!graph.products || graph.products.length === 0) return [];
    return [
      { type: "featured_products", page: "home", props: { title: prefix, count: count ?? Math.min(graph.products.length, 4), layout: "grid", showViewAll: true }, reason: `Showcase ${graph.creator.niche} products` },
    ];
  }

  protected productGrid(graph: KnowledgeGraph): Array<{ type: SectionType; page: PageType; props: Record<string, unknown>; reason: string }> {
    if (!graph.products || graph.products.length === 0) return [];
    return [{ type: "product_grid", page: "products", props: { title: "All Products", layout: "grid", columns: 3, sorting: "featured", showFilters: true }, reason: "Complete product catalog" }];
  }

  protected contentFeed(graph: KnowledgeGraph): Array<{ type: SectionType; page: PageType; props: Record<string, unknown>; reason: string }> {
    if (!graph.content.topContentTypes || graph.content.topContentTypes.length === 0) return [];
    return [{ type: "content_feed", page: "home", props: { title: "Latest Content", source: graph.creator.platform, limit: 6, layout: graph.content.contentQuality === "high" ? "grid" : "list", showCaptions: true }, reason: `Show latest ${graph.creator.niche} content` }];
  }

  protected gallery(title = "Gallery"): Array<{ type: SectionType; page: PageType; props: Record<string, unknown>; reason: string }> {
    return [{ type: "gallery", page: "gallery", props: { title, layout: "masonry", columns: 3, showCaptions: true }, reason: "Visual showcase for creator" }];
  }

  protected about(_graph: KnowledgeGraph): Array<{ type: SectionType; page: PageType; props: Record<string, unknown>; reason: string }> {
    // IMPLEMENTATION-19: About removed — Hero is the identity section.
    return [];
  }

  protected social(graph: KnowledgeGraph): Array<{ type: SectionType; page: PageType; props: Record<string, unknown>; reason: string }> {
    return [{ type: "social_links", page: "home", props: { title: "Follow Me", links: graph.socialLinks.map((l) => ({ platform: l.platform, url: l.url, handle: l.handle })), layout: "horizontal" }, reason: "Social media connection points" }];
  }

  protected faq(graph: KnowledgeGraph): Array<{ type: SectionType; page: PageType; props: Record<string, unknown>; reason: string }> {
    if (!graph.seo.keywords || graph.seo.keywords.length === 0) return [];
    return [{ type: "faq", page: "home", props: { title: "FAQ", items: [{ q: "What products do you offer?", a: `Explore our collection of ${graph.creator.niche} products handpicked for you.` }, { q: "How can I contact you?", a: "Visit our contact page or follow us on social media for the latest updates." }, { q: "Do you offer custom orders?", a: "Reach out through the contact form for custom requests and collaborations." }] }, reason: "Common questions and answers" }];
  }

  protected contact(): Array<{ type: SectionType; page: PageType; props: Record<string, unknown>; reason: string }> {
    return [{ type: "contact_form", page: "contact", props: { title: "Get In Touch", showPhone: false, showAddress: false }, reason: "Contact form for customer inquiries" }];
  }

  protected footer(name: string): Array<{ type: SectionType; page: PageType; props: Record<string, unknown>; reason: string }> {
    return [{ type: "footer", page: "home", props: { showSocialLinks: true, showNewsletter: false, showBackToTop: true, copyright: `© ${new Date().getFullYear()} ${name}. All rights reserved.` }, reason: "Footer with navigation and copyright" }];
  }

  protected testimonial(): Array<{ type: SectionType; page: PageType; props: Record<string, unknown>; reason: string }> {
    return [{ type: "testimonials", page: "home", props: { title: "What People Say", layout: "carousel" }, reason: "Social proof and testimonials" }];
  }

  protected stats(): Array<{ type: SectionType; page: PageType; props: Record<string, unknown>; reason: string }> {
    return [{ type: "stats", page: "home", props: { title: "By the Numbers" }, reason: "Key metrics and achievements" }];
  }

  private createSection(type: SectionType, page: PageType, order: number, props: Record<string, unknown>, reason: string, confidence: number): SectionBlueprint {
    return { id: `section_${type}`, type, page, order, props, reason, confidence };
  }
}
