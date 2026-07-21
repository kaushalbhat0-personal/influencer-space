/**
 * AI Website Generation Types v1.0.0
 *
 * Contracts, DTOs, and interfaces for the website generation pipeline.
 * All pipeline stages consume and produce these types.
 */

import type { GalleryDTO } from "@/lib/application/dtos/gallery";
import type { ProductDTO } from "@/lib/application/dtos/products";

// ── PLATFORM DETECTION ───────────────────────────────────────────────────────

export type CreatorPlatform = "youtube" | "instagram" | "google_business" | "tiktok" | "manual";

export interface ResolvedSource {
  platform: CreatorPlatform;
  identifier: string;
  normalizedUrl: string;
  confidence: number;
  rawInput: string;
}

// ── CREATOR PROFILE ──────────────────────────────────────────────────────────

export interface CreatorProfile {
  name: string;
  username: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  category: string;
  niche: string;
  socialLinks: SocialLink[];
  subscriberCount: number | null;
  followerCount: number | null;
  verified: boolean;
  platform: CreatorPlatform;
  platformUrl: string;
  rawData: Record<string, unknown>;
}

export interface SocialLink {
  platform: string;
  url: string;
  username: string;
}

// ── CREATOR CONTENT ──────────────────────────────────────────────────────────

export interface CreatorContent {
  latestPosts: ScrapedPost[];
  featuredPosts: ScrapedPost[];
  popularPosts: ScrapedPost[];
  totalPosts: number;
  averageEngagement: number | null;
  contentThemes: string[];
}

export interface ScrapedPost {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string | null;
  mediaUrls: string[];
  publishedAt: string;
  engagement: number | null;
  metadata: Record<string, unknown>;
}

// ── AI GENERATED CONTENT ─────────────────────────────────────────────────────

export interface GeneratedContent {
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  aboutSection: string;
  tagline: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  suggestedSections: SuggestedSection[];
}

export interface SuggestedSection {
  type: "products" | "gallery" | "links" | "testimonials" | "courses" | "timeline" | "blog" | "games";
  priority: number;
  reason: string;
  prePopulated: boolean;
}

// ── GENERATED THEME ──────────────────────────────────────────────────────────

export interface GeneratedTheme {
  preset: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  borderRadius: number;
  layoutDensity: "compact" | "comfortable" | "spacious";
  darkMode: boolean;
}

// ── WEBSITE COMPOSITION ──────────────────────────────────────────────────────

export interface WebsiteComposition {
  heroSection: HeroSectionConfig;
  galleryItems: GalleryDTO[];
  products: ProductDTO[];
  linkSections: LinkSectionConfig[];
  featuredSections: string[];
  pageStructure: Record<string, unknown>;
}

export interface HeroSectionConfig {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  backgroundType: "video" | "image" | "gradient";
  mediaUrl: string | null;
  overlayOpacity: number;
  alignment: "center" | "left" | "right";
}

export interface LinkSectionConfig {
  title: string;
  links: { title: string; url: string; icon: string }[];
}

// ── TENANT PROVISIONING ──────────────────────────────────────────────────────

export interface TenantProvisioning {
  tenantId: string;
  tenantName: string;
  subdomain: string;
  adminEmail: string;
  planId: string;
}

// ── PIPELINE ─────────────────────────────────────────────────────────────────

export type PipelineStage =
  | "source_resolution"
  | "profile_extraction"
  | "content_extraction"
  | "ai_content_generation"
  | "theme_selection"
  | "website_composition"
  | "tenant_provisioning"
  | "finalization";

export type PipelineStatus = "not_started" | "running" | "completed" | "failed" | "skipped";

export interface StageResult {
  stage: PipelineStage;
  status: PipelineStatus;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  error: string | null;
  retryable: boolean;
  retryCount: number;
  warnings: string[];
  diagnostics: Record<string, unknown>;
}

export interface GenerationInput {
  source: string;
  manualProfileUrl?: string;
  options?: {
    skipAI?: boolean;
    forceTheme?: string;
    planId?: string;
    adminEmail?: string;
    subdomain?: string;
  };
}

export interface WebsiteGenerationResult {
  success: boolean;
  tenantId: string | null;
  creatorName: string;
  sourcePlatform: CreatorPlatform;
  generatedContent: GeneratedContent | null;
  generatedTheme: GeneratedTheme | null;
  generatedSections: string[];
  dashboardUrl: string | null;
  storefrontUrl: string | null;
  stages: StageResult[];
  totalDurationMs: number;
  warnings: string[];
  errors: string[];
  diagnostics: Record<string, unknown>;
}

// ── PIPELINE CONTEXT ─────────────────────────────────────────────────────────

export interface PipelineContext {
  input: GenerationInput;
  resolvedSource: ResolvedSource | null;
  creatorProfile: CreatorProfile | null;
  creatorContent: CreatorContent | null;
  generatedContent: GeneratedContent | null;
  generatedTheme: GeneratedTheme | null;
  websiteComposition: WebsiteComposition | null;
  tenantProvisioning: TenantProvisioning | null;
  stageResults: StageResult[];
  startTime: number;
  errors: string[];
  warnings: string[];
}
