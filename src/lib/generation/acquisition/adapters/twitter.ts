/**
 * X / Twitter platform adapter — RCCF-04.
 *
 * Extends the EXISTING PlatformAdapter architecture. No scraping, no fabricated
 * values: accepts an x.com/twitter.com profile URL (/username or /@username),
 * extracts the handle deterministically and normalizes into the canonical
 * ContentSource. The pipeline does the rest.
 */
import type { PlatformAdapter, AcquireOptions, AdapterResult } from "../types";
import { buildContentSource } from "@/lib/generation/integration/provision-pipeline";

const HANDLE = /^(@?)([a-zA-Z0-9_]{1,15})$/;

function stripHost(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^(www\.)?(x\.com|twitter\.com)\//i, "")
    .replace(/\/+$/, "");
}

export const TwitterAdapter: PlatformAdapter = {
  platform: "twitter",
  name: "x-profile",
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
    const lower = url.toLowerCase();
    return lower.includes("x.com") || lower.includes("twitter.com");
  },

  extractHandle(url: string): string {
    const rest = stripHost(url);
    // Only a single-segment username is a profile — /i/, /search/, /hashtag/ etc. are not.
    if (rest.includes("/")) return "";
    const m = rest.match(HANDLE);
    return m?.[2] ?? "";
  },

  async acquire(url: string, options: AcquireOptions): Promise<AdapterResult> {
    const handle = this.extractHandle(url);
    if (!handle) {
      return {
        source: buildContentSource(url, this.platform, options.creatorName ?? ""),
        warnings: ["twitter:input is not a profile URL (expected /username)"],
      };
    }

    const source = buildContentSource(url, this.platform, options.creatorName ?? "");
    source.username = handle;
    source.displayName = options.creatorName && options.creatorName.trim().length > 0 ? options.creatorName : handle;
    source.links = [url];
    source.socialLinks = [url];

    return {
      source,
      meta: { profileHandle: handle, canonicalUrl: `https://x.com/${handle}` },
    };
  },
};
