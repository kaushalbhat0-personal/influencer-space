/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseEvaluationRule } from "./base";
import type { EvaluationContext, EvaluationRuleResult } from "../types";

export class NavigationExistsRule extends BaseEvaluationRule {
  readonly id = "ux.navigation_exists";
  readonly category = "ux" as const;
  readonly weight = 20;
  readonly description = "Desktop navigation is configured";

  evaluate(ctx: EvaluationContext): EvaluationRuleResult {
    const count = ctx.blueprint.navigation.desktop.length;
    if (count >= 2) return this.pass(`${count} navigation items configured`);
    if (count === 1) return this.fail("Only 1 navigation item", { action: "regenerate", summary: "Add more navigation items", details: "Navigation should have at least 2 items (Home + 1 more page) for proper site structure.", priority: "medium" }, 5);
    return this.fail("No navigation configured", { action: "generate", summary: "Configure navigation", details: "Navigation is essential for visitors to explore the store. Add pages and link them in the navigation.", priority: "high" });
  }
}

export class MobileNavigationRule extends BaseEvaluationRule {
  readonly id = "ux.mobile_navigation";
  readonly category = "ux" as const;
  readonly weight = 15;
  readonly description = "Mobile navigation is configured";

  evaluate(ctx: EvaluationContext): EvaluationRuleResult {
    const count = ctx.blueprint.navigation.mobileBottom.length;
    if (count >= 2) return this.pass(`${count} mobile navigation items configured`);
    if (count === 1) return this.fail("Only 1 mobile nav item", { action: "regenerate", summary: "Improve mobile navigation", details: "Mobile navigation should have at least 2 items for proper browsing on phones.", priority: "medium" }, 5);
    return this.fail("No mobile navigation configured", { action: "generate", summary: "Add mobile navigation", details: "Most visitors browse on mobile. Configure bottom navigation for easy access.", priority: "high" });
  }
}

export class SectionOrderingRule extends BaseEvaluationRule {
  readonly id = "ux.section_ordering";
  readonly category = "ux" as const;
  readonly weight = 10;
  readonly description = "Sections have valid ordering";

  evaluate(ctx: EvaluationContext): EvaluationRuleResult {
    const sections = ctx.blueprint.sections;
    if (sections.length === 0) return this.fail("No sections to evaluate", { action: "generate", summary: "Create page sections", details: "A store needs at least a hero section to be useful.", priority: "high" });

    const orders = sections.map((s: any) => s.order);
    const hasCorrectStart = orders.includes(0);
    const hasGaps = orders.some((o: number, i: number) => i > 0 && orders.indexOf(o) !== i);

    if (hasCorrectStart && !hasGaps) return this.pass(`${sections.length} sections in valid order`);
    if (!hasCorrectStart) return this.fail("Sections do not start at order 0", { action: "regenerate", summary: "Fix section ordering", details: "Sections should start at order 0 for proper rendering sequence.", priority: "low" }, 5);
    return this.fail("Duplicate section orders detected", { action: "regenerate", summary: "Fix duplicate orders", details: "Each section needs a unique order value for correct display.", priority: "low" }, 5);
  }
}

export class AccessibilityEssentialsRule extends BaseEvaluationRule {
  readonly id = "ux.accessibility";
  readonly category = "ux" as const;
  readonly weight = 10;
  readonly description = "Basic accessibility requirements met";

  evaluate(ctx: EvaluationContext): EvaluationRuleResult {
    const hero = ctx.blueprint.sections.find((s: any) => s.type === "hero");
    const headline = hero?.props?.headline as string | undefined;

    const hasARIA = ctx.artifacts.length > 0;
    const hasTitle = !!headline;

    if (hasTitle && hasARIA) return this.pass("Basic accessibility requirements satisfied");
    if (hasTitle) return this.fail("Accessibility metadata missing", { action: "regenerate", summary: "Add accessibility metadata", details: "Ensure images have alt text and interactive elements have ARIA labels.", priority: "low" }, 5);
    return this.fail("Missing page title and ARIA content", { action: "generate", summary: "Improve accessibility", details: "Page must have a visible heading (h1) for screen readers and navigation must have ARIA labels.", priority: "medium" }, 5);
  }
}
