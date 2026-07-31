export { composeBlueprint } from "./application/composition-engine";
export { blueprintProvider } from "./infrastructure/rule-blueprint-provider";
export {
  SECTION_REGISTRY,
  getSectionDefinition,
  PAGE_REGISTRY,
  getPageDefinition,
  createEmptyBlueprint,
  blueprintFromProfile,
} from "./domain";
export type {
  WebsiteBlueprint,
  BlueprintMetadata,
  BlueprintBranding,
  BlueprintTheme,
  BlueprintLayout,
  BlueprintNavigation,
  BlueprintNavItem,
  BlueprintPage,
  BlueprintPageLayout,
  BlueprintPageSeo,
  BlueprintSection,
  BlueprintDataBinding,
  BlueprintLayoutHints,
  BlueprintBlock,
  BlueprintCommerce,
  BlueprintOffer,
  BlueprintSeo,
  BlueprintAutomation,
  BlueprintAnalytics,
  BlueprintVersion,
  BlueprintProvider,
} from "./domain/types";
export type { SectionDefinition } from "./domain/section-registry";
export type { PageDefinition } from "./domain/page-registry";
