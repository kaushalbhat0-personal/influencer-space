/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseEvaluationRule } from "./base";
import type { EvaluationContext, EvaluationRuleResult } from "../types";

export class ProductsExistRule extends BaseEvaluationRule {
  readonly id = "commerce.products_exist";
  readonly category = "commerce" as const;
  readonly weight = 25;
  readonly description = "At least one product is configured";

  evaluate(ctx: EvaluationContext): EvaluationRuleResult {
    const count = ctx.blueprint.products.length;
    if (count === 0) return this.fail("No products configured", { action: "generate", summary: "Add products to the store", details: "A store with no products cannot generate revenue. Add at least one product, digital download, or service.", priority: "high" });
    if (count >= 3) return this.pass(`${count} products configured`);
    return this.fail(`Only ${count} product(s) configured`, { action: "regenerate", summary: "Add more products", details: "Having at least 3 products gives visitors more options and improves conversion rates.", priority: "medium" }, 10);
  }
}

export class PricingValidRule extends BaseEvaluationRule {
  readonly id = "commerce.pricing_valid";
  readonly category = "commerce" as const;
  readonly weight = 15;
  readonly description = "Product pricing is valid";

  evaluate(ctx: EvaluationContext): EvaluationRuleResult {
    const products = ctx.blueprint.products;
    if (products.length === 0) return this.pass("No products to validate");

    const invalid = products.filter((p: any) => !p.priceRange || p.priceRange.length < 2);
    if (invalid.length === 0) return this.pass("All products have valid pricing");
    return this.fail(`${invalid.length} product(s) missing valid pricing`, { action: "regenerate", summary: "Set product prices", details: "Products without prices cannot be sold. Set a price range for each product.", priority: "high" }, invalid.length * 5);
  }
}

export class CTAConfiguredRule extends BaseEvaluationRule {
  readonly id = "commerce.cta_configured";
  readonly category = "commerce" as const;
  readonly weight = 10;
  readonly description = "CTA buttons link to valid destinations";

  evaluate(ctx: EvaluationContext): EvaluationRuleResult {
    const hero = ctx.blueprint.sections.find((s: any) => s.type === "hero");
    const cta = hero?.props?.cta as string | undefined;
    if (cta) return this.pass(`Primary CTA configured: "${cta}"`);
    return this.fail("No primary CTA configured", { action: "generate", summary: "Configure call-to-action", details: "A CTA guides visitors to products, subscriptions, or contact forms.", priority: "medium" }, 5);
  }
}
