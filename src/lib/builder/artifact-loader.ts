import type { BuilderPage } from "./types";
import { resolveModuleId, moduleIdToDisplayName } from "@/lib/registry/resolve-module";
import { componentRegistry } from "@/lib/registry/components";

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
    sections: (sectionRows ?? [])
      // Drop legacy/generated section types with no registered component so
      // the builder can never hold an unregistered moduleId.
      .filter((sec) => componentRegistry.get(resolveModuleId(sec.type ?? "")) !== undefined)
      .map((sec, i) => {
      const moduleId = resolveModuleId(sec.type ?? "");
      return {
        id: sec.id ?? `section_${id}_${i}`,
        name: moduleIdToDisplayName(moduleId),
        order: i,
        visible: true,
        locked: false,
        metadata: {},
        slots: [
          {
            id: `slot_${sec.id ?? `${id}_${i}`}_0`,
            moduleId,
            parentId: null,
            order: 0,
            visible: true,
            locked: false,
            config: sec.props ?? {},
            metadata: {},
          },
        ],
      };
    }),
  };
}
