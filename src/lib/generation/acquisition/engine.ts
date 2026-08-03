/**
 * Unified Profile Acquisition Engine â€” IMPLEMENTATION-31.
 *
 * The single acquisition layer feeding the existing KnowledgeBuilder. It
 * selects a platform adapter, normalizes into the existing ContentSource, runs
 * deterministic enrichment, and returns diagnostics. KnowledgeBuilder,
 * PersonaEngine and ExperienceProfileBuilder are untouched.
 *
 *   URL â†’ PlatformAdapter â†’ Normalized ContentSource â†’ KnowledgeBuilder
 *
 * No LLM, no duplicate profile models, graceful degradation everywhere.
 */
import type { ContentSource } from "@/lib/generation/intelligence/types";
import { getAdapterForUrl } from "./adapters";
import { applyEnrichment } from "./enrichment";
import type { AcquireResult, AdapterCapabilities, AcquisitionDiagnostics, PlatformAdapter } from "./types";

export function listCapabilities(capabilities: AdapterCapabilities): string[] {
  return Object.entries(capabilities)
    .filter(([, supported]) => supported)
    .map(([key]) => key.replace(/^supports/, "").toLowerCase());
}

function populatedFields(source: ContentSource): string[] {
  const fields: string[] = [];
  if (source.displayName) fields.push("displayName");
  if (source.bio) fields.push("bio");
  if (source.avatarUrl) fields.push("avatarUrl");
  if (source.followers > 0) fields.push("followers");
  if (source.following > 0) fields.push("following");
  if (source.posts > 0) fields.push("posts");
  if (source.content.length > 0) fields.push("content");
  if (source.categories.length > 0) fields.push("categories");
  if (source.links.length > 0) fields.push("links");
  if (source.website) fields.push("website");
  if (source.languages?.length) fields.push("languages");
  if (source.location) fields.push("location");
  if (source.keywords?.length) fields.push("keywords");
  if (source.hashtags?.length) fields.push("hashtags");
  if (source.socialLinks?.length) fields.push("socialLinks");
  if (source.verified) fields.push("verified");
  return fields;
}

function buildDiagnostics(
  adapter: PlatformAdapter,
  platform: string,
  before: ContentSource,
  after: ContentSource,
  warnings: string[],
  signals: string[],
  durationMs: number,
): AcquisitionDiagnostics {
  const caps = adapter.capabilities;
  const missing: string[] = [];
  if (caps.supportsDisplayName && !after.displayName) missing.push("displayName");
  if (caps.supportsBio && !after.bio) missing.push("bio");
  if (caps.supportsFollowers && after.followers <= 0) missing.push("followers");
  if (caps.supportsFollowing && after.following <= 0) missing.push("following");
  if (caps.supportsPostCount && after.posts <= 0) missing.push("posts");
  if (caps.supportsVerification && !after.verified) missing.push("verified");
  if (caps.supportsWebsite && !after.website) missing.push("website");
  if (caps.supportsRecentContent && after.content.length === 0) missing.push("content");
  if (caps.supportsMedia && !after.avatarUrl) missing.push("media");
  if (caps.supportsCategories && after.categories.length === 0) missing.push("categories");
  if (caps.supportsLanguages && !after.languages?.length) missing.push("languages");
  if (caps.supportsLocation && !after.location) missing.push("location");
  if (caps.supportsExternalLinks && after.links.length === 0) missing.push("externalLinks");

  return {
    platform: platform as AcquisitionDiagnostics["platform"],
    adapter: adapter.name,
    capabilities: listCapabilities(caps),
    populatedFields: populatedFields(after),
    missingFields: missing,
    warnings,
    enrichedSignals: signals,
    durationMs,
  };
}

export class ProfileAcquisitionEngine {
  async acquire(sourceUrl: string, creatorName: string): Promise<AcquireResult> {
    const start = Date.now();
    const { adapter, platform } = getAdapterForUrl(sourceUrl);

    const warnings: string[] = [];
    let source: ContentSource;
    let meta: unknown;
    try {
      const result = await adapter.acquire(sourceUrl, { creatorName, platform });
      source = result.source;
      meta = result.meta;
      warnings.push(...(result.warnings ?? []));
    } catch (error) {
      warnings.push(`adapter:${adapter.name} threw: ${error instanceof Error ? error.message : "unknown"}`);
      source = { ...emptySource(platform), username: adapter.extractHandle(sourceUrl) };
    }

    // Normalize once + enrich once (no duplicate acquisition work).
    const { source: enriched, signals } = applyEnrichment(source);

    return {
      source: enriched,
      diagnostics: buildDiagnostics(adapter, platform, source, enriched, warnings, signals, Date.now() - start),
      meta,
    };
  }
}

function emptySource(platform: string): ContentSource {
  return {
    platform,
    username: "",
    displayName: "",
    bio: "",
    avatarUrl: "",
    followers: 0,
    following: 0,
    posts: 0,
    engagement: 0,
    content: [],
    categories: [],
    links: [],
  };
}

export const profileAcquisitionEngine = new ProfileAcquisitionEngine();

