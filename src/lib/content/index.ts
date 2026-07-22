// ── Existing Content System ──────────────────────────────
export type {
  ContentEntityType, ContentStatus, ContentVisibility,
  ContentEntity, ContentEntityCapabilities, ContentEntityRegistration,
  ContentQuery, ContentCommand, ContentCommandResult,
  ContentDiagnostics, ContentValidationResult,
  ContentPolicyContext, ContentPolicyFn,
} from "./types";
export type {
  ContentModuleManifest, ContentModuleAPI, ContentModuleCapabilities,
  ContentModulePermissions, ContentModuleEvents, ContentModuleMetadata,
  ContentModuleDiagnostics, ContentModuleSerializer, ContentModuleMigration,
  ContentModuleRegistration, ProductModuleAPI, GalleryModuleAPI,
  CONTENT_MODULE_CONTRACT_VERSION,
} from "./manifest";
export type { ContentAPI } from "./api";
export { contentAPI } from "./api";
export { ContentRegistry, contentRegistry } from "./registry";
export {
  ContentEventBus, ContentCommandBus, ContentTransactionManager,
  ContentValidationEngine, ContentPolicyEngine, ContentDiagnosticsEngine,
  ContentSerializer,
  contentEvents, contentCommands, contentTransactions,
  contentValidator, contentPolicies, contentDiagnostics, contentSerializer,
} from "./engine";

// ── AI Content Studio ────────────────────────────────────
export { ContentStudio, contentStudio } from "./studio";
export { contentGeneratorRegistry } from "./generators/registry";
export { HeroGenerator } from "./generators/hero";
export { AboutGenerator } from "./generators/about";
export { SeoGenerator } from "./generators/seo";
export { registerContentPrompts } from "./prompts";
export type { ContentGenerator, GeneratorInput, GeneratorResult } from "./generators/interface";
export type { StudioOutput } from "./studio";
export type {
  HeroContent, AboutContent, FaqContent, SeoContent,
  CtaContent, NewsletterContent, TestimonialContent,
  PricingContent, LinksContent, ContactContent,
} from "./schemas";
