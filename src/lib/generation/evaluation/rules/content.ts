/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseEvaluationRule } from "./base";
import type { EvaluationContext, EvaluationRuleResult } from "../types";

export class EmptySectionsRule extends BaseEvaluationRule {
  readonly id = "content.empty_sections";
  readonly category = "content" as const;
  readonly weight = 15;
  readonly description = "No sections have empty or default content";

  evaluate(ctx: EvaluationContext): EvaluationRuleResult {
    const emptySections = ctx.blueprint.sections.filter((s: any) => {
      const props = s.props ?? {};
      return Object.keys(props).length === 0 || (Object.values(props).every((v) => v === "" || v === null || v === undefined));
    });
    if (emptySections.length === 0) return this.pass("All sections have content");
    return this.fail(`${emptySections.length} section(s) have empty content`, {
      action: "generate", summary: "Fill empty sections", details: `Sections "${emptySections.map((s) => s.type).join(", ")}" need content before publishing.`, priority: "high",
    }, emptySections.length * 5);
  }
}

export class PlaceholderTextRule extends BaseEvaluationRule {
  readonly id = "content.placeholder_text";
  readonly category = "content" as const;
  readonly weight = 10;
  readonly description = "No placeholder or default text remains";

  evaluate(ctx: EvaluationContext): EvaluationRuleResult {
    const placeholders = ["lorem ipsum", "coming soon", "placeholder", "your text here", "sample content", "add your"];
    const allText = ctx.blueprint.sections.map((s: any) => JSON.stringify(s.props).toLowerCase()).join(" ");
    const found = placeholders.filter((p) => allText.includes(p));
    if (found.length === 0) return this.pass("No placeholder text detected");
    return this.fail(`Placeholder text found: "${found.join(", ")}"`, {
      action: "regenerate", summary: "Replace placeholder text", details: "Placeholder text must be replaced with real content before publishing.", priority: "high",
    }, found.length * 5);
  }
}

export class SEOCompletenessRule extends BaseEvaluationRule {
  readonly id = "content.seo_completeness";
  readonly category = "content" as const;
  readonly weight = 20;
  readonly description = "SEO metadata is complete";

  evaluate(ctx: EvaluationContext): EvaluationRuleResult {
    const seo = ctx.blueprint.seo;
    const missing: string[] = [];
    if (!seo.title || seo.title.length < 5) missing.push("title");
    if (!seo.description || seo.description.length < 10) missing.push("description");
    if (!seo.keywords || seo.keywords.length < 3) missing.push("keywords");
    if (!seo.canonical) missing.push("canonical URL");

    if (missing.length === 0) return this.pass("SEO metadata is complete");
    const penalty = missing.length * 5;
    return this.fail(`Missing SEO fields: ${missing.join(", ")}`, {
      action: "generate", summary: "Complete SEO metadata", details: `Add missing SEO fields: ${missing.join(", ")}.`, priority: "high",
    }, Math.min(penalty, this.weight));
  }
}
