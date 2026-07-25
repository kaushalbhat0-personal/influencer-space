import type { WebsiteBlueprint } from "./types";

export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
  score: number;
}

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  category: string;
  message: string;
  field?: string;
}

export class BlueprintValidator {
  validate(blueprint: WebsiteBlueprint): ValidationReport {
    const issues: ValidationIssue[] = [];

    this.validateWebsite(blueprint, issues);
    this.validatePages(blueprint, issues);
    this.validateNavigation(blueprint, issues);
    this.validateSections(blueprint, issues);
    this.validateProducts(blueprint, issues);
    this.validateTheme(blueprint, issues);
    this.validateSEO(blueprint, issues);
    this.validateBuilder(blueprint, issues);

    const errors = issues.filter((i) => i.severity === "error").length;
    const score = this.calculateScore(blueprint, issues);

    return {
      valid: errors === 0,
      issues,
      score,
    };
  }

  private validateWebsite(blueprint: WebsiteBlueprint, issues: ValidationIssue[]): void {
    if (!blueprint.website.title) issues.push({ severity: "error", category: "website", message: "Website title is missing", field: "title" });
    if (!blueprint.website.domain) issues.push({ severity: "error", category: "website", message: "Website domain is missing", field: "domain" });
    if (blueprint.metadata.confidence < 0.5) issues.push({ severity: "warning", category: "website", message: "Low confidence blueprint", field: "confidence" });
  }

  private validatePages(blueprint: WebsiteBlueprint, issues: ValidationIssue[]): void {
    if (blueprint.pages.length === 0) {
      issues.push({ severity: "error", category: "pages", message: "No pages defined" });
      return;
    }

    const homePage = blueprint.pages.find((p) => p.type === "home");
    if (!homePage) issues.push({ severity: "error", category: "pages", message: "Home page is required" });

    const slugs = new Set<string>();
    for (const page of blueprint.pages) {
      if (slugs.has(page.slug)) issues.push({ severity: "error", category: "pages", message: `Duplicate slug: ${page.slug}`, field: page.slug });
      slugs.add(page.slug);
    }

    const visiblePages = blueprint.pages.filter((p) => p.visible);
    if (visiblePages.length === 0) issues.push({ severity: "warning", category: "pages", message: "No visible pages" });
  }

  private validateNavigation(blueprint: WebsiteBlueprint, issues: ValidationIssue[]): void {
    if (blueprint.navigation.desktop.length === 0) {
      issues.push({ severity: "error", category: "navigation", message: "Desktop navigation is empty" });
    }

    const navSlugs = new Set(blueprint.navigation.desktop.map((n) => n.href));
    const pageSlugs = new Set(blueprint.pages.filter((p) => p.visible).map((p) => `/${p.slug.split("/").slice(1).join("/")}`));
    for (const href of Array.from(navSlugs)) {
      if (href !== "#" && !pageSlugs.has(href) && !pageSlugs.has(`/${href.replace(/^\//, "")}`)) {
        issues.push({ severity: "warning", category: "navigation", message: `Navigation link ${href} has no matching page` });
      }
    }
  }

  private validateSections(blueprint: WebsiteBlueprint, issues: ValidationIssue[]): void {
    if (blueprint.sections.length === 0) {
      issues.push({ severity: "error", category: "sections", message: "No sections defined" });
      return;
    }

    const sectionIds = new Set<string>();
    for (const section of blueprint.sections) {
      if (sectionIds.has(section.id)) issues.push({ severity: "error", category: "sections", message: `Duplicate section id: ${section.id}` });
      sectionIds.add(section.id);
    }

    const heroSections = blueprint.sections.filter((s) => s.type === "hero");
    if (heroSections.length === 0) issues.push({ severity: "error", category: "sections", message: "Hero section is required" });

    const footerSections = blueprint.sections.filter((s) => s.type === "footer");
    if (footerSections.length === 0) issues.push({ severity: "error", category: "sections", message: "Footer section is required" });
  }

  private validateProducts(blueprint: WebsiteBlueprint, issues: ValidationIssue[]): void {
    if (blueprint.products.length === 0) {
      issues.push({ severity: "info", category: "products", message: "No products defined - store will show as empty" });
    }
  }

  private validateTheme(blueprint: WebsiteBlueprint, issues: ValidationIssue[]): void {
    if (!blueprint.theme.primary) issues.push({ severity: "error", category: "theme", message: "Primary color is missing" });
    if (!blueprint.theme.secondary) issues.push({ severity: "warning", category: "theme", message: "Secondary color is missing" });
    if (!blueprint.theme.fonts.heading || !blueprint.theme.fonts.body) issues.push({ severity: "warning", category: "theme", message: "Font configuration is incomplete" });
  }

  private validateSEO(blueprint: WebsiteBlueprint, issues: ValidationIssue[]): void {
    if (!blueprint.seo.title) issues.push({ severity: "error", category: "seo", message: "SEO title is missing" });
    if (!blueprint.seo.description) issues.push({ severity: "warning", category: "seo", message: "SEO description is missing" });
    if (blueprint.seo.keywords.length === 0) issues.push({ severity: "info", category: "seo", message: "No SEO keywords defined" });
  }

  private validateBuilder(blueprint: WebsiteBlueprint, issues: ValidationIssue[]): void {
    if (blueprint.builder.blocks.length === 0) issues.push({ severity: "error", category: "builder", message: "Builder has no blocks" });
  }

  private calculateScore(blueprint: WebsiteBlueprint, issues: ValidationIssue[]): number {
    const errors = issues.filter((i) => i.severity === "error").length;
    const warnings = issues.filter((i) => i.severity === "warning").length;

    const hasProducts = blueprint.products.length > 0;
    const hasSections = blueprint.sections.length > 0;
    const hasPages = blueprint.pages.length > 0;
    const hasTheme = !!blueprint.theme.primary;
    const hasNav = blueprint.navigation.desktop.length > 0;
    const hasSEO = !!blueprint.seo.title;

    const quality = [hasProducts, hasSections, hasPages, hasTheme, hasNav, hasSEO]
      .filter(Boolean).length / 6;

    const penalty = (errors * 0.15) + (warnings * 0.05);
    return Math.round(Math.min(Math.max(quality - penalty, 0), 1) * 100) / 100;
  }
}
