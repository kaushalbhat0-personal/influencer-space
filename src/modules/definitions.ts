import type { ModuleDefinition, ModuleMetadata } from "@/lib/module/types";

const defaultMeta = (name: string, cat: string, desc: string): ModuleMetadata => ({
  displayName: name, icon: "Box", category: cat, description: desc,
  defaultProps: {}, propertySchema: [],
  capabilities: { draggable: true, duplicatable: true, deletable: true, editable: true, resizable: false, copyable: true },
  tags: [],
});

const m = (name: string, cat: string, desc: string) => defaultMeta(name, cat, desc);

export const galleryModule: ModuleDefinition = {
  identity: { id: "com.creatos.gallery", name: "Gallery", version: "1.0.0", domain: "content", description: "Image and video gallery with categories", author: { type: "platform", id: "com.creatos", name: "CreatorOS" }, icon: "Image", category: "content", tags: ["gallery", "images", "videos"] },
  composition: { capabilities: [], serviceContracts: [], dependencies: [] },
  surfaces: { supported: [{ surfaceId: "website", rendererPath: "@/components/public/GallerySection", interactive: false, streaming: false, cacheable: true }, { surfaceId: "admin_panel", rendererPath: "@/app/admin/gallery/_components/gallery-manager#GalleryManager", interactive: true, streaming: false, cacheable: false }], dataLoaderPath: "@/modules/shared/data-loaders#galleryDataLoader", defaultSurface: "website" },
  configuration: { schema: {}, defaults: {}, settingsKey: "module_config:com.creatos.gallery", overridableByCreator: [], lockedByTheme: [] },
  theme: { tokensConsumed: ["color.text.primary", "spacing.2", "radius.lg"], variantSlots: ["GalleryCard", "GalleryGrid"] },
  ai: { contextProviderPath: "", aiCapabilities: [] },
  permissions: { requiredPlanTiers: ["STARTER", "PRO"], featureFlags: [], agencyPermissions: [], minimumRole: "ADMIN" },
  events: { published: [], subscribed: [] },
  marketplace: { previewImages: [], tags: ["gallery"], pricing: { model: "free" }, compatibleThemes: ["*"], minPlatformVersion: "1.0.0", changelog: "", documentationUrl: null },
  metadata: m("Gallery", "content", "Image and video gallery"),
  manifest: { id: "com.creatos.gallery", name: "Gallery", version: "1.0.0", domain: "content", description: "Image and video gallery", author: { type: "platform", id: "com.creatos", name: "CreatorOS" }, license: "MIT", icon: "Image", category: "content", tags: ["gallery"], minPlatformVersion: "1.0.0", pricing: { model: "free" }, previewImages: [], documentationUrl: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
};

export const timelineModule: ModuleDefinition = {
  identity: { id: "com.creatos.timeline", name: "Timeline", version: "1.0.0", domain: "content", description: "Career milestones and achievements", author: { type: "platform", id: "com.creatos", name: "CreatorOS" }, icon: "Clock", category: "content", tags: ["timeline", "milestones"] },
  composition: { capabilities: [], serviceContracts: [], dependencies: [] },
  surfaces: { supported: [{ surfaceId: "website", rendererPath: "@/components/public/TimelineSection", interactive: false, streaming: false, cacheable: true }, { surfaceId: "admin_panel", rendererPath: "@/app/admin/milestones/_components/milestones-manager#MilestonesManager", interactive: true, streaming: false, cacheable: false }], dataLoaderPath: "@/modules/shared/data-loaders#timelineDataLoader", defaultSurface: "website" },
  configuration: { schema: {}, defaults: {}, settingsKey: "module_config:com.creatos.timeline", overridableByCreator: [], lockedByTheme: [] },
  theme: { tokensConsumed: ["color.accent.primary", "color.text.primary", "spacing.4"], variantSlots: ["TimelineEntry", "TimelineSection"] },
  ai: { contextProviderPath: "", aiCapabilities: [] },
  permissions: { requiredPlanTiers: ["STARTER", "PRO"], featureFlags: [], agencyPermissions: [], minimumRole: "ADMIN" },
  events: { published: [], subscribed: [] },
  marketplace: { previewImages: [], tags: ["timeline"], pricing: { model: "free" }, compatibleThemes: ["*"], minPlatformVersion: "1.0.0", changelog: "", documentationUrl: null },
  metadata: m("Timeline", "content", "Career milestones"),
  manifest: { id: "com.creatos.timeline", name: "Timeline", version: "1.0.0", domain: "content", description: "Career milestones", author: { type: "platform", id: "com.creatos", name: "CreatorOS" }, license: "MIT", icon: "Clock", category: "content", tags: ["timeline"], minPlatformVersion: "1.0.0", pricing: { model: "free" }, previewImages: [], documentationUrl: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
};

export const contentFeedModule: ModuleDefinition = {
  identity: { id: "com.creatos.content-feed", name: "Content Feed", version: "1.0.0", domain: "content", description: "Synced social media content feed", author: { type: "platform", id: "com.creatos", name: "CreatorOS" }, icon: "Rss", category: "content", tags: ["feed", "social", "content"] },
  composition: { capabilities: [], serviceContracts: [], dependencies: [] },
  surfaces: { supported: [{ surfaceId: "website", rendererPath: "@/components/public/ContentFeed", interactive: false, streaming: false, cacheable: true }, { surfaceId: "admin_panel", rendererPath: "@/app/admin/settings/content/_components/content-feed-manager#ContentFeedManager", interactive: true, streaming: false, cacheable: false }], dataLoaderPath: "@/modules/shared/data-loaders#contentFeedDataLoader", defaultSurface: "website" },
  configuration: { schema: {}, defaults: {}, settingsKey: "module_config:com.creatos.content-feed", overridableByCreator: [], lockedByTheme: [] },
  theme: { tokensConsumed: ["color.surface.secondary", "radius.lg", "spacing.3"], variantSlots: ["FeedCard", "FeedGrid"] },
  ai: { contextProviderPath: "", aiCapabilities: [] },
  permissions: { requiredPlanTiers: ["STARTER", "PRO"], featureFlags: [], agencyPermissions: [], minimumRole: "ADMIN" },
  events: { published: [], subscribed: [] },
  marketplace: { previewImages: [], tags: ["feed"], pricing: { model: "free" }, compatibleThemes: ["*"], minPlatformVersion: "1.0.0", changelog: "", documentationUrl: null },
  metadata: m("Content Feed", "content", "Synced social feed"),
  manifest: { id: "com.creatos.content-feed", name: "Content Feed", version: "1.0.0", domain: "content", description: "Synced social feed", author: { type: "platform", id: "com.creatos", name: "CreatorOS" }, license: "MIT", icon: "Rss", category: "content", tags: ["feed"], minPlatformVersion: "1.0.0", pricing: { model: "free" }, previewImages: [], documentationUrl: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
};

export const profileModule: ModuleDefinition = {
  identity: { id: "com.creatos.profile", name: "Profile", version: "1.0.0", domain: "identity", description: "Creator profile with bio, socials, and branding", author: { type: "platform", id: "com.creatos", name: "CreatorOS" }, icon: "User", category: "identity", tags: ["profile", "bio", "socials"] },
  composition: { capabilities: [], serviceContracts: [], dependencies: [] },
  surfaces: { supported: [{ surfaceId: "website", rendererPath: "", interactive: false, streaming: false, cacheable: true }, { surfaceId: "admin_panel", rendererPath: "@/app/admin/settings/_components/settings-form#SettingsForm", interactive: true, streaming: false, cacheable: false }], dataLoaderPath: "@/modules/shared/data-loaders#profileDataLoader", defaultSurface: "website" },
  configuration: { schema: {}, defaults: {}, settingsKey: "module_config:com.creatos.profile", overridableByCreator: ["name", "tagline", "bio", "profileImage"], lockedByTheme: [] },
  theme: { tokensConsumed: ["color.text.primary", "color.text.secondary", "spacing.3"], variantSlots: ["ProfileHeader"] },
  ai: { contextProviderPath: "", aiCapabilities: [] },
  permissions: { requiredPlanTiers: ["STARTER", "PRO"], featureFlags: [], agencyPermissions: [], minimumRole: "ADMIN" },
  events: { published: [], subscribed: [] },
  marketplace: { previewImages: [], tags: ["profile"], pricing: { model: "free" }, compatibleThemes: ["*"], minPlatformVersion: "1.0.0", changelog: "", documentationUrl: null },
  metadata: m("Profile", "identity", "Creator profile"),
  manifest: { id: "com.creatos.profile", name: "Profile", version: "1.0.0", domain: "identity", description: "Creator profile", author: { type: "platform", id: "com.creatos", name: "CreatorOS" }, license: "MIT", icon: "User", category: "identity", tags: ["profile"], minPlatformVersion: "1.0.0", pricing: { model: "free" }, previewImages: [], documentationUrl: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
};

export const affiliateLinksModule: ModuleDefinition = {
  identity: { id: "com.creatos.affiliate-links", name: "Affiliate Links", version: "1.0.0", domain: "commerce", description: "Affiliate link directory with click tracking", author: { type: "platform", id: "com.creatos", name: "CreatorOS" }, icon: "Link", category: "commerce", tags: ["links", "affiliate", "referral"] },
  composition: { capabilities: [], serviceContracts: [], dependencies: [] },
  surfaces: { supported: [{ surfaceId: "website", rendererPath: "", interactive: false, streaming: false, cacheable: true }, { surfaceId: "admin_panel", rendererPath: "@/app/admin/links/_components/links-manager#LinksManager", interactive: true, streaming: false, cacheable: false }], dataLoaderPath: "@/modules/shared/data-loaders#affiliateLinksDataLoader", defaultSurface: "website" },
  configuration: { schema: {}, defaults: {}, settingsKey: "module_config:com.creatos.affiliate-links", overridableByCreator: [], lockedByTheme: [] },
  theme: { tokensConsumed: ["color.surface.secondary", "radius.md", "spacing.3"], variantSlots: [] },
  ai: { contextProviderPath: "", aiCapabilities: [] },
  permissions: { requiredPlanTiers: ["STARTER", "PRO"], featureFlags: [], agencyPermissions: [], minimumRole: "ADMIN" },
  events: { published: [], subscribed: [] },
  marketplace: { previewImages: [], tags: ["links"], pricing: { model: "free" }, compatibleThemes: ["*"], minPlatformVersion: "1.0.0", changelog: "", documentationUrl: null },
  metadata: m("Affiliate Links", "commerce", "Affiliate links"),
  manifest: { id: "com.creatos.affiliate-links", name: "Affiliate Links", version: "1.0.0", domain: "commerce", description: "Affiliate links", author: { type: "platform", id: "com.creatos", name: "CreatorOS" }, license: "MIT", icon: "Link", category: "commerce", tags: ["links"], minPlatformVersion: "1.0.0", pricing: { model: "free" }, previewImages: [], documentationUrl: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
};

export const gamesModule: ModuleDefinition = {
  identity: { id: "com.creatos.games", name: "Games", version: "1.0.0", domain: "content", description: "Games library showcase", author: { type: "platform", id: "com.creatos", name: "CreatorOS" }, icon: "Gamepad2", category: "content", tags: ["games", "gaming"] },
  composition: { capabilities: [], serviceContracts: [], dependencies: [] },
  surfaces: { supported: [{ surfaceId: "website", rendererPath: "", interactive: false, streaming: false, cacheable: true }, { surfaceId: "admin_panel", rendererPath: "@/app/admin/games/_components/games-list#GamesList", interactive: true, streaming: false, cacheable: false }], dataLoaderPath: "@/modules/shared/data-loaders#gamesDataLoader", defaultSurface: "website" },
  configuration: { schema: {}, defaults: {}, settingsKey: "module_config:com.creatos.games", overridableByCreator: [], lockedByTheme: [] },
  theme: { tokensConsumed: ["color.surface.secondary", "radius.md", "spacing.2"], variantSlots: [] },
  ai: { contextProviderPath: "", aiCapabilities: [] },
  permissions: { requiredPlanTiers: ["STARTER", "PRO"], featureFlags: [], agencyPermissions: [], minimumRole: "ADMIN" },
  events: { published: [], subscribed: [] },
  marketplace: { previewImages: [], tags: ["games"], pricing: { model: "free" }, compatibleThemes: ["*"], minPlatformVersion: "1.0.0", changelog: "", documentationUrl: null },
  metadata: m("Games", "content", "Games library"),
  manifest: { id: "com.creatos.games", name: "Games", version: "1.0.0", domain: "content", description: "Games library", author: { type: "platform", id: "com.creatos", name: "CreatorOS" }, license: "MIT", icon: "Gamepad2", category: "content", tags: ["games"], minPlatformVersion: "1.0.0", pricing: { model: "free" }, previewImages: [], documentationUrl: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
};

export const contactModule: ModuleDefinition = {
  identity: { id: "com.creatos.contact", name: "Contact", version: "1.0.0", domain: "marketing", description: "Contact form for fan messages", author: { type: "platform", id: "com.creatos", name: "CreatorOS" }, icon: "Mail", category: "marketing", tags: ["contact", "messages"] },
  composition: { capabilities: [], serviceContracts: [], dependencies: [] },
  surfaces: { supported: [{ surfaceId: "website", rendererPath: "", interactive: true, streaming: false, cacheable: true }, { surfaceId: "admin_panel", rendererPath: "@/app/admin/messages/_components/messages-list#MessagesList", interactive: true, streaming: false, cacheable: false }], dataLoaderPath: "@/modules/shared/data-loaders#contactDataLoader", defaultSurface: "website" },
  configuration: { schema: {}, defaults: {}, settingsKey: "module_config:com.creatos.contact", overridableByCreator: [], lockedByTheme: [] },
  theme: { tokensConsumed: ["color.accent.primary", "color.surface.primary", "spacing.4"], variantSlots: [] },
  ai: { contextProviderPath: "", aiCapabilities: [] },
  permissions: { requiredPlanTiers: ["STARTER", "PRO"], featureFlags: [], agencyPermissions: [], minimumRole: "ADMIN" },
  events: { published: [], subscribed: [] },
  marketplace: { previewImages: [], tags: ["contact"], pricing: { model: "free" }, compatibleThemes: ["*"], minPlatformVersion: "1.0.0", changelog: "", documentationUrl: null },
  metadata: m("Contact", "marketing", "Contact form"),
  manifest: { id: "com.creatos.contact", name: "Contact", version: "1.0.0", domain: "marketing", description: "Contact form", author: { type: "platform", id: "com.creatos", name: "CreatorOS" }, license: "MIT", icon: "Mail", category: "marketing", tags: ["contact"], minPlatformVersion: "1.0.0", pricing: { model: "free" }, previewImages: [], documentationUrl: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
};

export const allModuleDefinitions: ModuleDefinition[] = [
  galleryModule, timelineModule, contentFeedModule, profileModule, affiliateLinksModule, gamesModule, contactModule,
];
