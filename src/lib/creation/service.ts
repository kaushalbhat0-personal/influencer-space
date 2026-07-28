import { blueprintRegistry } from "@/lib/blueprint/registry";
import { themeRegistry } from "@/lib/theme/registry-new";
import { recommendationEngine } from "./recommendation/engine";
import type { GenerationContext, GenerationResult, GeneratedPage, GeneratedSection, GeneratedNavItem } from "./types";

export class WebsiteGenerationService {
  async generate(ctx: GenerationContext): Promise<GenerationResult> {
    // 1. Get recommendation
    const recommendation = recommendationEngine.recommend(ctx);
    const blueprintId = ctx.blueprintId ?? recommendation.recommendedBlueprintId ?? "com.creatos.creator";
    const themeId = ctx.themeId ?? recommendation.recommendedThemeId ?? "com.creatos.neon-dark";

    // 2. Resolve blueprint with inheritance
    const blueprint = blueprintRegistry.resolveInheritedBlueprint(blueprintId);

    // 3. Verify theme compatibility
    const theme = themeRegistry.getById(themeId);

    // 4. Generate pages from blueprint
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

        // Apply starter content placeholders
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

    // 5. Generate navigation from blueprint
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

  private applyPlaceholders(text: string, ctx: GenerationContext): string {
    return text
      .replace(/{name}/g, ctx.creator.name)
      .replace(/{tagline}/g, ctx.creator.tagline)
      .replace(/{bio}/g, ctx.creator.bio);
  }
}

export const websiteGenerationService = new WebsiteGenerationService();
