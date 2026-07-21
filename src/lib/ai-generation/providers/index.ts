/**
 * Provider Factory v1.0.0
 *
 * Central registry for profile and content providers.
 * The pipeline selects providers based on the resolved platform type.
 */

import type { ProfileProvider, ContentProvider, ProfileProviderFactory, ContentProviderFactory } from "./types";
import { youtubeProfileProvider, youtubeContentProvider } from "./youtube";
import { instagramProfileProvider, instagramContentProvider } from "./instagram";
import { manualProfileProvider, manualContentProvider } from "./manual";

class ProfileProviderRegistry implements ProfileProviderFactory {
  private providers = new Map<string, ProfileProvider>();

  constructor() {
    this.providers.set("youtube", youtubeProfileProvider);
    this.providers.set("instagram", instagramProfileProvider);
    this.providers.set("manual", manualProfileProvider);
  }

  getProvider(platform: string): ProfileProvider | null {
    return this.providers.get(platform) ?? null;
  }

  supportedPlatforms(): string[] {
    return Array.from(this.providers.keys());
  }
}

class ContentProviderRegistry implements ContentProviderFactory {
  private providers = new Map<string, ContentProvider>();

  constructor() {
    this.providers.set("youtube", youtubeContentProvider);
    this.providers.set("instagram", instagramContentProvider);
    this.providers.set("manual", manualContentProvider);
  }

  getProvider(platform: string): ContentProvider | null {
    return this.providers.get(platform) ?? null;
  }

  supportedPlatforms(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const profileProviderRegistry = new ProfileProviderRegistry();
export const contentProviderRegistry = new ContentProviderRegistry();
