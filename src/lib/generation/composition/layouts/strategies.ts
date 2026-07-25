import { BaseLayoutStrategy } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";

export class DefaultLayoutStrategy extends BaseLayoutStrategy {
  readonly niche = "default";
  readonly label = "Default";
  readonly description = "Generic creator store layout";

  composeSections(graph: KnowledgeGraph) {
    return [
      this.hero({ name: `${graph.creator.name}'s Store`, tagline: graph.brand.tagline || graph.creator.bio?.slice(0, 120) || "", cta: "Shop Now" }),
      ...this.products(graph),
      ...this.contentFeed(graph),
      ...this.about(graph),
      ...this.social(graph),
      ...this.faq(graph),
      ...this.contact(),
      ...this.footer(graph.creator.name),
    ];
  }
}

export class EducationLayoutStrategy extends BaseLayoutStrategy {
  readonly niche = "education";
  readonly label = "Education";
  readonly description = "Course creator layout with testimonials and FAQ";

  composeSections(graph: KnowledgeGraph) {
    return [
      this.hero({ name: `Learn with ${graph.creator.name}`, tagline: graph.brand.tagline || "Master new skills today", cta: "Browse Courses", alignment: "left" }),
      ...this.products(graph, "Featured Courses", 3),
      ...this.testimonial(),
      ...this.contentFeed(graph),
      ...this.faq(graph),
      ...this.about(graph),
      ...this.contact(),
      ...this.footer(graph.creator.name),
    ];
  }
}

export class PhotographyLayoutStrategy extends BaseLayoutStrategy {
  readonly niche = "photography";
  readonly label = "Photography";
  readonly description = "Visual-first portfolio layout with gallery emphasis";

  composeSections(graph: KnowledgeGraph) {
    return [
      this.hero({ name: graph.creator.name, tagline: graph.brand.tagline || "Capturing moments that matter", cta: "View Portfolio", overlay: true }),
      ...this.gallery("Portfolio"),
      ...this.products(graph, "Prints & Presets"),
      ...this.about(graph),
      ...this.social(graph),
      ...this.contact(),
      ...this.footer(graph.creator.name),
    ];
  }
}

export class GamingLayoutStrategy extends BaseLayoutStrategy {
  readonly niche = "gaming";
  readonly label = "Gaming";
  readonly description = "Gaming creator layout with content feed and community";

  composeSections(graph: KnowledgeGraph) {
    return [
      this.hero({ name: graph.creator.name, tagline: graph.brand.tagline || `Welcome to the ${graph.creator.name} stream`, cta: "Watch Now" }),
      ...this.contentFeed(graph),
      ...this.products(graph, "Gaming Merch"),
      ...this.about(graph),
      ...this.social(graph),
      ...this.contact(),
      ...this.footer(graph.creator.name),
    ];
  }
}

export class MusicLayoutStrategy extends BaseLayoutStrategy {
  readonly niche = "music";
  readonly label = "Music";
  readonly description = "Music artist layout with releases and events";

  composeSections(graph: KnowledgeGraph) {
    return [
      this.hero({ name: graph.creator.name, tagline: graph.brand.tagline || "Latest music and updates", cta: "Listen Now" }),
      ...this.products(graph, "Latest Release", 1),
      ...this.contentFeed(graph),
      ...this.about(graph),
      ...this.gallery("Gallery"),
      ...this.social(graph),
      ...this.contact(),
      ...this.footer(graph.creator.name),
    ];
  }
}

export class TechnologyLayoutStrategy extends BaseLayoutStrategy {
  readonly niche = "technology";
  readonly label = "Technology";
  readonly description = "Tech creator layout with products and blog";

  composeSections(graph: KnowledgeGraph) {
    return [
      this.hero({ name: graph.creator.name, tagline: graph.brand.tagline || "Building the future", cta: "See Products" }),
      ...this.products(graph, "Featured Products"),
      ...this.productGrid(graph),
      ...this.contentFeed(graph),
      ...this.about(graph),
      ...this.contact(),
      ...this.footer(graph.creator.name),
    ];
  }
}

export class FitnessLayoutStrategy extends BaseLayoutStrategy {
  readonly niche = "fitness";
  readonly label = "Fitness";
  readonly description = "Fitness creator layout with programs and transformations";

  composeSections(graph: KnowledgeGraph) {
    return [
      this.hero({ name: `Transform with ${graph.creator.name}`, tagline: graph.brand.tagline || "Start your fitness journey today", cta: "Start Now" }),
      ...this.products(graph, "Programs"),
      ...this.stats(),
      ...this.testimonial(),
      ...this.contentFeed(graph),
      ...this.about(graph),
      ...this.contact(),
      ...this.footer(graph.creator.name),
    ];
  }
}

