import type { CreatorProvider, FetchResult } from "../interface";
import type { CreatorProfile } from "@/lib/creators/types";
import { YouTubeApiService } from "./api";
import { youtubeCache } from "./cache";
import { youtubeQuota } from "./quota";

export class YouTubeProvider implements CreatorProvider {
  readonly name = "youtube";

  private readonly patterns = [
    /youtube\.com\/@([a-zA-Z0-9_-]+)/,
    /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /^@([a-zA-Z0-9_-]+)$/,
  ];

  canHandle(url: string): boolean {
    return this.patterns.some((p) => p.test(url));
  }

  async fetch(url: string): Promise<FetchResult> {
    const handle = this.extractHandle(url);
    const t0 = performance.now();

    // Check cache
    const cached = await youtubeCache.get(handle);
    if (cached) {
      return {
        profile: cached.profile,
        accountId: cached.accountId,
        cached: true,
        quotaUnits: 0,
        latencyMs: Math.round(performance.now() - t0),
      };
    }

    // Fetch from YouTube API
    const channelData = await YouTubeApiService.fetchChannel(handle);
    const videosData = channelData.channelId
      ? await YouTubeApiService.fetchLatestVideos(channelData.channelId)
      : [];

    const latencyMs = Math.round(performance.now() - t0);

    // Normalize to CreatorProfile
    const profile: CreatorProfile = {
      name: channelData.title || handle,
      description: channelData.description || "",
      avatarUrl: channelData.thumbnailUrl || null,
      bannerUrl: channelData.bannerUrl || null,
      followers: channelData.subscriberCount || 0,
      videoCount: channelData.videoCount || 0,
      viewCount: channelData.viewCount || 0,
      country: channelData.country || null,
      platform: "youtube",
      handle,
      externalId: channelData.channelId || null,
      socialLinks: [{ platform: "youtube", url: `https://youtube.com/@${handle}` }],
      latestContent: videosData.map((v) => ({
        title: v.title,
        description: v.description,
        thumbnail: v.thumbnailUrl || null,
        publishedAt: v.publishedAt || null,
        viewCount: v.viewCount || 0,
        duration: v.duration || null,
        url: `https://youtube.com/watch?v=${v.videoId}`,
      })),
      categories: [],
      keywords: this.extractKeywords(channelData.title, channelData.description),
      language: null,
      rawResponse: { channelData, videosData },
    };

    // Store in cache
    const accountId = await youtubeCache.set(handle, profile, channelData.channelId);

    // Track quota
    await youtubeQuota.track(2, latencyMs, "success"); // channel + videos = 2 units

    return { profile, accountId, cached: false, quotaUnits: 2, latencyMs };
  }

  async refresh(accountId: string): Promise<FetchResult> {
    const account = await (await import("@/lib/prisma")).prisma.providerAccount.findUnique({
      where: { id: accountId },
    });
    if (!account) throw new Error(`Provider account ${accountId} not found`);
    const handle = account.handle || account.externalId;
    if (!handle) throw new Error(`Account ${accountId} has no handle`);
    return this.fetch(handle.startsWith("youtube.com") || handle.startsWith("@") ? handle : `@${handle}`);
  }

  private extractHandle(url: string): string {
    for (const pattern of this.patterns) {
      const match = url.match(pattern);
      if (match) return match[1] || "";
    }
    // If URL is a full channel URL without @, extract last segment
    const segments = url.replace(/\/+$/, "").split("/");
    return segments[segments.length - 1] || "";
  }

  private extractKeywords(title: string, description: string): string[] {
    const words = new Set<string>();
    const text = `${title} ${description}`.toLowerCase();
    // Common creator keywords
    const keywords = [
      "gaming", "game", "streamer", "twitch", "esports",
      "fitness", "gym", "workout", "health", "wellness",
      "education", "learn", "teach", "course", "tutorial",
      "music", "song", "singer", "rapper", "band",
      "food", "chef", "cook", "recipe", "cooking",
      "tech", "technology", "coding", "programming",
      "travel", "trip", "adventure", "explore",
      "fashion", "style", "beauty", "makeup",
      "art", "artist", "painting", "design",
      "comedy", "funny", "entertainment",
      "sports", "athlete", "training",
      "business", "entrepreneur", "marketing",
      "photography", "photo", "camera",
      "lifestyle", "vlog", "daily",
    ];
    for (const kw of keywords) {
      if (text.includes(kw)) words.add(kw);
    }
    return Array.from(words);
  }
}
