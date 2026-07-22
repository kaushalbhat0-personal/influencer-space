export interface YouTubeChannelData {
  channelId: string | null;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  bannerUrl: string | null;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  country: string | null;
  customUrl: string | null;
  publishedAt: string | null;
}

export interface YouTubeVideoData {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  viewCount: number;
  duration: string | null;
}

export class YouTubeApiService {
  private static getApiKey(): string {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) throw new Error("YOUTUBE_API_KEY is not configured");
    return key;
  }

  static async fetchChannel(handle: string): Promise<YouTubeChannelData> {
    const apiKey = this.getApiKey();

    // Try by handle first, then by channel ID
    let data = await this.channelRequest(apiKey, "forHandle", handle);
    if (!data && handle.startsWith("UC")) {
      data = await this.channelRequest(apiKey, "id", handle);
    }

    if (!data) {
      // Return minimal data with just the handle
      return {
        channelId: null, title: handle, description: "",
        thumbnailUrl: null, bannerUrl: null,
        subscriberCount: 0, videoCount: 0, viewCount: 0,
        country: null, customUrl: null, publishedAt: null,
      };
    }

    return data;
  }

  static async fetchLatestVideos(channelId: string, maxResults = 8): Promise<YouTubeVideoData[]> {
    const apiKey = this.getApiKey();
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=${maxResults}&order=date&type=video&key=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`YouTube search API error: ${res.status}`);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = json.items || [];

    // Fetch video details for view count and duration
    const videoIds = items.map((i) => i.id?.videoId).filter(Boolean) as string[];
    const detailsMap = new Map<string, { viewCount: number; duration: string }>();

    if (videoIds.length > 0) {
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds.join(",")}&key=${apiKey}`;
      const detailsRes = await fetch(detailsUrl);
      if (detailsRes.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detailsJson: any = await detailsRes.json();
        for (const item of detailsJson.items || []) {
          detailsMap.set(item.id, {
            viewCount: parseInt(item.statistics?.viewCount || "0", 10),
            duration: item.contentDetails?.duration || null,
          });
        }
      }
    }

    return items.map((item) => {
      const details = detailsMap.get(item.id?.videoId);
      return {
        videoId: item.id?.videoId || "",
        title: item.snippet?.title || "",
        description: item.snippet?.description || "",
        thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || null,
        publishedAt: item.snippet?.publishedAt || null,
        viewCount: details?.viewCount || 0,
        duration: details?.duration || null,
      };
    });
  }

  private static async channelRequest(apiKey: string, param: string, value: string): Promise<YouTubeChannelData | null> {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&${param}=${encodeURIComponent(value)}&key=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return null;
      if (res.status === 403) throw new Error("YouTube API quota exceeded");
      console.error(`YouTube API error: ${res.status}`);
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    const item = json.items?.[0];
    if (!item) return null;

    return {
      channelId: item.id || null,
      title: item.snippet?.title || "",
      description: item.snippet?.description || "",
      thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || null,
      bannerUrl: item.brandingSettings?.image?.bannerExternalUrl
        ? `https://i.ytimg.com/u/${item.id}/banner_1600x900.jpg`
        : null,
      subscriberCount: parseInt(item.statistics?.subscriberCount || "0", 10),
      videoCount: parseInt(item.statistics?.videoCount || "0", 10),
      viewCount: parseInt(item.statistics?.viewCount || "0", 10),
      country: item.snippet?.country || null,
      customUrl: item.snippet?.customUrl || null,
      publishedAt: item.snippet?.publishedAt || null,
    };
  }
}
