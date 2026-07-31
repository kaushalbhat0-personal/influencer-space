import type { WebsiteBlueprint } from "@/modules/website-blueprint/domain/types";
import type { BlueprintValidationResult, ValidationIssue } from "../domain/types";
import { WIDGET_REGISTRY } from "../domain/registries";

export function validateBlueprint(blueprint: WebsiteBlueprint): BlueprintValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const suggestions: string[] = [];

  // Check homepage exists
  const homepage = blueprint.pages.find((p) => p.slug === "/");
  if (!homepage) {
    errors.push({ code: "MISSING_HOMEPAGE", message: "Blueprint has no homepage", path: "pages" });
  }

  // Check for duplicate slugs
  const slugs = new Map<string, number>();
  for (const page of blueprint.pages) {
    const count = (slugs.get(page.slug) || 0) + 1;
    slugs.set(page.slug, count);
  }
  for (const slug of Array.from(slugs.keys())) {
    const count = slugs.get(slug)!;
    if (count > 1) {
      errors.push({ code: "DUPLICATE_SLUG", message: `Duplicate page slug: ${slug}`, path: `pages/${slug}` });
    }
  }

  // Check navigation items point to existing pages
  const pageSlugs = new Set(blueprint.pages.map((p) => p.slug));
  for (const nav of blueprint.navigation.items) {
    if (nav.href !== "/" && !pageSlugs.has(nav.href)) {
      warnings.push({ code: "BROKEN_NAV", message: `Navigation "${nav.label}" points to missing page: ${nav.href}`, path: `navigation/${nav.id}` });
    }
  }

  // Check for unknown widget types
  const knownTypes = new Set(WIDGET_REGISTRY.map((w) => w.type));
  for (const page of blueprint.pages) {
    for (const section of page.sections) {
      const baseType = section.type.split(".")[0];
      if (!knownTypes.has(baseType)) {
        warnings.push({ code: "UNKNOWN_WIDGET", message: `Unknown widget type: ${section.type}`, path: `pages/${page.slug}/sections/${section.id}` });
      }
    }
  }

  // Check branding
  if (!blueprint.branding.businessName) {
    errors.push({ code: "MISSING_BRAND", message: "Business name is required", path: "branding" });
  }

  // Check for empty pages
  for (const page of blueprint.pages) {
    if (page.sections.length === 0) {
      warnings.push({ code: "EMPTY_PAGE", message: `Page "${page.slug}" has no sections`, path: `pages/${page.slug}` });
    }
  }

  // Suggestions
  if (blueprint.pages.length < 2) {
    suggestions.push("Add more pages to improve navigation and SEO");
  }
  if (blueprint.commerce.enabled && blueprint.commerce.offers.length === 0) {
    suggestions.push("Commerce is enabled but no offers are configured");
  }
  if (!blueprint.seo.globalDescription) {
    suggestions.push("Add a global SEO description for better search ranking");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}
