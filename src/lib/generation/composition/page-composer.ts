import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { PageBlueprint, PageType } from "./types";

export class PageComposer {
  compose(graph: KnowledgeGraph): PageBlueprint[] {
    const pages: PageBlueprint[] = [];
    const slug = graph.seo.slug || graph.creator.username || "creator";

    pages.push(this.createPage("home", "Home", slug, 1, true));
    pages.push(this.createPage("products", "Products", `${slug}/products`, 2, graph.products.length > 0));

    const hasGallery = graph.creator.niche === "photography" || graph.creator.niche === "art" || graph.creator.niche === "travel";
    pages.push(this.createPage("gallery", "Gallery", `${slug}/gallery`, 3, hasGallery));

    // IMPLEMENTATION-19: About page removed — Hero is the identity section.
    pages.push(this.createPage("contact", "Contact", `${slug}/contact`, 4, true));

    const hasBlog = graph.creator.contentFrequency === "daily" || graph.content.postingSchedule !== "irregular";
    pages.push(this.createPage("blog", "Blog", `${slug}/blog`, 5, hasBlog));

    return pages;
  }

  private createPage(type: PageType, title: string, slug: string, order: number, visible: boolean): PageBlueprint {
    return {
      id: `page_${type}`,
      type,
      title,
      slug,
      description: `${title} page`,
      sections: [],
      order,
      visible,
      metadata: {},
    };
  }
}
