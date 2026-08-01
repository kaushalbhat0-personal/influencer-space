export interface SectionDefinition {
  type: string;
  label: string;
  description: string;
  allowedPages: string[];
  defaultConfiguration: Record<string, unknown>;
}

/**
 * Section → component mapping for blueprint composition.
 *
 * Every `type` value MUST be a component id registered in the ComponentRegistry
 * (src/lib/registry/components). Section types are written directly as the
 * Block.moduleId in the builder, so an unregistered type here is the root cause
 * of "Unknown component" failures at render and publish time.
 *
 * One entry per registered component id. No aliases, no dead ids, no stale ids.
 */
export const SECTION_REGISTRY: SectionDefinition[] = [
  { type: "hero.default", label: "Hero", description: "Full-width hero section with title and CTA", allowedPages: ["/"], defaultConfiguration: { showCta: true, ctaText: "Get Started" } },
  { type: "hero.gaming", label: "Gaming Hero", description: "Hero with live badge and stream status", allowedPages: ["/"], defaultConfiguration: { showLiveBadge: true } },
  { type: "hero.fitness", label: "Fitness Hero", description: "Energetic hero for fitness businesses", allowedPages: ["/"], defaultConfiguration: { showCta: true, ctaText: "Start Today" } },
  { type: "about.default", label: "About", description: "About section with bio, image, and social links", allowedPages: ["/", "/about"], defaultConfiguration: { imagePosition: "right" } },
  { type: "products.grid", label: "Product Grid", description: "Grid of products with prices", allowedPages: ["/", "/products"], defaultConfiguration: { columns: 3, showPrices: true } },
  { type: "services.default", label: "Services", description: "Services and coaching packages", allowedPages: ["/", "/services"], defaultConfiguration: { columns: 3 } },
  { type: "courses.default", label: "Courses", description: "Course catalog for educators", allowedPages: ["/", "/courses"], defaultConfiguration: { columns: 3 } },
  { type: "pricing.default", label: "Pricing", description: "Pricing plans and packages", allowedPages: ["/", "/pricing"], defaultConfiguration: { plans: 3, showCta: true } },
  { type: "gallery.grid", label: "Gallery", description: "Image gallery in grid layout", allowedPages: ["/", "/gallery"], defaultConfiguration: { columns: 3, lightbox: true } },
  { type: "testimonials.default", label: "Testimonials", description: "Customer or fan testimonials", allowedPages: ["/", "/testimonials", "/about"], defaultConfiguration: { autoRotate: true } },
  { type: "faq.default", label: "FAQ", description: "Frequently asked questions accordion", allowedPages: ["/", "/faq"], defaultConfiguration: { expandFirst: true } },
  { type: "newsletter.default", label: "Newsletter", description: "Email newsletter signup form", allowedPages: ["/"], defaultConfiguration: { showName: true } },
  { type: "contact.default", label: "Contact", description: "Contact form section", allowedPages: ["/", "/contact"], defaultConfiguration: { showPhone: true } },
  { type: "links.default", label: "Social Links", description: "Social media and affiliate links", allowedPages: ["/", "/links"], defaultConfiguration: {} },
  { type: "timeline.default", label: "Timeline", description: "Career milestones and achievements timeline", allowedPages: ["/"], defaultConfiguration: {} },
  { type: "games.default", label: "Games", description: "Games and gaming content", allowedPages: ["/"], defaultConfiguration: {} },
  { type: "contentFeed.default", label: "Content Feed", description: "Social content feed grid", allowedPages: ["/"], defaultConfiguration: {} },
  { type: "footer.default", label: "Footer", description: "Website footer with links and copyright", allowedPages: ["/"], defaultConfiguration: {} },
];

export function getSectionDefinition(type: string): SectionDefinition | undefined {
  return SECTION_REGISTRY.find((s) => s.type === type);
}
