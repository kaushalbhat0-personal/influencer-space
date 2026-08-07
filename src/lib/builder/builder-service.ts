import { prisma } from "@/lib/prisma";
import type { BuilderPage } from "./types";
import { isDeprecatedSection } from "@/lib/registry/resolve-module";

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
      // IMPLEMENTATION-19: deprecated sections (About) are stripped on load so
      // old drafts migrate automatically and the sidebar can never show a
      // section that no longer renders.
      sections: p.sections
        .map((sec) => ({
          id: sec.id,
          name: sec.name,
          order: sec.order,
          visible: sec.visible,
          locked: sec.locked,
          metadata: toJson(sec.config),
          slots: sec.blocks
            .filter((b) => !isDeprecatedSection(b.moduleId))
            .map((b) => ({
              id: b.id,
              moduleId: b.moduleId,
              parentId: b.parentId ?? null,
              order: b.order,
              visible: b.visible,
              locked: b.locked,
              config: toJson(b.config),
              metadata: {},
            })),
        }))
        .filter((sec) => sec.slots.length > 0),
    }));
  }

  async save(websiteId: string, pages: BuilderPage[], tx?: TxClient): Promise<void> {
    // VALIDATION-03: the deleteMany + recreate must be atomic. Without a
    // transaction an interleaved save (two users / two tabs) can leave the
    // draft partially deleted or corrupted. When no tx is provided, wrap the
    // whole rewrite in a transaction.
    if (tx) {
      await this.saveInner(websiteId, pages, tx);
      return;
    }
    await prisma.$transaction((t) => this.saveInner(websiteId, pages, t as TxClient));
  }

  private async saveInner(websiteId: string, pages: BuilderPage[], client: TxClient): Promise<void> {
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
