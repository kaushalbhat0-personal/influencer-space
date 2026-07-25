/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseEvaluationRule } from "./base";
import { HeadlineExistsRule, CTAExistsRule, ThemeColorsAppliedRule, NicheConsistencyRule } from "./branding";
import { EmptySectionsRule, PlaceholderTextRule, SEOCompletenessRule, AboutQualityRule } from "./content";
import { ProductsExistRule, PricingValidRule, CTAConfiguredRule } from "./commerce";
import { NavigationExistsRule, MobileNavigationRule, SectionOrderingRule, AccessibilityEssentialsRule } from "./ux";
import { ArtifactValidationRule, BlueprintValidationRule, SnapshotCompletenessRule, RequiredMetadataRule } from "./technical";

export class EvaluationRegistry {
  private rules: BaseEvaluationRule[] = [];

  constructor() {
    this.registerDefaults();
  }

  register(rule: BaseEvaluationRule): void {
    if (this.rules.some((r) => r.id === rule.id)) {
      throw new Error(`Rule already registered: ${rule.id}`);
    }
    this.rules.push(rule);
  }

  getAll(): BaseEvaluationRule[] {
    return [...this.rules];
  }

  getByCategory(category: string): BaseEvaluationRule[] {
    return this.rules.filter((r) => r.category === category);
  }

  get(id: string): BaseEvaluationRule | undefined {
    return this.rules.find((r) => r.id === id);
  }

  private registerDefaults(): void {
    const defaults: BaseEvaluationRule[] = [
      new HeadlineExistsRule(),
      new CTAExistsRule(),
      new ThemeColorsAppliedRule(),
      new NicheConsistencyRule(),
      new EmptySectionsRule(),
      new PlaceholderTextRule(),
      new SEOCompletenessRule(),
      new AboutQualityRule(),
      new ProductsExistRule(),
      new PricingValidRule(),
      new CTAConfiguredRule(),
      new NavigationExistsRule(),
      new MobileNavigationRule(),
      new SectionOrderingRule(),
      new AccessibilityEssentialsRule(),
      new ArtifactValidationRule(),
      new BlueprintValidationRule(),
      new SnapshotCompletenessRule(),
      new RequiredMetadataRule(),
    ];
    for (const rule of defaults) this.rules.push(rule);
  }
}
