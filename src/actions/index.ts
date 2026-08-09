export {
  createAffiliate, updateAffiliate, deleteAffiliate,
  incrementAffiliateClicks, toggleAffiliateActive,
} from "./affiliate.actions";
export type { AffiliateActionState } from "./affiliate.actions";

export {
  getAgencyRevenue, getAgencyPayouts, getAgencyPartnerStats,
} from "./agency.actions";

export { fetchAnalytics } from "./analytics.actions";
export type { AnalyticsResponse } from "./analytics.actions";

export { getBuilderOverview, getBuilderHealth } from "./builder-overview.actions";
export type { BuilderOverviewData, HealthCategory } from "./builder-overview.actions";

export {
  loadBuilderPages, saveBuilderPages,
  listSnapshots, rollbackToVersion,
} from "./builder.actions";

export { createCheckout, verifyPayment } from "./checkout.actions";
export type { CheckoutResult } from "./checkout.actions";

export {
  submitContact, markMessageAsRead, deleteMessage,
} from "./contact.actions";
export type { ContactData } from "./contact.types";

export {
  fetchContentFeedItems, togglePinItem, toggleHideItem, deleteFeedItem,
} from "./content-feed.actions";

export { createWebsite } from "./create.actions";

export { generateDemoWebsite } from "./demo.actions";

export {
  attachCustomDomain, removeCustomDomain, checkDomainStatus,
  verifyDomain, getCustomDomain,
} from "./domain.actions";
export type { DomainActionState } from "./domain.actions";

export {
  fetchGalleryItems, createGalleryItem, updateExistingGalleryItem,
  removeGalleryItem, updateGalleryOrder, publishGalleryItem,
  unpublishGalleryItem, archiveGalleryItem, restoreGalleryItem,
  toggleFeatured, bulkPublishGallery, bulkArchiveGallery,
  bulkDeleteGallery, bulkFeatureGallery,
} from "./gallery.actions";

export { createGame, updateGame, deleteGame } from "./games.actions";
export type { GameData } from "./games.types";

export { getWebsiteHealthScore } from "./health.actions";

export { analyzeCreatorImport, importCreator } from "./import.actions";

export {
  getLinks, createLink, toggleLinkStatus, updateLinkOrder,
  updateExistingLink, deleteLink,
} from "./link.actions";
export type { LinkData } from "./link.types";

export {
  listAssets, getAsset, deleteAssetFromLibrary, purgeAsset, replaceAsset,
} from "./media-library.actions";

export { uploadAsset, deleteAsset } from "./media.actions";

export {
  fetchMilestones, createMilestone, updateExistingMilestone, removeMilestone,
} from "./milestone.actions";
export type { MilestoneData } from "./milestone.types";

export { getNavigation, saveNavigation, resetNavigation } from "./navigation.actions";

export {
  importCreatorProfile, runCreatorGeneration, getProvisionRunId,
  createGenerationSession, getGenerationSessionProgress,
  markOnboardingComplete, isOnboardingComplete, retryPublish,
} from "./onboarding.actions";

export {
  getKnowledgeRuntime, saveKnowledgeAnswers, getBuilderCompletionHints,
} from "./knowledge.actions";
export type { KnowledgeRuntimeResponse } from "./knowledge.actions";

export {
  getGoalsRuntime, saveGoalProfile, applyRecommendedGoals,
  clearGoalProfile, getGoalBuilderSuggestions,
} from "./goals.actions";
export type { GoalsRuntimePayload } from "./goals.actions";

export {
  getRecommendations, getTopRecommendation, dismissRecommendation,
  completeRecommendation, refreshRecommendations,
} from "./recommendation.actions";

export {
  getOnboardingPreview, seedOnboardingIntelligence,
} from "./onboarding-intelligence.actions";

export {
  getBusinessHealth, getBuilderBusinessHealth,
} from "./business-health.actions";

export { getExperienceIntelligence } from "./experience-intelligence.actions";

export {
  getEvolutionFeed, previewEvolution, applyEvolution, setEvolutionStatus,
} from "./evolution.actions";

export {
  getOperationsDashboard, getEvents, getEventTypes,
  rehydrateEngine, retryFailedPayouts, expireStaleInvites,
  runJob, getJobStatus, exportDiagnostics,
} from "./operations.actions";

export { fetchOrders, fetchCustomers } from "./order.actions";
export type { OrderRow } from "./order.types";

export { createProvisionRun, getProvisionRun, provisionCreator } from "./provision.actions";
export type { ProvisionActionResult } from "./provision.actions";

export {
  publishWebsite, rollbackWebsite, getPublishStatus,
  validateBeforePublish,
} from "./publish.actions";
export type { PublishActionResult } from "./publish.actions";

export {
  updateHeroData, updateHeroPartial, updateHeroSocialLinks, updateSocialChannels,
  updateApiKeys, updateThemeConfig,
} from "./settings.actions";
export type { ThemeConfigInput } from "./settings.actions";
export type { SettingsActionState } from "./settings.types";

export { submitStorefrontContact, subscribeNewsletter } from "./storefront.actions";
export type { ContactActionResult } from "./storefront.actions";

export { analyzeUrl, confirmProvision } from "./super-admin-provision.actions";
export type { AnalyzeResult, ProvisionResult as SuperAdminProvisionResult, DuplicateInfo } from "./super-admin-provision.actions";

export {
  provisionNewCreator, magicProvisionFromYoutube,
  attachCustomDomain as superAdminAttachCustomDomain,
  resetTenantAdminPassword, deleteTenant, generateLoginAsToken,
  updateSubscriptionPlan, triggerTenantContentSync, reVerifyAdminDomain,
  purgeContentFeed, togglePlatformFlag, purgeOldAuditLogsAction,
} from "./super-admin.actions";
export type {
  ProvisionResult, DomainAttachmentResult, DeleteTenantResult,
  ResetPasswordResult, LoginAsTokenResult, PlanUpdateResult, SyncResult,
} from "./super-admin.actions";

export { updateTheme } from "./theme.actions";

export {
  updateSectionPresentation, resetSectionPresentation,
} from "./section-presentation.actions";

export { switchWorkspace, listWorkspaces } from "./workspace.actions";
