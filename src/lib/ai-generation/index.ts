/**
 * AI Website Generation Engine v1.0.0
 *
 * Converts a creator URL/handle into a ready-to-edit website.
 *
 * Architecture:
 *   WebsiteGenerationPipeline (orchestration)
 *   ├── SourceResolver          (URL → platform + identifier)
 *   ├── ProfileProvider         (platform → CreatorProfile)
 *   ├── ContentProvider          (platform → CreatorContent)
 *   ├── ContentGenerationService (profile + content → GeneratedContent)
 *   ├── ThemeSelectionStrategy   (niche → GeneratedTheme)
 *   ├── WebsiteComposer          (all → WebsiteComposition)
 *   └── TenantProvisioner        (profile → TenantProvisioning)
 */

export type {
  CreatorPlatform,
  ResolvedSource,
  CreatorProfile,
  SocialLink,
  CreatorContent,
  ScrapedPost,
  GeneratedContent,
  SuggestedSection,
  GeneratedTheme,
  WebsiteComposition,
  HeroSectionConfig,
  LinkSectionConfig,
  TenantProvisioning,
  PipelineStage,
  PipelineStatus,
  StageResult,
  GenerationInput,
  WebsiteGenerationResult,
  PipelineContext,
} from "./types";

export type {
  ProfileProvider,
  ContentProvider,
  ProfileProviderFactory,
  ContentProviderFactory,
} from "./providers/types";

export { sourceResolver, SourceResolver } from "./source-resolver";

export {
  YouTubeProfileProvider,
  YouTubeContentProvider,
  youtubeProfileProvider,
  youtubeContentProvider,
} from "./providers/youtube";

export {
  InstagramProfileProvider,
  InstagramContentProvider,
  instagramProfileProvider,
  instagramContentProvider,
} from "./providers/instagram";

export {
  ManualProfileProvider,
  ManualContentProvider,
  manualProfileProvider,
  manualContentProvider,
} from "./providers/manual";

export { profileProviderRegistry, contentProviderRegistry } from "./providers";

export { contentGenerationService, ContentGenerationService } from "./content-generator";
export { themeSelectionStrategy, ThemeSelectionStrategy } from "./theme-strategy";
export { websiteComposer, WebsiteComposer } from "./website-composer";
export { tenantProvisioner, TenantProvisioner } from "./tenant-provisioner";
export { websiteGenerationPipeline, WebsiteGenerationPipeline } from "./pipeline";
