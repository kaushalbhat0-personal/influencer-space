/**
 * Instagram platform adapter — RCCF-04.
 *
 * Extends the EXISTING PlatformAdapter architecture. No scraping, no fabricated
 * values: validates that the input is a profile URL, extracts the handle
 * deterministically and normalizes into the canonical ContentSource. The
 * KnowledgeBuilder / PersonaEngine / ExperienceProfileBuilder / AI enrichment /
 * WebsiteBlueprint pipeline does the rest — this adapter adds the platform
 * boundary only, consistent with the ManualAdapter contract.
 */
import type { PlatformAdapter, AcquireOptions, AdapterResult } from "../types";
import { buildContentSource } from "@/lib/generation/integration/provision-pipeline";

// Non-profile routes that must NOT be treated as a creator profile.
const NON_PROFILE = /^\/(p|reel|tv|stories|explore|discover|accounts|session|direct|invites|location|hashtag|s)\//i;

/** Single-segment profile handle (letters/digits/._ up to 30). */
const PROFILE_HANDLE = /^[a-zA-Z0-9._]{1,30}$/;

function stripHost(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^(www\.)?(instagram\.com|instagr\.am)\//i, "")
    .replace(/\/+$/, "");
}

export const InstagramAdapter: PlatformAdapter = {
  platform: "instagram",
  name: "instagram-profile",
  capabilities: {
    supportsDisplayName: false,
    supportsBio: false,
    supportsFollowers: false,
    supportsFollowing: false,
    supportsPostCount: false,
    supportsVerification: false,
    supportsWebsite: true,
    supportsRecentContent: false,
    supportsMedia: false,
    supportsCategories: false,
    supportsLanguages: true,
    supportsLocation: false,
    supportsExternalLinks: true,
  },

  matches(url: string): boolean {
    return url.toLowerCase().includes("instagram.com") || url.toLowerCase().includes("instagr.am");
  },

  extractHandle(url: string): string {
    const rest = stripHost(url);
    // Post/reel/tv/story routes are not profiles — reject.
    if (NON_PROFILE.test(`/${rest}/`)) return "";
    const handle = rest.split(/[?#]/)[0].replace(/^@/, "").trim();
    return PROFILE_HANDLE.test(handle) ? handle : "";
  },

  async acquire(url: string, options: AcquireOptions): Promise<AdapterResult> {
    const handle = this.extractHandle(url);
    if (!handle) {
      return {
        source: buildContentSource(url, this.platform, options.creatorName ?? ""),
        warnings: ["instagram:input is not a profile URL (posts/reels/tv/explore are not supported)"],
      };
    }

    // Deterministic normalization. No fabricated values — richer data (bio,
    // followers, recent content) requires an API-backed connector.
    const source = buildContentSource(url, this.platform, options.creatorName ?? "");
    source.username = handle;
    source.displayName = options.creatorName && options.creatorName.trim().length > 0 ? options.creatorName : handle;
    source.links = [url];
    source.socialLinks = [url];

    return {
      source,
      meta: { profileHandle: handle, canonicalUrl: `https://www.instagram.com/${handle}/` },
    };
  },
};
