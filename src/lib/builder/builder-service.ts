import { prisma } from "@/lib/prisma";
import type { BuilderPage } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = any;

function toJson(val: unknown): JsonValue {
  return JSON.parse(JSON.stringify(val));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any;

export class BuilderService {
  async load(websiteId: string): Promise<BuilderPage[]> {
    const dbPages = await prisma.page.findMany({
      where: { websiteId },
      include: { sections: { include: { blocks: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } } },
      orderBy: { order: "asc" },
    });

    return dbPages.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      order: p.order,
      isHome: p.isHome,
      theme: p.theme,
      metadata: toJson(p.config),
      sections: p.sections.map((sec) => ({
        id: sec.id,
        name: sec.name,
        order: sec.order,
        visible: sec.visible,
        locked: sec.locked,
        metadata: toJson(sec.config),
        slots: sec.blocks.map((b) => ({
          id: b.id,
          moduleId: b.moduleId,
          parentId: b.parentId ?? null,
          order: b.order,
          visible: b.visible,
          locked: b.locked,
          config: toJson(b.config),
          metadata: {},
        })),
      })),
    }));
  }

  async save(websiteId: string, pages: BuilderPage[], tx?: TxClient): Promise<void> {
    const client = tx || prisma;
    await client.page.deleteMany({ where: { websiteId } });

    for (const page of pages) {
      const created = await client.page.create({
        data: {
          websiteId,
          name: page.name,
          slug: page.slug,
          order: page.order,
          isHome: page.isHome,
          theme: page.theme,
          config: toJson(page.metadata),
        },
      });

      for (const section of page.sections) {
        const createdSection = await client.section.create({
          data: {
            pageId: created.id,
            name: section.name,
            order: section.order,
            visible: section.visible,
            locked: section.locked,
            config: toJson(section.metadata),
          },
        });

        if (section.slots.length > 0) {
          await client.block.createMany({
            data: section.slots.map((slot) => ({
              sectionId: createdSection.id,
              moduleId: slot.moduleId,
              parentId: slot.parentId ?? null,
              order: slot.order,
              visible: slot.visible,
              locked: slot.locked,
              config: toJson(slot.config),
            })),
          });
        }
      }
    }
  }
}
