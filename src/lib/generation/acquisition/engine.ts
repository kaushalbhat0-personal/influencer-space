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
import { parseResume, isLikelyResume, inferResumeName } from "@/lib/resume/extract";

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
  if (source.resume) fields.push("resume");
  if (source.resume?.summary) fields.push("resume.summary");
  if (source.resume?.experience?.length) fields.push("resume.experience");
  if (source.resume?.skills?.length) fields.push("resume.skills");
  if (source.resume?.projects?.length) fields.push("resume.projects");
  if (source.resume?.education?.length) fields.push("resume.education");
  if (source.resume?.certifications?.length) fields.push("resume.certifications");
  if (source.resume?.socialLinks?.length) fields.push("resume.socialLinks");
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

    // RCCF-PRELAUNCH-12A: resume semantic parsing — additive, deterministic, no LLM.
    // Only when free-text looks like a resume (heading signals) do we attach ResumeSource
    // and narrow bio to the summary to avoid collapsing the entire resume into bio.
    // Use the ORIGINAL source.bio (with line breaks) for resume detection/parsing;
    // enriched.bio is whitespace-collapsed and loses heading boundaries.
    let finalSource: ContentSource = enriched;
    const resumeSignals: string[] = [];
    try {
      const candidateRaw = source.bio ?? "";
      const candidateBioForCheck = candidateRaw.length >= 100 ? candidateRaw : enriched.bio ?? "";
      if (candidateRaw.length >= 100 && isLikelyResume(candidateBioForCheck)) {
        const parsed = parseResume(candidateRaw);
        const hasResumeData =
          parsed.summary.length > 0 ||
          parsed.experience.length > 0 ||
          parsed.skills.length > 0 ||
          parsed.projects.length > 0 ||
          parsed.education.length > 0 ||
          parsed.certifications.length > 0;
        if (hasResumeData) {
          finalSource = { ...enriched, resume: parsed };
          // Preserve resume identity: displayName must be the imported resume name (KAUSHAL G BHAT), not signup name
          const inferredName = inferResumeName(parsed.rawText, finalSource.displayName || "Creator");
          if (inferredName && inferredName !== finalSource.displayName) {
            finalSource.displayName = inferredName;
            // Keep username as signup-derived for tenant subdomain stability, but ensure it is set
            if (!finalSource.username) {
              finalSource.username = inferredName.toLowerCase().replace(/\s+/g, "");
            }
            resumeSignals.push(`resume:displayName:${inferredName}`);
          }
          // Narrow bio to summary (grounded) to satisfy "must not collapse into bio"
          if (parsed.summary) {
            finalSource.bio = parsed.summary.slice(0, 1000);
            resumeSignals.push("resume:summary_as_bio");
          } else {
            // No summary — keep bio empty-ish but preserve via resume.rawText
            finalSource.bio = "";
            resumeSignals.push("resume:bio_cleared");
          }
          if (parsed.location && !finalSource.location) {
            finalSource.location = parsed.location;
            resumeSignals.push("resume:location");
          }
          // Promote resume social links into canonical link sets (deterministic, deduped, no invention)
          if (parsed.socialLinks.length > 0) {
            const existing = new Set(finalSource.links.map((l) => l.toLowerCase()));
            const toAdd: string[] = [];
            for (const sl of parsed.socialLinks) {
              const low = sl.url.toLowerCase();
              if (!existing.has(low)) {
                existing.add(low);
                toAdd.push(sl.url);
              }
            }
            if (toAdd.length > 0) {
              finalSource.links = [...finalSource.links, ...toAdd];
              resumeSignals.push(`resume:socialLinks:${toAdd.length}`);
            }
            // Also expose as socialLinks array for downstream consumers
            const existingSocial = new Set((finalSource.socialLinks ?? []).map((l) => l.toLowerCase()));
            const socialToAdd: string[] = [];
            for (const sl of parsed.socialLinks) {
              const low = sl.url.toLowerCase();
              if (!existingSocial.has(low)) {
                existingSocial.add(low);
                socialToAdd.push(sl.url);
              }
            }
            if (socialToAdd.length > 0) {
              finalSource.socialLinks = [...(finalSource.socialLinks ?? []), ...socialToAdd];
            }
          }
          resumeSignals.push(`resume:parsed exp:${parsed.experience.length} skills:${parsed.skills.length} proj:${parsed.projects.length} edu:${parsed.education.length}`);
        } else {
          resumeSignals.push("resume:parsed_empty");
        }
      }
    } catch (e) {
      warnings.push(`resume_parse:${e instanceof Error ? e.message.slice(0, 120) : "unknown"}`);
    }

    const allSignals = [...signals, ...resumeSignals];

    return {
      source: finalSource,
      diagnostics: buildDiagnostics(adapter, platform, source, finalSource, warnings, allSignals, Date.now() - start),
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

