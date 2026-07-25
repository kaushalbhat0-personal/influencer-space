export type ContextLevel = "none" | "low" | "medium" | "high";

export interface PlanningContext {
  readonly authorityLevel: ContextLevel;
  readonly trustLevel: ContextLevel;
  readonly commerceReadiness: ContextLevel;
  readonly marketingMaturity: ContextLevel;
  readonly audienceEngagement: ContextLevel;
  readonly visualComplexity: ContextLevel;
  readonly contentAuthority: ContextLevel;
  readonly conversionIntent: ContextLevel;
  readonly monetizationFocus: ContextLevel;
  readonly communityStrength: ContextLevel;
  readonly productConfidence: ContextLevel;
  readonly socialPresence: ContextLevel;
  readonly growthPotential: ContextLevel;
  readonly recommendationReadiness: ContextLevel;
  readonly brandingConsistency: ContextLevel;
  readonly pageComplexity: ContextLevel;
  readonly seoMaturity: ContextLevel;
  readonly expansionPotential: ContextLevel;
}
