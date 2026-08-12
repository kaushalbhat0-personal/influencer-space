/**
 * LinkedIn platform adapter — RCCF-04.
 *
 * Extends the EXISTING PlatformAdapter architecture. No scraping, no fabricated
 * values: accepts a LinkedIn profile URL (/in/slug) or company URL (/company/slug),
 * extracts the slug deterministically and normalizes into the canonical
 * ContentSource. The pipeline does the rest.
 */
import type { PlatformAdapter, AcquireOptions, AdapterResult } from "../types";
import { buildContentSource } from "@/lib/generation/integration/provision-pipeline";

const SLUG = /^(in|company)\/([a-zA-Z0-9-]{1,80})$/;

function stripHost(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^(www\.|[\w-]+\.)?linkedin\.com\//i, "")
    .replace(/\/+$/, "");
}

export const LinkedInAdapter: PlatformAdapter = {
  platform: "linkedin",
  name: "linkedin-profile",
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
    return url.toLowerCase().includes("linkedin.com");
  },

  extractHandle(url: string): string {
    const rest = stripHost(url);
    const m = rest.match(SLUG);
    return m?.[2] ?? "";
  },

  async acquire(url: string, options: AcquireOptions): Promise<AdapterResult> {
    const rest = stripHost(url);
    const m = rest.match(SLUG);
    const slug = m?.[2] ?? "";
    if (!slug) {
      return {
        source: buildContentSource(url, this.platform, options.creatorName ?? ""),
        warnings: ["linkedin:input is not a profile URL (expected /in/slug or /company/slug)"],
      };
    }

    const source = buildContentSource(url, this.platform, options.creatorName ?? "");
    source.username = slug;
    source.displayName = options.creatorName && options.creatorName.trim().length > 0 ? options.creatorName : slug;
    source.links = [url];
    source.socialLinks = [url];

    return {
      source,
      meta: { profileSlug: slug, profileType: m?.[1] === "company" ? "company" : "in", canonicalUrl: url },
    };
  },
};
