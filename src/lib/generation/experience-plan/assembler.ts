import type { ExperiencePlan, HeroPlan, CTAPlan, ThemePlan, NavigationPlan, PagePlan } from "./types";
import { DEFAULTS } from "./defaults";

export type PlanValidationIssue = {
  field: string;
  message: string;
  severity: "error" | "warning";
};

export class ExperiencePlanAssembler {
  assemble(partials: Partial<ExperiencePlan>[]): ExperiencePlan {
    const merged = this.merge(partials);
    const validated = this.applyDefaults(merged);
    const issues = this.validate(validated);
    if (issues.some((i) => i.severity === "error")) {
      throw new Error(`ExperiencePlan validation failed: ${issues.map((i) => i.message).join("; ")}`);
    }
    return this.deepFreeze(validated);
  }

  validate(plan: ExperiencePlan): PlanValidationIssue[] {
    const issues: PlanValidationIssue[] = [];
    if (!plan.hero) issues.push({ field: "hero", message: "Hero plan is required", severity: "error" });
    if (!plan.cta) issues.push({ field: "cta", message: "CTA plan is required", severity: "error" });
    if (!plan.theme) issues.push({ field: "theme", message: "Theme plan is required", severity: "error" });
    if (!plan.navigation) issues.push({ field: "navigation", message: "Navigation plan is required", severity: "error" });
    if (!plan.page) issues.push({ field: "page", message: "Page plan is required", severity: "error" });
    if (!plan.page?.pageTypes?.length) issues.push({ field: "page.pageTypes", message: "At least one page type is required", severity: "error" });
    if (!plan.conversionGoal?.primary) issues.push({ field: "conversionGoal.primary", message: "Conversion goal is required", severity: "error" });
    if (!plan.sectionOrder?.order?.length) issues.push({ field: "sectionOrder.order", message: "Section order is required", severity: "error" });
    const uniqueTypes = new Set(plan.page?.pageTypes ?? []);
    if (uniqueTypes.size !== (plan.page?.pageTypes ?? []).length) issues.push({ field: "page.pageTypes", message: "Duplicate page types detected", severity: "error" });
    return issues;
  }

  private merge(partials: Partial<ExperiencePlan>[]): Partial<ExperiencePlan> {
    const result: Partial<ExperiencePlan> = {};
    for (const p of partials) {
      for (const [key, value] of Object.entries(p)) {
        if (value !== undefined) {
          (result as Record<string, unknown>)[key] = value;
        }
      }
    }
    return result;
  }

  private applyDefaults(partial: Partial<ExperiencePlan>): ExperiencePlan {
    return {
      hero: { ...DEFAULTS.hero, ...partial.hero } as HeroPlan,
      pricing: { ...DEFAULTS.pricing, ...partial.pricing } as ExperiencePlan["pricing"],
      socialProof: { ...DEFAULTS.socialProof, ...partial.socialProof } as ExperiencePlan["socialProof"],
      gallery: { ...DEFAULTS.gallery, ...partial.gallery } as ExperiencePlan["gallery"],
      testimonial: { ...DEFAULTS.testimonial, ...partial.testimonial } as ExperiencePlan["testimonial"],
      cta: { ...DEFAULTS.cta, ...partial.cta } as CTAPlan,
      footer: { ...DEFAULTS.footer, ...partial.footer } as ExperiencePlan["footer"],
      navigation: { ...DEFAULTS.navigation, ...partial.navigation } as NavigationPlan,
      theme: { ...DEFAULTS.theme, ...partial.theme } as ThemePlan,
      sectionOrder: { ...DEFAULTS.sectionOrder, ...partial.sectionOrder } as ExperiencePlan["sectionOrder"],
      page: { ...DEFAULTS.page, ...partial.page } as PagePlan,
      conversionGoal: { ...DEFAULTS.conversionGoal, ...partial.conversionGoal } as ExperiencePlan["conversionGoal"],
      seo: { ...DEFAULTS.seo, ...partial.seo } as ExperiencePlan["seo"],
      contentDensity: partial.contentDensity ?? DEFAULTS.contentDensity,
      visualRhythm: partial.visualRhythm ?? DEFAULTS.visualRhythm,
      mobilePriority: partial.mobilePriority ?? DEFAULTS.mobilePriority,
      animationProfile: partial.animationProfile ?? DEFAULTS.animationProfile,
      recommendationSlots: partial.recommendationSlots ?? DEFAULTS.recommendationSlots,
    };
  }

  private deepFreeze<T>(obj: T): T {
    if (obj === null || obj === undefined || typeof obj !== "object") return obj;
    const props = Object.getOwnPropertyNames(obj);
    for (const prop of props) {
      const val = (obj as Record<string, unknown>)[prop];
      if (val && typeof val === "object" && !Object.isFrozen(val)) {
        this.deepFreeze(val);
      }
    }
    return Object.freeze(obj);
  }
}
