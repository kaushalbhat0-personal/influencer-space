/**
 * TikTok platform adapter — RCCF-04.
 *
 * Extends the EXISTING PlatformAdapter architecture. No scraping, no fabricated
 * values: validates that the input is a profile URL (@handle), extracts the
 * handle deterministically and normalizes into the canonical ContentSource.
 * The pipeline does the rest.
 */
import type { PlatformAdapter, AcquireOptions, AdapterResult } from "../types";
import { buildContentSource } from "@/lib/generation/integration/provision-pipeline";

const HANDLE = /^@([a-zA-Z0-9._]{1,24})$/;

function stripHost(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^(www\.)?tiktok\.com\//i, "")
    .replace(/\/+$/, "");
}

export const TikTokAdapter: PlatformAdapter = {
  platform: "tiktok",
  name: "tiktok-profile",
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
    return url.toLowerCase().includes("tiktok.com");
  },

  extractHandle(url: string): string {
    const rest = stripHost(url);
    // Only @handle profile routes are accepted — tags/search/video are not.
    const m = rest.match(HANDLE);
    return m?.[1] ?? "";
  },

  async acquire(url: string, options: AcquireOptions): Promise<AdapterResult> {
    const handle = this.extractHandle(url);
    if (!handle) {
      return {
        source: buildContentSource(url, this.platform, options.creatorName ?? ""),
        warnings: ["tiktok:input is not a profile URL (expected @handle)"],
      };
    }

    const source = buildContentSource(url, this.platform, options.creatorName ?? "");
    source.username = handle;
    source.displayName = options.creatorName && options.creatorName.trim().length > 0 ? options.creatorName : handle;
    source.links = [url];
    source.socialLinks = [url];

    return {
      source,
      meta: { profileHandle: handle, canonicalUrl: `https://www.tiktok.com/@${handle}` },
    };
  },
};
