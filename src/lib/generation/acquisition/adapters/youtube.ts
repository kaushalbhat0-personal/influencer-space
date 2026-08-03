/**
 * YouTube platform adapter â€” IMPLEMENTATION-31.
 *
 * Uses the EXISTING YouTube scraper (Google Data API) exactly as the current
 * onboarding flow does, then applies deterministic enrichment. Preserves the
 * existing network behavior â€” no extra API calls, no scraping beyond the
 * official YouTube Data API.
 */
import type { PlatformAdapter, AcquireOptions, AdapterResult } from "../types";
import { buildContentSourceFromYouTube, buildContentSource } from "@/lib/generation/integration/provision-pipeline";

const CAPABILITIES = {
  supportsDisplayName: true,
  supportsBio: true,
  supportsFollowers: true,
  supportsFollowing: false,
  supportsPostCount: false,
  supportsVerification: false,
  supportsWebsite: true,
  supportsRecentContent: false,
  supportsMedia: true,
  supportsCategories: false,
  supportsLanguages: true,
  supportsLocation: false,
  supportsExternalLinks: true,
} as const;

export const YouTubeAdapter: PlatformAdapter = {
  platform: "youtube",
  name: "youtube-data-api",
  capabilities: CAPABILITIES,

  matches(url: string): boolean {
    return url.toLowerCase().includes("youtube") || url.toLowerCase().includes("youtu.be");
  },

  extractHandle(url: string): string {
    const cleaned = url.trim().replace(/^https?:\/\//, "").replace(/^(www\.)?(youtube\.com|youtu\.be)\//, "");
    return cleaned.replace(/^[@/]+/, "").replace(/\/.*$/, "").split("?")[0].trim();
  },

  async acquire(url: string, options: AcquireOptions): Promise<AdapterResult> {
    try {
      const { YouTubeScraperService } = await import("@/services/youtube-scraper.service");
      const result = await YouTubeScraperService.fetchWithResult(url);

      if (!result.success) {
        // Graceful degradation: identical to today's fallback (empty source),
        // but the failure is surfaced into diagnostics.
        return {
          source: buildContentSource(url, this.platform, options.creatorName ?? ""),
          warnings: [`youtube:${result.error}: ${result.message}`],
        };
      }

      return {
        source: buildContentSourceFromYouTube(url, result.data),
        meta: result.data,
      };
    } catch (error) {
      return {
        source: buildContentSource(url, this.platform, options.creatorName ?? ""),
        warnings: [`youtube:adapter error: ${error instanceof Error ? error.message : "unknown"}`],
      };
    }
  },
};

