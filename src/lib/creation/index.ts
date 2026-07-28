export { WebsiteGenerationService, websiteGenerationService } from "./service";
export { recommendationEngine, RecommendationEngine } from "./recommendation/engine";
export { industryRegistry, IndustryRegistry } from "./industry/registry";
export type { IndustryDefinition } from "./industry/registry";
export { styleRegistry, StyleRegistry } from "./style/registry";
export type { StyleDefinition } from "./style/registry";
export { previewSessionManager, PreviewSessionManager } from "./preview/session";
export type { PreviewSession } from "./preview/session";
export { getWizardSteps, getStepById, getNextStep } from "./wizard/steps";
export type { GenerationStep } from "./types";
export type {
  GenerationContext,
  GenerationResult,
  GeneratedPage,
  GeneratedSection,
  GeneratedNavItem,
  CreatorProfile,
  WizardState,
} from "./types";
