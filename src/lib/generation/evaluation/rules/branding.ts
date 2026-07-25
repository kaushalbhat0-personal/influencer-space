/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseEvaluationRule } from "./base";
import type { EvaluationContext, EvaluationRuleResult } from "../types";

export class HeadlineExistsRule extends BaseEvaluationRule {
  readonly id = "branding.headline_exists";
  readonly category = "branding" as const;
  readonly weight = 20;
  readonly description = "Hero section has a headline";

  evaluate(ctx: EvaluationContext): EvaluationRuleResult {
    const hero = ctx.blueprint.sections.find((s: any) => s.type === "hero");
    const headline = hero?.props?.headline as string | undefined;
    if (headline && headline.length >= 3) return this.pass(`Headline found: "${headline.slice(0, 50)}"`);
    return this.fail("No hero headline detected", { action: "generate", summary: "Add hero headline", details: "Every store needs a headline above the fold that tells visitors what the creator offers.", priority: "high" });
  }
}

export class CTAExistsRule extends BaseEvaluationRule {
  readonly id = "branding.cta_exists";
  readonly category = "branding" as const;
  readonly weight = 15;
  readonly description = "Primary CTA button exists";

  evaluate(ctx: EvaluationContext): EvaluationRuleResult {
    const hero = ctx.blueprint.sections.find((s: any) => s.type === "hero");
    const cta = hero?.props?.cta as string | undefined;
    if (cta && cta.length >= 2) return this.pass(`CTA found: "${cta}"`);
    return this.fail("No primary CTA detected", { action: "generate", summary: "Add primary CTA", details: "A call-to-action button guides visitors to take the next step, whether shopping or exploring.", priority: "high" });
  }
}

export class ThemeColorsAppliedRule extends BaseEvaluationRule {
  readonly id = "branding.theme_colors";
  readonly category = "branding" as const;
  readonly weight = 15;
  readonly description = "Theme colors are applied";

  evaluate(ctx: EvaluationContext): EvaluationRuleResult {
    const hasPrimary = !!ctx.blueprint.theme.primary;
    const hasSecondary = !!ctx.blueprint.theme.secondary;
    if (hasPrimary && hasSecondary) return this.pass(`Theme colors applied: primary=${ctx.blueprint.theme.primary}, secondary=${ctx.blueprint.theme.secondary}`);
    if (hasPrimary) return this.fail("Secondary color missing", { action: "generate", summary: "Add secondary theme color", details: "A secondary color improves visual hierarchy and button styling.", priority: "medium" }, 5);
    return this.fail("No theme colors applied", { action: "generate", summary: "Apply theme colors", details: "Theme colors define the store's visual identity and brand recognition.", priority: "high" });
  }
}

export class NicheConsistencyRule extends BaseEvaluationRule {
  readonly id = "branding.niche_consistency";
  readonly category = "branding" as const;
  readonly weight = 10;
  readonly description = "Content is consistent with the detected niche";

  evaluate(ctx: EvaluationContext): EvaluationRuleResult {
    const niche = ctx.graph.creator.niche;
    const sections = ctx.blueprint.sections;
    const sectionTexts = sections.map((s: any) => JSON.stringify(s.props).toLowerCase()).join(" ");
    const nicheKeywords: Record<string, string[]> = {
      gaming: ["game", "play", "stream", "gaming", "twitch", "esports"],
      fitness: ["fitness", "workout", "health", "gym", "exercise", "training"],
      music: ["music", "song", "album", "concert", "band", "audio"],
      food: ["food", "recipe", "cook", "baking", "cuisine", "kitchen"],
      photography: ["photo", "camera", "photography", "edit", "portfolio"],
      education: ["learn", "course", "tutorial", "study", "lesson", "teach"],
      technology: ["tech", "software", "app", "code", "developer", "digital"],
      travel: ["travel", "trip", "adventure", "explore", "destination", "journey"],
      art: ["art", "creative", "design", "illustration", "canvas", "studio"],
      lifestyle: ["lifestyle", "daily", "vlog", "routine", "fashion", "beauty"],
    };

    const keywords = nicheKeywords[niche];
    if (!keywords) return this.pass(`No niche-specific keywords defined for "${niche}"`);

    const matches = keywords.filter((kw) => sectionTexts.includes(kw));
    if (matches.length >= 2) return this.pass(`Niche "${niche}" is consistent: ${matches.length} keyword matches`);
    return this.fail(`Niche "${niche}" has weak content alignment (${matches.length} keyword matches)`, {
      action: "regenerate", summary: "Improve niche alignment", details: `Content should better reflect the "${niche}" niche. Consider adding more relevant terminology.`, priority: "medium",
    }, 5);
  }
}
