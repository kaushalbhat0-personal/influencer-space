import type { BuilderPage } from "./types";
import type { LayoutSnapshot } from "@/types/snapshot";

/**
 * Convert builder draft pages into a LayoutSnapshot. This is the SINGLE
 * flattening rule shared by the publish pipeline (server) and the builder
 * preview (client) so the preview always matches the published storefront.
 *
 * Every block in a section becomes one snapshot section. Empty sections are
 * omitted (an empty section cannot render and would emit an unregistered
 * module id). Visibility is preserved from both the section and the block.
 */
export function builderPagesToLayoutSnapshot(pages: BuilderPage[]): LayoutSnapshot {
  return {
    pages: pages.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      isHome: p.isHome,
      order: p.order,
      sections: p.sections.flatMap((s) =>
        s.slots.length > 0
          ? s.slots.map((slot, i) => ({
              id: `${s.id}__${slot.id}`,
              moduleId: slot.moduleId,
              config: slot.config ?? {},
              order: s.order * 100 + i,
              visible: s.visible && slot.visible !== false,
            }))
          : [],
      ),
    })),
  };
}

/** Parse the builder slot id back out of a flattened snapshot section id. */
export function slotIdFromSectionId(sectionId: string): string {
  const sep = sectionId.indexOf("__");
  return sep >= 0 ? sectionId.slice(sep + 2) : sectionId;
}
