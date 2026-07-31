import type { WebsiteBlueprint, BlueprintSection } from "@/modules/website-blueprint/domain/types";
import type { BlueprintRuntime, ResolvedRuntime, ResolvedPage, ResolvedSection, RuntimeFeatures } from "../domain/types";
import { getWidgetTier } from "../domain/registries";
import { logger } from "@/lib/observability/logger";

export function resolveRuntime(
  blueprint: WebsiteBlueprint,
  features?: Partial<RuntimeFeatures>,
): BlueprintRuntime {
  const startTime = Date.now();

  const defaultFeatures: RuntimeFeatures = {
    booking: false, commerce: true, community: false,
    analytics: true, aiWidgets: false, premium: false,
  };
  const activeFeatures = { ...defaultFeatures, ...features };

  const resolvedPages: ResolvedPage[] = blueprint.pages.map((page) => ({
    id: page.id,
    slug: page.slug,
    title: page.title,
    sections: resolveSections(page.sections, activeFeatures),
    seo: {
      title: page.seo.title || blueprint.seo.globalTitle,
      description: page.seo.description || blueprint.seo.globalDescription,
      noIndex: page.seo.noIndex,
    },
    layout: {
      width: page.layout.width || blueprint.layout.pageWidth,
      showTitle: page.layout.showTitle,
    },
  }));

  const resolvedGlobalSections = resolveSections(blueprint.globalSections, activeFeatures);

  const resolvedRuntime: ResolvedRuntime = {
    pages: resolvedPages,
    navigation: blueprint.navigation.items.map((item) => ({
      ...item,
      visible: item.visible && resolvedPages.some((p) => p.slug === item.href),
    })),
    globalSections: resolvedGlobalSections,
    layout: {
      pageWidth: blueprint.layout.pageWidth,
      contentSpacing: blueprint.layout.contentSpacing,
      containerStyle: blueprint.layout.containerStyle,
    },
    theme: {
      packageId: blueprint.theme.packageId,
      mode: blueprint.theme.mode,
      colors: {
        primary: blueprint.branding.primaryColor,
        secondary: blueprint.branding.secondaryColor,
      },
    },
  };

  const totalSections = resolvedPages.reduce((sum, p) => sum + p.sections.length, 0);
  const visibleSections = resolvedPages.reduce((sum, p) => sum + p.sections.filter((s) => s.visibility === "visible").length, 0);
  const hasErrors = resolvedPages.some((p) => p.sections.some((s) => s.visibility === "disabled"));

  const runtime: BlueprintRuntime = {
    blueprint,
    resolved: resolvedRuntime,
    metadata: {
      version: `${blueprint.version.major}.${blueprint.version.minor}.${blueprint.version.patch}`,
      resolvedAt: new Date().toISOString(),
      validationStatus: hasErrors ? "errors" : visibleSections < totalSections ? "warnings" : "valid",
      pageCount: resolvedPages.length,
      sectionCount: totalSections,
    },
    features: activeFeatures,
  };

  logger.info("Blueprint runtime resolved", "blueprint-runtime", {
    metadata: {
      pages: resolvedPages.length,
      sections: totalSections,
      durationMs: Date.now() - startTime,
    } as Record<string, unknown>,
  });

  return runtime;
}

function resolveSections(
  sections: BlueprintSection[],
  features: RuntimeFeatures,
): ResolvedSection[] {
  return sections.map((section) => {
    const tier = getWidgetTier(section.type);

    let visibility: ResolvedSection["visibility"] = "visible";

    if (tier === "premium" && !features.premium) {
      visibility = "premium";
    } else if (tier === "experimental" && !features.aiWidgets) {
      visibility = "disabled";
    } else if (section.visibility === "hidden") {
      visibility = "hidden";
    }

    return {
      id: section.id,
      type: section.type,
      label: section.label,
      order: section.order,
      visibility,
      configuration: section.configuration,
      layoutHints: section.layoutHints,
    };
  });
}
