/**
 * Manual / fallback platform adapter â€” IMPLEMENTATION-31.
 *
 * Used for platforms without a wired connector (Instagram, TikTok, LinkedIn,
 * X/Twitter, Twitch, website, manual). It honestly reports no capabilities and
 * derives only what the URL gives (username + the URL itself). No scraping, no
 * fabricated values â€” richer connectors plug in later behind the same contract.
 */
import type { PlatformAdapter, AcquireOptions, AdapterResult } from "../types";
import { buildContentSource } from "@/lib/generation/integration/provision-pipeline";

const CAPABILITIES = {
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
} as const;

export const ManualAdapter: PlatformAdapter = {
  platform: "manual",
  name: "manual",
  capabilities: CAPABILITIES,

  matches(_url: string): boolean {
    // Fallback â€” the registry selects this adapter for any unhandled platform.
    return false;
  },

  extractHandle(url: string): string {
    const parts = url.split("/").filter(Boolean);
    return parts[parts.length - 1]?.split("?")[0] ?? "";
  },

  async acquire(url: string, options: AcquireOptions): Promise<AdapterResult> {
    const platform = options.platform ?? "manual";
    return { source: buildContentSource(url, platform, options.creatorName ?? "") };
  },
};

