import { prisma } from "@/lib/prisma";
import { templateRegistry } from "./registry";
import type { Template } from "./registry";

export class TemplateService {
  listTemplates(): Template[] {
    return templateRegistry.getAll();
  }

  getTemplate(id: string): Template | undefined {
    return templateRegistry.getById(id);
  }

  inferTemplate(name: string): Template {
    return templateRegistry.inferFromName(name);
  }

  async apply(websiteId: string, templateId: string): Promise<void> {
    const template = templateRegistry.getById(templateId);
    if (!template) throw new Error(`Template "${templateId}" not found`);

    // Delete existing builder data
    await prisma.page.deleteMany({ where: { websiteId } });

    // Create pages from template
    for (const tplPage of template.pages) {
      const page = await prisma.page.create({
        data: {
          websiteId,
          name: tplPage.name,
          slug: tplPage.slug,
          order: tplPage.order,
          isHome: tplPage.isHome,
        },
      });

      for (const tplSec of tplPage.sections) {
        const section = await prisma.section.create({
          data: {
            pageId: page.id,
            name: tplSec.name,
            order: tplSec.order,
            visible: true,
            locked: false,
          },
        });

        if (tplSec.blocks.length > 0) {
          await prisma.block.createMany({
            data: tplSec.blocks.map((b) => ({
              sectionId: section.id,
              moduleId: b.moduleId,
              order: b.order,
              visible: true,
              locked: false,
              config: JSON.parse(JSON.stringify(b.config || {})),
            })),
          });
        }
      }
    }

    // Store navigation in website config
    const existingConfig = await getExistingConfig(websiteId);
    await prisma.website.update({
      where: { id: websiteId },
      data: { themeConfig: JSON.parse(JSON.stringify({ ...existingConfig, navigation: template.navigation })) },
    });
  }
}

async function getExistingConfig(websiteId: string): Promise<Record<string, unknown>> {
  const website = await prisma.website.findUnique({ where: { id: websiteId }, select: { themeConfig: true } });
  return ((website?.themeConfig as Record<string, unknown>) || {});
}

export const templateService = new TemplateService();
