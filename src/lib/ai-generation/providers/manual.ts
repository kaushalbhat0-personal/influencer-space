/**
 * Manual Profile Provider v1.0.0
 *
 * Handles manual creator profile input where no scraper is needed.
 * The profile data is provided directly by the user or admin.
 */

import { BaseAppService } from "@/lib/application/base";
import type { ServiceResult } from "@/lib/application/types";
import type { ProfileProvider, ContentProvider } from "./types";
import type { CreatorProfile, CreatorContent, ResolvedSource } from "../types";

export class ManualProfileProvider extends BaseAppService implements ProfileProvider {
  readonly platform = "manual";
  readonly name = "ManualProfileProvider";

  constructor() {
    super("ManualProfileProvider");
  }

  validateIdentifier(identifier: string): boolean {
    return identifier.length >= 2;
  }

  async extractProfile(source: ResolvedSource): Promise<ServiceResult<CreatorProfile>> {
    return this.wrapAsync(async () => {
      return {
        name: source.identifier.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        username: source.identifier,
        bio: `Welcome to my creator website!`,
        avatarUrl: null,
        bannerUrl: null,
        category: "creator",
        niche: "general",
        socialLinks: [],
        subscriberCount: null,
        followerCount: null,
        verified: false,
        platform: "manual",
        platformUrl: "",
        rawData: { identifier: source.identifier },
      };
    }, "Manual Profile");
  }

  async healthCheck(): Promise<{ available: boolean; latencyMs: number }> {
    return { available: true, latencyMs: 0 };
  }
}

export class ManualContentProvider extends BaseAppService implements ContentProvider {
  readonly platform = "manual";
  readonly name = "ManualContentProvider";

  constructor() {
    super("ManualContentProvider");
  }

  async extractContent(
    _source: ResolvedSource,
    profile: CreatorProfile
  ): Promise<ServiceResult<CreatorContent>> {
    return this.wrapAsync(async () => {
      return {
        latestPosts: [],
        featuredPosts: [],
        popularPosts: [],
        totalPosts: 0,
        averageEngagement: null,
        contentThemes: ["creator", "community", profile.niche],
      };
    }, "Manual Content");
  }

  async healthCheck(): Promise<{ available: boolean; latencyMs: number }> {
    return { available: true, latencyMs: 0 };
  }
}

export const manualProfileProvider = new ManualProfileProvider();
export const manualContentProvider = new ManualContentProvider();
