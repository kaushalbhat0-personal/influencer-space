const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

export type ScraperResult =
  | { success: true; data: YouTubeChannelMeta }
  | { success: false; error: "missing_credentials" | "invalid_url" | "channel_not_found" | "rate_limit" | "api_unavailable"; message: string };

export interface YouTubeChannelMeta {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  customUrl: string;
  subscriberCount: number;
}

interface ChannelApiResponse {
  items?: {
    id: string;
    snippet: {
      title: string;
      description: string;
      thumbnails: { high?: { url: string }; default?: { url: string } };
      customUrl?: string;
    };
    statistics: { subscriberCount: string };
  }[];
}

function cleanHandle(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^(www\.)?(youtube\.com|youtu\.be)\//, "")
    .replace(/^[@/]+/, "")
    .replace(/\/.*$/, "")
    .split("?")[0]
    .trim();
}

export const YouTubeScraperService = {
  async fetchChannelMetadata(handleOrUrl: string): Promise<YouTubeChannelMeta | null> {
    const result = await this.fetchWithResult(handleOrUrl);
    return result.success ? result.data : null;
  },

  async fetchWithResult(handleOrUrl: string): Promise<ScraperResult> {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) {
      return { success: false, error: "missing_credentials", message: "YOUTUBE_API_KEY environment variable is not set." };
    }

    const handle = cleanHandle(handleOrUrl);
    if (!handle) {
      return { success: false, error: "invalid_url", message: "Could not extract handle from the provided URL." };
    }

    try {
      const url =
        `${YOUTUBE_API}/channels` +
        `?part=snippet,statistics` +
        `&forHandle=${encodeURIComponent(handle)}` +
        `&key=${key}`;

      const res = await fetch(url, { next: { revalidate: 3600 } });

      if (res.status === 404) {
        return { success: false, error: "channel_not_found", message: `No YouTube channel found for handle "${handle}".` };
      }
      if (res.status === 429) {
        return { success: false, error: "rate_limit", message: "YouTube API rate limit exceeded. Try again later." };
      }
      if (!res.ok) {
        return { success: false, error: "api_unavailable", message: `YouTube API returned status ${res.status}.` };
      }

      const data: ChannelApiResponse = await res.json();
      const channel = data.items?.[0];
      if (!channel) {
        return { success: false, error: "channel_not_found", message: `No YouTube channel found for handle "${handle}".` };
      }

      return {
        success: true,
        data: {
          id: channel.id,
          title: channel.snippet.title,
          description: channel.snippet.description,
          thumbnailUrl:
            channel.snippet.thumbnails.high?.url ||
            channel.snippet.thumbnails.default?.url ||
            "",
          customUrl: channel.snippet.customUrl || `@${handle}`,
          subscriberCount: parseInt(channel.statistics.subscriberCount, 10) || 0,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: "api_unavailable",
        message: err instanceof Error ? err.message : "YouTube API request failed.",
      };
    }
  },
};
