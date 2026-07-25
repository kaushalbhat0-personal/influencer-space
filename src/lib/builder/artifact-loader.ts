import type { BuilderPage } from "./types";

interface StorefrontData {
  website?: Record<string, unknown>;
  navigation?: Record<string, unknown>;
  sections?: Array<{ id: string; type: string; props: Record<string, unknown> }>;
  theme?: Record<string, unknown>;
  seo?: Record<string, unknown>;
  products?: Array<Record<string, unknown>>;
  gallery?: Record<string, unknown>;
  feed?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export function storefrontToBuilderPages(data: StorefrontData): BuilderPage[] {
  const pages: BuilderPage[] = [];
  const sections = data.sections ?? [];

  const homeSectionRows = sections;
  const productSectionRows = sections.filter((s) => s.type === "product_grid");

  pages.push(buildPage("home", "Home", "/", true, 1, homeSectionRows));

  if (productSectionRows.length > 0) {
    pages.push(buildPage("products", "Products", "/products", false, 2, productSectionRows));
  }

  return pages;
}

function buildPage(
  id: string,
  name: string,
  slug: string,
  isHome: boolean,
  order: number,
  sectionRows: StorefrontData["sections"],
): BuilderPage {
  return {
    id: `page_${id}`,
    name,
    slug,
    order,
    isHome,
    theme: "",
    metadata: {},
    sections: (sectionRows ?? []).map((sec, i) => ({
      id: sec.id ?? `section_${id}_${i}`,
      name: sec.type ?? `Section ${i + 1}`,
      order: i,
      visible: true,
      locked: false,
      metadata: {},
      slots: [
        {
          id: `slot_${sec.id ?? `${id}_${i}`}_0`,
          moduleId: mapSectionTypeToModule(sec.type),
          parentId: null,
          order: 0,
          visible: true,
          locked: false,
          config: sec.props ?? {},
          metadata: {},
        },
      ],
    })),
  };
}

function mapSectionTypeToModule(sectionType: string): string {
  const moduleMap: Record<string, string> = {
    hero: "hero",
    featured_products: "featured-products",
    product_grid: "product-grid",
    content_feed: "content-feed",
    gallery: "gallery",
    about: "about",
    contact_form: "contact",
    social_links: "social-links",
    faq: "faq",
    footer: "footer",
    stats: "stats",
    testimonials: "testimonials",
    newsletter: "newsletter",
  };
  return moduleMap[sectionType] ?? "content";
}
