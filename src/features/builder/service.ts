import { prisma } from "@/lib/prisma";
import type { BuilderPage } from "@/lib/builder/types";

export const builderFeatureService = {
  async getPages(tenantId: string): Promise<BuilderPage[]> {
    const website = await prisma.website.findUnique({ where: { tenantId } });
    if (!website) return [];

    const pages = await prisma.page.findMany({
      where: { websiteId: website.id },
      orderBy: { order: "asc" },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            blocks: { orderBy: { order: "asc" } },
          },
        },
      },
    });

    return pages.map((page) => ({
      id: page.id,
      name: page.name,
      slug: page.slug,
      order: page.order,
      isHome: page.isHome,
      sections: page.sections.map((section) => ({
        id: section.id,
        name: section.name,
        order: section.order,
        visible: section.visible,
        locked: section.locked,
        slots: section.blocks.map((block) => ({
          id: block.id,
          moduleId: block.moduleId,
          parentId: block.parentId,
          order: block.order,
          visible: block.visible,
          locked: block.locked,
          config: (block.config ?? {}) as Record<string, unknown>,
          metadata: {},
        })),
        metadata: {},
      })),
      theme: page.theme,
      metadata: {},
    }));
  },

  async getTenantIdFromWebsite(websiteId: string): Promise<string | null> {
    const website = await prisma.website.findUnique({ where: { id: websiteId }, select: { tenantId: true } });
    return website?.tenantId ?? null;
  },
};