export class FoodLayoutStrategy extends BaseLayoutStrategy {
  readonly niche = "food";
  readonly label = "Food";
  readonly description = "Food creator layout with recipes and gallery";

  composeSections(graph: KnowledgeGraph) {
    return [
      this.hero({ name: `Cook with ${graph.creator.name}`, tagline: graph.brand.tagline || "Delicious recipes made simple", cta: "See Recipes" }),
      ...this.products(graph, "Featured Recipes"),
      ...this.gallery("Food Gallery"),
      ...this.contentFeed(graph),
      ...this.about(graph),
      ...this.contact(),
      ...this.footer(graph.creator.name),
    ];
  }
}

export class FashionLayoutStrategy extends BaseLayoutStrategy {
  readonly niche = "lifestyle";
  readonly label = "Fashion & Lifestyle";
  readonly description = "Fashion creator layout with collections and lookbook";

  composeSections(graph: KnowledgeGraph) {
    return [
      this.hero({ name: graph.creator.name, tagline: graph.brand.tagline || "Curated style and inspiration", cta: "Shop Collection", overlay: true }),
      ...this.products(graph, "Collections"),
      ...this.gallery("Lookbook"),
      ...this.contentFeed(graph),
      ...this.about(graph),
      ...this.social(graph),
      ...this.contact(),
      ...this.footer(graph.creator.name),
    ];
  }
}

export class TravelLayoutStrategy extends BaseLayoutStrategy {
  readonly niche = "travel";
  readonly label = "Travel";
  readonly description = "Travel creator layout with destinations and guides";

  composeSections(graph: KnowledgeGraph) {
    return [
      this.hero({ name: `Explore with ${graph.creator.name}`, tagline: graph.brand.tagline || "Discover amazing destinations", cta: "Explore" }),
      ...this.gallery("Destinations"),
      ...this.products(graph, "Travel Guides"),
      ...this.contentFeed(graph),
      ...this.about(graph),
      ...this.social(graph),
      ...this.contact(),
      ...this.footer(graph.creator.name),
    ];
  }
}

export class ArtLayoutStrategy extends BaseLayoutStrategy {
  readonly niche = "art";
  readonly label = "Art";
  readonly description = "Artist portfolio layout with commissions and gallery";

  composeSections(graph: KnowledgeGraph) {
    return [
      this.hero({ name: graph.creator.name, tagline: graph.brand.tagline || "Original art and commissions", cta: "View Gallery", overlay: true }),
      ...this.gallery("Portfolio"),
      ...this.products(graph, "Shop Art"),
      ...this.about(graph),
      ...this.contact(),
      ...this.social(graph),
      ...this.footer(graph.creator.name),
    ];
  }
}

export class SportsLayoutStrategy extends BaseLayoutStrategy {
  readonly niche = "sports";
  readonly label = "Sports";
  readonly description = "Sports creator layout with gear and stats";

  composeSections(graph: KnowledgeGraph) {
    return [
      this.hero({ name: graph.creator.name, tagline: graph.brand.tagline || "Train harder, go further", cta: "Shop Gear" }),
      ...this.products(graph, "Training Gear"),
      ...this.stats(),
      ...this.contentFeed(graph),
      ...this.about(graph),
      ...this.social(graph),
      ...this.contact(),
      ...this.footer(graph.creator.name),
    ];
  }
}

export class NewsLayoutStrategy extends BaseLayoutStrategy {
  readonly niche = "news";
  readonly label = "News";
  readonly description = "News and media creator layout with feed and newsletter";

  composeSections(graph: KnowledgeGraph) {
    return [
      this.hero({ name: graph.creator.name, tagline: graph.brand.tagline || "Stay informed", cta: "Read More", alignment: "left" }),
      ...this.contentFeed(graph),
      ...this.about(graph),
      ...this.social(graph),
      ...this.contact(),
      ...this.footer(graph.creator.name),
    ];
  }
}

export const ALL_STRATEGIES: BaseLayoutStrategy[] = [
  new DefaultLayoutStrategy(),
  new EducationLayoutStrategy(),
  new PhotographyLayoutStrategy(),
  new GamingLayoutStrategy(),
  new MusicLayoutStrategy(),
  new TechnologyLayoutStrategy(),
  new FitnessLayoutStrategy(),
  new FoodLayoutStrategy(),
  new FashionLayoutStrategy(),
  new TravelLayoutStrategy(),
  new ArtLayoutStrategy(),
  new SportsLayoutStrategy(),
  new NewsLayoutStrategy(),
];

const STRATEGY_MAP = new Map<string, BaseLayoutStrategy>();
for (const s of ALL_STRATEGIES) STRATEGY_MAP.set(s.niche, s);

export function getLayoutStrategy(niche: string): BaseLayoutStrategy {
  return STRATEGY_MAP.get(niche) ?? new DefaultLayoutStrategy();
}
