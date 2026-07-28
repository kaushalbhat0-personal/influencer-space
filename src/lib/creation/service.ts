import { blueprintRegistry } from "@/lib/blueprint/registry";
import { themeRegistry } from "@/lib/theme/registry-new";
import { recommendationEngine } from "./recommendation/engine";
import type { GenerationContext, GenerationResult, GeneratedPage, GeneratedSection, GeneratedNavItem, WebsiteDefinition } from "./types";

export class WebsiteGenerationService {
  async generate(ctx: GenerationContext): Promise<GenerationResult> {
    const recommendation = recommendationEngine.recommend(ctx);
    const blueprintId = ctx.blueprintId ?? recommendation.recommendedBlueprintId ?? "com.creatos.creator";
    const themeId = ctx.themeId ?? recommendation.recommendedThemeId ?? "com.creatos.neon-dark";

    const blueprint = blueprintRegistry.resolveInheritedBlueprint(blueprintId);
    const theme = themeRegistry.getById(themeId);

    const pages: GeneratedPage[] = blueprint.pages.map((page) => ({
      id: page.id,
      name: this.applyPlaceholders(page.name, ctx),
      slug: page.slug,
      isHome: page.isHome,
      order: page.order,
      sections: page.sections.map((sec) => {
        const section: GeneratedSection = {
          id: sec.id,
          moduleId: sec.moduleId,
          order: sec.order,
          visible: sec.visible,
          config: { ...sec.config },
        };
        if (blueprint.starterContent?.placeholders) {
          for (const [key, value] of Object.entries(blueprint.starterContent.placeholders)) {
            if (!section.config[key]) {
              section.config[key] = this.applyPlaceholders(value, ctx);
            }
          }
        }
        return section;
      }),
    }));

    const navigation: GeneratedNavItem[] = blueprint.navigation.map((item) => ({
      id: item.id,
      label: this.applyPlaceholders(item.label, ctx),
      href: item.href,
      type: item.type,
      order: item.order,
      visible: item.visible,
    }));

    return {
      blueprintId,
      themeId: theme?.id ?? "com.creatos.neon-dark",
      pages,
      navigation,
      themeVariant: ctx.styleId === "minimal" ? "light" : "dark",
    };
  }

  async generateDefinition(ctx: GenerationContext): Promise<WebsiteDefinition> {
    const result = await this.generate(ctx);
    return {
      tenantName: ctx.creator.name,
      creatorName: ctx.creator.name,
      creatorEmail: "",
      tagline: ctx.creator.tagline,
      bio: ctx.creator.bio,
      avatarUrl: ctx.creator.avatarUrl ?? undefined,
      blueprintId: result.blueprintId,
      themeId: result.themeId,
      themeVariant: result.themeVariant,
      pages: result.pages,
      navigation: result.navigation,
      source: "blueprint",
      capabilities: ctx.capabilities,
    };
  }

  generateFromBlueprint(blueprintId: string, name: string): WebsiteDefinition {
    const blueprint = blueprintRegistry.resolveInheritedBlueprint(blueprintId);
    return {
      tenantName: name,
      creatorName: name,
      creatorEmail: "",
      blueprintId,
      themeId: blueprint.recommendedThemes[0] ?? "com.creatos.neon-dark",
      themeVariant: "dark",
      pages: blueprint.pages.map((p) => ({
        id: p.id, name: p.name, slug: p.slug, isHome: p.isHome, order: p.order,
        sections: p.sections.map((s) => ({
          id: s.id, moduleId: s.moduleId, order: s.order, visible: s.visible, config: { ...s.config },
        })),
      })),
      navigation: blueprint.navigation.map((n) => ({
        id: n.id, label: n.label, href: n.href, type: n.type, order: n.order, visible: n.visible,
      })),
      source: "blueprint",
    };
  }

  private applyPlaceholders(text: string, ctx: GenerationContext): string {
    return text
      .replace(/{name}/g, ctx.creator.name)
      .replace(/{tagline}/g, ctx.creator.tagline ?? "")
      .replace(/{bio}/g, ctx.creator.bio ?? "");
  }
}

export const websiteGenerationService = new WebsiteGenerationService();
