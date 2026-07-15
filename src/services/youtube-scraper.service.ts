const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

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

export const YouTubeScraperService = {
  async fetchChannelMetadata(handleOrUrl: string): Promise<YouTubeChannelMeta | null> {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) return null;

    const handle = cleanHandle(handleOrUrl);
    if (!handle) return null;

    try {
      const url =
        `${YOUTUBE_API}/channels` +
        `?part=snippet,statistics` +
        `&forHandle=${encodeURIComponent(handle)}` +
        `&key=${key}`;

      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) return null;

      const data: ChannelApiResponse = await res.json();
      const channel = data.items?.[0];
      if (!channel) return null;

      return {
        id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        thumbnailUrl:
          channel.snippet.thumbnails.high?.url ||
          channel.snippet.thumbnails.default?.url ||
          "",
        customUrl: channel.snippet.customUrl || `@${handle}`,
        subscriberCount: parseInt(channel.statistics.subscriberCount, 10) || 0,
      };
    } catch {
      return null;
    }
  },
};
