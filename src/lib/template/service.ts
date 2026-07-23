import { prisma } from "@/lib/prisma";
import { templateRegistry } from "./registry";
import type { Template } from "./registry";

export interface ApplyTemplateInput {
  websiteId: string;
  templateId: string;
  generatedContent?: GeneratedContentInput;
}

export interface GeneratedContentInput {
  heroTitle?: string;
  heroSubtitle?: string;
  heroCta?: string;
  aboutSection?: string;
  tagline?: string;
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
}

function injectContent(
  moduleId: string,
  config: Record<string, unknown>,
  content?: GeneratedContentInput,
): Record<string, unknown> {
  if (!content) return config;

  const result = { ...config };

  if (moduleId.startsWith("hero.")) {
    if (content.heroTitle) result.title = content.heroTitle;
    if (content.heroSubtitle) result.subtitle = content.heroSubtitle;
    if (content.heroCta) {
      result.cta = content.heroCta;
      result.buttonText = content.heroCta;
    }
  }

  if (moduleId.startsWith("about.")) {
    if (content.aboutSection) result.content = content.aboutSection;
    if (content.tagline) result.title = content.tagline;
  }

  if (moduleId.startsWith("footer.")) {
    if (content.tagline) result.copyright = `\u00A9 ${content.tagline}`;
  }

  return result;
}

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

  async apply(input: ApplyTemplateInput): Promise<void> {
    const { websiteId, templateId, generatedContent } = input;
    const template = templateRegistry.getById(templateId);
    if (!template) throw new Error(`Template "${templateId}" not found`);

    // Delete existing builder data
    await prisma.page.deleteMany({ where: { websiteId } });

    // Create pages from template with injected generated content
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
              config: JSON.parse(JSON.stringify(injectContent(b.moduleId, b.config || {}, generatedContent))),
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
